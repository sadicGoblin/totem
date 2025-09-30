# Configuración de Cliente - Sistema Multi-Cliente con API

Este sistema permite alternar entre diferentes clientes (Entel y Líquidos) cambiando una sola línea de configuración. **Toda la configuración detallada se obtiene dinámicamente desde la API.**

## Cómo cambiar de cliente

### 1. Abrir el archivo de configuración
```
src/app/config/client.config.ts
```

### 2. Cambiar la constante ACTIVE_CLIENT_SLUG
```typescript
// Para usar Cliente 1 (organizationId: 1)
export const ACTIVE_CLIENT_SLUG = 'cliente1';

// Para usar Cliente 2 (organizationId: 2)
export const ACTIVE_CLIENT_SLUG = 'cliente2';
```

### 3. Reiniciar la aplicación
Después de cambiar la configuración, reinicia el servidor de desarrollo:
```bash
ng serve
```

La aplicación automáticamente cargará la configuración desde la API al iniciar.

## Clientes disponibles

Los clientes se configuran dinámicamente desde la API. Solo necesitas el slug:

### Cliente 1 (`slug: 'cliente1'`)
- **Organizacion ID**: 1
- **Categorías**: Ejemplo: TELEFONÍA, HOGAR, ACCESORIOS
- **Configuración**: Obtenida desde `/api/client-config/cliente1/`

### Cliente 2 (`slug: 'cliente2'`)
- **Organizacion ID**: 2  
- **Categorías**: Ejemplo: Vinos, Cervezas, Espumantes, Piscos, Bebidas
- **Configuración**: Obtenida desde `/api/client-config/cliente2/`

## Funcionalidades automáticas

Al cambiar de cliente, automáticamente:
- ✅ **Carga configuración** desde API al iniciar la app
- ✅ **Filtra categorías** por `organization` en CategoryService
- ✅ **Filtra productos** por `organization` en ProductService
- ✅ **Aplica colores CSS** dinámicamente usando CSS custom properties
- ✅ **Actualiza favicon** si está configurado en la API
- ✅ **Reactivo** - Los componentes se actualizan automáticamente

## API Endpoints utilizados

### Configuración del cliente
```
GET /api/client-config/{slug}/
```
Retorna la configuración completa del cliente (colores, logo, organización, etc.)

### Categorías
GET /api/category/
Filtrado automático por `organization === configService.getOrganizationId()`

### Productos por categoría
```
GET /api/product/?categories__id={id}
```
Filtrado automático por `organization === configService.getOrganizationId()`

## Ejemplo de uso en componentes

{{ ... }}
import { ConfigService } from '../services/config.service';
import { getActiveClientSlug } from '../config/client.config';

export class MiComponente implements OnInit {
  clientConfig: any = null;
  activeClientSlug = getActiveClientSlug();
  
  constructor(private configService: ConfigService) {}
  
  ngOnInit() {
    // Suscribirse a cambios de configuración
    this.configService.config$.subscribe(config => {
      this.clientConfig = config;
      if (config) {
        console.log('Cliente activo:', config.name);
        console.log('Organización ID:', config.organization_id);
        console.log('Colores:', config.primary_color, config.secondary_color);
      }
    });
  }
}
```

## Agregar nuevos clientes

Para agregar un nuevo cliente:

### 1. Crear configuración en la base de datos
Crea un nuevo registro en la API con el endpoint `/api/client-config/` que incluya:

```json
{
  "name": "Nuevo Cliente",
  "slug": "nuevo_cliente",
  "organization_id": 3,
  "primary_color": "#FF0000",
  "secondary_color": "#00FF00",
  "accent_color": "#0000FF",
  "logo": "https://api.tu-dominio.com/media/logos/nuevo-cliente.png",
  "favicon": "https://api.tu-dominio.com/media/favicons/nuevo-cliente.ico",
  "welcome_message": "Bienvenido a Nuevo Cliente",
  "is_active": true
}
```

### 2. Actualizar configuración local
Agrega el nuevo slug a `AVAILABLE_CLIENTS` en `client.config.ts`:

```typescript
export const AVAILABLE_CLIENTS = [
  'cliente1',
  'cliente2',
  'nuevo_cliente'  // ← Agregar aquí
] as const;
```

### 3. Activar el nuevo cliente
```typescript
export const ACTIVE_CLIENT_SLUG = 'nuevo_cliente';
```

**¡No necesitas tocar ningún otro archivo!** El sistema cargará automáticamente toda la configuración desde la API.
