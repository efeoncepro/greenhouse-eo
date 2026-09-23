# Compositor de CTA — comando canónico

> **Estado:** `Accepted` · **2026-09-22** · consolidación autorizada por el operador.
> Implementa el paso que [Tres voces + acción](EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) dejaba abierto:
> *«los campos `cta` del JSON piloto son locales de corrida: el comando canónico no se anuncia como compatible
> hasta una implementación y verificación explícitas»*. Esta es esa implementación y esa verificación.
>
> **Actualizado el 2026-09-23.** ¿Vas a componer o certificar una pieza? Empieza por **§19 · Cómo usarlo**: flujo de
> punta a punta, plantilla de plan que pasa el gate, códigos de salida y problemas comunes. El estado de la
> certificación adversarial y de sus tramos vive en **§18**. Nada de esto autoriza publicar: el gate certifica la
> pieza, no la campaña.

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
pnpm foto:componer:cta <plan.json>                # compone y emite out/qa-<plan>.json (con huellas)
pnpm foto:cta:gate     <plan.json>                # certifica: 0 certificado · 1 falla · 2 uso · 3 no certificable
pnpm foto:cta:gate     <plan.json> --reproducir   # certifica recomponiendo con el comando vigente (§18, tramo 6)
```

El flujo completo y qué hacer con cada código y cada mensaje están en **§19**.

🎯 **Lo que lo hace distinto de un gate normal: EXIGE la clave.** Si `contraste.cta` falta, **falla**. Un gate
que sólo valida las claves presentes no puede detectar una ausencia — y la ausencia era exactamente el bug.

**Delta 2026-09-22 (noche):** el gate además **falla si una pieza del plan no está en el QA** (no se compuso:
antes pasaba en verde por omisión) y ~~**avisa, sin fallar,** cuando la firma mide menos de 3:1 contra su fondo,
cuando la firma queda sobre el sujeto (`firmaSobreSujeto`)~~ —**corregido el 2026-09-23 (tramos 4, 6 y 7, §18):**
la firma bajo 4,5:1 en su caja o en su trazo y la firma sobre el sujeto **bloquean**, y sólo se exceptúan con una
excepción auditada que declare `plate` y `hasta` (`firma-contraste`, `firma-sobre-sujeto`); el aviso quedó sólo para
el QA del formato anterior, que además sale como no certificable— y avisa cuando la pieza declara zonas de sujeto
ignoradas (`zonasIgnoradas`, con su razón; desde los tramos 1 y 7, sin un aprobador del registro, bloquean). El
compositor, por su lado, **borra el QA del plan al empezar** (`out/qa-<plan>.json`, sólo en una corrida completa;
una parcial fusiona sus piezas): una corrida que falla ya no deja números viejos que el gate pueda leer como vigentes.

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
  **O `"auto"`** (tramos 4 y 6, §18): busca una Y legible **sólo en la banda del pie**, debajo de todo lo compuesto
  (§19.6). 🔴 En **9:16 de pauta la firma al pie cae dentro de la UI**: receta completa en la skill.
- **`logo.variant`** — `auto` (por defecto), `negative` (tinta blanca) o `color` (navy). ~~En `auto` el compositor
  puede elegir navy sobre banda oscura y el contraste se desploma a 1,2:1 donde el blanco da 19,9~~ — **corregido el
  2026-09-22 (§15):** la variante automática se mide donde va la firma, no al pie; con `logo.y: "auto"` se dibuja la
  tinta que cumplió en la búsqueda.

## 7. Auditoría de compatibilidad y alcance — 22/09/2026

Revisión directa del código en `3934d4e26`, posterior a la consolidación `f864e0d9c`; pruebas locales en
`ai-generations/2026-09-22_aeo-compositor-audit/audit.json`, con hashes de ambos scripts. **No se modificó
el runtime del compositor en esta revisión.** La consolidación existe; no implica que todo campo de todas
las corridas haya sido incorporado ni que el gate cubra todo el contrato creativo.

| Capacidad | Estado comprobado |
|---|---|
| `text`, `outline`, `solid`, `surfaceToken`, `inkToken` | Implementados; prueba de cuatro piezas con las tres variantes |
| Tinta/relleno sólido | Ratio teórico emitido como `contraste.cta` |
| Relleno/foto | Emitido como `cta_superficie_vs_escena`, pero el helper usa **p98 de luminancia**, no mínimo local. *Desde el 22/09 (noche) toma el peor entre p98 y p2 según la tinta (§15), y desde el tramo 2 cada voz se mide además sobre su trazo* |
| `logo.y` | **Borde superior** fraccional del logo; no centro. `logo.width <= 1` es fracción del lado corto |
| `logo.variant: auto` con `logo.y` | ~~La elección de tinta sigue muestreando el pie por defecto, no el Y personalizado. Declarar variante y validar donde se pinta~~ **Corregido (§15):** la tinta se mide DONDE va la firma, no en el pie; con `logo.y: "auto"` la tinta la elige la búsqueda en la banda del pie y se dibuja la que cumplió (§19.6) |
| `centerX` de v06 | ~~No consumido: centra en `W/2`. Migrar sin adaptación puede desplazar CTA al sujeto/proyección~~ **Hoy se consume** (§14, «`centerX`»): mueve el eje del bloque, del CTA, del descriptor y de la tarjeta; un bloque centrado a más de 0,15 del centro aborta y pide `align: "left"` |
| `signatureY` de v06 | ~~No consumido. Es centro en el firmador archivado; convertir a `logo.y = centro - altoLogo/(2*altoCanvas)`~~ **Hoy declara una firma externa** (si el plan no trae `firma`): es el centro vertical de la caja que reserva el compositor y que mide el gate (§18, «La firma que pone otra herramienta»; §19.6) |
| `safeArea`, `signatureSafeArea`, `editorialReserve` | ~~Metadatos de corrida, no guards implementados por este comando~~ **Hoy los lee el compositor y los verifica el gate:** `safeArea` ubica el texto y la zona de AXIS es el piso; `signatureSafeArea` estrecha la zona de la firma; `editorialReserve` frena el crecimiento y bloquea en el gate (tramos 3 y 4) |
| `subjectProtection` | Comprueba borde inferior del descriptor; no toda la envolvente de cursor, titular o personaje. **Declaración obligatoria desde 2026-09-22**: el gate falla si una pieza con CTA no la declara. `{top, minClearance}` en px del plate cuando hay persona bajo el bloque; `false` cuando no la hay. Se mide en el plate, no en la composición |
| Render parcial por IDs | Desde 2026-09-23 fusiona sus piezas en `qa-<plan>.json` (el resto se conserva). Antes emitía `qa-parcial.json` aparte |
| Descriptor/cursor sin CTA | No inferir soporte opcional: el camino de layout accede a `s.cta` y al descriptor. El help heredado no demuestra soporte de pieza muda |

**Prueba de migración:** el render de cuatro piezas termina, pero el gate rechaza «Sé la referencia»:
CTA 1,5:1 y descriptor 1,7:1 porque perdió su eje desplazado y cayó sobre la proyección. Los finales v06
no se sustituyeron por este resultado. No anunciar reproducción idéntica desde el comando nuevo. *(Causa resuelta el
22/09: el compositor consume `centerX`, §14; el descriptor difiere a propósito, §12.)*

### Cobertura del gate

**Delta 2026-09-22 (CMP-002).** Dos huecos cerrados: (1) un `qa.json` anterior al plan falla — el compositor aborta en la primera pieza que viola `subjectProtection` y deja el QA de la corrida previa, que el gate leía como verde; (2) `subjectProtection` sin declarar falla — la guarda existía, pero ninguna pieza la declaraba y el CTA del KV-01 quedó sobre la cabeza de Nexa con el gate verde.

Fixtures locales: un CTA válido pasa y un CTA sin `contraste.cta` falla, como se buscaba. ~~Sin embargo,
QA vacío, IDs ajenos, descriptor ausente y filas duplicadas terminan con exit 0. Por tanto, exit 0 solo
no certifica cobertura.~~ **Corregido el 2026-09-23 (tramos 1, 6 y 9, §18):** 0 piezas evaluadas falla, una pieza del
plan sin QA falla, cada fila lleva huellas de su pieza, su plate, su PNG y su layout, una medición ausente falla, los ids
repetidos se rechazan antes de componer y el QA del formato anterior sale como **no certificable** (código 3). La lista
de abajo queda como registro del 22/09: los puntos 1 a 4 los verifican hoy el compositor y el gate —el 1 con un matiz:
ya no hace falta un plan por carpeta, porque cada plan tiene su QA, pero dos planes que comparten ids se pisan los
archivos y el compositor lo avisa—; **el 5 sigue vigente**. Lo que en su momento se exigía externamente:

1. Un plan por carpeta, sin IDs duplicados; QA recién compuesto desde ese mismo plan y esos mismos plates.
2. Exactamente una fila de QA por ID esperado, sin ausencias, duplicados ni filas ajenas.
3. Datos numéricos finitos para CTA, descriptor cuando exista y superficie cuando sea `solid`.
4. Medición adicional del **mínimo** local, contorno, cursor/controles, firma y zona segura. El helper
   p98 redondea a dos decimales; no usarlo para rescatar un valor real bajo el umbral.
5. Revisión visual por ratio, a tamaño completo y de consumo. El gate no comprueba identidad, dedos,
   orientación de tablet, tamaño del lecho ni cierre visual de firma.

Al 22/09 eran limitaciones abiertas del comando, no fallos corregidos por documentarlas; los tramos de §18 las
cerraron en el runtime, salvo el punto 5. Para ampliar el runtime, hacerlo en el módulo canónico y verificar estos
casos; no crear una sexta copia independiente.

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
> **Delta 2026-09-23:** una pieza `sin-mascara` ya no se certifica (tramo 1, §18). La declaración a mano protege
> mientras se compone, pero el gate rechaza la pieza hasta que la segmentación corra y se recomponga.

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

> **Delta 2026-09-23 — hoy los topes son más de tres.** Los tramos de §18 sumaron al crecimiento el **trazo** de cada
> voz con margen (umbral × 1,1, o lo que ya tenía a ×1), los **límites del CTA** (relleno y borde ≥ 3:1), las zonas
> **`protect`**, la **reserva editorial**, la **zona segura declarada** (con `safeArea: "axis"`, la de AXIS) y las
> invariantes de maquetación, que incluyen la caja de la firma cuando ya se sabe dónde va (logo con `y` fija o firma
> externa). Ninguna excepción auditada entra en esta búsqueda: una excepción no hace crecer más la pieza (tramo 7).

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
`subjectProtection` a mano (§11) sigue protegiendo mientras se compone, pero **una pieza `sin-mascara` no se
certifica** (tramo 1, §18). Desde el tramo 6 el QA dice también de dónde salió la máscara (`mascara.origen`: `fresca`,
`cache-canonica` o `cache-externa`) y cuánto marca (`mascara.cobertura`); una máscara de una caché ajena al repo sale
como no certificable y se resuelve con `--reproducir` (§19). **Sin máscara el texto no crece**: la ausencia de prueba
no es permiso.

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
2026-09-22; **132** al 2026-09-23, de las que 114 componen y 18 abortan en la referencia, más 84 piezas con CTA sin
plate en esta máquina) con dos versiones del compositor —`--ref` (HEAD por defecto) y `--candidato` (el archivo del árbol
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
🟣 cambian los avisos · ⛔ cambia el veredicto del gate (tramo 9) · ⚪ cambia el mensaje de error · 🔵 el QA suma claves
(informativo). Sale con 1 ante cualquier diferencia salvo la 🔵, ante piezas omitidas o una pieza del manifiesto de
cobertura que falte, sin manifiesto (tramo 9) y con 0 casos. Cómo leer cada línea: §19.10.

**Desde el tramo 5 (§18) la referencia es hermética**: se extraen de git el compositor y todas sus dependencias
locales. Antes la referencia usaba las dependencias del árbol de trabajo, y un cambio en ellas no aparecía: así pasó
inadvertido el cambio del texto alternativo en las 86 piezas hasta que se midió con la referencia hermética.
`--actualizar-cobertura` reescribe `scripts/foto/componer-cta.cobertura.json`. La puntuación de mutantes vive en
`pnpm foto:componer:cta:mutantes`. **Regla: antes de commitear un cambio al compositor, correr el harness.** Si el cambio no debería alterar
nada, tiene que salir sin diferencias (sólo 🔵, que informa). Si altera algo, el reporte dice qué piezas y cuánto, y eso se aprueba mirando.

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
| **Zona segura declarada (`safeArea`)** | el crecimiento no saca nada de ella; lo que ya esté afuera a ×1 se avisa; un bloque alineado a la izquierda arranca en `max(7 %, safeArea.x0)` — en 9:16 de Codex la zona empieza en 8 %. **Desde el tramo 4** la zona de AXIS es el piso que verifica el gate y, con `safeArea: "axis"`, el texto arranca dentro también por arriba (2026-09-23) |
| **`textGrowth: false`** | congela una pieza aprobada a su tamaño declarado al recomponer |
| **`subjectGuard.ignore: [{ box, reason }]`** | salida auditada para un falso positivo de la segmentación (un afiche del fondo): apaga SÓLO esa zona, con razón de ≥ 10 caracteres, y queda en el QA. Nunca se apaga la guarda entera. **Desde los tramos 1 y 7:** `aprobadoPor` del registro y cada zona ≤ 10 % del lienzo (15 % en total) |
| **Firma sobre el sujeto → aviso + `firmaSobreSujeto` en el QA** | medido: KV-01-916 (CMP-002) con la firma sobre la cadera de la persona, KV-02-169 rozando la silueta, mo3-no-creernos-916 sobre el pedestal. ~~Aviso, no bloqueo: decidirlo es del operador~~ **Desde el tramo 4 bloquea** en el gate, salvo excepción `firma-sobre-sujeto` |
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
APCA es verificación perceptual de respaldo y **avisa, no bloquea** —**salvo en el CTA**: desde el 2026-09-23 APCA y
daltonismo **bloquean** en el CTA (texto, borde y relleno), exceptuable como `cta-perceptual` (§18); en las demás voces
siguen avisando—. Los umbrales no viven en el código: salen del
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
| tamaño EN PANTALLA | px del lienzo × 390 / ancho del lienzo: la pieza tal como se ve en un teléfono. Con `placement`, el menor entre 390 y el declarado: **sólo endurece** (tramo 7) |
| texto alternativo | WCAG 1.1.1 + 1.4.5: toda voz visible en orden de lectura, más la escena si el plan trae `altText` |

**En el compositor** (sin cambiar un píxel: regresión 86 de 86 idénticas): cada pieza registra en el QA
`accesibilidad.voces.<voz>` —WCAG según su tamaño en pantalla, APCA, % del área bajo el umbral y, en tintas de
color, el contraste con cada tipo de daltonismo— y escribe `out/<id>.alt.txt`. Se mide por primera vez el **borde
del CTA con contorno** (antes sólo el relleno del sólido).

**En el gate:** **bloquea** cualquier voz bajo WCAG 2.2 AA y cualquier límite del CTA bajo 3:1 (calibrado contra
las 86 piezas: 0 fallas, no rompe nada aprobado) y, **desde el 2026-09-23, APCA y daltonismo en el CTA** (texto, borde
y relleno; exceptuable como `cta-perceptual`). **Avisa** APCA bajo Bronze y daltonismo en las demás voces, texto de
menos de 9 px en el teléfono y alternativa sin escena.

> **Delta 2026-09-23 (tramos 2, 7 y 8, §18).** Cada voz se mide además sobre su **trazo** (el 1 % peor de los píxeles de
> glifo contra su fondo), no sólo sobre la caja. El **CTA exige 4,5:1 a cualquier tamaño**. El borde del contorno, ≥ 1
> CSS px y ≥ 3:1 como se ve en un teléfono. Avisos nuevos: voz que pasa sólo gracias al velo, variante del CTA elegida
> sin margen, `placement` declarado, `altText` que transcribe el copy y corchetes del CTA de texto bajo 1 CSS px o
> bajo 3:1. La lista completa de lo que bloquea y lo que avisa: §19.8.

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
| `cta.variant: "auto"` + `cta.prominencia` | el autor declara la intención del canon —`discreta` (texto) · `delimitada` (contorno) · `destacada` (relleno)— y la medición sobre la escena decide si la permite; si no, **escala** a la que separa más, nunca a una menos visible. Viable = WCAG con margen 1,1, ningún píxel bajo el umbral **y también con daltonismo** (el naranja como tinta sobre el gris oscuro de una foto pasa en visión típica y cae bajo 4,5:1 con protanopía). Se decide UNA vez, a tamaño original, y queda fija mientras el texto crece. El motivo queda en `qa.ctaVariante`. **Desde el 2026-09-23:** prueba la degradación canónica (contorno con tinta `inkOnDark`) antes del relleno, exige también APCA y 4,5:1 aunque el CTA sea grande, y si nada alcanza con margen queda la que más separa, con `ctaVariante.sinMargen` (el gate lo avisa) |
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

| Tramo | Estado | Commit |
|---|---|---|
| 1 · Integridad | cerrado | `27eb6bc08` |
| 2 · Contraste real | cerrado | `e68d28885` |
| 3 · Esquema e invariantes | cerrado | `4d36b01c3` |
| 4 · El canon hecho regla | cerrado | `38d465e89` |
| 5 · Arnés y pruebas | cerrado | `a3119ce6c` |
| Seguimiento · firma externa medida, piso perceptual del CTA, zona «axis» también arriba | cerrado | `4cb6dd154` · `dc95887ec` |
| 6 · El gate no miente | cerrado | `91631251f` |
| 7 · Umbrales que no se aflojan; excepciones auditadas de verdad | cerrado | `a595922e3` |
| 8 · Entradas y bordes | cerrado | `f3c87eb95` |
| 9 · Proceso | cerrado | `95c9b7b48` |
| Tercera certificación | siguiente paso, con dos auditores nuevos | — |

Los tramos 1–5 cierran la primera certificación; la segunda (NO CERTIFICA) abrió los tramos 6–9, y el gesto manuscrito
quedó fuera de alcance. El detalle de cada tramo sigue abajo.

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
- ~~**APCA y daltonismo del CTA siguen avisando, sin bloquear** (decisión pendiente 3).~~ **Decidido el 2026-09-23:
  bloquean en el CTA** (texto, borde y relleno), exceptuable como `cta-perceptual`; en las demás voces avisan (commit
  `4cb6dd154`).

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

**Tramo 4 · El canon hecho regla — cerrado (2026-09-23).** Lo que el canon ya decía y nadie verificaba. Bloquea en
el gate, salvo **excepción auditada** (`excepciones: [{ regla, razon, aprobadoPor }]`): la excepción no apaga la
medición, el gate la imprime con su razón y quién la aprobó. Reglas exceptuables: `zona-segura`, `firma-contraste`,
`firma-tamano`, `firma-sobre-sujeto`, `acento-cta` (p. ej. con Gigi en cuadro; ver «Decisiones del operador»),
`concepto-completo`, `jerarquia`, `legibilidad`, `reserva-editorial`. Los tramos 6 y 7 suman `cta-perceptual` y
`dominante-mayor`, y desde el tramo 7 la excepción exige además `plate` y, si la regla se mide, `hasta` (§19.7).

- **Zona segura de AXIS** (`axisAdvertising.safeArea`): feed 7,5 % × 6 % (4:5, 1:1, 16:9) y story 10 % × 13 % (9:16)
  es el **piso**; una zona declarada sólo la estrecha. Texto, botón, selección y firma fuera = falla. El compositor
  **no mueve** el texto de las piezas existentes (moverlo desalineaba el CTA con `cta.x` numérico); para cumplir, el
  plan declara `safeArea: "axis"` (o una zona más estrecha) y el texto se ubica dentro; `note.x: "columna"` lleva también la nota.
- **Firma con contrato:** `logo` o `firma: { modo: "externa" | "sin-firma", razon }`; contraste ≥ 4,5:1, **20 % del
  lado corto** y nunca sobre el sujeto. `logo.y: "auto"` busca, desde el pie hacia arriba, la primera Y que cumpla
  contraste, zona segura, sujeto y choques; si no la hay, queda al pie y el gate la mide. *(Desde el tramo 6 busca
  sólo en la banda del pie, debajo de todo lo compuesto, y exige 4,5:1 también en el trazo del logo.)*
- **Concepto completo:** entrada, dominante y cierre que remata, o `conceptoReducido: { razon }`; la regla de las tres
  veces (dominante ≥ 3× la entrada) pasa de aviso a bloqueo.
- **Columna:** `cta.x: "columna"` pone el botón —o el texto, en la variante de texto— en la columna de las voces, y el
  descriptor la sigue. El gate avisa cuando el CTA o el descriptor quedan corridos más de 4 px, y cuando sobre los
  corchetes del CTA de texto queda menos de media altura del CTA.
- **Tamaño en pantalla:** `placement: { anchoCssPx, razon }` declara dónde se publica la pieza si no es un teléfono
  (**desde el tramo 7 sólo endurece**: una pantalla más ancha ya no afloja la medición); el piso legible por rol sigue
  en aviso hasta la decisión pendiente 6.
- **Texto alternativo:** «Llamado a la acción» en vez de «Botón» (la imagen no tiene un control que activar); suma el
  gesto manuscrito y las etiquetas de los cursores; no repite lo que la descripción de la escena ya dice.
- Regresión (referencia hermética) contra 4d36b01c3: **ningún píxel cambia**; el texto alternativo cambia en las 86 piezas («Llamado a la acción») y el layout suma `columna`, `ctaMarco` y `zonaSegura`. Con las reglas nuevas **ninguna de las 86 piezas del repo pasa el gate completo**: zona segura 77 (el margen del compositor es 7 % y AXIS pide 7,5 % en feed y 10 % en story), concepto sin cierre 40 (las piezas AEO), firma sin declarar 37 (v03–v07 firman con otra herramienta), firma bajo 20 % 19 (CMP-002 y los 16:9 de registro-c), reserva editorial 6, acento 7 (ya fallaba antes), firma sobre el sujeto 3, firma bajo 4,5:1 1 y regla de las tres veces 1. Son decisiones del operador —recomponer con `safeArea: "axis"` y `cta.x`/`note.x: "columna"`, declarar `firma`, o excepciones auditadas—; ninguna pieza se tocó.

**Tramo 5 · Arnés y pruebas — cerrado (2026-09-23).**

- **Referencia hermética:** la regresión extrae de git el compositor **y todas sus dependencias locales** tal como
  estaban en la referencia (`scripts/foto/regresion-ref.mjs`): cada archivo junto a su original como
  `.ref-<sha>-<pid>--<nombre>`, con sus imports relativos reescritos a esas copias. Antes la «referencia» corría con las
  dependencias del árbol de trabajo y un cambio en ellas no aparecía como diferencia.
- **La red no se achica en silencio:** 0 casos falla; las piezas sin plate se cuentan; el manifiesto
  `scripts/foto/componer-cta.cobertura.json` lista las piezas que la red DEBE verificar en esta máquina y una faltante
  falla (`--actualizar-cobertura` lo reescribe a propósito).
- **Avisos comparados:** un aviso nuevo o perdido del compositor es una diferencia (🟣). Una clave nueva sólo informa si
  es del QA; en el layout es un cambio a aprobar.
- **Piezas de prueba por guarda:** P06 suma una pieza donde la zona declarada es la que frena el crecimiento (antes el
  sujeto frenaba primero y un mutante sin zona pasaba); P02 prueba el propio arnés (vacío, cobertura, avisos, referencia).
- **Puntuación de mutantes como comando:** `pnpm foto:componer:cta:mutantes` rompe a propósito cada guarda del catálogo
  —compositor, gate, arnés y módulos puros— y exige que alguna prueba falle **por la razón esperada**.
- Regresión hermética contra 38d465e89: 104 de 104 iguales (el tramo 5 no toca el compositor); el manifiesto de cobertura quedó con 205 piezas (104 únicas) y 84 piezas con CTA no tienen plate en esta máquina. **Puntuación de mutantes: 35 de 35 detectados por la razón esperada** (9 del tramo 1, 7 del 2, 6 del 3, 8 del 4 y 5 del 5). La primera pasada dio 33 de 35 y enseñó dos cosas: el piso del trazo había dejado de tener pieza de prueba (desde el tramo 3 a 01-fuera-916 la frena su reserva; P05 suma la misma pieza sin reserva) y un mutante del QA compartido se detectaba por un error de la prueba, no por su razón (P10 suma «el QA queda en qa-<plan>.json»).

**Seguimiento (2026-09-23) · La firma que pone otra herramienta.** Los sets v03–v07 firman DESPUÉS del compositor
(`firmar.mjs` → `firma-placement.mjs`): el compositor no dibujaba esa firma, la regresión no la veía y nada impedía que un
cambio pusiera texto donde después iba a caer. Ahora:

- El plan la declara con `firma: { modo: "externa", razon }` y, si no va en 0,935, su centro vertical en `signatureY`
  (`signatureY` sola también la declara: la forma que ya usan v05–v07). El compositor **reserva su caja** con la misma
  geometría que esa herramienta y leyendo el MISMO campo: 20 % del lado corto, centrada, centro en `signatureY` (0,935 por
  defecto). *Delta 2026-09-23 (tramo 9): el esquema ya no acepta `firma.y` ni `firma.ancho`, porque `firmar.mjs` no los
  lee: la caja que el gate certificaba podía no ser la firma que se dibujaba.* Entra en las invariantes (nada cae encima; el crecimiento la respeta) y en
  el QA: contraste medido como lo mide esa herramienta (peor píxel de la caja, la mejor de las dos tintas oficiales),
  tamaño y si cae sobre el sujeto. El gate le aplica el mismo contrato que al logo.
- **Corrección del tramo 4:** la firma se mide contra la zona de AXIS estrechada por `signatureSafeArea` (la franja que
  el plan declara para la firma), no contra la `safeArea` del texto. Antes, una firma en su franja salía «fuera de zona»
  por compararla con la zona del texto (v06).
- Medido en los nueve 9:16 de v05–v07 que declaran `signatureY`: **ningún píxel cambia**; contraste de 7,56 a 19,39:1;
  **v05/02-reconoces-916 cae sobre la persona** (245 px de su silueta); **v07 cae en la franja inferior que Reels tapa**
  (0,887–0,913 del alto contra 0,87 de AXIS), como reconoce su propio LEEME; v06 queda dentro.
- Los otros formatos de esos sets (16:9, 4:5, 1:1) no declaraban su firma —`firmar.mjs` usa 0,935 por defecto— y el gate
  los marcaba «sin firma declarada». **Decisión del operador (2026-09-23): se declara.** Las 60 piezas que no declaraban
  nada llevan `firma: { modo: "externa", razon }` (8 de v03, 16 de v04, 12 por plan en v05–v07); sin `y`, el compositor
  reserva la misma caja que firma esa herramienta. Regresión de los 13 planes AEO: 72 de 72 iguales. Los paquetes de
  origen y las reproducciones verificadas no se tocaron: son registros de procedencia.
- **Orden de trabajo, verificado en el código:** `firmar.mjs` reescribe `out/<id>.png` con la firma puesta y, desde ese
  momento, el gate ya no reconoce el PNG (su huella es otra). Se certifica **antes** de firmar —el gate ya midió la caja
  de la firma sobre la pieza sin firma— o se firma una copia. Y sin `y`, la caja queda centrada en 0,935: fuera de la
  zona de AXIS en los cuatro formatos (§19.6).

### Segunda certificación (2026-09-23): dos auditores, NO CERTIFICA

Sobre los cinco tramos cerrados, dos subagentes adversariales —diseño y arquitectura— corrieron sus propias
reproducciones. Lo que declaraban los tramos se cumplía (10 de 10 pruebas, 104 de 104 piezas iguales), pero quedaban
caminos donde el gate salía con 0 sobre una pieza mala. El más grave estaba activo en un plan real: el gate de
`cmp002-hubspot/composicion-formatos/piezas-formatos.json` decía «✓ 18 piezas… WCAG 2.2 AA» sin una sola medición de
accesibilidad, y una de ellas (KV-07-916) la rechaza el compositor vigente porque el texto tapa al sujeto. El gesto
manuscrito quedó fuera de alcance por decisión del operador (2026-09-23); todo lo demás se planificó en tramos 6 a 9.

**Tramo 6 · El gate no miente.**

- **«No certificable» no es un pase.** El gate sale con **3** —ni 0 ni 1— cuando no puede probar lo que certificaría: QA
  del formato anterior, pieza compuesta con otra versión del comando, máscara del sujeto leída de una caché ajena al
  repo (`FOTO_MASCARAS_DIR`), y piezas con gesto manuscrito o tarjeta (elementos que ninguna guarda mide). La línea final
  dice lo que se midió. Códigos: 0 certificado · 1 falla · 2 uso · 3 no certificable.
- **Certificación por reproducción:** `pnpm foto:cta:gate <plan> --reproducir` recompone el plan en un temporal con el
  comando vigente y una segmentación nueva, exige que cada PNG y layout entregado sea idéntico byte a byte, y da el
  veredicto sobre el QA reproducido. Es lo que no se falsifica: la huella del comando la escribe el propio compositor, y
  una caché envenenada con metadatos coherentes pasaba.
- **La máscara dice de dónde salió** (`mascara.origen`: `fresca`, `cache-canonica`, `cache-externa`) y cuánto marca; una
  máscara que no marca sujeto se avisa.
- **`logo.y: "auto"` busca sólo en la banda del pie**, debajo de todo lo compuesto, y exige ≥ 4,5:1 en la caja **y en el
  trazo** del logo (el 1 % peor, como las voces), lejos del sujeto y de las zonas `protect`. Antes subía sin tope y en
  KV-06-169 dejaba la firma encima del titular; ahora esa pieza no encuentra lugar en su banda, la firma queda al pie y
  el gate la mide ahí. El gate recalcula la banda sobre el layout y exige el trazo de toda firma.
- La suite certifica contra el compositor que prueba (`--comando`): un mutante ya no «muere» por ser otra versión.
- Pruebas: P06 (la firma automática nunca sube por encima del contenido, en KV-06-169) y P10 (formato anterior, otra
  versión del comando, caché ajena y gesto salen con 3; `--reproducir` certifica lo idéntico y rechaza un layout alterado;
  firma automática sobre el contenido y trazo de la firma bajo 4,5:1 rechazados). **Mutantes: 48 de 48** detectados por
  la razón esperada (10 nuevos).

**Tramo 7 · Umbrales que no se aflojan; excepciones con tope, plate y aprobador.**

- **`placement` sólo endurece.** El ancho de pantalla efectivo es el menor entre 390 CSS px y el declarado: una pantalla
  más grande ya no baja WCAG de 4,5 a 3:1 ni adelgaza el borde (la misma pieza también se ve en un teléfono). El gate
  lo muestra.
- **El CTA exige 4,5:1 a cualquier tamaño** (canon: CTA y descriptor ≥ 4,5:1): al medir la voz, su trazo y al elegir la
  variante `auto`. El gate no le cree al umbral del QA: un CTA medido como «texto grande» no pasa.
- **El dominante es la voz mayor** (regla nueva, exceptuable como `dominante-mayor`): antes sólo se comparaba con la
  entrada. Medido: 0 de 216 layouts del repo la incumplen.
- **Excepciones auditadas de verdad:** `aprobadoPor` tiene que estar en `scripts/foto/aprobadores.json` (hoy: el
  operador; el aprobador de la suite vale sólo para planes fuera del repo, también al certificar por reproducción);
  `plate` nombra el sha256 del plate aprobado (un plate regenerado se re-aprueba); y cuando la regla se mide con un
  número, `hasta` declara el valor aprobado —contraste o tamaño mínimos, px máximos de desborde o de sujeto—. Una
  excepción que no vale no apaga nada: la regla bloquea y el gate dice por qué.
- **Salidas sin medir con aprobador:** `firma: { modo: "sin-firma" }` y `conceptoReducido` exigen `aprobadoPor` del
  registro, y el gate las imprime. Las zonas del sujeto ignoradas, también.
- **Ninguna excepción entra en la búsqueda del tamaño:** una excepción `reserva-editorial` ya no hace crecer más la pieza.
- **Se muestra lo que pasa por poco o con ayuda:** voces que pasan sólo gracias al velo (`scrimTop`/`scrimBottom`, medido
  sobre la foto sin él) y variantes de CTA elegidas sin margen. Siguen como aviso: si bloquean es decisión del operador.
- Pruebas: 10 de 10. **Mutantes del tramo: 12 de 12** detectados por la razón esperada.

**Tramo 8 · Entradas y bordes — cerrado (commit `f3c87eb95`).** Lo que entraba al comando sin control y salía con el
gate en 0.

- **Rangos que el esquema no tenía.** `dominantTracking`, entre −0,08 y 0,12 em (AXIS usa −0,035 a 0,08 y los planes
  del repo, −0,07 a 0,05; −0,45 dejaba las letras del titular encimadas con el gate en 0). `final`, con cada lado entre
  320 y 8192 px: `final: [9, 16]` entregaba un PNG de 9×16.
- **Entidades fuera de Unicode.** Una entidad numérica que no es un carácter (`&#99999999;`, o una mitad de par
  sustituto) rechaza el plan nombrando pieza y campo; al dibujar una etiqueta de cursor ya no revienta con un error sin
  nombre: sale U+FFFD.
