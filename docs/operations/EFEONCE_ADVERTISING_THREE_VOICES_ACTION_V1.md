# Tres voces + acción · Ads Efeonce

**Estado:** regla creativa aprobada por el operador el 2026-09-22. **Estilos:** texto (`text`), contorno (`outline`) y relleno (`solid`), a demanda según la composición. Formaliza la propuesta CTA v0.1 de los pilotos SEO/AEO, incluyendo las tres variantes por la aclaración final del operador. La aprobación del sistema no aprueba piezas completas, derechos, pauta, publicación ni rendimiento.

## Función y alcance

Complemento de las tres voces para anuncios Efeonce orientados a una acción: **Bricolage instala la idea, Poppins estructura, Guttery aporta un gesto opcional; el CTA convierte la propuesta en una acción concreta**. El CTA usa Poppins, no añade una cuarta familia ni otro titular. Tres voces no obliga a usar las tres fuentes: Guttery sigue siendo opcional.

Aplica a la capa gráfica de ads, incluidos ads sobre fotografía de marca. El concepto puede tener entrada, titular y remate; el grupo de acción tiene beneficio, CTA y descriptor sólo cuando aportan información. Una pieza de awareness sin acción explícita puede omitir el CTA con decisión registrada. Para clientes, usar su identidad y contrato de marca; no trasladar automáticamente colores/fuentes Efeonce.

## Tres tratamientos, una misma acción

| Estilo | Elección por composición | Control |
| --- | --- | --- |
| **Texto** (`text`) | Integrar una acción discreta cuando el fondo y la jerarquía ya permiten distinguirla. | No confundirla con el copy de apoyo; conservar contraste, espacio propio y cursor semántico si se usa. |
| **Contorno** (`outline`) | Delimitar la acción conservando el fondo visible y una masa de color menor. | Texto y borde legibles sobre el fondo real; evitar acumulación de marcos. |
| **Relleno** (`solid`) | Separar con más claridad la zona de acción mediante una superficie de acento. | Texto contrastado contra el relleno; el bloque no desplaza involuntariamente al titular o personaje. |

Ninguno es el ganador universal ni tiene un lift demostrado. No asignarlos automáticamente por embudo, plataforma o audiencia. Registrar el estilo y el motivo en el plan; si se comparan, mantener iguales foto, copy, geometría, destino y condiciones de medios.

**Cómo se elige en la práctica (2026-09-23).** Medido en el repo: dos de tres agentes terminaron usando un solo tratamiento, porque nada les mostraba los otros sobre la foto real ni les pedía el motivo, y porque el gate exigía más a unos que a otros. Ahora: `pnpm foto:componer:cta <plan> --variantes` compone los tres lado a lado con su medición; `cta.variant: "auto"` con `cta.prominencia` (`discreta` → texto · `delimitada` → contorno · `destacada` → relleno) respeta la intención y sólo **escala** a un tratamiento que separa más cuando la escena no permite leer el pedido —con 4,5:1 aunque el CTA sea grande, y también con APCA y daltonismo—; y el comando avisa si una pieza elige tratamiento sin `cta.variantReason`. Detalle: `EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md` §17.

- Contorno/relleno: rectángulo mínimo con esquinas redondeadas, ajustado al texto y su padding. Texto: sin superficie ni borde de botón. Ninguno usa sombras, biseles, brillo ni badges decorativos.
- **Corchetes sólo en el tratamiento de texto** (decisión del operador, 2026-09-23). En **contorno y relleno** el rectángulo ya delimita la acción: los corchetes no cumplían ninguna función y se quitan. En **texto** se conservan, porque sin rectángulo el CTA «queda huérfano». El **cursor** se conserva en los tres. Un marco distinto se pide a propósito con `cta.seleccion.marco` (p. ej. para mostrar un colaborador seleccionando el CTA). El gate **avisa** (no bloquea) que el trazo de los corchetes AXIS mide ≈ 0,69 CSS px en un teléfono, bajo 1 CSS px: es un valor del contrato AXIS y cambiarlo es decisión pendiente del operador; no lo cambies por tu cuenta.
- **Color a demanda, accesibilidad obligatoria.** Lima no es un default universal: elegir naranja, teal u otro color autorizado coherente con la pieza. Resolver desde la paleta/contrato de marca; si el token no está expuesto, documentar su fuente autorizada, no inventar un token. Texto, borde y relleno se eligen por separado: la tinta puede ser clara u oscura y no tiene que repetir el acento. Registrar roles, valores resueltos y razón; los pilotos lima/navy no fijan la paleta del sistema.
- Beneficio → acción → descriptor forman un grupo. El descriptor identifica oferta/servicio, no repite el botón. No inventar «gratis», urgencia, garantías o cifras para agregar un chip.
- Una acción principal, breve y específica; la landing debe permitir realizar lo prometido. En una imagen estática el botón representado no es un control independiente del enlace/CTA nativo del anuncio.

