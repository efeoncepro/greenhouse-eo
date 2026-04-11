# Greenhouse → Kortex Visual Preset Contract

> **Tipo de documento:** Spec de arquitectura (contrato inter-repo)
> **Version:** 1.0
> **Creado:** 2026-04-11 por Claude (TASK-372)
> **Ultima actualizacion:** 2026-04-11
> **Task origen:** TASK-372 — Kortex Visual Preset Documentation
> **Task padre:** TASK-264 — Greenhouse Theme Canonicalization (umbrella)
> **Documentacion tecnica:** `GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`, `GREENHOUSE_UI_PLATFORM_V1.md`

---

## 1. Contexto

### 1.1 Relacion entre repositorios

| Repo | Rol | Stack frontend |
|------|-----|----------------|
| `efeoncepro/greenhouse-eo` | Portal operativo de Efeonce Group | Next.js 16 + MUI 7 + Vuexy 5 |
| `efeoncepro/kortex` | Plataforma de agentes, inteligencia CRM y tooling B2B | Next.js + runtime Python |

Regla fundacional: **Kortex es repo hermano, no submodulo ni package interno de Greenhouse.** Cada repo es dueno de su propia UX y navegacion. Este contrato define solo la **identidad visual institucional compartida** — la capa de marca Efeonce que ambos productos heredan.

### 1.2 Que es este documento

Un contrato de tokens, tipografia, forma y accesibilidad que Kortex puede adoptar para mantener coherencia de marca con Greenhouse sin copiar componentes, logica de negocio ni UX del portal.

### 1.3 Fuente de verdad

La fuente de verdad del preset es `efeoncepro/greenhouse-eo`. Cuando Greenhouse cambia un token compartido, este documento se actualiza y Kortex decide si y cuando absorber el cambio.

---

## 2. Lo que hereda Kortex

### 2.1 Primary color

| Propiedad | Valor | Nota |
|-----------|-------|------|
| `primary.main` | `#0375DB` | Core Blue Efeonce |
| `primary.light` | `#3691E3` | Derivado: `lighten(main, 0.2)` |
| `primary.dark` | `#024C8F` | Derivado: `darken(main, 0.1)` |

WCAG AA verificado:
- vs `#FFFFFF`: 4.59:1 (pasa normal text)
- White text on primary button: 4.59:1 (pasa)

### 2.2 Palette completa

#### Semantic colors (light mode)

| Token | main | light | dark | Uso |
|-------|------|-------|------|-----|
| `primary` | `#0375DB` | `#3691E3` | `#024C8F` | Acciones, links, tabs activos |
| `secondary` | `#023C70` | `#035A9E` | `#022A4E` | Metadata, elementos terciarios |
| `info` | `#0375DB` | `#3691E3` | `#024C8F` | Informacional, usuarios |
| `success` | `#6EC207` | — | — | Estado optimo, on-track |
| `warning` | `#FF6500` | — | — | Atencion, limites cercanos |
| `error` | `#BB1954` | — | — | Critico, bloqueado |

#### Backgrounds y texto (light mode)

| Token | Valor | Uso |
|-------|-------|-----|
| `background.default` | `#F8F9FA` | Page background |
| `background.paper` | `#FFFFFF` | Card surfaces |
| `text.primary` | `#1A1A2E` | Body text, labels |
| `text.secondary` | `#667085` | Captions, helper text, metadata |
| `text.disabled` | `#848484` | Disabled elements |

#### Backgrounds y texto (dark mode)

| Token | Valor |
|-------|-------|
| `background.default` | `#101827` |
| `background.paper` | `#162033` |
| `text.primary` | `#F5F7FA` |
| `text.secondary` | `#B0B9C8` |
| `text.disabled` | `#7A8394` |
| `info.main` | `#3691E3` (mas claro que light mode para visibilidad) |

#### Custom colors institucionales