- **Ids que sólo difieren en mayúsculas** (`KV-01` y `kv-01`) rechazan el plan: en macOS y Windows son el mismo archivo
  y una pieza pisaba a la otra en `out/`.
- **Plate ilegible, con su pieza.** Antes salía «Input file contains unsupported image format» sin decir de cuál; ahora
  el plan se rechaza antes de componer, nombrando la pieza y el plate.
- **`columna` sólo con alineación a la izquierda.** Con `align: "center"`, `cta.x: "columna"` o `note.x: "columna"`
  rechazan el plan: el CTA arrancaba en el eje y el gate salía con 0.
- **Texto alternativo.** El rol del CTA («Llamado a la acción: «…»») se anuncia siempre, aunque la escena cite su texto
  —en v07 las 15 piezas lo perdían—; una voz sólo se omite si la escena la **cita entre comillas** (antes bastaba una
  subcadena: «Ver» se daba por dicho en «verde», y «¡mira!» en «una mujer mira»); y el gate avisa cuando `altText`
  transcribe el copy: la escena se describe y el texto de la imagen se transcribe aparte.
- **Corchetes medidos.** El QA registra `accesibilidad.corchetes`: su grosor en CSS px en un teléfono y el peor
  contraste de las cuatro esquinas contra la escena (límite no textual, 3:1). El gate avisa bajo 1 CSS px o bajo 3:1.
  El trazo que dibuja AXIS mide ≈ 0,69 CSS px en un teléfono en todos los formatos: es un valor del contrato AXIS y
  cambiarlo es decisión del operador (pendiente 7).
