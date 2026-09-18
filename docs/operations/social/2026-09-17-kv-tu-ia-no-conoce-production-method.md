# KV paraguas «Tu IA no conoce tu negocio» (2026): de la mascota de partner a Metricool

Fecha de registro: 2026-09-17. Owner: Social Media Studio / Efeonce.
Caso: key visual de lanzamiento de la narrativa
[«Tu IA no conoce tu negocio»](../../strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md), versión Clawd.
Bitácora técnica y creativa; las reglas transferibles viven en las skills enlazadas por el
[protocolo social](../SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md). Procedencia por versión, prompts, scripts y QA en
[`LEEME.md`](../../../ai-generations/2026-09-17_kv-tu-ia-no-conoce/LEEME.md); programación en
[`PROGRAMACION.md`](../../../ai-generations/2026-09-17_kv-tu-ia-no-conoce/PROGRAMACION.md) (binarios fuera de git).

## 1. Estado

| Pieza | Red | Fecha/hora (America/Santiago) | ID / UUID | Estado verificado |
|---|---|---|---|---|
| KV v05 4:5, estática | LinkedIn organización | 2026-09-21 11:00 | `377494606` / `-4724960179865761392` | `PENDING` (al crear, 2026-09-17 09:44) |
| KV v05 4:5, estática | Instagram `efeoncepro` | 2026-09-21 12:00 | `377494633` / `-1035207966476447980` | `PENDING` (al crear, 2026-09-17 09:44) |
| KV v05 9:16, historia | — | — | — | Producida, **no programada** |

La versión final (v05) fue aprobada por el operador («dejémoslo así») y la programación autorizada de forma explícita.
Horas = máximo del día según `getBestTimeToPostByNetwork` de Metricool. PNG en
`gs://efeonce-group-greenhouse-public-media-prod/campaigns/tu-ia-no-conoce-2026/`. Captions: Instagram con tensión y
pregunta; LinkedIn con argumento y cifras atribuidas a HubSpot. No hay publicación ni medición todavía.

## 2. Concepto y sistema modular de mascotas

Efeonce fue aceptado como partner de Anthropic y OpenAI (declaración del operador 2026-09-17; tier, términos y guía de
marca pendientes de readback en el [registro de partnerships](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md)). El KV traduce la
tesis a una escena:

- **Idea:** reinterpretación del ángel y el diablo en el hombro. Nexa, en su versión humana con el hoodie azul de
  Efeonce, mira a Clawd (mascota de Claude), apoyado en su hombro; los dos hacen el gesto de «no sé». La IA es capaz,
  pero nadie le contó el negocio.
- **Titular con jerarquía:** «Tu IA no conoce» (Poppins 500, `softOnDark`, 0,4× del remate) → «tu negocio.»
  (Bricolage `ideaImpact` 780, blanco, 47 % del ancho).
- **Elementos del sistema como parte de la idea:** selección AXIS `eight-handles` sobre «tu negocio.», cursor
  colaborador «Claude» (`role`, top-end, color `#d77757` = naranja de Clawd), cursor local y etiqueta de capa
  «Contexto: 0 %» (Poppins 600 en `#0375db`).
- **Firma:** logo Efeonce negativo centrado sobre la laptop desenfocada del primer plano.

**Sistema modular.** Nexa es central y fija. El hombro es el espacio intercambiable: la mascota del partner, el nombre
y color del cursor colaborador y la insignia de partner cambian juntos (Clawd/Claude hoy; Codex Pet/Codex después).
Regla del operador: **nunca dos mascotas de terceros en la misma imagen**.

**Riesgo de lectura.** «Claude» sobre «tu negocio» + Clawd confundido puede leerse como «Claude no sirve». Mitigación:
el caption «Claude razona increíble. Nadie le ha contado cómo funciona tu empresa.» ubica el problema en el contexto,
no en la capacidad; validar contra la guía de marca de Anthropic antes de pautar.

## 3. Recorrido de versiones

