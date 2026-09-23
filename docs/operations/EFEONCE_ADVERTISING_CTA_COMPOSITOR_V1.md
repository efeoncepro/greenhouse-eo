# Compositor de CTA — comando canónico

> **Estado:** `Accepted` · **2026-09-22** · consolidación autorizada por el operador.
> Implementa el paso que [Tres voces + acción](EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) dejaba abierto:
> *«los campos `cta` del JSON piloto son locales de corrida: el comando canónico no se anuncia como compatible
> hasta una implementación y verificación explícitas»*. Esta es esa implementación y esa verificación.

## 1. Qué problema cierra

El compositor vivía **duplicado en cinco carpetas de corrida**, todas untracked y ya divergentes:

| Copia | Líneas | Qué tenía de propio |
|---|---|---|
| `_cta-p1` | 742 | la primera |
| `_cta-p1-v02`, `_cta-p2` | 746 | idénticas entre sí |
| `_aeo-cta-v03` | 750 | **`surfaceToken`/`inkToken`** (color por pieza), `align: center`, `-controls.svg` |
| `_registro-c-respuesta` | 750 | **`logo.y`** (firma fuera de la safe zone) |

🔴 **Arreglar una dejaba cuatro mintiendo.** Y dos mejoras reales vivían en copias distintas, así que ninguna
corrida las tenía juntas.

**Canónico:** `scripts/foto/componer-cta.mjs` — base v03 **+** `logo.y`/`logo.variant` **+** las dos
mediciones que faltaban. Expuesto como **`pnpm foto:componer:cta`**.

## 2. 🔴 El hueco de accesibilidad, y por qué era invisible

La regla dice **«sin excepción de aprobación visual para un CTA que falle estos mínimos»**. Pero en variante
`solid` el compositor marcaba `skipContrast` y **la clave `contraste.cta` nunca se escribía**.

> **El QA salía limpio porque el dato NO EXISTÍA, no porque hubiera pasado.**
> Una pieza sólida **no podía fallar el gate, porque nunca se medía.**

⚠️ **`skipContrast` estaba bien puesto:** bajo un relleno opaco, medir la tinta contra la *escena* da un
número sin sentido. El error fue **saltar el bloque entero**, y eso se llevó por delante la medición que sí
hacía falta y que nadie hacía: **el relleno contra la escena** — la que decide si el botón se despega del
plate, y justo la que falla al elegir `solid` sobre un plate claro.

✅ **Ahora `solid` declara las dos:**

| Clave | Qué mide | Cómo | Mínimo |
|---|---|---|---|
| `contraste.cta` | tinta contra relleno | teórico desde los tokens *(basta: el relleno es plano)* | **4,5:1** |
| `contraste.cta_superficie_vs_escena` | **relleno contra la foto** | sobre el píxel, p98; mínimo adicional exigido (§7) | **3:1** |

`contraste.cta` se emite **siempre**, sea cual sea la variante, con el mismo nombre — el QA no necesita saber
qué variante era.

## 3. El gate: `pnpm foto:cta:gate <plan.json>`

```bash
pnpm foto:componer:cta <plan.json>   # compone y emite out/qa-<plan>.json (con huellas)
pnpm foto:cta:gate     <plan.json>   # verifica los mínimos
```

🎯 **Lo que lo hace distinto de un gate normal: EXIGE la clave.** Si `contraste.cta` falta, **falla**. Un gate
que sólo valida las claves presentes no puede detectar una ausencia — y la ausencia era exactamente el bug.

**Delta 2026-09-22 (noche):** el gate además **falla si una pieza del plan no está en el QA** (no se compuso:
antes pasaba en verde por omisión) y **avisa, sin fallar,** cuando la firma mide menos de 3:1 contra su fondo,
cuando la firma queda sobre el sujeto (`firmaSobreSujeto`) y cuando la pieza declara zonas de sujeto ignoradas
(`zonasIgnoradas`, con su razón). El compositor, por su lado, **borra el `qa.json` anterior al empezar**: una
corrida que falla ya no deja números viejos que el gate pueda leer como vigentes.

~~⚠️ Los dos comandos van en pareja y en ese orden~~ — **cerrado el 2026-09-23 (§18, tramo 1).** Cada plan tiene
su QA (`out/qa-<plan>.json`) y cada pieza del QA lleva **huellas** del plan, del plate, del comando y del PNG; el gate
las recalcula. Componer el plan B ya no invalida ni suplanta al A, y una corrida parcial fusiona sus piezas con las
que ya estaban. El `out/qa.json` del formato anterior se sigue leyendo, pero el gate avisa que **no lo certifica**.

## 4. Retrocompatibilidad

Un plan sin `surfaceToken`/`inkToken` usa el par por defecto de la familia aprobada: relleno = superficie de
acento con tinta oscura; texto y contorno = tinta de acento. **Los campos de la base v03 conservan sus defaults; no implica equivalencia visual con todas las corridas posteriores (ver §7).** `surfaceToken`/`inkToken` permiten variar el color por pieza, que es lo que la regla
habilita al decir «lima no obligatorio».

## 5. Las copias de corrida quedan obsoletas

Las cinco copias siguen en sus carpetas y **no se borran**: son el registro de corridas ya entregadas y
pertenecen a las sesiones que las produjeron. Pero **ninguna corrida nueva las invoca**.

🔴 **Para cualquier agente: usar `pnpm foto:componer:cta`.** Copiar el script a una carpeta de corrida
reintroduce el problema que este documento cierra — y la próxima corrección volverá a dejar copias mintiendo.

## 6. Extensiones sobre v03

- **`logo.y`** *(fracción del alto, opcional)* — ubica el borde superior de la firma. Sin el campo, al pie, como siempre.
  🔴 En **9:16 de pauta la firma al pie cae dentro de la UI**: receta completa en la skill.
- **`logo.variant`** — forzar `negative`. En `auto` el compositor puede elegir navy sobre banda oscura y el
  contraste se desploma a **1,2:1** donde el blanco da 19,9.

## 7. Auditoría de compatibilidad y alcance — 22/09/2026

Revisión directa del código en `3934d4e26`, posterior a la consolidación `f864e0d9c`; pruebas locales en
`ai-generations/2026-09-22_aeo-compositor-audit/audit.json`, con hashes de ambos scripts. **No se modificó
el runtime del compositor en esta revisión.** La consolidación existe; no implica que todo campo de todas
las corridas haya sido incorporado ni que el gate cubra todo el contrato creativo.

| Capacidad | Estado comprobado |
|---|---|
| `text`, `outline`, `solid`, `surfaceToken`, `inkToken` | Implementados; prueba de cuatro piezas con las tres variantes |
| Tinta/relleno sólido | Ratio teórico emitido como `contraste.cta` |
| Relleno/foto | Emitido como `cta_superficie_vs_escena`, pero el helper usa **p98 de luminancia**, no mínimo local |
| `logo.y` | **Borde superior** fraccional del logo; no centro. `logo.width <= 1` es fracción del lado corto |
| `logo.variant: auto` con `logo.y` | La elección de tinta sigue muestreando el pie por defecto, no el Y personalizado. Declarar variante y validar donde se pinta |
| `centerX` de v06 | No consumido: centra en `W/2`. Migrar sin adaptación puede desplazar CTA al sujeto/proyección |
| `signatureY` de v06 | No consumido. Es centro en el firmador archivado; convertir a `logo.y = centro - altoLogo/(2*altoCanvas)` |
| `safeArea`, `signatureSafeArea`, `editorialReserve` | Metadatos de corrida, no guards implementados por este comando |
| `subjectProtection` | Comprueba borde inferior del descriptor; no toda la envolvente de cursor, titular o personaje. **Declaración obligatoria desde 2026-09-22**: el gate falla si una pieza con CTA no la declara. `{top, minClearance}` en px del plate cuando hay persona bajo el bloque; `false` cuando no la hay. Se mide en el plate, no en la composición |
| Render parcial por IDs | Desde 2026-09-23 fusiona sus piezas en `qa-<plan>.json` (el resto se conserva). Antes emitía `qa-parcial.json` aparte |
| Descriptor/cursor sin CTA | No inferir soporte opcional: el camino de layout accede a `s.cta` y al descriptor. El help heredado no demuestra soporte de pieza muda |

**Prueba de migración:** el render de cuatro piezas termina, pero el gate rechaza «Sé la referencia»:
CTA 1,5:1 y descriptor 1,7:1 porque perdió su eje desplazado y cayó sobre la proyección. Los finales v06
no se sustituyeron por este resultado. No anunciar reproducción idéntica desde el comando nuevo.

### Cobertura del gate

