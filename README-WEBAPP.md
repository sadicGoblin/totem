# Totem Webapp - Sistema de Carrito con QR

## 📱 Funcionalidades Implementadas

### 1. **Sistema de SKUs**
- Todos los productos ahora tienen SKUs únicos en formato: `CAT-SUB-ID-CODE`
- Ejemplo: `TEL-EQ-001-IPH15` para iPhone 15 Pro

### 2. **Lectura Automática de URLs**
- **Single SKU**: `https://tu-dominio.com/?sku=TEL-EQ-001-IPH15`
- **Multiple SKUs**: `https://tu-dominio.com/?skus=TEL-EQ-001-IPH15,ACC-CR-010-INAL,HOG-IN-005-FIB6`
- Los productos se añaden automáticamente al carrito al abrir la URL

### 3. **Carrito Móvil Optimizado**
- Interfaz responsive para móviles
- Gestión completa de productos (añadir, quitar, eliminar)
- Función de compartir carrito
- Notificaciones visuales
- Ruta: `/cart`

### 4. **Interfaz Adaptada**
- Video de bienvenida ocultado (solo para esta rama web)
- Contenido alternativo más apropiado para webapp
- Diseño mobile-first

## 🚀 Deployment en Firebase

### Configuración Incluida
- `firebase.json` - Configuración de hosting
- `.firebaserc` - Proyecto por defecto

### Comandos para Deploy
```bash
# Instalar Firebase CLI (si no está instalado)
npm install -g firebase-tools

# Login en Firebase
firebase login

# Crear proyecto en Firebase Console
# Luego actualizar .firebaserc con el ID real del proyecto

# Build de producción
ng build --configuration=production

# Deploy
firebase deploy
```

## 📋 Flujo de Uso

1. **Generación de QRs**: Crear QRs que apunten a URLs con SKUs
2. **Escaneo**: Usuario escanea QR con cualquier app
3. **Redirección**: Se abre la webapp con el producto añadido
4. **Carrito**: Automáticamente navega al carrito
5. **Compra**: Usuario puede continuar comprando o proceder al pago

## 🛠 Estructura de URLs

```
https://tu-dominio.com/
├── ?sku=SKU-INDIVIDUAL          # Un solo producto
├── ?skus=SKU1,SKU2,SKU3        # Múltiples productos
├── /cart                        # Ver carrito
├── /category                    # Catálogo
└── /checkout                    # Proceso de pago
```

## 📦 SKUs de Ejemplo

### Telefonía
- `TEL-EQ-001-IPH15` - iPhone 15 Pro
- `TEL-EQ-002-SAM24` - Samsung Galaxy S24
- `TEL-PL-003-ILIM` - Plan Móvil Ilimitado

### Hogar
- `HOG-IN-005-FIB6` - Internet Fibra 600 Mbps
- `HOG-EQ-007-ROUT` - Router WiFi 6

### Accesorios
- `ACC-CR-010-INAL` - Cargador Inalámbrico
- `ACC-AU-011-BLUE` - Auriculares Bluetooth

## 🔧 Configuración Post-Deploy

1. Actualizar URLs de QRs con el dominio de Firebase
2. Configurar dominio personalizado si es necesario
3. Testear flujo completo de escaneo → carrito → checkout
