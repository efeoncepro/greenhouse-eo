# CODEX TASK — Corrección de Jerarquía Tipográfica del Portal Greenhouse

## Resumen

El portal Greenhouse tiene un problema de jerarquía tipográfica: Poppins se está usando en pesos altos (600-700) en prácticamente todos los elementos de la interfaz — títulos, KPI numbers, labels de cards, nombres de clientes en tablas, subtítulos, badges. El resultado es un dashboard donde todo "grita" al mismo nivel y el ojo no puede escanear rápido.

**El Brand Guideline v1.0 (sección 6) define dos familias con roles distintos:**

- **Poppins** → Títulos, encabezados, CTAs, navegación. Pesos 600-900.
- **DM Sans** → Cuerpo de texto, párrafos, descripciones, captions, labels de interfaz. Peso 400-600.

El portal actual está usando Poppins para casi todo. Esta tarea corrige la aplicación tipográfica para que respete la jerarquía definida en el Brand Guideline, mejorando la legibilidad y elegancia del dashboard.

**Esta tarea NO cambia la lógica ni los datos.** Solo toca font-family, font-weight y font-size en componentes de UI.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `fix/typography-hierarchy`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **UI Library:** MUI (Material UI) v5
- **Documento normativo:** Brand Guideline v1.0, sección 6 (Tipografía)
- **Fuentes disponibles:** Poppins (Google Fonts, estáticos), DM Sans (Google Fonts, variable)

---

## Diagnóstico: qué está mal

Mirando el dashboard actual (vista Control Tower / Admin), estos son los problemas específicos:

### Problema 1: Poppins en peso alto para todo

| Elemento | Estado actual (estimado) | Problema |
|---|---|---|
| Título de página ("Control Tower") | Poppins ~700 | OK — es un H2/H3, peso correcto |
| Subtítulo descriptivo ("0 clientes activos, 29 usuarios...") | Poppins ~500-600 | Debería ser DM Sans 400 |
| Títulos de KPI cards ("Clientes", "Usuarios activos", "Pendientes...") | Poppins ~600-700 | Debería ser Poppins 500-600 máximo, o DM Sans 600 |
| Números KPI ("11", "1", "29") | Poppins ~700 | OK como número hero, pero si todo lo demás también es 700, no destaca |
| Texto descriptivo en KPI cards ("0 activos hoy", "11 nuevos este mes") | Poppins ~400-500 | Debería ser DM Sans 400 |
| Subtítulos de KPI cards ("Semáforo de activación efectiva del portal") | Poppins ~400 | Debería ser DM Sans 400, font-size caption (13-14px) |
| Badges de semáforo ("Activación baja", "Onboarding en riesgo") | Poppins ~600 | Debería ser DM Sans 500-600 o Poppins 500 |
| Headers de tabla ("CLIENTE", "ESTADO", "USUARIOS") | Poppins ~600 uppercase | OK como overline, pero el peso puede bajar a 500 |
| Nombres de empresa en tabla ("Sky Airline", "ANAM", "DDSoft") | Poppins ~600 | Debería ser DM Sans 500 |
| Emails en tabla ("dianesty.santander@skyairline.com") | Poppins ~400 | Debería ser DM Sans 400 |
| Labels de acción ("Contactar al cliente", "Revisar OTD%") | Poppins ~500 | Debería ser DM Sans 400-500 |
| Contadores ("0 activos / 16 total", "16 pendientes de activación") | Poppins ~400-500 | Debería ser DM Sans 400 |
| Sidebar labels ("Control Tower", "Admin Spaces") | Poppins ~600 | OK para navegación, pero puede bajar a 500 |
| Sidebar subtítulos ("Operación interna de spaces") | Poppins ~400 | Debería ser DM Sans 400 |
| Footer ("© 2026 Efeonce Group...") | Poppins ~400 | Debería ser DM Sans 400 |

### Problema 2: Falta contraste de peso entre niveles

En las KPI cards, el título ("Clientes"), el número ("11"), el descriptor ("+11") y la nota ("0 activos hoy") se sienten todos al mismo peso visual. Debería haber 3 niveles claros:
1. Número hero: peso máximo (destaca)
2. Título de card: peso medio (identifica)
3. Descriptores y notas: peso bajo (acompaña)

### Problema 3: DM Sans no está siendo utilizada

El Brand Guideline define DM Sans como la tipografía de cuerpo, pero el portal parece usar Poppins para todo. DM Sans debería cubrir todo lo que no es título, encabezado o navegación.

---

## Jerarquía tipográfica objetivo para el portal

Derivada del Brand Guideline v1.0, sección 6.3, adaptada al contexto de dashboard UI:

| Nivel | Familia / Peso | Tamaño | Uso en el portal |
|---|---|---|---|
| **Título de página** | Poppins Bold (700) | 24-28px | "Control Tower", "Pulse", "Proyectos" |
| **Título de sección** | Poppins SemiBold (600) | 18-20px | "Clientes" (header de tabla), títulos de módulos |
| **Título de KPI card** | Poppins Medium (500) | 14-15px | "Clientes", "Usuarios activos", "Pendientes de activación" |
| **Número hero (KPI)** | Poppins Bold (700) | 28-32px | "11", "1", "29", "62%" |
| **Trend indicator** | DM Sans SemiBold (600) | 13-14px | "(+11)", "(-3%)", "(-94%)" |
| **Overline / Column header** | Poppins Medium (500) | 12-13px, uppercase, tracking +1px | "CLIENTE", "ESTADO", "USUARIOS", "PROYECTOS" |
| **Sidebar nav label** | Poppins Medium (500) | 14-15px | "Control Tower", "Admin Spaces" |
| **Sidebar nav subtitle** | DM Sans Regular (400) | 12-13px | "Operación interna de spaces" |
| **Body / Descriptor** | DM Sans Regular (400) | 14-15px | "0 clientes activos, 29 usuarios pendientes...", notas descriptivas |
| **Body emphasis** | DM Sans SemiBold (600) | 14-15px | Nombres de empresa en tabla ("Sky Airline"), datos clave inline |
| **Table cell text** | DM Sans Regular (400) | 14px | Emails, contadores, labels de estado |
| **Caption / Helper** | DM Sans Regular (400) | 12-13px | Notas bajo KPIs, texto explicativo de semáforos, footer |
| **Badge / Tag** | DM Sans Medium (500) | 12-13px | "Activación baja", "Onboarding", badges de capabilities |
| **Action link** | DM Sans Medium (500) | 13-14px | "Contactar al cliente", "Revisar OTD%" |
| **Button** | Poppins SemiBold (600) | 14-15px | "+ Crear space", "Exportar" |
| **Footer** | DM Sans Regular (400) | 13px | "© 2026 Efeonce Group..." |

---

## Implementación

### Paso 1: Verificar que DM Sans está cargada

Buscar en el proyecto cómo se cargan las fuentes. Posibles ubicaciones:

```
src/app/layout.tsx
src/@core/theme/typography.ts
src/styles/globals.css
next.config.js (next/font)
public/index.html
```

Si DM Sans no está importada, agregarla. Método preferido con `next/font/google`:

```typescript
// src/app/layout.tsx o donde se configure la fuente global
import { Poppins, DM_Sans } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})
```

Si el proyecto ya usa un método diferente de carga de fuentes (Google Fonts via `<link>`, CSS import, etc.), mantener ese patrón y agregar DM Sans de la misma forma.

### Paso 2: Configurar el theme de MUI

Buscar la configuración del theme de MUI (posiblemente en `src/@core/theme/` o `src/configs/themeConfig.ts`) y ajustar la tipografía:

```typescript
// En el theme de MUI
typography: {
  fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',  // Default = DM Sans
  h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: '2rem' },
  h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: '1.5rem' },
  h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: '1.25rem' },
  h4: { fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: '1.125rem' },
  h5: { fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: '1rem' },
  h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: '0.875rem' },
  subtitle1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: '1rem' },
  subtitle2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: '0.875rem' },
  body1: { fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: '0.9375rem' },
  body2: { fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: '0.875rem' },
  caption: { fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: '0.8125rem' },
  overline: { fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: '0.8125rem', letterSpacing: '1px', textTransform: 'uppercase' },
  button: { fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: '0.9375rem' },
}
```

**Importante:** El theme de Vuexy probablemente ya tiene una configuración de typography. No reemplazar todo — hacer merge con los cambios necesarios. El cambio clave es:

1. **fontFamily default del theme** → cambiar de Poppins a DM Sans
2. **h1-h6** → mantener en Poppins pero ajustar pesos según la tabla de arriba
3. **body, subtitle, caption** → asegurar que usan DM Sans

### Paso 3: Ajustar componentes específicos

Después de cambiar el theme, revisar componentes que puedan tener font-family o font-weight hardcodeado en `sx` props o styled-components. Buscar con grep:

```bash
grep -r "fontWeight" src/ --include="*.tsx" --include="*.ts" -l
grep -r "Poppins" src/ --include="*.tsx" --include="*.ts" --include="*.css" -l
grep -r "font-weight" src/ --include="*.css" --include="*.scss" -l
```

Corregir caso por caso según la tabla de jerarquía.

#### Componentes prioritarios a revisar:

**KPI Cards (dashboard):**
- Título de card: cambiar a Poppins Medium (500), 14-15px
- Número hero: mantener Poppins Bold (700), 28-32px — este es el elemento que debe dominar la card
- Trend indicator: DM Sans SemiBold (600), 13-14px
- Texto descriptivo: DM Sans Regular (400), 13-14px
- Nota / helper: DM Sans Regular (400), 12-13px, color `#848484`

**Tabla de clientes:**
- Header columns: Poppins Medium (500), 12-13px, uppercase, tracking +1px
- Nombre de empresa: DM Sans SemiBold (600), 14-15px — SemiBold, no Bold
- Email: DM Sans Regular (400), 13-14px, color `#848484`
- Action links: DM Sans Medium (500), 13px, color Core Blue (`#0375db`)
- Contadores / datos: DM Sans Regular (400), 14px
- Badges: DM Sans Medium (500), 12-13px

