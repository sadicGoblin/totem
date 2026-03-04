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

## 🔧 Configuración POS Transbank IM30 (USB Serial)

El servicio incluye una implementación completa para comunicación serial con el POS **PAX IM30**.

### 1. Identificar el Puerto COM en Windows 11

1. Conecta el POS IM30 por USB al PC
2. Abre **Administrador de dispositivos** (Win+X → Administrador de dispositivos)
3. Expande **Puertos (COM y LPT)**
4. Busca el dispositivo PAX o USB Serial (ejemplo: `COM3`, `COM4`)

### 2. Configurar `appsettings.json`

```json
{
  "Transbank": {
    "PortName": "COM3",      // <-- Cambiar al puerto detectado
    "BaudRate": 115200,
    "TimeoutMs": 120000,
    "UseMock": false          // <-- false para usar POS real
  }
}
```

### 3. Ejecutar en Modo Producción

```bash
# Con UseMock: false, usará la comunicación serial real
dotnet run
```

Verás en consola:
```
✅ MODO: PRODUCCIÓN (POS Serial USB)
```

### 4. Protocolo de Comunicación

La implementación sigue el protocolo oficial de Transbank:

| Parámetro | Valor |
|-----------|-------|
| Velocidad | 115200 bps |
| Data Bits | 8 |
| Paridad | None |
| Stop Bits | 1 |
| STX | 0x02 |
| ETX | 0x03 |
| ACK | 0x06 |
| NAK | 0x15 |
| Separador | `\|` (0x7C) |

**Formato de mensaje:** `<STX>DATOS<ETX><LRC>`

**Comando de venta (0200):** `<STX>0200|monto|ticket|1|1<ETX><LRC>`

### 5. Flujo de Transacción

```
PC (Caja)                         POS IM30
    |                                 |
    |-- <STX>0200|25000|123<ETX>LRC ->|
    |                                 |
    |<------------ ACK ---------------|  (o NAK si LRC incorrecto)
    |                                 |
    |         [Cliente opera tarjeta] |
    |                                 |
    |<-- Mensajes intermedios 0900 -->|
    |------------ ACK --------------->|
    |                                 |
    |<-- <STX>0210|00|...<ETX>LRC ----| (Respuesta final)
    |------------ ACK --------------->|
    |                                 |
```

### 6. Códigos de Respuesta

| Código | Significado |
|--------|-------------|
| 00 | Aprobado |
| 01 | Rechazado |
| 51 | Fondos insuficientes |
| 54 | Tarjeta vencida |
| 55 | PIN incorrecto |
| 75 | Exceso de intentos PIN |
| 91 | Banco no disponible |

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
│   ├── TransbankPosSerialImpl.cs # Implementación real USB serial
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