## Jerarquía, ritmo y protección

1. El concepto conserva la mayor masa tipográfica. Diferenciar apoyos y CTA mediante función, escala, peso y tinta; el CTA no hereda Bricolage display ni Guttery por decoración.
2. Medir **cajas de tinta**. Separación entre bloques conceptuales mayor que entre miembros relacionados del grupo de acción. Calcular el flujo desde los bounds anteriores; no colocar líneas con coordenadas Y independientes que colisionan al cambiar copy.
3. Alinear ejes izquierdos u ópticos; el inset del texto dentro del CTA es deliberado. Padding y radio proporcionales a tipografía/formato, documentados en el plan. No copiar píxeles de un ratio a otro ni usar tracking extremo para hacer caber texto.
4. La envolvente protegida incluye texto, borde, controles de selección, puntero completo, etiqueta y descriptor. Dejar aire respecto del personaje y de todos sus elementos —manos, pelo, cubos suspendidos—, props clave, safe areas y firma. No basta con que el bounding box del botón no choque.
5. Conservar lecho y firma oficiales; el CTA no ocupa la reserva de marca. Si el grupo no cabe, ajustar copy, cortes, escala o composición y volver a revisar el formato nativo.
6. Medir contraste sobre el píxel real en texto/contorno y sobre el relleno en sólido. Aplicar umbrales vigentes de AXIS; inspeccionar además bordes y controles a tamaño móvil. Un color de marca no garantiza legibilidad.

## Accesibilidad del CTA y elección de color

Regla del operador, 2026-09-22: armonía con la pieza **y** contraste comprobado. Un ad naranja no recibe un CTA verde por plantilla. Elegir el acento por composición y después la tinta por contraste; no asumir que naranja/blanco, teal/blanco o cualquier par de marca pasa.

- Texto del CTA y descriptor: **≥4,5:1**. Para el CTA se mantiene este piso incluso si es grande; no usar la excepción de texto grande para rescatar una combinación débil. **Desde el 2026-09-23, APCA y daltonismo también bloquean en el CTA** (decisión del operador), exceptuables sólo como `cta-perceptual` con aprobador del registro; en las demás voces sólo avisan.
- Contorno/silueta necesarios para distinguir la acción y controles/cursor que comuniquen significado: **≥3:1** contra colores adyacentes. La política interna también comprueba el perímetro del relleno contra la foto. El gate mide el borde del contorno como se ve en un teléfono (390 CSS px con DPR 2): al menos 1 CSS px de grosor y ≥3:1.
- En texto/contorno, medir tinta contra la fotografía; en relleno, tinta contra superficie y superficie/borde contra fotografía. Medir además descriptor y controles. No aceptar sólo el color teórico de la paleta.
- Sobre fondos variables, revisar las zonas más desfavorables bajo la tinta. El percentil98 de la caja es diagnóstico, **no sustituye el mínimo** para declarar el CTA accesible: el gate exige que el 1 % peor de los píxeles del trazo de cada voz alcance su umbral contra su propio fondo. Si falla, cambiar tinta/superficie, posición o estilo. No redondear un fallo hacia arriba ni añadir scrim: el gate sólo **avisa** cuando una voz pasa gracias al velo (`scrimTop`/`scrimBottom`), así que esta regla la haces cumplir tú (decisión pendiente del operador).
- Usar colores fuente y fondo, evitando medir antialiasing como si fuera el color principal; complementar con inspección del export reducido, grosor, tamaño y comprensión sin depender sólo del matiz. Preparar texto alternativo para publicación cuando la superficie lo permita: el compositor lo escribe en `out/<id>.alt.txt` con la descripción de la escena (`altText` del plan) y todo el texto visible en orden de lectura, anuncia siempre el rol del CTA («Llamado a la acción: «…»», nunca «Botón»: en una imagen no hay control) y suma cursores y firma. `altText` describe la escena sin transcribir el copy; si lo transcribe, el gate avisa.
- Registrar ratios, método, formato y evidencia. Contraste aprobado no equivale a certificación integral de accesibilidad ni a eficacia de conversión.