- **Tamaño entregado.** El gate lee el ancho y el alto de la cabecera del PNG y exige el `final` del plan o, sin él, el
  tamaño del plate.
- **La guía de zona no repite lo declarado.** Cuando algo se sale de la zona segura, el mensaje ya no pide
  `safeArea: "axis"` si ya está —pide acortar el texto, bajar su tamaño o subir el bloque— ni `cta.x: "columna"` si ya
  está o si el bloque es centrado.
- Pruebas: P07 suma tracking fuera de rango, `final` diminuto, entidad fuera de Unicode, ids en mayúsculas, plate
  ilegible y `columna` en un bloque centrado; P10, el tamaño entregado y el aviso de corchetes; la prueba del módulo de
  accesibilidad y P09, el texto alternativo. Ocho mutantes nuevos en el catálogo (por procedimiento, se verifican antes
  del commit del tramo).

**Tramo 9 · Proceso — cerrado (2026-09-23, commit `95c9b7b48`).** Lo que fallaba no en una pieza, sino al
correr el comando varias veces, en paralelo o interrumpido.

- **Bloqueo sin carreras.** Para reclamar el bloqueo de un proceso muerto, primero se toma un **reclamo** atómico
  (`out/.componer.lock.reclamo`, creado con `wx`) y se verifica que el bloqueo sigue siendo el mismo (el mismo pid
  muerto). Antes dos procesos veían el mismo bloqueo muerto y el segundo borraba el que el primero acababa de tomar:
  3 de 60 corridas con dos dueños (con 6 procesos, 16 de 40). Ctrl-C, SIGTERM y SIGHUP sueltan el bloqueo (salida 130,
  143 y 129); antes Ctrl-C lo dejaba tomado.
