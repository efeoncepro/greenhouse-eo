---
paths:
  - "scripts/foto/**"
  - "docs/operations/brand-photography/**"
  - "ai-generations/**"
---

# Fotografía de marca Efeonce — invariantes (auto-load por path)

🔴 **El DEFAULT del bloque compartido gana cuando la escena calla** *(medido 3 veces el 2026-09-22)*:

> **Entre un bloque compartido y la escena, gana el más específico — y el bloque compartido es el default
> cuando la escena no dice nada.**

| Bloque | Su default si la escena calla | Cómo se contrarresta |
|---|---|---|
| Realismo anti-IA (`printed matter exists…`) | **oficina de 2010**: libros, plantas, tazas, monitores con marco | declarar hardware de generación actual, superficie desnuda y pantallas sin marco, **prohibiendo lo analógico incluso fuera de foco** |
| Escena físicamente imposible | **idioma del render** (CGI) | pedir la imperfección: polvo, micro-rayas, grano, profundidad de campo real |
| Palanca con marcadores | los marcadores mandan | ya cubierto por `auditarContradicciones` |
| **Criatura de partner CÁLIDA en cuadro** (Clawd) | **estética ochentera**: luz tungsteno ámbar, glow naranja, look retro | declarar la temperatura del cuadro: *«the whole frame is cool and contemporary… nothing is warm, amber, orange or golden; no tungsten, no retro glow»* |

⚠️ **El agujero:** el aviso existe **por palanca** y salta cuando la escena **contradice** un bloque.
**Nada avisa cuando la escena CALLA** y el default se impone — eso sólo se ve en la salida, tarde y pagada.
Envejeció dos plates de la corrida de ads **con el gate en verde**.
✅ En toda escena de oficina/escritorio, **declarar el material explícitamente**: el silencio elige por ti.

🔴 **Si la pieza es un ANUNCIO (paid media, no orgánico), carga primero
[`ad-creative-evidence-2026.md`](../skills/efeonce-advertising-creative/references/ad-creative-evidence-2026.md)**
(`as-of 2026-09-21`, caduca 2027-03). Lo que más cambia la toma, medido:
**exploded view, cross-section, freeze motion de alta velocidad, levitación y color blocking NO tienen
ningún respaldo** en gráfica premiada 2025-2026 — son estética de banco de imágenes; **lo premiado es casi
lo contrario** (escala invertida con lectura en dos tiempos · luz dura con la sombra como logo · blur largo
real · silueta en alto contraste). **Alto contraste de color = +41% engagement**, el único lift medido sobre
estáticos B2B. Y **71% de los consumidores cree ver avisos hechos con IA, 57% con sentimiento negativo**
(IAB, ene-2026): el antídoto más fuerte es **que la restricción de producción sea la idea**.

Carga [`design-studio` → lenguaje fotográfico](../skills/design-studio/references/efeonce-photographic-language.md)
y el [índice del canon](../../docs/operations/brand-photography/README.md) **antes de escribir un prompt**. La
sesión que reconstruyó el oficio a pedazos en vez de cargar la skill perdió un día entero y ~USD 5
(`ai-generations/2026-09-20_formatos-catalogo/ESTADO.md`).

## Los DOS registros. Saber en cuál estás ANTES de juzgar

🔴 **Efeonce tiene dos registros visuales y el canon V1 escribió sólo uno** **[medido 2026-09-21]**. Juzgar una
pieza con la barra del otro es lo que produce la sensación del operador de que «el lenguaje me limita».

| | **A · DOCUMENTAL** «el oficio a la vista» | **B · PUESTA EN ESCENA** |
|---|---|---|
| Qué es la foto | **ES** el mensaje: obra, mecanismo, personas decidiendo | **SOPORTE** de una idea: composición armada, sujeto centrado, fondo controlado, aire para el titular |
| Barra | los **siete criterios** completos: sustitución · obra · mecanismo · idea · 3 modos y 390 px · verdad operativa · paleta en la composición | propia: idea clara · marca sostenida · texto legible · identidad y colorimetría intactas |
| ¿Mira al lente? | **Nadie mira al lente** | **El sujeto SÍ mira al lente** |
| Para qué | credibilidad: sitio, piezas de equipo, «esto es lo que hacemos» | que la idea entre en dos segundos |
| Evidencia | `F-podcast-v1.png` (la escucha) · `E-estudio-v2.png` (el estudio en operación) | «¿Claude o Codex?» · KV de Clawd · `copiloto` · `G-podcast-v5.png` |

🔴 **El lenguaje completo del registro C vive en [`EFEONCE_PHOTO_REGISTER_C_V1.md`](../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_C_V1.md)**
— elenco, escala, palancas, lechos con cámara baja, la capa gráfica y las dos trampas medidas: **el azul ajeno**
(una criatura de partner en cuadro se queda con el sistema de color: con Codex, medido, el único azul de la pieza
era de OpenAI. Con **Gigi es peor y la regla cambia**: no «porta un color», **es el espectro completo de Google**
—rojo, azul dominante y verde-lima—, así que buscar otro portador es competir contra un degradado de tres colores
y perder. La regla correcta es **la criatura como único acento de color, y Efeonce en el navy y en la
estructura**) y **la contaminación del emblema**.

🔴 **El lecho de la firma lo mata el REFLEJO, no la luz directa** **[medido 2026-09-22]**. Una vitrina de
museo sobre un **plinto de aluminio cepillado claro** dio la firma en **3,55:1** con el LED ya apantallado
hacia adentro y el suelo declarado en sombra: lo que contaminaba era el **reflejo especular del plinto en el
piso**, justo bajo la firma centrada. Cambiar sólo el MATERIAL del plinto —a acero negro mate, no
reflectante— llevó la firma a **19,69:1** sin tocar luz ni encuadre. ⚠️ **`foto:validar` medía 3,03 y 3,86
en dos pasadas sin decir por qué**; el número que importa lo da `foto:componer:cta`, que mide bajo la caja
real de la firma y sobre el trazo del logo (el gate exige ≥ 4,5:1 en ambos). **Regla: cuando el lecho falle y la luz ya esté fuera de él, sospecha de una superficie
CLARA cerca — el reflejo llega donde la luz no.**

✅ **Y el mismo fix apaga el tinte azul de las sombras** **[medido 2026-09-22 en los 9:16 de la misma serie]**.
Un torniquete con pedestales de aluminio cepillado dio **lecho 3,33 ✗ y b\* −15,6 ✗** a la vez; pasar el
pedestal a **negro mate** —sin tocar luz, encuadre ni fuente— lo dejó en **lecho 12,07 ✓ y b\* −1,7 ✓**.
🔴 **Contraintuitivo y por eso vale escribirlo: el culpable NO era la fuente azul.** Con una sola luz
azul-blanca en sala negra, la tentación es concluir que las sombras salen azules por física y dejarlo pasar;
lo que las teñía era el **derrame rebotando en el metal claro**. El formato alto lo agrava porque hay más
área de sombra y el promedio del cuartil oscuro se corre. **Dos reservas que fallan juntas suelen tener UNA
causa: busca la superficie clara antes de tocar la luz.**