**Delta 2026-09-22 (CMP-002).** Dos huecos cerrados: (1) un `qa.json` anterior al plan falla — el compositor aborta en la primera pieza que viola `subjectProtection` y deja el QA de la corrida previa, que el gate leía como verde; (2) `subjectProtection` sin declarar falla — la guarda existía, pero ninguna pieza la declaraba y el CTA del KV-01 quedó sobre la cabeza de Nexa con el gate verde.

Fixtures locales: un CTA válido pasa y un CTA sin `contraste.cta` falla, como se buscaba. Sin embargo,
QA vacío, IDs ajenos, descriptor ausente y filas duplicadas terminan con exit 0. Por tanto, **exit 0 solo
no certifica cobertura**. Antes de aceptar el resultado exigir externamente:

1. Un plan por carpeta, sin IDs duplicados; QA recién compuesto desde ese mismo plan y esos mismos plates.
2. Exactamente una fila de QA por ID esperado, sin ausencias, duplicados ni filas ajenas.
3. Datos numéricos finitos para CTA, descriptor cuando exista y superficie cuando sea `solid`.
4. Medición adicional del **mínimo** local, contorno, cursor/controles, firma y zona segura. El helper
   p98 redondea a dos decimales; no usarlo para rescatar un valor real bajo el umbral.
5. Revisión visual por ratio, a tamaño completo y de consumo. El gate no comprueba identidad, dedos,
   orientación de tablet, tamaño del lecho ni cierre visual de firma.

Estas son limitaciones abiertas del comando, no fallos corregidos por documentarlas. Para ampliar el
runtime, hacerlo en el módulo canónico y verificar estos casos; no crear una sexta copia independiente.

### Dos modos de continuidad

- **Trabajo nuevo:** `pnpm foto:componer:cta` y `pnpm foto:cta:gate`, más las comprobaciones anteriores.
- **Reproducción histórica exacta:** ejecutar el runner/dependencias archivados con la entrega. Es una
  excepción de preservación de evidencia, no una base para nuevas campañas. Cualquier migración cambia
  versión y pasa comparación de composición y QA antes de reemplazar un final.

Método creativo, prompts, formatos, embudo y archivo:
[SEO/AEO Paid Media](social/2026-09-22-seo-aeo-paid-media-production-method.md).

## 8. El cursor del CTA tapaba el descriptor cuando el botón era corto — resuelto en el compositor

> **Desde el 22/09/2026 el compositor lo impide solo** (§12): si la caja del cursor cae sobre el descriptor en
> el eje X, el descriptor baja bajo la flecha. La regla de largo de abajo queda como criterio de ritmo —un
> botón mucho más corto que su descriptor se ve desbalanceado—, ya no como protección.

**Medido el 2026-09-22 en dos piezas de la misma tanda.** El cursor del botón se dibuja pegado al borde
derecho del CTA; el descriptor arranca en el mismo `x` que el botón y corre hacia la derecha. Cuando el
botón es **más angosto que el descriptor**, el cursor aterriza justo encima del texto:

| Pieza | CTA | Descriptor | Resultado |
|---|---|---|---|
| `mo2-no-te-citan` | `Compárate con ellos` (19) | `Panel competitivo · SEO + AEO` (29) | ✅ limpio |
| `mo1-canal-nuevo` v1 | `Mide tu brecha` (14) | `Brecha de citación · SEO + AEO` (30) | 🔴 la flecha se come `AEO` |
| `mo3-no-creernos` v1 | `Ve el método` (12) | `Seis motores, cada mes · SEO + AEO` (34) | 🔴 la flecha se come el `·` |

🔴 **El gate NO lo ve.** `foto:cta:gate` mide contraste de texto y superficie, y las tres pasaron: el
solape es geométrico, no de luminancia. **Sólo se ve mirando la pieza.**

✅ **Regla: el CTA se escribe con al menos tantos caracteres como el descriptor menos ~10.** En la práctica,
un botón de **19 caracteres o más** deja al cursor fuera de un descriptor de hasta 30. Si el copy del botón
tiene que ser corto por punch, acorta el descriptor en la misma proporción — no dejes que el cursor decida.

## 9. El CTA expresa el DESTINO de la etapa, no el ángulo de la pieza

Varias piezas de la **misma etapa del embudo** convergen en **una sola acción**; lo que cambia entre ellas
es el fraseo, no el lugar al que llevan. Si dos piezas de la misma etapa mandan a destinos distintos, la
etapa no está definida — está partida en dos campañas.

**Ejemplo vivo (CMP-001, MOFU):** tres objeciones distintas, un destino — el panel competitivo.

| Pieza | Dominante | CTA (fraseo) | Descriptor (destino) |
|---|---|---|---|
| `mo1` | No es un canal nuevo. | `Mide tu brecha de citación` | Panel competitivo · SEO + AEO |
| `mo2` | No te citan. | `Compárate con ellos` | Panel competitivo · SEO + AEO |
| `mo3` | No tienes que creernos. | `Mira cómo lo medimos` | Panel competitivo · SEO + AEO |

Contrato del embudo: [`CDR-005`](../campaigns/decisions/CDR-005-cmp001-embudo-momento-y-accion.md).

🔴 **El descriptor nombra lo que recibe quien hace clic, en palabras del comprador; nunca el nombre interno del
servicio** [CMP-002, 22/09/2026]. El canon dice que el descriptor «identifica oferta/servicio», y esa palabra
dejó pasar las etiquetas del catálogo: «Gobierno de agentes», «RevOps & CRM», «Optimización de tu portal»,
«Equipos humano-agente». Bajo el botón se leían sueltas. El operador: *«si lees como un humano los textos, esa
línea pareciera que no hiciera sentido»*. La prueba es leer botón y descriptor seguidos, en voz alta: «Veamos
qué puede tocar · Evaluación inicial sin costo» se entiende; «Veamos qué puede tocar · Gobierno de agentes» no.
En CMP-002 las seis piezas llevan a la misma puerta, la evaluación inicial sin costo
(`docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md`), y llevan el mismo descriptor, como en
CMP-001. **Verifica además que la landing diga lo mismo:** `/agenda/` sólo dice «Reunión de 30 minutos».

## 10. El acento del CTA se elige por la atribución que se BUSCA, cuando hay un partner en cuadro

**Hallazgo de CMP-002 (carril HubSpot), 2026-09-22, corregido por el operador el mismo día.** Las piezas
llevan el Sprocket de HubSpot como product placement, y el Sprocket es **naranja `#FF5C35`**, casi el mismo
tono que `accentSurface` (`#ff6500`). La primera lectura fue «un CTA naranja se le atribuye al partner» y el
set se compuso en lima. El operador lo revirtió: *«en verde no se vincula tanto a HubSpot»*. En una campaña que
**vende el servicio sobre HubSpot**, que la acción se asocie al partner es lo que se busca, no un riesgo.

> **Regla: con una marca de tercero en cuadro, el acento del CTA se decide por la atribución que la pieza
> BUSCA. Si la campaña vende el servicio sobre ese partner (carril HubSpot), el acento puede y debe
> vincularse a su color. Si el partner aparece de paso en una pieza sobre la oferta propia de Efeonce, el
> acento se diferencia de su color.** Se declara en el brief. No se deja al default del compositor: en
> CMP-001 las MOFU llegaron a lima por el default, no por decisión.

**Límite físico del naranja como texto, medido.** `#ff6500` tiene luminancia 0,306: sobre negro puro llega a
7,1:1, pero pasa 4,5:1 sólo si el fondo bajo el texto tiene luminancia ≤ ~0,029. Un techo o muro gris oscuro
ya no alcanza (CMP-002 KV-06: fondo p98 0,032 → 4,33:1). En `outline` se aplica la degradación canónica: **el
borde queda naranja y la tinta pasa a `inkOnDark`**. Si la pieza exige texto naranja, se regenera el plate con
ese fondo más oscuro; no se agrega scrim.

Aplica a cualquier criatura o marca de partner en cuadro —Clawd naranja terracota, Codex azul, Gigi con su
espectro completo— y se resuelve junto con las dos reglas de color que ya existen: la del portador por
variante (§ abajo) y la de degradación por contraste.

### El portador del acento cambia por variante — y el gate lo verifica

**Verificado en `componer-cta.mjs:638` por la sesión «Ads con lenguaje fotográfico Efeonce», 2026-09-22.**
En `variant: 'text'` el rect **no se dibuja**, así que `surfaceToken` es un campo **inerte**:

| Variante | Quién porta el acento | Qué se degrada si falla el contraste |
|---|---|---|
| `solid` | el **relleno** (`surfaceToken`) | la tinta (`inkToken`, a `inkOnLight`) |
| `outline` | el **borde** (`surfaceToken`) | la tinta |
| `text` | **la tinta** (`inkToken`) — no hay superficie | **nada: aquí degradar la tinta ES apagar el acento** |

