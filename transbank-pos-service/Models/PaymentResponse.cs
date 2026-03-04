namespace TransbankPosService.Models;

/// <summary>
/// Respuesta de una operación de pago
/// </summary>
public class PaymentResponse
{
    /// <summary>Indica si la operación fue exitosa</summary>
    public bool Success { get; set; }
    
    /// <summary>Mensaje descriptivo del resultado</summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>Estado actual del POS</summary>
    public TransactionState State { get; set; }
    
    /// <summary>Código de autorización (si fue aprobado)</summary>
    public string? AuthorizationCode { get; set; }
    
    /// <summary>Últimos 4 dígitos de la tarjeta</summary>
    public string? CardLast4Digits { get; set; }
    
    /// <summary>Tipo de tarjeta (DEBITO, CREDITO)</summary>
    public string? CardType { get; set; }
    
    /// <summary>Monto de la transacción</summary>
    public int? Amount { get; set; }
    
    /// <summary>ID único de la transacción</summary>
    public string? TransactionId { get; set; }
    
    /// <summary>Fecha y hora de la transacción</summary>
    public DateTime? Timestamp { get; set; }
    
    /// <summary>Código de respuesta del POS</summary>
    public string? ResponseCode { get; set; }
}
