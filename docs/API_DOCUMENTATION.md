# 📚 API Documentation - Catalogue API

**Base URL**: `https://catalogue.favric.cl/api/`  
**Local URL**: `http://localhost:8050/api/`

Esta documentación está diseñada para facilitar la integración con aplicaciones Angular.

## 📥 Colección de Insomnia

Para probar la API fácilmente, descarga la colección de Insomnia:

**📦 [Descargar Insomnia_Catalogue_API.json](../Insomnia_Catalogue_API.json)**

### Cómo importar:
1. Abre Insomnia
2. Click en **Application** → **Preferences** → **Data** → **Import Data**
3. Selecciona **From File**
4. Elige el archivo `Insomnia_Catalogue_API.json`

La colección incluye:
- ✅ Todos los endpoints (Products, Categories, Brands, Slides, Client Config)
- ✅ Environments (Production y Local)
- ✅ Variables de entorno configuradas
- ✅ Ejemplos de body para POST/PUT/PATCH
- ✅ Query parameters pre-configurados

---

## 🔐 Autenticación

La API actualmente permite acceso sin autenticación (`AllowAny`). Para endpoints protegidos en el futuro, se usará:

- **Session Authentication**
- **Basic Authentication**

---

## 📦 Modelos Principales

### **1. Organization (Organización)**

Representa una organización que puede tener múltiples catálogos.

```typescript
interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created: string;  // ISO 8601
  modified: string; // ISO 8601
}
```

---

### **2. Catalogue (Catálogo)**

Catálogo de productos perteneciente a una organización.

```typescript
interface Catalogue {
  id: number;
  organization: number;  // Organization ID
  name: string;
  slug: string;
  code: string;  // Código único para acceso público
  description?: string;
  currency: 'CLP' | 'USD' | 'EUR' | 'ARS' | 'BRL' | 'MXN' | 'COP' | 'PEN';
  is_active: boolean;
  created: string;
  modified: string;
}
```

---

### **3. Product (Producto)**

Producto dentro de un catálogo.

```typescript
interface Product {
  id: number;
  catalogue: number;  // Catalogue ID
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  short_description?: string;
  tags?: string;  // Separadas por comas: "bebida, vino, tinto"
  tags_list?: string[];  // Array: ["bebida", "vino", "tinto"]
  
  // Precios
  price_1?: string;  // Decimal como string
  price_1_formatted?: string;  // Formateado: "$5.500"
  price_2?: string;  // Precio oferta
  price_2_formatted?: string;
  currency: string;
  currency_info?: CurrencyInfo;
  
  // Stock
  stock_quantity: number;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  manage_stock: boolean;
  
  // Relaciones
  brand?: Brand;
  categories?: Category[];
  images?: Image[];
  variations?: Product[];  // Variaciones del producto
  parent?: number;  // ID del producto padre
  
  // Dimensiones
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  
  // Estado
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  is_removed: boolean;
  
  // Fechas
  created: string;
  modified: string;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  decimals: number;
  decimal_separator: string;
  thousands_separator: string;
}
```

---

### **4. Category (Categoría)**

Categorías de productos con estructura jerárquica.

```typescript
interface Category {
  id: number;
  organization: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  icon_file?: string;
  parent?: number;  // ID de categoría padre
  style?: string;
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  order: number;
  created: string;
  modified: string;
}
```

---

### **5. Brand (Marca)**

Marcas de productos.

```typescript
interface Brand {
  id: number;
  organization: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  parent?: number;
  style?: string;
  state: 'publish' | 'draft' | 'pending';
  order: number;
  created: string;
  modified: string;
}
```

---

### **6. Slide (Banner/Slide)**

Slides o banners para el catálogo.

```typescript
interface Slide {
  id: number;
  catalogue: number;
  name: string;
  slug: string;
  description?: string;
  tags?: string;
  image?: string;
  link?: string;
  button_text?: string;
  order: number;
  state: 'publish' | 'draft' | 'pending';
  virtual: boolean;
  created: string;
  modified: string;
}
```

---

### **7. ClientConfiguration (Configuración del Cliente)**

Configuración de branding y personalización por cliente.

```typescript
interface ClientConfiguration {
  id: number;
  catalogue?: number;
  name: string;
  domain: string;
  description?: string;
  
  // Colores (formato hexadecimal)
  primary_color: string;    // "#FF5733"
  secondary_color: string;  // "#000000"
  accent_color?: string;    // "#007BFF"
  
  // Branding
  logo?: string;    // URL de la imagen
  favicon?: string; // URL de la imagen
  
  // Metadata adicional
  metadata?: Record<string, any>;
  
  // Estado
  is_active: boolean;
  created: string;
  modified: string;
}
```

---

## 🌐 Endpoints de la API

### **Products (Productos)**

#### **Listar Productos**
```
GET /api/products/
```

