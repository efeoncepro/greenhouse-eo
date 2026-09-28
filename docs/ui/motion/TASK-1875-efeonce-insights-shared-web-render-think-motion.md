# TASK-1875 — motion de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15; **reescrito el 2026-09-28 para describir lo construido y aprobado** (dirección A). La
versión anterior pedía motion mínimo de lectura; el operador pidió más impacto y lo construido es más rico, pero
mantiene la regla de fondo: el motion **arma lo que ya está en el HTML** y nunca condiciona el primer paint ni el
contenido. Fuente verificable: `efeonce-think/src/scripts/insights-report.ts`, `efeonce-think/src/styles/insights.css`
y los tokens de `efeonce-think/src/lib/insights-tokens.ts`.

## Tokens

De `axisMotion` vía `insights-tokens.ts` (variables `--ins-*`). Las curvas de la hoja de estilos salen siempre de
estos tokens; las duraciones de coreografía más largas (520–1400 ms de reveals, figuras y láminas) están escritas en
`insights.css` y son las que documenta esta página:

- `easeEmphasized` `cubic-bezier(0.2, 0, 0, 1)` — llegar y transformar con énfasis (entradas, órbita, figuras).
- `easeStandard` `cubic-bezier(0.4, 0, 0.2, 1)` — opacidad, color, fondos.
- `durationShort` 150 ms (hover, color) · `durationMedium` 300 ms (estados de controles, toast).
- Órbita: anillo 350 ms · recorrido 1100 ms tras 200 ms · halo 800 ms (`orbitMs`).
- En JS, el conteo y el recorrido de la órbita usan una curva de salida cuártica (`1 - (1 - t)^4`), equivalente
  visual del énfasis.

## Triggers and Targets

- **Portada, al cargar**: aparece el anillo (350 ms); la esfera recorre su arco de 50° con la estela detrás (1100 ms
  desde los 200 ms; la estela nunca antes de la partida); al asentar sube el halo (900 ms en el script; el token `orbitMs.halo` declara 800 ms). Desde los 1600 ms, el
  anillo «en vivo» late en bucle (2400 ms). La barra y el cuerpo suben 14 px con opacidad (900 ms, escalonados a 120 /
  220 / 360 / 460 ms). El punto del chip «Enlace vigente» late igual que la esfera; la flecha de scroll hace un
  pequeño empujón cada 2200 ms.
- **Al bajar desde la portada**: la órbita se aleja (sube hasta 120 px, gira hasta 24°, se reduce 18 % y se apaga) y
  reaparece pequeña en la barra fija (`is-stuck`: opacidad 300 ms, giro/escala 600 ms). Una sola órbita a la vista.
- **Avance de lectura**: el arco de la órbita de la barra y su esfera avanzan por secciones (700 ms, énfasis); al
  terminar, la órbita queda completa con la esfera arriba.
- **Reveals**: bloques `data-reveal` suben 18 px con opacidad (700 ms); grupos `data-stagger` 16 px (620 ms) con
  pasos de 70 ms entre hijos, una sola vez al entrar al viewport.
- **Cifras**: cuentan desde 0 hasta su valor del modelo (1100 ms) y terminan EXACTAMENTE en el `display` del modelo
  (prefijos, sufijos y decimales incluidos).
- **Hallazgo**: abrir y cerrar usan View Transitions (`view-transition-name` por tarjeta) cuando el navegador la
  tiene; la evidencia se despliega (520 ms, 8 px); el «+» gira 45° (300 ms). Filtrar también usa View Transitions.
- **Escenas narradas** (≥ 1000 px): la figura principal queda fija; cada paso pasa de opacidad 0,22 a 1 y de 10 px a
  0 (500 / 600 ms) al cruzar el centro del viewport, y la figura cambia de estado (`data-step`: en el paso de la cifra
  con dos series sólo aparece la actual; en «Lo que significa» se atenúan los grupos que no son el último).
