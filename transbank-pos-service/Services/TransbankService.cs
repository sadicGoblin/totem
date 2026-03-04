using TransbankPosService.Interfaces;
using TransbankPosService.Models;

namespace TransbankPosService.Services;

/// <summary>
/// Servicio principal que gestiona las operaciones del POS Transbank.
/// Actúa como capa intermedia entre el Controller y el POS.
/// </summary>
public class TransbankService
{
    private readonly ITransbankPos _pos;
    private readonly ILogger<TransbankService> _logger;
    private PaymentResponse? _lastTransaction;
    private DateTime? _transactionStartTime;
    private int _currentTransactionAmount;

    public TransbankService(ITransbankPos pos, ILogger<TransbankService> logger)
    {
        _pos = pos;
        _logger = logger;
        
        // Suscribirse a cambios de estado
        _pos.StateChanged += OnPosStateChanged;
    }

    private void OnPosStateChanged(object? sender, TransactionState newState)
    {
        _logger.LogInformation("📡 Estado POS actualizado: {State}", newState);
        
        if (newState == TransactionState.IDLE)
        {
            _transactionStartTime = null;
            _currentTransactionAmount = 0;
        }
    }

    /// <summary>
    /// Inicia un nuevo pago
    /// </summary>
    public async Task<PaymentResponse> ProcessPaymentAsync(PaymentRequest request)
    {
        _logger.LogInformation("💰 Procesando pago por ${Amount}", request.Monto);
        
        _transactionStartTime = DateTime.Now;
        _currentTransactionAmount = request.Monto;
        
        var response = await _pos.StartPaymentAsync(request.Monto, request.NumeroTicket);
        
        if (response.Success || response.State == TransactionState.RECHAZADO)
        {
            _lastTransaction = response;
        }
        
        return response;
    }

    /// <summary>
    /// Cancela la transacción actual si es posible
    /// </summary>
    public async Task<CancelResponse> CancelPaymentAsync()
    {
        _logger.LogInformation("🚫 Solicitando cancelación de pago...");
        return await _pos.CancelCurrentTransactionAsync();
    }

    /// <summary>
    /// Inicializa el POS descargando parámetros TMS.
    /// Usar cuando el POS muestra "NO PUEDE OPERAR SIN PARAMETROS TMS".
    /// </summary>
    public async Task<bool> InitializeTmsAsync()
    {
        _logger.LogInformation("📡 Iniciando carga de parámetros TMS...");
        return await _pos.InitializeTmsAsync();
    }

    /// <summary>
    /// Obtiene el estado actual del sistema
    /// </summary>
    public async Task<StatusResponse> GetStatusAsync()
    {
        var state = await _pos.GetCurrentStateAsync();
        var isInProgress = state != TransactionState.IDLE && 
                          state != TransactionState.APROBADO && 
                          state != TransactionState.RECHAZADO &&
                          state != TransactionState.ERROR;

        // Calcular si se puede cancelar
        var canCancel = state == TransactionState.INICIANDO_PAGO || 
                       state == TransactionState.PROCESANDO;
        
        // IMPORTANTE: No se puede cancelar si está esperando tarjeta
        if (state == TransactionState.ESPERANDO_TARJETA)
        {
            canCancel = false;
        }

        int? elapsedSeconds = null;
        if (_transactionStartTime.HasValue && isInProgress)
        {
            elapsedSeconds = (int)(DateTime.Now - _transactionStartTime.Value).TotalSeconds;
        }

        return new StatusResponse
        {
            State = state,
            IsTransactionInProgress = isInProgress,
            CanCancel = canCancel,
            CurrentAmount = isInProgress ? _currentTransactionAmount : null,
            ElapsedSeconds = elapsedSeconds,
            Message = GetStateMessage(state),
            LastTransaction = _lastTransaction
        };
    }

    private static string GetStateMessage(TransactionState state) => state switch
    {
        TransactionState.IDLE => "POS disponible",
        TransactionState.INICIANDO_PAGO => "Iniciando comunicación con el POS...",
        TransactionState.ESPERANDO_TARJETA => "Por favor, inserte o acerque su tarjeta al POS",
        TransactionState.PROCESANDO => "Procesando transacción, por favor espere...",
        TransactionState.APROBADO => "¡Transacción aprobada!",
        TransactionState.RECHAZADO => "Transacción rechazada",
        TransactionState.CANCELADO => "Transacción cancelada",
        TransactionState.ERROR => "Error en la transacción",
        _ => "Estado desconocido"
    };
}
