# Brief y gate de calidad para una pieza publicitaria

Usa este registro cuando el encargo produce o corrige un archivo. Completa sólo lo aplicable; conserva la
evidencia junto a la versión revisada.

## Brief mínimo

| Campo | Decisión |
|---|---|
| Marca / cliente | Identidad exacta y brand pack autorizado |
| Objetivo | Una acción o lectura principal |
| Canal / soporte | Social orgánico, paid, cover, brochure, OOH, presentación o video |
| Formato | Dimensiones, ratio, duración y tamaño de revisión |
| Audiencia / contexto | Quién lo verá, dónde y a qué distancia/velocidad |
| Copy | Texto literal, jerarquía semántica, CTA y legales |
| Activos | Imagen/video, logo, fonts y provenance/licencia |
| Selección colaborativa | Target real, variante, aire, overlay, cursores local/acting/moving, labels y adapter |
| Estado esperado | Explorar, producir, corregir, aprobar, programar o publicar |

## Extensión paid media (cuando aplica)

Usar [el playbook de atención visual](paid-visual-attention-playbook.md). Registrar hipótesis, registro
A/B/C, palanca visual dominante, recurso fotográfico compatible, primer cuadro, resolución, variante
control, variable que cambia, KPI primario, diagnóstico con fórmula y guardrail. En video incluir
shotlist/timeline, audio y versión silenciada; en estáticos marcar hook temporal como N/A. La prueba
breve de comprensión y atribución es QA cualitativo, no rendimiento observado. Conservar resultado
inconcluso si no existe muestra suficiente; un PASS creativo no prueba eficacia paid.

## CTA — Tres voces + acción