🔴 **Consecuencia medida:** `03-referencia` de `aeo-cta-v03` (text + `inkOnDark`) **no tiene acento**. Es el
contraejemplo, no el ejemplo — y una sesión dedujo de ahí la regla inversa («el acento siempre va en la
superficie») y compuso seis piezas sin color con el gate en verde.

**Por qué el gate no lo veía, y por qué se cerró ahí:** `foto:cta:gate` sólo medía contraste, y **el contraste
mejora cuanto más neutro es el color**. Ante cada fallo, la corrección que el gate premiaba era quitar más
acento: la métrica y la regla apuntaban en direcciones opuestas. Hoy el gate valida el portador **por
variante**, no exige declarar el token —la ausencia resuelve a lima, que es acento válido, y exigirla rompía
planes aprobados— y **falla con cero piezas evaluadas**, porque recorría el `qa.json` de la última corrida y
bendecía un plan que nadie había compuesto.

**Y si el acento no alcanza el mínimo, se regenera el plate.** No se cambia de variante para esquivar la
medición: eso apaga el color. Es la misma regla que el canon fotográfico aplica al scrim.

## 11. Cómo medir `subjectProtection`

> **Delta 2026-09-22 (noche) — ya no hace falta medirlo a mano.** El compositor segmenta al sujeto y lo
> protege solo, en dos dimensiones (§14). Lo que sigue queda como **respaldo**: es la única protección cuando
> la segmentación no corre (`guardaSujeto: sin-mascara` en `qa.json`), y documenta por qué los métodos por
> brillo y por borde no alcanzaban — la tabla final de esta sección es exactamente lo que la segmentación
> resolvió.

Desde el 22/09/2026 el gate exige declarar la guarda en toda pieza con CTA (§7, Delta CMP-002). El número
que se declara es **la primera fila del sujeto en el plate**, y hay tres maneras medidas de equivocarse. Las
tres salieron el mismo día, de dos sesiones.

| Trampa | Qué pasa | Caso medido |
|---|---|---|
| Medir en el **ancho completo** o bajo `textWidth` | Captura una luz del fondo fuera del eje del texto y da un `top` **más alto** que el real: el compositor aborta sin que el texto toque nada | CMP-001 `p2-expediente`: 492–498 contra 656 reales, bajo la huella (sesión «Ads con lenguaje fotográfico») |
| Medir por **umbral de luminancia** | El pelo oscuro sobre fondo oscuro no supera el umbral: da un `top` **más bajo** que el real y **deja pasar texto sobre la cabeza**. Es la dirección peligrosa | CMP-002 con `_medir-sujeto.mjs` (umbral 0,42): KV-02 735 contra 465 reales · KV-01 594 contra 500 · KV-04 540 contra 518 |
| Declarar `false` **por criterio** | Una pieza que «no tiene a nadie debajo» puede tenerlo cuando el dominante se alarga | CMP-001 `mo3-no-creernos-169`: declarado `false`, medido `top=292`. Se corrigió la pieza (dominante 158→126), no la declaración |

**Método:**

1. **Compón una vez** para obtener `out/<id>-layout.json`. La huella del texto es `min(left)…max(right)` de
   **todos** sus `elements`. Sólo esa columna importa. 🔴 **No la angostes al descriptor**, aunque la guarda
   compare sólo su borde inferior: la guarda usa ese borde como el piso de TODO el bloque, y eso vale sólo si el
   `top` se midió bajo el ancho de todo el bloque. Caso CMP-002 KV-02: bajo el descriptor (x 92–293) el sujeto
   aparece en 639; la cabeza está en 465, a la derecha, justo bajo el CTA (hasta x ≈ 555). Con 639 declarado,
   el CTA podría bajar sobre la cabeza con la guarda en verde.
2. **Mira la silueta del sujeto dentro de esa columna** sobre un recorte del plate con regla horizontal cada
   20 px. En registros oscuros —pelo, ropa navy, fondos en sombra— el ojo sobre la regla manda. Un script de
   luminancia (`ai-generations/2026-09-21_registro-c-respuesta/_medir-sujeto.mjs`) sirve como **cota**: si da
   un `top` más alto que el que ves, investiga. Nunca lo uses como el valor en un plate oscuro.
3. **`minClearance: 24`** por defecto. Declara el `top` que ves, no uno inflado para que el compositor pase:
   si aborta, se ajusta la pieza (dominante, `top`, apoyo en una línea).
4. **`false` sólo medido:** «sin sujeto bajo la huella del texto», comprobado con el paso 2.

**Límite de la guarda: es vertical.** Compara `descriptorBox.bottom` con `top - minClearance` y no mira el eje
X. **Eso describe el mecanismo; no autoriza declarar `false` en 16:9.** Medido bajo la huella, las seis piezas
16:9 de CMP-001 tenían estructura debajo del texto —suelo, canto de mesa, el cuello negro de un micrófono que
arrancaba justo donde terminaba el descriptor en `mo2-no-te-citan-169`—, y ninguna quedó en `false`.

**Por qué no se automatiza todavía — dos métodos medidos:**

| Método | Dónde acierta | Dónde falla |
|---|---|---|
| Umbral de brillo bajo la huella | Sujetos claros | Se salta el sujeto oscuro y da un `top` más bajo: CMP-002 KV-02 735 contra 465; CMP-001 `p3-megafono-45` 732 contra ~560 |
| Borde: primera fila con σ > 4× la del muro, 3 filas seguidas (versión actual del script) | Sujetos claros y bordes marcados: CMP-002 KV-04 506 contra 518, KV-07 644 contra 645; CMP-001 dentro de 1–2 px en las piezas claras | 🔴 **Coronillas oscuras sobre la banda oscura:** KV-01 591 contra 500 (91 px más bajo; disparó con la proyección, no con la cabeza) · KV-02 498 contra 465 · y falsa alarma en KV-06, 353 contra 510 |

**Causa de la segunda falla:** la banda oscura que el canon pide para el texto es, por construcción, del mismo
tono que el pelo de Nexa. En KV-01 la σ por fila sube de 5,8 a 13,6 entre las filas 460 y 580 —del orden de la
textura del muro— y en KV-02 ningún píxel del pelo se aparta más de 25 niveles de la mediana de su fila antes de
la 500. Además, una coronilla es angosta: en una huella de ~800 px, sus primeras filas pesan poco en cualquier
estadística de fila. No hay umbral que separe pelo de muro. **Automatizar exige segmentación de persona**; hasta
entonces, el ojo sobre la regla manda y los scripts son cota.

## 12. El descriptor se separa del GRUPO del CTA, no del botón

**Pedido del operador, 22/09/2026:** *«el texto debajo del CTA está muy pegado al CTA»*. La causa era de
medida, no de valor. `descriptorGap` se medía desde el borde del **botón**, pero los corchetes de selección se
dibujan ~8 px por fuera de ese borde (`paddingRatio.block` 0,007 × ancho) y el cursor cuelga ~15 px bajo él.
Con el gap de 14 que usaban todos los planes, entre la esquina del corchete y el descriptor quedaban **~6 px**.

**Lo que hace ahora el compositor, para todos los planes:**

1. Resuelve la selección **antes** de ubicar el descriptor. Sólo depende de la caja del botón.
2. Mide `descriptorGap` desde el **borde inferior de la selección** (los corchetes), con un **piso de
   0,6 × `descriptorSize`**: con el cuerpo de 26 px usado hoy, 16 px. Ningún plan puede dejarlo pegado.
3. Si la caja del cursor (`cursorEvidence[].bounds`, que el renderer AXIS expone desde esta fecha) cae sobre el
   descriptor en el eje X, el descriptor baja bajo la flecha con el mismo gap.

**Efecto medido:** el aire corchete→descriptor pasa de ~6 a 16 px y el descriptor baja ~10 px en todas las
piezas. Composición en seco de los planes vivos: los seis de CMP-001 (`registro-c-respuesta`, 19 piezas)
componen sin cambios. En CMP-002 tres piezas quedaban 2–7 px sobre su `subjectProtection` y se ajustaron
bajando el dominante 4–5 px. Los pilotos cerrados `cta-p1-v02` y `cta-p2` tenían 1 px de holgura declarada y
ahora la guarda los frena: si se reabren, se ajusta la pieza, no el `top`.

**Si recompones un plan anterior:** el descriptor bajará ~10 px. Revisa la guarda y la pieza a ojo.


## 13. Escala tipográfica en formato horizontal — el texto llena su columna

