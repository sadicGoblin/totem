/**
 * Servicio Node.js para comunicación con POS Transbank IM30
 * Usa el SDK oficial de Transbank: transbank-pos-sdk
 * 
 * Endpoints equivalentes al servicio .NET:
 * - POST /api/transbank/pagar
 * - POST /api/transbank/cancelar
 * - GET  /api/transbank/estado
 * - POST /api/transbank/inicializar-tms
 * - GET  /api/transbank/diagnostico
 * - GET  /api/transbank/health
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

// Estado actual
let currentState = 'IDLE';
let lastTransaction = null;
let isConnected = false;
let connectedPort = null;
let cancelRequested = false;  // Flag para abortar transacción en curso
let keysLoaded = false;
let pollIntervalId = null;

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
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
    }
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
            log('✅', 'Poll exitoso', response);
        } catch (err) {
            log('⚠️', 'Error en poll automático:', err.message);
        }
    }, 5 * 60 * 1000); // 5 minutos
    log('⏰', 'Poll automático configurado cada 5 minutos');
}

function stopAutoPoll() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
        log('⏹️', 'Poll automático detenido');
    }
}

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

// Función para mapear mensajes intermedios del POS a estados
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

// Logging helper
function log(emoji, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${emoji} ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
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
        
        // Cargar llaves TMS en primera conexión del día
        let keysResult = null;
        if (!keysLoaded) {
            keysResult = await autoLoadKeys();
            // Esperar a que el POS esté listo después de cargar llaves
            log('⏳', 'Esperando que el terminal esté listo...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Iniciar poll automático
        startAutoPoll();
        
        res.json({
            success: true,
            message: `Conectado exitosamente${keysResult ? ' (llaves TMS cargadas)' : ''}`,
            port: connectedPort,
            keysLoaded: keysLoaded
        });
    } catch (err) {
        log('❌', 'Error conectando', err.message);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
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
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
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
        // Primero asegurar conexión
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
    
    // Si el estado es terminal (RECHAZADO, ERROR, APROBADO, CANCELADO), resetearlo a IDLE
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
        // Asegurar conexión
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
            
            // Cargar llaves TMS si es primera conexión
            if (!keysLoaded) {
                await autoLoadKeys();
                // Esperar a que el POS esté listo después de cargar llaves
                log('⏳', 'Esperando que el terminal esté listo...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            // Iniciar poll automático
            startAutoPoll();
        }
        
        currentState = STATES.INICIANDO_PAGO;
        log('💰', `Iniciando venta por $${monto}`);
        
        const ticket = numeroTicket || `TKT-${Date.now()}`;
        
        // Callback para estados intermedios
        const statusCallback = (data) => {
            log('📡', 'Estado intermedio:', data);
            currentState = mapIntermediateMessage(data);
        };
        
        // Ejecutar venta con estados intermedios
        const response = await pos.sale(monto, ticket, true, statusCallback);
        
        log('📥', 'Respuesta de venta:', response);
        
        // Parsear respuesta
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
        
        // Volver a IDLE después de 3 segundos
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
    
    // Marcar flag de cancelación
    cancelRequested = true;
    
    const previousState = currentState;
    currentState = STATES.CANCELADO;
    
    // Si hay una transacción en curso, forzar la cancelación desconectando el POS
    if (['INICIANDO_PAGO', 'ESPERANDO_TARJETA', 'PROCESANDO'].includes(previousState)) {
        log('🔌', 'Forzando cancelación: desconectando POS...');
        
        try {
            // Desconectar el POS para abortar la transacción
            await pos.disconnect();
            isConnected = false;
            log('✅', 'POS desconectado - transacción abortada');
            
            // Esperar un momento y reconectar
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
        // No hay transacción activa, solo resetear estado
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
 * Cerrar día
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
});
