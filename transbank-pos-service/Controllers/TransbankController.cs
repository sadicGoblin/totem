using Microsoft.AspNetCore.Mvc;
using TransbankPosService.Models;
using TransbankPosService.Services;

namespace TransbankPosService.Controllers;

/// <summary>
/// Controller para operaciones del POS Transbank.
/// Endpoints consumidos por el sistema kiosko (Angular/Electron).
/// </summary>
[ApiController]
[Route("api/transbank")]
public class TransbankController : ControllerBase
{
    private readonly TransbankService _transbankService;
    private readonly ILogger<TransbankController> _logger;

    public TransbankController(TransbankService transbankService, ILogger<TransbankController> logger)
    {
        _transbankService = transbankService;
        _logger = logger;
    }

    /// <summary>
    /// Inicia una transacción de pago en el POS
    /// </summary>
    /// <param name="request">Datos del pago (monto requerido)</param>
    /// <returns>Resultado de la transacción</returns>
    /// <remarks>
    /// Ejemplo de request:
    /// POST /api/transbank/pagar
    /// { "monto": 15000 }
    /// </remarks>
    [HttpPost("pagar")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PaymentResponse>> ProcessPayment([FromBody] PaymentRequest request)
    {
        _logger.LogInformation("📥 POST /api/transbank/pagar - Monto: ${Monto}", request.Monto);

        if (!ModelState.IsValid)
        {
            return BadRequest(new PaymentResponse
            {
                Success = false,
                Message = "Datos de pago inválidos",
                State = TransactionState.ERROR
            });
        }

        try
        {
            var response = await _transbankService.ProcessPaymentAsync(request);
            
            if (response.Success)
            {
                _logger.LogInformation("✅ Pago exitoso - Auth: {Auth}", response.AuthorizationCode);
                return Ok(response);
            }
            else if (response.State == TransactionState.RECHAZADO)
            {
                _logger.LogWarning("❌ Pago rechazado");
                return Ok(response); // 200 pero con Success=false
            }
            else
            {
                _logger.LogWarning("⚠️ Error en pago: {Message}", response.Message);
                return Conflict(response);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error procesando pago");
            return StatusCode(500, new PaymentResponse
            {
                Success = false,
                Message = "Error interno del servidor",
                State = TransactionState.ERROR
            });
        }
    }

    /// <summary>
    /// Cancela la transacción actual si es posible.
    /// ⚠️ NO se puede cancelar si el POS está en estado ESPERANDO_TARJETA
    /// </summary>
    /// <returns>Resultado de la cancelación</returns>
    [HttpPost("cancelar")]
    [ProducesResponseType(typeof(CancelResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CancelResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CancelResponse>> CancelPayment()
    {
        _logger.LogInformation("📥 POST /api/transbank/cancelar");

        try
        {
            var response = await _transbankService.CancelPaymentAsync();
            
            if (response.Success)
            {
                _logger.LogInformation("✅ Cancelación exitosa");
                return Ok(response);
            }
            else
            {
                _logger.LogWarning("⚠️ No se pudo cancelar: {Reason}", response.FailureReason);
                return Conflict(response);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error cancelando pago");
            return StatusCode(500, new CancelResponse
            {
                Success = false,
                Message = "Error interno del servidor",
                State = TransactionState.ERROR
            });
        }
    }

    /// <summary>
    /// Obtiene el estado actual del POS
    /// </summary>
    /// <returns>Estado detallado del POS</returns>
    [HttpGet("estado")]
    [ProducesResponseType(typeof(StatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<StatusResponse>> GetStatus()
    {
        _logger.LogDebug("📥 GET /api/transbank/estado");

        try
        {
            var status = await _transbankService.GetStatusAsync();
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error obteniendo estado");
            return StatusCode(500, new StatusResponse
            {
                State = TransactionState.ERROR,
                Message = "Error al obtener estado del POS"
            });
        }
    }

    /// <summary>
    /// Health check del servicio
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult HealthCheck()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.Now });
    }
}