**Pedido del operador, 2026-09-22:** en 16:9 la composición de texto se veía perdida en el cuadro.

🔴 **La causa NO era el tamaño de fuente respecto a su columna.** Medido:

| formato | lienzo | `textWidth` | columna |
|---|---|---|---|
| 4:5 | 1152 | 0,84 | **968 px** |
| 16:9 | 2048 | 0,44 | **901 px** |

**La columna es casi la misma; lo que cambia es el lienzo.** El texto se ve chico porque ocupa el 44% de un
cuadro muy ancho, no porque la fuente sea pequeña para su caja.

⚠️ **Por eso el primer intento —escalar por ancho de LIENZO— estaba mal y los números lo mostraron:** multiplica
los px por 1,78 contra una columna que no creció, el dominante topa en `dominantMax`, la entrada sí crece y
**la jerarquía se aplana** (el ratio dominante/entrada cayó a **2,3**, bajo el mínimo de 3).

✅ **Lo que sí sobra es espacio DENTRO de la columna**: el dominante llegaba a 0,32 del ancho con su límite en
0,44. El compositor escala el bloque **hasta que el dominante llene su `dominantMax`**, y aplica el mismo factor
a todas las voces, paddings y gaps absolutos — **así el ratio de jerarquía queda intacto** (medido: 4,0 en TOFU
16:9, 3,5 en MOFU y BOFU).

**Alcance: lienzos horizontales (`W > H`) y verticales altos (`H/W > 1,5`, o sea 9:16).** El 4:5 queda idéntico
porque la condición es falsa — verificado pieza por pieza: sus ratios no se movieron ni una décima.

**Por qué 9:16 entró después, y con qué evidencia.** Al medir cuánto llena el dominante su `dominantMax` por
formato apareció que **9:16 ya llenaba igual que 4:5** (93% · 80% · 102%, los mismos números, porque comparten
ancho de lienzo y copy) — o sea que ahí el texto **no estaba chico respecto a su columna**, sino respecto a un
lienzo muy alto. Aplicar el mecanismo igual valió la pena porque **actúa sólo sobre lo que no llena**: de las
tres piezas 9:16 medidas, una subió de **74% a 97%**, otra ya estaba al 97% y no se movió, y la tercera quedó
igual porque **el tope por espacio la frenó**. Es el comportamiento correcto: el mecanismo no infla lo que ya
está bien.

**Probado también contra planes de otras campañas** (`aeo-final-safe-v07`, 16 piezas, 8 de ellas en formato):
componen las 16, gates verdes, ratios entre 3,0 y 4,5 y llenados de 92 a 102%. Dos pilotos (`cta-p1-v02`,
`cta-p2`) abortan, pero **abortaban igual con el compositor anterior** — su causa es el cambio del descriptor
de §12, no esta escala. ⚠️ **Se verificó ejecutando el compositor viejo sobre los mismos planes**, no
asumiéndolo: tres piezas 16:9 de esa campaña tienen el dominante en dos líneas y la primera hipótesis fue que
esta escala las había partido; correr la versión anterior mostró que **ya estaban así**. Un margen de
seguridad que se había añadido por esa hipótesis se retiró al comprobarla falsa.

🔴 **La lección de método, que vale más que el número:** la pregunta «¿este texto está chico?» no se responde a
ojo ni comparando formatos — se responde midiendo **cuánto llena el dominante su propio tope**. Ese porcentaje
distingue el caso real (16:9 al 32%) del caso donde no hay nada que hacer (9:16 al 97%).

**Los topes del crecimiento — hoy los tres son mediciones (§14):**

| Tope | Qué es |
|---|---|
| `GROW_CAP = 1.6` | límite duro: por encima el titular deja de serlo y es una pancarta |
| **sujeto** | el mayor factor con el que ninguna caja de texto, CTA o cursor queda a menos de 3,5 % del lado corto de la silueta segmentada |
| **contraste** | ninguna voz baja del contraste que tenía a tamaño original (con exigencia máxima 4,5) |

> ⚠️ **Corrección 2026-09-22 (noche).** La primera versión de esta sección usaba un «tope por espacio»
> heurístico sobre `subjectProtection`, y cuando la pieza no la declaraba el tope quedaba en infinito. Las
> piezas de `aeo-final-safe-v07` no la declaraban: crecieron ×1,6 **sobre las personas** y el operador lo vio
> antes que cualquier gate. La afirmación de arriba —«componen las 16, gates verdes»— era cierta y no
> significaba nada: ningún gate miraba si el texto tapaba a alguien. El fail-safe corrige eso de raíz: **sin
> máscara de sujeto no se crece**.

**Es escalable:** un formato horizontal nuevo escala solo, sin tocar un plan.

## 14. Guarda de sujeto por segmentación — el texto no tapa a nadie, sin declarar nada

**Pedido del operador, 2026-09-22:** «tapan parte de la imagen donde hay personas… esto hay que resolverlo
incluso en el papá de forma robusta. Incluso en el pnpm». Se resolvió en `pnpm foto:componer:cta`, no en las
piezas.

**Cómo funciona.** Antes de componer, el compositor segmenta el plate con
`@imgly/background-removal-node` (modelo `medium`, **local y gratis**, el mismo de `scripts/ai/remove-bg.ts`).
La máscara se cachea por sha256 del plate en `node_modules/.cache/foto-sujeto/`: el segundo uso es
instantáneo. Después cuenta los píxeles de sujeto que caen dentro del aire de cada caja protegida: entrada,
dominante, cierre, nota, CTA, descriptor, el grupo completo del CTA con su cursor y los cursores de selección.

**Por qué segmentación y no brillo ni bordes** (medido en CMP-002 KV-02, primera fila real de la cabeza = 465):

| Método | `top` que da |
|---|---|
| umbral de brillo | 735 — 270 px tarde: deja pasar texto sobre la cabeza |
| σ de borde por fila | 498 |
| **segmentación** | **451** — el único que ve pelo oscuro sobre muro oscuro |

**Dos reglas, dos distancias** (fracción del lado corto, distancia real al borde de la caja):

| Regla | Distancia | Cuándo |
|---|---|---|
| **No tapar** | 1,2 % | siempre, a cualquier tamaño: si una caja toca al sujeto, la pieza **aborta** con el nombre de la caja |
| **Crecer respirando** | 3,5 % | sólo en la búsqueda del tamaño: el texto crece mientras mantenga este aire |

El 3,5 % se calibró contra las 30 piezas aprobadas de v07 y CMP-001. La más justa, 03-referencia-11, deja
4,08 %. Con 1,2 % la guarda «pasaba» con «SEO + AEO» rozando la cabeza de Clawd en 04-elegida-916: no tapar
no basta, el texto tiene que respirar. Una pieza aprobada que ya queda más cerca que 3,5 % a tamaño original
**no crece**: se respeta, no se empeora. Tolerancia de ruido: 8 px de máscara. Con 24, una caja chica se
tragaba 22 px reales de la cabeza de Clawd.

**El crecimiento también cuida la legibilidad.** Al crecer, las cajas bajan y pueden caer sobre una zona clara
(medido: «SEO + AEO» de 01-fuera-916 cayó sobre un monitor, contraste 2,98). La búsqueda del tamaño mide el
contraste de cada voz sobre el píxel y rechaza el factor si alguna baja de lo que tenía a ×1 (exigencia
máxima 4,5). Con la regla: ×1,48 y contraste 4,89.

**Evidencia en el QA.** Cada pieza escribe `escala` (el factor elegido) y `guardaSujeto` (`segmentacion` o
`sin-mascara`). `pnpm foto:cta:gate` acepta `segmentacion` como protección del sujeto. Declarar
`subjectProtection` a mano (§11) sigue valiendo y es el respaldo cuando la segmentación no corre. **Sin máscara
el texto no crece**: la ausencia de prueba no es permiso.

**Qué SÍ cuenta como sujeto.** El modelo separa primer plano de fondo: personas, mascotas y personajes (Clawd,
Codex, Gigi) y también **el objeto que sostienen o protagonizan** (tablet, monitor en mano, pedestal). Es la
lectura conservadora correcta para una pieza de pauta: lo que la foto muestra como protagonista no se tapa.

### `centerX` — el eje de un bloque centrado fuera del centro

Las piezas de v07 declaran `centerX` (0,29–0,60) y la copia de corrida de Codex lo soportaba; el compositor
canónico **lo ignoraba en silencio**. A tamaño original, 03-referencia-916 salía con el CTA sobre una
proyección clara: contraste 1,47 contra 15,14 del original. Ahora `centerX` mueve el eje del bloque, del CTA,
del descriptor y de la tarjeta. Verificado: a ×1 las 16 piezas de v07 reproducen el layout de Codex caja por
caja. La única diferencia es el descriptor, a propósito (§12).

