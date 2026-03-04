using TransbankPosService.Models;

namespace TransbankPosService.Interfaces;

/// <summary>
/// Interfaz para comunicación con el POS Transbank.
/// Implementar esta interfaz con el SDK real de Transbank para producción.
/// </summary>
public interface ITransbankPos
{
    /// <summary>
    /// Inicializa la conexión con el POS
    /// </summary>
    /// <returns>True si la conexión fue exitosa</returns>
    Task<bool> InitializeAsync();
    
    /// <summary>
    /// Inicializa el POS descargando parámetros TMS desde el servidor.
    /// Usar cuando el POS muestra "NO PUEDE OPERAR SIN PARAMETROS TMS".
    /// Flujo: Comando 0070 -> Esperar reinicio -> Polling 0100 -> Comando 0080
    /// </summary>
    /// <returns>True si la inicialización TMS fue exitosa</returns>
    Task<bool> InitializeTmsAsync();
    
    /// <summary>
    /// Verifica si el POS está conectado y disponible
    /// </summary>
    Task<bool> IsConnectedAsync();
    
    /// <summary>
    /// Inicia una transacción de venta
    /// </summary>
    /// <param name="amount">Monto en pesos chilenos</param>
    /// <param name="ticketNumber">Número de boleta (opcional)</param>
    /// <returns>Respuesta del POS</returns>
    Task<PaymentResponse> StartPaymentAsync(int amount, string? ticketNumber = null);
    
    /// <summary>
    /// Cancela la transacción actual si es posible.
    /// IMPORTANTE: Solo se puede cancelar si el POS no está en ESPERANDO_TARJETA
    /// </summary>
    /// <returns>Resultado de la cancelación</returns>
    Task<CancelResponse> CancelCurrentTransactionAsync();
    
    /// <summary>
    /// Obtiene el estado actual del POS
    /// </summary>
    Task<TransactionState> GetCurrentStateAsync();
    
    /// <summary>
    /// Cierra la conexión con el POS
    /// </summary>
    Task CloseConnectionAsync();
    
    /// <summary>
    /// Evento disparado cuando cambia el estado del POS
    /// </summary>
    event EventHandler<TransactionState>? StateChanged;
}