Fuentes primarias consultadas 2026-09-22: [WCAG 2.2, contraste de texto e imágenes de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Los mínimos internos específicos del CTA se explicitan arriba; la firma conserva además su contrato de marca.

## Cursores con significado

Cuando el anuncio use la gramática de selección, **un único cursor local se vincula al CTA** mediante intent AXIS, target real `group` y bounds medidos. No duplicarlo en titular y acción. El colaborador se reserva para un argumento que lo justifique; su etiqueta debe tener sentido y no fingir identidad de terceros.

P1 «No fuiste tú»: colaborador `IA` en titular expresa intromisión; local en CTA. P2 «No te leyó»: sólo local en CTA, sin selección en titular. No imponer la misma presencia multiplayer a toda la campaña.

El renderer vigente exige cursor en la selección y dibuja controles del target: los pilotos usan `open-brackets`, `compact`, `overlay: none` y local `end-center`. **No se añadió un modo standalone sin caja.** Reusar resolver y adapter; no dibujar flechas o selecciones a mano. En una pieza que no use cursores, no agregarlos por obligación del nombre «Tres voces + acción».

## Frontera con fotografía y ownership

El **relleno acotado del CTA funcional está autorizado**: no contradice la prohibición de paneles HUD, tarjetas de contenido ni scrims sobre fotografía. Esa prohibición sigue vigente para titulares, párrafos y fondos usados para rescatar una toma sin reservas. No extender esta excepción a otras superficies.

Canon de aplicación creativa: este documento, cargado desde `efeonce-advertising-creative`. AXIS conserva tokens, recetas tipográficas y contrato de selección bajo el [ADR de ownership](../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md). Esta adopción no modifica paquetes, schemas, primitivas UI, runtime ni autoridad de publicación; no crea una API CTA de AXIS ni promueve contratos `trial/candidate` a estables.

✅ **Delta 2026-09-22 — el comando canónico ya existe.** El paso que este párrafo dejaba abierto
(«no se anuncia como compatible hasta una implementación y verificación explícitas») está hecho:
**`pnpm foto:componer:cta` + `pnpm foto:cta:gate`**, con las cinco copias de corrida consolidadas y el hueco
de medición del relleno cerrado. Canon: [`EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md`](EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).

El compositor canónico de CTA reutiliza el renderer AXIS. Sus campos soportados y límites se verifican en el contrato técnico: §7 (auditoría del 22/09) y §18 (certificación del 23/09). No asumir que un campo migra por nombre: hoy el comando lee `centerX` (desde la noche del 22/09; aborta un bloque centrado a más de 0,15 del centro) y `signatureY` (desde el 23/09: declara firma externa y reserva su caja con `y` como centro vertical), pero `logo.y` numérico es el borde superior de la firma, no su centro. Los runners archivados conservan reproducción histórica, no autoridad para nuevas copias.

## Evidencia del caso, no presets globales

Dos piezas 4:5, 1152×1440, revisadas completas y a 390 px: «No fuiste tú» y «No te leyó». CTA Poppins40px; padding24/14px; radio16px, borde2px. Beneficio→superficie20px; superficie→descriptor16px; remate→beneficio36px. Última tinta gráfica separada66/65px del punto superior protegido del personaje (~22px en móvil). Son **medidas del caso**, no tokens ni mínimos universales. 9:16 y 16:9 requieren recomposición y QA propios.

Corridas locales: `ai-generations/2026-09-22_cta-p1-v02/` y `ai-generations/2026-09-22_cta-p2/`. Archivo operativo en OneDrive local, raíz `Alineación/5. Contenidos/15. Paid Media`: `02. Pilotos/2026-09-22_p1-cta-comparativa-Codex/v02-espaciados-y-jerarquia` y `02. Pilotos/2026-09-22_p2-cta-comparativa-Codex/v01`. Cada una conserva PNG, planJSON, compositor, SVG de la capa superior, plate, provenance, contraste/espaciados y reproducción de los tres PNG byte-idéntica. Texto, contorno y relleno forman parte del sistema aprobado. No se trasladan pilotos a Finales con esta decisión.

## Caso de contraste mínimo — ocho adaptaciones SEO/AEO

Aplicación 2026-09-22: cuatro conceptos ×9:16/16:9, en `ai-generations/2026-09-22_aeo-cta-v03/` y OneDrive
`02. Pilotos/2026-09-22_SEO-AEO_fuente-preferida/v03-Codex-tres-voces-accion`.

- «¿Sales tú?»: contorno/tinta naranja, mínimos de CTA 4,988:1 vertical y 5,196:1 horizontal.
- «¿Te reconoces?» y «Que te elijan»: naranja/navy, CTA 5,043:1 en ambos formatos.
- «Sé la referencia»: naranja rechazado para CTA por mínimos 4,087:1/4,352:1, aunque p98 reportaba 4,79:1/5,44:1.
  Corrección: tinta blanca, mínimos 12,066:1/12,847:1, conservando el acento naranja del titular grande.
- En la serie, borde/silueta≥4,387:1 y núcleo claro del cursor/controles≥7,646:1. CTA/descriptor, titulares,
  acentos y límites de composición se verificaron por separado. La firma conserva su medición adicional.

Método y evidencia: `validar.mjs` y `out/accesibilidad-cta.json`; resultado 8/8, con planes y reproducción
byte-idéntica. El mínimo de caja es conservador (incluye fondo entre glifos); un falso rechazo se puede
investigar con máscara de tinta, no ignorar por preferencia estética. La prueba del color descartado queda
registrada para que Claude/Codex puedan reproducirla. Los números describen estas fotos, no otros fondos.

## Cobertura de formatos para Paid Media

**Matriz de entrega predeterminada: cada key visual se adapta a 4:5, 1:1, 9:16 y 16:9.** Cuatro conceptos implican dieciséis piezas, no ocho. Sólo un brief que limite expresamente placements/ratios permite reducir la matriz; registrar la exclusión y su motivo. Es una regla interna de cobertura, no una afirmación de que todas las plataformas acepten los cuatro ratios en todos sus placements. Verificar especificaciones y safe areas del destino antes de pautar.

| Ratio | Export de esta campaña | Revisión propia |
| --- | --- | --- |
| 4:5 | 1080×1350 | Feed vertical; personaje, CTA y firma con aire. |
| 1:1 | 1080×1080 | Feed cuadrado; recomponer densidad y cortes del titular. |
| 9:16 | 1080×1920 | Vertical; comprobar además obstrucciones del placement. |
| 16:9 | 1920×1080 | Horizontal; redistribuir escena y bloque gráfico. |

**Tamaño de la firma en 16:9 — decidido el 2026-09-23.** La medición previa mostró que una firma al 20 % del lado corto ocupaba ≈ 44 px en el feed de un teléfono (390 px de ancho), contra 78 px en 4:5; las firmas de CMP-002 y del registro C hechas al 13–14 % medían ≈ 31 px. Para una **pieza nueva horizontal** el gate vigente exige al menos **25 % del lado corto** (≈ 55 px en ese teléfono); para verticales y cuadrados exige **20 %**. El máximo es 35 % en todos los formatos. Las piezas aprobadas bajo el canon anterior conservan sus píxeles; al recomponer se aplica el canon vigente. La firma externa tiene geometría fija propia y debe verificarse contra el gate, sin inferir que `firma-placement.mjs` ya produce 25 %.

La adaptación exige foto nativa y composición editable por ratio: no estirar, recortar personajes/manos/pantallas, añadir bandas ni reducir el maestro automáticamente. Reusar el plate sólo si ya corresponde al ratio; para fotografía Efeonce, construir la ficha con `foto:prompt` y editar la referencia corregida para conservar identidad. Comparar cada salida completa y al tamaño de consumo, incluyendo jerarquía, reserva editorial, puntero completo, lecho/firma y contraste mínimo. Una aprobación en 9:16 no valida 4:5 ni 1:1.

El índice de entrega cruza **concepto × ratio × versión × estado de QA** y liga export, fuente editable, prompt/referencia y evidencia. Un ratio faltante se informa como pendiente; nunca se cuenta el set como completo. La validación de estas piezas cuadradas no promueve por sí sola la tabla fotográfica global 1:1, todavía marcada `sinValidar`.

## Entrega SEO/AEO v04 — dieciséis pilotos

`ai-generations/2026-09-22_aeo-cta-v04/MATRIZ-ENTREGA.json` registra cuatro conceptos ×cuatro ratios;
OneDrive: `02. Pilotos/2026-09-22_SEO-AEO_fuente-preferida/v04-Codex-cuatro-formatos`.
Ocho nuevos plates 4:5/1:1 editados desde referencias corregidas y ocho exports anteriores conservados.
CTA/descriptor, límites editoriales y controles pasan en16/16; firma mínima5,52:1. Prompts, planes,
compositor, hashes y evidencia viajan con la entrega. Pilotos pendientes de aprobación, sin publicación.

El arnés genérico de reservas fotográficas **no pasa globalmente**: las bandas laterales/profundas no son
las zonas del texto/cursor de esta composición y en «Sé la referencia» la transición de mesa cae dentro
de la banda inferior genérica. El contraste del área exacta de firma sí pasa. Ver salida íntegra y
aplicabilidad en `LEEME.md` de la corrida; no confundir el PASS de composición con validación global de
reservas ni promover el catálogo1:1. Mover elementos exige nueva medición.

## Gate y continuidad entre agentes

- Declarar `cta.variant: text | outline | solid` con su motivo en `cta.variantReason`, o `auto` con `cta.prominencia` (`discreta | delimitada | destacada`); copy, destino, beneficio/descriptor opcionales y rol de cada voz.
- Certificar con `pnpm foto:cta:gate <plan>`: sólo la salida **0** certifica; `1` falla, `2` uso y **`3` no certificable, que no es un pase** (recomponer o `--reproducir`; una pieza con gesto manuscrito o tarjeta no se certifica). Plan nuevo: `safeArea: "axis"`, `cta.x: "columna"` con alineación a la izquierda, firma declarada (`logo` con `y: "auto"`, o `firma: { modo: "externa", razon }`), `lead` y `after`, `altText` de la escena. Excepciones sólo con `aprobadoPor` del registro `scripts/foto/aprobadores.json`, `plate` y, si la regla se mide, `hasta`; nunca inventar un aprobador. `placement` sólo endurece. Detalle: contrato §18.
- Entregar textos y parámetros editables, fuentes/ejes reales, compositor y dependencias, plate y prompts de origen, SVG/capas cuando existan, intent/manifest y evidencia de contraste/espaciados.
- Revisar maestro y tamaño de consumo de **cada formato**, sin choques de tinta, etiquetas o cursor con personaje/firma. Registrar revisión y límites.
- Guardar pruebas en Pilotos; sólo aprobación explícita de pieza habilita su clasificación como Final. Publicar exige autorización separada.
- CRO evalúa resultado calificado y costo; CTR es diagnóstico de respuesta, no prueba de atención o conversión. La aceptación visual del operador no demuestra eficacia comercial.

## Zonas seguras, placement y promoción a Finales — 2026-09-22

La reserva fotográfica y la zona segura de la interfaz son contratos diferentes: cumplir su intersección.
**Un ratio no identifica un placement.** Registrar plataforma, superficie, tipo de medio y versión del perfil.
En 9:16 proteger entrada, titular, CTA, descriptor, cursor completo y detalle narrativo clave; no sólo
el origen Y del texto. Contraste alto no compensa oclusión por avatar, nombre, acciones, captions o CTA nativo.

### Perfil aplicado a SEO/AEO v06 — corrección de firma

- `meta-fullscreen-conservative-v1`: ventana x=8–88%, y=16–65%; a1080×1920, límites conservadores
  x=87–950, y=308–1248. Reserva16% superior,35% inferior,8% izquierda y12% derecha. Son **márgenes internos
  conservadores**, no coordenadas oficiales universales. Texto/CTA/cursor dentro; fondo/escenografía pueden continuar fuera. La firma tiene un criterio editorial separado, con la limitación de interfaz declarada abajo.
- El35% inferior se apoya en la guía primaria de Meta Reels, p.4. Se aplica también a la versión compartida
  para Stories como guardia conservadora. Las rutas actuales del Ads Guide exigen login; no se afirma haber
  verificado cada variante live de interfaz. La preview del placement en Ads Manager sigue siendo el gate de tráfico.
- Feed4:5/1:1/16:9: inset editorial interno2,5%; no inventar un overlay fullscreen donde no existe. Revisar
  el recorte real y las especificaciones del destino. LinkedIn Single Image prioriza aquí4:5/1:1;9:16 es
  fuente para eventual video vertical, **no un PNG listo para publicarse como Video Ad**. No existe en las
  fuentes consultadas una banda porcentual universal de LinkedIn equiparable a Meta.
- **La firma debe cerrar la composición al pie.** El operador rechazó expresamente la v05 con firma al
  63%: cumplía el guardrail geométrico pero flotaba casi al centro. La v06 toma como referencia visual las
  piezas de Claude: centro al 83,3%, sobre el lecho físico, SVG oficial al 20% del lado corto y contraste
  ≥4,5:1. No elegir altura por el mayor contraste ni subirla al centro para aprobar un gate.
- La franja editorial de firma es y=78–87% para esta ejecución, **no una safe zone oficial universal**.
  No cumple el guardrail conservador inferior de Reels. Captions/controles pueden solaparla; registrar
  esta limitación y revisar el placement real antes de pautar. No convertir esa excepción en un PASS
  universal ni afirmar que una guía de Meta deja de incluir logos entre sus elementos clave.
- Medir por separado la envolvente de texto/CTA/cursor y la firma. La máscara local muestra también la
  firma fuera del guardrail de Reels: no esconderla ni alterar el guardrail para conseguir verde. Revisión
  visual de jerarquía y cierre al pie prevalece sobre el número aislado. Si un placement exige mantener
  todo dentro de otra ventana, producir una adaptación específica, sin subir automáticamente la firma.

Fuentes revisadas22/09/2026: [Meta, Reels ads guide, p.4](https://d3m889aznlr23d.cloudfront.net/img/events/458925814/assets/e042d2be.reels_ads_guide1.pdf),
[LinkedIn Single Image](https://www.linkedin.com/help/linkedin/answer/a426534/single-image-ads-advertising-specifications?lang=en-us)
y [LinkedIn Video Ads](https://business.linkedin.com/advertise/ads/sponsored-content/video-ads/specs).

### Entrega operativa y autorización

El operador autorizó pasar esta campaña a **Finales después de los ajustes**. Esa autorización permite la
promoción de los exports que superen QA; conservar Pilotos y descartes como historia. No requiere repetir
la aprobación del movimiento, ni autoriza publicar, pautar, contratar medios o afirmar rendimiento.

Cada final debe viajar con: concepto/territorio, tensión u objetivo deseado, audiencia/estado de entrada,
fase del embudo principal y secundaria, hipótesis, progreso esperado, CTA/descriptor/destino, KPI primario
y diagnóstico, ratio/placement, textos editables, prompts exactos y referencias por hash, motor, compositor,
comandos y dependencias, evidencia de contraste/safe areas, aprobación y limitaciones. Una fase es una
hipótesis de uso, no rendimiento demostrado. TOFU/MOFU/BOFU describen función, no un embudo rígido ni una
asignación automática del estilo de CTA.

Caso histórico v06: `ai-generations/2026-09-22_aeo-final-safe-v06/`, sustituido tras corrección de lecho. Paquete vigente:
`03. Finales/2026-09-22_SEO-AEO_fuente-preferida/v07-Codex-lecho-proporcionado`. Su LEEME y matriz gobiernan qué se
promovió, sus límites y cómo reproducirlo. Los prompts IA conservan trazabilidad; reproducir el gráfico
es determinista, regenerar fotografía no garantiza los mismos píxeles.

**Con el gate del 2026-09-23:** los planes v03–v07 declaran su firma externa, pero ninguna pieza se recompuso. Las
que el canon ahora reprueba —zona segura, cierre del concepto, firma— se dejan como están y se corrigen al
recomponer (decisión del operador). Un PASS de estas corridas no equivale a la salida 0 del gate vigente.

## Continuidad integral de la campaña

El [método SEO/AEO](social/2026-09-22-seo-aeo-paid-media-production-method.md) conecta dirección creativa, registro C, identidad/kits, prompts compilados, anatomía/pantallas, composición, formatos, embudo y archivo. La corrección de firma no termina moviendo el SVG: si el lecho nació para una firma alta, reducir su extensión física y devolver área a la escena; no dejar media imagen vacía. Validar el conjunto antes de promover.

## Corrección de lecho y firma v07

La v06 también fue corregida: había bajado el logo pero conservaba un primer plano que ocultaba casi media foto. La v07 edita las cuatro tomas 9:16 para recuperar escena y limitar el lecho al tramo inferior. **Ubicar el SVG dentro de la materia ya desenfocada, con aire bajo su transición; nunca por encima o montado en el canto.** La referencia de Claude orienta el cierre, no impone un Y universal. El centro 0,90 y el problema de safe zone describen una revisión anterior. Las cuatro stories finales v07 se recompusieron con centro **0,8565**, dentro de AXIS, sin alterar las otras 12 piezas. Siguen fuera de la guarda conservadora de Reels: medir oclusión en el preview del placement antes de pautar. La v07 histórica requiere su snapshot congelado para reproducción y no se presenta como salida 0 del gate vigente. Las coordenadas de §v06 son historia del caso, no receta a heredar.

**Criterio vigente para nuevas adaptaciones 9:16 (operador):** si bajar la firma la saca de la zona segura y
subirla mucho destruye el cierre, elevar ligeramente el inicio del lecho para alojarla dentro de su materia y
de la zona segura, con aire, manteniéndola visualmente al pie. No convertir el 90% histórico ni el 0,8565 de
las cuatro stories finales v07 en preset. No agrandar de nuevo el lecho hasta comprimir la escena. Verificar
ambos límites sobre el export y el preview del placement; las cuatro stories finales sí se recompusieron dentro
de AXIS, sin afirmar por ello que pasen la guarda conservadora de Reels o el gate vigente.

## 🔴 El concepto completo no es opcional — el gate lo verifica desde el 2026-09-23

**Medido el 2026-09-22 en CMP-001.** Nueve piezas de MOFU y BOFU se compusieron y pasaron el gate con
**sólo titular + beneficio + CTA + descriptor**: sin **entrada** y sin **remate**. El operador lo detectó
mirando las piezas, no ninguna herramienta.

**Por qué nada lo atrapó el 22/09:** `componer-cta.mjs` resuelve la entrada y el remate con `if (s.lead)` y
`if (s.after)`, así que su ausencia no es un error para el compositor — simplemente no los dibuja. El gate de
entonces medía contraste y protección de sujeto, no completitud del concepto, y una pieza incompleta salía verde.
**Cerrado el 2026-09-23** (contrato §18, tramo 4): el gate bloquea la pieza sin entrada o sin cierre.

🔴 **De dónde vino el error, que es lo que importa:** ante un «excesivo texto» del operador, el agente
ofreció en una pregunta la opción «dominante + puente + CTA» y el operador la eligió. **La opción no era
válida y el agente no la verificó contra este contrato antes de ofrecerla.** El exceso de texto se resuelve
**acortando cada voz** (§Jerarquía punto 5: *ajustar copy, cortes, escala o composición*), nunca eliminando
voces del concepto.

✅ **Dos comprobaciones antes de dar una pieza por terminada:**

1. **Cuenta las voces.** Concepto = entrada · titular · remate. Acción = beneficio · CTA · descriptor
   (beneficio y descriptor sólo cuando aportan información; entrada y remate **no** son de ese grupo).
2. **Lee el `ratioDominanteEntrada` del QA.** Restituir la entrada puede bajarlo: el compositor **achica el
   dominante solo** cuando no cabe en `dominantMax`, y ahí la jerarquía se aplana. Medido en `mo3`: con el
   dominante de cuatro palabras el ratio cayó a **2,9** —bajo el mínimo de 3×, y a 2,8 el operador ya había
   rechazado una pieza—; acortarlo a tres palabras lo devolvió a **3,7**. Hoy el gate bloquea bajo 3× y cuando
   el dominante no es la voz mayor. El remedio medido es acortar el dominante; una excepción `jerarquia` exige
   aprobador del registro.

**Mecanismo implementado (2026-09-23):** el gate exige `lead` y `after` salvo que la pieza declare
`conceptoReducido: { razon, aprobadoPor }`, con `aprobadoPor` del registro `scripts/foto/aprobadores.json`. La regla
de las tres veces y la del dominante como voz mayor también bloquean; sólo se exceptúan con excepción auditada
(`jerarquia` y `dominante-mayor`).
