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
pnpm foto:componer:cta <plan.json>   # compone y emite out/qa.json
pnpm foto:cta:gate     <plan.json>   # verifica los mínimos
```

🎯 **Lo que lo hace distinto de un gate normal: EXIGE la clave.** Si `contraste.cta` falta, **falla**. Un gate
que sólo valida las claves presentes no puede detectar una ausencia — y la ausencia era exactamente el bug.

⚠️ **Los dos comandos van en pareja y en ese orden.** Todos los planes de una misma carpeta escriben el mismo
`out/qa.json`: si compones el plan A y luego corres el gate del plan B, el gate lee el QA de A y reporta
**0 piezas** en vez de fallar. **Componer y verificar el mismo plan, seguido.**

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
| Render parcial por IDs | Emite `qa-parcial.json`; el gate lee `qa.json`. Para la pareja de comandos usar un plan completo en carpeta exclusiva |
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

