# TASK-1938 — Efeonce AI Visibility Report (PDF): dirección visual aprobada

## Modo y fuente

- Modo: `source-led`
- Fuente durable: hojas de este repo exportadas del canvas aprobado el 2026-09-29.
  - [`paginas/`](./TASK-1938-ai-visibility-report-pdf-la-orbita/paginas/): **las 24 hojas aprobadas a tamaño nativo**
    (A4 794×1123). Hay ocho por idioma (`es`, `en`, `pt-BR`): portada de no cliente y de cliente, 02 Qué hacer,
    03 Por qué, 04 Dónde estás, 05 Mercado y fuentes, y las dos contraportadas. Es la referencia contra la que se mide
    la fidelidad del PDF.
  - [`portada-estados-de-la-orbita.png`](./TASK-1938-ai-visibility-report-pdf-la-orbita/portada-estados-de-la-orbita.png):
    la órbita de la portada en sus cuatro estados de gravedad (crítico 28, atención 63, óptimo 84 y sin dato).
  - [`fuente-canvas-2026-09-29.tar.gz`](./TASK-1938-ai-visibility-report-pdf-la-orbita/fuente-canvas-2026-09-29.tar.gz):
    las fuentes `.dc.html` del canvas con los valores exactos, más los scripts que las generan:
    - `generar-hojas.py` genera las hojas en español.
    - `traducir-hojas.py` contiene la tabla de traducción es → en → pt-BR aprobada.
    - `render-referencia.mjs` regenera `paginas/` con Playwright.
    - `icons.json` y `assets/` son los logos, lockups y burbujas que usan las hojas.

    Va empaquetado para que el escaneo de Tailwind no lea el marcado.
- Procedencia y aprobación: canvas «Correo de Efeonce Insights», página «Informe del Grader (PDF)». Es un artifact de
  tipo Design, privado del operador: <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd> (versión 17).
  - El operador iteró el diseño hoja por hoja el 2026-09-29 y aprobó las submarcas, las dos audiencias, los encabezados
    y pies, y los tres idiomas.
  - Cerró con la órbita de gravedad: «con eso cerraríamos … canoniza este informe».
  - El canvas es la fuente editable; las hojas son la copia durable.
- Cifras: son ilustrativas y coherentes con el fixture corregido. El puntaje general es 63 y los niveles salen del
  promedio ponderado de sus dimensiones.

## Canon en AXIS (2026-09-29)

Esta dirección está canonizada en AXIS desde el tag `v0.3.30` (`main` `26097c5`, registro verificado). AXIS es dueño de
los valores y de las reglas; las hojas de `paginas/` siguen siendo la referencia de fidelidad visual.

- **Lab:** <https://axis.efeonce.org/references/ai-visibility-report/> y su `.json`.
- **Tokens** (`@efeoncepro/axis-tokens` `0.3.30`):
  - `aiVisibilityReport` guarda la anatomía del documento: paleta, página, orden, capítulos, audiencias, geometría de
    la órbita de la portada, encabezado y pie, contraportada, locales y `never`.
  - `efeonceGraphicLine.measureSeverity` guarda el color de gravedad de una medida con escala publicada:
    - Sobre oscuro, `error[400]`, `warning[500]` y `success[400]` (≥ 4,5:1 sobre `#091951`).
    - Sobre claro, `error[600]`, `warning[900]` y `success[500]` (≥ 3:1).
- **Contratos** (`@efeoncepro/axis-ui-contracts` `0.3.30`):
  - `efeonce.ai-visibility-report` `0.1.0` (`candidate`): intent → manifiesto de seis páginas, 22 códigos de issue y
    9 checks del adapter; resolver `resolveAiVisibilityReportIntent` y, en AXIS, `pnpm report:resolve`.
  - `efeonce.graphic-line-orbit` `0.4.0`: la medida suma `severity`, `severityLabel`, `scaleVisible` y `glow`.
- **Receta de la portada** (`@efeoncepro/axis-graphic-line/report` `0.12.0`): `aiVisibilityReportOrbitSvg` y
  `aiVisibilityReportSeverityColor`.
- **Lockups y órbitas estáticas:** `@efeoncepro/axis-brand-assets` `0.4.3`; las órbitas se re-sellaron sin cambiar el
  dibujo.
- **Docs en el repo `axis-design-system`:**
  - ADR `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md`.
  - Guía `docs/agent-composition/ai-visibility-report.md`.
- **Recorrido de la órbita (AXIS `v0.3.38`, `main` `c92160b`, 2026-09-29):** `aiVisibilityReport.cover.orbit.travelled`
  y `efeonceGraphicLine.trajectory.measure.travelledPath` (`axis-tokens` `0.3.38`), contrato `efeonce.graphic-line-orbit`
  `0.5.0` (`axis-ui-contracts` `0.3.38`) y `aiVisibilityReportOrbitSvg` ya con el recorrido (`axis-graphic-line`
  `0.13.0`); órbitas estáticas re-selladas en `axis-brand-assets` `0.4.6`.
