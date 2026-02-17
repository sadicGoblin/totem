using TransbankPosService.Interfaces;
using TransbankPosService.Models;

namespace TransbankPosService.Services;

/// <summary>
/// Implementación MOCK del POS Transbank para desarrollo y testing.
/// ⚠️ REEMPLAZAR con implementación real usando SDK Transbank para producción.
/// </summary>
public class MockTransbankPos : ITransbankPos
{
    private TransactionState _currentState = TransactionState.IDLE;
    private int _currentAmount = 0;
    private readonly ILogger<MockTransbankPos> _logger;
    private CancellationTokenSource? _transactionCts;
    
    public event EventHandler<TransactionState>? StateChanged;

    public MockTransbankPos(ILogger<MockTransbankPos> logger)
    {
        _logger = logger;
    }

    public Task<bool> InitializeAsync()
    {
        _logger.LogInformation("🔌 [MOCK] Inicializando conexión con POS Transbank...");
        return Task.FromResult(true);
    }

    public Task<bool> IsConnectedAsync()
    {
        return Task.FromResult(true);
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

        _currentAmount = amount;
        _transactionCts = new CancellationTokenSource();
        var token = _transactionCts.Token;

        try
        {
            // Fase 1: Iniciando pago
            SetState(TransactionState.INICIANDO_PAGO);
            _logger.LogInformation("💳 [MOCK] Iniciando pago por ${Amount}...", amount);
            await Task.Delay(1500, token);

            // Fase 2: Esperando tarjeta
            SetState(TransactionState.ESPERANDO_TARJETA);
            _logger.LogInformation("⏳ [MOCK] Esperando tarjeta del cliente...");
            await Task.Delay(3000, token); // Simula espera de tarjeta

            // Fase 3: Procesando
            SetState(TransactionState.PROCESANDO);
            _logger.LogInformation("🔄 [MOCK] Procesando transacción...");
            await Task.Delay(2000, token);

            // Fase 4: Resultado (90% aprobado, 10% rechazado para testing)
            var random = new Random();
            var isApproved = random.Next(100) < 90;

            if (isApproved)
            {
                SetState(TransactionState.APROBADO);
                _logger.LogInformation("✅ [MOCK] Transacción APROBADA");
                
                var response = new PaymentResponse
                {
                    Success = true,
                    Message = "Transacción aprobada",
                    State = TransactionState.APROBADO,
                    AuthorizationCode = random.Next(100000, 999999).ToString(),
                    CardLast4Digits = random.Next(1000, 9999).ToString(),
                    CardType = random.Next(2) == 0 ? "DEBITO" : "CREDITO",
                    Amount = amount,
                    TransactionId = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                    Timestamp = DateTime.Now,
                    ResponseCode = "00"
                };

                // Volver a IDLE después de un momento
                _ = Task.Run(async () =>
                {
                    await Task.Delay(2000);
                    SetState(TransactionState.IDLE);
                });

                return response;
            }
            else
            {
                SetState(TransactionState.RECHAZADO);
                _logger.LogWarning("❌ [MOCK] Transacción RECHAZADA");
                
                _ = Task.Run(async () =>
                {
                    await Task.Delay(2000);
                    SetState(TransactionState.IDLE);
                });

                return new PaymentResponse
                {
                    Success = false,
                    Message = "Transacción rechazada por el banco",
                    State = TransactionState.RECHAZADO,
                    Amount = amount,
                    Timestamp = DateTime.Now,
                    ResponseCode = "51" // Fondos insuficientes
                };
            }
        }
        catch (OperationCanceledException)
        {
            SetState(TransactionState.CANCELADO);
            _logger.LogInformation("🚫 [MOCK] Transacción CANCELADA");
            
            _ = Task.Run(async () =>
            {
                await Task.Delay(1000);
                SetState(TransactionState.IDLE);
            });

            return new PaymentResponse
            {
                Success = false,
                Message = "Transacción cancelada por el usuario",
                State = TransactionState.CANCELADO,
                Amount = amount,
                Timestamp = DateTime.Now
            };
        }
        finally
        {
            _currentAmount = 0;
            _transactionCts?.Dispose();
            _transactionCts = null;
        }
    }

    public Task<CancelResponse> CancelCurrentTransactionAsync()
    {
        _logger.LogInformation("🚫 [MOCK] Solicitud de cancelación. Estado actual: {State}", _currentState);

        // REGLA IMPORTANTE: No se puede cancelar si está esperando tarjeta
        if (_currentState == TransactionState.ESPERANDO_TARJETA)
        {
            _logger.LogWarning("⚠️ [MOCK] No se puede cancelar - POS esperando tarjeta");
            return Task.FromResult(new CancelResponse
            {
                Success = false,
                Message = "No se puede cancelar mientras el POS espera la tarjeta",
                State = _currentState,
                FailureReason = "POS en estado ESPERANDO_TARJETA. La cancelación debe hacerse desde el dispositivo físico."
            });
        }

        // No se puede cancelar si no hay transacción activa
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

        // Cancelar la transacción
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
        _logger.LogInformation("🔌 [MOCK] Cerrando conexión con POS");
        _transactionCts?.Cancel();
        SetState(TransactionState.IDLE);
        return Task.CompletedTask;
    }

    private void SetState(TransactionState newState)
    {
        if (_currentState != newState)
        {
            _currentState = newState;
            StateChanged?.Invoke(this, newState);
            _logger.LogDebug("Estado POS: {OldState} -> {NewState}", _currentState, newState);
        }
    }
}
