# 🏢 Sistema Multi-Tenant - Totem Application

## 📋 Descripción

Sistema centralizado para manejar múltiples clientes con una sola base de código. Cada cliente tiene su configuración única pero comparten la misma aplicación.

## 🚀 Uso Rápido

### Para cambiar de cliente:

1. **Editar configuración:**
   ```typescript
   // src/config/client.config.ts
   export const CLIENT_CONFIG = {
     organizationSlug: 'nuevo-cliente-slug', // ⭐ CAMBIAR ESTA LÍNEA
     // ... resto de configuración
   };
   ```

2. **Generar ejecutable:**
   ```bash
   ./deploy-client.sh nuevo-cliente-slug
   ```

## 📁 Estructura de Archivos

```
src/
├── config/
│   └── client.config.ts          # ⭐ CONFIGURACIÓN PRINCIPAL
├── environments/
│   ├── environment.ts            # Usa CLIENT_CONFIG
│   └── environment.prod.ts       # Usa CLIENT_CONFIG
├── app/services/
│   ├── base-api.service.ts       # Agrega org_slug automáticamente
│   └── category.service.ts       # Usa BaseApiService
└── ...
```

## 🔧 Cómo Funciona

### 1. **Configuración Centralizada**
```typescript
// src/config/client.config.ts
export const CLIENT_CONFIG = {
  organizationSlug: 'entel-chile',        // Identifica al cliente
  apiBase: 'http://localhost:8050/api',   // URL de la API
  branding: {
    primaryColor: '#000000',              // Colores personalizados
    secondaryColor: '#FFD700',
    storeName: '',                        // Se obtiene de API
  },
  features: {
    printReceipts: true,                  // Funcionalidades por cliente
    qrCodeSupport: true,
    mobileCart: true
  }
};
```

### 2. **API Service Automático**
```typescript
// Antes (manual):
this.http.get('http://localhost:8050/api/category?org_slug=entel-chile')

// Ahora (automático):
this.baseApi.get('category')
// ↓ Automáticamente se convierte en:
// http://localhost:8050/api/category?org_slug=entel-chile
```

### 3. **Services Simplificados**
```typescript
// src/app/services/category.service.ts
export class CategoryService {
  constructor(private baseApi: BaseApiService) {}

  getCategories(): Observable<CategoryApiResponse> {
    return this.baseApi.get<CategoryApiResponse>('category');
    // org_slug se agrega automáticamente
  }
}
```

## 🏗️ Ejemplos de Clientes

### Cliente 1: Entel Chile
```typescript
organizationSlug: 'entel-chile',
branding: {
  primaryColor: '#000000',
  secondaryColor: '#FFD700'
}
```

### Cliente 2: Restaurante Abuelos
```typescript
organizationSlug: 'restaurante-abuelos',
branding: {
  primaryColor: '#8B4513',
  secondaryColor: '#FF6347'
}
```

### Cliente 3: Farmacia Cruz Verde
```typescript
organizationSlug: 'farmacia-cruz-verde',
branding: {
  primaryColor: '#228B22',
  secondaryColor: '#32CD32'
}
```

## 📦 Scripts de Deployment

### Deployment Básico
```bash
./deploy-client.sh entel-chile
```

### Deployment con API Personalizada
```bash
./deploy-client.sh restaurante-abuelos http://api.restaurante.com/api
```

### Deployment para Producción
```bash
./deploy-client.sh farmacia-cruz-verde https://prod-api.farmacias.cl/api
```

## 🔍 URLs Generadas Automáticamente

Todas las requests de la API incluyen automáticamente `org_slug`:

```
Original:     /api/category
Resultado:    /api/category?org_slug=entel-chile

Original:     /api/product_view
Resultado:    /api/product_view?org_slug=entel-chile

Original:     /api/category/5
Resultado:    /api/category/5?org_slug=entel-chile
```

## 📂 Estructura de Deployment

Después del deployment, se crea:

```
dist-clients/
└── entel-chile/
    ├── totem-app.exe                    # Ejecutable principal
    ├── install-entel-chile.bat          # Script de instalación
    ├── client-info.txt                  # Info del deployment
    └── resources/                       # Recursos de la app
```

## 🛠️ Mantenimiento

### Agregar Nuevo Service
```typescript
// src/app/services/product.service.ts
export class ProductService {
  constructor(private baseApi: BaseApiService) {}

  getProducts(): Observable<ProductResponse> {
    return this.baseApi.get<ProductResponse>('product_view');
    // org_slug automático ✅
  }
}
```

### Agregar Configuración Personalizada
```typescript
// src/config/client.config.ts
export const CLIENT_CONFIG = {
  organizationSlug: 'cliente-nuevo',
  
  // Nueva configuración personalizada
  customSettings: {
    showWelcomeVideo: false,
    maxItemsPerCategory: 50,
    enableDiscounts: true
  }
};
```

## 🚨 Importante

- **Solo cambiar `organizationSlug`** para nuevos clientes
- **No modificar** `BaseApiService` - es universal
- **Usar siempre** `BaseApiService` en nuevos services
- **El script de deployment** maneja todo automáticamente

## 📞 Soporte

Para agregar nuevos endpoints o funcionalidades, seguir el patrón establecido con `BaseApiService`.

---

✅ **Sistema listo para múltiples clientes con un solo comando**
