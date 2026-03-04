using System.IO.Ports;
using System.Text;
using TransbankPosService.Interfaces;
using TransbankPosService.Models;

namespace TransbankPosService.Services;

/// <summary>
/// Implementación real del POS Transbank IM30 usando comunicación serial USB.
/// Protocolo: STX + DATA + ETX + LRC
/// Configuración: 115200 bps, 8N1
/// </summary>
public class TransbankPosSerialImpl : ITransbankPos, IDisposable
{
    // Constantes del protocolo Transbank
    private const byte STX = 0x02;  // Start of Text
    private const byte ETX = 0x03;  // End of Text
    private const byte ACK = 0x06;  // Acknowledgment
    private const byte NAK = 0x15;  // Negative Acknowledgment
    private const byte SEPARATOR = 0x7C; // Pipe '|'

    // Comandos
    private const string CMD_SALE = "0200";
    private const string CMD_POLL = "0100";
    private const string CMD_TMS_INIT = "0070";      // Iniciar descarga de parámetros TMS
    private const string CMD_TMS_RESULT = "0080";    // Obtener resultado de inicialización
    private const string RESP_TMS_RESULT = "1080";   // Respuesta del resultado TMS

    // Timeouts
    private const int TIMEOUT_ACK_MS = 3000;           // 3 segundos para recibir ACK
    private const int TIMEOUT_RESPONSE_MS = 120000;    // 2 minutos para respuesta final
    private const int TIMEOUT_TMS_POLLING_MS = 180000; // 3 minutos máximo para polling TMS (el POS se reinicia)
    private const int POLLING_INTERVAL_MS = 5000;      // 5 segundos entre cada intento de polling
    private const int MAX_RETRIES = 2;                 // Reintentos en caso de NAK

    private SerialPort? _serialPort;
    private TransactionState _currentState = TransactionState.IDLE;
    private readonly ILogger<TransbankPosSerialImpl> _logger;
    private readonly IConfiguration _configuration;
    private readonly SemaphoreSlim _portLock = new(1, 1);
    private CancellationTokenSource? _transactionCts;
    private bool _disposed;

    public event EventHandler<TransactionState>? StateChanged;