- **Entrada de figuras**, una vez, al entrar al viewport o al abrir su hallazgo: barras crecen desde 0 (900 ms, 70 ms
  entre grupos) y luego muestran su valor; apiladas, cascada y UpSet crecen en vertical; bullet y embudo crecen en
  horizontal; línea se revela por recorte (1300 ms) y sus puntos aparecen a los 900 ms; torta/dona giran y crecen
  desde 0,6; waffle enciende sus 100 celdas con 6 ms entre celdas; Venn acerca sus dos círculos 22 px; medidor
  dibuja su arco (1400 ms); dispersión muestra sus puntos (500 ms).
- **Presentación**: la lámina entra 40 px desde el lado del avance con opacidad (500 / 600 ms); la barra de progreso
  se extiende (500 ms).
- **Microinteracciones**: toast de copia (300 ms, visible 2,2 s); hover de acciones del plan (sube 3 px); flecha de
  descarga baja 2 px; transiciones de fondo/color a 150 ms.
- **No anima**: tablas, metodología, descargas, pie, estados `StatusScreen` (traen su propio hero), impresión.

## Timing and Ownership

- La página no orquesta un timeline global: `mountInsightsReport()` monta módulos independientes (órbita, hallazgos,
  filtros, interruptores, avance, copia, presentación; reveals y escenas sólo con motion).
- Mejora progresiva: un script inline anterior al primer paint agrega `ins-js` y, si el usuario acepta motion,
  `ins-motion`. Todo estado inicial oculto o encogido vive detrás de `.ins-motion`. Si el módulo no monta en 3 s
  (`window.__insMounted`), se retiran ambas clases y la página queda completa y final.
- Lo que está dentro de un hallazgo cerrado o de una escena no se observa por scroll: se arma al abrir el hallazgo o
  al llegar al paso.

## Reduced Motion

Con `prefers-reduced-motion: reduce` no se agrega `ins-motion`, no se montan reveals ni escenas narradas y una regla
global anula toda transición y animación dentro de `.ins-page`. La órbita queda en su posición final, las cifras en
su `display`, las figuras dibujadas, los pasos visibles, la presentación cambia de lámina sin deslizar y no pide
pantalla completa; View Transitions no se usa. Toda la interacción sigue disponible y el contenido es idéntico.

## GVC / Micro Evidence

- `efeonce-think/scripts/verify-insights-report.mjs` en 1440 y 390, con `no-preference` y `reduce`: con `reduce`
  ningún `data-reveal` ni barra queda con opacidad 0 o sin crecer y la raíz no lleva `ins-motion`; sin scroll
  horizontal antes y después de interactuar; la presentación responde al teclado.
- `efeonce-think/scripts/capture-insights-report.mjs` captura con `reduce`, así el dossier muestra el estado final de
  cada escena: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`.
- Scorecard: dimensión motion 4,6 en
  `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json`.
- No hay grabación en video del motion completo: se revisó en vivo en localhost con el operador.

## Design Decision Log

- Motion de marca, no sólo de lectura: el operador pidió más impacto; la órbita de la portada es el momento
  dominante y es la misma que después mide el avance en la barra, para que haya una sola órbita a la vista.
- Deuda menor: el script de la órbita escribe literales (350 ms y 900 ms con la curva estándar) en vez de leer
  `orbitMs`/`easeStandard`; el halo quedó en 900 ms contra 800 ms del token. Se corrige al tocar el script.
- El conteo siempre termina en el `display` del modelo: la web no redondea ni reformatea una cifra.
- El scrollytelling sólo corre en escritorio con motion: en 390 px y con movimiento reducido los pasos se leen de
  corrido debajo de la figura.
- View Transitions como mejora, no como requisito: sin la API, abrir y filtrar cambian al instante.
- La impresión anula todo: el PDF descargable es el camino optimizado para imprimir.
