namespace TransbankPosService.Models;

/// <summary>
/// Respuesta de una operación de cancelación
/// </summary>
public class CancelResponse
{
    /// <summary>Indica si la cancelación fue exitosa</summary>
    public bool Success { get; set; }
    
    /// <summary>Mensaje descriptivo</summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>Estado actual del POS después de la cancelación</summary>
    public TransactionState State { get; set; }
    
    /// <summary>Razón por la que no se pudo cancelar (si aplica)</summary>
    public string? FailureReason { get; set; }
}
