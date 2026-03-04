using System.ComponentModel.DataAnnotations;

namespace TransbankPosService.Models;

/// <summary>
/// Request para iniciar un pago
/// </summary>
public class PaymentRequest
{
    /// <summary>
    /// Monto a cobrar en pesos chilenos (sin decimales)
    /// </summary>
    [Required]
    [Range(1, 99999999, ErrorMessage = "El monto debe ser mayor a 0 y menor a 100.000.000")]
    public int Monto { get; set; }
    
    /// <summary>
    /// Número de boleta o ticket (opcional)
    /// </summary>
    public string? NumeroTicket { get; set; }
}
