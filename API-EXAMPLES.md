# Ejemplos de Respuestas de API

Este documento muestra las estructuras de datos que debe devolver la API para que el sistema funcione correctamente.

## 1. Configuración del Cliente

**Endpoint:** `GET /api/client-config/{slug}/`

### Ejemplo para Cliente 1 (`/api/client-config/cliente1/`)

```json
{
  "id": 1,
  "name": "Cliente Uno",
  "slug": "cliente1",
  "organization_id": 1,
  "primary_color": "#000000",
  "secondary_color": "#FFD700",
  "accent_color": "#666666",
  "logo": "https://api.tu-dominio.com/media/logos/cliente1-logo.png",
  "favicon": "https://api.tu-dominio.com/media/favicons/cliente1.ico",
  "welcome_message": "Bienvenido a Cliente Uno",
  "contact_info": "Atención al cliente: 103",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "is_active": true
}
```

### Ejemplo para Cliente 2 (`/api/client-config/cliente2/`)

```json
{
  "id": 2,
  "name": "Cliente Dos Premium",
  "slug": "cliente2",
  "organization_id": 2,
  "primary_color": "#8B0000",
  "secondary_color": "#FFD700",
  "accent_color": "#CD853F",
  "logo": "https://api.tu-dominio.com/media/logos/cliente2-logo.png",
  "favicon": "https://api.tu-dominio.com/media/favicons/cliente2.ico",
  "welcome_message": "Descubre nuestros mejores productos",
  "contact_info": "Delivery: +56 9 1234 5678",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-20T14:45:00Z",
  "is_active": true
}
```

## 2. Categorías

**Endpoint:** `GET /api/category/`

```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "TELEFONÍA",
      "slug": "telefonia",
      "description": "<p>Smartphones, planes y servicios móviles</p>",
      "image": "https://api.tu-dominio.com/media/images/telefonia.webp",
      "style": "",
      "state": "publish",
      "icon_file": null,
      "order": 0,
      "virtual": false,
      "organization": 1,
      "parent": null,
      "images": [],
      "childs": null
    },
    {
      "id": 4,
      "name": "Vinos",
      "slug": "vinos",
      "description": "Selección premium de vinos nacionales e importados",
      "image": "https://api.tu-dominio.com/media/images/vinos.jpg",
      "style": "",
      "state": "publish",
      "icon_file": null,
      "order": 0,
      "virtual": false,
      "organization": 2,
      "parent": null,
      "images": [],
      "childs": null
    }
  ]
}
```

## 3. Productos por Categoría

**Endpoint:** `GET /api/product/?categories__id={category_id}`

### Ejemplo: Productos de Categoría 1 (`/api/product/?categories__id=1`)

```json
{
  "count": 15,
  "next": "https://api.tu-dominio.com/api/product/?categories__id=1&page=2",
  "previous": null,
  "results": [
    {
      "id": 101,
      "name": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "description": "El iPhone más avanzado con chip A17 Pro",
      "price": 1299990,
      "image": "https://api.tu-dominio.com/media/products/iphone-15-pro.jpg",
      "sku": "TEL-IPH-101-PRO15",
      "stock": 25,
      "category": 1,
      "organization": 1,
      "state": "publish",
      "featured": true,
      "discount": 0,
      "tags": ["smartphone", "apple", "premium"],
      "created_at": "2024-01-10T09:00:00Z",
      "updated_at": "2024-01-20T11:30:00Z"
    },
    {
      "id": 102,
      "name": "Plan Premium Max",
      "slug": "plan-premium-max",
      "description": "Plan ilimitado con 5G incluido",
      "price": 29990,
      "image": "https://api.tu-dominio.com/media/products/plan-max.jpg",
      "sku": "TEL-PLN-102-MAX",
      "stock": 999,
      "category": 1,
      "organization": 1,
      "state": "publish",
      "featured": false,
      "discount": 10,
      "tags": ["plan", "5g", "ilimitado"],
      "created_at": "2024-01-05T14:20:00Z",
      "updated_at": "2024-01-18T16:45:00Z"
    }
  ]
}
```

### Ejemplo: Productos de Categoría 4 (`/api/product/?categories__id=4`)

```json
{
  "count": 32,
  "next": "https://api.tu-dominio.com/api/product/?categories__id=4&page=2",
  "previous": null,
  "results": [
    {
      "id": 201,
      "name": "Vino Tinto Reserva Cabernet Sauvignon",
      "slug": "vino-tinto-reserva-cabernet",
      "description": "Vino tinto de alta calidad, cosecha 2021",
      "price": 12990,
      "image": "https://api.tu-dominio.com/media/products/vino-cabernet.jpg",
      "sku": "VIN-TIN-201-CAB21",
      "stock": 48,
      "category": 4,
      "organization": 2,
      "state": "publish",
      "featured": true,
      "discount": 15,
      "tags": ["vino", "tinto", "reserva", "cabernet"],
      "created_at": "2024-01-08T11:15:00Z",
      "updated_at": "2024-01-22T09:20:00Z"
    }
  ]
}
```
## 4. Campos Requeridos

### ClientConfig (Obligatorios)
- `name`: Nombre del cliente
- `slug`: Identificador único (usado en la URL)
- `organization_id`: ID de organización para filtrar categorías/productos
  - Cliente 1 (organizationId: 1): TELEFONÍA, HOGAR, ACCESORIOS
  - Cliente 2 (organizationId: 2): Vinos, Cervezas, Espumantes, Piscos, Bebidas
- `primary_color`: Color primario en formato hex
- `secondary_color`: Color secundario en formato hex
- `is_active`: Boolean para activar/desactivar cliente

### ClientConfig (Opcionales)
- `logo`: URL del logo
- `favicon`: URL del favicon
- `welcome_message`: Mensaje de bienvenida
- `contact_info`: Información de contacto

### Category (Obligatorios)
- `id`: ID único
- `name`: Nombre de la categoría
- `slug`: Slug para URLs
- `organization`: ID de organización (debe coincidir con client config)
- `state`: Estado de publicación

### Product (Obligatorios)
- `id`: ID único
- `name`: Nombre del producto
- `price`: Precio en centavos (ej: 12990 = $12.990)
- `category`: ID de categoría
- `organization`: ID de organización (debe coincidir con client config)
- `state`: Estado de publicación

## 5. Notas de Implementación

1. **Filtrado automático**: El frontend filtra automáticamente por `organization` según el cliente activo
2. **Colores CSS**: Se aplican dinámicamente usando CSS custom properties
3. **Precios**: Deben estar en centavos para facilitar cálculos
4. **Imágenes**: URLs absolutas recomendadas para evitar problemas de CORS
5. **Estados**: Solo se muestran elementos con `state: "publish"`
6. **Paginación**: El frontend maneja automáticamente la paginación de la API