Cargar [el canon aprobado](../../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md).
Registrar texto/contorno/relleno y razón, copy/destino, beneficio/descriptor, Poppins estructural, gaps/padding/radio,
bounds del cursor completo y reserva del sujeto/firma. Medir contraste y revisar móvil por formato; conservar
editables y reproducción. Registrar color de tinta/borde/relleno según pieza (lima no obligatorio), CTA y
descriptor ≥4,5:1, borde/controles ≥3:1 y mínimo local, no sólo p98. **Sin excepción de aprobación
visual para un CTA que falle estos mínimos**; el criterio flexible de otros niveles del punto8 no lo reemplaza. Un único local hacia CTA si se usa selección; no duplicarlo en titular. El relleno
funcional del CTA es excepción acotada a la prohibición de paneles en foto, no permiso para tarjetas o scrims.
En piezas del compositor, estos mínimos los verifica el gate: ver [gate del compositor de CTA](#gate-del-compositor-de-cta).

## Ficha tipográfica

Registra el identificador/versión del contrato AXIS leído y, por cada tramo, `rol → familia → archivo →
receta/peso/ejes → tamaño → leading → tracking → ancho máximo → líneas máximas → color/fondo`. No uses “bold”
o “cursiva” como especificación si el archivo/instancia exactos no están disponibles.

Antes de componer, decide qué capa debe dominar y cuál se puede retirar sin perder sentido. Si las tres familias
necesitan gritar a la vez, el problema es de jerarquía, no de tamaño.

## Pruebas obligatorias

1. **Peso:** compara al menos una receta menos pesada que la primera elección. Evalúa caja de tinta, contraformas,
   ancho y distancia; no el número aislado.
2. **Ritmo:** prueba leading y tracking en la palabra/frase real. Las líneas deben leerse como una unidad sin
   tocarse ni fragmentarse.
3. **Cortes:** evita huérfanas, palabras mutiladas y líneas con funciones semánticas mezcladas. El salto refuerza
   el sentido.
4. **Contraste:** mide texto y logo sobre el fondo local real, incluidos frames críticos de video. Documenta el
   peor caso, no el promedio.
5. **Escala:** revisa al 100 % y en miniatura/tamaño de feed. La lectura principal debe sobrevivir primero.
6. **Movimiento:** una función por momento; no animes las tres voces simultáneamente. Subtítulos y copy crítico
   permanecen legibles sin depender del audio.
7. **Selección colaborativa:** conserva el intent y manifest AXIS. Verifica target real, aire óptico consistente,
   overlay bajo el contenido, hotspot local sobre el anclaje, multiplayer `acting` fuera con la punta en la
   esquina, `moving` sin contacto y placa siempre próxima al puntero. Repite en el formato más estrecho y ancho.
8. **Contraste por nivel (carrusel/pieza con varias voces).** Mide cada voz por separado —etiqueta, entrada,
   dominante, cierre, tarjeta, pie, logo— sobre el fondo real bajo su caja de tinta, **y cada acento `[[…]]` aparte**
   (sus `accentBoxes`, con la luminancia de su tinta, p. ej. `#ff6500`). La métrica de referencia es la p98 de
   luminancia del fondo bajo la tinta (conservadora: pesca luces puntuales). Si un nivel queda bajo el umbral y aun
   así lo apruebas porque se lee, registra la **revisión visual a 390 px** junto al número; sin esa nota es REWORK.
   Guarda el resultado por lámina (p. ej. `out-v2/qa.json` en «Nivel de búsqueda», 2026-09-19).
   **En piezas del compositor de CTA esa salida no existe:** el gate mide cada voz en la caja y en el trazo, y una voz
   bajo WCAG 2.2 AA bloquea sin excepción posible. La revisión a 390 px se registra igual, pero no aprueba un número
   bajo el umbral ([gate del compositor](#gate-del-compositor-de-cta)).
9. **Tarjetas de notificación / paneles UI.** 🔴 **En fotografía de marca propia Efeonce NO se usan** (decisión del
   operador 2026-09-19: la tarjeta con línea naranja fue puntual del post de GTA VI). El dato va como texto limpio
   (Poppins) sobre una zona clara de la propia foto. En ilustración/HUD de género, si la pieza usa una tarjeta tipo
   HUD, debe ser vidrio esmerilado **real**: región del propio plate desenfocada (en el caso, `blur 22` + máscara redondeada), borde sutil y tinta
   oscura translúcida encima. Es un elemento de UI del género que la escena justifica, no un rectángulo decorativo
   detrás de palabras; si no cumple una función narrativa, se retira.
10. **Oscurecimientos graduales declarados.** 🔴 **En fotografía de marca propia Efeonce: NUNCA.** Decisión del
    operador 2026-09-19: «es muy 2010, le resta limpieza». El contraste se planifica en la toma pidiendo la zona con
    su tono (sombra profunda y pareja, o muro claro y parejo); si no pasa 4,5:1 se regenera el plate o se mueve el
    texto. En ilustración, un scrim es la última opción, tras intentar encuadre, posición y plate.
    Si queda, se declara **por lámina** (`scrimTop { to, opacity }`, `scrimBottom { from, opacity }`) como degradado
    que se funde con la escena; nunca un velo rectangular ni un valor global oculto en el compositor.
11. **Hoja de revisión.** Arma una hoja con todas las piezas en el orden de publicación. Si se genera ordenando
    nombres de archivo, una pieza suelta fuera de la secuencia se intercala mal (el operador creyó que la
    contraportada estaba penúltima): nómbrala fuera de la serie o preséntala aparte.

## Gate DO / DON’T

| Revisión | DO | DON’T |
|---|---|---|
| Jerarquía | Una tesis dominante y apoyo claramente secundario | Tres titulares del mismo peso o tamaño |
| Bricolage | Peso/ejes ajustados a longitud y soporte | ExtraBold como default para toda frase |
| Poppins | Contexto, continuidad y énfasis breve | Cursiva larga o varios párrafos en cursiva |
| Guttery | Un gesto corto, real y opcional | Sustitución, imitación o frase larga decorativa |
| Espaciado | Tracking y leading ópticos sobre el texto final | Compresión o apertura extrema para hacerlo caber |
| Imagen | Zona estable o protección diseñada | Texto/logo sobre detalle variable sin medición |
| Logo | Versión con contraste y aire sostenidos | Wordmark blanco perdido sobre fotografía clara |
| Producción | Medio limpio + overlay determinista | Texto crítico generado dentro de la imagen |
| Bounding box | Se adapta a texto/objeto/grupo y agrega aire proporcional | Dimensión fija o borde pegado a una cara |
| Cursor local | Hotspot sobre anclaje; `screen-fixed` mantiene orientación familiar | Flecha invertida, sin relleno o separada del target |
| Multiplayer | Punta y placa separadas pero próximas; label libre | Puntero decorativo, placa huérfana o identidad hardcodeada |
| Estado moving | Presencia conjunta en región semántica, sin tocar selección | Target/anclaje fingido para justificar su posición |
| Portabilidad | Manifest normalizado + adapter conformante | Copiar CSS del Lab o usar coordenadas libres |
| Niveles de texto | Vecinos distintos en ≥ 2 ejes (peso, tinta, escala, familia) | Entrada y dominante con el mismo peso y color |
| Acento de color | Naranja sobre cielo oscurecido, medido aparte y revisado a 390 px | Naranja sobre horizonte encendido (1–2:1) sin degradar a peso |
| Tarjeta HUD | Vidrio esmerilado real del plate, función narrativa | Rectángulo plano de color detrás del texto |
| Scrim | Sólo ilustración y declarado por lámina | **Cualquier scrim en fotografía de marca** (2026-09-19) |
| Tarjeta HUD en foto | Dato como texto limpio sobre zona clara de la foto | Tarjeta de vidrio con línea naranja (era de GTA VI) |
| Marcador-estrella | Sólo el post de GTA VI (marcaba la misión) | Estrella junto a la etiqueta en cualquier otra pieza |
| Propósito del bounding box | Enmarca un objeto con sentido (obra en revisión, resultado aprobado) o una palabra del titular | Caja sobre vacío, sobre una persona, o «porque sí» |
| Firma de la pieza | Logo de Efeonce centrado abajo, sin URL. Si el logo ya aparece dentro de la imagen (logo 3D héroe, mockup, merch), la burbuja URL lo reemplaza: centrada, sola, fusión `luminosity` a opacidad 1 y ≥ 4,5:1 medido (regla del operador, 2026-09-26) | Burbuja agregada por defecto, a un costado o junto al logo; segundo logo plano compitiendo con el héroe |

## Línea gráfica «La órbita» en piezas de marca propia (canónica desde 2026-09-25)

Aplica a piezas publicitarias de la marca propia Efeonce y su familia (Globe, Wave, Reach cambian sólo el acento);
nunca a piezas con marca de cliente. Contrato:
[manual](../../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) (§1.3 órbita, §1.4 foco, §1.5
lente, §8.5 URL, §9 foto, §10.1 campaña y grillas). Reglas completas y checklist:
[referencia operativa](../../efeonce-brand-studio/references/graphic-line-orbit.md). Valores desde los tokens
`efeonceGraphicLine` de AXIS, nunca transcritos.

Entradas: `pnpm creative:orbit:resolve|render` (contrato AXIS `efeonce.graphic-line-orbit` 0.2.0; `render` sale 1 si
falla un check como texto que cruza el anillo, firma descentrada o bajo 4,5:1, u órbita sobre el sujeto),
`pnpm creative:layout` (capa opcional `graphic_line: { intent, protect }` por formato y `brand.signature: {
brand_in_scene }`) y `pnpm foto:componer:cta` (`marcaEnEscena`). La órbita **no sustituye** la composición del
lenguaje fotográfico: se usa en casos específicos y nunca cruza sujeto, reservas de texto, lecho ni firma.

| Elemento | DO | DON’T |
|---|---|---|
| Órbita en campaña | Rodea la lente con aire; esfera arriba a la izquierda, lejos de la cara | Esfera sobre el rostro o suelta, fuera de la punta del arco |
| Texto | Vive fuera de la órbita (tercio inferior izquierdo) | Titular, CTA o URL cruzando el anillo |
| Cantidad | Una lente u órbita por pieza | Órbitas repetidas como patrón o textura |
| Arco de avance | Mide un dato real citable | Arco decorativo o dato inventado |
| Foto en la lente | Toma del banco `ai-generations/2026-09-25_banco-lente-orbita/` o del pipeline `foto:*`; sujeto en un círculo del 55 % del lado corto; sin emblema legible | Velo navy sobre una foto de banco; foto débil sin punto de interés |
| Grosor y margen | ×1,75 en lienzos ≤ 1200 px; margen 9 % del lado corto en redes y 140 px en 16:9; en 9:16 fuera de la zona de la interfaz | Grosor del informe A4 llevado a un post de 1080 |
| Uso de la órbita | Declarada a propósito (lente, medida con fuente, progreso, foco); la foto conserva su composición | Órbita por defecto en toda pieza, o sobre sujeto, reservas, lecho o firma |
| URL | Firma: burbuja sólo con el logo en la imagen (ver Firma). Pie de deck, informe, papelería o mail: burbuja, horneada donde la fusión no está garantizada | `efeoncepro.com` como texto suelto; burbuja como firma por defecto |
| Archivos | Logos y burbujas desde `@efeoncepro/axis-brand-assets` por id | SVG copiado o redibujado a mano |
| Claim | «Te hacemos visible» con su prueba al lado | Pautar el claim antes de la revisión legal pendiente |

**Sin resolver (decisión del operador, no la tomes tú):** (1) si el CTA en naranja o lima de una política cromática
de campaña cuenta como segundo acento frente al teal de la órbita, que la línea limita a uno por pieza; (2) cómo
convive el tratamiento de la lente (foto en navy apagado fuera del círculo) con la regla de esta skill que prohíbe
cualquier scrim en fotografía de marca cuando hay texto sobre esa zona. Mientras tanto, mide el contraste del texto en
los píxeles finales y registra la duda en el brief. La prueba de atribución sin logo sigue sin medir.

## Salida de la revisión

Registra `PASS | REWORK | DON’T` por jerarquía, tipografía, contraste, marca, safe area, formato, motion y
derechos. Un PASS técnico no equivale a aprobación humana ni publicación. Si hay REWORK, nombra el defecto y la
operación concreta que lo corrige.

## Gate de cobertura Paid Media

Por defecto: cada concepto ×4:5/1:1/9:16/16:9; exclusiones sólo con brief explícito. Verificar cuatro exports y cuatro composiciones, no cuatro recortes. Registrar tamaños, fuentes editables, prompts/referencias y QA visual/contraste por ratio. El conteo parcial no se anuncia como campaña completa. Ver el canon Tres voces + acción para matriz, contraste mínimo y conservación del lecho/firma.

## Gate para Finales

Registrar placement/tipo de medio, perfil y fuente de safe area, bounds de texto/cursor/firma, máscara QA separada y revisión de escena. No basta contraste. Handoff: concepto, audiencia, fase de embudo, hipótesis, CTA/destino, KPI, prompts/referencias, editables, comandos, hashes, autorización y limitaciones. Aplicar el canon Tres voces + acción.

## Gate del compositor de CTA

Para piezas compuestas con `pnpm foto:componer:cta`. Los campos del plan y el porqué de cada regla viven en
`SKILL.md` (§Tres voces + acción) y en el
[contrato del compositor](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) §16–§18; acá va
sólo lo que registra quien revisa. El gate certifica la pieza, no la campaña: no autoriza publicar. Desde la
certificación del 2026-09-23 el gate hace por sí mismo lo que antes se comprobaba a mano —QA vacío, ajeno o de otro plan,
piezas ausentes, mediciones nulas—; lo que la
[auditoría del 22/09](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#7-auditoría-de-compatibilidad-y-alcance--22092026)
pedía revisar y sigue sin guarda está abajo, en «Lo que se mira a ojo».

### El código de salida

| Código | Significa | Qué registrar y hacer |
|---|---|---|
| **0** | Certificado: huellas del plan, el plate, el PNG, el layout y el comando vigente; todas las reglas del canon | PASS técnico. Revisar igual los ⚠ y la pieza |
| **1** | Falla: una regla incumplida, o el plan, el plate, el PNG o el layout cambiaron después de componer | REWORK: leer cada ✗, corregir el plan o recomponer. Con fallas y algo no certificable a la vez, sale 1 |
| **2** | Uso incorrecto (sin plan) | Corregir el comando |
| **3** | **No certificable**, ni pase ni falla: QA del formato anterior, pieza compuesta con otra versión del comando, máscara leída de una caché ajena al repo, o pieza con gesto manuscrito o tarjeta | Recomponer o `pnpm foto:cta:gate <plan> --reproducir`. **Nunca registrarlo como PASS.** El gesto manuscrito está fuera de alcance por decisión del operador: con gesto, 3 es el techo |

`--reproducir` recompone el plan en un temporal con el comando vigente y una segmentación nueva, exige que cada PNG
y layout entregado sea idéntico byte a byte al reproducido y da el veredicto sobre ese QA: es la certificación que no
se falsifica. Conserva la salida del gate junto a la versión revisada.

### Qué respalda un 0

- **Integridad:** huellas recalculadas; el PNG entregado mide el `final` del plan o, sin él, el del plate; ninguna
  pieza del plan falta en el QA; sin máscara del sujeto no se certifica.
- **Accesibilidad por voz:** WCAG 2.2 AA según el tamaño en pantalla (390 CSS px de ancho; `placement` sólo lo
  endurece), en la caja **y en el trazo**: el 1 % peor de los píxeles de glifo contra su fondo. No admite excepción.
- **Límites del CTA:** relleno y borde ≥ 3:1; el borde del contorno, ≥ 1 CSS px y ≥ 3:1 como se ve en un teléfono
  (390 px × DPR 2).
- **El CTA:** ≥ 4,5:1 a cualquier tamaño (uno medido como «texto grande» no pasa) y, además, APCA y daltonismo en
  texto, borde y relleno; sólo esto último se exceptúa, como `cta-perceptual`. Acento obligatorio en su portador
  (excepción: `acento-cta`).
- **Jerarquía:** concepto completo (o `conceptoReducido` con aprobador), dominante ≥ 3× la entrada y **el dominante
  como voz mayor**.
- **Firma:** declarada, ≥ 25 % del lado corto en horizontal nuevo y ≥ 20 % en vertical/cuadrado nuevo (máximo 35 %),
  ≥ 4,5:1 (en la caja y en el trazo; la externa, en el peor píxel de su caja), fuera del sujeto y dentro de su zona;
  la automática, debajo de todo el contenido. La firma externa se reserva al 20 % fijo y requiere atención
  especial en un horizontal nuevo. Por formato:
  [safe zones y firma §2c](paid-format-safe-zones-and-craft.md#2c-la-firma-en-cada-formato-el-contrato-del-gate).
  **Burbuja URL como firma (tramo 17):** sólo en pieza nueva con el logo de Efeonce ya dentro de la imagen, declarada
  con `url` + `"marcaEnEscena": true` y sin `logo`; se fusiona a opacidad 1 y se mide el 1 % peor de su tinta sólida.
  Reglas: `firma-burbuja` (burbuja sin marca en escena, o junto al logo; exceptuable), `firma-contraste` (≥ 4,5:1) y
  `firma-sobre-sujeto`. Las piezas del canon anterior siguen «no certificables» con URL; las aprobadas no se
  recertificaron y el gate las muestra en 3 hasta recomponerlas. Ningún workflow de CI corre este gate: córrelo a mano.
- **Maquetación:** zona segura de AXIS como piso, reserva editorial, nada encimado y ninguna selección sobre otra voz.

Un ⚠ de excepción auditada o de salida aprobada (`sin-firma`, `conceptoReducido`, zona del sujeto ignorada) no es un
PASS limpio: regístralo con la regla, la razón y quién aprobó. Una excepción vale sólo con un aprobador de
`scripts/foto/aprobadores.json`, el `plate` (sha256) y, si la regla se mide, `hasta`; las salidas aprobadas exigen el
mismo registro de aprobadores. Nunca inventes un aprobador: si falta, pregunta al operador.

### Lo que se mira a ojo

**Texto alternativo.** Lo escribe el compositor (`out/<id>.alt.txt` y QA): la escena del `altText` más todo el
texto visible en orden de lectura, con el rol del CTA siempre anunciado («Llamado a la acción: «…»», nunca «Botón») y
la firma («Firma: logotipo de Efeonce»). Revisa que el `altText` describa la escena sin transcribir el copy.

**Avisos (⚠).** No bloquean; cada uno se mira en la pieza y queda en el registro:

| Aviso | Qué mirar |
|---|---|
| Una voz que sólo se lee oscureciendo la foto (el velo) | Decidido: sin velo. `scrimTop` y `scrimBottom` no existen desde el tramo 11 (el esquema los rechaza); el lecho donde va el texto o la firma sale del prompt (`pnpm foto:prompt` con `reservas`). Si una voz no se lee, se rehace el plate |
| Variante del CTA elegida **sin margen** | Pasa por poco: en otra pantalla o con compresión puede no alcanzar. Compárala con `--variantes`. Aviso o bloqueo: pendiente de decisión del operador |
| Corchetes del CTA de texto bajo 1 CSS px o bajo 3:1 | El trazo que dibuja AXIS mide ≈ 0,69 CSS px en un teléfono, en todos los formatos: mira si el CTA se sigue leyendo como destino. Cambiar ese grosor es cambiar el contrato AXIS, y lo decide el operador |
| El `altText` transcribe el copy | La escena se describe; el texto de la imagen ya lo transcribe el compositor. Corrige el plan |

También avisan, y se miran igual: falta de `altText`, APCA o daltonismo en voces que no son el CTA, `placement`
declarado y poco aire sobre los corchetes; y, sólo en las piezas del canon anterior, texto bajo 9 CSS px en el
teléfono, CTA o descriptor corridos de la columna y la firma sobre un canto (en una pieza nueva bloquean:
`legibilidad`, `cta-columna` y `firma-canto`). La máscara que no marca sujeto ya no avisa: bloquea (`mascara-vacia`).

**Lo que ninguna guarda mide:** identidad, dedos y orientación de la tablet; tamaño del lecho y cierre visual de la
firma (desde el tramo 16 se mide si la firma cae sobre un canto del lecho, no si se ve bien apoyada); el marco y los
controles de la selección fuera del CTA; el gesto manuscrito y la tarjeta. Revisar el lecho y
la firma como composición única: un logo bajo con media imagen tapada sigue siendo REWORK aunque el gate dé 0.

Incluir en el handoff concepto/embudo, archivos literales, referencias/hashes, comandos reproducibles y la salida del
gate. El [método completo](../../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md)
reúne los casos y la secuencia vigente.
