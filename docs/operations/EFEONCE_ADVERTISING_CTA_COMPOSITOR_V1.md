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

## 8. 🔴 El cursor del CTA tapa el descriptor cuando el botón es corto

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

## 10. El acento del CTA no compite con la marca del partner que esté en cuadro

**Hallazgo de CMP-002 (carril HubSpot), 2026-09-22.** Las siete piezas llevan el Sprocket de HubSpot como
product placement, y el Sprocket es **naranja `#FF5C35`** — casi el mismo tono que `accentSurface` (`#ff6500`).
Un CTA naranja en esa pieza no se lee como la acción de Efeonce: se lee como parte del producto del partner.

> **Regla: cuando hay una marca de tercero en cuadro, el acento del CTA se elige por CONTRASTE DE
> ATRIBUCIÓN, no sólo por composición. El acento de Efeonce tiene que ser distinguible del color de esa
> marca, o la acción se le atribuye al partner.**

En CMP-002 eso resolvió el acento a **lima `growthOnDark`**, que además contrasta mejor que el naranja sobre
los fondos oscuros de ese carril. En CMP-001 las piezas MOFU llegaron a lima **por el default del compositor**,
no por decisión; con esta regla, la elección queda declarada.

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