**Sidebar:**
- Sección header ("OPERACION", "ADMIN"): Poppins Medium (500), 11-12px, uppercase, tracking +1.5px
- Nav label: Poppins Medium (500), 14px
- Nav subtitle: DM Sans Regular (400), 12px, color `#848484`

**Badges de semáforo:**
- Texto del badge: DM Sans Medium (500), 12-13px
- No usar Poppins SemiBold para badges — es demasiado pesado para un elemento tan pequeño

**Footer:**
- Todo en DM Sans Regular (400), 13px

### Paso 4: Verificar fallbacks

Confirmar que el CSS fallback está configurado como define el Brand Guideline:

```css
/* Poppins fallback */
font-family: 'Poppins', system-ui, -apple-system, sans-serif;

/* DM Sans fallback */
font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
```

---

## Regla general para decisiones edge-case

Si durante la implementación hay un elemento que no está en la tabla de arriba, aplicar esta regla:

> **¿El elemento es un título, encabezado, nombre de sección, botón o label de navegación?** → Poppins, peso 500-600
>
> **¿El elemento es cualquier otra cosa (texto descriptivo, datos, emails, notas, helpers, contadores)?** → DM Sans, peso 400-500
>
> **¿El elemento es un número hero o stat destacado?** → Poppins Bold (700)

---

## Criterios de aceptación

**Jerarquía tipográfica:**
- [ ] El título de página ("Control Tower" / "Pulse") es claramente el elemento más pesado después de los números hero
- [ ] Los números hero de KPI cards (11, 1, 29, 62%) dominan visualmente cada card
- [ ] Los títulos de KPI cards ("Clientes", "Usuarios activos") son visiblemente más livianos que los números
- [ ] El texto descriptivo en cards es claramente subordinado al título y al número
- [ ] Los nombres de empresa en la tabla no compiten con el título de página
- [ ] Al escanear la tabla, el ojo distingue rápidamente nombre de empresa vs. email vs. datos

**Familias tipográficas:**
- [ ] DM Sans cargada y funcionando como tipografía de body en todo el portal
- [ ] Poppins reservada para: títulos de página, títulos de sección, números hero, sidebar nav, overlines, botones
- [ ] DM Sans usada para: body text, descriptores, emails, contadores, table cells, captions, footer, badges, action links
- [ ] No hay ningún párrafo o bloque de texto en Poppins

**Pesos:**
- [ ] El peso máximo visible en la interfaz es Poppins 700 (solo para título de página y números hero)
- [ ] No hay elementos en Poppins 800 o 900 en la UI del dashboard (esos pesos son para Hero/H1 en landing, no en dashboard)
- [ ] Body text en DM Sans no supera peso 400 excepto para énfasis puntual (500-600)

**Técnico:**
- [ ] Theme de MUI actualizado con fontFamily default = DM Sans
- [ ] h1-h6 del theme configurados con Poppins y pesos correctos
- [ ] No quedan font-family o font-weight hardcodeados que contradigan el theme
- [ ] Fallback fonts configurados: system-ui, -apple-system, sans-serif

---

## Lo que NO incluye esta tarea

- Cambios en la paleta de color (eso es otra tarea)
- Cambios en layout, spacing o estructura de componentes
- Cambios en la lógica de datos o API routes
- Implementación de Grift o Lumios (son para piezas editoriales, no para dashboard UI)
- Cambios en el login (cubierto por `docs/tasks/complete/CODEX_TASK_Login_Page_Greenhouse.md`)

---

## Notas técnicas

- **Vuexy override pattern:** Vuexy organiza overrides de theme en `src/@core/theme/`. El archivo de typography probablemente está ahí. Modificar el override, no crear uno nuevo que compita.
- **DM Sans es variable font.** Si se importa como variable font, se puede usar cualquier peso (100-900) sin cargar archivos separados. Si se importa como estática, cargar pesos 400, 500 y 600.
- **Poppins es estática.** Cargar solo los pesos necesarios: 400, 500, 600, 700. No cargar 800 ni 900 — no se usan en el dashboard.
- **`next/font` es el método preferido** para cargar fuentes en Next.js 14+ porque optimiza automáticamente (self-hosting, preload, font-display swap).
- **Probar en Chrome DevTools** después de los cambios: inspeccionar elementos y verificar que Computed Style muestra la familia y peso correctos. Buscar cualquier elemento donde "Poppins" aparezca en computed font-family pero debería ser "DM Sans".

---

## Dependencies & Impact

- **Depende de:**
  - Brand Guideline v1.0, sección 6 (Tipografía)
  - MUI theme config en `src/@core/theme/`
  - Poppins + DM Sans Google Fonts disponibles
- **Impacta a:**
  - Ninguna otra task directamente — cambio puramente visual/tipográfico
- **Archivos owned:**
  - `src/@core/theme/typography.ts` (o equivalente de config tipográfica MUI)
  - Font imports en `src/app/layout.tsx` o global styles
  - Component-level `sx` overrides que hardcodeen fontWeight/fontFamily
