# TASK-2054 — Dossier de revisión visual: formulario en línea (`inline_pill`)

> Revisado: 2026-10-24 por Claude (frames y hojas comparativas mirados). Superficie: `<greenhouse-form>` con la
> presentación `inline_pill` (contrato de TASK-2053), fuera del portal. Referencia: canvas «Portada Blog Efeonce» v67,
> bloques Glitch (`.gxs`) y Eventos (`.gxs--ev` dentro de `.evx`), congelado en
> `docs/ui/visual-directions/TASK-2051-blog-portada-v3/fuente-canvas-2026-10-24.tar.gz`.

## Cómo se obtuvo

- Gate reproducible: `node scripts/growth/forms/fixtures/inline-pill.scenario.mjs --out .captures/2026-10-24-inline-pill
  --baseline-rev a0ccb79a4 --live --motion` (sin base de datos, sin deploy, sin escribir `public/growth-forms/`).
- Referencia = CSS y marcado LITERALES del canvas (extraído a una carpeta temporal fuera del repo), con los cinco estados
  aplicados por clase. Candidata = el `<greenhouse-form>` real (bundle del árbol actual), contrato fixture
  (`glitchInlinePillContractFixture` / `eventInlinePillContractFixture`), API pública simulada con `page.route` y la piel
  `scripts/growth/forms/fixtures/inline-pill-host-skin.css` (sólo tokens). Los estados se alcanzan con interacción real
  (clic, escribir, Enter, respuesta del envío).
- Transiciones congeladas para capturar estados finales y cursor transparente; el movimiento se evidencia aparte con video
  y GIF (`.captures/2026-10-24-inline-pill/*-sequence.{webm,gif}`).
- GVC del portal no aplica: la superficie no es una ruta `(dashboard)`.

## Resultado (pixelmatch umbral 0,1; presupuesto 1 %)

| Píldora | Viewport | Reposo | Abierto | Enviando | Éxito | Listo |
|---|---|---|---|---|---|---|
| Glitch | 1440 | 0 % | 0,097 % | 0,001 % | 0 % | 0 % |
| Evento | 1440 | 0 % | 0,056 % | 0,001 % | 0 % | 0 % |
| Glitch | 390 | 0 % | 0,143 % | 0,498 % | 0 % | 0 % |
| Evento | 390 | 0 % | 0,082 % | 0,001 % | 0 % | 0 % |

20/20 dentro del presupuesto. Hojas lado a lado (izquierda canvas, derecha renderer): `glitch-1440`, `glitch-390`,
`event-1440`, `event-390` `-canvas-vs-renderer.png` en esta carpeta. Reporte completo: `gate-report.json`.

Residuo conocido: en «Enviando» a 390 el campo y el botón de envío quedan 1 px corridos (el campo es `flex:1` y su ancho
fraccional se redondea distinto); en «Abierto» la diferencia es antialias del placeholder.

## Formularios vivos

Renderer de `a0ccb79a4` (antes de TASK-2053/2054) contra el actual, mismo contrato, 1440 y 390: **0 px en 18/18**
(5 fixtures del repo + 4 contratos públicos vivos leídos por GET: `efeonce-media-diagnostic`,
`efeonce-inbound-diagnostic`, `efeonce-hubspot-scope`, `efeonce-aeo-diagnostic`).

## Comportamiento verificado

- Teclado (ambas píldoras): Tab llega al botón; Enter abre y el foco entra al campo; Esc con el campo vacío cierra y el
  foco vuelve al botón; Esc con texto no cierra; Enter envía y el foco pasa al mensaje de confirmación.
- Movimiento reducido: `transition-duration: 0s`, sin animación; la píldora salta al ancho del estado (480/470).
- 390: `scrollWidth == clientWidth` (390) en ambas.
- axe (WCAG 2.2 AA) en abierto y listo: 0 violaciones. El texto de éxito que ya no se ve sale del árbol accesible
  (`visibility`, con retraso para el fundido); antes axe lo medía sobre el relleno y daba 2,2:1.
- Pruebas jsdom (`src/growth-forms-renderer/__tests__/inline-pill.test.ts`): estados, error en línea, red con
  «Reintentar», cupo lleno sin «Reintentar», lista de espera, doble envío, sincronización entre instancias y `destroy`.

## Hallazgo de fidelidad

El canvas declara el botón de apertura en 15 px/600, pero RINDE 16 px/400 con interlineado normal: el reset
`.v3 button{font:inherit}` del tablero gana en especificidad a `.ab`/`.ab--xl`. El renderer reproduce lo que se ve
(lo aprobado), medido con estilos computados; el botón de envío sí rinde 14 px/600 porque `.v3 .gxs__send` gana al
reset. El campo conserva el padding nativo `1px 2px`.

## Deuda conocida

- En el sitio, la nota del evento va en flujo bajo la píldora; en el canvas `.evcta .gxs__note` es absoluta (no empuja
  el layout). Es composición del anfitrión (TASK-2051), no del renderer.
- El anfitrión debe darle a `<greenhouse-form>` el ancho de su columna (≥ 480 px para los anchos del canvas): con
  `container-type: inline-size` un elemento dimensionado por contenido colapsa.