**Query Parameters**:
- `search` - Buscar por nombre, SKU, descripción
- `ordering` - Ordenar por: `name`, `price_1`, `created`, `-name`, `-price_1`
- `catalogue` - Filtrar por ID de catálogo
- `catalogue__code` - Filtrar por código de catálogo
- `catalogue__slug` - Filtrar por slug de catálogo
- `categories` - Filtrar por ID de categoría
- `categories__name` - Filtrar por nombre de categoría
- `brand` - Filtrar por ID de marca
- `brand__name` - Filtrar por nombre de marca
- `state` - Filtrar por estado: `publish`, `draft`, `pending`
- `page` - Número de página (paginación)
- `page_size` - Tamaño de página (default: 20)

**Ejemplo**:
```
GET /api/products/?catalogue__code=CAT2024&search=vino&ordering=-price_1
```

**Respuesta**:
```json
{
  "count": 150,
  "next": "http://localhost:8050/api/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Vino Tinto Reserva",
      "sku": "VIN001",
      "tags": "vino, tinto, bebida",
      "tags_list": ["vino", "tinto", "bebida"],
      "price_1": "15000.00",
      "price_1_formatted": "$15.000",
      "price_2": "12000.00",
      "price_2_formatted": "$12.000",
      "currency": "CLP",
      "currency_info": {
        "code": "CLP",
        "symbol": "$",
        "decimals": 0,
        "thousands_separator": "."
      },
      "stock_quantity": 50,
      "stock_status": "instock",
      "brand": {
        "id": 1,
        "name": "Concha y Toro"
      },
      "categories": [
        {
          "id": 1,
          "name": "Vinos"
        }
      ],
      "images": [
        {
          "id": 1,
          "image": "https://storage.googleapis.com/..."
        }
      ]
    }
  ]
}
```

---

#### **Obtener Producto**
```
GET /api/products/{id}/
```

**Respuesta**: Objeto `Product` completo

---

#### **Crear Producto**
```
POST /api/products/
Content-Type: application/json
```

**Body**:
```json
{
  "catalogue": 1,
  "name": "Nuevo Producto",
  "sku": "PROD001",
  "price_1": "10000.00",
  "stock_quantity": 100,
  "manage_stock": true,
  "state": "publish"
}
```

---

#### **Actualizar Producto**
```
PUT /api/products/{id}/
PATCH /api/products/{id}/
Content-Type: application/json
```

**Body** (PATCH permite campos parciales):
```json
{
  "price_1": "12000.00",
  "stock_quantity": 80
}
```

---

#### **Eliminar Producto**
```
DELETE /api/products/{id}/
```

---

### **Categories (Categorías)**

#### **Listar Categorías**
```
GET /api/categories/
```

**Query Parameters**:
- `search` - Buscar por nombre, descripción
- `ordering` - Ordenar por: `order`, `name`, `created`
- `organization` - Filtrar por ID de organización
- `org_slug` - Filtrar por slug de organización
- `parent` - Filtrar por ID de categoría padre
- `state` - Filtrar por estado

**Ejemplo**:
```
GET /api/categories/?org_slug=favric&state=publish
```

---

#### **Obtener Categoría**
```
GET /api/categories/{id}/
```

---

#### **Crear/Actualizar/Eliminar Categoría**
```
POST   /api/categories/
PUT    /api/categories/{id}/
PATCH  /api/categories/{id}/
DELETE /api/categories/{id}/
```

---

### **Brands (Marcas)**

#### **Listar Marcas**
```
GET /api/brands/
```

**Query Parameters**:
- `search` - Buscar por nombre, descripción
- `ordering` - Ordenar por: `order`, `name`
- `organization` - Filtrar por ID de organización
- `org_slug` - Filtrar por slug de organización
- `state` - Filtrar por estado

---

#### **CRUD Completo**
```
GET    /api/brands/
GET    /api/brands/{id}/
POST   /api/brands/
PUT    /api/brands/{id}/
PATCH  /api/brands/{id}/
DELETE /api/brands/{id}/
```

---

### **Slides (Banners)**

#### **Listar Slides**
```
GET /api/slides/
```

**Query Parameters**:
- `search` - Buscar por nombre, descripción
- `ordering` - Ordenar por: `order`, `name`, `created`
- `catalogue` - Filtrar por ID de catálogo
- `catalogue__code` - Filtrar por código de catálogo
- `catalogue__slug` - Filtrar por slug de catálogo
- `state` - Filtrar por estado

---

#### **CRUD Completo**
```
GET    /api/slides/
GET    /api/slides/{id}/
POST   /api/slides/
PUT    /api/slides/{id}/
PATCH  /api/slides/{id}/
DELETE /api/slides/{id}/
```

---

### **Client Configuration (Configuración del Cliente)**

#### **Listar Configuraciones**
```
GET /api/client-configurations/
```

**Query Parameters**:
- `search` - Buscar por nombre, dominio, descripción
- `is_active` - Filtrar por activo: `true` o `false`
- `catalogue` - Filtrar por ID de catálogo

---

#### **Obtener por Nombre**
```
GET /api/client-config/{client_name}/
```

**Ejemplo**:
```
GET /api/client-config/favric/
```

---

#### **Obtener por Dominio**
```
GET /api/client-config-by-domain/{domain}/
```

**Ejemplo**:
```
GET /api/client-config-by-domain/catalogue.favric.cl/
```

---

