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

- Contorno/relleno: rectángulo mínimo con esquinas redondeadas, ajustado al texto y su padding. Texto: sin superficie ni borde de botón; puede conservar los controles de selección semántica. Ninguno usa sombras, biseles, brillo ni badges decorativos.
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

- Texto del CTA y descriptor: **≥4,5:1**. Para el CTA se mantiene este piso incluso si es grande; no usar la excepción de texto grande para rescatar una combinación débil.
- Contorno/silueta necesarios para distinguir la acción y controles/cursor que comuniquen significado: **≥3:1** contra colores adyacentes. La política interna también comprueba el perímetro del relleno contra la foto.
- En texto/contorno, medir tinta contra la fotografía; en relleno, tinta contra superficie y superficie/borde contra fotografía. Medir además descriptor y controles. No aceptar sólo el color teórico de la paleta.
- Sobre fondos variables, revisar las zonas más desfavorables bajo la tinta. El percentil98 del compositor es diagnóstico, **no sustituye el mínimo** para declarar el CTA accesible; si falla, cambiar tinta/superficie, posición o estilo. No redondear un fallo hacia arriba ni añadir scrim.
- Usar colores fuente y fondo, evitando medir antialiasing como si fuera el color principal; complementar con inspección del export reducido, grosor, tamaño y comprensión sin depender sólo del matiz. Preparar texto alternativo para publicación cuando la superficie lo permita.
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

El compositor canónico de CTA reutiliza el renderer AXIS. Sus campos efectivamente soportados y límites se verifican en el contrato técnico, §7; no asumir que campos posteriores como `centerX` o `signatureY` migran por nombre. Los runners archivados conservan reproducción histórica, no autoridad para nuevas copias.

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

- Declarar `cta.variant: text | outline | solid`, copy, destino, beneficio/descriptor opcionales, estilo/motivo y rol de cada voz.
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

## Continuidad integral de la campaña

El [método SEO/AEO](social/2026-09-22-seo-aeo-paid-media-production-method.md) conecta dirección creativa, registro C, identidad/kits, prompts compilados, anatomía/pantallas, composición, formatos, embudo y archivo. La corrección de firma no termina moviendo el SVG: si el lecho nació para una firma alta, reducir su extensión física y devolver área a la escena; no dejar media imagen vacía. Validar el conjunto antes de promover.

## Corrección de lecho y firma v07

La v06 también fue corregida: había bajado el logo pero conservaba un primer plano que ocultaba casi media foto. La v07 edita las cuatro tomas 9:16 para recuperar escena y limitar el lecho al tramo inferior. **Ubicar el SVG dentro de la materia ya desenfocada, con aire bajo su transición; nunca por encima o montado en el canto.** La referencia de Claude orienta el cierre, no impone un Y universal. En estos plates la última revisión sitúa el centro al 90%; eso no acredita safe zone de plataforma. Medir contraste allí y declarar oclusión posible antes de pauta. Las coordenadas de §v06 son historia del caso, no receta a heredar.

**Criterio vigente para nuevas adaptaciones 9:16 (operador):** si bajar la firma la saca de la zona segura y
subirla mucho destruye el cierre, elevar ligeramente el inicio del lecho para alojarla dentro de su materia y
de la zona segura, con aire, manteniéndola visualmente al pie. No convertir el 90% ni la franja de v07 en preset.
No agrandar de nuevo el lecho hasta comprimir la escena. Verificar ambos límites sobre el export y el preview
del placement; esta instrucción no afirma que los exports históricos ya hayan sido recompuestos.
