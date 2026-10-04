# Componentes y patrones de marca en el Lab de AXIS

> Verificado contra: axis-design-system@aee99d2 — 2026-10-04. Componentes/navegación en `9eb3da9`, búsqueda en `d9c7e6e`, agentes en `060174c`; tipografía editorial en `aee99d2` (push, despliegue Vercel y CI `37216960966` verificados).

El operador pidió renovar los componentes y patrones de AXIS con `efeonce-graphic-line`.
La aplicación vive en el catálogo raíz y en `/patterns/*/`, como presentación de marca
opt-in del Lab. No autoriza llevar La órbita a la interfaz de Greenhouse ni modificar
la adopción o lifecycle de contratos compartidos.

## Qué se implementó

- `apps/lab/src/lib/brand-theme.ts`: adapter local de valores de `efeonceGraphicLine`,
  `axisGeometry` y `axisMotion`; sin HEX copiados ni cambios al token UI compartido.
- Bricolage para títulos, Poppins para lectura; navy/papel, acento teal con texto navy.
  Acento gráfico oscuro sobre papel; ningún texto pequeño en teal.
- `BrandPrimitives.astro`: acciones sobre papel y navy, filtros seleccionables,
  estados con `stateMarkerSvg` y progreso por etapas con posición real de la demo.
- Estado = anillo libre / esfera ocupada con etiqueta. No se usa semáforo ni se
  convierte el loader en una medida orbital. No se añaden órbitas decorativas a tarjetas.
- Los contratos con una referencia de marca completa presentan su muestra y enlace
  oficial; dejan de caer en el ejemplo genérico de estado. El movimiento de marca
  remite al recurso aprobado y usa el logo oficial, sin rearmar el wordmark.
- Las fichas muestran nombre legible y conservan ID, versión, responsable, consumidores
  y criterios. Los criterios ya no llevan checks de aprobación implícita.

## Verificación al continuar

Ejecutar build/test/typecheck/lint/design:check de AXIS. Verificar E2E del catálogo,
controles Efeonce y las rutas compiladas en desktop/móvil. QA visual en `design-qa.md` y
`docs/evidence/lab-brand-components-2026-10-04/`. El Lab no certifica
los adapters de otros productos ni constituye un release de paquetes.

Los componentes con datos mantienen etiquetas y resúmenes accesibles. No derivar
escalas de gravedad de esta paleta: gravedad requiere un contrato independiente.

## Títulos editoriales escalables

Canon AXIS: `docs/architecture/LAB_BRAND_COMPONENTS_DECISION_V1.md`, delta 2026-10-04.
Los títulos de páginas, secciones y subtítulos editoriales usan `LabHeading.astro`, con `as`
para la semántica y `data-lab-heading` para verificación. La familia deriva de
`efeonceGraphicLine.type.answer.family` por `--lab-font-display`: Bricolage Grotesque.
El componente posee solo la familia; cada página conserva tamaño, peso, ejes y espaciado.
`Layout.astro` carga `editorial-typography.css` una vez. Encabezados directos de `.docs-page .prose`
reciben el mismo rol. No duplicar `@font-face` de Bricolage ni volver a declarar Poppins en títulos
editoriales. No aplicar una regla global `h1,h2` a specimens: ejemplos de producto, métricas,
logos y muestras tipográficas conservan sus propios contratos y fuentes.

Al añadir rutas o encabezados, usar el componente y ejecutar pruebas de fuente y navegador:

```sh
pnpm --filter @efeonce/axis-design-system-lab test
pnpm --filter @efeonce/axis-design-system-lab build
pnpm --filter @efeonce/axis-design-system-lab test:e2e editorial-typography.spec.ts
```

El gate descubre rutas del build; verifica familia calculada y fuente efectiva de los glifos
mediante CDP, no solo el CSS declarado. Corte comprobado: 65 rutas, 132 casos en escritorio/móvil;
el test de preservación incluye Poppins en métricas y Poppins/Geist en specimens. El número de rutas
es evidencia del corte, nunca una lista fija que impida cubrir páginas nuevas.

## Encontrar y usar recursos

`/agents/` presenta cómo pasar del Lab a los packages y las 41 capacidades del registry.
`/agents/capabilities.json` es el manifest ejecutable de descubrimiento. La búsqueda global
indexa referencias, componentes, íconos, logos, recetas y capacidades; usar ID exacto y filtros.
Para recursos de marca, `/references/logos/` y `/references/iconography/` son entradas centrales.
El contrato y el adapter indicado siguen siendo la autoridad de ejecución; ninguna ficha permite
inferir adopción de Greenhouse ni un release npm. La búsqueda se construye desde fuentes versionadas,
no necesita una base de datos de catálogo.

Evidencia final de push/CI/deploy: `docs/audits/2026-10-04-axis-documentation-closure.md` en Greenhouse. Readback público HTTP 200 en Insights, Iconography y Agents confirma `LabHeading`, `--lab-font-display` y Bricolage.
