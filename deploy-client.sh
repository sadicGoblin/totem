#!/bin/bash

# Script de deployment para múltiples clientes - Adaptado para Electron
# Uso: ./deploy-client.sh [client-slug] [optional: api-url]

CLIENT_SLUG=$1
API_URL=${2:-"http://localhost:8050/api"}

if [ -z "$CLIENT_SLUG" ]; then
  echo "❌ Error: Debes especificar el slug del cliente"
  echo ""
  echo "📋 Uso:"
  echo "   ./deploy-client.sh [client-slug] [api-url-opcional]"
  echo ""
  echo "📝 Ejemplos:"
  echo "   ./deploy-client.sh entel-chile"
  echo "   ./deploy-client.sh restaurante-abuelos http://api.restaurante.com/api"
  echo "   ./deploy-client.sh farmacia-cruz-verde http://production-api.farmacias.cl/api"
  exit 1
fi

echo "🚀 Iniciando deployment para cliente: $CLIENT_SLUG"
echo "🌐 API URL: $API_URL"
echo ""

# 1. Backup del config actual
echo "💾 Creando backup de configuración actual..."
if [ -f "src/config/client.config.ts" ]; then
  cp src/config/client.config.ts src/config/client.config.ts.backup
  echo "✅ Backup creado: client.config.ts.backup"
else
  echo "⚠️  No se encontró archivo de configuración previo"
fi

# 2. Actualizar configuración del cliente
echo "⚙️  Actualizando configuración para $CLIENT_SLUG..."

# Actualizar organizationSlug
sed -i.bak "s/organizationSlug: '[^']*'/organizationSlug: '$CLIENT_SLUG'/" src/config/client.config.ts

# Actualizar apiBase si se proporcionó
if [ "$API_URL" != "http://localhost:8050/api" ]; then
  sed -i.bak "s|apiBase: '[^']*'|apiBase: '$API_URL'|" src/config/client.config.ts
fi

echo "✅ Configuración actualizada"

# 3. Mostrar configuración actual
echo ""
echo "📋 Configuración actual:"
grep -E "(organizationSlug|apiBase)" src/config/client.config.ts
echo ""

# 4. Build de Angular
echo "🔨 Compilando aplicación Angular..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error en la compilación de Angular"
  exit 1
fi
echo "✅ Compilación Angular completada"

# 5. Build de Electron
echo "📦 Creando ejecutable Electron..."
npm run electron:build
if [ $? -ne 0 ]; then
  echo "❌ Error en la compilación de Electron"
  exit 1
fi
echo "✅ Ejecutable Electron creado"

# 6. Crear carpeta de distribución específica para el cliente
DIST_FOLDER="dist-clients/$CLIENT_SLUG"
echo "📁 Creando carpeta de distribución: $DIST_FOLDER"
mkdir -p "$DIST_FOLDER"

# 7. Copiar el ejecutable generado
echo "📋 Copiando archivos de distribución..."
if [ -d "dist-electron" ]; then
  cp -r dist-electron/* "$DIST_FOLDER/"
elif [ -d "release" ]; then
  cp -r release/* "$DIST_FOLDER/"
else
  echo "⚠️  No se encontró carpeta de distribución de Electron. Verifica tu configuración de build."
fi

# 8. Crear archivo de información del cliente
echo "📄 Creando archivo de información del deployment..."
cat > "$DIST_FOLDER/client-info.txt" << EOF
Cliente: $CLIENT_SLUG
API URL: $API_URL
Fecha de build: $(date)
Versión Angular: $(ng version --json 2>/dev/null | jq -r '.packages."@angular/core".version' 2>/dev/null || echo "N/A")
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
EOF

# 9. Crear script de instalación para el cliente
cat > "$DIST_FOLDER/install-$CLIENT_SLUG.bat" << EOF
@echo off
echo Instalando aplicacion para $CLIENT_SLUG...
echo API: $API_URL
echo.
echo Copiando archivos...
xcopy /E /I /Y *.* "C:\TotemApp\$CLIENT_SLUG\"
echo.
echo Instalacion completada!
echo La aplicacion se encuentra en: C:\TotemApp\$CLIENT_SLUG\
pause
EOF

echo ""
echo "🎉 ¡Deployment completado exitosamente!"
echo ""
echo "📂 Archivos generados en: $DIST_FOLDER"
echo "💿 Ejecutable listo para instalación en tótem"
echo "⚡ Script de instalación: install-$CLIENT_SLUG.bat"
echo ""
echo "📋 Para usar en otro cliente:"
echo "   ./deploy-client.sh nuevo-cliente-slug"
echo ""