### Un bloque centrado no se ancla lejos del centro

**Operador, 2026-09-22, sobre 03-referencia-916:** «está centrada y ahí se vería mejor alineada a la izquierda
por la posición». Un bloque centrado sobre un eje en 0,29 queda pegado a un borde, con aire desigual a cada
lado, y el ojo no encuentra el eje. El compositor **aborta** cuando `align: 'center'` y
`|centerX − 0,5| > 0,15`, y pide `align: 'left'` (con `cta.align: 'left'`). Se barrieron los 54 planes del
repo: la regla sólo atrapa esa pieza, en las cinco versiones donde aparece.

**Límite honesto de ese plate:** alineada a la izquierda y con CTA sólido, 03-referencia-916 se lee bien, pero
no crece (×1). A la derecha está la proyección clara y abajo la cabeza de ella. Las dos guardas frenan
correctamente: para tener más texto hace falta un plate con más reserva
(`EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md`), no un compositor más permisivo.

## 15. Un plan mal escrito falla antes de componer, y ningún cambio al comando se prueba a ojo

**Pedido del operador, 2026-09-22:** «piensa en qué más mejorarías al comando, analízalo bien y asegúrate de que
no se dañe, porque hoy funciona y funciona bien».

### La red de seguridad: `pnpm foto:componer:cta:regresion`

Compone **todas las piezas de todos los planes con CTA del repo** (104 piezas únicas de 30 planes al
2026-09-22) con dos versiones del compositor —`--ref` (HEAD por defecto) y `--candidato` (el archivo del árbol
de trabajo por defecto)— y compara pieza por pieza: estado (compone o aborta, y con qué mensaje), cada caja del
layout, el QA y el **sha256 del PNG final**. Cada pieza corre sola en una copia de su plan dentro de un
directorio temporal: **las carpetas aprobadas no se tocan**.

```bash
pnpm foto:componer:cta:regresion                              # HEAD contra tu árbol de trabajo
pnpm foto:componer:cta:regresion --ref 8dcc449b3              # contra cualquier versión anterior
pnpm foto:componer:cta:regresion --candidato <archivo.mjs>    # probar una propuesta sin tocar el canónico
pnpm foto:componer:cta:regresion --solo cmp002                # sólo los planes cuya ruta contiene el texto
```

Categorías del reporte: 🔴 cambia el estado · 🟠 cambia el layout o el QA · 🟡 sólo cambian píxeles ·
⚪ cambia el mensaje de error · 🔵 el QA suma claves (informativo). Sale con 1 ante cualquier diferencia salvo
la 🔵. **Regla: antes de commitear un cambio al compositor, correr el harness.** Si el cambio no debería alterar
nada, tiene que salir sin 🔴🟠🟡. Si altera algo, el reporte dice qué piezas y cuánto, y eso se aprueba mirando.

**Es determinista:** dos corridas del mismo código dan 104 de 104 iguales, PNG incluido. Una diferencia es
siempre del código, nunca ruido.

**Lo que midió el primer uso** (`--ref 8dcc449b3`, el compositor de antes de la escala): los cambios del
2026-09-22 mueven **40 piezas aprobadas** si se recomponen (12 de CMP-001, pedidas; 21 de los sets AEO de
Codex; **7 de CMP-002**) y hacen abortar 6 (cuatro copias de 03-referencia-916 por el eje corrido, KV-07-916
con el descriptor sobre la cabeza de la persona —verificado a resolución completa— y una pieza MOFU descartada).
Para recomponer un set aprobado **sin** que crezca: `"textGrowth": false` en cada pieza.

### Blindajes del comando (verificados con el harness: 86 de 86 piezas que componen salen idénticas al píxel)

| Blindaje | Qué evita |
|---|---|
| **Validación del plan antes de componer** | un campo numérico faltante producía coordenadas NaN y un error lejano sin pieza ni campo («CTA selection outside canvas»); ahora: «plan inválido — c-boton-lima: falta cta.fontSize numérico · …» |
| **Aviso de campos que el comando no lee** | así se perdió `centerX` en silencio. Los metadatos de otras herramientas (`altText`, `signatureY`, `signatureSafeArea`, `placementLimitation`…) están declarados y no avisan |
| **Ids repetidos · ids pedidos que no existen · plate inexistente · pieza muda · token de color inexistente · gesto sin la fuente Guttery · `final` con otra proporción que el plate** | errores claros antes de tocar un píxel; `final` con otra proporción **recortaba** la pieza |
| **`LienzoError`** | una prueba de tamaño que empujaba el CTA fuera del lienzo tumbaba el comando entero; ahora descarta ese factor |
| **Zona segura declarada (`safeArea`)** | el crecimiento no saca nada de ella; lo que ya esté afuera a ×1 se avisa; un bloque alineado a la izquierda arranca en `max(7 %, safeArea.x0)` — en 9:16 de Codex la zona empieza en 8 % |
| **`textGrowth: false`** | congela una pieza aprobada a su tamaño declarado al recomponer |
| **`subjectGuard.ignore: [{ box, reason }]`** | salida auditada para un falso positivo de la segmentación (un afiche del fondo): apaga SÓLO esa zona, con razón de ≥ 10 caracteres, y queda en el QA. Nunca se apaga la guarda entera |
| **Firma sobre el sujeto → aviso + `firmaSobreSujeto` en el QA** | medido: KV-01-916 (CMP-002) con la firma sobre la cadera de la persona, KV-02-169 rozando la silueta, mo3-no-creernos-916 sobre el pedestal. Aviso, no bloqueo: decidirlo es del operador |
| **Tamaños por defecto materializados antes de escalar** | una voz sin tamaño declarado no crecía con el resto (hoy ningún plan depende de eso) |
| **Nota centrada con su bloque** | en un bloque centrado, la nota encadenada quedaba alineada a la izquierda |
| **Caché de máscaras escrita atómicamente · rutas desde la raíz del repo · overlay del CTA sin `<text>` · mensajes con el id de la pieza · ayuda con el nombre real del comando** | robustez de base |
| **La variante automática de la firma se mide donde va la firma** | se medía al pie aunque la pieza declarara `logo.y`: la decisión miraba otro fondo |
| **Contraste en el peor caso según la tinta** | se medía siempre contra lo más claro del fondo (p98). Para tinta clara es el peor caso; para tinta **oscura** es el mejor, y el número salía optimista. Se detectó mirando la pieza: con la firma medida en su posición real, b2-916 pasaba al logo azul con «4,56» y a la vista casi desaparecía sobre el negro. Ahora: el mínimo entre p98 y p2. Con tinta blanca o clara el número es idéntico |

🔴 **Lección de método:** la segunda corrección no la encontró el harness, que sólo compara versiones: la encontró
**mirar el antes y después**. El harness dice QUÉ cambia; si el cambio es mejor lo decide la imagen, no el número.

### Cortes de línea sin viudas (aprobado por el operador el 2026-09-22)

Si el corte voraz deja una palabra sola en la última línea (**viuda**: «…cada / mes.») o termina
una línea en artículo, preposición o conjunción («…el / mismo día.», «…fuentes de / la respuesta»), prueba un
ancho menor que conserve **el mismo número de líneas**: el alto del bloque no cambia y ninguna guarda se mueve.
Medido con el harness: **cambia 7 piezas únicas** —4 de CMP-001 (b2 en 16:9 y 9:16, mo2 y mo3 en 16:9), 04-elegida-169 de
Codex y KV-01-169 y KV-06-169 de CMP-002—, todas sólo en el corte; cero cambios de estado. El QA registra ahora
`lineas` por voz (entrada, cierre, nota, CTA, descriptor): los cortes se verifican sin mirar la imagen.

## 16. Accesibilidad y contraste sobre el píxel

**Pedido del operador, 2026-09-22:** «provee al comando de herramientas robustas y de alta calidad de
accesibilidad y contraste».

**Política** (skills `greenhouse-typography-accessibility` y `a11y-architect`): **se aprueba con WCAG 2.2 AA**;
APCA es verificación perceptual de respaldo y **avisa, no bloquea**. Los umbrales no viven en el código: salen del
contrato AXIS `axisAdvertising.accessibility` (texto normal 4,5:1 · texto grande 3:1 desde 24 px o 18,66 px en
negrita · límites no textuales 3:1).

**Módulo puro `scripts/foto/accesibilidad.mjs`** — probado contra valores publicados
(`node --test scripts/foto/accesibilidad.test.mjs`, 8 de 8):

