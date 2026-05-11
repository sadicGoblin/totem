"""
Plugin de impresión ESC/POS para totem TicketPro.

Recibe POST /imprimir con un payload del totem y emite por la impresora
térmica del IM30:

  1. Un VOUCHER PRINCIPAL con cabecera, detalle, total y datos Transbank.
     Termina con un "corte parcial" (98%) — el papel queda pre-picado para
     que el cliente lo arranque, pero no se separa solo.

  2. Un MINI-TICKET por cada unidad del carrito (ej: si compra 3 mojitos,
     se imprimen 3 tickets de "MOJITO" cada uno con el mismo número de
     pedido). También con corte parcial entre tickets.

  3. El último ticket termina con corte total para liberar el papel.

Comandos ESC/POS usados:
  ESC @         (0x1B 0x40)        : reset
  ESC E n       (0x1B 0x45 n)      : bold on (n=1) / off (n=0)
  ESC ! n       (0x1B 0x21 n)      : font size flags
  ESC d n       (0x1B 0x64 n)      : feed n lines
  GS V m        (0x1D 0x56 m)      : cut — m=0 full, m=1 partial
  GS V \x42 n   (0x1D 0x56 0x42 n) : feed n + partial cut
"""

from flask import Flask, request, jsonify
from datetime import datetime
import win32print

app = Flask(__name__)

# ==================== Constantes ESC/POS ====================
ESC = b'\x1b'
GS = b'\x1d'
NL = b'\n'
WIDTH = 48  # caracteres por línea (papel 80mm)

CMD_RESET           = ESC + b'@'
CMD_BOLD_ON         = ESC + b'E' + b'\x01'
CMD_BOLD_OFF        = ESC + b'E' + b'\x00'
CMD_DOUBLE_HEIGHT   = ESC + b'!' + b'\x10'
CMD_DOUBLE_WIDTH    = ESC + b'!' + b'\x20'
CMD_DOUBLE_BOTH     = ESC + b'!' + b'\x30'
CMD_NORMAL_SIZE     = ESC + b'!' + b'\x00'
CMD_ALIGN_CENTER    = ESC + b'a' + b'\x01'
CMD_ALIGN_LEFT      = ESC + b'a' + b'\x00'
CMD_ALIGN_RIGHT     = ESC + b'a' + b'\x02'

# Corte parcial con avance — deja ~98% cortado (papel pre-picado)
CMD_PARTIAL_CUT_FEED = GS + b'V' + b'\x42' + b'\x03'  # avanza 3 líneas + parcial
# Corte total final — separa el papel completamente
CMD_FULL_CUT_FEED = GS + b'V' + b'\x41' + b'\x03'     # avanza 3 + total


# ==================== Helpers de formato ====================

def encode(text: str) -> bytes:
    """Codifica para ESC/POS. cp437 es seguro para texto ASCII; los acentos
    se reemplazan por su versión sin tilde para evitar caracteres raros."""
    safe = (text
            .replace('á', 'a').replace('é', 'e').replace('í', 'i')
            .replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
            .replace('Á', 'A').replace('É', 'E').replace('Í', 'I')
            .replace('Ó', 'O').replace('Ú', 'U').replace('Ñ', 'N')
            .replace('¿', '?').replace('¡', '!'))
    return safe.encode('cp437', errors='replace')


def line_separator(char: str = '-') -> bytes:
    return encode(char * WIDTH) + NL


def line_centered(text: str) -> bytes:
    return encode(text.center(WIDTH)[:WIDTH]) + NL


def line_left_right(left: str, right: str) -> bytes:
    """Línea con texto a la izquierda y derecha, rellenando con espacios."""
    space = WIDTH - len(left) - len(right)
    if space < 1:
        # Truncar la izquierda si no entra
        left = left[:WIDTH - len(right) - 1]
        space = 1
    return encode(left + (' ' * space) + right) + NL


def format_money(value) -> str:
    try:
        n = int(round(float(value)))
        return f'$ {n:,}'.replace(',', '.')
    except Exception:
        return '$ 0'