- **Aviso entre planes.** Si otro plan de la misma carpeta (otro `out/qa-*.json`) registra un id que se va a componer,
  el compositor avisa antes de componer: al recomponerlo aquí, su PNG deja de ser el que certificó ese plan y su gate va
  a fallar. Caso real: en `aeo-cta-v04` dos planes comparten 8 ids.
- **La suite borra sus temporales** salvo el reporte (`--conservar` los guarda); antes quedaban 80–190 MB por corrida.
- **Regresión.** Sin manifiesto de cobertura **falla** (antes salía con 0 sin mencionarlo). Compara también el
  **veredicto del gate** sobre las dos salidas, cada una contra su compositor: «⛔ Cambia el VEREDICTO del gate», con
  las líneas «el gate suma: …» y «el gate ya no dice: …» (un candidato que agregaba una voz que falla sólo sumaba claves
  al QA, 🔵, y no fallaba). Y avisa si cambiaron fuentes, logos o paquetes desde la referencia: la referencia hermética
  no los cubre, porque los dos lados los leen del árbol de trabajo.
- **Huella del comando con fuentes y logos:** Bricolage, Poppins, los dos logotipos y el SVG de la firma web. Guttery no
  entra: sólo la usa el gesto, que está fuera de alcance.
- **Mutantes contra una corrida base.** Cada conjunto de pruebas corre una vez sin mutante; un mutante cuenta como
  detectado sólo si la verificación esperada **cambia** respecto de la base y sin colapso (si tumba más de la mitad de
  lo que pasaba o revienta una prueba, es «falla por otra razón», salvo en una guarda declarada `amplio`, de la que
  dependen muchas verificaciones —el esquema, el QA por plan—); en los módulos el patrón se busca en las líneas `✖` o en
  el informe de fallas de node:test, nunca en una línea `✔`; y dos mutantes **canario** rompen algo ajeno a propósito: el arnés tiene que clasificarlos como «falla por otra
  razón». Antes, un mutante que sólo hacía reventar al compositor contaba como detectado. Pruebas nuevas para guardas
  que la auditoría apagó sin que ninguna prueba cayera: firma y CTA o descriptor bajo 4,5:1 en su caja, firma sobre el
  sujeto y jerarquía.
- **Hallado al documentar y corregido en el mismo tramo:** la búsqueda de `logo.y: "auto"` leía `protect` con otra
  forma y no esquivaba esas zonas (ahora con prueba en P06 y mutante); la firma externa se lee del MISMO campo que
  `firmar.mjs` (`signatureY`; `firma.y` y `firma.ancho` salen del esquema, porque esa herramienta no los lee y la caja
  certificada podía no ser la firma dibujada); el gate verifica el rol del CTA en el texto alternativo (antes sólo
  confiaba en el compositor); y la lista de reglas exceptuables pierde el duplicado de `cta-perceptual` y `legibilidad`,
  que no tenía efecto (volverá si el operador decide que la legibilidad bloquea).
- **Verificado:** suite 10 de 10; regresión 132 de 132 piezas idénticas, también en el veredicto del gate; mutantes en la
  corrida completa 75 de 77 más canarios 2 de 2 —los dos restantes los clasificaba mal el propio criterio nuevo (una
  guarda amplia y un patrón que vive en el informe de fallas), se ajustaron y, con los dos mutantes nuevos de los
  arreglos, dieron 6 de 6 más canarios 2 de 2.
- **Pendiente:** marcar cada guarda en el código (`// @guarda`) con un mutante por marca.

### Tercera certificación — siguiente paso

Con los nueve tramos cerrados, corre la tercera certificación con **dos auditores adversariales nuevos** (diseño y
arquitectura) que, como en la segunda, corren sus propias reproducciones en vez de leer lo declarado. Hasta que
dictaminen, el estado es «tramos 1–9 cerrados, tercera certificación pendiente» y ningún pilar sube de nota. El gesto
manuscrito queda fuera de alcance (decisión del operador, 2026-09-23): una pieza con gesto sale con 3 y no entra en la
certificación.

### Cuatro pilares (hoy → al cerrar los tramos)

| Pilar | Al auditar | Meta | Al cerrar los tramos 1–5 | Qué lo sostiene |
|---|---|---|---|---|
| Safety | 2/5 | 4/5 | 4/5 | guardas que no se apagan sin razón y aprobador; caché verificada; `id` sin rutas; excepciones auditadas que no apagan la medición |
| Robustness | 2/5 | 4/5 | 4/5 | esquema declarativo; invariantes compartidas por búsqueda, composición y gate; escritura atómica; QA atado por huellas; contraste en el trazo |
| Resilience | 3/5 | 4/5 | 4/5 | caché que se regenera sola; nada a medias tras abortar; bloqueo por carpeta; errores que nombran pieza, campo y causa |
| Scalability | 3/5 | 4/5 | 4/5 | referencia hermética; manifiesto de cobertura; avisos comparados; puntuación de mutantes como comando |

**Las notas no se vuelven a puntuar hasta la tercera certificación.** Son la autoevaluación al cerrar los tramos 1–5;
la segunda certificación no las confirmó (NO CERTIFICA), y lo que encontró lo cierran los tramos 6–9: el gate que no
miente —código 3 y `--reproducir`— y las excepciones con aprobador, plate y tope (Safety); umbrales que no se aflojan y
entradas y bordes validados (Robustness); bloqueo sin carreras, señales que lo sueltan y aviso entre planes
(Resilience); regresión que compara el veredicto del gate, huella con fuentes y logos, y mutantes contra una corrida
base (Scalability).

Por qué no 5/5: la cobertura depende de los plates de esta máquina (84 piezas con CTA no tienen plate aquí), el piso de
legibilidad por rol sigue como aviso hasta que decidas (abajo), las guardas todavía no están marcadas en el código con
un mutante por marca (`// @guarda`), y ninguna pieza del repo pasa todavía el gate completo con el canon.

### Reglas duras que deja esta auditoría

- **NUNCA** un gate que decide por fecha de archivo: decide por huellas del contenido.
- **NUNCA** una guarda que el plan pueda apagar entera; las excepciones son acotadas, con razón y aprobación registrada.
- **NUNCA** una medición ausente cuenta como pase.
- **NUNCA** calibrar un umbral nuevo sólo contra lo ya aprobado: es circular (así pasó 01-fuera-916). Se calibra contra
  el canon y se muestra qué piezas aprobadas lo incumplen.
- **NUNCA** tomar un 3 como pase: «no certificable» se resuelve recomponiendo o con `--reproducir`.
- **NUNCA** inventar un aprobador ni copiar el de la suite (`suite-pruebas`) a un plan real: si falta, se pregunta al
  operador.
- **NUNCA** declarar una excepción sin `plate` y, si la regla se mide con un número, sin `hasta`.
- **NUNCA** usar `placement` para aflojar la medición (ya no puede: sólo endurece).
- **NUNCA** componer en las carpetas de otras sesiones para «probar»: copias temporales.
- **SIEMPRE**, en un plan nuevo que deba pasar el gate: `safeArea: "axis"`, `cta.x: "columna"` (con alineación a la
  izquierda), `logo: { width: 0.2, x: 0.5, y: "auto" }` o la firma externa declarada, `lead` y `after`, y `altText` que
  describa la escena sin transcribir el copy (plantilla en §19.4).
- **SIEMPRE** una guarda nueva con un mutante que alguna prueba detecte por la razón esperada, y la puntuación de las
  guardas viejas corrida otra vez.

### Decisiones del operador

Nada de esto cambia una pieza aprobada.

**Tomadas (2026-09-23):**

- **APCA y daltonismo bloquean sólo en el CTA** (texto, borde y relleno), exceptuable como `cta-perceptual`; en las
  demás voces avisan.
- **Las piezas aprobadas que el canon ahora reprueba se dejan como están y se corrigen al recomponer.** Medido en el
  tramo 4 sobre las 86 piezas que componían: zona segura 77, concepto sin cierre 40, firma sin declarar 37, firma bajo
  20 % 19, acento 7 (ya fallaba), reserva editorial 6, firma sobre el sujeto 3, firma bajo 4,5:1 1 y regla de las tres
  veces 1. Por set: recomponer con `safeArea: "axis"` y `cta.x`/`note.x: "columna"`, declarar `firma` en los que firma
  otra herramienta, o excepciones auditadas con tu nombre.
- **Los planes v03–v07 declaran su firma externa** (60 piezas, commit `dc95887ec`; los paquetes de origen y las
  reproducciones no se tocaron).
- **El gesto manuscrito queda fuera de alcance:** no se certifica (sale con 3).

**Pendientes** (sin respuesta; lo implementado mientras tanto va entre paréntesis):

1. **Firma en 16:9.** Medido en la misma campaña: en 16:9 la firma ocupa 7,3–7,9 % del ancho del cuadro, contra 20 % en
   4:5 y 9:16 (18 % en 1:1); en el feed de un teléfono (390 px de ancho) mide 31 px contra 78 px en el 4:5, 2,5 veces
   más chica. Dos causas: las piezas 16:9 de CMP-002 y del registro C se hicieron con 13–14 % del lado corto (bajo el
   canon; el gate ya lo bloquea y se corrigen al recomponer), y aun en el canon —20 % del lado corto— la firma 16:9
   queda en 11 % del ancho y 44 px en el teléfono. **Opción recomendada, a decidir:** 25 % del lado corto en los
   formatos horizontales (≈ 14 % del ancho y 55 px en el teléfono; iguala la relación firma/titular del 4:5) y 20 % en
   los verticales y cuadrados. Si se aprueba, cambian el gate, el compositor y `firma-placement.mjs`. *(Hoy el gate
   exige 20 % del lado corto en todos los formatos.)*
2. **Margen por defecto del compositor** (7 %) frente a AXIS (7,5 % en feed, 10 % en story). Recomendación: mantener
   el 7 % y exigir `safeArea: "axis"` en los planes nuevos. *(Con `safeArea: "axis"` el texto ya arranca dentro de la
   zona también por arriba, commit `4cb6dd154`.)*
3. **Las tres stories de v07 ponen la firma en la franja inferior que Reels tapa** (centro en 0,90; AXIS termina en
   0,87), como reconoce su LEEME: ¿se aprueban como excepción `zona-segura` con tu nombre, o la firma se sube al
   recomponer?
4. **Velo que rescata una voz** (`scrimTop`/`scrimBottom`). El canon dice que no se agrega scrim —se regenera el plate
   (§10)—, pero el compositor acepta `scrimTop`/`scrimBottom` y el gate sólo avisa cuando una voz pasa gracias al velo
   (`accesibilidad.rescate`, medido sobre la foto sin él). ¿Se permite por defecto (hoy avisa) o necesita aprobación?
5. **Variante del CTA elegida sin margen:** ¿aviso (hoy, `ctaVariante.sinMargen`) o bloqueo?
6. **Piso de legibilidad por rol** (texto bajo 9 CSS px en el teléfono; hoy aviso). *(La excepción `legibilidad` se
   acepta, pero hoy no hay regla que bloquee; `placement` ya no quita el aviso: sólo endurece.)*
