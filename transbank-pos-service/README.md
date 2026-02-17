# 🏦 Transbank POS Service

Servicio local en .NET 8 que funciona como puente entre un sistema kiosko (Angular/Electron) y un POS Transbank Integrado.

## 📋 Requisitos

- .NET 8 SDK
- Windows 10/11
- (Producción) POS Transbank Integrado conectado

## 🚀 Instalación y Ejecución

```bash
# Navegar al directorio del proyecto
cd transbank-pos-service

# Restaurar dependencias
dotnet restore

# Ejecutar en modo desarrollo
dotnet run

# O compilar para producción
dotnet publish -c Release -o ./publish
```

El servicio estará disponible en: **http://localhost:7070**

## 📡 Endpoints

### POST `/api/transbank/pagar`
Inicia una transacción de pago.

**Request:**
```json
{
  "monto": 15000,
  "numeroTicket": "0001"  // opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transacción aprobada",
  "state": "APROBADO",
  "authorizationCode": "123456",
  "cardLast4Digits": "1234",
  "cardType": "DEBITO",
  "amount": 15000,
  "transactionId": "ABC123DEF456",
  "timestamp": "2024-01-23T18:30:00Z",
  "responseCode": "00"
}
```

### POST `/api/transbank/cancelar`
Cancela la transacción actual si es posible.

⚠️ **IMPORTANTE:** No se puede cancelar si el POS está en estado `ESPERANDO_TARJETA`.

**Response:**
```json
{
  "success": true,
  "message": "Transacción cancelada exitosamente",
  "state": "CANCELADO"
}
```

**Si no se puede cancelar:**
```json
{
  "success": false,
  "message": "No se puede cancelar mientras el POS espera la tarjeta",
  "state": "ESPERANDO_TARJETA",
  "failureReason": "POS en estado ESPERANDO_TARJETA. La cancelación debe hacerse desde el dispositivo físico."
}
```

### GET `/api/transbank/estado`
Retorna el estado actual del POS.

**Response:**
```json
{
  "state": "IDLE",
  "stateName": "IDLE",
  "isTransactionInProgress": false,
  "canCancel": false,
  "currentAmount": null,
  "elapsedSeconds": null,
  "message": "POS disponible",
  "lastTransaction": null
}
```

### GET `/api/transbank/health`
Health check del servicio.

## 🔄 Estados del POS

| Estado | Descripción | ¿Se puede cancelar? |
|--------|-------------|---------------------|
| `IDLE` | POS disponible | N/A |
| `INICIANDO_PAGO` | Iniciando comunicación | ✅ Sí |
| `ESPERANDO_TARJETA` | Esperando tarjeta del cliente | ❌ **NO** |
| `PROCESANDO` | Procesando con el banco | ✅ Sí |
| `APROBADO` | Transacción aprobada | N/A |
| `RECHAZADO` | Transacción rechazada | N/A |
| `CANCELADO` | Transacción cancelada | N/A |
| `ERROR` | Error en la transacción | N/A |

## 🔧 Integración con SDK Real de Transbank

Para producción, debes:

1. **Instalar el SDK oficial de Transbank:**
   ```xml
   <!-- En TransbankPosService.csproj -->
   <PackageReference Include="Transbank.POSIntegrado" Version="x.x.x" />
   ```

2. **Crear implementación real de `ITransbankPos`:**
   ```csharp
   // Services/RealTransbankPos.cs
   public class RealTransbankPos : ITransbankPos
   {
       private readonly POS _pos; // SDK Transbank
       
       public async Task<PaymentResponse> StartPaymentAsync(int amount, string? ticketNumber)
       {
           // Implementar usando SDK real
           var response = await _pos.Sale(amount, ticketNumber);
           // Mapear respuesta...
       }
   }
   ```

3. **Registrar en `Program.cs`:**
   ```csharp
   // Cambiar de:
   builder.Services.AddSingleton<ITransbankPos, MockTransbankPos>();
   // A:
   builder.Services.AddSingleton<ITransbankPos, RealTransbankPos>();
   ```

## 📁 Estructura del Proyecto

```
transbank-pos-service/
├── Controllers/
│   └── TransbankController.cs    # Endpoints API
├── Interfaces/
│   └── ITransbankPos.cs          # Interfaz para POS
├── Models/
│   ├── TransactionState.cs       # Estados del POS
│   ├── PaymentRequest.cs         # Request de pago
│   ├── PaymentResponse.cs        # Response de pago
│   ├── CancelResponse.cs         # Response de cancelación
│   └── StatusResponse.cs         # Response de estado
├── Services/
│   ├── MockTransbankPos.cs       # Mock para desarrollo
│   └── TransbankService.cs       # Servicio principal
├── Program.cs                    # Entry point y configuración
├── appsettings.json             # Configuración
└── README.md
```

## 🧪 Testing con cURL

```bash
# Iniciar pago
curl -X POST http://localhost:7070/api/transbank/pagar \
  -H "Content-Type: application/json" \
  -d '{"monto": 15000}'

# Obtener estado
curl http://localhost:7070/api/transbank/estado

# Cancelar
curl -X POST http://localhost:7070/api/transbank/cancelar
```

## 📝 Uso desde Angular

```typescript
// transbank.service.ts
@Injectable({ providedIn: 'root' })
export class TransbankLocalService {
  private baseUrl = 'http://localhost:7070/api/transbank';

  constructor(private http: HttpClient) {}

  pagar(monto: number): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/pagar`, { monto });
  }

  cancelar(): Observable<CancelResponse> {
    return this.http.post<CancelResponse>(`${this.baseUrl}/cancelar`, {});
  }

  getEstado(): Observable<StatusResponse> {
    return this.http.get<StatusResponse>(`${this.baseUrl}/estado`);
  }
}
```

## 📄 Licencia

Uso interno - Rinno