# ==================== Construcción de tickets ====================

def build_main_voucher(pedido: dict) -> bytes:
    """Voucher principal con detalle + total + datos Transbank."""
    productos = pedido.get('productos', []) or []
    numero_pedido = pedido.get('numeroPedido') or '----'
    tx = pedido.get('transactionInfo') or {}

    output = b''
    output += CMD_RESET
    output += CMD_ALIGN_CENTER

    # Cabecera grande
    output += CMD_DOUBLE_BOTH + CMD_BOLD_ON
    output += encode('TICKETPRO') + NL
    output += CMD_NORMAL_SIZE + CMD_BOLD_OFF

    output += line_centered('Comprobante de venta')
    output += line_separator('=')

    # Datos del pedido
    output += CMD_ALIGN_LEFT
    now = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    output += line_left_right('Fecha:', now)

    output += CMD_BOLD_ON + CMD_DOUBLE_HEIGHT
    output += line_centered(f'Pedido #{numero_pedido}')
    output += CMD_NORMAL_SIZE + CMD_BOLD_OFF

    output += line_separator('-')

    # Detalle de productos
    output += CMD_ALIGN_LEFT
    total = 0
    for item in productos:
        nombre = item.get('nombre', '')
        cantidad = int(item.get('cantidad', 1))
        precio = float(item.get('precio', 0))
        subtotal = cantidad * precio
        total += subtotal

        # Línea 1: cantidad x nombre  ............  subtotal
        line_label = f'{cantidad} x {nombre}'
        # Si el nombre + precio no entran en una línea, partir
        price_str = format_money(subtotal)
        max_label = WIDTH - len(price_str) - 1
        if len(line_label) <= max_label:
            output += line_left_right(line_label, price_str)
        else:
            # Nombre largo: nombre arriba, cantidad+precio abajo
            output += encode(nombre[:WIDTH]) + NL
            output += line_left_right(f'  {cantidad} x {format_money(precio)}', price_str)

    output += line_separator('-')
    output += CMD_BOLD_ON + CMD_DOUBLE_HEIGHT
    output += line_left_right('TOTAL', format_money(total))
    output += CMD_NORMAL_SIZE + CMD_BOLD_OFF
    output += line_separator('=')

    # Datos Transbank (si existen)
    if tx:
        output += CMD_ALIGN_LEFT
        if tx.get('cardBrand') or tx.get('last4Digits'):
            brand = (tx.get('cardBrand') or '').strip()
            last4 = tx.get('last4Digits') or ''
            card_line = brand
            if last4:
                card_line += f'  ****{last4}'
            output += line_left_right('Tarjeta:', card_line)

        if tx.get('cardType'):
            type_map = {'CR': 'Credito', 'DB': 'Debito', 'PR': 'Prepago'}
            output += line_left_right('Tipo:', type_map.get(tx.get('cardType'), tx.get('cardType')))

        if tx.get('authorizationCode'):
            output += line_left_right('Cod. autorizacion:', str(tx.get('authorizationCode')))

        if tx.get('operationNumber'):
            output += line_left_right('N. operacion:', str(tx.get('operationNumber')))

        if tx.get('terminalId'):
            output += line_left_right('Terminal:', str(tx.get('terminalId')))

        if tx.get('commerceCode'):
            output += line_left_right('Comercio:', str(tx.get('commerceCode')))

        if tx.get('realDate') and tx.get('realTime'):
            # POS devuelve DDMMYYYY y HHMMSS — formateamos legible
            d = str(tx.get('realDate'))
            t = str(tx.get('realTime'))
            if len(d) == 8 and len(t) == 6:
                pos_dt = f'{d[0:2]}/{d[2:4]}/{d[4:8]}  {t[0:2]}:{t[2:4]}:{t[4:6]}'
                output += line_left_right('Fecha POS:', pos_dt)

        output += line_separator('-')

    # Footer
    output += CMD_ALIGN_CENTER
    output += line_centered('GRACIAS POR SU COMPRA')
    output += NL
    output += line_centered('Conserva tus tickets adjuntos')
    output += line_centered('para retirar tus productos')

    # Corte parcial — pre-picado, papel sigue unido
    output += CMD_PARTIAL_CUT_FEED

    return output


