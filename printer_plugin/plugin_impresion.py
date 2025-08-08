from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import win32print
import win32api

app = Flask(__name__)
CORS(app)  # Permitir CORS para que Angular pueda hacer peticiones

def enviar_a_impresora(nombre_impresora, datos):
    try:
        hPrinter = win32print.OpenPrinter(nombre_impresora)
        hJob = win32print.StartDocPrinter(hPrinter, 1, ("Trabajo de impresión", None, "RAW"))
        win32print.StartPagePrinter(hPrinter)
        win32print.WritePrinter(hPrinter, datos)
        win32print.EndPagePrinter(hPrinter)
        win32print.EndDocPrinter(hPrinter)
        win32print.ClosePrinter(hPrinter)
        return True
    except Exception as e:
        print(f"Error al imprimir: {e}")
        return False

def generar_ticket(pedido):
    ESC = b'\x1b'
    GS  = b'\x1d'
    NL  = b'\n'
    WIDTH = 50  # Ancho en caracteres para 80mm

    def centrar(texto):
        return texto.center(WIDTH)[:WIDTH]

    def formato_producto(nombre, cantidad, precio_unitario):
        subtotal = cantidad * precio_unitario
        WIDTH = 48
        PADDING = 2  # Espacios a la izquierda y derecha
        precio_str = f"${subtotal:,.0f}"

        # Ancho disponible entre los márgenes y el precio
        disponible_izquierda = WIDTH - (PADDING * 2) - len(precio_str)

        izquierda = f"{cantidad} x {nombre}"
        if len(izquierda) > disponible_izquierda:
            izquierda = izquierda[:disponible_izquierda]  # Truncar si es muy largo

        izquierda = izquierda.ljust(disponible_izquierda)
        linea = " " * PADDING + izquierda + precio_str + " " * PADDING
        return linea


    ticket = b""
    ticket += ESC + b'@'  # Inicializar impresora
    ticket += ESC + b'd\x01'

    # Encabezado
    ticket += centrar("RINNO && FAVRIC").encode("cp437") + NL
    ticket += centrar("RUT: 99.999.999-K").encode("cp437") + NL
    ticket += centrar("Av. IV Centenario 548, Santiago").encode("cp437") + NL
    ticket += ("-" * WIDTH).encode("cp437") + NL
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    ticket += centrar(f"Fecha: {now}").encode("cp437") + NL
    ticket += b'\x1b\x45\x01'  # ESC E 1
    ticket += centrar("Pedido #12345").encode("cp437") + NL
    ticket += b'\x1b\x45\x00'
    ticket += ("-" * WIDTH).encode("cp437") + NL

    # Productos
    productos = pedido.get("productos", [])
    total = 0
    for item in productos:
        nombre = item.get("nombre", "")[:30]
        cantidad = item.get("cantidad", 1)
        precio = item.get("precio", 0)
        subtotal = cantidad * precio
        total += subtotal
        ticket += formato_producto(nombre, cantidad, precio).encode("cp437") + NL

    ticket += NL
    ticket += centrar("-" * WIDTH).encode("cp437") + NL
    ticket += centrar(f"TOTAL: ${total:,.0f}").encode("cp437") + NL
    ticket += centrar("-" * WIDTH).encode("cp437") + NL * 2

    # Footer
    ticket += centrar("¡Gracias por su compra!").encode("cp437") + NL * 3

    # Avanzar papel y cortar
    ticket += ESC + b'd\x01'
    ticket += GS + b'V\x00'

    return ticket

@app.route("/imprimir", methods=["POST"])
def imprimir():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"resultado": "error", "mensaje": "No se recibieron datos"}), 400
        
        nombre_impresora = data.get("nombreImpresora", win32print.GetDefaultPrinter())
        contenido = generar_ticket(data)
        exito = enviar_a_impresora(nombre_impresora, contenido)
        
        return jsonify({
            "resultado": "ok" if exito else "error",
            "mensaje": "Ticket impreso correctamente" if exito else "Error al imprimir ticket"
        })
    except Exception as e:
        return jsonify({"resultado": "error", "mensaje": str(e)}), 500

@app.route("/status", methods=["GET"])
def status():
    """Endpoint para verificar el estado del servicio de impresión"""
    try:
        # Verificar que podemos acceder a las impresoras
        impresora_default = win32print.GetDefaultPrinter()
        return jsonify({
            "estado": "ok",
            "mensaje": "Servicio de impresión activo",
            "impresora_default": impresora_default
        })
    except Exception as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error en el servicio: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
