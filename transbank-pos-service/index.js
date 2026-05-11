/**
 * Servicio Node.js para comunicación con POS Transbank IM30
 * Usa el SDK oficial de Transbank: transbank-pos-sdk
 *
 * Endpoints expuestos:
 *  - GET  /api/transbank/health
 *  - GET  /api/transbank/diagnostico
 *  - GET  /api/transbank/estado
 *  - POST /api/transbank/conectar
 *  - POST /api/transbank/conectar/:puerto
 *  - POST /api/transbank/desconectar
 *  - POST /api/transbank/inicializar-tms
 *  - POST /api/transbank/pagar
 *  - POST /api/transbank/cancelar
 *  - POST /api/transbank/poll
 *  - POST /api/transbank/cerrar-dia
 *  - GET  /api/transbank/ultima-venta
 */

const express = require('express');
const cors = require('cors');
const { POSAutoservicio } = require('transbank-pos-sdk');

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(cors());
app.use(express.json());

// Instancia del POS (Autoservicio para IM30)
const pos = new POSAutoservicio();
pos.setDebug(true);

// Estado interno
let currentState = 'IDLE';
let lastTransaction = null;
let isConnected = false;
let connectedPort = null;
let cancelRequested = false;
let keysLoaded = false;
let pollIntervalId = null;
let heartbeatIntervalId = null;
let lastPollAt = null;
let lastStateMessage = null;

// Configuración del heartbeat al backend
const SERVICE_VERSION = '1.0.0';
const HEARTBEAT_BASE_URL = process.env.BACKEND_URL || 'https://catalogue.favric.cl/api';
const HEARTBEAT_CATALOGUE_CODE = process.env.CATALOGUE_CODE || 'CAT001';
const HEARTBEAT_TERMINAL_CODE = process.env.TERMINAL_CODE || 'TOTEM-01';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '60000', 10); // 1 min
const HEARTBEAT_ENABLED = (process.env.HEARTBEAT_ENABLED || 'true').toLowerCase() !== 'false';

// Estados posibles
const STATES = {
    IDLE: 'IDLE',
    INICIANDO_PAGO: 'INICIANDO_PAGO',
    ESPERANDO_TARJETA: 'ESPERANDO_TARJETA',
    PROCESANDO: 'PROCESANDO',
    APROBADO: 'APROBADO',
    RECHAZADO: 'RECHAZADO',
    CANCELADO: 'CANCELADO',
    ERROR: 'ERROR'
};

// Logging
function log(emoji, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${emoji} ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
}

// Cargar llaves automáticamente después de conectar
async function autoLoadKeys() {
    try {
        log('🔑', 'Cargando llaves TMS automáticamente...');
        const response = await pos.loadKeys();
        keysLoaded = true;
        log('✅', 'Llaves TMS cargadas exitosamente', response);
        return true;
    } catch (err) {
        log('❌', 'Error cargando llaves TMS:', err.message);
        return false;
    }
}

// Poll automático cada 5 minutos (requerido por Transbank)
function startAutoPoll() {
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(async () => {
        if (!isConnected) {
            log('⏭️', 'Poll omitido - POS no conectado');
            return;
        }
        if (currentState !== 'IDLE') {
            log('⏭️', 'Poll omitido - transacción en curso');
            return;
        }
        try {
            log('🔄', 'Poll automático (cada 5 min)...');
            const response = await pos.poll();
            lastPollAt = new Date().toISOString();
            log('✅', 'Poll exitoso', response);
        } catch (err) {
            log('⚠️', 'Error en poll automático:', err.message);
        }
    }, 5 * 60 * 1000);
    log('⏰', 'Poll automático configurado cada 5 minutos');
}

function stopAutoPoll() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
        log('⏹️', 'Poll automático detenido');
    }
}

// ==================== Heartbeat al backend ====================