def build_item_ticket(numero_pedido: str, nombre_producto: str,
                      indice: int, total: int) -> bytes:
    """Mini-ticket pre-picado para retirar UNA unidad de un producto."""
    output = b''
    output += CMD_RESET
    output += CMD_ALIGN_CENTER

    output += CMD_BOLD_ON + CMD_DOUBLE_HEIGHT
    output += encode(f'PEDIDO #{numero_pedido}') + NL
    output += CMD_NORMAL_SIZE + CMD_BOLD_OFF

    output += line_separator('-')

    # Producto en grande
    output += CMD_BOLD_ON + CMD_DOUBLE_BOTH
    # Truncar para que entre en doble ancho (24 caracteres aprox)
    max_chars = WIDTH // 2 - 1
    nombre_grande = nombre_producto[:max_chars].upper()
    output += encode(nombre_grande.center(max_chars)) + NL
    output += CMD_NORMAL_SIZE + CMD_BOLD_OFF

    output += NL
    output += line_centered(f'Ticket {indice} de {total}')
    output += line_centered(datetime.now().strftime('%d/%m/%Y %H:%M'))

    output += CMD_PARTIAL_CUT_FEED
    return output


def build_final_cut() -> bytes:
    """Corte total para liberar el último ticket."""
    return CMD_FULL_CUT_FEED


# ==================== Envío a impresora ====================

def enviar_a_impresora(nombre_impresora: str, datos: bytes) -> bool:
    try:
        h = win32print.OpenPrinter(nombre_impresora)
        try:
            job = win32print.StartDocPrinter(h, 1, ('Trabajo TicketPro', None, 'RAW'))
            try:
                win32print.StartPagePrinter(h)
                win32print.WritePrinter(h, datos)
                win32print.EndPagePrinter(h)
            finally:
                win32print.EndDocPrinter(h)
        finally:
            win32print.ClosePrinter(h)
        return True
    except Exception as e:
        print(f'[printer] error al imprimir: {e}')
        return False


# ==================== Endpoints ====================

@app.route('/imprimir', methods=['POST'])
def imprimir():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({'resultado': 'error', 'mensaje': 'No se recibieron datos'}), 400

        nombre_impresora = data.get('nombreImpresora') or win32print.GetDefaultPrinter()
        numero_pedido = str(data.get('numeroPedido') or '----')
        productos = data.get('productos') or []

        # 1) Voucher principal
        contenido = build_main_voucher(data)

        # 2) Mini-tickets — uno por cada unidad de cada producto
        total_unidades = sum(int(p.get('cantidad', 1)) for p in productos)
        idx = 0
        for prod in productos:
            cantidad = int(prod.get('cantidad', 1))
            nombre = str(prod.get('nombre', ''))
            for _ in range(cantidad):
                idx += 1
                contenido += build_item_ticket(numero_pedido, nombre, idx, total_unidades)

        # 3) Corte total al final para liberar el papel
        contenido += build_final_cut()

        ok = enviar_a_impresora(nombre_impresora, contenido)
        return jsonify({
            'resultado': 'ok' if ok else 'error',
            'mensaje': f'Pedido #{numero_pedido} impreso ({total_unidades} ticket(s))' if ok else 'Error al imprimir'
        })
    except Exception as e:
        print(f'[printer] excepcion: {e}')
        return jsonify({'resultado': 'error', 'mensaje': str(e)}), 500


@app.route('/status', methods=['GET'])
def status():
    try:
        impresora = win32print.GetDefaultPrinter()
        return jsonify({'estado': 'ok', 'mensaje': 'Servicio activo', 'impresora_default': impresora})
    except Exception as e:
        return jsonify({'estado': 'error', 'mensaje': str(e)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000, debug=True)
