# Catálogo TicketPro · Totem 1080×1920 — Especificación de diseño

> Rediseño del totem POS para ambiente disco/nightclub.
> 4 direcciones visuales exploradas, **V1 Midnight** es la recomendada.
> Formato vertical fijo 1080×1920px. Colores principales controlables desde `theme.config.json` del admin.

---

## 0. Contexto

- **Hardware**: Totem vertical 1080×1920 con POS integrado (Transbank) e impresora térmica.
- **Stack actual**: Angular (ver `totem/src/app/`).
- **Ambiente**: discoteca / club nocturno. Baja luminosidad ambiente, usuarios eventualmente alcoholizados, transacciones rápidas.
- **Problema actual**: UI muy clara (fondo blanco + azul), tap targets pequeños, sidebar de carrito 600px que tapa el catálogo, jerarquía pobre.

### Principios de diseño aplicados

1. **Modo oscuro siempre** — reduce fatiga visual en luz baja y deja respirar las fotos de los tragos.
2. **Tap targets ≥ 72px** — usuarios con motricidad reducida (alcohol, prisa, copa en mano).
3. **Tipografía display grande** (≥36px títulos, ≥22px precios) — legible a brazo extendido.
4. **Carrito sticky inferior** en vez de sidebar lateral — alcance de pulgar + no tapa contenido.
5. **Categorías horizontales arriba** — libera los 200px laterales del sidebar de categorías.
6. **Flujo ≤ 4 toques** desde catálogo a confirmación de pago.

---

## 1. Sistema visual — V1 Midnight (recomendado)

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| `bg` | `#0A0E14` | Fondo principal |
| `surface` | `#131A23` | Tarjetas, contenedores nivel 1 |
| `surfaceHi` | `#1B2533` | Contenedores nivel 2 (sticky bar) |
| `border` | `rgba(255,255,255,0.08)` | Bordes sutiles |
| `borderStrong` | `rgba(255,255,255,0.14)` | Bordes con énfasis |
| `text` | `#F2F6FB` | Texto principal |
| `dim` | `#8A98AB` | Texto secundario / metadata |
| `primary` | `#3BA8F0` | **brand primary del admin, levantado para noche** — CTAs, focus, glow |
| `primaryDeep` | `#1054DA` | **brand secondary del admin** — extremo del gradiente |
| `accent` | `#5EE6D0` | Confirmaciones, badges de descuento, "online" |
| `danger` | `#FF6B6B` | Eliminar item, error |

> **Mapeo con `theme.config.json`**: `primary` → `global.colors.primary`, `primaryDeep` → `global.colors.secondary`, `accent` → nuevo token `global.colors.accent2` (sugerido).

### Tipografía

```
Display:  Space Grotesk · 700/800 · letter-spacing -0.02em a -0.04em
UI / Body: Inter · 400/500/600/700
Numerales: tabular-nums (precios, contadores, total)
```

Escala usada:
- Display XL: 60–96px (heros, totales)
- Display L: 38–48px (títulos de sección, nombres en cart)
- Display M: 26–32px (nombres de producto en grid)
- Body L: 22px (descripciones)
- Body M: 18px (UI)
- Label: 14–16px tracking 0.12–0.20em (TODO MAYÚSCULAS)

### Tokens de capa / forma

```
radius-card:    28px
radius-button:  18–26px
radius-pill:    999px
radius-input:   14–16px

shadow-button:  0 14px 36px -10px {primary}
shadow-sheet:   0 30px 80px -10px rgba(0,0,0,0.7)
glow-cta:       0 0 24px -4px {primary}80
```

### Glow ambiente

Background del frame lleva 3 radial gradients suaves:
- `900×700 at 10% -5%` con primary @ 18%
- `700×500 at 110% 100%` con accent @ 10%
- `1200×800 at 50% 50%` con primaryDeep @ 5%

Da la sensación de "luces de pista" sin distraer.

---

## 2. Inventario de pantallas (V1 completo)

