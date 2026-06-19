# Brand Logo Variations

> **Status:** vigente desde 2026-06-19
> **Runtime owner:** `src/components/greenhouse/primitives/GreenhouseBrandLogoMark.tsx`
> **Controller:** `src/components/greenhouse/primitives/greenhouse-brand-logo-controller.ts`
> **Lab:** `/design-system/brand-logos`
> **Scenario GVC:** `design-system-brand-logos`
> **Import runbook:** [BRAND_LOGO_IMPORT_RUNBOOK.md](./BRAND_LOGO_IMPORT_RUNBOOK.md)

`GreenhouseBrandLogoMark` es la primitive UI Platform para portar logos de marca externos desde AXIS Figma sin crear SVGs sueltos por vista. El contrato sigue la metodología **Primitive + Variants + Kinds**:

- `variant='isotype'`: marca simple sin contenedor.
- `variant='contained'`: badge circular o contenido compacto con fondo de la marca.
- `variant='lockup'`: lockup completo con wordmark.
- `kind`: alias semántico estable que mapea cada variante Figma a una variante funcional runtime.

La primitive gobierna tamaño, a11y, `data-capture`, `kind -> variant`, placement y asset selection. No reinterpreta colores de marca como tokens semánticos Greenhouse; los colores de logos externos viven dentro del asset o en `GREENHOUSE_BRAND_LOGO_ASSET_COLORS` como constantes de marca de terceros. Cada `kind` debe estar respaldado por un asset real; la primitive no dibuja isotipos ni wordmarks con SVG inline, MUI Typography ni texto local.

Antes de importar una familia nueva o corregir un asset existente, cargar el [runbook de importación](./BRAND_LOGO_IMPORT_RUNBOOK.md). Ahí viven los errores ya encontrados con Gemini, Adobe Express, Adobe, Firefly, Photoshop, Illustrator, After Effects, Premiere y Envato, además del checklist de verificación para futuras sesiones de Codex/Claude.

## Figma Source

| Familia             |   Nodo AXIS | Kinds runtime                                                                                                                   |
| ------------------- | ----------: | ------------------------------------------------------------------------------------------------------------------------------- |
| Gemini              |  `12267:95` | `geminiIsotype`, `geminiOnBlue`, `geminiOnNeutral`, `geminiLogotype`                                                            |
| Adobe               |  `12273:32` | `adobeIsotype`, `adobeOnRed`, `adobeOnNeutral`, `adobeOnPink`, `adobeLogotype`                                                  |
| Adobe Express       |  `12274:44` | `expressIsotype`, `expressOnBlack`, `expressFullColorOnBlack`, `expressOnNeutral`, `expressLogotype`                            |
| Adobe Firefly       | `12267:441` | `fireflyIsotype`, `fireflyOnRed`, `fireflyOnNeutral`, `fireflyOnPink`, `fireflyLogotype`                                        |
| Adobe Photoshop     | `12270:452` | `photoshopIsotype`, `photoshopOnDarkBlue`, `photoshopOnNeutral`, `photoshopOnLightBlue`, `photoshopLogotype`                    |
| Adobe Premiere Pro  |   `12273:5` | `premiereIsotype`, `premiereOnLightPurple`, `premiereOnDarkPurple`, `premiereOnNeutral`, `premiereLogotype`                     |
| Adobe Illustrator   | `12270:481` | `illustratorIsotype`, `illustratorOnBrown`, `illustratorOnNeutral`, `illustratorOnYellow`, `illustratorLogotype`                |
| Adobe After Effects | `12271:506` | `afterEffectsIsotype`, `afterEffectsOnDarkPurple`, `afterEffectsOnNeutral`, `afterEffectsOnLightPurple`, `afterEffectsLogotype` |
| Envato              |  `12274:35` | `envatoIsotype`, `envatoOnGreen`, `envatoOnNeutral`, `envatoOnLightGreen`, `envatoLogotype`                                     |
| Shutterstock        |  `12274:62` | `shutterstockIsotype`, `shutterstockOnNeutral`, `shutterstockOnRed`, `shutterstockOnPink`, `shutterstockLogotype`               |

Figma no expuso variables en estos nodos y Code Connect quedó bloqueado por seat/plan. La implementación toma Figma como intención visual y conserva el contrato runtime en la primitive.

## Asset Policy

Los assets viven bajo `public/images/logos/axis/` y se sirven con cache-buster desde `AXIS_BRAND_LOGO_ASSET_VERSION`.

- Preferir SVG local normalizado cuando Figma entregue un subnodo completo.
- Usar PNG solo cuando el MCP no entregue un SVG único para el lockup completo.
- Todo `kind` debe declarar `assetSrc`; no existe fallback local de texto, tipografía MUI ni SVG inline.
- Cada SVG importado debe conservar `preserveAspectRatio="xMidYMid meet"` y evitar overflow no intencional.
- No reconstruir badges con CSS encima de assets incompletos: si una variante de Figma contiene fondo + marca, el asset local debe contener ambas piezas.
- No renderizar wordmarks con tipografía local del portal. Si Figma entrega un lockup vectorial, el lockup runtime debe ser asset. Caso fuente: `geminiLogotype`.

Correcciones conocidas del primer port:

- `adobeOnRed` debe ser el badge rojo completo con A blanca; no solo el círculo rojo.
- `geminiIsotype` debe ser el isotipo cromático independiente de Figma; el lockup completo vive separado en `geminiLogotype`.
- `geminiLogotype` debe usar `gemini-logotype.svg`; no texto MUI ni `theme.typography`.
- El wordmark dentro de `geminiLogotype` debe mantenerse en negro real y con viewBox suficientemente holgado para no cortar la última `i`.
- `expressIsotype`, `expressOnNeutral` y `expressLogotype` usan textura cromática exportada desde Figma recortada por máscara vectorial. No reemplazar por un `linearGradient` manual: cambia los colores de marca.
- `expressFullColorOnBlack` es el isotipo cromático completo dentro del círculo negro de marca. No reemplazarlo por `expressOnBlack`: ese kind mantiene el A blanco sobre negro.
- `expressLogotype` debe permanecer como SVG de lockup completo. El wordmark `Adobe Express` viene del asset vectorial, no de texto local del portal.
- `premiereLogotype` usa SVG local compuesto desde los sub-vectores Figma del lockup; no debe reconstruirse con texto local. El asset corrige el cierre de marca a `Adobe Premiere` con glifo vectorial reutilizado del mismo SVG.
- `envatoLogotype` usa SVG local compuesto desde sub-vectores Figma del lockup. El wordmark `envato` viene del asset vectorial, no de texto local ni tipografía del portal.
- `shutterstockLogotype` usa SVG local exportado desde Figma. El wordmark `shutterstock` viene del asset vectorial, no de texto local ni tipografía del portal.
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