| Herramienta | Fuente verificada (2026-09-22) |
|---|---|
| razón WCAG 2.2 y luminancia relativa | W3C Rec oct. 2023 — referencias WebAIM: 21:1, #767676 = 4,54:1 |
| APCA-W3 0.1.9 con signo (Lc) | constantes y algoritmo copiados de `Myndex/apca-w3/src/apca-w3.js` — #888/#fff = 63,06 · negro/blanco = 106,04 |
| umbrales APCA Bronze | readtech.org/ARC (2023-02-10): Lc 45 contenido > 36 px · 60 contenido · 75 texto corrido > 2 líneas |
| simulación de daltonismo | Machado, Oliveira y Fernandes, IEEE TVCG 15(6), 2009 — severidad 1,0, en RGB lineal |
| tamaño EN PANTALLA | px del lienzo × 390 / ancho del lienzo: la pieza tal como se ve en un teléfono |
| texto alternativo | WCAG 1.1.1 + 1.4.5: toda voz visible en orden de lectura, más la escena si el plan trae `altText` |

**En el compositor** (sin cambiar un píxel: regresión 86 de 86 idénticas): cada pieza registra en el QA
`accesibilidad.voces.<voz>` —WCAG según su tamaño en pantalla, APCA, % del área bajo el umbral y, en tintas de
color, el contraste con cada tipo de daltonismo— y escribe `out/<id>.alt.txt`. Se mide por primera vez el **borde
del CTA con contorno** (antes sólo el relleno del sólido).

**En el gate:** **bloquea** cualquier voz bajo WCAG 2.2 AA y cualquier límite del CTA bajo 3:1 (calibrado contra
las 86 piezas: 0 fallas, no rompe nada aprobado). **Avisa** APCA bajo Bronze, daltonismo, texto de menos de 9 px en
el teléfono y alternativa sin escena.

**`pnpm foto:accesibilidad <piezas.json>`** escribe `out/accesibilidad/reporte.md` (tabla por pieza y voz) y
`<id>-daltonismo.png` (la pieza a 390 px en visión típica, protanopía, deuteranopía y tritanopía).

**Lo que midió la primera corrida sobre las 86 piezas** (hallazgos de diseño, no fallas de WCAG):

| Hallazgo | Medido |
|---|---|
| El naranja de marca como TEXTO sobre oscuro es débil para APCA | Lc ≈ 44 contra 45–60 (94 avisos); WCAG lo aprueba (~6:1) |
| El CTA naranja con protanopía | cae a ~3,6:1 (48 casos); relleno o borde a 2,6–2,8:1 |
| Texto diminuto en el teléfono, sobre todo en 16:9 | 43 de 86 descriptores bajo 9 px; mínimo 3,8 px (KV-04-169) |
| Alternativas sin descripción de escena | 46 de 86 piezas (CMP-001 y CMP-002 no traen `altText`) |

## 17. Variantes, selección y anclas del CTA

**Preguntas del operador, 2026-09-22/23:** «los CTA hay 3 tipos pero los agentes solo usan 1, ¿será porque no lo
ven o por qué quedó mal cableado?»; «en el modo relleno, ¿es realmente necesario los corchetes?»; «si los CTA
necesitan puntos de anclaje como el bounding box para que queden seleccionables por los cursores, dales esa
capacidad»; y la decisión: «en los CTA no es necesario esos corchetes, no cumplen ninguna función en ninguno de los
tipos»; y el ajuste: «la versión sin rectángulo redondeado sí necesita los corchetes porque queda huérfana».

### Por qué los agentes usaban un solo tratamiento — medido, no supuesto

| Plan | Tratamientos usados |
|---|---|
| Sets AEO de Codex (v03–v07) | los tres: 8 relleno · 4 contorno · 4 texto |
| CMP-002 (24 piezas) | **sólo contorno** |
| CMP-001 MOFU y BOFU | **sólo contorno lima** (los tres se probaron en TOFU) |

Ninguno era un error de dibujo: los tres componen bien. Eran dos causas:

1. **No se veían.** El canon pide elegir «por composición» y registrar el motivo, pero nada mostraba los tres
   sobre la foto real y nada pedía el motivo: cada agente copiaba el bloque de CTA de su plan anterior.
2. **El gate era asimétrico.** Medía el relleno del sólido contra la escena y exigía acento en la tinta del de
   texto, pero **no medía el borde del contorno**: el contorno era el único que nunca podía fallar, y los agentes
   aprenden del gate. Con §16 el borde se mide (1.4.11, 3:1) y los tres quedan parejos.

### Lo que se agregó

| Herramienta | Qué hace |
|---|---|
| `pnpm foto:componer:cta <plan> --variantes` | compone cada pieza en sus tres tratamientos en `out/variantes/` y arma una hoja por pieza con la medición de cada uno (tinta, límite, APCA, daltonismo, ✗ WCAG). No toca el QA del plan |
| `cta.variant: "auto"` + `cta.prominencia` | el autor declara la intención del canon —`discreta` (texto) · `delimitada` (contorno) · `destacada` (relleno)— y la medición sobre la escena decide si la permite; si no, **escala** a la que separa más, nunca a una menos visible. Viable = WCAG con margen 1,1, ningún píxel bajo el umbral **y también con daltonismo** (el naranja como tinta sobre el gris oscuro de una foto pasa en visión típica y cae bajo 4,5:1 con protanopía). Se decide UNA vez, a tamaño original, y queda fija mientras el texto crece. El motivo queda en `qa.ctaVariante` |
| aviso `cta.variantReason` | si una pieza elige tratamiento sin motivo, el comando lo avisa (el canon lo pide) |
| `cta.seleccion` | el CTA es un destino **seleccionable** completo del contrato AXIS: 8 anclas (esquinas y centros de cada lado); `marco`: open-brackets · four-corners · eight-handles · ninguno —por defecto, **sin marco en contorno y relleno, corchetes en texto**—; `cursores`: el local en cualquier ancla y colaboradores con etiqueta en las esquinas (regla AXIS). Un ancla inválida falla antes de componer con la regla de AXIS que rompe (`collaborator-anchor-not-corner`) |
| **corchetes sólo en texto** | decisión del operador (2026-09-23): en contorno y relleno el rectángulo ya delimita la acción y los corchetes no cumplían función; en texto se conservan porque sin rectángulo el CTA queda huérfano. El cursor se conserva en los tres. Las piezas de contorno y relleno cambian sólo los píxeles de los corchetes (0,01–0,02 % de la imagen); ninguna cambia de posición |
| choque selección ↔ texto | ningún cursor, etiqueta ni marco de selección —del titular o del CTA— puede tapar otra voz de texto. Hallado componiendo un colaborador arriba del CTA: su cursor caía sobre la nota. Medido en las piezas aprobadas: 0 choques, así que bloquea sin romper nada |
| mensajes de lienzo | «se sale del lienzo» ahora dice QUÉ y POR DÓNDE: «etiqueta «IA» por izquierda. Prueba otra esquina…» |

### Correcciones que encontraron las 10 pruebas (§15)

| Prueba | Hallazgo | Corrección |
|---|---|---|
| P05 | la búsqueda del tamaño **no medía** el relleno ni el borde del CTA | ahora los mide, con el umbral de límites (3:1). Efecto real: 01-fuera-916 (Codex) crecía a ×1,36 con su borde naranja en 3,42:1 (2,62:1 con protanopía); ahora frena en ×1,30 con el borde en 4,47:1 |
| (comparando `auto` con `--variantes`) | la tolerancia de medición (0,05) dejaba a una voz terminar en 4,47:1 con el mínimo en 4,5 | la tolerancia nunca cruza el umbral: si la voz cumplía a ×1, cumple crecida |
| P04 | el «3,5 % de aire» no era exacto: la guarda toleraba 8 px de máscara también al CRECER, y esos 8 px eran una fila real de pelo (el descriptor de 02-reconoces-916 quedaba a 3,36 %) | al crecer, tolerancia 0 (en la duda, crecer menos); los 8 px quedan sólo para el bloqueo duro. Efecto medido: 02-reconoces-916 ×1,208 → ×1,201 y 04-elegida-916 ×1,125 → ×1,122 |

## 18. Certificación adversarial (2026-09-23) y plan para lo que no pasó

**Encargo del operador:** «10 pruebas y con 2 subagentes adversariales certifiques que funciona con todos los
estándares de calidad; los que no pasen, planea cómo resolverlo de forma robusta y escalable, apoyándote en las
skills de arquitectura y de diseño».

