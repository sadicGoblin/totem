namespace TransbankPosService.Models;

/// <summary>
/// Respuesta del estado actual del POS
/// </summary>
public class StatusResponse
{
    /// <summary>Estado actual del POS</summary>
    public TransactionState State { get; set; }
    
    /// <summary>Nombre del estado en texto</summary>
    public string StateName => State.ToString();
    
    /// <summary>Indica si hay una transacción en curso</summary>
    public bool IsTransactionInProgress { get; set; }
    
    /// <summary>Indica si se puede cancelar la transacción actual</summary>
    public bool CanCancel { get; set; }
    
    /// <summary>Monto de la transacción actual (si hay una en curso)</summary>
    public int? CurrentAmount { get; set; }
    
    /// <summary>Tiempo transcurrido desde el inicio de la transacción (segundos)</summary>
    public int? ElapsedSeconds { get; set; }
    
    /// <summary>Mensaje adicional de estado</summary>
    public string? Message { get; set; }
    
    /// <summary>Última transacción completada (si existe)</summary>
    public PaymentResponse? LastTransaction { get; set; }
}