Estos tokens son extensiones del theme que no mapean a categorias MUI estandar:

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `midnight` | `#022A4E` | `#022A4E` | Texto de acento, navy profundo |
| `deepAzure` | `#023C70` | `#023C70` | Secondary source |
| `royalBlue` | `#024C8F` | `#024C8F` | Secondary dark |
| `coreBlue` | `#0375DB` | `#0375DB` | Primary reference explicita |
| `neonLime` | `#6EC207` | `#6EC207` | Success/semaforo verde |
| `sunsetOrange` | `#FF6500` | `#FF6500` | Warning/semaforo amarillo |
| `crimson` | `#BB1954` | `#BB1954` | Error/semaforo rojo |
| `lightAlloy` | `#DBDBDB` | `#DBDBDB` | Bordes, separadores |
| `bodyBg` | `#F8F9FA` | `#101827` | Body background (= background.default) |
| `bodyText` | `#1A1A2E` | `#F5F7FA` | Body text (= text.primary) |
| `secondaryText` | `#667085` | `#B0B9C8` | Secondary text |

### 2.3 Tipografia

#### Font stack

| Rol | Familia | Fuente |
|-----|---------|--------|
| Body (default) | `var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif` | Google Fonts: DM Sans |
| Headings, buttons, overline | `var(--font-poppins), 'Poppins', system-ui, sans-serif` | Google Fonts: Poppins |
| IDs, codigos, montos | `monospace` | Sistema |

#### Escala tipografica

| Variante | Familia | Peso | Tamano | Line Height | Uso |
|----------|---------|------|--------|-------------|-----|
| h1 | Poppins | 800 | 2rem | 1.2 | Titulos de pagina |
| h2 | Poppins | 700 | 1.5rem | 1.25 | Titulos de seccion |
| h3 | Poppins | 600 | 1.25rem | 1.3 | Subsecciones |
| h4 | Poppins | 600 | 1rem | 1.4 | Titulos de card |
| h5 | Poppins | 600 | (hereda) | (hereda) | Headers de accordion |
| h6 | Poppins | 600 | (hereda) | (hereda) | Headers de accordion |
| body1 | DM Sans | 400 | 1rem | 1.5 | Texto principal |
| body2 | DM Sans | 400 | 0.875rem | 1.5 | Texto secundario |
| caption | DM Sans | 400 | 0.8125rem | 1.4 | Helper text, metadata |
| button | Poppins | 600 | (hereda) | (hereda) | Labels de botones (sin textTransform) |
| overline | Poppins | 600 | 0.75rem | (hereda) | Uppercase labels (letterSpacing 1px) |
| monoId | monospace | 600 | 0.875rem | 1.54 | IDs y codigos |
| monoAmount | monospace | 700 | 0.8125rem | 1.54 | Montos monetarios |
| kpiValue | Poppins | 800 | 1.75rem | 1.05 | Numeros grandes en KPI cards |

### 2.4 Shape y border-radius

| Token | Valor |
|-------|-------|
| `borderRadius` (default) | `6px` |
| `customBorderRadius.xs` | `2px` |
| `customBorderRadius.sm` | `4px` |
| `customBorderRadius.md` | `6px` |
| `customBorderRadius.lg` | `8px` |
| `customBorderRadius.xl` | `10px` |

### 2.5 Shadows

#### Custom shadows (lightweight)

| Token | Light | Dark |
|-------|-------|------|
| xs | `0px 1px 6px rgba(47,43,61, 0.10)` | `0px 1px 6px rgba(19,17,32, 0.16)` |
| sm | `0px 2px 8px rgba(47,43,61, 0.12)` | `0px 2px 8px rgba(19,17,32, 0.18)` |
| md | `0px 3px 12px rgba(47,43,61, 0.14)` | `0px 3px 12px rgba(19,17,32, 0.20)` |
| lg | `0px 4px 18px rgba(47,43,61, 0.16)` | `0px 4px 18px rgba(19,17,32, 0.22)` |
| xl | `0px 5px 30px rgba(47,43,61, 0.18)` | `0px 5px 30px rgba(19,17,32, 0.24)` |

