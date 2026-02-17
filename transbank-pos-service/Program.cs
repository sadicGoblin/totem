using TransbankPosService.Interfaces;
using TransbankPosService.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================
// CONFIGURACIÓN DE SERVICIOS
// ============================================

// Controllers
builder.Services.AddControllers();

// Swagger para documentación de API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() 
    { 
        Title = "Transbank POS Service", 
        Version = "v1",
        Description = "API para integración con POS Transbank en tótems de autoservicio"
    });
});

// ============================================
// REGISTRO DE SERVICIOS TRANSBANK
// ============================================

// 🔧 IMPORTANTE: Para PRODUCCIÓN, reemplazar MockTransbankPos con la implementación real
// Ejemplo:
// builder.Services.AddSingleton<ITransbankPos, RealTransbankPos>();

// Usando MOCK para desarrollo
builder.Services.AddSingleton<ITransbankPos, MockTransbankPos>();

// Servicio principal de Transbank
builder.Services.AddSingleton<TransbankService>();

// ============================================
// CONFIGURACIÓN DE CORS (para Electron/Angular)
// ============================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowKiosk", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ============================================
// CONFIGURACIÓN DEL HOST
// ============================================

// Configurar para escuchar en puerto 7070
builder.WebHost.UseUrls("http://localhost:7070");

var app = builder.Build();

// ============================================
// PIPELINE DE MIDDLEWARE
// ============================================

// Swagger solo en desarrollo (o siempre si quieres documentación)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Transbank POS Service v1");
    c.RoutePrefix = string.Empty; // Swagger en la raíz
});

// CORS
app.UseCors("AllowKiosk");

// Logging de requests
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("➡️ {Method} {Path}", context.Request.Method, context.Request.Path);
    await next();
});

// Controllers
app.MapControllers();

// ============================================
// INICIO DEL SERVICIO
// ============================================

Console.WriteLine(@"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏦 TRANSBANK POS SERVICE                                    ║
║   ─────────────────────────────────────────────────────────   ║
║   Servidor iniciado en: http://localhost:7070                 ║
║   Swagger UI: http://localhost:7070                           ║
║                                                               ║
║   Endpoints disponibles:                                      ║
║   • POST /api/transbank/pagar     - Iniciar pago              ║
║   • POST /api/transbank/cancelar  - Cancelar transacción      ║
║   • GET  /api/transbank/estado    - Estado del POS            ║
║   • GET  /api/transbank/health    - Health check              ║
║                                                               ║
║   ⚠️  MODO: MOCK (Desarrollo)                                 ║
║   Para producción, implementar ITransbankPos con SDK real     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
");

app.Run();