    public TransbankPosSerialImpl(ILogger<TransbankPosSerialImpl> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    #region ITransbankPos Implementation

    public async Task<bool> InitializeAsync()
    {
        try
        {
            var portName = _configuration["Transbank:PortName"] ?? "COM3";
            
            _logger.LogInformation("🔌 Inicializando conexión con POS Transbank en puerto {Port}...", portName);

            // Cerrar puerto si estaba abierto
            if (_serialPort?.IsOpen == true)
            {
                _serialPort.Close();
                _serialPort.Dispose();
            }

            _serialPort = new SerialPort
            {
                PortName = portName,
                BaudRate = 115200,
                DataBits = 8,
                Parity = Parity.None,
                StopBits = StopBits.One,
                ReadTimeout = TIMEOUT_RESPONSE_MS,
                WriteTimeout = 5000,
                Encoding = Encoding.ASCII
            };

            _serialPort.Open();
            
            _logger.LogInformation("✅ Puerto serial {Port} abierto exitosamente", portName);
            
            // Verificar conexión con polling
            var connected = await IsConnectedAsync();
            if (connected)
            {
                _logger.LogInformation("✅ POS Transbank conectado y respondiendo");
                return true;
            }
            
            _logger.LogWarning("⚠️ Puerto abierto pero POS no responde al polling");
            _logger.LogInformation("🔄 Intentando inicialización TMS (carga de parámetros)...");
            
            // Intentar inicialización TMS si el POS no responde
            var tmsResult = await InitializeTmsAsync();
            return tmsResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error al inicializar conexión con POS Transbank");
            return false;
        }
    }

    /// <summary>
    /// Inicializa el POS descargando parámetros TMS.
    /// Flujo: Comando 0070 -> Esperar ACK -> POS se reinicia -> Polling 0100 -> Comando 0080
    /// </summary>
    public async Task<bool> InitializeTmsAsync()
    {
        _logger.LogInformation("📡 ========== INICIANDO CARGA DE PARÁMETROS TMS ==========");
        
        try
        {
            // ============================================
            // PASO A: Enviar comando 0070 (Iniciar TMS)
            // ============================================
            _logger.LogInformation("📤 Paso A: Enviando comando 0070 (Iniciar descarga TMS)...");
            
            var initMessage = BuildMessage(CMD_TMS_INIT);
            
            // Enviar comando y esperar SOLO ACK (no trama completa)
            var ackReceived = await SendAndWaitAckOnlyAsync(initMessage, TIMEOUT_ACK_MS);
            
            if (!ackReceived)
            {
                _logger.LogError("❌ No se recibió ACK del comando 0070");
                return false;
            }
            
            _logger.LogInformation("✅ ACK recibido - POS iniciará descarga y se reiniciará...");
            _logger.LogInformation("⏳ Esperando reinicio del POS (esto puede tomar 1-2 minutos)...");
            
            // ============================================
            // PASO B: Polling con comando 0100
            // ============================================
            _logger.LogInformation("📤 Paso B: Iniciando polling (comando 0100) hasta que POS responda...");
            
            var posReady = await WaitForPosReadyAsync();
            
            if (!posReady)
            {
                _logger.LogError("❌ Timeout esperando que el POS esté listo después del reinicio");
                return false;
            }
            
            _logger.LogInformation("✅ POS respondió al polling - Está listo");
            
            // ============================================
            // PASO C: Obtener resultado con comando 0080
            // ============================================
            _logger.LogInformation("📤 Paso C: Enviando comando 0080 (Obtener resultado TMS)...");
            
            var resultMessage = BuildMessage(CMD_TMS_RESULT);
            var result = await SendAndWaitResponseAsync(resultMessage);
            
            if (result == null)
            {
                _logger.LogError("❌ No se recibió respuesta del comando 0080");
                return false;
            }
            
            // Parsear respuesta 1080|Código|Fecha|Hora
            var tmsResponse = ParseTmsResponse(result);
            
            if (tmsResponse.success)
            {
                _logger.LogInformation("✅ ========== INICIALIZACIÓN TMS EXITOSA ==========");
                _logger.LogInformation("📅 Fecha: {Fecha}, Hora: {Hora}", tmsResponse.date, tmsResponse.time);
                return true;
            }
            else
            {
                _logger.LogError("❌ ========== INICIALIZACIÓN TMS FALLIDA ==========");
                _logger.LogError("🚨 Código de error: {Code}", tmsResponse.code);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error durante inicialización TMS");
            return false;
        }
    }

    /// <summary>
    /// Espera hasta que el POS responda al polling (después del reinicio por TMS)
    /// </summary>
    private async Task<bool> WaitForPosReadyAsync()
    {
        var startTime = DateTime.Now;
        var attempt = 0;
        
        while ((DateTime.Now - startTime).TotalMilliseconds < TIMEOUT_TMS_POLLING_MS)
        {
            attempt++;
            _logger.LogDebug("🔄 Intento de polling #{Attempt}...", attempt);
            
            try
            {
                var pollMessage = BuildMessage(CMD_POLL);
                
                // Limpiar buffers antes de enviar
                if (_serialPort?.IsOpen == true)
                {
                    _serialPort.DiscardInBuffer();
                    _serialPort.DiscardOutBuffer();
                    _serialPort.Write(pollMessage, 0, pollMessage.Length);
                    
                    // Esperar ACK con timeout corto
                    var response = await ReadByteWithTimeoutAsync(TIMEOUT_ACK_MS, CancellationToken.None);
                    
                    if (response == ACK)
                    {
                        _logger.LogInformation("✅ POS respondió ACK al polling (intento #{Attempt})", attempt);
                        return true;
                    }
                    else if (response == -1)
                    {
                        _logger.LogDebug("⏳ Sin respuesta... POS aún reiniciando");
                    }
                    else
                    {
                        _logger.LogDebug("❓ Respuesta inesperada: 0x{Response:X2}", response);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("⚠️ Error en polling: {Message}", ex.Message);
            }
            
            // Esperar antes del siguiente intento
            await Task.Delay(POLLING_INTERVAL_MS);
        }
        
        return false;
    }

    /// <summary>
    /// Envía comando y espera SOLO un ACK (sin trama de respuesta)
    /// </summary>
    private async Task<bool> SendAndWaitAckOnlyAsync(byte[] message, int timeoutMs)
    {
        await _portLock.WaitAsync();
        try
        {
            _serialPort!.DiscardInBuffer();
            _serialPort.DiscardOutBuffer();
            _serialPort.Write(message, 0, message.Length);
            
            _logger.LogDebug("📤 Mensaje enviado ({Length} bytes): {Hex}", 
                message.Length, 
                BitConverter.ToString(message));
            
            var response = await ReadByteWithTimeoutAsync(timeoutMs, CancellationToken.None);
            
            if (response == ACK)
            {
                _logger.LogDebug("✅ ACK recibido (0x06)");
                return true;
            }
            else if (response == NAK)
            {
                _logger.LogWarning("⚠️ NAK recibido (0x15)");
                return false;
            }
            else if (response == -1)
            {
                _logger.LogWarning("⚠️ Timeout esperando ACK");
                return false;
            }
            else
            {
                _logger.LogWarning("⚠️ Respuesta inesperada: 0x{Response:X2}", response);
                return false;
            }
        }
        finally
        {
            _portLock.Release();
        }
    }

    /// <summary>
    /// Envía comando, espera ACK, y luego espera la trama de respuesta completa
    /// </summary>
    private async Task<byte[]?> SendAndWaitResponseAsync(byte[] message)
    {
        await _portLock.WaitAsync();
        try
        {
            _serialPort!.DiscardInBuffer();
            _serialPort.DiscardOutBuffer();
            _serialPort.Write(message, 0, message.Length);
            
            _logger.LogDebug("📤 Mensaje enviado ({Length} bytes)", message.Length);
            
            // Primero esperar ACK
            var ackResponse = await ReadByteWithTimeoutAsync(TIMEOUT_ACK_MS, CancellationToken.None);
            
            if (ackResponse != ACK)
            {
                _logger.LogWarning("⚠️ No se recibió ACK, respuesta: 0x{Response:X2}", ackResponse);
                return null;
            }
            
            _logger.LogDebug("✅ ACK recibido, esperando trama de respuesta...");
            
            // Luego esperar trama completa
            var response = await ReadMessageAsync(TIMEOUT_RESPONSE_MS, CancellationToken.None);
            
            if (response != null)
            {
                // Validar LRC
                var receivedLrc = response[^1];
                var calculatedLrc = CalculateLrcFromMessage(response, 1, response.Length - 2);
                
                if (receivedLrc == calculatedLrc)
                {
                    // Enviar ACK de confirmación
                    _serialPort.Write(new[] { ACK }, 0, 1);
                    _logger.LogDebug("✅ LRC válido, ACK enviado");
                    return response;
                }
                else
                {
                    _logger.LogWarning("⚠️ LRC inválido. Esperado: 0x{Expected:X2}, Recibido: 0x{Received:X2}",
                        calculatedLrc, receivedLrc);
                    // Enviar NAK
                    _serialPort.Write(new[] { NAK }, 0, 1);
                    return null;
                }
            }
            
            return null;
        }
        finally
        {
            _portLock.Release();
        }
    }

    /// <summary>
    /// Parsea la respuesta del comando 0080 (resultado TMS)
    /// Formato: 1080|Código|Fecha|Hora
    /// Código 90 = Éxito, 91 = Fallo
    /// </summary>
    private (bool success, string code, string date, string time) ParseTmsResponse(byte[] message)
    {
        try
        {
            var data = Encoding.ASCII.GetString(message, 1, message.Length - 3);
            var fields = data.Split('|');
            
            _logger.LogDebug("📝 Respuesta TMS: {Data}", data);
            _logger.LogDebug("📝 Campos: {Fields}", string.Join(", ", fields));
            
            if (fields.Length >= 4 && fields[0] == RESP_TMS_RESULT)
            {
                var code = fields[1];
                var date = fields[2];
                var time = fields[3];
                
                // Código 90 = Inicialización exitosa
                // Código 91 = Inicialización fallida
                var success = code == "90";
                
                return (success, code, date, time);
            }
            
            return (false, "PARSE_ERROR", "", "");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta TMS");
            return (false, "EXCEPTION", "", "");
        }
    }

    public async Task<bool> IsConnectedAsync()
    {
        if (_serialPort == null || !_serialPort.IsOpen)
            return false;

        try
        {
            // Enviar comando de polling (0100) para verificar conexión
            var pollMessage = BuildMessage(CMD_POLL);
            var response = await SendCommandAsync(pollMessage, TIMEOUT_ACK_MS);
            return response != null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Error en polling: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<PaymentResponse> StartPaymentAsync(int amount, string? ticketNumber = null)
    {
        if (_currentState != TransactionState.IDLE)
        {
            return new PaymentResponse
            {
                Success = false,
                Message = "Ya hay una transacción en curso",
                State = _currentState
            };
        }

        if (_serialPort == null || !_serialPort.IsOpen)
        {
            var initialized = await InitializeAsync();
            if (!initialized)
            {
                return new PaymentResponse
                {
                    Success = false,
                    Message = "No se pudo establecer conexión con el POS",
                    State = TransactionState.ERROR
                };
            }
        }

        _transactionCts = new CancellationTokenSource();
        var token = _transactionCts.Token;

        try
        {
            SetState(TransactionState.INICIANDO_PAGO);
            _logger.LogInformation("💰 Iniciando venta por ${Amount}", amount);

            // Construir mensaje de venta: 0200|monto|ticket|impresion|mensajes
            var ticket = string.IsNullOrEmpty(ticketNumber) ? "0" : ticketNumber;
            var saleData = $"{CMD_SALE}|{amount}|{ticket}|1|1";
            var message = BuildMessage(saleData);

            _logger.LogDebug("📤 Enviando comando de venta: {Data}", saleData);

            // Enviar comando y esperar ACK
            var ackReceived = await SendAndWaitAckAsync(message, token);
            
            if (!ackReceived)
            {
                SetState(TransactionState.ERROR);
                return new PaymentResponse
                {
                    Success = false,
                    Message = "El POS no respondió al comando de venta",
                    State = TransactionState.ERROR,
                    Amount = amount,
                    Timestamp = DateTime.Now
                };
            }

            // ACK recibido, ahora esperamos la respuesta del POS
            SetState(TransactionState.ESPERANDO_TARJETA);
            _logger.LogInformation("⏳ Esperando tarjeta del cliente...");

            // Esperar respuesta final del POS (puede tardar hasta 2 minutos)
            var response = await WaitForResponseAsync(token);

            if (response == null)
            {
                SetState(TransactionState.ERROR);
                return new PaymentResponse
                {
                    Success = false,
                    Message = "Timeout esperando respuesta del POS",
                    State = TransactionState.ERROR,
                    Amount = amount,
                    Timestamp = DateTime.Now
                };
            }

            // Parsear respuesta
            var paymentResponse = ParseSaleResponse(response, amount);
            SetState(paymentResponse.State);

            // Enviar ACK al POS para confirmar recepción
            await SendAckAsync();

            // Volver a IDLE después de un momento
            _ = Task.Run(async () =>
            {
                await Task.Delay(2000);
                SetState(TransactionState.IDLE);
            });

            return paymentResponse;
        }
        catch (OperationCanceledException)
        {
            SetState(TransactionState.CANCELADO);
            _logger.LogInformation("🚫 Transacción cancelada");

            return new PaymentResponse
            {
                Success = false,
                Message = "Transacción cancelada",
                State = TransactionState.CANCELADO,
                Amount = amount,
                Timestamp = DateTime.Now
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error en transacción de venta");
            SetState(TransactionState.ERROR);

            return new PaymentResponse
            {
                Success = false,
                Message = $"Error: {ex.Message}",
                State = TransactionState.ERROR,
                Amount = amount,
                Timestamp = DateTime.Now
            };
        }
        finally
        {
            _transactionCts?.Dispose();
            _transactionCts = null;
        }
    }

    public Task<CancelResponse> CancelCurrentTransactionAsync()
    {
        _logger.LogInformation("🚫 Solicitud de cancelación. Estado actual: {State}", _currentState);

        if (_currentState == TransactionState.ESPERANDO_TARJETA)
        {
            _logger.LogWarning("⚠️ No se puede cancelar - POS esperando tarjeta");
            return Task.FromResult(new CancelResponse
            {
                Success = false,
                Message = "No se puede cancelar mientras el POS espera la tarjeta",
                State = _currentState,
                FailureReason = "POS en estado ESPERANDO_TARJETA. La cancelación debe hacerse desde el dispositivo físico."
            });
        }

        if (_currentState == TransactionState.IDLE)
        {
            return Task.FromResult(new CancelResponse
            {
                Success = false,
                Message = "No hay transacción activa para cancelar",
                State = _currentState,
                FailureReason = "El POS está en estado IDLE"
            });
        }

        _transactionCts?.Cancel();

        return Task.FromResult(new CancelResponse
        {
            Success = true,
            Message = "Transacción cancelada exitosamente",
            State = TransactionState.CANCELADO
        });
    }

    public Task<TransactionState> GetCurrentStateAsync()
    {
        return Task.FromResult(_currentState);
    }

    public Task CloseConnectionAsync()
    {
        _logger.LogInformation("🔌 Cerrando conexión con POS");
        _transactionCts?.Cancel();
        
        if (_serialPort?.IsOpen == true)
        {
            _serialPort.Close();
        }
        
        SetState(TransactionState.IDLE);
        return Task.CompletedTask;
    }

    #endregion

    #region Protocolo Serial Transbank

    /// <summary>
    /// Construye un mensaje con formato Transbank: STX + DATA + ETX + LRC
    /// </summary>
    private byte[] BuildMessage(string data)
    {
        var dataBytes = Encoding.ASCII.GetBytes(data);
        var message = new byte[dataBytes.Length + 3]; // STX + data + ETX + LRC

        message[0] = STX;
        Array.Copy(dataBytes, 0, message, 1, dataBytes.Length);
        message[dataBytes.Length + 1] = ETX;
        message[dataBytes.Length + 2] = CalculateLrc(dataBytes, ETX);

        return message;
    }

    /// <summary>
    /// Calcula el LRC (Longitudinal Redundancy Check) usando XOR.
    /// El cálculo incluye DATA + ETX
    /// </summary>
    private byte CalculateLrc(byte[] data, byte etx)
    {
        byte lrc = 0;
        
        // XOR de todos los bytes de DATA
        foreach (var b in data)
        {
            lrc ^= b;
        }
        
        // XOR con ETX
        lrc ^= etx;
        
        return lrc;
    }

    /// <summary>
    /// Calcula el LRC de un mensaje recibido (desde después de STX hasta ETX inclusive)
    /// </summary>
    private byte CalculateLrcFromMessage(byte[] message, int startIndex, int endIndex)
    {
        byte lrc = 0;
        
        for (int i = startIndex; i <= endIndex; i++)
        {
            lrc ^= message[i];
        }
        
        return lrc;
    }

    /// <summary>
    /// Envía un comando y espera ACK, con reintentos en caso de NAK
    /// </summary>
    private async Task<bool> SendAndWaitAckAsync(byte[] message, CancellationToken token)
    {
        await _portLock.WaitAsync(token);
        try
        {
            for (int retry = 0; retry <= MAX_RETRIES; retry++)
            {
                if (retry > 0)
                {
                    _logger.LogWarning("🔄 Reintento {Retry}/{MaxRetries}", retry, MAX_RETRIES);
                }

                // Enviar mensaje
                _serialPort!.DiscardInBuffer();
                _serialPort.DiscardOutBuffer();
                _serialPort.Write(message, 0, message.Length);
                
                _logger.LogDebug("📤 Mensaje enviado ({Length} bytes)", message.Length);

                // Esperar ACK o NAK
                var response = await ReadByteWithTimeoutAsync(TIMEOUT_ACK_MS, token);

                if (response == ACK)
                {
                    _logger.LogDebug("✅ ACK recibido");
                    return true;
                }
                else if (response == NAK)
                {
                    _logger.LogWarning("⚠️ NAK recibido - LRC incorrecto detectado por POS");
                    // Reintentar
                    continue;
                }
                else if (response == -1)
                {
                    _logger.LogWarning("⚠️ Timeout esperando ACK/NAK");
                    return false;
                }
                else
                {
                    _logger.LogWarning("⚠️ Respuesta inesperada: 0x{Response:X2}", response);
                }
            }

            _logger.LogError("❌ Máximo de reintentos alcanzado");
            return false;
        }
        finally
        {
            _portLock.Release();
        }
    }

    /// <summary>
    /// Envía un comando y retorna la respuesta (sin esperar ACK)
    /// </summary>
    private async Task<byte[]?> SendCommandAsync(byte[] message, int timeoutMs)
    {
        await _portLock.WaitAsync();
        try
        {
            _serialPort!.DiscardInBuffer();
            _serialPort.DiscardOutBuffer();
            _serialPort.Write(message, 0, message.Length);

            return await ReadMessageAsync(timeoutMs, CancellationToken.None);
        }
        finally
        {
            _portLock.Release();
        }
    }

    /// <summary>
    /// Espera y lee la respuesta completa del POS
    /// </summary>
    private async Task<byte[]?> WaitForResponseAsync(CancellationToken token)
    {
        var startTime = DateTime.Now;
        var buffer = new List<byte>();
        var stxFound = false;
        var etxIndex = -1;

        while ((DateTime.Now - startTime).TotalMilliseconds < TIMEOUT_RESPONSE_MS)
        {
            token.ThrowIfCancellationRequested();

            if (_serialPort!.BytesToRead > 0)
            {
                var b = (byte)_serialPort.ReadByte();
                
                // Procesar mensajes intermedios (estados como "Opere tarjeta")
                if (b == STX && !stxFound)
                {
                    stxFound = true;
                    buffer.Clear();
                    buffer.Add(b);
                    continue;
                }

                if (stxFound)
                {
                    buffer.Add(b);

                    if (b == ETX)
                    {
                        etxIndex = buffer.Count - 1;
                    }

                    // Después de ETX viene LRC (1 byte más)
                    if (etxIndex > 0 && buffer.Count == etxIndex + 2)
                    {
                        var message = buffer.ToArray();
                        
                        // Verificar LRC
                        var receivedLrc = message[^1];
                        var calculatedLrc = CalculateLrcFromMessage(message, 1, message.Length - 2);

                        if (receivedLrc == calculatedLrc)
                        {
                            // Extraer datos (sin STX, ETX, LRC)
                            var data = Encoding.ASCII.GetString(message, 1, message.Length - 3);
                            _logger.LogDebug("📥 Mensaje recibido: {Data}", data);

                            // Verificar si es mensaje intermedio o respuesta final
                            if (IsIntermediateMessage(data))
                            {
                                ProcessIntermediateMessage(data);
                                // Enviar ACK y seguir esperando
                                await SendAckAsync();
                                stxFound = false;
                                etxIndex = -1;
                                buffer.Clear();
                                continue;
                            }

                            return message;
                        }
                        else
                        {
                            _logger.LogWarning("⚠️ LRC inválido. Esperado: 0x{Expected:X2}, Recibido: 0x{Received:X2}", 
                                calculatedLrc, receivedLrc);
                            await SendNakAsync();
                            stxFound = false;
                            etxIndex = -1;
                            buffer.Clear();
                        }
                    }
                }
            }
            else
            {
                await Task.Delay(50, token);
            }
        }

        _logger.LogWarning("⚠️ Timeout esperando respuesta del POS");
        return null;
    }

    /// <summary>
    /// Lee un mensaje completo del puerto serial
    /// </summary>
    private async Task<byte[]?> ReadMessageAsync(int timeoutMs, CancellationToken token)
    {
        var startTime = DateTime.Now;
        var buffer = new List<byte>();
        var stxFound = false;
        var etxIndex = -1;

        while ((DateTime.Now - startTime).TotalMilliseconds < timeoutMs)
        {
            token.ThrowIfCancellationRequested();

            if (_serialPort!.BytesToRead > 0)
            {
                var b = (byte)_serialPort.ReadByte();

                if (b == STX)
                {
                    stxFound = true;
                    buffer.Clear();
                    buffer.Add(b);
                    continue;
                }

                if (stxFound)
                {
                    buffer.Add(b);

                    if (b == ETX)
                    {
                        etxIndex = buffer.Count - 1;
                    }

                    if (etxIndex > 0 && buffer.Count == etxIndex + 2)
                    {
                        return buffer.ToArray();
                    }
                }
            }
            else
            {
                await Task.Delay(10, token);
            }
        }

        return null;
    }

    /// <summary>
    /// Lee un solo byte con timeout
    /// </summary>
    private async Task<int> ReadByteWithTimeoutAsync(int timeoutMs, CancellationToken token)
    {
        var startTime = DateTime.Now;

        while ((DateTime.Now - startTime).TotalMilliseconds < timeoutMs)
        {
            token.ThrowIfCancellationRequested();

            if (_serialPort!.BytesToRead > 0)
            {
                return _serialPort.ReadByte();
            }

            await Task.Delay(10, token);
        }

        return -1;
    }

    /// <summary>
    /// Envía ACK al POS
    /// </summary>
    private async Task SendAckAsync()
    {
        if (_serialPort?.IsOpen == true)
        {
            _serialPort.Write(new[] { ACK }, 0, 1);
            _logger.LogDebug("📤 ACK enviado");
            await Task.Delay(10);
        }
    }

    /// <summary>
    /// Envía NAK al POS
    /// </summary>
    private async Task SendNakAsync()
    {
        if (_serialPort?.IsOpen == true)
        {
            _serialPort.Write(new[] { NAK }, 0, 1);
            _logger.LogDebug("📤 NAK enviado");
            await Task.Delay(10);
        }
    }

    /// <summary>
    /// Determina si un mensaje es intermedio (estado) o respuesta final
    /// </summary>
    private bool IsIntermediateMessage(string data)
    {
        // Los mensajes intermedios típicamente empiezan con 0900 (mensaje de display)
        return data.StartsWith("0900");
    }

    /// <summary>
    /// Procesa mensajes intermedios del POS (estados de display)
    /// </summary>
    private void ProcessIntermediateMessage(string data)
    {
        // Formato: 0900|mensaje
        var parts = data.Split('|');
        if (parts.Length >= 2)
        {
            var displayMessage = parts[1];
            _logger.LogInformation("📺 POS: {Message}", displayMessage);

            // Actualizar estado basado en mensaje
            if (displayMessage.Contains("TARJETA", StringComparison.OrdinalIgnoreCase) ||
                displayMessage.Contains("INSERTE", StringComparison.OrdinalIgnoreCase) ||
                displayMessage.Contains("ACERQUE", StringComparison.OrdinalIgnoreCase))
            {
                SetState(TransactionState.ESPERANDO_TARJETA);
            }
            else if (displayMessage.Contains("PROCESANDO", StringComparison.OrdinalIgnoreCase) ||
                     displayMessage.Contains("AUTORIZANDO", StringComparison.OrdinalIgnoreCase) ||
                     displayMessage.Contains("CONECTANDO", StringComparison.OrdinalIgnoreCase))
            {
                SetState(TransactionState.PROCESANDO);
            }
        }
    }

    /// <summary>
    /// Parsea la respuesta de venta del POS
    /// </summary>
    private PaymentResponse ParseSaleResponse(byte[] message, int originalAmount)
    {
        try
        {
            // Extraer datos (sin STX, ETX, LRC)
            var data = Encoding.ASCII.GetString(message, 1, message.Length - 3);
            var fields = data.Split('|');

            _logger.LogDebug("📋 Campos respuesta: {Fields}", string.Join(", ", fields));

            // Formato respuesta 0210:
            // 0210|CódigoRespuesta|CódigoComercio|TerminalId|NúmeroTicket|CódigoAutorización|
            // Monto|Últimos4Dígitos|TipoOperación|NúmeroCuotas|Monto Cuota|
            // FechaContable|NumeroOperación|TipoTarjeta|BancoEmisor|...

            if (fields.Length < 2)
            {
                return new PaymentResponse
                {
                    Success = false,
                    Message = "Respuesta del POS inválida",
                    State = TransactionState.ERROR,
                    Amount = originalAmount,
                    Timestamp = DateTime.Now
                };
            }

            var command = fields[0];
            var responseCode = fields.Length > 1 ? fields[1] : "";

            // Código 00 = Aprobado
            var isApproved = responseCode == "00";

            var response = new PaymentResponse
            {
                Success = isApproved,
                ResponseCode = responseCode,
                State = isApproved ? TransactionState.APROBADO : TransactionState.RECHAZADO,
                Amount = originalAmount,
                Timestamp = DateTime.Now
            };

            // Extraer campos adicionales si están disponibles
            if (fields.Length > 5) response.AuthorizationCode = fields[5];
            if (fields.Length > 6 && int.TryParse(fields[6], out var amount)) response.Amount = amount;
            if (fields.Length > 7) response.CardLast4Digits = fields[7];
            if (fields.Length > 8) response.CardType = GetCardTypeName(fields[8]);
            if (fields.Length > 11) response.TransactionId = fields[11];

            response.Message = isApproved 
                ? "Transacción aprobada" 
                : GetErrorMessage(responseCode);

            _logger.LogInformation(isApproved 
                ? "✅ Transacción APROBADA - Auth: {Auth}" 
                : "❌ Transacción RECHAZADA - Código: {Code}", 
                isApproved ? response.AuthorizationCode : responseCode);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parseando respuesta del POS");
            return new PaymentResponse
            {
                Success = false,
                Message = "Error procesando respuesta del POS",
                State = TransactionState.ERROR,
                Amount = originalAmount,
                Timestamp = DateTime.Now
            };
        }
    }

    /// <summary>
    /// Convierte código de tipo de tarjeta a nombre
    /// </summary>
    private string GetCardTypeName(string code) => code switch
    {
        "CR" => "CREDITO",
        "DB" => "DEBITO",
        "NB" => "NO_BANCARIA",
        _ => code
    };

    /// <summary>
    /// Obtiene mensaje de error según código de respuesta
    /// </summary>
    private string GetErrorMessage(string code) => code switch
    {
        "01" => "Transacción rechazada",
        "02" => "Error de comunicación",
        "03" => "Error en formato de mensaje",
        "04" => "Tarjeta vencida",
        "05" => "Transacción no permitida",
        "51" => "Fondos insuficientes",
        "54" => "Tarjeta vencida",
        "55" => "PIN incorrecto",
        "57" => "Transacción no permitida",
        "58" => "Transacción no permitida en terminal",
        "61" => "Excede límite de monto",
        "65" => "Excede límite de frecuencia",
        "75" => "Exceso de intentos de PIN",
        "91" => "Banco no disponible",
        "96" => "Error del sistema",
        _ => $"Error código {code}"
    };

    #endregion

    #region State Management

    private void SetState(TransactionState newState)
    {
        if (_currentState != newState)
        {
            var oldState = _currentState;
            _currentState = newState;
            StateChanged?.Invoke(this, newState);
            _logger.LogDebug("Estado POS: {OldState} -> {NewState}", oldState, newState);
        }
    }

    #endregion

    #region IDisposable

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _transactionCts?.Cancel();
                _transactionCts?.Dispose();
                
                if (_serialPort?.IsOpen == true)
                {
                    _serialPort.Close();
                }
                _serialPort?.Dispose();
                
                _portLock.Dispose();
            }
            _disposed = true;
        }
    }

    #endregion
}