**Veredicto de los dos auditores (arquitectura y diseño): NO CERTIFICA.** El camino feliz es determinista y las
defensas del día resisten (validación, eje, margen de zona segura, guarda de sujeto contra la máscara, matemática de
WCAG/APCA/Machado, rechazo del CTA sin acento). Pero cada uno encontró, verificado corriendo y mirando, caminos en los
que el gate da verde sobre una pieza mala. Evidencia: `/tmp/claude-501/adversarial-arq/` y
`/tmp/claude-501/adversarial-diseno/` (scripts de medición, mutantes y recortes).

### Decisión

No se da por certificado. Se cierra en **cinco tramos**, en orden de riesgo. Cada tramo sale con tres pruebas: la
regresión sin diferencias no declaradas, las 10 pruebas en verde y **un mutante por guarda nueva** que demuestre que
alguna prueba lo detecta. Una guarda que ningún mutante hace fallar no está probada. Lo que cambia la salida de
piezas aprobadas se muestra antes y después y lo aprueba el operador.

### Hallazgos consolidados

| # | Severidad | Hallazgo (auditor) | Corrección robusta y escalable |
|---|---|---|---|
| 1 | 🔴 | **El gate certifica salidas que no son del plan** (arq): decide la vigencia por fecha de archivo; todos los planes de una carpeta comparten `out/qa.json`; dos composiciones concurrentes se mezclan (7/8 corridas certificaron contenido ajeno) | el QA guarda **huellas sha** de la pieza del plan, del plate, del compositor y sus dependencias, y de cada PNG, y el gate las **recalcula**; un QA por plan; escritura en temporal + renombrado atómico; bloqueo por carpeta `out/` |
| 2 | 🔴 | **La guarda de sujeto se puede apagar o envenenar** (arq): `subjectGuard.ignore` con la caja `[0,0,1,1]` apaga todo; una máscara corrupta en caché pasa como `segmentacion`; si la segmentación falla vuelve a un `subjectProtection` que ya se probó equivocado | caché con metadatos verificados al leer (sha del plate, modelo y versión, dimensiones, sha de la máscara); zonas `ignore` con área máxima y aprobación registrada; el gate bloquea `sin-mascara` y zonas ignoradas sin aprobación; una declaración manual nunca contradice la máscara |
| 3 | 🔴 | **Contraste medido en la caja, no en el glifo** (diseño): en 01-fuera-916 crecida, el p1 del trazo de «+ AEO» da 2,4–3,1:1 sobre el canto iluminado de un monitor y el gate reporta 4,53 | medición por **máscara de glifos**: cada voz se rinde sola como alfa y se exige p1 ≥ umbral; al crecer, piso de umbral × 1,1; objetos declarables como protegidos (`protect: [{box, reason}]`) |
| 4 | 🟠 | **Sin esquema del plan** (arq): emoji y hebreo salen como cuadros vacíos; `dominantSize: 0` deja la pieza sin titular; tamaños negativos invierten el texto; entidades literales en etiquetas; `align: 'centre'` salta la regla del eje; un `id` con `../` escribe fuera de `out/`; una voz sin medición se descarta en silencio | **un esquema declarativo como fuente única** (enums, rangos, fracciones, hex, `id` con patrón), cobertura de glifos con fontkit, entidades decodificadas, medición nula = falla |
| 5 | 🟠 | **El crecimiento ignora restricciones declaradas** (arq): `editorialReserve` no se lee; el botón puede quedar bajo la firma | **una sola función de invariantes** posteriores a la maquetación —cajas no degeneradas, sin choques entre texto, CTA, firma y selección, reservas— que usan la búsqueda del tamaño, la composición final y el gate |
| 6 | 🟠 | **Texto diminuto pero «AA»** (diseño): en 16:9, 19 de 22 descriptores bajo 9 px en el teléfono (mínimo 3,8 px) | token AXIS nuevo `minReadableCssPx` por rol, **bloqueante**; si el formato no alcanza, recomponer o declarar un placement de escritorio |
| 7 | 🟠 | **La firma no tiene contrato en el gate** (diseño): b2-916 a 2,44:1; KV-01-916 sobre la persona; 16:9 al 13–14 % y 1:1 al 18 % del lado corto, cuando el canon pide 4,5:1 y 20 % | exigir `logo` o `firma: false` con razón; contraste ≥ 4,5:1 y tamaño desde el canon; firma sobre la máscara = falla con excepción auditada; el compositor busca en el lecho una Y que cumpla |
| 8 | 🟡 | Zonas seguras AXIS nunca leídas (diseño): margen 7 % contra 7,5 % feed y 10 % story; texto a 3–5 % del borde en 4:5 y 1:1 | `axisAdvertising.safeArea` por formato como defecto; el plan sólo puede estrecharla; salir = falla |
| 9 | 🟡 | Alineación de columna (diseño): en CMP-002 botón y descriptor 11–21 px a la derecha de la columna; CTA de texto sangrado | `cta.x` derivado de la columna; descriptor siempre en la columna; `paddingX: 0` en texto; piso de aire sobre los corchetes |
| 10 | 🟡 | Concepto y jerarquía (diseño): 40 de 40 piezas AEO sin remate; la regla de 3× sólo avisa en consola | `lead` y `after` obligatorios salvo `conceptoReducido` con razón; ratio ≥ 3 en el gate |
| 11 | 🟡 | CTA perceptual (diseño): APCA bajo Bronze en 54 de 86 y daltonismo bajo 4,5 en 42 | APCA y daltonismo bloqueantes **sólo para el CTA**; `auto` prueba la degradación canónica (borde naranja + tinta `inkOnDark`) antes del relleno |
| 12 | 🟡 | Borde del contorno fijo de 2 px (diseño): 2,5–2,9:1 efectivo en 16:9 a DPR 2 | grosor ≥ 1 CSS px en pantalla; medir el anillo, no la caja |
| 13 | 🟡 | Harness con puntos ciegos (arq): 0 casos sale en verde; 84 de 188 piezas sin plate se saltan en silencio; la referencia usa las dependencias del árbol de trabajo | manifiesto de piezas aprobadas con **piso de cobertura**; fallar ante faltantes; extraer de git también las dependencias de la referencia; comparar avisos |
| 14 | 🟡 | Una falla deja artefactos y errores opacos (arq) | escritura atómica de salidas; los errores de esquema nombran pieza y campo |
| 15 | 🟢 | Texto alternativo (diseño): «Botón:» anuncia un control que no existe; falta texto de selección y gesto | «Llamado a la acción:»; sumar etiquetas y gesto; no duplicar si `altText` ya trae el copy |
| 16 | 🟢 | Pruebas débiles (arq): P09 se verifica a sí misma; P06 no detecta un mutante sin zona segura; faltan piezas de prueba donde cada guarda sea la que frena | oráculo independiente para P09 (máscara de glifos); piezas de prueba por guarda; medir la **puntuación de mutantes** |

Ya corregido en `29393afe5`: la búsqueda del tamaño mide relleno y borde del CTA (P05); la tolerancia nunca cruza el
umbral; tolerancia de máscara 0 al crecer (P04); P04 y P08 ya no pueden pasar vacías; P05 suma una pieza que el
contraste sí frena.

### Tramos

| Tramo | Contenido | Por qué en este orden |
|---|---|---|
| 1 · Integridad | hallazgos 1, 2, 4 (esquema mínimo: `id`, rangos, medición nula) y 14 | hoy el gate puede certificar una pieza ajena o una guarda apagada: sin esto, ningún otro número es confiable |
| 2 · Contraste real | 3, 11, 12 y el oráculo de P09 | cierra la brecha entre lo que el gate mide y lo que se ve |
| 3 · Esquema e invariantes | 4 completo y 5 | una sola fuente de verdad del plan y de la geometría válida, compartida por búsqueda, composición y gate |
| 4 · Canon hecho regla | 6, 7, 8, 9, 10 y 15 | convierte en bloqueo lo que el canon ya dice (firma, zonas, concepto) y agrega lo que falta en AXIS |
| 5 · Harness y pruebas | 13 y 16 | cobertura y puntuación de mutantes: que la red de seguridad no tenga agujeros |

### Estado de los tramos

**Tramo 1 · Integridad — cerrado (2026-09-23).**

- **QA por plan con huellas.** `out/qa-<plan>.json`; cada pieza registra `huellas: { pieza, plate, compositor, png }`
  (sha256). El gate las recalcula: plan, plate o PNG distintos = **falla**; comando distinto = aviso («recompón para
  certificar con la versión vigente»). La fecha de un archivo ya no decide nada. El `out/qa.json` anterior se lee con
  un aviso de que **no certifica**.
- **Escritura atómica y al final.** Los archivos de una pieza (PNG, vista a 390, layout, overlay, controles,
  evidencia y alternativa) se escriben juntos, en temporal + renombrado, sólo si la pieza pasó todo; el QA se
  registra después de sus archivos. Una pieza que aborta no deja nada. Las pruebas de tamaño no escriben.