| Versión | Observación del operador / QA | Corrección | Criterio transferible |
|---|---|---|---|
| v01 | Clawd aplanado, chico y al borde; titular sin contraste de pesos | Sprite con píxel 1:2 y Clawd ≈ 20 % del ancho en v02 | La celda de terminal mide el doble de alto: reproducir una mascota de bloques respetando su proporción de origen |
| v02 | Pedido: Nexa con hoodie Efeonce, cámara más alejada, titular plano, logo centrado sobre objeto de primer plano, 4:5 y 9:16 | v03: plate con referencia del hoodie; 9:16 por outpaint y 4:5 abriendo el 9:16 a los lados | Producir pensando en ambos formatos desde la misma escena; la firma se apoya en un objeto, no flota |
| v03 | Degradado azul detrás del texto no gusta; titular plano sin jerarquía se ve débil; faltan elementos gráficos de marca. Titular navy sobre ladrillo falló contraste (2,5–3,5:1); luz detrás del texto se leyó como foco (v03a descartada) | v04: muro navy liso como escenografía (sin scrim), entrada liviana → remate pesado, selección colaborativa AXIS | Resolver contraste con escenografía, no con degradados; jerarquía = entrada liviana + remate pesado |
| v04 | Clawd perdió el «?»; recorte «mordido» en pelo de Nexa y bordes de Clawd; etiqueta «Claude» ilegible a 390 px y cursor violeta en vez de naranja | Merge con máscara propia para Clawd (parche); luego v05 completa | Recorte mordido no es acabado profesional: regenerar, no recortar. Limitaciones de un contrato se resuelven extendiendo el contrato, no parcheando el render |
| v05 | Aprobada («dejémoslo así») | Plate nativo guiado por boceto, alejamiento de 10 %, Clawd ≈ 11 % del ancho, adapter AXIS con `presentation` | Ver §4 |

Contraste peor caso v05 (4:5 / 9:16): entrada 10,54 / 10,76 · remate 12,92 / 13,52 · etiqueta de capa 4,59 · logo
10,09 / 11,01.

## 4. Procedimientos técnicos que funcionaron

- **Clawd 3D fiel desde el sprite oficial.** Arte de bloques y color `rgb(215,119,87)` tomados del binario oficial de
  Claude Code 2.1.x. Cada carácter de cuarto de bloque = 2×2 píxeles, pero la celda de terminal es 1:2, así que cada
  píxel mide 1 de ancho × 2 de alto (`clawd/sprite.mjs`). Materialización con `gpt-image-2.5-sunburst` edit («cada
  píxel = pila de 1×2 cubos», vinilo mate) + `pnpm ai:image:rmbg`; poses neutral y shrug con «?» en cubos. La versión
  3D y el «?» son interpretación: validar con la guía de marca.
- **Plate nativo guiado por boceto.** Cambiar el fondo detrás de persona y mascota repintando con matte + máscara
  dejó bordes mordidos y destruyó partes finas o sueltas (el «?» y un brazo). La solución fue regenerar la escena con
  el set nuevo: `v05/layout-sketch.mjs` produce un boceto de formas planas (cabeza, Clawd en el hombro, manos,
  escritorio, laptop) que entra como imagen 1, junto con referencias de identidad de Nexa ×2, hoodie y Clawd 3D.
- **Alejar ≤ 10 %.** Para ganar aire de titular, `v05/zoomout.mjs` (`S=0.9`) con uniones sólo en muro, ventanas y
  escritorio. Alejar 25 % duplicó marcos de ventana («marco dentro de marco») y dejó una línea en el escritorio.
- **9:16 → 4:5 abriendo a los lados.** 9:16 nativo; el 4:5 sale de `feed/outpaint-wide.mjs` (lienzo 1632×2048, franja
  40 px, fundido 28 px). Un 4:5 nativo dejaba la cabeza muy arriba, sin aire para texto ni logo.
- **Adapter AXIS `presentation`.** `renderCollaborationSelection` acepta `collaboratorScale` (1,9 deja «Claude» legible
  a 390 px), `localCursorScale` (1,25) y `participantColors` (`claude = #d77757`), con tinta de etiqueta por contraste.
  Detalle y límites en el
  [contrato de ejecución publicitaria](../ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
  Los controles de selección AXIS están diseñados para fondo oscuro: sobre muro claro desaparecen, lo que también
  decidió el muro navy.

Las reglas ya están en las skills `efeonce-advertising-creative` (bloque `presentation`) y
`greenhouse-ai-image-generator` (regenerar vs. recortar); esta bitácora no las duplica.

## 5. Límites y pendientes

- **Insignia oficial de partner Claude:** sigue pendiente de asset oficial.
- **Guía de marca de Anthropic:** archivarla y validar el uso de Clawd 3D, el «?» y el cursor «Claude» antes de pautar.
- **Readback de publicación:** lunes 2026-09-21 después de las 12:00, confirmar `PUBLISHED` y URL pública de ambos
  posts. Hasta entonces el estado es `PENDING`, no publicado.
- **Historia 9:16:** producida (`kv-tu-ia-no-conoce-clawd-9x16-v05.png`) y no programada.
- **Riesgo de lectura del cursor «Claude»:** vigilar comentarios tras la publicación; la mitigación depende del caption.
- **Versión Codex Pet:** el sistema modular la admite; no está producida.
- Nexa y Clawd son generados; el rostro de Nexa se validó a ojo contra sus referencias.
