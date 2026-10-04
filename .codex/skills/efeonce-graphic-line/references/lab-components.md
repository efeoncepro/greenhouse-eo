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

## Botones: loader orbital y flecha con movimiento (2026-10-04)

Corrección explícita del operador en el Lab: el loader de `efeonce.button` usa La órbita;
el CTA puede desplazar su flecha en hover/foco. `axis-ui-primitives` se publicó por primera vez
en 0.1.0 (tag v0.3.43); no implica adopción en Greenhouse. El indicador compacto hereda la tinta del botón:
anillo fijo + estela corta constante + una esfera que recorre; no expresa porcentaje.
`axisButton.loader` posee geometría óptica/timing y HTML/React comparten el mismo modelo.
`arrowMotion="nudge"` es opt-in y exige una flecha final de avance o externa; sólo mueve el
ícono, no el texto o el ancho. Respeta RTL, inactividad y reduced motion; con movimiento reducido
la órbita queda quieta pero conserva su anatomía y `aria-busy`. El Lab ofrece ejemplo estático,
ejemplo animado y configurador; el consumidor conecta la acción real.

## Línea de negocio y controles compuestos (2026-10-04)

`line: default | growth | brand | engine | voice | revenue-hubspot | revenue-salesforce`
es independiente de `tone`. La galería muestra las seis líneas en papel/navy, y el configurador
combina contexto, función, apariencia y tamaño. Los colores salen de `efeonceGraphicLine.lines`
y la tinta/hover se verifica a 4.5:1. Neutral y peligro no se recolorean por línea.

El package `/react` suma ButtonGroup, ToggleButton, MenuButton y SplitButton. El Lab los hidrata
y prueba de verdad: estado seleccionado, formulario nativo, carga/foco, menú por teclado y
acción principal/alternativas. Catálogo de 26 íconos funcionales Tabler; no son Trazo/Plastilina.
El release inicial y su instalación privada se verificaron; la adopción del producto es independiente. Guía: AXIS `/docs/buttons/`.

> Verificado contra: axis-design-system@1bccb3f — 2026-10-04.

Evidencia de distribución de botones: [auditoría](../../../../docs/audits/2026-10-04-axis-buttons-release.md).

Corte anterior de botones: primitives 0.1.1 y registry 0.4.1 (parche documental sin cambios
de API/CSS), tokens 0.3.43 y contracts 0.4.0. Release e instalación privada verificados.
Verificado contra: axis-design-system@31b146e, tag v0.4.1 — 2026-10-04.


### Contexto heredado y controles de elección

La familia añade ButtonProvider, RadioButtonGroup y ButtonToolbar: contexto de línea con excepción
explícita, selección exclusiva y barra de acciones con flechas. MenuButton controlado admite opciones
dinámicas y portalContainer; conserva ownership del diálogo y escapa a su recorte por top layer.
SplitButton conserva los atributos nativos/ref de su acción principal. El Lab muestra estos recorridos
con React real. El consumidor mantiene focus trap, confirmaciones y anuncios de resultado.
Matriz canónica: AXIS `docs/quality/buttons.md`; no atribuir VoiceOver/NVDA manual a un pase de axe.

Distribución vigente verificada: primitives **0.2.1**, registry **0.5.1**, tokens 0.3.43 y contracts 0.4.0
(AXIS `13db367`, tag `v0.5.1`, release `37223839523` success, 2026-10-04). Instalación privada limpia:
HTML/CSS sin React y ocho componentes con React 18.3.1. Lab público y menús modales comprobados.
52 recorridos y 32 referencias visuales; VoiceOver/NVDA manual, zoom nativo e iPhone físico pendientes.
