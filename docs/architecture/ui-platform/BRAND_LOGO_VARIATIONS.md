# Brand Logo Variations

> **Status:** vigente desde 2026-06-19
> **Runtime owner:** `src/components/greenhouse/primitives/GreenhouseBrandLogoMark.tsx`
> **Controller:** `src/components/greenhouse/primitives/greenhouse-brand-logo-controller.ts`
> **Lab:** `/design-system/brand-logos`
> **Scenario GVC:** `design-system-brand-logos`

`GreenhouseBrandLogoMark` es la primitive UI Platform para portar logos de marca externos desde AXIS Figma sin crear SVGs sueltos por vista. El contrato sigue la metodología **Primitive + Variants + Kinds**:

- `variant='isotype'`: marca simple sin contenedor.
- `variant='contained'`: badge circular o contenido compacto con fondo de la marca.
- `variant='lockup'`: lockup completo con wordmark.
- `kind`: alias semántico estable que mapea cada variante Figma a una variante funcional runtime.

La primitive gobierna tamaño, a11y, `data-capture`, `kind -> variant`, placement y asset selection. No reinterpreta colores de marca como tokens semánticos Greenhouse; los colores de logos externos viven dentro del asset o en `GREENHOUSE_BRAND_LOGO_ASSET_COLORS` como constantes de marca de terceros.

## Figma Source

| Familia | Nodo AXIS | Kinds runtime |
|---|---:|---|
| Gemini | `12267:95` | `geminiIsotype`, `geminiOnBlue`, `geminiOnNeutral`, `geminiLogotype` |
| Adobe | `12273:32` | `adobeIsotype`, `adobeOnRed`, `adobeOnNeutral`, `adobeOnPink`, `adobeLogotype` |
| Adobe Firefly | `12267:441` | `fireflyIsotype`, `fireflyOnRed`, `fireflyOnNeutral`, `fireflyOnPink`, `fireflyLogotype` |
| Adobe Photoshop | `12270:452` | `photoshopIsotype`, `photoshopOnDarkBlue`, `photoshopOnNeutral`, `photoshopOnLightBlue`, `photoshopLogotype` |
| Adobe Illustrator | `12270:481` | `illustratorIsotype`, `illustratorOnBrown`, `illustratorOnNeutral`, `illustratorOnYellow`, `illustratorLogotype` |
| Adobe After Effects | `12271:506` | `afterEffectsIsotype`, `afterEffectsOnDarkPurple`, `afterEffectsOnNeutral`, `afterEffectsOnLightPurple`, `afterEffectsLogotype` |

Figma no expuso variables en estos nodos y Code Connect quedó bloqueado por seat/plan. La implementación toma Figma como intención visual y conserva el contrato runtime en la primitive.

## Asset Policy

Los assets viven bajo `public/images/logos/axis/` y se sirven con cache-buster desde `AXIS_BRAND_LOGO_ASSET_VERSION`.

- Preferir SVG local normalizado cuando Figma entregue un subnodo completo.
- Usar PNG solo cuando el MCP no entregue un SVG único para el lockup completo.
- Cada SVG importado debe conservar `preserveAspectRatio="xMidYMid meet"` y evitar overflow no intencional.
- No reconstruir badges con CSS encima de assets incompletos: si una variante de Figma contiene fondo + marca, el asset local debe contener ambas piezas.
- No renderizar wordmarks con tipografía local del portal. Si Figma entrega un lockup vectorial, el lockup runtime debe ser asset. Caso fuente: `geminiLogotype`.

Correcciones conocidas del primer port:

- `adobeOnRed` debe ser el badge rojo completo con A blanca; no solo el círculo rojo.
- `geminiLogotype` debe usar `gemini-logotype.svg`; no texto MUI ni `theme.typography`.
- Los lockups Adobe Firefly, Photoshop, Illustrator y After Effects permanecen PNG porque el MCP los entregó como subnodos compuestos sin SVG raíz único.

## Lab Contract

`/design-system/brand-logos` es una página interna de Design System sobre `CompositionShell` con canvas ancho solo en esta ruta. El lab tiene:

- Hero con muestra cruzada de marcas.
- Catálogo de familias en grilla de dos columnas en desktop ancho.
- Cards reutilizables por kind con asset, nombre, kind runtime, propiedad Figma y descripción.
- Size contract `small | medium | large` para verificar densidad.
- Bloque de contrato Figma con nodos fuente, variables y Code Connect.

Cada familia tiene marker GVC estable `data-capture="brand-logo-<family>-kind-matrix"`.

## Verification

Para cambios en esta primitive o nuevas familias:

1. `pnpm exec vitest run src/components/greenhouse/primitives/__tests__/GreenhouseBrandLogoMark.test.tsx`
2. ESLint focal de primitive, controller, lab y scenario.
3. `pnpm exec tsc --noEmit --pretty false`
4. `pnpm design:lint`
5. `pnpm fe:capture design-system-brand-logos --env=local --hold=1200`
6. Medir `document.documentElement.scrollWidth === clientWidth` en desktop ancho y mobile real.

La revisión visual debe mirar al menos los frames de la familia tocada y el bloque `Size contract`.