7. **Grosor de los corchetes AXIS** (≈ 0,69 CSS px en el teléfono, en todos los formatos): cambiarlo es cambiar el
   contrato AXIS. *(El gate avisa con `accesibilidad.corchetes`.)*

**Preguntas anteriores con salida disponible** (sin decisión formal; las dejó abiertas la primera certificación):
¿la firma la busca el compositor o la declara el plan? → las dos: `logo.y: "auto"` o `logo.y` explícito, y el gate
verifica igual · con Gigi en cuadro, ¿se le cede el acento del CTA? → excepción auditada `acento-cta`, sin campo
propio · canon de variantes, «escalar sí, degradar no» frente a §10 → `auto` degrada la tinta del contorno (el acento
queda en el borde) antes de escalar al relleno; el texto del canon no se tocó.

## 19. Cómo usarlo — guía completa del operador y de los agentes

> **Para quién:** el operador de marca y cualquier agente que componga o certifique una pieza con CTA. Junta en un solo
> lugar lo que §1–§18 fueron agregando: qué correr, en qué orden, qué leer en la salida y qué hacer con cada mensaje.
> Los agentes cargan además la skill `efeonce-advertising-creative` y respetan las reglas duras de §18. **El gate
> certifica la pieza, no la campaña:** nada de esto autoriza publicar.

### 19.1 Antes de empezar

- **El plate trae su espacio.** El texto no se le gana a la foto después: la toma reserva la zona
  (`pnpm foto:prompt <ficha.json>` con `reservas: ["zona-texto"]` y `pnpm foto:validar <plate.png> --zona-texto`;
  canon en `EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md`). Un plate sin reserva no se arregla con un compositor más
  permisivo (§14).
- **Un plan es un archivo `piezas*.json`:** un arreglo de piezas, con las rutas de `plate` relativas al propio json.
  Todo sale a `<carpeta del plan>/out/`, con un QA por plan (`out/qa-<plan>.json`).
- **Nunca compongas en la carpeta de otra sesión.** Para probar sobre piezas ajenas, copia el plan y sus plates a una
  carpeta temporal.
- **Ids únicos por carpeta.** Los archivos de salida se nombran por id: si otro plan de la misma carpeta ya registra un
  id, el compositor lo avisa antes de componer (tramo 9) y ese otro plan deja de certificar hasta que lo recompongas.
  Usa ids distintos o carpetas distintas.
- **La primera composición de cada plate tarda más:** segmenta al sujeto en local (gratis) y guarda la máscara en la
  caché del repo (`node_modules/.cache/foto-sujeto/`); las siguientes la reutilizan.
- **Una composición por carpeta a la vez:** la segunda se rechaza nombrando el proceso que ocupa la carpeta.
- **Aprobaciones:** sólo de quien esté en `scripts/foto/aprobadores.json` (§19.7). Un agente nunca inventa un
  aprobador: si hace falta uno, pregunta.

### 19.2 El flujo de punta a punta

```bash
# 1 · (opcional) los tres tratamientos del CTA sobre la foto real, sin tocar el QA del plan
pnpm foto:componer:cta <plan.json> --variantes

# 2 · componer: todo el plan, o sólo algunos ids (su QA se fusiona con el resto)
pnpm foto:componer:cta <plan.json> [id...]

# 3 · certificar
pnpm foto:cta:gate <plan.json>

# 4 · antes de entregar: certificar reproduciendo con el comando vigente y una segmentación nueva
pnpm foto:cta:gate <plan.json> --reproducir

# 5 · reporte de accesibilidad para mirar (no aprueba nada)
pnpm foto:accesibilidad <plan.json>
```

| Paso | Qué haces | Qué miras | Si algo sale mal |
|---|---|---|---|
| 0 · Plan | Escribes el plan desde la plantilla (§19.4) | — | El compositor lo valida entero antes de tocar un píxel; cada error nombra pieza y campo (§19.11) |
| 1 · Variantes | `--variantes` compone cada pieza en texto, contorno y relleno dentro de `out/variantes/` | La hoja `out/variantes/<id>.png`: las tres a 390 px con tinta, límite, APCA, daltonismo y ✗ WCAG | Declara la elegida con `cta.variantReason`, o deja `"auto"` con `prominencia` (§17) |
| 2 · Componer | `pnpm foto:componer:cta <plan>` | Los `⚠` de la corrida y la pieza misma: `out/preview-390/<id>.png` (como en un teléfono) y `out/<id>.png` completo | Si aborta, el mensaje nombra la pieza y la causa (§19.11) |
| 3 · Certificar | `pnpm foto:cta:gate <plan>` | El código de salida (§19.5) y cada `✗`, `⚠` y `⊘` | 1: corrige y vuelve al paso 2 · 3: recompón o reproduce |
| 4 · Reproducir | `--reproducir` recompone en un temporal con el comando vigente y la caché de máscaras vacía; tarda, porque segmenta de nuevo cada plate | `✓ lo entregado es idéntico a la reproducción` y, debajo, el veredicto sobre el QA reproducido | «lo entregado no es lo que produce el comando vigente» → recompón |
| 5 · Accesibilidad | `pnpm foto:accesibilidad <plan>` | `out/accesibilidad/reporte.md` y `out/accesibilidad/<id>-daltonismo.png` | Es para mirar: el que decide es el gate |
| 6 · Entregar | La pieza certificada, su `out/<id>.alt.txt` y el QA | Que el gate haya dado **0**, nunca 3 | Publicar necesita otra autorización |

🔴 **Mira la pieza siempre.** El gate dice si se cumplen las reglas que sabe medir; si la pieza es buena lo decide la
imagen (§15). Y un 3 nunca es un pase. Si la firma la pone otra herramienta, certifica **antes** de firmar (§19.6).

### 19.3 Comandos y opciones

| Comando | Qué hace | Opciones | Deja |
|---|---|---|---|
| `pnpm foto:componer:cta <plan> [id...]` | Compone las piezas del plan; con ids, sólo esas, y su QA se fusiona con el que ya había | `--variantes`: los tres tratamientos del CTA en `out/variantes/`, con una hoja comparativa por pieza; no toca el QA del plan | `out/<id>.png`, `<id>-layout.json`, `<id>.alt.txt`, `<id>-overlay.svg`, `<id>-cta-evidence.json`, `preview-390/<id>.png` y `qa-<plan>.json`; el bloqueo `out/.componer.lock` mientras corre |
| `pnpm foto:cta:gate <plan>` | Certifica lo compuesto: huellas y reglas del canon | `--reproducir`: certifica recomponiendo · `--comando <archivo>`: certifica contra otra versión del compositor (la usan la suite y la regresión) · `--origen <plan>`: interno de `--reproducir` | Código 0, 1, 2 o 3 (§19.5) |
| `pnpm foto:accesibilidad <plan>` | Reporte para mirar, a partir del QA ya compuesto | — | `out/accesibilidad/reporte.md` (tabla por pieza y voz) y `<id>-daltonismo.png` (la pieza a 390 px en visión típica, protanopía, deuteranopía y tritanopía; Machado 2009) |
| `pnpm foto:componer:cta:regresion` | Compone todas las piezas con CTA del repo con la referencia y con tu versión, y compara (§19.10) | `--ref <git-ref>` (HEAD) · `--candidato <archivo>` (el del árbol de trabajo) · `--solo <texto>` (subcadena de la ruta del plan) · `--jobs <n>` · `--conservar` · `--cobertura <archivo>` · `--actualizar-cobertura` | `<tmp>/reporte.json` y las carpetas de las piezas con diferencias |
| `pnpm foto:componer:cta:pruebas` | Las 10 pruebas de punta a punta, P01–P10 | `--solo P01,P07` · `--ref` · `--compositor <archivo>` · `--gate <archivo>` · `--regresion <archivo>` · `--p02-rapido` · `--conservar` | `reporte.json` y `reporte.md` en su temporal; el resto se borra salvo con `--conservar` |
| `pnpm foto:componer:cta:mutantes` | Puntuación de mutantes: rompe cada guarda a propósito y exige que una prueba lo note por la razón esperada (§19.10) | `--solo <nombre,...>` · `--jobs <n>` | La puntuación en la consola |

Variables de entorno: `FOTO_MASCARAS_DIR` aísla la caché de máscaras (la usan las pruebas; una pieza compuesta con una
caché ajena sale como no certificable) y `FOTO_EVIDENCIA=1` deja además la capa de texto y el fondo de cada pieza
(`<id>-texto.png` y `<id>-fondo.png`), que P09 usa como oráculo.

Las 10 pruebas: P01 determinismo · P02 no regresión · P03 guarda de sujeto · P04 crecer respira · P05 crecer no degrada
el contraste · P06 zona segura, eje y firma · P07 validación del plan · P08 cortes de línea · P09 accesibilidad y
contraste · P10 gate.

### 19.4 Plantilla de plan que pasa el gate

Es la pieza `b2-primero-el-numero-916` (CMP-001, BOFU;
`ai-generations/2026-09-21_registro-c-respuesta/piezas-bofu-formatos.json`) con los cambios con que la suite la
certifica —la función `canon()` de `componer-cta.pruebas.mjs`; P10 «aprueba el plan bueno» exige código 0— más dos
campos que sólo quitan avisos: `altText` y `cta.variantReason`. Se quitaron los campos de etiqueta vacíos del original,
que no actúan sin `label`. Cópiala a tu carpeta, cambia `id`, `plate`, copy y escena, y compón.

```json
[
  {
    "id": "b2-primero-el-numero-916",
    "plate": "plates/b2-primero-el-numero-916-v2-plate.png",
    "altText": "Dos manos giran un monitor sobre una mesa en una sala a oscuras; la pantalla muestra un tablero con gráficos y una línea de luz azul la cruza.",
    "align": "left",
    "safeArea": "axis",
    "top": 0.165,
    "textWidth": 0.84,
    "lead": "El tablero ya te mostró el problema.",
    "leadFamily": "bricolage",
    "leadFill": "#ffffff",
    "leadSize": 36,
    "leadGap": 0.12,
    "dominant": "Cerrarlo es otra cosa.",
    "dominantSize": 140,
    "dominantMax": 0.76,
    "dominantTracking": -0.02,
    "after": "Eso es lo que **operamos**.",
    "afterFamily": "poppins",
    "afterFill": "#ffffff",
    "afterSize": 34,
    "afterGap": 0.12,
    "note": {
      "text": "Método, no improvisación: los seis motores, cada mes.",
      "size": 34,
      "x": "columna",
      "width": 0.8,
      "gapAfterClosure": 30
    },
    "cta": {
      "text": "Agenda tu discovery",
      "descriptor": "AEO para LatAm · 30 minutos",
      "variant": "outline",
      "variantReason": "Delimitar la acción sin tapar la escena oscura: el contorno lima se despega del fondo.",
      "x": "columna",
      "surfaceToken": "growthOnDark",
      "inkToken": "growthOnDark",
      "fontSize": 40,
      "descriptorSize": 28,
      "descriptorGap": 16,
      "paddingX": 24,
      "paddingY": 14,
      "radius": 10,
      "gapAfterNote": 18,
      "cursorScale": 1.1
    },
    "logo": { "width": 0.2, "x": 0.5, "y": "auto" },
    "subjectProtection": { "top": 920, "minClearance": 24 }
  }
]
```

**Los campos que la hacen pasar:**