- **Estado en Greenhouse (2026-09-29):** fija `axis-tokens` y `axis-ui-contracts` `0.3.37`, `axis-graphic-line`
  `0.11.0`, `axis-brand-assets` `0.4.5` y `axis-ui-registry` `0.3.1`. El renderer adopta el juego `v0.3.38` en
  TASK-1938 (Slice 1), con el adapter de la órbita en el contrato `0.5.0`.

## Decisiones que fija

1. **Dos audiencias.**
   - Para no clientes es un diagnóstico que cierra con «Agenda una reunión», que lleva a `/contacto/` con UTM.
   - Para clientes es parte del servicio: no lleva oferta y cierra con el responsable de la cuenta y el próximo informe.
2. **Orden «respuesta primero»:** qué hacer → por qué → dónde estás → mercado y fuentes.
3. **Submarcas de producto.**
   - El documento es el **Efeonce | AI Visibility Report**: su lockup va en la portada y en los encabezados.
   - Bajo el veredicto va **Efeonce | AEO** con «Resultado del AEO Assessment».
   - Todos salen de `@efeoncepro/axis-brand-assets` 0.4.2.
4. **Línea Engine:** fondo `#091951` y acento `#0375db`. El cierre es «Empower your Engine», en bloque al 64 % del logo.
5. **Tipografía canónica de «La órbita»:** Bricolage 760 para cifras, titulares y respuestas; Poppins para estructura
   y texto.
6. **Encabezado y pie de las interiores.**
   - Encabezado: el lockup del informe, el ícono y nombre del capítulo, y cuatro segmentos de avance.
   - Pie: organización · período, la burbuja URL horneada y el folio «02 / 06».
7. **Tres idiomas:** `es` (tuteo), `en` y `pt-BR` (você), con las reglas de formato de la task.
8. **La órbita de la portada toma el color de la gravedad del puntaje** (operador, 2026-09-29). Ver la sección
   siguiente.

## La órbita de la portada: color de gravedad

La esfera siempre está en el puntaje real, en `score × 3,6°`, con una estela de 50° detrás y la marca de partida a las
12; al 100 % la esfera vuelve a las 12.

- **Recorrido** (operador, 2026-09-29, «aplícalo en todas»): bajo la estela, un arco desde las 12 hasta la esfera, en el
  mismo color que la estela, de **3 px** (0,75 × la estela de 4 px) al **60 %** de opacidad. Al 100 % es el anillo
  completo; con 0 o sin dato no existe. Deja leer cuánto avanzó la medida sin volverla un medidor que se llena: la
  estela y la esfera siguen dominando. Valores: `aiVisibilityReport.cover.orbit.travelled` (AXIS `v0.3.38`).
  Las hojas de `paginas/` y la lámina de estados son anteriores a esta decisión y no dibujan el recorrido: para ese
  trazo manda AXIS y su Lab.

- **Qué cambia de color:** la estela, el recorrido, la esfera, el halo y el punto de la etiqueta de gravedad. Los umbrales son los
  del modelo (`recommendations.ts`): menos de 40 es crítico, menos de 70 es atención y el resto es óptimo.
- **Qué no cambia:** el anillo, la marca de partida y la cifra.
- **La etiqueta de texto** («Crítico», «Atención», «Óptimo») acompaña siempre al color, que nunca comunica solo.
- **Sobre el fondo `#091951`**, los colores salen de la rampa AXIS:

| Gravedad | Token | HEX | Contraste sobre `#091951` |
|---|---|---|---|
| Crítico | `axisRamp.error[400]` | `#e25a61` | 4,62:1 |
| Atención | `axisRamp.warning[500]` (`axisSemanticHex.warning`) | `#ffb703` | 9,47:1 |
| Óptimo | `axisRamp.success[400]` | `#46a877` | 5,61:1 |

  - Se usa el paso 400 porque el 500 de error y de éxito queda en 3,54:1 y 3,28:1: pasan como gráfico, pero apenas.
  - Sobre papel, las etiquetas de las interiores siguen con `axisSemanticHex` y la tinta oscura de atención.
- **Sin dato:** sólo el anillo y la marca de partida. No hay esfera, estela ni recorrido; la cifra es «—», sin «de 100», con la
  etiqueta «Sin dato».
- **Leyenda:** la escala de la portada, «0–39 Crítico · 40–69 Atención · 70–100 Óptimo», usa los mismos tres colores.
- **Excepción acotada a la línea:** en La órbita, el estado se dice con la forma y nunca con semáforo (§3.10 de la
  skill). Esa regla sigue vigente para las marcas de estado.
  - El color de gravedad es una excepción sólo para la medida de un puntaje con escala de gravedad publicada.
  - Hoy la única medida así es la portada de este informe.
  - Siempre va con su etiqueta en texto y con la escala visible en la misma página.

## Alternativas descartadas

- Recolorear el PDF actual con la paleta nueva: no cambia la jerarquía y conserva el `Gauge` que se llena.
- Órbita siempre en el acento Engine: el operador pidió que la portada diga la gravedad de un vistazo.
- Arco que se llena hasta el puntaje: prohibido en la línea. El dato es la posición de la esfera.
