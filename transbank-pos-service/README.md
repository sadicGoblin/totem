# transbank-pos-service

Microservicio Node.js que expone una API REST en `http://127.0.0.1:8081` sobre el SDK oficial de Transbank (`transbank-pos-sdk`) para hablar por USB con el POS **IM30 Autoservicio**.

Es consumido por el totem (`../totem`) para reemplazar la simulación PAX que existe hoy en `payment.component.ts`.

## Instalación

```bash
cd transbank-pos-service
npm install
```

## Uso

```bash
npm start
```

Variables de entorno:

| Variable | Default | Uso |
|----------|---------|-----|
| `PORT`   | `8081`  | Puerto HTTP local |

## Endpoints

| Método | Path | Body / Params | Descripción |
|--------|------|---------------|-------------|
| GET  | `/api/transbank/health` | — | Liveness y estado de conexión |
| GET  | `/api/transbank/diagnostico` | — | Lista los puertos serie disponibles |
| GET  | `/api/transbank/estado` | — | Estado de la transacción + último voucher |
| POST | `/api/transbank/conectar` | — | Autoconectar al POS |
| POST | `/api/transbank/conectar/:puerto` | `:puerto` (ej. `COM3`) | Conectar a un puerto específico |
| POST | `/api/transbank/desconectar` | — | Liberar el puerto |
| POST | `/api/transbank/inicializar-tms` | — | Cargar llaves TMS (recomendado 1 vez al día) |
| POST | `/api/transbank/pagar` | `{ "monto": 1500, "numeroTicket": "TKT-..." }` | Iniciar venta |
| POST | `/api/transbank/cancelar` | — | Forzar cancelación (desconecta y reconecta) |
| POST | `/api/transbank/poll` | — | Verificar conexión |
| POST | `/api/transbank/cerrar-dia` | — | Cierre Z |
| GET  | `/api/transbank/ultima-venta` | — | Repetir voucher anterior |

## Estados de transacción

```
IDLE → INICIANDO_PAGO → ESPERANDO_TARJETA → PROCESANDO → APROBADO | RECHAZADO
                                                       → CANCELADO | ERROR
```

Los estados terminales (APROBADO, RECHAZADO, CANCELADO, ERROR) vuelven automáticamente a `IDLE` después de 3 segundos.

## Notas operativas

- Las llaves TMS deben cargarse al menos una vez al día. El servicio las carga automáticamente la primera vez que se conecta y queda haciendo `poll` cada 5 minutos (requerido por Transbank).
- Si el POS queda colgado, `POST /api/transbank/cancelar` desconecta el puerto serial y reconecta a los 3 segundos.
- El servicio está pensado para correr como servicio de Windows en el totem (NSSM, sc.exe o similar). Debe levantarse antes que el frontend Electron.

## Arranque automático en Windows (sugerido)

1. Instalar Node 18+.
2. Copiar el repo a `C:\transbank-pos-service\`.
3. `npm ci --omit=dev`.
4. Crear servicio con NSSM:
   ```
   nssm install TransbankPOS "C:\Program Files\nodejs\node.exe" "C:\transbank-pos-service\index.js"
   nssm set TransbankPOS AppDirectory "C:\transbank-pos-service"
   nssm set TransbankPOS Start SERVICE_AUTO_START
   nssm start TransbankPOS
   ```

## Próximo paso (totem)

Ver `../PROJECT_CONTEXT.md` §5.3 para el plan de integración con `payment.component.ts`.