- **Bloqueo por carpeta.** Dos composiciones en la misma `out/` ya no se mezclan: la segunda se rechaza nombrando el
  proceso que la ocupa. Un bloqueo de un proceso muerto se toma.
- **Caché de máscaras verificada.** Cada máscara lleva `<sha>.json` con sha del plate, modelo, versión del
  segmentador, dimensiones y sha de la máscara; si algo no calza se regenera sola (la segmentación es determinista:
  regenerar da los mismos bytes, medido en tres plates). `FOTO_MASCARAS_DIR` aísla la caché.
- **Esquema declarativo** (`scripts/foto/cta-esquema.mjs`, zod): tipos, rangos, enums, hex, fracciones, `id` con
  patrón (sin rutas), `null` = ausente, campos desconocidos avisados. `subjectGuard.ignore` exige `reason` (≥ 10
  caracteres) y `aprobadoPor`, con **máximo 10 % del lienzo por zona y 15 % en total**: la guarda ya no se apaga entera.
- **La ausencia es el fallo, también aquí.** El gate bloquea `guardaSujeto: sin-mascara` (una franja declarada a mano
  no protege la silueta) y una voz sin medición; el compositor aborta si una voz no se puede medir.
- **Pruebas:** P03 suma caché envenenada y «sin archivos tras abortar»; P07 suma `id` con ruta, guarda apagada,
  zona sin aprobador y `null`; P10 suma corrida parcial, dos planes en una carpeta, fecha sola, plan/PNG/plate
  cambiados, sin máscara, medición ausente, QA sin huellas, formato anterior y composición concurrente. **Nueve
  mutantes** (sin bloqueo, caché confiada, escribe antes, QA compartido, parcial que pisa, sin esquema, gate sin
  huellas, gate que acepta sin máscara, gate que ignora el nulo): **las nueve los detecta alguna prueba**.

**Tramo 2 · Contraste real — cerrado (2026-09-23).**

- **Contraste sobre el trazo, no sobre la caja.** El compositor rinde la capa de texto sola y compara cada píxel de
  glifo (alfa ≥ 50 %) con SU fondo y con la tinta que realmente tiene; se exige el **1 % peor** ≥ umbral WCAG según el
  tamaño en pantalla (`accesibilidad.voces[v].glifo`, con la `caja` exacta medida). El gate lo **bloquea**; la caja
  sigue registrada para comparar. Caso fuente reproducido en P10: 01-fuera-916 al tamaño al que crecía antes (×1,48)
  pasa en la caja y falla en el trazo.
- **Crecer exige margen en el trazo:** umbral × 1,1, o lo que la voz ya tenía a ×1 (menos 0,05 de ruido). Medido:
  01-fuera-916 ahora crece a ×1,42; las otras cuatro piezas de P04 no cambian.
- **Zonas protegidas** (`protect: [{ box, reason }]`): objetos de la escena que el texto no tapa aunque no sean una
  persona. Al crecer descartan el factor; a tamaño final, abortan.
- **Borde del contorno de al menos 1 CSS px en un teléfono** (`max(2, ⌈ancho/390⌉)` px; el relleno conserva 2 px) y
  medición del **anillo** en la pieza reducida a 390 CSS px × DPR 2: grosor en CSS px y contraste de la mediana del
  trazo contra el peor fondo exterior. El gate bloquea < 1 CSS px o < 3:1.
- **`auto` con degradación canónica:** antes del relleno prueba el contorno con tinta `inkOnDark` y el acento en el
  borde (§10); si nada alcanza con margen, queda la que **más separa** (antes, siempre el relleno). Medido al
  corregirlo: sobre gris oscuro con protanopía el relleno naranja **también** falla —la tinta oscura del botón cae a
  ~3,6:1— y el motivo decía «se funde con la escena» aunque la separación era 5,76:1; ahora nombra la condición que
  falló.
- **P09 deja de verificarse a sí misma:** con `FOTO_EVIDENCIA=1` el compositor deja la capa de texto y el fondo, y la
  prueba recalcula el 1 % peor del trazo con aritmética propia (27 voces, 0 desacuerdos) y mide el grosor del borde en
  el PNG final; corre además las pruebas unitarias de los módulos puros.
- **APCA y daltonismo del CTA siguen avisando, sin bloquear** (decisión pendiente 3).

**Tramo 3 · Esquema e invariantes — cerrado (2026-09-23).**

- **Cobertura de glifos:** cada campo de texto se valida con la fuente que lo dibuja (Poppins, Bricolage, Guttery; las
  etiquetas de cursor con Poppins 700). Un carácter que la fuente no tiene —emoji, hebreo— salía como un cuadro vacío
  con todas las mediciones en verde; ahora el plan falla antes de componer, nombrando campo y punto de código.
- **Entidades de XML** en las etiquetas de cursor (`scripts/foto/svg-texto.mjs`): se decodifican las cinco
  nombradas y las numéricas, con `&amp;` al final para no decodificar dos veces. «IA <3» salía dibujada «IA &lt;3».
- **Una sola función de invariantes** (`scripts/foto/cta-invariantes.mjs`) para la búsqueda del tamaño, la
  composición final y el gate: cajas no degeneradas; texto, botón y firma sin tocarse; ninguna selección sobre una voz
  que no es su destino (la regla de 2026-09-22, ahora compartida). La firma y la url se ubican con la misma fórmula que
  el dibujo, así el crecimiento las ve antes de pintarlas. El gate las recalcula sobre el `layout.json`, que ahora
  lleva huella (`huellas.layout`) y los elementos de la maquetación.
- **Reserva editorial** (`editorialReserve`, px del plate): el crecimiento no la cruza; la composición final avisa y
  el gate la bloquea. **No aborta la composición** porque piezas aprobadas de v05–v07 declaran una reserva que nadie
  verificaba (01-fuera-916 a su tamaño anterior bajaba hasta y=600 con la reserva en 560).
- **La guarda de sujeto se evalúa antes que la maquetación** en la composición final, así cada pieza aborta por su
  causa principal (el orden cambiaba el mensaje de P03).
- Regresión contra e68d28885: 18 iguales (las que ya abortaban), 78 sólo suman claves con los píxeles idénticos, y 8 crecen menos porque ahora respetan su reserva editorial (01-fuera y 04-elegida de v03, v05–v07 y la auditoría: ×1,10→×1,05, ×1,25→×1,24, ×1,12→×1,04, ×1,42→×1,29). **Ninguna pieza cambia de estado.** Seis piezas 1:1 de v04–v07 quedan 2–6 px fuera de la reserva que declaran a su tamaño original: esas reservas se midieron antes de que el descriptor se separara del grupo del CTA (§12), y el gate ahora las marca (se resuelve corrigiendo la reserva o con excepción auditada).

### Cuatro pilares (hoy → al cerrar los tramos)

| Pilar | Hoy | Meta | Qué lo sube |
|---|---|---|---|
| Safety | 2/5 | 4/5 | guardas no desactivables sin aprobación registrada, caché verificada, `id` restringido |
| Robustness | 2/5 | 4/5 | esquema, invariantes compartidas, escritura atómica, QA atado por huellas |
| Resilience | 3/5 | 4/5 | caché que se regenera sola, artefactos que no quedan a medias, errores que nombran la causa |
| Scalability | 3/5 | 4/5 | harness con manifiesto y cobertura, referencia hermética |

### Reglas duras que deja esta auditoría

- **NUNCA** un gate que decide por fecha de archivo: decide por huellas del contenido.
- **NUNCA** una guarda que el plan pueda apagar entera; las excepciones son acotadas, con razón y aprobación registrada.
- **NUNCA** una medición ausente cuenta como pase.
- **NUNCA** calibrar un umbral nuevo sólo contra lo ya aprobado: es circular (así pasó 01-fuera-916). Se calibra contra
  el canon y se muestra qué piezas aprobadas lo incumplen.
- **SIEMPRE** una guarda nueva con un mutante que alguna prueba detecte.

### Decisiones pendientes del operador

1. Valores de `minReadableCssPx` por rol (CTA, descriptor, apoyo) y qué hacer con 16:9 en teléfono: recomponer o
   declarar placement de escritorio.
2. Firma: ¿el compositor busca la Y automáticamente, o el plan la declara y el gate sólo verifica?
3. APCA y daltonismo: ¿bloqueantes para el CTA?
4. Con Gigi en cuadro, ¿el acento del CTA se cede a Gigi (`acento.cedidoA` auditado)?
5. Canon de variantes: «escalar sí, degradar no» frente a §10 («no se cambia de variante para esquivar la medición»).

