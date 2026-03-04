namespace TransbankPosService.Models;

/// <summary>
/// Estados posibles del POS Transbank
/// </summary>
public enum TransactionState
{
    /// <summary>POS disponible, sin transacción activa</summary>
    IDLE,
    
    /// <summary>Iniciando comunicación con el POS</summary>
    INICIANDO_PAGO,
    
    /// <summary>POS esperando que el cliente inserte/acerque tarjeta</summary>
    ESPERANDO_TARJETA,
    
    /// <summary>Procesando la transacción con el banco</summary>
    PROCESANDO,
    
    /// <summary>Transacción aprobada exitosamente</summary>
    APROBADO,
    
    /// <summary>Transacción rechazada por el banco</summary>
    RECHAZADO,
    
    /// <summary>Transacción cancelada por el usuario o sistema</summary>
    CANCELADO,
    
    /// <summary>Error en la comunicación o proceso</summary>
    ERROR
}