| Campo | Para qué | Si falta o está mal |
|---|---|---|
| `safeArea: "axis"` | Ubica el texto dentro de la zona segura de AXIS: feed (4:5, 1:1 y 16:9) 7,5 % a los lados y 6 % arriba y abajo; story (9:16) 10 % y 13 %. El texto arranca dentro también por arriba | El compositor ubica con su margen de 7 % (pendiente 2) y el gate reprueba lo que quede fuera de AXIS |
| `align: "left"` · `cta.x: "columna"` · `note.x: "columna"` | Botón, descriptor y nota arrancan en la columna del texto | `cta.x` es obligatorio (una fracción, `"columna"` o `cta.align: "center"`); corridos más de 4 px de la columna, el gate avisa; `"columna"` con `align: "center"` rechaza el plan |
| `logo: { width: 0.2, x: 0.5, y: "auto" }` | Firma de 20 % del lado corto, centrada, en la primera Y legible de la banda del pie | Sin firma declarada el gate falla. Otras maneras: §19.6 |
| `lead` · `dominant` · `after` | El concepto completo: entrada, dominante y un cierre que remata | Sin entrada o sin cierre el gate falla, salvo `conceptoReducido` aprobado |
| `leadSize` · `dominantSize` · `afterSize` | La jerarquía: el dominante mide al menos 3× la entrada y es la voz mayor de la pieza | Sin `leadSize` la entrada se dibuja a 70 px y sin `afterSize` el cierre a 74: con un dominante de 140, la regla de las tres veces falla |
| `cta.variant` + `cta.variantReason` | El tratamiento del CTA y por qué | Sin motivo, el compositor avisa. Con `"variant": "auto"` y `prominencia` (`discreta`, `delimitada` o `destacada`) decide la medición (§17) |
| `cta.surfaceToken` · `cta.inkToken` | El acento: en `solid` y `outline` lo porta la superficie; en `text`, la tinta (§10) | Sin token resuelve a lima (`growthOnDark`), que es acento válido; un token que no es acento falla (`acento-cta`) |
| `altText` | La escena: quién aparece, qué hace, dónde y con qué luz | Sin ella el gate avisa, y también si transcribe el copy. El texto de la imagen lo agrega solo el compositor |
| `subjectProtection` | Respaldo declarado a mano (§11); con la segmentación no hace falta | Es un número de **este** plate: en otro, mídelo (§11) o quítalo |

**Campos opcionales que conviene conocer:**

| Campo | Para qué |
|---|---|
| `final: [ancho, alto]` | Tamaño de entrega: cada lado entre 320 y 8192 px y con la proporción del plate |
| `protect: [{ "box": [x0, y0, x1, y1], "reason": "…" }]` | Objetos de la escena que el texto no tapa aunque no sean una persona; fracciones del lienzo y una razón de al menos 10 caracteres |
| `editorialReserve: { "maxRight": px, "maxBottom": px }` | Reserva editorial en px del plate: el crecimiento no la cruza y el gate la exige |
| `subjectGuard.ignore: [{ "box", "reason", "aprobadoPor" }]` | Falso positivo de la segmentación (un afiche del fondo): hasta 10 % del lienzo por zona y 15 % en total, con un aprobador del registro |
| `textGrowth: false` | Congela la pieza a su tamaño declarado; sirve para recomponer un set aprobado sin que crezca |
| `signatureSafeArea: { x0, y0, x1, y1 }` | La franja de la firma: la firma se mide contra AXIS estrechada por ella, no contra la zona del texto |
| `placement: { "anchoCssPx", "razon" }` | Dónde se publica si no es un teléfono. **Sólo endurece:** se mide con el menor entre 390 CSS px y el declarado (§19.8) |
| `scrimTop` · `scrimBottom` | Velo que oscurece la foto. El canon dice que no se agrega scrim —se regenera el plate (§10)—; el compositor lo acepta y el gate avisa cuando una voz pasa sólo gracias a él. Es la decisión pendiente 4 |
| `firma` · `excepciones` · `conceptoReducido` | Salidas del canon con razón y aprobador: §19.6 y §19.7 |

Un plan puede usar `null` para decir «no hay» (`label: null`, `after: null`): se trata como ausente. Un campo que no
existe dentro de un objeto propio (`cta`, `note`, `logo`, `firma`…) es un error; en la raíz del plan sólo se avisa,
porque ahí conviven metadatos de otras herramientas.

**Qué está verificado:** la suite certifica esta pieza con código 0 tal como está arriba, salvo `altText` y
`variantReason`, que no cambian un píxel ni una regla que bloquee. Con otro plate u otro copy, la certificación es la
de tu corrida: compón y corre el gate.

### 19.5 Códigos de salida

**Gate** (`pnpm foto:cta:gate`):

| Código | Significa | Qué hacer |
|---|---|---|
| **0** | Certificado: calzan las huellas del plan, el plate, el PNG, el layout y el comando vigente, y cada pieza cumple las reglas que bloquean | Leer los `⚠`, que no bloquean pero alguien decide; antes de entregar, `--reproducir` |
| **1** | Falla: una pieza incumple una regla; algo cambió después de componer (plan, plate, PNG o layout); o falta el QA, hay piezas del plan sin QA o hay 0 piezas evaluadas | Leer cada `✗`, corregir el plan o el plate y recomponer (§19.11) |
| **2** | Uso incorrecto: no se pasó un plan | `pnpm foto:cta:gate <plan.json>` |
| **3** | **No certificable** (`⊘`): no es un pase ni una falla; el gate no tiene cómo probar lo que certificaría | Recomponer; si la causa es la versión del comando o la caché de máscaras, `--reproducir`; con gesto o tarjeta no hay forma (§19.11) |

**Orden en que decide.** Primero la integridad: huellas, piezas sin QA y piezas sin máscara salen con 1 antes de mirar
el contenido. Después, el contenido. Un motivo de «no certificable» saca 3 sólo si no hubo ninguna falla: ante un 1,
corrige y vuelve a correr, porque el 3 puede aparecer recién después.

**Los demás comandos:**

| Comando | 0 | 1 | Otros |
|---|---|---|---|
| Compositor | Compuso todo lo pedido | Plan inválido; una pieza abortó (las anteriores quedan escritas y la que abortó no deja nada); otra composición ocupa la carpeta; o se corrió sin plan (muestra la ayuda) | 130, 143 o 129 si lo interrumpes con Ctrl-C, SIGTERM o SIGHUP mientras compone: el bloqueo se suelta |
| Regresión | Sin diferencias (sólo 🔵) | Cualquier diferencia, piezas omitidas, faltantes del manifiesto, sin manifiesto o 0 casos | — |
| Mutantes | Todos los mutantes detectados por la razón esperada y los canarios bien clasificados | Alguno sobrevive o falla por otra razón, la corrida base no pasa o el catálogo quedó viejo | — |
| Reporte de accesibilidad | Escribió el reporte | No existe el QA del plan | 2 si falta el plan |

### 19.6 La firma: cuatro maneras de declararla

El gate exige que toda pieza declare su firma.

| Forma | En el plan | Qué hace el compositor | Qué exige el gate |
|---|---|---|---|
| **Logo automático** (la recomendada) | `"logo": { "width": 0.2, "x": 0.5, "y": "auto" }` | Busca, desde el pie hacia arriba, la primera Y **dentro de la banda del pie** —debajo de todo lo compuesto, con holgura, y dentro de la zona de la firma— donde el logotipo mide ≥ 4,5:1 en su caja **y** en su trazo con alguna de las dos tintas oficiales, sin tocar al sujeto; dibuja la tinta que cumplió | ≥ 4,5:1 en la caja y en el trazo, ≥ 20 % del lado corto, fuera del sujeto, dentro de su zona y debajo de todo el contenido |
| **Logo en una Y fija** | `"logo": { "width": 0.2, "x": 0.5, "y": 0.84 }` (borde superior, fracción del alto) | Lo dibuja ahí; con `variant: "auto"` (por defecto) elige la tinta midiendo donde va: `negative` (blanca) o `color` (navy) | Lo mismo, salvo «debajo del contenido» |
| **Firma externa** | `"firma": { "modo": "externa", "razon": "La firma la pone firmar.mjs después del compositor" }, "signatureY": 0.85` | No la dibuja: reserva su caja (20 % del lado corto o `ancho`, centrada, `y` = centro vertical; 0,935 si no la declaras) para que nada caiga encima, y mide su contraste como la herramienta que firma: el peor píxel de la caja con la mejor de las dos tintas | ≥ 4,5:1, tamaño, sujeto y zona, igual que el logo |
| **Sin firma** | `"firma": { "modo": "sin-firma", "razon": "…", "aprobadoPor": "julio-reyes" }` | Nada | Un aprobador del registro, que dé la razón; el gate la imprime |

`signatureY` sin `firma` también declara una firma externa (la forma que ya usan v05–v07). En la firma sin firma, el
nombre del aprobador va sólo si el operador aprobó esa salida.

**Dónde cabe la firma dentro de la zona de AXIS.** Calculado con la geometría del código —20 % del lado corto,
proporción del logotipo 196,68 : 837,07— y la zona de AXIS de cada formato; es aritmética, no una corrida, y vale para
los tamaños de plate habituales:

| Formato | La zona de AXIS termina en | Firma externa: `y` (centro) máximo | Logo: `logo.y` (borde superior) máximo |
|---|---|---|---|
| 4:5 | 0,94 del alto | 0,92 | 0,90 |
| 1:1 | 0,94 | 0,91 | 0,89 |
| 16:9 | 0,94 | 0,91 | 0,89 |
| 9:16 | 0,87 | 0,85 | 0,84 |

🔴 **Sin `y`, la firma externa queda centrada en 0,935: fuera de la zona de AXIS en los cuatro formatos** (su borde
inferior baja a 0,95–0,96 del alto), y el gate la reprueba como «fuera de la zona segura… firma-externa». Declara `y`.
`signatureSafeArea` sólo puede estrechar esa zona. Y en 9:16 de pauta la firma al pie cae dentro de la UI de la
plataforma (§6).

🔴 **Firma externa: certifica antes de firmar.** En los sets v03–v07, `firmar.mjs` reescribe `out/<id>.png` con la firma
puesta; desde ese momento el gate ya no reconoce el PNG («no es el PNG que registró la composición») y `--reproducir`
tampoco. El gate ya midió la caja de la firma sobre la pieza sin firma: certifica primero y firma después, o firma una
copia.

**Cuando `logo.y: "auto"` no encuentra lugar.** El compositor avisa: «`logo.y: "auto"` no encontró en la banda del pie
(A–B % del alto) una Y con ≥ 4,5:1 en la caja y el trazo, lejos del sujeto…». La firma queda en el pie histórico y el
gate la mide ahí, donde suele salir fuera de la zona segura o bajo 4,5:1. En el QA se ve como `firma.encontrada: false`
y `firma.banda` dice qué franja recorrió: si es angosta, el texto baja demasiado. Qué hacer: acortar o subir el texto
para abrir la banda, fijar `logo.y` dentro de la tabla de arriba, o un plate con el lecho del pie más oscuro o más
claro. Nunca subas la firma por encima del texto: deja de ser firma (así quedaba KV-06-169 antes del tramo 6). Con
`logo.y: "auto"` el gate lo rechaza y esa regla no se exceptúa; con una `logo.y` fija el gate no lo mide —sólo que nada
se encime—, así que lo cuida quien la fija.

> ✅ **Corregido el 2026-09-23 (tramo 9):** la búsqueda de `logo.y: "auto"` lee `protect` con su forma canónica (`[{ box: [x0, y0, x1, y1], reason }]`) y esquiva esas zonas, igual que la guarda del texto. Lo prueba P06 («la firma automática respeta las zonas protect») y lo vigila el mutante `t9-firma-ignora-protect`.

### 19.7 Excepciones auditadas y registro de aprobadores

Una excepción exceptúa **una regla en una pieza**. No apaga la medición: el gate la imprime con su razón y quién la
aprobó (`⚠ <id>: … — excepción auditada «regla» (hasta N): razón (aprobó X)`). Es para una decisión de diseño que el
operador toma mirando la pieza, no para que el gate dé verde.

```json
"excepciones": [
  {
    "regla": "zona-segura",
    "razon": "La firma de la story queda 12 px bajo la zona de AXIS; aprobado mirando la pieza en Reels.",
    "aprobadoPor": "julio-reyes",
    "plate": "<sha256 del plate: 64 caracteres hex>",
    "hasta": 12
  }
]
```

El sha256 del plate, desde la carpeta del plan (el primer campo de la salida):

```bash
shasum -a 256 plates/<plate>.png
```

Si falta o no calza, el gate imprime el correcto en el mensaje («declara `plate: "<sha>"` si se re-aprueba para éste»).
Copiarlo sólo vale si el operador re-aprueba la excepción para ese plate.

