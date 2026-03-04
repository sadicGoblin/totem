# Transbank POS Service (Node.js)

Servicio Node.js para comunicación con POS Transbank IM30/Autoservicio usando el SDK oficial.

## Requisitos

- Node.js 20+
- Python 3 (requerido por el SDK para compilar dependencias nativas)
- POS Transbank conectado por USB

## Instalación

```bash
cd transbank-pos-nodejs
npm install
```

## Ejecución

```bash
npm start
```

El servidor se iniciará en `http://localhost:7070`

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/transbank/health` | Health check |
| GET | `/api/transbank/diagnostico` | Lista puertos COM disponibles |
| GET | `/api/transbank/estado` | Estado actual del POS |
| POST | `/api/transbank/conectar` | Autoconectar al POS |
| POST | `/api/transbank/conectar/:puerto` | Conectar a puerto específico |
| POST | `/api/transbank/desconectar` | Desconectar del POS |
| POST | `/api/transbank/inicializar-tms` | Cargar llaves/parámetros TMS |
| POST | `/api/transbank/pagar` | Procesar pago |
| POST | `/api/transbank/cancelar` | Cancelar transacción |
| POST | `/api/transbank/poll` | Verificar conexión |
| POST | `/api/transbank/cerrar-dia` | Cierre de día |
| GET | `/api/transbank/ultima-venta` | Última venta realizada |

## Uso

### 1. Conectar al POS

```bash
curl -X POST http://localhost:7070/api/transbank/conectar
```

### 2. Cargar parámetros TMS (si el POS lo requiere)

```bash
curl -X POST http://localhost:7070/api/transbank/inicializar-tms
```

### 3. Procesar un pago

```bash
curl -X POST http://localhost:7070/api/transbank/pagar \
  -H "Content-Type: application/json" \
  -d '{"monto": 1000, "numeroTicket": "TKT-001"}'
```

### 4. Verificar estado

```bash
curl http://localhost:7070/api/transbank/estado
```

## Integración con Angular

El servicio es compatible con el `TransbankService` de Angular existente.
Solo asegúrate de que la URL base apunte a `http://localhost:7070`.

## Diferencias con el servicio .NET

| Característica | .NET | Node.js |
|----------------|------|---------|
| Conexión | Manual (especificar puerto) | Automática (`autoconnect`) |
| Protocolo serial | Implementación manual | SDK oficial |
| Complejidad | ~1000 líneas | ~400 líneas |
| Dependencias | .NET Runtime | Node.js + Python |

## Solución de problemas

### "No se encontró ningún POS conectado"

1. Verifica que el POS esté encendido y conectado por USB
2. Ejecuta `GET /api/transbank/diagnostico` para ver puertos disponibles
3. Intenta conectar a un puerto específico: `POST /api/transbank/conectar/COM4`

### Error al instalar dependencias

El SDK requiere Python 3 para compilar módulos nativos:
```bash
# Windows
python --version  # Debe ser 3.x

# Si no tienes Python, instálalo desde python.org
```

### El POS muestra "NO PUEDE OPERAR SIN PARAMETROS TMS"

Ejecuta:
```bash
curl -X POST http://localhost:7070/api/transbank/inicializar-tms
```