async function sendHeartbeat() {
    if (!HEARTBEAT_ENABLED) return;
    const url = `${HEARTBEAT_BASE_URL}/terminal/heartbeat/`;

    const lastTxTerminalId = lastTransaction?.terminalId || null;
    const lastTxCommerceCode = lastTransaction?.commerceCode || null;

    const payload = {
        catalogue_code: HEARTBEAT_CATALOGUE_CODE,
        code: HEARTBEAT_TERMINAL_CODE,
        pos_terminal_id: lastTxTerminalId,
        commerce_code: lastTxCommerceCode ? String(lastTxCommerceCode) : null,
        port: connectedPort,
        connected: isConnected,
        keys_loaded: keysLoaded,
        last_state: currentState,
        last_state_message: lastStateMessage,
        last_poll_at: lastPollAt,
        service_version: SERVICE_VERSION,
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            log('⚠️', `Heartbeat falló (HTTP ${res.status}): ${text.slice(0, 200)}`);
            return;
        }
        // log silencioso para no llenar la consola
    } catch (err) {
        log('⚠️', 'Heartbeat — error de red:', err.message);
    }
}

function startHeartbeat() {
    if (!HEARTBEAT_ENABLED) {
        log('⏸️', 'Heartbeat deshabilitado por env (HEARTBEAT_ENABLED=false)');
        return;
    }
    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
    log('💓', `Heartbeat activado: ${HEARTBEAT_BASE_URL}/terminal/heartbeat/ cada ${HEARTBEAT_INTERVAL_MS / 1000}s · ${HEARTBEAT_CATALOGUE_CODE}/${HEARTBEAT_TERMINAL_CODE}`);
    // Enviar uno de inmediato para registrarse en el backend
    sendHeartbeat();
    heartbeatIntervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
    }
}

// Mapea mensajes intermedios del POS a estados
function mapIntermediateMessage(data) {
    const message = data?.message || data?.responseMessage || '';
    const messageUpper = message.toUpperCase();

    if (messageUpper.includes('OPERE') || messageUpper.includes('TARJETA') || messageUpper.includes('INSERTE')) {
        return STATES.ESPERANDO_TARJETA;
    }
    if (messageUpper.includes('PROCESANDO') || messageUpper.includes('AUTORIZANDO')) {
        return STATES.PROCESANDO;
    }
    return currentState;
}

function getStateMessage(state) {
    const messages = {
        [STATES.IDLE]: 'Preparando pago...',
        [STATES.INICIANDO_PAGO]: 'Conectando con el terminal de pago...',
        [STATES.ESPERANDO_TARJETA]: 'Por favor, inserte o acerque su tarjeta al lector',
        [STATES.PROCESANDO]: 'Procesando tu pago, por favor espera...',
        [STATES.APROBADO]: '¡Pago aprobado exitosamente!',
        [STATES.RECHAZADO]: 'El pago fue rechazado',
        [STATES.CANCELADO]: 'Pago cancelado',
        [STATES.ERROR]: 'Ocurrió un error al procesar el pago'
    };
    return messages[state] || '';
}

// ==================== ENDPOINTS ====================

/**
 * Health check
 */
app.get('/api/transbank/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connected: isConnected,
        port: connectedPort
    });
});

/**
 * Diagnóstico - Lista puertos disponibles
 */