| Regla | Qué exceptúa | `hasta`, cuando la regla se mide |
|---|---|---|
| `zona-segura` | Texto, botón, selección o firma fuera de la zona de AXIS | px máximos que se sale el peor elemento |
| `reserva-editorial` | Contenido fuera de `editorialReserve` | px máximos de desborde |
| `firma-contraste` | Firma bajo 4,5:1, en la caja o en el trazo | contraste mínimo aprobado (p. ej. `4.1`) |
| `firma-tamano` | Firma bajo 20 % del lado corto | fracción mínima del lado corto (p. ej. `0.14`) |
| `firma-sobre-sujeto` | Firma sobre la silueta | px máximos de silueta bajo la firma |
| `jerarquia` | Dominante bajo 3× la entrada | razón mínima (p. ej. `2.6`) |
| `dominante-mayor` | Otra voz más grande que el dominante | razón mínima entre el dominante y la voz mayor (p. ej. `0.9`) |
| `acento-cta` | CTA sin acento (p. ej. con Gigi en cuadro) | no se mide: sin `hasta` |
| `cta-perceptual` | CTA bajo APCA o, con daltonismo, bajo 4,5:1 | no se mide: sin `hasta` |
| `concepto-completo` | Pieza sin entrada o sin cierre | no se mide: sin `hasta` (la forma canónica es `conceptoReducido`) |
| `legibilidad` | Texto bajo 9 CSS px en el teléfono | hoy la regla sólo avisa (pendiente 6): la excepción se acepta y no tiene nada que apagar |

Una excepción **vale** sólo si se cumplen las tres condiciones del tramo 7:

1. `aprobadoPor` está en `scripts/foto/aprobadores.json`. `suite-pruebas` sólo vale para los temporales de la suite,
   fuera del repo.
2. `plate` es el sha256 del plate con que se aprobó: si el plate se regenera, se vuelve a aprobar.
3. Si la regla se mide con un número, `hasta` declara el valor aprobado y la medida no lo supera: ≥ en contrastes,
   tamaños y razones; ≤ en px.

Si no vale, **no apaga nada**: la regla bloquea y el gate dice por qué (§19.11). Y **ninguna excepción cambia cuánto
crece la pieza**: la búsqueda del tamaño no las mira.

**Otras salidas que exigen un aprobador del registro:** `firma: { modo: "sin-firma", razon, aprobadoPor }`,
`conceptoReducido: { razon, aprobadoPor }` y cada zona de `subjectGuard.ignore`. El gate las imprime con su razón; sin
un aprobador válido, fallan.

**El registro** (`scripts/foto/aprobadores.json`): hoy `julio-reyes` (Julio Reyes, operador de marca y del compositor) y
`suite-pruebas` (sólo planes fuera del repo; también al certificar por reproducción, porque `--origen` le dice al gate
de qué plan viene la copia). Agregar a alguien es decisión del operador y va con commit. 🔴 Un agente nunca inventa un
aprobador ni copia `suite-pruebas` a un plan real: si falta la aprobación, pregunta.

### 19.8 Qué bloquea y qué avisa el gate

**Bloquea** (código 1), salvo excepción auditada donde la regla lo permite:

- **Integridad:** las huellas del plan, el plate, el PNG y el layout; el tamaño entregado del PNG (el `final` del plan o
  el del plate); toda pieza con CTA presente en el QA; al menos una pieza evaluada.
- **Sujeto:** sin máscara (`guardaSujeto: sin-mascara`) no se certifica; una zona ignorada sin aprobador del registro
  falla.
- **Accesibilidad por voz:** WCAG 2.2 AA según el tamaño en pantalla (390 CSS px de ancho; 4,5:1 texto normal, 3:1
  grande), medida sobre el trazo —el 1 % peor de los píxeles de glifo— y no sólo sobre la caja. Relleno y borde del
  CTA ≥ 3:1; el borde del contorno, ≥ 1 CSS px y ≥ 3:1 como se ve en un teléfono (390 px × DPR 2). Una voz sin
  medición falla.
- **CTA:** 4,5:1 a cualquier tamaño, CTA y descriptor; APCA y daltonismo (`cta-perceptual`); acento obligatorio, con el
  portador que corresponde a la variante (`acento-cta`); en `solid`, el relleno contra la escena ≥ 3:1.
- **Zona segura de AXIS** (`zona-segura`), con la firma medida contra su propia franja.
- **Firma:** declarada siempre; ≥ 4,5:1 en la caja y en el trazo (`firma-contraste`); ≥ 20 % del lado corto
  (`firma-tamano`); fuera del sujeto (`firma-sobre-sujeto`); si es automática, debajo de todo el contenido (esto no se
  exceptúa).
- **Concepto y jerarquía:** entrada, dominante y cierre (`concepto-completo`, o `conceptoReducido` aprobado); el
  dominante ≥ 3× la entrada (`jerarquia`); el dominante es la voz mayor (`dominante-mayor`).
- **Maquetación:** la reserva editorial (`reserva-editorial`) y las invariantes recalculadas sobre el layout: nada se
  encima y ninguna selección tapa una voz.

**Avisa** (`⚠`, no bloquea; alguien lo mira):

- una voz que pasa sólo gracias al velo, medida sobre la foto sin él (pendiente 4);
- la variante del CTA elegida sin margen (pendiente 5);
- `placement` declarado;
- texto de menos de 9 CSS px en el teléfono (pendiente 6);
- APCA y daltonismo en las voces que no son el CTA;
- una alternativa sin escena, o una escena (`altText`) que transcribe el copy;
- corchetes del CTA de texto bajo 1 CSS px o bajo 3:1: el trazo que dibuja AXIS mide ≈ 0,69 CSS px en un teléfono en
  todos los formatos (pendiente 7);
- una máscara que no marca ningún sujeto;
- CTA o descriptor corridos más de 4 px de la columna del texto;
- menos de media altura del CTA de aire sobre los corchetes del CTA de texto.

**`placement`, en concreto.** `placement: { anchoCssPx, razon }` dice dónde se publica la pieza si no es un teléfono.
Desde el tramo 7 **sólo endurece**: se mide con el menor entre 390 CSS px y el declarado, porque la misma pieza también
se ve en un teléfono. Declarar 1600 ya no baja WCAG de 4,5 a 3:1 ni adelgaza el borde, y tampoco quita el aviso de texto
bajo 9 px. El gate avisa en cada pieza que lo declara.

### 19.9 Qué dice el QA

`out/qa-<plan>.json` es un arreglo con una fila por pieza. Los campos que sumaron los tramos 6–8 y los que más se
consultan:

| Campo | Qué dice | Cómo leerlo |
|---|---|---|
| `mascara.origen` | De dónde salió la máscara del sujeto: `fresca` (segmentada en esta corrida), `cache-canonica` (la caché del repo, verificada por sus metadatos) o `cache-externa` (una caché ajena, vía `FOTO_MASCARAS_DIR`) | Las dos primeras certifican; `cache-externa` sale como no certificable → `--reproducir`. `mascara.cobertura` es la fracción del plate marcada como sujeto (con 0, el gate avisa) y `mascara.sha`, la huella de la máscara |
| `firma.trazo` | El 1 % peor de los píxeles del logotipo contra su fondo: `{ wcag, umbralWcag, cumpleWcag, pctBajoUmbral }` | Tiene que cumplir 4,5:1, igual que la caja (`contraste.logo`); si no, `firma-contraste` |
| `firma.auto` · `firma.encontrada` · `firma.banda` | Con `logo.y: "auto"`: si la búsqueda encontró una Y y qué franja recorrió (`[desde, hasta]`, en fracciones del alto) | `encontrada: false` → la firma quedó en el pie histórico; una banda angosta dice que el texto dejó poco espacio |
| `firma.anchoLadoCorto` · `firma.y` | Tamaño de la firma (fracción del lado corto) y su Y: el borde superior del logo o, en la externa, el centro | Bajo 0,2 → `firma-tamano` |
| `firma.externa` · `firma.variante` · `contraste.firmaExterna` | La firma que pone otra herramienta: la caja reservada, la tinta que mejor se lee y su contraste | Bajo 4,5:1 → `firma-contraste` |
| `accesibilidad.rescate` | Voces que pasan sólo gracias al velo: `{ por: ["scrimTop", …], voces: [{ voz, sinVelo, conVelo }] }` | Aviso: la foto se oscurece para leerse (pendiente 4) |
| `accesibilidad.corchetes` | Corchetes del CTA de texto: grosor en CSS px en un teléfono, el peor contraste de las cuatro esquinas y su umbral (3:1) | Aviso bajo 1 CSS px o bajo 3:1 (pendiente 7) |
| `ctaVariante` | Con `variant: "auto"`: `prominencia`, `elegida`, `escalo`, `motivo` y, si aplica, `tintaDegradada` | El motivo nombra la condición que decidió |
| `ctaVariante.sinMargen` | Ninguna variante alcanzó con margen y quedó la que más separa | Aviso: pasa por poco; con otra pantalla o con compresión puede no alcanzar (pendiente 5) |
| `accesibilidad.voces.<voz>` | WCAG según el tamaño en pantalla, APCA, daltonismo, el trazo (`glifo`) y, en el borde del contorno, el anillo (`anillo`) | De aquí sale cada `✗` de accesibilidad |
| `anchoPantalla` | El ancho con que se midió: 390, o menos si `placement` lo pide | — |
| `huellas` | sha256 de la pieza del plan, el plate, el comando, el PNG y el layout | El gate las recalcula; nunca se editan a mano |

### 19.10 Regresión y mutantes: cómo leerlos

**Regresión.** Antes de commitear un cambio al compositor o a sus módulos, corre `pnpm foto:componer:cta:regresion`.
Compone cada pieza con CTA del repo con la referencia (HEAD, extraída de git de forma **hermética**, con todo su cierre
de dependencias) y con tu versión, cada una sola en un temporal: las carpetas aprobadas no se tocan. Al 2026-09-23: 132
piezas únicas, de las que 114 componen y 18 abortan en la referencia, y 84 piezas con CTA sin plate en esta máquina.

| Línea del reporte | Qué significa | ¿Falla? |
|---|---|---|
| `Iguales: N de M` | Piezas idénticas en estado, layout, QA, avisos, veredicto del gate y píxel | — |
| 🔴 Cambia el ESTADO | Compone en una versión y aborta en la otra (con el mensaje de antes y el de ahora) | Sí |
| 🟠 Cambia el LAYOUT o el QA | Se movió una caja (tolerancia 0,05 px) o cambió un valor del QA; una clave nueva en el layout también cae aquí | Sí |
| 🟡 Sólo cambian PÍXELES | Mismo layout y QA, otro PNG: cuántos píxeles y cuánto | Sí |
| 🟣 Cambian los AVISOS | Un aviso del compositor nuevo («aviso nuevo») o que dejó de salir («aviso que ya no sale») | Sí |
| ⛔ Cambia el VEREDICTO del gate | La pieza no cambia, pero el gate dice otra cosa: «el gate suma: …» o «el gate ya no dice: …» (tramo 9) | Sí |
| ⚪ Cambia el mensaje de error | Aborta en las dos, con otro mensaje | Sí |
| 🔵 El QA suma claves | La pieza no cambia; el QA trae claves nuevas, resumidas por nombre | No: informa |
| ⛔ Piezas OMITIDAS | No se pudieron verificar | Sí |
| ⛔ Faltan piezas del manifiesto de COBERTURA | La red se achicó: un plan movido o un plate que ya no está | Sí; si fue a propósito, `--actualizar-cobertura` |
| ℹ️ piezas sin plate | Piezas con CTA cuyo plate no está en esta máquina | No: se cuentan |
| ⚠ Cambiaron activos… | Fuentes, logos o paquetes cambiaron desde la referencia; los dos lados los leen del árbol de trabajo, así que esa diferencia no aparece en el píxel | No, pero míralo |

Sin manifiesto de cobertura o con 0 casos, la corrida falla antes de comparar. **Regla:** un cambio que no debería
alterar nada sale sin diferencias (sólo 🔵). Uno que altera algo muestra qué piezas y cuánto, y se aprueba mirando el
antes y el después: las carpetas de las piezas con diferencias quedan en el temporal.