#### Color shadows (per semantic color)

Cada color semantico tiene sm/md/lg con opacidad creciente (0.3/0.4/0.5) usando el canal main del color.

### 2.6 Spacing

Factor: `0.25rem` (4px). MUI spacing standard: `theme.spacing(n)` = `n * 0.25rem`.

### 2.7 WCAG AA

| Combinacion | Ratio | Resultado |
|-------------|-------|-----------|
| `#0375DB` vs `#FFFFFF` | 4.59:1 | PASA (normal text) |
| `#FFFFFF` vs `#0375DB` (boton) | 4.59:1 | PASA |
| `#667085` vs `#FFFFFF` | 5.2:1 | PASA (text.secondary) |
| `#1A1A2E` vs `#FFFFFF` | 15.8:1 | PASA (text.primary) |
| `#0375DB` vs `#101827` (dark) | 3.87:1 | PASA (large text) |

---

## 3. Lo que NO hereda Kortex

### 3.1 Tokens de dominio Greenhouse

Estos tokens son exclusivos del portal Greenhouse y NO deben copiarse a Kortex:

| Categoria | Tokens | Razon |
|-----------|--------|-------|
| `GH_COLORS.role` | 30 tokens (account, operations, strategy, design, development, media) | Taxonomia de roles internos de Agency |
| `GH_COLORS.semaphore` | 9 tokens (green/yellow/red) | Semaforo operativo de Agency |
| `GH_COLORS.service` | 15 tokens (Globe, Reach, Wave, CRM, Efeonce Digital) | Business lines de Efeonce Group |
| `GH_COLORS.cscPhase` | 21 tokens (planning through completed) | Workflow de produccion creativa |
| `GH_COLORS.capability` | 15 tokens (Globe, Reach, Wave, CRM, Core) | Modulos de producto en admin |
| `GH_COLORS.chart` | 7 tokens | Paleta de datos especifica de Greenhouse |
| `GH_COLORS.brand` | 5 tokens (midnightNavy, greenhouseGreen, leaf, coreBlue, softBlue) | Momentos de marca Greenhouse (login, hero) |

**Excepcion:** si Kortex necesita un semaforo operativo propio, puede adoptar los mismos hex del semaforo (`#6EC207`, `#FF6500`, `#BB1954`) como referencia, pero registrados en su propio sistema de tokens.

### 3.2 Navegacion y layout

| Elemento | Razon |
|----------|-------|
| Sidebar vertical + menu items | Greenhouse-specific (Agency, HR, Finance, etc.) |
| `themeConfig.ts` layout settings | Cada producto decide su layout |
| Menu sections y route groups | Identity Access V2 es de Greenhouse |
| Brand assets (logos, wordmarks, SVGs) | Greenhouse product identity |

### 3.3 Nomenclatura y microcopy

| Elemento | Razon |
|----------|-------|
| `GH_LABELS`, `GH_MESSAGES`, `GH_INTERNAL_MESSAGES` | Vocabulario del portal Greenhouse |
| `GH_TEAM`, `GH_AGENCY_NAV`, `GH_CLIENT_NAV` | Navegacion y conceptos de producto |
| Terminos de producto (Spaces, Ciclos, Pulse, Torre de Control) | Jerga Greenhouse |

### 3.4 Componentes UI propietarios

| Elemento | Razon |
|----------|-------|
| `src/components/greenhouse/*` | Componentes construidos para el portal |
| `src/components/agency/*` | Dashboards y charts de Agency |
| `src/@core/theme/overrides/*` | 39 archivos de MUI overrides, Vuexy-specific |

---

## 4. Ejemplo de consumo

### 4.1 Como Kortex crea su theme

Kortex puede crear un archivo `mergedTheme.ts` (o equivalente) que aplique los tokens institucionales sobre su propio shell Vuexy/MUI:

```typescript
// kortex/src/components/theme/mergedTheme.ts

const EFEONCE_INSTITUTIONAL = {
  primary: { main: '#0375DB', light: '#3691E3', dark: '#024C8F' },
  secondary: { main: '#023C70', light: '#035A9E', dark: '#022A4E' },
  success: { main: '#6EC207' },
  warning: { main: '#FF6500' },
  error: { main: '#BB1954' },
  info: { main: '#0375DB', light: '#3691E3', dark: '#024C8F' }
}

const EFEONCE_CUSTOM_COLORS = {
  midnight: '#022A4E',
  deepAzure: '#023C70',
  royalBlue: '#024C8F',
  coreBlue: '#0375DB',
  neonLime: '#6EC207',
  sunsetOrange: '#FF6500',
  crimson: '#BB1954',
  lightAlloy: '#DBDBDB'
}

const EFEONCE_TYPOGRAPHY = {
  fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
  h1: { fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif", fontWeight: 800, fontSize: '2rem' },
  h2: { fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif", fontWeight: 700, fontSize: '1.5rem' },
  // ... same scale as Greenhouse
  button: { fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif", fontWeight: 600, textTransform: 'none' }
}

// Apply to Kortex theme via deepmerge with core theme
```

### 4.2 Que archivos copiar vs cuales son Greenhouse-only

| Archivo Greenhouse | Copiar a Kortex? | Nota |
|--------------------|-------------------|------|
| `src/configs/primaryColorConfig.ts` | **SI** — copiar y adaptar | Cambiar `name` a `'kortex-efeonce'` |
| `src/components/theme/mergedTheme.ts` | **ADAPTAR** — usar como referencia | Copiar palette + typography, omitir Greenhouse-specific customColors |
| `src/configs/themeConfig.ts` | **NO** — crear propio | Kortex decide su layout, modo y skin |
| `src/@core/theme/*` | **NO** — viene de Vuexy | Si Kortex usa Vuexy, ya lo tiene |
| `src/config/greenhouse-nomenclature.ts` | **NO** — es de Greenhouse | Kortex crea su propia nomenclatura |
| `src/styles/greenhouse-sidebar.css` | **NO** — Greenhouse sidebar | Kortex crea su propio sidebar CSS |

### 4.3 Fonts

Kortex debe instalar las mismas Google Fonts:

```typescript
// kortex/src/app/layout.tsx (o equivalente)
import { DM_Sans, Poppins } from 'next/font/google'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins'
})
```

---

## 5. Governance

### 5.1 Quien actualiza el contrato

Cuando Greenhouse modifica un token que aparece en la seccion 2 de este documento:
1. El agente que ejecute el cambio actualiza este documento con los nuevos valores.
2. Se registra un delta con fecha en la seccion 6 de este documento.
3. Kortex decide si absorbe el cambio en su propio timeline.

### 5.2 Como Kortex detecta drift

Opciones (de menor a mayor automatizacion):

1. **Manual (actual):** Al iniciar trabajo en Kortex, revisar la version de este documento y comparar con los tokens locales.
2. **Script de diff:** Un script que compare los hex de este documento con los del theme de Kortex y reporte discrepancias.
3. **Package compartido (futuro):** Si la divergencia se vuelve costosa, extraer los tokens institucionales a un package npm interno (`@efeonce/theme-tokens`). Evaluable cuando ambos repos esten estabilizados.

### 5.3 Cuando conviene un package

Crear `@efeonce/theme-tokens` cuando se cumplan TODAS estas condiciones:
- Ambos repos usan MUI 7+ con el mismo pattern de theme
- Los tokens compartidos se han mantenido estables por al menos 2 meses
- Existe un tercer consumer (mas alla de Greenhouse y Kortex) que necesite los mismos tokens
- El costo de mantener el package (versioning, CI, publicacion) es menor que el costo de drift manual

Hasta entonces, la documentacion manual de este contrato es suficiente.

---

## 6. Changelog

| Fecha | Version | Cambio |
|-------|---------|--------|
| 2026-04-11 | 1.0 | Documento inicial. Tokens post-TASK-370/371. |