🔴 **Tercera trampa, medida el 2026-09-22: la criatura cálida arrastra la pieza a los ochenta.** Es el reverso
exacto del azul ajeno. Con **Clawd** (naranja terracota) en cuadro y la escena callada sobre temperatura, el
modelo armoniza toda la iluminación hacia **tungsteno ámbar** y la pieza sale con look retro — envejecida,
analógica, lo contrario de un servicio que habla de motores de respuesta. **El validador la da por buena**: las
reservas pasaron 5/5. Se contrarresta declarando el frío del cuadro de forma explícita y negando el cálido por
su nombre; con **Codex** (azul) el problema no aparece, porque su acento ya empuja hacia el navy del sistema.
**Regla corta: si la criatura es cálida, la temperatura del cuadro se declara — el silencio la envejece.**

🔴 **Hay un TERCER registro desde el 2026-09-21: C · «la respuesta a la vista»** — el sujeto es **la respuesta
de la máquina y quién la da**, sin personas del equipo. Nació porque las cinco piezas con persona de los ads del
grader **fallaron la prueba de significar sin titular**: la foto muestra al proveedor, el titular habla del
problema del cliente y **el actor del problema no estaba en cuadro**. Es el registro de SEO, AEO, visibilidad y
datos, donde la persona no porta el mensaje. Barra, palancas (`ausencia`, `variantes`, `descarte`, `proyeccion`)
y el límite de IP de las criaturas de terceros: [delta 2026-09-21 (tarde)](../../docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#delta-2026-09-21-tarde--tercer-registro-c--la-respuesta-a-la-vista).
**`copiloto` NO es de C**: exige que la criatura se pose sobre una persona.

**Mirar al lente es el marcador visible del registro**: es la forma más rápida de saber en cuál está una foto
antes de juzgarla con la barra equivocada.

🔴 **Caso fuente:** «¿Claude o Codex?»
(`ai-generations/2026-09-17_claude-o-codex/out/claude-o-codex-4x5-1080x1350.png`) está **publicada, aprobada y
funciona**, y **NO pasa la barra documental** **[medido]**: no hay obra, no hay mecanismo y el test de sustitución
queda **parcial** —lo anclan las mascotas de partner y el polo—. No es una excepción ni un error: **es el otro
registro**, que existía de facto y no estaba escrito. Lo mismo el KV de Clawd y la pieza `copiloto`.

**Qué COMPARTEN los dos, sin negociación:** identidad y set de referencias · código de vestuario por registro de
escena · el bloque de realismo («no se siente IA», sin suciedad) · **la colorimetría entera** (sin grade, sin navy
en ropa grande, sin paneles azules de fondo, lámparas prácticas apagadas, acento 1 de cada 2) · la firma · **las
seis reservas del plate** · **y el bloque de impacto**.

**Qué los SEPARA:** qué se fotografía · con qué barra se juzga · si el sujeto mira al lente · si lleva capa gráfica.

🔴 **El registro de puesta en escena TAMBIÉN lleva el bloque de impacto** **[decisión del operador, 2026-09-21]**:
«*la de puesta en escena necesito un poco las palancas del documental no? luz, etc etc etc impacto*». Un retrato
centrado bien expuesto y sin más **queda plano** (`G-podcast-v2.png`, correcta y plana, contra `G-podcast-v4/v5`).
Los tres que lo corrigen, medidos en la misma ficha: **luz con carácter** (llave dura y baja muy a la izquierda,
rasante, un lado del rostro en sombra abierta y la sombra de la nariz legible en la mejilla; **segunda fuente
detrás y baja** que recorta rim en pelo, hombro y micrófono y separa de la pared) · **atmósfera** (`bruma`, con el
haz de la contra visible cruzando la sala; el haz, su resplandor y **cada mancha que proyecta** quedan **bajo la
mitad del cuadro**) · **tres planos** (primer plano desenfocado · sujeto nítido · al fondo, fuera de foco, un
segundo brazo con pop filter tomando el rim).

**Contradicción documental abierta [pendiente]:** el canon declara que **la capa gráfica sobre la foto NO está
aprobada** (2026-09-19) y **todas las piezas publicadas del registro B la usan** (titular, cursores, bounding box,
chip). O se aprueba, o se declara que esas piezas viven bajo otro contrato.

**El podcast, medido:** las dos piezas previas fallaron —`rondas/paleta/P2-podcast` **rechazada** por lámparas
prácticas encendidas (**b\* de altas luces +20,1**, look de podcast de stock) y `rondas/personas/JN2-podcast`
marcada por **paneles azules grandes de fondo**—, pero la causa común es más profunda que la luz: **las dos
fotografían la CONVERSACIÓN**, dos personas simpáticas hablando en una mesa, que es genérica y **falla el test de
sustitución**. Ninguna fotografía el oficio. La solución documental fue fotografiar **la ESCUCHA**
(`F-podcast-v1.png`, palanca `escucha`): el sujeto no habla, el otro existe pero es **sólo una mano fuera de
foco**, y el mecanismo está a la vista (micro de brazo entrando por el borde, forma de onda en el laptop, LEDs de
nivel, fieltro acústico). Con las dos causas del rechazo cerradas y medidas: **b\* −0,3** contra los +20,1, y
ningún panel azul — el azul entra sólo por el polo, que es el portador legítimo.

### 🔴 La prueba dura del registro B: **significar SIN titular** [medido 2026-09-21]

Una pieza de puesta en escena **debe entenderse sin el titular**. Si necesita el texto para que se entienda, **la
idea no está en la foto y la pieza no está resuelta** — el titular estaría cargando lo que la imagen no logró.
Probado con tres piezas, cada una con su palanca: `J-pov-v1` (`pov`) = **te estoy hablando a ti** · `K-larga-v1`
(`larga-exposicion`) = **el que no se mueve** · `L-proyeccion-v1` (`proyeccion`) = **estoy dentro de mi trabajo**.
La que cerró **5 de 5 reservas**, primera de toda la tanda: `H-julio-v1`.

### 🔴 Qué palanca sirve en qué registro **[criterio]**

**El marcador de la mirada al lente ordena el catálogo entero.** Antes de elegir palanca, sabe en qué registro
estás:

| | Palancas |
|---|---|
| **Nativas de B** — la mirada al lente la justifica la palanca misma | `pov` (la cámara ocupa el asiento del cliente: no «mira al lente», **te habla a ti**) · `oclusion` (algo cubre un tercio y el sujeto sigue mirando; **el objeto que ocluye puede ser el lecho**) · `fragmento` (crop extremo del rostro: la que más golpea a 390 px) · `copiloto` (nació en B) |
| **Se adaptan bien a B** | `larga-exposicion` · `reflejo` · `proyeccion` · `instrumento` · `cenital` · `suelo-oblicuo` · `atraviesa` |
| **Sin personas y aun así B** | `variantes` (la decisión como sujeto) · `descarte` · `ausencia` |
| 🔴 **Incompatibles con B, por construcción** | `escucha` —**el sujeto no mira a nadie: está recibiendo**, documental puro— más `manos`, `sombra`, `silueta`, `marcado` y `quien-sostiene`: **pierden el marcador de la mirada** |

**Las incompatibles NO están prohibidas** en una pieza de campaña. Pero si las usas, **la pieza ya no se juzga
con la barra de B** — se juzga con la documental. Decídelo antes de generar, no al revisar.

**Lo que NO consume la cuota de palanca** (varía libre): formato (9:16 story · 16:9 portada) · cuántos (una
persona, dos, persona + mascota de partner) · prenda por registro de escena · atmósfera (`polvo`/`bruma`/`vapor`/
`humo`) · con o sin capa gráfica encima.

## Los tres comandos. NUNCA a mano

```bash
pnpm foto:doctor                    # ¿puede esta máquina generar? seis chequeos, sin costo
pnpm foto:prompt <ficha.json>       # arma el prompt desde la ficha
pnpm foto:validar <plate.png>       # mide las seis reservas sobre el plate limpio
pnpm foto:componer <piezas.json>    # la CAPA GRÁFICA encima: voces, selección AXIS, firma y QA
pnpm foto:componer:cta <plan.json>  # pieza CON CTA: compone y emite su QA con huellas (out/qa-<plan>.json)
pnpm foto:cta:gate <plan.json>      # la certifica: 0 certificado · 1 falla · 2 uso · 3 NO certificable (no es pase)
pnpm foto:emblema <plate.png>       # amplía el bordado para mirarlo al 100% (no decide: quita la excusa)
pnpm foto:lanyard --nombre … --cargo … --foto …   # arma el lanyard determinístico; el modelo sólo lo termina
```

**Piezas con CTA: `foto:componer:cta` + `foto:cta:gate`.** Contrato:
[`EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md`](../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) (§16–§18);
oficio y receta del plan en la skill `efeonce-advertising-creative`. Lo que un agente no puede saltarse:

- **Sólo la salida 0 certifica. Un 3 («no certificable») NUNCA es un pase:** se resuelve recomponiendo o con
  `pnpm foto:cta:gate <plan> --reproducir`; una pieza con gesto manuscrito o tarjeta no se certifica.
- **Plan nuevo:** `safeArea: "axis"` · `cta.x: "columna"` (sólo con alineación a la izquierda) · firma declarada
  (`logo: { width: 0.2, x: 0.5, y: "auto" }` o `firma: { modo: "externa", razon }`) · `lead` y `after` · `altText`
  que describe la escena sin transcribir el copy (el texto alternativo completo lo escribe el compositor).
- **Excepciones:** una regla en una pieza, con `aprobadoPor` de `scripts/foto/aprobadores.json`, `plate` (sha256) y
  `hasta` si la regla se mide. **Nunca inventes un aprobador** ni copies el de la suite. `placement` sólo endurece.
- **Si tocas el compositor o el gate:** regresión (`pnpm foto:componer:cta:regresion`), pruebas
  (`pnpm foto:componer:cta:pruebas`) y, por cada guarda nueva, un mutante que alguna prueba detecte
  (`pnpm foto:componer:cta:mutantes`). Cambiar fuentes o logos cambia la huella del comando: las piezas ya compuestas
  salen con 3 hasta recomponerlas. Nunca compongas en la carpeta de otra sesión para «probar»: usa una copia temporal
  (dos composiciones en la misma `out/` no se mezclan: la segunda se rechaza).

🔴 **Para un AD con titular, los valores por formato ya están medidos — no los redescubras.**
[`RECETA-POR-FORMATO.json`](../../ai-generations/2026-09-21_ads-brand-visibility/RECETA-POR-FORMATO.json)
trae `top`, `textWidth`, tamaños de las tres voces, gaps, anclas de cursores y firma para **4:5, 9:16 y
16:9**, listos para copiar y cambiar sólo el copy y el plate. El porqué de cada número y las seis trampas
medidas están en el [método de producción](../../docs/operations/social/2026-09-21-ads-brand-visibility-production-method.md).
🔴 **La regla de las tres veces:** el **dominante mide al menos 3× la entrada**, o la jerarquía se aplana
—medido en cuatro versiones de la misma pieza: a 2,8× el operador la rechazó, a 4,0× la aprobó—. Ya está
cableada en `foto:componer`, que imprime el ratio y avisa bajo 3×; en `foto:cta:gate` **bloquea**, igual que un
dominante que no es la voz mayor (sólo se exceptúa con excepción auditada `jerarquia`). Es condición **necesaria, no
suficiente**.

Tres que muerden siempre: el **dominante va en 1–3 palabras con un CIERRE que remata** (meter la frase
entera lo aplana), la **entrada es Bricolage** (el default del compositor es Poppins) y el **colaborador va
en `bottom-end`** — en `top-end` su etiqueta cae sobre la entrada y se come el nombre propio, con
`withinCanvas` en `true`. **1:1 no se usa: está `sinValidar`.**

**Dos categorías de pieza, y la diferencia se decide ANTES de generar:**

| | Pieza **muda** | Pieza **con voz** |
|---|---|---|
| Qué lleva | Sólo foto + firma | Titular, copy, cursores, selección |
| Para qué | **Descanso visual**: relaja el feed | Dice algo concreto |
| Reserva | No necesita | **Obligatoria, declarada en la toma** |
| Cómo | `foto:prompt` → `foto:validar` | `foto:prompt` con `reservas` → `foto:validar --zona-texto` → `foto:componer` (con CTA: `foto:componer:cta` → `foto:cta:gate`) |
| Estado | **aprobada** | **capa SIN aprobar** (2026-09-19); el CTA funcional sí está aprobado ([Tres voces + acción](../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md), 2026-09-22) |

**NUNCA escribas un compositor nuevo.** `foto:componer` es el de «Nivel de búsqueda» con su gramática de voces
intacta; escribir otro ya se intentó y el operador rechazó las piezas enteras. Con CTA, el canónico es
`foto:componer:cta`: copiarlo a una carpeta de corrida reintroduce las copias que divergen (contrato §5).

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo compartido sin que nadie lo viera. El comando resuelve desde tablas:

| Campo de la ficha | Qué resuelve |
|---|---|
| `formato` | tamaño, % del lecho y límite de sujetos, de UNA tabla |
| `identidad` | bloques `IDENTITY` + `REFERENCES` verbatim, con **vista por ángulo** (`{ persona, vista }`) |
| `objetos` | kits de marca como **referencia de forma** (logo, mascota, prenda, merch), numerados tras la identidad |
| `palanca` | **una sola** de las **24 de encuadre** → [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) |
| `atmosfera` | `polvo` · `bruma` · `vapor` · `humo` — aire con materia que hace visible la luz. **Exige haz** |
| `suspendido` | qué está congelado en el aire |
| `lecho` | objeto y **tono declarado** del primer plano desenfocado |

## Reglas duras que el comando ya hace cumplir (no las repitas a mano, no las esquives)

- **Identidad:** el set de Julio es `2026-09-20_identidad-julio-nexa/refs-aprobadas/` (+ 6 ángulos derivados).
  El set viejo de `2026-09-17_equipo-vestuario/` **idealizaba el rostro** y arrastraba deriva.
- 🔴 **Dos identidades conviven bajo el nombre «Nexa». La canónica es la A** **[decisión del operador, 2026-09-21]**.
  Conviven **dentro de la misma carpeta** `01. Avatar/`: los bustos con hoodie son **A** (la del KV «Tu IA no conoce
  tu negocio», aprobado el 2026-09-17); los `hf_*` con blazer son **B** (la del turnaround de 9 vistas, `Poses y
  expresiones/` y `Vestuario/`). Las separa la **estructura** —óvalo, cejas, labios, delineado con rabillo—, **no el
  iris**: medido **A rgb(64,49,34) · B rgb(51,43,36)**, y dentro de una misma cara el iris varía más por LUZ
  (rgb(47,37,27) en sombra contra rgb(95,67,53) iluminado, el mismo ojo) que entre las dos identidades. **Verifica
  cuál estás usando antes de anclar una pieza:** generar con una y validar contra la otra costó ~20 pasadas, con el
  QA diciendo «la identidad coincide» mientras el operador veía que no.
  **Cerrado el 2026-09-21** (commit `94e8704b5`): Nexa ya tiene sus **seis vistas** en
  `set-identidad/angulos/` y el bloque `nexa` quedó con **una sola identidad**. 🔴 **El número del iris es una
  REFERENCIA, no un QA automático**: muestrear una coordenada fija cayó en piel o pupila en **3 de 5** salidas;
  el punto se ubica mirando la ampliación del ojo. 🔴 **La convención de nombres de las vistas dice hacia dónde
  GIRA la persona, no qué lado se ve**, y se dedujo de las imágenes: el prompt `_edit-perfil.txt` de Julio se
  contradice solo, así que documentarla leyendo ese prompt la deja al revés.
  **Consecuencia:** el set de ángulos se construye **editando desde `nexa-avatar-34-v2`**, no recortando el
  turnaround, que es B; y `nexa-the-point` y `nexa-the-breakdown` son B, así que **no pueden estar en `refs`**
  del bloque `nexa`. B no se borra: queda como **banco de material** —poses, vestuario, escenarios, gesto—,
  todo lo que NO sea rostro.
  🔴 **Home canónico de Nexa: `ai-generations/_identidad-nexa/`** (`1-anclas/`, `2-angulos/`, `3-poses/`,
  `4-vestuario/` y un LEEME que explica las dos identidades). **No es una carpeta de corrida**: las carpetas
  fechadas son **histórico**, y el catálogo de `build-prompt.mjs` apunta **sólo ahí**. Busca a Nexa ahí primero.
- 🔴 **Antes de reconstruir un encargo de memoria, busca el brief de la pieza aprobada equivalente.** El del KV estaba
  guardado en `ai-generations/2026-09-17_kv-tu-ia-no-conoce/brief/plate-kv-4x5.prompt.txt` y no se leyó: traía
  resueltos el encuadre, la escala de la mascota (20 % del ancho), el lente y la pose.
- 🔴 **Antes del prompt, abre el `LEEME.md` y el manifiesto del kit de la prenda.** El manifiesto declara
  `cuando_usarla` por vista: la variante se elige por el **rol de la escena** (la gorra de terreno es la trucker,
  no la del sitio). **El tipo de marca va por VARIANTE, no por kit** —una prenda puede existir con logotipo y con
  isotipo, y la trasera puede no llevar marca—. Si el kit trae **pruebas en persona**, ésas son el punto de
  partida. El 2026-09-20 se falló tres veces seguidas teniendo las tres respuestas en el LEEME.
- 🔴 **Al declarar `objetos` con una PRENDA, carga primero**
  [`garment-reference-kit.md`](../skills/greenhouse-ai-image-generator/references/garment-reference-kit.md):
  tiene la geometría verbatim del emblema (se espeja: 6 de 21 vistas del polo volvieron invertidas), cómo se
  pide un bordado (`satin-stitch`, no tinta plana), que el emblema **no se redimensiona**, y que **vestir a una
  persona real exige una foto de CUERPO ENTERO** además del rostro. Reconstruirlo de memoria costó una jornada
  el 2026-09-20 y el resultado fue un emblema inventado en cinco piezas.
- 🔴 **Una criatura de partner en cuadro CONTAMINA el emblema del uniforme** **[medido 2026-09-21, 4 pasadas]**.
  Con la figura de Codex grande en cuadro, la primera pasada bordó **la nube con `>_` de OpenAI en el pecho de
  Nexa**. Y el remedio intuitivo —describir nuestro emblema para desambiguar— **lo inventa**: pasada 2 dio un
  cohete genérico de una ventana, pasada 3 unas alas. Describir el logotipo lo tergiversa, igual que en el
  lanyard. **Lo que funcionó**: nombrar el símbolo de la criatura como PROHIBIDO en la ropa (*«the creature's
  cloud body and bracket symbol belong ONLY to the creature»*) **sin describir el nuestro**, dejando que la
  referencia del kit mande. La cuarta pasada devolvió los cuatro elementos —nave, tres ventanas, órbita, esfera—.
  Verificar siempre con `pnpm foto:emblema` y comparar contra el macro del kit.
- 🔴 **A la altura de la mesa, el canto de la mesa NO sirve de lecho** **[medido 2026-09-21: 2,98 y 1,75]**.
  Con la cámara al nivel del tablero, el borde cercano recibe la luz rasante y queda gris. Es el mismo hecho que
  el canon ya fija para el retrato 4:5, aquí con la cámara baja. **Pero la reserva de lecho se mide como BANDA y
  la firma se mide bajo SU caja**: la misma pieza dio banda 1,75 ✗ y **logo 9,82 ✓**, porque la firma centrada
  cae en la zona en sombra. Si la banda falla, mide el logo antes de descartar la pieza.
- 🔴 **El emblema bordado NO se genera.** Medido 2026-09-20: tres prendas dieron **tres emblemas distintos y
  ninguno era el de Efeonce** (una espiral, dos barras, otras dos). Es el mismo hecho que gobierna la firma. En
  orden: que **no se lea** (de espaldas, en sombra, pequeño) · **componerlo** después · **editar con máscara**.
  **NUNCA** publicar el emblema tal como sale del generador, y **NUNCA** cerrar sin `pnpm foto:emblema`: el QA
  sobre una hoja de contacto no sirve, a 520 px un bordado no se lee y pasa por bueno.
- 🔴 **La técnica de aplicación de marca la decide la TELA, no la costumbre del kit** **[operador, 2026-09-21]**:
  «*esa tela se borda no se estampa*». **Softshell y chaquetas técnicas → bordado** (la serigrafía sobre tela
  técnica se agrieta y se despega) · **piqué → bordado** (ya lo era) · **algodón afelpado del hoodie → abierto**,
  lo decide el operador. **El error venía del MANIFIESTO, no del prompt**: las cuatro vistas de espalda de la
  softshell declaraban «la estampa canónica» mientras el polo ya recibía su espalda bordada. Por eso, **antes de
  generar cualquier vista de una prenda, verifica qué técnica declara su manifiesto; si contradice la tela,
  corrígelo ANTES de generar** — generar sobre un manifiesto equivocado propaga el error a todas las vistas.
  **[pendiente]** sólo está corregida `02-espalda` de la softshell (`v02`,
  `ai-generations/2026-09-21_espalda-bordada/`); el resto de espaldas de **softshell y bomber** siguen estampadas.
- 🔴 **Editar con otro aspect ratio REENCUADRA: el sujeto cambia de escala** **[medido 2026-09-21]**. No
  recorta ni rellena. Medido editando un ancla de 2560×3200 (**4:5**) con `--size 1024x1536` (**2:3**): la
  cabeza pasó de ~30 % del alto a ~38 % y los hombros de ~45 % a ~55 % — el operador lo vio a ojo («parece una
  cabeza de caballo») antes que cualquier medición. **Muerde siempre** porque los tamaños del modelo son 1:1,
  2:3 y 3:2, y **4:5 no está entre ellos**: es el formato de los plates y de las anclas, así que editar
  cualquiera cae en el agujero **sin que nada lo avise** — vuelve con buena pinta y el sujeto adentro es otro.
  Es primo del caso del lanyard (el archivo bueno existía y el catálogo servía el viejo) pero peor: aquí no
  hay archivo bueno, lo que vuelve está mal y parece bien. **Receta:** padear a 2:3 **espejando los bordes**
  (un pad sólido invita al modelo a rellenarlo con invento), editar declarando en el prompt que esas bandas
  son padding, y recortar de vuelta. Detalle en `EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`.
- 🔴 **Realismo NO es castigo** **[medido 2026-09-21]**. El operador rechazó la primera receta de piel real
  porque «la envejeció mucho y la puso un poco fea»: pedir rojeces, manchitas, brillo disparejo y líneas de
  expresión produce una persona de 40 años, manchada y cansada. **Lo que hace humana a una cara son poros
  IRREGULARES y vello facial fino**, no imperfecciones. La receta aprobada (v3) pide la textura **sólo** de
  poros y vello, con tono **parejo**, piel sana y luminosa, sin rojeces ni ojeras, frente **lisa en relieve**,
  y **luz de ventana CON relleno** — una sola fuente sin rebote marca las sombras y suma años. Y **más
  resolución no es más fidelidad**: a 2560×3200 el modelo inventa el detalle de poros que el maestro de
  1024×1536 no tiene, así que hay que verificar al 100% contra el maestro. Costo: `max` a 2560×3200 son
  **USD 0,565** por imagen, diez veces una de 1024² en `high`. Receta completa y las tres iteraciones:
  `ai-generations/_identidad-nexa/LEEME.md`.
- 🔴 **Para vestir a alguien con material de otra identidad, injerta el rostro; no describas el pelo**
  **[medido 2026-09-21]**. Imagen 1 la escena original, imagen 2 el ancla de identidad, y se pide cambiar
  **sólo los rasgos de la cara** conservando pose, gesto, vestuario, fondo y luz. Aguantó los casos difíciles
  (risa con ojos cerrados, boca abierta, mano ocluyendo el mentón). **Trampa:** pedir «cambia cara **y pelo**»
  y describir el pelo del ancla **suelta los recogidos y borra las gafas** — cinco piezas de home office
  salieron sin moño ni montura. Hay que declarar que el peinado y los accesorios se conservan de la imagen
  original.
- 🔴 **La marca se pierde por el ENCUADRE, no por la referencia** **[medido 2026-09-21]**. Si el emblema, la
  cinta del lanyard o el carnet quedan chicos en el cuadro, el modelo los sustituye por una mancha con forma
  parecida **aunque la referencia oficial esté entre las imágenes de entrada**. Prueba controlada sobre la
  MISMA ficha, la MISMA referencia y las mismas cinco imágenes, cambiando una variable por vez: plano medio
  con dos personas + `high` → cinta sin una letra y carnet ilegible; **plano corto (chest-up) + `high`** →
  «Empower your Growth», «efeonce», y el carnet con cabecera, foto, «Nexa» y «AI Specialist»; plano corto +
  `xhigh` → igual, con el remate algo más limpio. **Manda el encuadre: subir la calidad sin cerrar el plano
  no arregla nada y cuesta más.** Umbral orientativo medido sobre los recortes: la cinta falla a ~12 px de
  ancho y se lee a ~40 px; el carnet falla a ~38 px de alto y funciona a ~100 px.
  **Regla: si la marca tiene que leerse, el encuadre se decide por ella.** Si la escena exige un plano
  abierto, entonces sí corresponde el otro camino — que no se lea (de espaldas, en sombra, pequeña; la
  palanca `proyeccion` lo resuelve por construcción) o componerla encima.
  Esto **reconcilia** dos cosas del canon que parecían chocar: el manifiesto del lanyard dice que el arte
  plano falla, y las vistas de espalda del mismo día salieron exactas **con** arte plano — aquéllas son
  vistas de kit, donde la estampa ocupa medio cuadro. Es el mismo hecho visto desde el otro lado.
  Caso fuente: `ai-generations/2026-09-21_nexa-uniforme-terreno/LEEME.md`.
- 🔴 **`vista` es CONSTRUCCIÓN; `puesta` es ESCENA** **[medido 2026-09-21]**. Pedir `vista: 'espalda'` devuelve la
  prenda **aislada**, y sin vista se cae siempre en el asset de uso **frontal**: una escena de espaldas no tenía
  forma de pedir su referencia. Resultado medido en `ai-generations/2026-09-21_ads-brand-visibility/`: la pieza
  salió con un **isotipo suelto inventado** donde la espalda del kit lleva el **logotipo completo + «Empower your
  Growth»**. Se pide `{ objeto: '<kit>', puesta: 'espalda' | 'espalda-mujer' | 'frente-cuerpo-b' }`. Las doce
  vistas puestas de bomber, softshell, polo y hoodie ya son direccionables y están selladas (`usoPorVista` entra
  al lock como cuarta forma de declarar la pieza puesta). **El conteo honesto del hueco:** de ~19 vistas puestas
  existentes había **6 direccionables**; el resto del banco (macro, plano, percha, doblado, detalle) es de
  **producción del kit y NO aplica a una escena** — no era un hueco de 137 archivos, era de 13, pero eran los 13
  que se usan con una persona en cuadro.
- 🔴 **Un kit que entrega en otra resolución es INVISIBLE para el catálogo** **[medido 2026-09-21]**. El
  lanyard determinístico se entregó como `1024x1536` y el `patron` del kit está fijo a `1200x1600`: el
  nombre nunca calza, así que las vistas 14 y 15 no podían declararse en `vistas` aunque existieran en
  `final/`. Por eso el lanyard existía desde esa misma mañana y una sesión lo «redescubrió» por la tarde —
  **no fue descuido de quien lo produjo**. **Cerrado el mismo día en el MECANISMO**: una vista puede
  declararse por nombre completo con **`vistasPorNombre`**, que gana sobre el `patron`. El hueco era más
  ancho de lo reportado — le pasaba igual a la **espalda bordada de la softshell** (`1024x1024`, `v02`),
  que existía en `final/` mientras el catálogo seguía sirviendo la estampada. Al agregar una vista a un
  kit, **verifica que el nombre calce con su `patron`**; si no calza, decláralo en `vistasPorNombre` —
  nunca dejes el archivo bueno en la carpeta esperando que alguien lo encuentre.
  **Cerrado también el sellador**: `rutasDeclaradas()` recorría sólo `objeto.patron`, así que ni
  `assetDeUso`, ni `usoPorPersona`/`usoPorColor` —la pieza PUESTA, la que viaja a la escena—, ni las
  vistas de `patronPorColor` entraban al lock; sustituir cualquiera de esos archivos no despertaba
  ningún gate. Hoy sella **las cuatro formas** en que un kit declara un archivo: **66 → 79 assets**.
- **Código de vestuario Efeonce** **[operador, 2026-09-20]**: la prenda dice el REGISTRO de la escena.
  **Polera piqué** = oficina casual · **Chaqueta** = reunión o instancia importante · **Gorra + polo** = terreno ·
  **Hoodie** = terreno · **Lanyard y carnet** = transversales, van en casual y en formal por igual. Se elige por
  el registro de la escena, NUNCA por variedad visual: una reunión importante en hoodie dice lo contrario de lo
  que la foto cuenta.
- 🔴 **Una referencia que no se usa NO avisa** **[medido 2026-09-21]**. Con DOS personas el cupo baja a 2 por
  cabeza y recortaba **por orden de lista**: Julio se quedaba sin cuerpo entero siempre (sus dos primeras son
  de rostro) y Nexa lo perdía al pedir una vista. El modelo **inventaba la silueta y la pieza salía igual**.
  Hoy cada persona declara `cuerpo:` y esa referencia viaja siempre que quepa; si la vista YA es de cuerpo
  entero, el cuerpo frontal no se añade (dos cuerpos sin rostro cercano hacen derivar la cara).
- 🔴 **Antes de construir, busca si ya existe.** Tres casos medidos el mismo día: el brief del plate aprobado
  (`2026-09-17_kv-tu-ia-no-conoce/brief/`) costó ~20 generaciones; un turnaround de Nexa con 9 vistas se iba a
  rehacer desde cero; y el `tipo: rostro|cuerpo` del `MANIFIESTO.json` existía sin que el código lo leyera.
  **Reconstruir de memoria es el error más caro de esta jornada.**
- **`ignore their clothing` NO alcanza:** con identidad, **declara el vestuario en la escena** o el modelo copia
  la ropa de las referencias. El comando avisa.
- **Editar conserva, generar reconstruye.** Para un ángulo nuevo de una persona, **edita su foto aprobada**;
  generar desde cero redondea el rostro (cuatro iteraciones lo probaron).
- **Retrato: 85 mm f/2, nunca 35 mm de cerca** **[del brief aprobado]**. El gran angular a distancia de retrato
  **ensancha y distorsiona el rostro**: parte de lo que se lee como «no es ella» es el lente, no deriva de identidad.
  La pieza aprobada es *chest-up medium close-up, 85 mm f/2*.
- 🔴 **La cabeza casi no gira: giran los ojos.** Pedir «gira la cabeza hacia el hombro» es pedir un **tres cuartos
  marcado**, y **pedir un ángulo que el set de referencias no cubre hace que el modelo reconstruya el rostro**. En la
  pieza aprobada la cabeza está casi frontal y **sólo los ojos** van hacia la mascota. Marcadores del casi-frontal:
  **ambos** ojos y **ambas** cejas visibles, ambas mejillas visibles, la oreja lejana **en cuadro**, el puente de la
  nariz **NO** corta la mejilla lejana.
- 🔴 **La mirada muy descendida destruye los ojos** **[medido 2026-09-21]**. Con la cabeza en tres cuartos y la mirada
  muy abajo, el párpado superior baja con el globo ocular y **devora el iris**; el ojo lejano queda como **ranura sin
  globo**. Editar «cejas altas» sobre esa pose **lo empeora**: sube la ceja y no reconstruye el párpado. Marcadores de
  ojo que sí funcionaron: el iris del ojo cercano **como círculo completo**, nunca media luna recortada por el
  párpado; **esclerótica visible a ambos lados**; el párpado superior por encima del iris con **su pliegue como línea
  propia**; línea de pestañas como **borde oscuro definido**, nunca fundida; el ojo lejano **abierto con su propio
  iris**, nunca una ranura oscura.
- **Marcadores verificables, no magnitudes.** «Gira 45 grados» da una cabeza inclinada; «la oreja lejana no se ve,
  el puente de la nariz corta la mejilla lejana» da el tres cuartos real. El casi-frontal se pide con los marcadores
  **inversos** (ver arriba), y antes de pedir cualquier giro, revisa si el set cubre ese ángulo.
- **Una palanca DE ENCUADRE dominante por pieza.** Combinar dos las diluye: cada una pide el control de la escena.
  Las otras tres familias sí se combinan con ella: **34 palancas en total** —5 siempre activas (bloque de impacto,
  incluido el sistema de color) · 4 atmósferas · 1 acción suspendida · **24 de encuadre**— más las **20 tomas de
  cámara** (ojo de pez, dron, tilt-shift, contrapicado, macro, tele, barrido…), que dicen *con qué* se fotografía
  y **no** son palancas. Índice: [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md).
- **La atmósfera exige un haz declarado** (el comando aborta sin él) y **la acción suspendida tiene dosis: 1 de
  cada 4 piezas** (el comando cuenta la tanda y avisa con el número).
- **El acento cálido también tiene dosis: 1 de cada 2** **[auditoría ciega 2026-09-20]**. El azul portador es
  estructura y va en TODAS; el acento es puntuación. Dos evaluadores ciegos lo contaron en 9 y en 12 de 12 y lo
  leyeron como un tic que delata que la serie se armó con una receta.
- **Si la pieza va a llevar titular, copy o cursores, declara `reservas` EN LA TOMA** y valida con
  `pnpm foto:validar <plate> --zona-texto`. Medido: las 12 piezas auditadas reprobaron la banda de texto (mejor
  caso 0,10 del alto contra 0,28 exigido) porque ninguna la declaró. **Reservar después de generar no existe.**
- **El texto de la escena EXISTE y es ilegible por causa física** (pequeño, fuera de foco, cortado, en ángulo),
  **nunca por estar en blanco**: doce piezas sin una sola letra delataron la generación (`bloque-realismo-v3`).
- **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra que esa luz deja, nunca en su camino.**
  Vale también para el **lecho**: medido, 3,16 → 3,93 → **11,55:1** sólo por sacarlo del haz.
- 🔴 **El haz que sube al tercio superior rompe la banda de texto** **[medido 2026-09-21]**. En la misma ficha, la
  reserva cayó a **0,06** y **0,22** del alto cuando el haz o la ventana alcanzaban el tercio superior, contra
  **0,30–0,36** cuando entraban bajo. Corrección que funcionó dos veces: declarar que la ventana, la diagonal
  iluminada y **cada mancha que proyecta** quedan **bajo la mitad del cuadro**, y que el tercio superior es un campo
  de azul tinta sin interrupción.
- 🔴 **Con fuente visible en cuadro, la lámpara se riggea BAJA** **[medido 2026-09-21]**. `luz-motivada` pide que la
  fuente sea visible y sea lo más brillante del cuadro; la reserva pide el tercio superior limpio. Con el softbox a
  la altura del pecho la banda midió **0,00** (inservible); riggeado **entre rodilla y pecho** —que además es como
  se ilumina de verdad un objeto pequeño— sube a **0,28**. **O lámpara baja, o no hay banda de texto.**
- 🔴 **En el retrato centrado 4:5 las dos reservas COMPITEN por el alto** **[medido en 3 pasadas]**: banda 0,22 ✗ ·
  lecho 2,45 ✗ | banda **0,30 ✓** · lecho 1,85 ✗ | banda 0,26 ✗ · lecho 3,72 ✗. Bajar al sujeto hace crecer la
  banda pero las manos y la mesa invaden el borde inferior y matan el lecho; subirlo hace respirar el lecho y mata
  la banda. **Ninguna combinación de encuadre cierra las dos.** Firmar sobre el muro **está descartado** aunque
  mida de sobra (el fieltro daba **13,9:1**): «*la puesta en escena también debe tener lecho igual que la
  documental*» **[decisión del operador, 2026-09-21]**. **La salida correcta es un objeto propio del oficio en
  PRIMER PLANO, fuera de toda luz** —no el canto de la mesa, que recibe relleno y queda gris—: el micrófono del
  invitado cruzando el borde inferior, desenfocado y fuera del alcance de la llave y del rim, dio **banda 0,34 ✓ y
  lecho 8,32 ✓ en la misma pieza** (`G-podcast-v5.png`). El lecho no es «la superficie de abajo»: es **un objeto
  del oficio puesto ahí a propósito y sacado de la luz**.
- **Nunca un scrim.** Si el contraste no da, se **regenera** el plate; no se oscurece en post. Desde el 2026-09-23
  (decisión del operador: «todo se genera desde el prompt») el compositor CTA **rechaza** `scrimTop`/`scrimBottom` al
  validar el plan.
- **El plate nace sin logo ni texto.** La firma es el SVG oficial compuesto después, **20% del lado corto del lienzo**
  (decisión del operador 2026-09-20), contraste ≥ 4,5:1 medido. En una pieza con CTA, `foto:cta:gate` lo exige —en la
  caja y, si el logo lo dibuja el compositor, también en su trazo; fuera del sujeto y dentro de la zona de AXIS— y la
  firma se declara siempre:
  `logo.y: "auto"` busca una Y legible sólo en la banda del pie, debajo de todo lo compuesto; `firma: { modo:
  "externa", razon }` si la pone otra herramienta; `sin-firma`, sólo con aprobador del registro.
  **En 16:9, 25 % del lado corto** en las piezas nuevas (decisión del operador del 2026-09-23: al 20 % la firma quedaba
  en ≈ 44 px en un teléfono, contra 78 px en 4:5); 20 % en verticales y cuadrados. Las piezas ya hechas no se regeneran.
  En una pieza nueva con CTA, además, el texto respeta el piso de legibilidad en el teléfono (CTA 11 CSS px, las demás
  voces 9), que en 16:9 pide un texto mucho más grande: cerca del 57 % izquierdo del ancho, contra el 42 % que reserva
  hoy `foto:prompt` (pendiente de decisión; detalle en la reserva del plate, delta 2026-09-23).
- 🔴 **Al ubicar o MOVER la firma, mírala al 100 %: su caja tiene que caer DENTRO de la materia calma del lecho, nunca
  sobre su canto** **[medido 2026-09-23]**. El canon ya lo pedía («nunca por encima o montado en el canto»,
  [Tres voces + acción](../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md#corrección-de-lecho-y-firma-v07))
  y volvió a pasar al **mover** la firma. Al subirla a la zona de AXIS en las stories de v07 («Que te elijan»: centro
  85,65 %, caja 1619–1670 px de 1920), en `04-elegida-916` quedó sobre el **canto iluminado** del lecho, junto a un
  apoyabrazos cromado desenfocado —el canto iba de y≈1394 a 1420 en el plate de 941×1672 y cruzaba la caja
  (1418–1452 en el plate)—, **con el contraste medido pasando: 6,53:1**. La revisión visual dijo que la firma «se apoya
  en la materia desenfocada del lecho»; lo vio el operador. Se miró el número, no el pie al 100 %. Con la firma dentro
  de la materia (no se movió: se subió el lecho), el mismo logo mide **11,58:1**. Es el complemento de «si la banda
  falla, mide el logo» (arriba): un logo que pasa tampoco dice dónde cae su caja.
- 🔴 **La altura del lecho se MIDE en el plate contra la caja de la firma: la brief no la garantiza**
  **[medido 2026-09-23]**. La brief de ese plate pedía el borde superior del primer plano en y≈79–80 % («lowest
  fifth») y una zona calma en 82–85 % para la firma; el plate generado dejó el canto en ≈83–84 %, y nadie lo midió
  contra la caja. El choque apareció al subir la firma a la zona de AXIS. Antes de aceptar el plate —y cada vez que la
  firma cambie de posición— ubica el canto real (donde sube la luminancia) y compáralo con la caja de la firma en ese
  formato: en story con AXIS, la firma de 20 % pegada al límite inferior (87 %) ocupa 1619–1670 px de 1920
  (84,3–87,0 % del alto) y no puede bajar más.
- 🔴 **Si el lecho no alcanza la caja: sube el primer plano ENTERO como UNA capa rígida, lo que haría una cámara un
  poco más baja** **[medido 2026-09-23]**. Fue lo único que se vio natural en `04-elegida-916` (el operador: «Si, ahí
  si quedó bien») y es una forma de «elevar ligeramente el inicio del lecho» —criterio del operador para 9:16 en la
  [firma](../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md)— sobre un plate ya
  generado. **Alcance: es un arreglo para una pieza ya aprobada, con el visto bueno del operador; en una pieza nueva el plate se rehace con la reserva del lecho** ([regla 6 de la reserva](../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md): el plate se rehace, no se parcha al componer). Lecho y apoyabrazos subieron juntos 60 px del plate (69 en la pieza): lo cercano sube y el fondo no, como
  en un paralaje real. El corte va **pegado al borde del propio objeto y en zonas oscuras** —6 px sobre el canto del
  lecho, medido columna a columna; 4 px sobre el halo del apoyabrazos—, por **una curva suave** trazada sobre la
  medición de luminancia (sin escalones entre columnas) y con **10 px de fundido**; lo que falta al pie se completa
  estirando la franja inferior, que es desenfoque parejo. Sin IA y sin deformar la forma del canto: no pinta ni
  oscurece nada, mueve la materia de la propia foto. La firma no se movió y pasó de 6,53 a 11,58:1. Script:
  `ai-generations/2026-09-23_v07-lecho-04-elegida/subir-primer-plano-v4.cjs` (el halo del apoyabrazos y los rangos de
  búsqueda están medidos para ese plate de 941×1672: en otro se vuelven a medir). **Lo que NO funcionó, y por qué:**
  **inpainting con máscara sobre la franja** (GPT Image 2.5 Sunburst, `--mask`) — los dos candidatos llenaron TODA la
  zona editable con un panel oscuro plano, de borde superior recto justo en el límite de la máscara, y borraron el
  apoyabrazos: el modelo rellena la zona transparente entera con «el objeto» aunque el prompt pida conservar lo que
  queda sobre el nuevo borde, y se lee como un velo · **levantar sólo el centro del lecho** (deformación con caída +
  inpainting chico junto al apoyabrazos) — un montículo con un hombro artificial; el operador: «demasiado forzado» ·
  **mate por brillo** (mover sólo lo claro) — el apoyabrazos quedó semitransparente, como un fantasma, con un brillo
  naranja flotando suelto · **corte por envolvente ancha** — al separarse del objeto, arrastraba bandas de la manga y
  del pantalón y rompía su contorno y la esquina de la mesa (visible con el contraste aumentado).
- 🔴 **En un plate limpio, no sugieras criaturas ni siquiera de refilón** **[medido 2026-09-21]**. La frase «*as if
  something small were there asking her a question*» hizo que el modelo **materializara un robot blanco flotando**.
  Si la criatura se compone después, la mirada se describe como **geometría** y el vacío se **declara**: «*the air
  above that shoulder is EMPTY: no object, no creature, no robot, no toy, no figure*».
- 🔴 **Recorrido de la vista** **[operador, 2026-09-21]**: la mirada entra por el titular, baja por el **eje central**
  a la escena y sale por la firma. Un elemento al **margen y a media altura** queda fuera de ese recorrido: es un
  desvío lateral sin destino y se lee como adorno pegado, **aunque no tape nada y aunque su contraste pase**. Si va,
  va **sobre el eje**, como escalón entre titular y escena — la pieza aprobada lleva el chip «Contexto: 0 %»
  **centrado bajo el titular**.
- **Tope de tanda:** más de 6 fichas exige que cada una declare un `piloto` ya generado en disco. La calidad sale
  de generar poco y **mirar cada plate**.
- 🔴 **La `escena` NO puede contradecir al bloque de su palanca** **[medido 2026-09-21]**. Los dos viajan juntos
  en el mismo prompt y **gana la escena**, por más específica: la palanca se anula sin que nada lo delate. Así
  reprobó `ausencia` en la auditoría ciega —bloque «chair pushed back at an angle», escena «the empty chair» dos
  veces— y fue llamada la peor de las doce, «foto de inmobiliaria». No es un defecto de esa palanca sino del
  constructor: el aviso (`auditarContradicciones`) es por palanca. **Los marcadores ya estaban en el bloque**;
  lo que faltaba era impedir que la escena los contradiga.
- **`variantes` exige el campo `eje`: UNO solo.** Pedir tres a la vez producía el doble filo medido —si no se ve
  la diferencia no hay decisión; si se ve de más, dos copias del mismo archivo difieren y delatan la generación—.
- **El lecho se cuenta por FAMILIA, no por objeto** **[medido 2026-09-21]**. Los doce lechos de la serie auditada
  eran literalmente distintos (12/12) y aun así se leyó «el mismo recurso de profundidad siete veces»: lo que se
  repite es la forma —«el borde de una superficie, desenfocado, abajo»— en **7 de 12**. El catálogo tiene **21
  lechos medidos**; el comando avisa cuando una familia pasa de la mitad de la tanda.
- 🔴 **Lo sensible se COMPONE; el modelo sólo TERMINA** **[operador, 2026-09-21]**. Toda marca, texto
  exacto o arte oficial se arma aparte y determinístico, y al modelo se le pasa el armado para que
  ponga materia y luz, nunca dibujo. Un modelo no sostiene una marca: cuatro pasadas sobre la misma
  pieza dieron cuatro logotipos distintos. Comando: **`pnpm foto:lanyard`**. Dos corolarios medidos:
  las **proporciones se calculan del objeto real** (la unidad del patrón mide 7,05 veces el ancho de la
  cinta; el yoyo 1,6 veces) y el **arte plano sirve para PRODUCIR vistas del kit, la foto del producto
  terminado para USARLO en escena**.
- **Nunca ancles la serie en la categoría de un cliente** (pintura = Berel). El comando aborta.

## Los assets viven fuera de git — y el lock los vigila

Los renders de referencia y los kits pesan **640 MB** y están en `.gitignore`. Viven en la máquina y en OneDrive
(`5. Contenidos/13- Branding/` y `14. Mascotas de partners/`). Lo que **sí** está versionado es
`scripts/foto/assets.lock.json`: la huella SHA-256 de los **54** assets que el catálogo declara.

```bash
pnpm foto:assets:check   # ¿el catálogo y el lock coinciden?
pnpm foto:assets:lock    # resella el lock (tras agregar un kit o cambiar un asset a propósito)
```

Para qué sirve:

- **CI verifica el catálogo sin descargar nada.** Si agregas un kit con la ruta mal escrita, falla ahí.
- **Detecta que tu copia local difiere de la aprobada.** `pnpm foto:prompt` avisa antes de generar, y
  `pnpm foto:doctor` lo chequea entre sus pasos. Sin esto, una copia derivada produce una pieza con una
  referencia que el equipo nunca aprobó, y nada lo delata.

**Si agregas un kit o una vista al catálogo, resella el lock y commitéalo**, o el test lo marca como faltante.

## 🔴 Un validador que pasa NO valida el concepto **[medido 2026-09-21]**

`foto:validar` mide que la pieza sea **usable**: que quepa el titular, que la firma tenga contraste, que el lecho
exista. **No mide que la pieza diga algo.** Y un verde **se siente** como confirmación de que está bien, que es
justo lo que lo hace peligroso.

**Caso medido:** tres piezas del registro C para ads de SEO/AEO dieron **4/5 y 5/5 reservas**, zona de texto
0,44 en las tres y contraste de 12 a 20. El operador las rechazó enteras: *«escenas muy poco tecnológicas, no
incluyen personaje, no van con el registro»*. Eran tres bodegones de **papel impreso** para un servicio que
habla de motores de respuesta.

🔴 **La causa está antes del plate: elegir la palanca por si PASA el validador, en vez de por lo que la pieza
tiene que decir.** Las tres palancas (`descarte`, `instrumento`, `ausencia`) se eligieron porque respetaban la
reserva de texto y el lecho — optimización contra el síntoma medible, no contra el encargo.

✅ **El orden correcto:** concepto → elenco → palanca que lo sirve → y recién entonces resolver las reservas.
Si la palanca correcta pelea con la reserva, se corrige la ESCENA (la dirección del objeto, la altura del
sujeto, el lecho), no se cambia de concepto. **El registro C tiene elenco: una pieza suya sin protagonista es
una señal de que se eligió por conveniencia.**

## Al cerrar

`pnpm foto:validar` sobre el plate limpio y **mirar la imagen al 100%**: identidad contra la referencia **de la identidad que elegiste**, emblema
letra por letra, y que no haya texto ni marcas de terceros; en la pieza firmada, que la caja de la firma caiga dentro de
la materia calma del lecho y no sobre su canto. Un contraste que pasa no prueba que la pieza esté bien.


🔴 **ANTES de generar una pieza con un asset de marca —ropa corporativa, lanyard, merch, logo 3D,
isotipo, nave o mascotas— carga el [contrato de selección de referencias](../../docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Hay **279 archivos en
10 kits**: el problema nunca es que falte la vista, es **elegir la correcta**. Resume tres reglas:

1. **Tres clases de asset, no intercambiables.** Arte plano → **producir** vistas del kit · pieza
   aislada → **construir** · **pieza en uso / producto terminado → USAR en una escena**. Darlos al
   revés hace que el modelo **reinvente la marca**.
2. **Lo sensible se compone; el modelo sólo termina.** Toda marca, texto exacto o arte oficial se arma
   determinístico y al modelo se le pide **sólo material y luz**. Un modelo no sostiene una marca:
   cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos.
3. **Las proporciones se calculan del objeto real**, nunca a ojo.

Y **abre el `LEEME.md` y el manifiesto del kit antes del prompt**: su `cuando_usarla` dice qué vista
corresponde, y si el kit trae **prueba en persona**, ésa es el punto de partida.