**Mutantes.** `pnpm foto:componer:cta:mutantes` rompe a propósito cada guarda —del compositor, del gate, del arnés de
regresión y de los módulos puros— en una copia `.componer-cta@mut-<nombre>.regresion.mjs` que se borra al terminar, y
corre las pruebas que la cuidan. Desde el tramo 9, cada conjunto de pruebas corre primero sin mutante (la corrida base):

| Estado | Qué significa |
|---|---|
| `detectado` (✓) | La verificación esperada cambió respecto de la base, por la razón esperada y sin colapso |
| `falla-por-otra-razon` | Falló, pero no por la razón esperada, o colapsó: tumbó más de la mitad de lo que pasaba o reventó una prueba (salvo en guardas amplias como el esquema) |
| `sobrevive` | Ninguna prueba lo notó: esa guarda no está probada |
| `base-falla` | La corrida sin mutante no pasa: el catálogo no se puede juzgar |
| `catalogo-viejo` | El cambio del mutante ya no aplica al código |
| canario (✓) | Rompe algo ajeno a propósito: el arnés tiene que clasificarlo como `falla-por-otra-razon`; si lo da por detectado, el arnés sobrestima |

La línea final dice `Puntuación: N de M mutantes detectados por la razón esperada · canarios: K de 2 clasificados como
falla por otra razón`, y sale con 0 sólo si están todos. Historial: 35 de 35 al cerrar el tramo 5, 48 de 48 al cerrar
el 6 y 12 de 12 los del 7; el tramo 8 sumó ocho y el 9, la corrida base, los canarios y los mutantes del proceso.

### 19.11 Problemas comunes

**El gate sale con 3 (no certificable):**

| Mensaje | Causa | Solución |
|---|---|---|
| `⚠ …/out/qa.json es del formato anterior (compartido y sin huellas)…` y `⊘ NO CERTIFICABLE` | El plan se compuso antes del tramo 1: QA compartido, sin huellas ni medición del trazo | `pnpm foto:componer:cta <plan>`. Si además dice que el QA «es anterior al plan», sale con 1: la última composición no terminó |
| `· <id>: se compuso con otra versión del comando — recompón, o certifícala con --reproducir…` | Desde que se compuso cambió el compositor, un módulo, una fuente, un logo o un paquete: la huella del comando los incluye (tramo 9) | Si lo entregado debe quedar igual, `--reproducir`: certifica sólo si el comando vigente produce los mismos bytes. Si no, recomponer y mirar la pieza de nuevo |
| `· <id>: la máscara del sujeto salió de una caché ajena al repo (FOTO_MASCARAS_DIR)…` o «no dice de dónde salió» | Se compuso con `FOTO_MASCARAS_DIR` apuntando fuera de la caché del repo, o con un comando anterior al tramo 6 | `--reproducir` (segmenta de nuevo), o recomponer sin esa variable |
| `· <id>: lleva gesto manuscrito…` · `· <id>: lleva tarjeta…` | Ninguna guarda mide el gesto ni el texto de la tarjeta; el gesto está fuera de alcance por decisión del operador (2026-09-23) | No hay forma de certificarla. Para certificar, quita el gesto o la tarjeta; si la pieza sale así, sale **sin certificar** por decisión del operador, nunca como pase |

**El gate sale con 1:**

| Mensaje | Causa | Solución |
|---|---|---|
| `✗ <id>: … — la excepción «regla» no vale: «X» no está en el registro de aprobadores…` | `aprobadoPor` no está en `scripts/foto/aprobadores.json`, o es `suite-pruebas` en un plan del repo | Pedir la aprobación al operador; nunca inventar un aprobador ni copiar el de la suite |
| `… no vale: se aprobó para otro plate (no nombra ninguno): declara plate: "<sha>"…` | Falta `plate`, o el plate cambió (se regeneró) | Re-aprobación del operador para este plate; el sha sale de `shasum -a 256 <plate>` o del mismo mensaje |
| `… no vale: no declara hasta, el valor que aprueba (hoy la medida es N)` | La regla se mide con un número y la excepción no trae `hasta` | Declarar el valor aprobado (tabla de §19.7) |
| `… no vale: la medida (N) va más allá de lo aprobado (≥ H o ≤ H)` | La pieza empeoró respecto de lo aprobado | Corregir la pieza, o que el operador re-apruebe con un `hasta` nuevo |
| `✗ <id>: el CTA se midió con el umbral de texto grande (3:1): el CTA exige 4.5:1 a cualquier tamaño…` | El QA viene de un comando anterior al tramo 7, que medía el CTA grande con 3:1 | Recomponer. Si después el CTA no alcanza 4,5:1, es una falla real: otra tinta, `variant: "auto"` u otro plate |
| `✗ <id>: el dominante (N px) no es la voz mayor: CTA M px · …` | Otra voz (entrada, cierre, nota, CTA o descriptor) mide más que el dominante | Subir `dominantSize` o bajar esa voz; si es una decisión de diseño, excepción `dominante-mayor` con `hasta` = dominante ÷ voz mayor |
| `✗ <id>: out/<id>.png mide A×B y el plan pide C×D…` | El PNG registrado no tiene el tamaño de `final` (o del plate): lo produjo una versión del comando que ignoraba `final`, o el QA se armó a mano | Recomponer con el comando vigente. Si persiste, es un defecto del compositor —P10, «el tamaño entregado es el del plan», debería fallar—: repórtalo |
| `✗ <id>: out/<id>.png no es el PNG que registró la composición…` | Alguien tocó el PNG después de componer; por ejemplo, `firmar.mjs` al poner la firma externa | Certificar antes de firmar, o firmar una copia (§19.6); si no, recomponer |
| `✗ <id>: fuera de la zona segura <feed o story> de AXIS: …` | Algo se sale de la zona de AXIS; el mensaje dice qué hacer según lo que ya declaraste (tramo 8) | `safeArea: "axis"` y `cta.x: "columna"` si faltan; si ya están, acortar el texto, bajar su tamaño o subir el bloque; la firma, dentro de la tabla de §19.6 |
| `✗ <id>: la firma automática quedó por encima del contenido…` | Un defecto del compositor: la búsqueda sólo puede usar la banda del pie | No se exceptúa: repórtalo |
| `✗ <id>: «voz»: el 1 % peor del trazo mide X:1 y necesita Y:1 (la caja da Z:1…)` | Parte del texto cae sobre un borde claro u oscuro de la escena | Mover el texto, proteger la zona con `protect` o regenerar el plate |
| `✗ <id>: la segmentación del sujeto no corrió (guardaSujeto: sin-mascara)…` | La segmentación falló al componer (el compositor lo avisó: «no se pudo segmentar…») | Resolver la causa y recomponer; la declaración a mano no certifica |
| `✗ <id>: la pieza no declara firma…` | Ni `logo`, ni `firma`, ni `signatureY` | Declararla (§19.6) |
| `✗ <id>: falta la entrada…` o `falta el cierre que remata…` | Concepto incompleto | Agregar `lead` o `after`, o `conceptoReducido` con aprobador |
| `✗ <id>: el dominante mide N× la entrada (regla de las tres veces: ≥ 3×)` | La jerarquía se aplana; sin `leadSize`, la entrada mide 70 px | Subir `dominantSize` o bajar `leadSize`; si es decisión de diseño, excepción `jerarquia` con `hasta` |
| `✗ no existe …/out/qa-<plan>.json` · `✗ 0 piezas evaluadas…` · `✗ piezas del plan sin QA…` | No se compuso el plan, o no entero | Componer el plan completo y resolver sus errores antes del gate |

**El gate avisa algo que no se resuelve como sugiere:** `⚠ <id>: menos de 9 px en pantalla… Si la pieza no va a un
teléfono, declara placement…`. Desde el tramo 7, `placement` sólo endurece y ya no quita este aviso. El aviso queda
hasta que se decida el piso por rol (pendiente 6); si molesta, agranda esa voz o recompón el formato.

**El compositor rechaza el plan** (`plan inválido — <id>: …`, antes de componer):

| Mensaje | Causa | Solución |
|---|---|---|
| `` `cta.x`: «columna» es la columna del texto alineado a la izquierda; en un bloque centrado usa una fracción del ancho `` | `"columna"` con `align: "center"` (tramo 8) | `align: "left"`, que es lo recomendado con `columna`, o una fracción en `cta.x` y `note.x` |
| `` `final.0` debe ser ≥ 320 `` (o `≤ 8192`) | `final` fuera de rango (tramo 8) | El tamaño real de entrega: entre 320 y 8192 px por lado |
| `<id>: el plate … no es una imagen legible (…)` | El archivo no es una imagen: corrupto, a medio descargar o con la extensión equivocada | Regenerarlo o exportarlo de nuevo; la ruta es relativa al json |
| `no existe el plate …` | La ruta está mal escrita o el plate se movió | Corregir la ruta, relativa al json |
| `ids que sólo difieren en mayúsculas…` · `ids repetidos…` | En macOS y Windows `KV-01` y `kv-01` son el mismo archivo | Ids únicos, también sin distinguir mayúsculas |
| `` `lead` trae una entidad que no es un carácter Unicode: &#99999999; `` | Una entidad numérica fuera de Unicode (tramo 8) | Escribir el carácter directamente, o una entidad válida |
| `` `cta.text` usa caracteres que su fuente no tiene (saldrían como cuadros vacíos): «🚀» U+1F680 `` | Emoji, hebreo u otro carácter sin glifo en Poppins o Bricolage | Quitarlo o reemplazarlo |
| `` `dominantTracking` debe ser ≥ -0.08 `` | Tracking fuera de rango: entre −0,08 y 0,12 em | Un valor del rango |
| `` falta `cta.x` (una fracción, "columna", o `cta.align: "center"`) `` | El CTA no tiene posición | `"x": "columna"` |
| `la nota necesita note.gapAfterClosure (encadenada) o note.y (ubicada a mano)` | La nota no tiene posición | `gapAfterClosure` |

**El compositor aborta o avisa al componer:**

| Mensaje | Causa | Solución |
|---|---|---|
| `otra composición usa <carpeta>/out (proceso N). Espera a que termine…` | Otra composición corre en la misma carpeta | Esperar. Si ese proceso murió, el bloqueo se reclama solo (tramo 9) |
| `⚠ <ids>: también los registra out/qa-<otro>.json (otro plan de esta carpeta)…` | Dos planes de la carpeta comparten ids (tramo 9) | Ids distintos o carpetas distintas. Si recompones igual, el otro plan deja de certificar hasta que lo recompongas |
| `⚠ <id>: logo.y: "auto" no encontró en la banda del pie…` | El texto baja demasiado y deja poca banda, el lecho del pie no da contraste, o el sujeto ocupa el pie | Ver «Cuando `logo.y: "auto"` no encuentra lugar» (§19.6) |
| `<id>: el texto tapa al sujeto — <caja> (N px)…` | Una caja toca la silueta segmentada | Subir el `top`, acortar el copy o regenerar el plate con más reserva; `subjectGuard.ignore` sólo para un falso positivo, con aprobador |
| `<id>: el texto tapa una zona protegida — …` | Una caja cae sobre una zona `protect` | Mover el texto o acotar la zona |
| `<id>: la maquetación no cumple — …` | Choques entre texto, botón, firma y selección | Cambiar la esquina del colaborador, el ancla del cursor o la posición de la firma |
| `` <id>: `final` A×B no tiene la proporción del plate … `` | `final` con otra proporción: el reescalado recortaría la pieza | La proporción del plate; para otro formato, otro plate |
| `⚠ N pieza(s) eligen variante de CTA sin cta.variantReason…` | Variante sin motivo | `variantReason`, o `variant: "auto"` con `prominencia`, o comparar con `--variantes` |
| `⚠ <id>: campos que este comando no lee — …` | Un campo desconocido en la raíz del plan (dentro de un objeto propio es error) | Quitarlo o corregir el nombre |
