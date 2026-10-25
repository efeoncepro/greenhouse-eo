# Claude Duet (Anthropic) — fuente oficial · 2026-10-22

Primer paso del método de [`mascot-3d-pose-library.md`](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md)
(fuente oficial antes de cualquier generación). Sólo descarga y medición: **no se generó ninguna imagen con IA** y
no se tocó OneDrive.

## 1. Qué es Claude Duet

**Verificado:** es un **producto**, no un personaje. Anthropic lo anunció el 2026-10-21 como «a proactive agent»
en research preview: app propia (iOS, Android y claude.ai), con lista de espera para Pro y Max en EE. UU., que
envía un resumen cada mañana, trabaja en su propia máquina virtual y pide aprobación antes de enviar, pagar o firmar.
Fuentes: [claude.com/duet](https://claude.com/duet) · [anuncio](https://claude.com/resources/articles/claude-duet).
La prensa lo posiciona contra **Muse** (Meta) y **Dots** (OpenAI) ([CNBC](https://www.cnbc.com/2026/10/21/anthropic-preview-of-claude-duet-personal-ai-agent-take-on-muse-dots.html)).

🔴 **Claude Duet NO tiene mascota.** Ni la página del producto, ni el anuncio, ni el bundle local muestran un
personaje. Gizmodo lo titula literalmente así: [«Anthropic's New Agent Has No Cute Mascot…»](https://gizmodo.com/anthropics-new-agent-has-no-cute-mascot-and-you-probably-cant-try-it-yet-2000829184)
y describe el logo como «just a scribble», a diferencia de Muse (criatura peluda) y Dots (personajes tipo Pixar).
Muse y Dots sí tienen mascota; **Duet compite justamente sin una**.

Lo que sí existe y es oficial: **el ícono** (mancha terracota + garabato de dos bucles) y **el sistema de
ilustración de línea** de Anthropic (un Lottie «Object-Question» en la misma página).

**Lo que NO está en el producto local (verificado):** `/Applications/Claude.app` 3.1623.0 no trae nada de Duet —
la única aparición es `registerEmployeeDuetBucketClear` (código interno, sin arte)—. El binario de Claude Code
2.1.263 tampoco (sus 12 coincidencias de «duet» son `DueTo…` del motor JS). La app Duet de iOS todavía no aparece
en la API de búsqueda de App Store.

## 2. Origen de cada archivo

| Archivo | Origen | Qué es |
|---|---|---|
| `fuente/claude-duet-static-app-icon.svg` | `claude.com/static/claude-duet/app-icon.svg` | **Ícono oficial**, con borde en degradado `#E8E6DC`. Referencia principal |
| `fuente/claude-duet-static-app-icon-flat.svg` | `claude.com/static/claude-duet/app-icon-flat.svg` | Ícono plano: sólo `#FAFAF8`, `#D97757`, `#141413` |
| `fuente/claude-duet-app-icon-oficial-claude-com.svg` | `assets.claude.com/9273e22b….svg` (anuncio) | Ícono 1300×1300, tal como aparece junto al titular del anuncio |
| `fuente/claude-duet-icono-sobre-lavanda-oficial.svg` | `assets.claude.com/a1dfa29e….svg` (página) | Ícono sobre fondo lavanda `#CBCADB`: es la pieza de lanzamiento que replicó la prensa |
| `fuente/claude-duet-static-og.jpg` | `claude.com/static/claude-duet/og.jpg` | OG 2400×1260: ícono + wordmark «Claude Duet» |
| `fuente/claude-duet-lottie-object-question-oficial.json` | `assets.claude.com/21ec753c….json` (página) | Lottie 5.12.1, 1200×1200, 12 fps, 50 cuadros: una moneda dibujada con «?» que gira |
| `fuente/claude-duet-ilustracion-pregunta-oficial.svg` | `assets.claude.com/8767b8d9….svg` (página) | Cuadro estático de la misma ilustración |
| `fuente/claude-duet-apps-integradas-oficial-claude-com.png` | `assets.claude.com/c3618d5c….png` (anuncio) | Tira 3840×2160 de apps integradas. **Logos de terceros: no usar como marca** |
| `fuente/claude-com-duet/` | los 30 assets de `claude.com/duet` | Copia cruda por hash; casi todos son **logos de terceros** (Stripe, Notion, Slack, Shopify, HubSpot…), sin uso para el personaje |
| `cuadros/claude-duet-*-render-1200.png` | render local de los SVG (sharp) | El ícono en PNG para mirar y referenciar |
| `cuadros/lottie-object-question-fNN.png` | render local del Lottie (lottie-web + Playwright) | 9 cuadros: frente (f00), tres cuartos (f06), perfil (f12), espalda (f18–f24), canto (f30) |
| `brief/prensa-9to5mac-claude-duet-2000x1000.jpg` | 9to5mac | **Prensa, no fuente**: confirma que la pieza de lanzamiento es el ícono sobre lavanda |
| `brief/*.mjs` | scripts de esta corrida | `render.mjs` (SVG y Lottie), `medir.mjs` (proporciones), `hoja.mjs` y `grid.mjs` (hojas) |
| `hoja-de-contacto.png` | esta corrida | Resumen visual de las 9 referencias |

## 3. Anatomía medida del ícono

Medido sobre `app-icon-flat` a 1200 px (`brief/medidas-icono.json`):

| | |
|---|---|
| **Paleta** | marfil `#FAFAF8` (fondo) · terracota `#D97757` (mancha) · tinta `#141413` (garabato) · borde `#E8E6DC` · lavanda de lanzamiento `#CBCADB` · beige de relleno de la ilustración `#E3DACC`. El terracota es el de marca de Claude, el mismo de Clawd (`rgb(215,119,87)` = `#D77757`, a 2 niveles) |
| **Mancha** | forma orgánica irregular, casi redonda, más ancha arriba a la derecha; 68 % del ancho del ícono, 66 % del alto, centrada |
| **Garabato** | un solo trazo de pincel/plumón grueso que entra horizontal por la izquierda, hace **dos bucles** (como «ee» en cursiva) y sale subiendo a la derecha; 83 % del ancho, **desborda la mancha a ambos lados**; grosor irregular, bordes temblorosos de trazo manual |
| **Cara, extremidades** | **no existen.** Los dos bucles se pueden leer como dos ojos cerrados o como dos voces («dúo»), pero eso es **interpretación nuestra, no está declarado** por Anthropic |
| **Sistema de ilustración** | línea negra gruesa de grosor variable, rellenos planos crema/beige, objetos con canto dibujado cuando giran (la moneda gira y muestra grosor) |

## 4. Material 3D propuesto

**Dibujo a mano → gel/cerámica satinada con la línea conservada** (la familia de Gigi), no cubos (Clawd) ni vinilo
con visor (Codex):

- La **mancha** como un **guijarro de cerámica o arcilla satinada terracota**, ligeramente aplanado, con el borde
  irregular de la forma original.
- El **garabato** como **un cordón de tinta negra mate extruido** (un tubo de grosor irregular, como pasta de
  modelar), que sale de la superficie y la desborda por los dos lados. Es la firma: si se suaviza a tubo perfecto,
  se pierde.
- Si se quiere un **personaje** a partir del ícono, la propuesta es: la mancha como cuerpo, los dos bucles como
  «ojos/voces» y **sin boca ni extremidades** (paridad con Clawd). Esto ya es **invención de Efeonce**, no
  interpretación de un personaje existente; hay que presentarlo así en el canvas.

## 5. Límites de marca (Anthropic)

- [Anthropic Trademark Guidelines](https://www.anthropic.com/legal/trademark-guidelines): las marcas (nombres,
  logos, elementos) sólo se usan como Anthropic lo permita y en materiales que apruebe; **no se puede cambiar
  color, tipografía ni proporción** de sus logos; nada que implique patrocinio o afiliación sin autorización
  expresa; el permiso es revocable.
- Consecuencia práctica: **un «Duet 3D» es una modificación del ícono de producto**, más delicada que Clawd (que
  era arte de terminal sin estatus de logo). Sirve para exploración interna y el canvas; **no para pauta ni
  publicación sin validar** con la guía (misma regla que el inventario de mascotas de partners).
- Los logos de terceros de la página no se reutilizan.

## 6. Huecos

- **No hay hoja de modelo, vistas ni expresiones**: no hay personaje que las tenga. Todas las vistas 3D serían
  diseño propio.
- La app iOS/Android no estaba indexada al 2026-10-22: no hay capturas oficiales de la app ni animación del ícono
  dentro del producto. Revisar cuando salga de la lista de espera (posible animación de arranque del garabato).
- El post de lanzamiento en X (@claudeai, 2026-10-21) no se descargó (X exige sesión); según la prensa, la imagen es
  el mismo ícono.
- El Lottie «Object-Question» está en la página de Duet, pero **se infiere** que es del sistema general de
  ilustración de Anthropic, no un personaje de Duet.