app.get('/api/transbank/diagnostico', async (req, res) => {
    log('📥', 'GET /api/transbank/diagnostico');

    try {
        const ports = await pos.listPorts();

        res.json({
            timestamp: new Date().toISOString(),
            conectado: isConnected,
            puertoActual: connectedPort,
            puertosDisponibles: ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer || 'Desconocido',
                vendorId: p.vendorId,
                productId: p.productId
            })),
            instrucciones: [
                '1. Verifica que el POS esté conectado por USB',
                '2. Ejecuta POST /api/transbank/conectar para autoconectar',
                '3. O usa POST /api/transbank/conectar/{puerto} para un puerto específico'
            ]
        });
    } catch (err) {
        log('❌', 'Error listando puertos', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Autoconectar al POS
 */
app.post('/api/transbank/conectar', async (req, res) => {
    log('📥', 'POST /api/transbank/conectar');

    try {
        if (isConnected) {
            log('⚠️', 'Ya está conectado al puerto', connectedPort);
            return res.json({
                success: true,
                message: `Ya conectado a ${connectedPort}`,
                port: connectedPort
            });
        }

        log('🔍', 'Buscando POS en puertos disponibles...');
        const port = await pos.autoconnect();

        if (port === false) {
            log('❌', 'No se encontró ningún POS conectado');
            return res.json({
                success: false,
                message: 'No se encontró ningún POS conectado'
            });
        }

        isConnected = true;
        connectedPort = port.path;
        log('✅', `Conectado al POS en ${connectedPort}`);

        let keysResult = null;
        if (!keysLoaded) {
            keysResult = await autoLoadKeys();
            log('⏳', 'Esperando que el terminal esté listo...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        startAutoPoll();

        res.json({
            success: true,
            message: `Conectado exitosamente${keysResult ? ' (llaves TMS cargadas)' : ''}`,
            port: connectedPort,
            keysLoaded: keysLoaded
        });
    } catch (err) {
        log('❌', 'Error conectando', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Conectar a un puerto específico
 */
app.post('/api/transbank/conectar/:puerto', async (req, res) => {
    const puerto = req.params.puerto;
    log('📥', `POST /api/transbank/conectar/${puerto}`);

    try {
        if (isConnected) {
            await pos.disconnect();
        }

        await pos.connect(puerto);
        isConnected = true;
        connectedPort = puerto;
        log('✅', `Conectado al POS en ${puerto}`);

        res.json({
            success: true,
            message: `Conectado a ${puerto}`,
            port: puerto
        });
    } catch (err) {
        log('❌', `Error conectando a ${puerto}`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Desconectar del POS
 */
app.post('/api/transbank/desconectar', async (req, res) => {
    log('📥', 'POST /api/transbank/desconectar');

    try {
        stopAutoPoll();
        await pos.disconnect();
        isConnected = false;
        connectedPort = null;
        currentState = STATES.IDLE;
        keysLoaded = false;
        log('✅', 'Desconectado del POS');

        res.json({ success: true, message: 'Desconectado' });
    } catch (err) {
        log('❌', 'Error desconectando', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Inicializar TMS (cargar llaves)
 * Equivalente al comando 0070 + 0080
 */
app.post('/api/transbank/inicializar-tms', async (req, res) => {
    log('📥', 'POST /api/transbank/inicializar-tms');

    try {
        if (!isConnected) {
            log('🔍', 'No conectado, intentando autoconectar...');
            const port = await pos.autoconnect();
            if (port === false) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró ningún POS conectado'
                });
            }
            isConnected = true;
            connectedPort = port.path;
            log('✅', `Conectado a ${connectedPort}`);
        }

        log('🔑', 'Cargando llaves (TMS)...');
        const response = await pos.loadKeys();
        keysLoaded = true;

        log('✅', 'Llaves cargadas exitosamente', response);

        res.json({
            success: true,
            message: 'Parámetros TMS cargados exitosamente. El POS está listo para operar.',
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        log('❌', 'Error cargando llaves', err.message);
        res.status(500).json({
            success: false,
            message: `Error al cargar parámetros TMS: ${err.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Estado actual del POS
 */
app.get('/api/transbank/estado', (req, res) => {
    const isInProgress = ![STATES.IDLE, STATES.APROBADO, STATES.RECHAZADO, STATES.ERROR].includes(currentState);
    const canCancel = currentState === STATES.INICIANDO_PAGO || currentState === STATES.PROCESANDO;

    res.json({
        state: currentState,
        isTransactionInProgress: isInProgress,
        canCancel: canCancel,
        connected: isConnected,
        port: connectedPort,
        message: getStateMessage(currentState),
        lastTransaction: lastTransaction,
        timestamp: new Date().toISOString()
    });
});

/**
 * Procesar pago
 */
app.post('/api/transbank/pagar', async (req, res) => {
    const { monto, numeroTicket } = req.body;
    log('📥', `POST /api/transbank/pagar - Monto: $${monto}`);

    if (!monto || monto <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Monto inválido',
            state: STATES.ERROR
        });
    }

    // Resetear estado terminal a IDLE para permitir una nueva transacción
    if ([STATES.RECHAZADO, STATES.ERROR, STATES.APROBADO, STATES.CANCELADO].includes(currentState)) {
        log('🔄', `Reseteando estado ${currentState} a IDLE para nueva transacción`);
        currentState = STATES.IDLE;
    }

    if (currentState !== STATES.IDLE) {
        return res.status(409).json({
            success: false,
            message: 'Ya hay una transacción en curso',
            state: currentState
        });
    }

    try {
        if (!isConnected) {
            log('🔍', 'No conectado, intentando autoconectar...');
            const port = await pos.autoconnect();
            if (port === false) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró ningún POS conectado',
                    state: STATES.ERROR
                });
            }
            isConnected = true;
            connectedPort = port.path;

            if (!keysLoaded) {
                await autoLoadKeys();
                log('⏳', 'Esperando que el terminal esté listo...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            startAutoPoll();
        }

        currentState = STATES.INICIANDO_PAGO;
        log('💰', `Iniciando venta por $${monto}`);

        const ticket = numeroTicket || `TKT-${Date.now()}`;

        const statusCallback = (data) => {
            log('📡', 'Estado intermedio:', data);
            currentState = mapIntermediateMessage(data);
        };

        const response = await pos.sale(monto, ticket, true, statusCallback);

        log('📥', 'Respuesta de venta:', response);

        const success = response.responseCode === '00' || response.responseCode === 0;
        currentState = success ? STATES.APROBADO : STATES.RECHAZADO;

        lastTransaction = {
            success: success,
            amount: monto,
            authorizationCode: response.authorizationCode || null,
            operationId: response.operationId || response.operationNumber || null,
            cardType: response.cardType || null,
            last4Digits: response.last4Digits || null,
            responseCode: response.responseCode,
            responseMessage: response.responseMessage || response.message,
            commerceCode: response.commerceCode || null,
            terminalId: response.terminalId || null,
            cardBrand: response.cardBrand ? response.cardBrand.trim() : null,
            realDate: response.realDate || null,
            realTime: response.realTime || null,
            ticket: response.ticket || ticket,
            timestamp: new Date().toISOString()
        };

        // Volver a IDLE después de 3s para que el frontend alcance a leer el estado terminal
        setTimeout(() => {
            if (currentState === STATES.APROBADO || currentState === STATES.RECHAZADO) {
                currentState = STATES.IDLE;
            }
        }, 3000);

        res.json({
            success: success,
            message: success ? 'Pago aprobado' : 'Pago rechazado',
            state: currentState,
            amount: monto,
            authorizationCode: lastTransaction.authorizationCode,
            operationId: lastTransaction.operationId,
            cardType: lastTransaction.cardType,
            last4Digits: lastTransaction.last4Digits,
            responseCode: lastTransaction.responseCode,
            responseMessage: lastTransaction.responseMessage,
            commerceCode: lastTransaction.commerceCode,
            terminalId: lastTransaction.terminalId,
            cardBrand: lastTransaction.cardBrand,
            realDate: lastTransaction.realDate,
            realTime: lastTransaction.realTime,
            ticket: lastTransaction.ticket,
            timestamp: lastTransaction.timestamp
        });

    } catch (err) {
        log('❌', 'Error en venta', err.message);
        currentState = STATES.ERROR;

        setTimeout(() => { currentState = STATES.IDLE; }, 3000);

        res.status(500).json({
            success: false,
            message: `Error: ${err.message}`,
            state: STATES.ERROR,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Cancelar transacción actual
 * Fuerza la cancelación desconectando y reconectando el POS
 */
app.post('/api/transbank/cancelar', async (req, res) => {
    log('📥', 'POST /api/transbank/cancelar');
    log('🚫', `Estado actual: ${currentState}`);

    cancelRequested = true;

    const previousState = currentState;
    currentState = STATES.CANCELADO;

    if (['INICIANDO_PAGO', 'ESPERANDO_TARJETA', 'PROCESANDO'].includes(previousState)) {
        log('🔌', 'Forzando cancelación: desconectando POS...');

        try {
            await pos.disconnect();
            isConnected = false;
            log('✅', 'POS desconectado - transacción abortada');

            setTimeout(async () => {
                try {
                    log('🔄', 'Reconectando al POS...');
                    const port = await pos.autoconnect();
                    if (port !== false) {
                        isConnected = true;
                        connectedPort = port.path;
                        log('✅', `Reconectado a ${connectedPort}`);
                    } else {
                        log('⚠️', 'No se pudo reconectar automáticamente');
                    }
                } catch (err) {
                    log('⚠️', 'Error al reconectar:', err.message);
                }
                currentState = STATES.IDLE;
                cancelRequested = false;
            }, 3000);
        } catch (err) {
            log('⚠️', 'Error al desconectar POS:', err.message);
            isConnected = false;
            currentState = STATES.IDLE;
            cancelRequested = false;
        }
    } else {
        setTimeout(() => {
            currentState = STATES.IDLE;
            cancelRequested = false;
        }, 1000);
    }

    res.json({
        success: true,
        message: 'Cancelación ejecutada',
        previousState: previousState,
        state: currentState
    });
});

/**
 * Polling - Verificar conexión
 */
app.post('/api/transbank/poll', async (req, res) => {
    log('📥', 'POST /api/transbank/poll');

    try {
        if (!isConnected) {
            return res.json({ success: false, message: 'No conectado' });
        }

        const response = await pos.poll();
        log('✅', 'Poll exitoso', response);

        res.json({
            success: true,
            message: 'POS respondió correctamente',
            response: response
        });
    } catch (err) {
        log('❌', 'Error en poll', err.message);
        res.json({ success: false, error: err.message });
    }
});

/**
 * Cierre de día
 */
app.post('/api/transbank/cerrar-dia', async (req, res) => {
    log('📥', 'POST /api/transbank/cerrar-dia');

    try {
        if (!isConnected) {
            const port = await pos.autoconnect();
            if (port === false) {
                return res.status(400).json({ success: false, message: 'No conectado' });
            }
            isConnected = true;
            connectedPort = port.path;
        }

        const response = await pos.closeDay();
        log('✅', 'Cierre de día exitoso', response);

        res.json({
            success: true,
            message: 'Cierre de día completado',
            response: response
        });
    } catch (err) {
        log('❌', 'Error en cierre de día', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Última venta
 */
app.get('/api/transbank/ultima-venta', async (req, res) => {
    log('📥', 'GET /api/transbank/ultima-venta');

    try {
        if (!isConnected) {
            return res.status(400).json({ success: false, message: 'No conectado' });
        }

        const response = await pos.getLastSale();
        log('✅', 'Última venta obtenida', response);

        res.json({
            success: true,
            lastSale: response
        });
    } catch (err) {
        log('❌', 'Error obteniendo última venta', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🏦 TRANSBANK POS SERVICE (Node.js)                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Servidor corriendo en: http://localhost:${PORT}          ║`);
    console.log('║  📡 Endpoints disponibles:                                 ║');
    console.log('║     GET  /api/transbank/health                             ║');
    console.log('║     GET  /api/transbank/diagnostico                        ║');
    console.log('║     GET  /api/transbank/estado                             ║');
    console.log('║     POST /api/transbank/conectar                           ║');
    console.log('║     POST /api/transbank/inicializar-tms                    ║');
    console.log('║     POST /api/transbank/pagar                              ║');
    console.log('║     POST /api/transbank/cancelar                           ║');
    console.log('║     POST /api/transbank/cerrar-dia                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('⏳ Esperando conexiones...');
    console.log('💡 Tip: Ejecuta POST /api/transbank/conectar para autoconectar al POS');
    console.log('');

    // Iniciar el heartbeat al backend
    startHeartbeat();
});

// Apagado limpio: avisa al backend que estamos OFFLINE antes de morir.
async function gracefulShutdown(signal) {
    log('🛑', `Señal ${signal} recibida — apagando...`);
    stopHeartbeat();
    stopAutoPoll();

    // Marcar al terminal como OFFLINE en el backend para que el admin lo vea
    // de inmediato sin tener que esperar el timeout del heartbeat.
    if (HEARTBEAT_ENABLED) {
        try {
            await Promise.race([
                fetch(`${HEARTBEAT_BASE_URL}/terminal/heartbeat/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        catalogue_code: HEARTBEAT_CATALOGUE_CODE,
                        code: HEARTBEAT_TERMINAL_CODE,
                        connected: false,
                        keys_loaded: keysLoaded,
                        port: connectedPort,
                        last_state: 'OFFLINE',
                        last_state_message: 'Servicio detenido manualmente',
                        service_version: SERVICE_VERSION,
                    }),
                }),
                // Timeout de 1.5s — no nos quedamos colgados si el backend no responde
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
            ]);
            log('💓', 'Heartbeat OFFLINE enviado al backend');
        } catch (err) {
            log('⚠️', 'No se pudo notificar offline al backend:', err.message);
        }
    }

    if (isConnected) {
        try { await pos.disconnect(); } catch { /* noop */ }
    }
    setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