#### **CRUD Completo**
```
GET    /api/client-configurations/
GET    /api/client-configurations/{name}/
POST   /api/client-configurations/
PUT    /api/client-configurations/{name}/
PATCH  /api/client-configurations/{name}/
DELETE /api/client-configurations/{name}/
```

---

### **Complete Catalogue (Catálogo Completo)**

Endpoint especial que retorna toda la información de un catálogo en una sola llamada.

```
GET /api/catalogue/{code}/
```

**Ejemplo**:
```
GET /api/catalogue/CAT2024/
```

**Respuesta**:
```json
{
  "catalogue": {
    "id": 1,
    "name": "Catálogo 2024",
    "code": "CAT2024",
    "currency": "CLP"
  },
  "organization": {
    "id": 1,
    "name": "Favric",
    "slug": "favric"
  },
  "products": [...],
  "categories": [...],
  "brands": [...],
  "slides": [...],
  "client_configuration": {
    "primary_color": "#FF5733",
    "logo": "https://..."
  }
}
```

---

## 🔧 Ejemplo de Servicio Angular

### **product.service.ts**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Product {
  id: number;
  name: string;
  sku?: string;
  price_1?: string;
  price_1_formatted?: string;
  price_2?: string;
  price_2_formatted?: string;
  currency: string;
  stock_quantity: number;
  stock_status: string;
  tags?: string;
  tags_list?: string[];
  brand?: any;
  categories?: any[];
  images?: any[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  // Listar productos con filtros
  getProducts(params?: {
    search?: string;
    catalogue__code?: string;
    categories?: number;
    brand?: number;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<Product>>(this.apiUrl + '/', { params: httpParams });
  }

  // Obtener un producto
  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}/`);
  }

  // Crear producto
  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl + '/', product);
  }

  // Actualizar producto
  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}/`, product);
  }

  // Eliminar producto
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  // Buscar productos por tags
  searchByTags(tags: string[]): Observable<PaginatedResponse<Product>> {
    const search = tags.join(' ');
    return this.getProducts({ search });
  }
}
```

---

### **catalogue.service.ts**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CompleteCatalogue {
  catalogue: any;
  organization: any;
  products: any[];
  categories: any[];
  brands: any[];
  slides: any[];
  client_configuration: any;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {
  private apiUrl = `${environment.apiUrl}/catalogue`;

  constructor(private http: HttpClient) {}

  // Obtener catálogo completo por código
  getCompleteCatalogue(code: string): Observable<CompleteCatalogue> {
    return this.http.get<CompleteCatalogue>(`${this.apiUrl}/${code}/`);
  }
}
```

---

### **client-config.service.ts**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ClientConfiguration {
  id: number;
  name: string;
  domain: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo?: string;
  favicon?: string;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ClientConfigService {
  private apiUrl = `${environment.apiUrl}/client-config`;

  constructor(private http: HttpClient) {}

  // Obtener configuración por nombre
  getConfigByName(name: string): Observable<ClientConfiguration> {
    return this.http.get<ClientConfiguration>(`${this.apiUrl}/${name}/`);
  }

  // Obtener configuración por dominio
  getConfigByDomain(domain: string): Observable<ClientConfiguration> {
    return this.http.get<ClientConfiguration>(`${this.apiUrl}-by-domain/${domain}/`);
  }
}
```

---

### **environment.ts**

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8050/api'
};

// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://catalogue.favric.cl/api'
};
```

---

## 📝 Notas Importantes

### **CORS**
La API tiene CORS configurado. Asegúrate de que tu dominio Angular esté en la lista de orígenes permitidos.

### **Paginación**
Todos los endpoints de listado están paginados con 20 elementos por página por defecto. Usa `page_size` para cambiar esto.

### **Formato de Fechas**
Todas las fechas están en formato ISO 8601: `2024-01-21T15:30:00Z`

### **Formato de Precios**
- `price_1`, `price_2`: String con decimales (ej: `"15000.00"`)
- `price_1_formatted`, `price_2_formatted`: String formateado según moneda (ej: `"$15.000"`)

### **Tags**
- `tags`: String con tags separadas por comas (ej: `"vino, tinto, bebida"`)
- `tags_list`: Array de strings (ej: `["vino", "tinto", "bebida"]`)

### **Stock**
- `stock_status`: `"instock"` | `"outofstock"` | `"onbackorder"`
- Se actualiza automáticamente cuando `stock_quantity` cambia

---

## 🚀 Inicio Rápido

### **1. Instalar HttpClientModule**

```typescript
// app.module.ts
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
    HttpClientModule,
    // ...
  ]
})
export class AppModule { }
```

### **2. Crear Servicios**

Copia los servicios de ejemplo y ajústalos según tus necesidades.

### **3. Usar en Componentes**

```typescript
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  
  constructor(private productService: ProductService) {}
  
  ngOnInit() {
    this.productService.getProducts({
      catalogue__code: 'CAT001',
      ordering: '-created'
    }).subscribe(response => {
      this.products = response.results;
    });
  }
}
```

---

## 📞 Soporte

Para más información o dudas sobre la API, contactar al equipo de desarrollo.

**Última actualización**: 2026-01-21