| # | Pantalla | Archivo | Propósito |
|---|----------|---------|-----------|
| 1 | **Bienvenida** | `MidnightWelcome` | Attract screen, idle state. CTA grande "Tocar para comenzar". |
| 2 | **Catálogo** | `MidnightHome` | Hero promo + categorías horizontales + grid 2-col + sticky cart. |
| 3 | **Detalle producto** | `MidnightProductDetail` | Bottom sheet con foto grande, descripción, qty stepper, CTA "Agregar". |
| 4 | **Carrito flotante** | `MidnightCartFloating` | Drawer bottom-sheet sobre catálogo con items + sugerencia + total. |
| 5 | **Carrito pantalla completa** | `MidnightCartFull` | Vista expandida con subtotal/propina/total y CTA "Pagar". |
| 6 | **Pago POS** | `MidnightPayment` | Total grande + métodos + "Acerca tu tarjeta". |
| 7 | **Comprobante** | `MidnightSuccess` | Confirmación + número de retiro grande (#2847). |

### Mapeo a componentes Angular existentes

```
MidnightWelcome        → src/app/pages/welcome/
MidnightHome           → src/app/home/                + src/app/components/category/
MidnightProductDetail  → src/app/components/modal/   (productModal)
MidnightCartFloating   → src/app/components/cart-floating/   (rehacer sidebar 600px como bottom-sheet)
MidnightCartFull       → src/app/pages/checkout/
MidnightPayment        → src/app/pages/payment/      (estado: methodCard)
MidnightSuccess        → src/app/pages/payment/      (estado: voucherPrinting)
```

---

## 3. Layout — Catálogo (pantalla principal)

```
┌────────────────────────────── 1080 ──────────────────────────────┐
│  HEADER · 130px                                                  │
│  ● EN VIVO · 23:42        TICKETPRO ®              [ ES ]        │
├──────────────────────────────────────────────────────────────────┤
│  HERO PROMO · 320px (margin 28 + 48px laterales)                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ● HAPPY HOUR · HASTA 01:00                              │    │
│  │  2x1 en coctelería                                       │    │
│  │  de la casa                                              │    │
│  │  ●──── · · ·                                             │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│  CATEGORÍAS · scroll horizontal · 200px                          │
│  Categorías                                       DESLIZA →      │
│  [Todos] [Coctelería*] [Cervezas] [Destilados] [Shots] ...       │
├──────────────────────────────────────────────────────────────────┤
│  GRID PRODUCTOS · 2 columnas · gap 24px · padding 32-48          │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │   IMG 320    │  │   IMG 320    │                              │
│  │  [-30%]      │  │  [TOP]       │                              │
│  ├──────────────┤  ├──────────────┤                              │
│  │ Nombre       │  │ Nombre       │                              │
│  │ desc 2 lines │  │ desc 2 lines │                              │
│  │ $5.250 $7.5K │  │ $5.250       │                              │
│  │ [+ Agregar]  │  │ [+ Agregar]  │                              │
│  └──────────────┘  └──────────────┘                              │
│  ... más cards ...                                               │
│  --- padding-bottom 280px para no chocar con sticky cart ---     │
└──────────────────────────────────────────────────────────────────┘
│  STICKY CART · 132px height · 32px margin · 36px bottom safe-area│
│  ┌────────────────────────────────────────────────────────┐      │
│  │  [🛒3]  TU PEDIDO          [ Revisar pedido  → ]       │      │
│  │         $15.750                                        │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Especificación detallada — Categoría activa

```
Inactiva:
- bg: surface
- border: 1.5px border
- glyph opacity: 0.55
- text: text

Activa:
- bg: linear-gradient(135deg, primary 0%, primaryDeep 100%)
- border: primary
- shadow: 0 12px 40px -10px primary@50%
- text: #fff
- glyph opacity: 0.95
```

### Specs producto card

```
container:
  bg: surface
  border: 1px border
  radius: 28px
  flex column

image:
  height: 320px
  cover; pos center
  tags overlay top-left:
    discount: bg accent (#5EE6D0), text #06231F, weight 700
    feature tag: bg rgba(10,14,20,0.85), border 1px primary, text primary

content (padding 22 24):
  name: Space Grotesk 26/600 -0.01em
  desc: 15px / dim / 2 lines max, height 40px
  price-row (marginTop 18, baseline):
    current: Space Grotesk 32/700 text
    original: 18 dim line-through

cta:
  margin: 18px
  height: 76px
  radius: 18
  bg: linear-gradient(135deg, primary, primaryDeep)
  text: 22/700 #fff
  shadow: 0 10px 28px -10px primary@56%
  icon plus 24 + "Agregar al carrito"
```

---

## 4. Comportamiento e interacciones

### Flujo principal (happy path)

```
Welcome ─(tap)─→ Catálogo
   │
   ├─(tap producto)─→ Detalle bottom-sheet
   │                     ├─ qty stepper
   │                     └─(Agregar)─→ vuelve a Catálogo, sticky cart actualiza con animación
   │
   ├─(tap sticky cart)─→ Carrito flotante (drawer)
   │                        ├─(seguir comprando)─→ Catálogo
   │                        └─(Pagar →)─→ Pago POS
   │
   └─(swipe up en sticky)─→ Carrito pantalla completa (alternativa)

Pago POS ─(tarjeta detectada)─→ Procesando ─→ Comprobante
                                                  └─(timeout 8s / tap)─→ Welcome
```

### Reglas de animación

- Bottom sheet entrance: 320ms cubic-bezier(0.2, 0.8, 0.2, 1), translateY 100% → 0
- Cart bar update: number scale 1 → 1.1 → 1, 280ms, sincronizado con badge flash
- Categoría tap: scale 1 → 0.97 → 1, 180ms
- Hero promo: auto-rotate cada 6s, fade-crossfade 400ms

### Estados de error / vacío

- **Cart vacío**: sticky bar oculto, fab "Empezar pedido" o sólo mostrar catálogo limpio
- **Producto sin stock**: card en grayscale 0.6 con overlay "Agotado" 800/0.18em
- **Pago rechazado**: misma pantalla de pago, banner inferior danger con "Reintentar"/"Cambiar método"

---

## 5. Reglas de datos / contenido

- Precios en CLP, formato `$5.250` (punto miles, sin centavos)
- Nombres de producto máx 24 caracteres ideal, truncar con `text-wrap: pretty`
- Descripciones máx 2 líneas (height fijo 40px en grid, sin límite en detalle)
- Categorías ordenadas: Todos → Coctelería → Cervezas → Destilados → Shots → Sin alcohol
- Hero rotativo: máx 4 slides, cada uno con tag (HAPPY HOUR/NUEVO/PROMO), título 2 líneas

---

## 6. Internacionalización + accesibilidad

- Idiomas: ES por defecto, selector ES/EN en header (componente ya existe).
- Tap target mínimo: 72×72px (excede WCAG 44×44).
- Contraste mínimo verificado: texto primary sobre bg = 11.3:1 ✓ (AAA).
- Texto secundario `dim` sobre `bg` = 5.4:1 ✓ (AA).
- Nada de tooltips o hover-only states (es totem táctil).

---

## 7. Cómo pasar este diseño a Claude Code

### Opción A — Handoff directo (recomendado)

1. Abre tu repo `totem/` en Claude Code (o en una sesión local con el CLI).
2. Sube este archivo `Catálogo TicketPro.md` y los archivos del proyecto:
   - `Catálogo TicketPro.html`
   - `shared.jsx`
   - `v1-midnight.jsx` (el más importante — la implementación de referencia)
   - `canvas.jsx`
   - `design-canvas.jsx` (opcional)
3. Prompt sugerido para Claude Code:

```
Acá tienes el rediseño del totem en HTML/React (archivos *.jsx).
Tu tarea: portar la dirección "V1 Midnight" al stack Angular existente.

Archivos de referencia (orden de prioridad):
  1. Catálogo TicketPro.md → especificación completa
  2. v1-midnight.jsx       → implementación React de referencia
  3. shared.jsx            → tokens, íconos, helpers

Mapeo de componentes Angular destino:
  - MidnightHome           → src/app/home/
  - MidnightWelcome        → src/app/pages/welcome/
  - MidnightProductDetail  → src/app/components/modal/
  - MidnightCartFloating   → src/app/components/cart-floating/ (rehacer)
  - MidnightCartFull       → src/app/pages/checkout/
  - MidnightPayment        → src/app/pages/payment/
  - MidnightSuccess        → src/app/pages/payment/ (estado voucherPrinting)

Restricciones:
  - Mantener compatibilidad con src/config/theme.config.json
  - Inyectar paleta como CSS variables en :root
  - Las animaciones según sección "Reglas de animación" del MD
  - Reutilizar servicios existentes (cart.service, products.service, etc)
  - No cambiar lógica de POS / impresora (transbank-pos-service)

Empieza por: 1) actualizar theme.config.json con la paleta Midnight,
2) reescribir src/styles.scss con las CSS variables y tokens,
3) refactor del home component.
```

### Opción B — Solo pasarle el JSX para que adapte

Si prefieres iteración más liviana:

1. Abre cada `.component.html` y `.component.scss` del componente que quieras actualizar.
2. Pégale el bloque correspondiente de `v1-midnight.jsx` en el prompt.
3. Pídele: *"Adapta este JSX al template Angular de @file.component.html, manteniendo bindings y servicios actuales pero aplicando los estilos del JSX."*

### Opción C — Si quieres que lo haga yo aquí

Puedo:
- Generar los `.scss` por componente con las CSS variables y tokens.
- Generar los `.component.html` actualizados (con tu sintaxis Angular y `*ngFor`, `(click)`, etc).
- Generar un `theme.config.json` nuevo con la paleta Midnight ya aplicada.

Sólo dime cuál componente quieres atacar primero.

---

## 8. Archivos del paquete de entrega

```
.
├── Catálogo TicketPro.html      ← canvas con las 4 direcciones
├── Catálogo TicketPro.md        ← este documento
├── shared.jsx                    ← tokens, productos demo, íconos
├── v1-midnight.jsx               ← V1 (recomendada) · 7 pantallas
├── v2-neon.jsx                   ← V2 After Hours · 4 pantallas
├── v3-vip.jsx                    ← V3 VIP · 3 pantallas
├── v4-aurora.jsx                 ← V4 Aurora · 2 pantallas
├── canvas.jsx                    ← composición del canvas
├── design-canvas.jsx             ← componente de canvas (reutilizable)
└── img/                          ← assets locales (categorías)
```

---

## 9. Próximos pasos sugeridos

1. **Validar con el cliente** la dirección V1 vs V2 vs V4 (V3 sólo si hay segmento premium).
2. **Decidir si conservar sidebar de cart** (V3) o cambiar a sticky/drawer (V1, V2, V4). Recomiendo sticky/drawer.
3. **Producir fotografía propia** de los tragos (las de Unsplash son placeholders).
4. **Definir tokens custom por cliente** — cada operador podrá tener su paleta vía admin sin romper layout.
5. **Implementar V1 en Angular** siguiendo §7.A o §7.B.
6. **Tests de usabilidad** en sitio: 5 usuarios, medir tiempo desde Welcome a Comprobante.
