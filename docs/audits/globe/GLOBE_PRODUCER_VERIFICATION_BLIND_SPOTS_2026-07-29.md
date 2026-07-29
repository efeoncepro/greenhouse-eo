# Auditoría — Puntos ciegos de verificación del Producer de Globe

> **Tipo de documento:** Auditoría técnica (hallazgos con evidencia medida)
> **Versión:** 1.0
> **Creado:** 2026-07-29 por Claude (sesión de craft del composer, TASK-1552)
> **Superficies auditadas:** composer, header y tool dock del Producer React
> **NO auditadas:** feed, viewer y share (ver §5)
> **Documentación técnica relacionada:** [ADR-016](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) ·
> [Style Reference del composer](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)

---

## Por qué existe este documento

Durante una sesión de trabajo sobre el composer aparecieron **siete defectos reales que todas las
verificaciones automáticas declaraban sanos**. No es una lista de bugs: los bugs ya están corregidos y
documentados en sus specs. Lo que se registra acá es el **patrón**, porque se repitió lo suficiente como
para dejar de ser casualidad.

**La forma es siempre la misma:** el gate comprueba que *el código dice lo correcto*, no que *el runtime
hace lo correcto*. Build verde, cuatro gates de diseño verdes, canary de browser verde — y la propiedad
computando en su valor inicial, el asset devolviendo 404, o el control midiendo diez veces lo que debe.

**Ninguno de los siete lo encontró una herramienta.** Cuatro los vio el operador en pantalla, tres
salieron al desplegar a un entorno real.

---

## 1 · Namespace del theme vaciado y no repoblado

**Qué pasó.** El theme vacía trece namespaces de Tailwind (`--blur-*: initial`, etc.) para que la escala
ajena no exista, y los repuebla sólo con lo que declara el SSOT. `--blur-` no estaba en
`PASSTHROUGH_NAMESPACES` y el SSOT no declaraba ningún token de desenfoque.

**Efecto medido.** Los **seis** `backdrop-blur-*` de la superficie computaban `backdrop-filter: none`. Se
veía en el header: `bg-rail` al 58 % de opacidad **sin** desenfoque no es translúcido, es un agujero — el
contenido pasaba nítido por detrás al scrollear.

**Por qué ningún gate lo vio.** La clase existe, compila y el CSS la contiene. Nada comprobaba que el
namespace del que depende estuviera poblado.

**Guardián creado.** Tercer aserto en `tailwind-theme.test.ts`, inverso al que ya existía: el viejo
comprueba que un token del SSOT llegue al theme; el nuevo comprueba que el código no consuma un namespace
que el theme dejó sin poblar. Verificado en los dos sentidos: pasa en estado sano (`exit 0`) y **falla** al
comentar los tokens de blur (`exit 1`, señalando los seis usos).

**Contra-caso, igual de importante.** Se creyó que `--aspect-*` también estaba vaciado y se evitó
`aspect-video` por esa razón. **Era falso** — sólo se vacían trece namespaces y aspect no es uno. La lista
de vaciados es la autoridad; suponerla lleva a decisiones de implementación peores por un motivo inventado.

---

## 2 · Harness con allowlist propio ≠ runtime

**Qué pasó.** `apps/studio-web/src/assets.ts` es un allowlist **explícito**: todo asset que el runtime
sirve tiene que estar listado. Las ocho miniaturas de Dirección nunca estuvieron ahí — ni los `.svg`
originales.

**Efecto medido.** 404 en producción desde que el bloque §4.3 nació. El canary del composer tiene su
**propio** allowlist estático, así que ahí se veían perfectamente.

**Por qué ningún gate lo vio.** No existe test que compare `public/` contra el registro. Y el harness que
sí sirve los archivos usa una lista distinta, así que verificar contra él confirma lo contrario de lo que
se quiere saber.

**Regla que queda escrita en el propio registro:** un archivo en `public/` que no esté listado en
`assets.ts` **no existe para el runtime**, por más que el harness lo sirva.

**Guardián:** ⚠️ **no creado.** El próximo asset que se agregue sin su entrada volverá a dar 404 sin que
nada avise.

---

## 3 · El canary cachea el bundle al arrancar

**Qué pasó.** `producer-composer-canary.mjs` llama `loadClientBundle()` al arrancar y conserva ese mapa de
assets en memoria. Si algo reconstruye después, el disco cambia y el canary sigue sirviendo el anterior.

**Efecto medido.** Se reportó al operador que unos cambios estaban aplicados, verificados midiendo el DOM
justo después de reconstruir. Al preguntar «¿ajustaste?», el disco tenía `index-DOJQqmOT.js` y el canary
servía `index-BuboKt1c.js`.

**Por qué ningún gate lo vio.** Ninguno compara el hash del bundle en disco contra el servido.

**Mitigación adoptada, no automatizada:** comparar ambos con `curl` + `ls` antes de reportar que algo está
listo. En un harness que cachea al arrancar, «lo verifiqué hace un rato» no es garantía de «es lo que estás
viendo».

---

## 4 · El harness no podía ejercer la funcionalidad que debía proteger

**Qué pasó.** Al cablear la miniatura real de cada referencia, el canary no servía `/v1/outputs/` ni el
reader `globe.producer.output.get`. La ficha se quedaba con su glifo de respaldo **pasara lo que pasara**.

**Por qué importa.** El harness no distinguía «la miniatura funciona» de «la miniatura no existe» — que es
exactamente el hueco por el que el port había perdido la imagen sin que nada lo notara.

**Guardián creado.** Se agregaron al canary el reader, la ruta y un PNG 1×1. Verificado en browser: object
URL real, imagen decodificada, glifo ausente de la ficha.

**Principio general:** un harness que no puede ejercer la funcionalidad tampoco puede protegerla. Cuando un
aserto pase sobre una superficie que el fixture no puede construir, el aserto no vale.

---

## 5 · Guard nombrado por su caso, no por su razón

**Qué pasó.** El feed monta un `<img>` con los bytes de `item.output.sha256`. Para una imagen eso es la
imagen; para un video es el MP4, y un `<img>` no lo decodifica: el browser pinta el texto `alt` sobre la
card.

**El defecto ya se había corregido una vez** — para audio — y su comentario lo documenta: *«el `<img>`
quedaba sin bytes que decodificar y el browser pintaba su texto alt sobre la forma de onda»*. Pero el guard
se escribió como `isAudio`, nombrado por el caso que lo motivó y no por su razón, así que **video quedó
fuera y el mismo bug volvió con otra modalidad**.

**Corrección.** Renombrado a `hasPoster` — «esto no es una imagen»— y aplicado a las dos superficies del
feed. Un guard nombrado por su caso sirve una vez; nombrado por su significado cierra la familia entera.

**Alcance del hallazgo.** Salió al mirar producción, **no** de la auditoría de regresiones del port: esa
cubrió composer, header y tool dock. **Feed, viewer y share siguen sin auditar** (`TASK-1558`/`TASK-1559`),
y este defecto salió justamente de ahí.

---

## 6 · Ningún aserto compara un control contra sus hermanos

**Qué pasó.** Al apilar la etiqueta sobre el stepper de Cantidad —para cerrar 680 px de separación— el
contenedor pasó de `flex justify-between` a `grid`. Un hijo de grid **se estira** por defecto
(`justify-items: stretch`), y el `inline-flex` del stepper no lo salva.

**Efecto medido.** 768 px de ancho para un control de «− 1 +», cuando sus hermanos del mismo bloque miden
68. Los cuatro gates y el canary quedaron **verdes**.

**Por qué ningún gate lo vio.** Los asertos de layout comprueban contención (`scrollWidth === clientWidth`)
y ausencia de overflow. Ninguno compara proporciones entre controles pares.

**Lección de método, más allá del guardián.** Se midió el DOM justo después del cambio y se confirmó lo que
se había arreglado —la separación— sin comprobar lo que se había roto al lado. **Se midió la intención, no
el resultado.**

---

## 7 · El pipeline de build sólo se ejercita al desplegar

**Qué pasó.** `--mount=type=secret` es **por-RUN**. El `.npmrc` montado en el `pnpm install` no sobrevive al
RUN siguiente, y `pnpm deploy --legacy --prod /release` **re-resuelve y descarga** las dependencias de
producción.

**Efecto medido.** El primer deploy falló con `ERR_PNPM_FETCH_404 @efeoncepro/axis-ui-contracts … No
authorization header was set`. El install pasó y `studio-client` compiló en 3,68 s —o sea la primera capa
sí tenía credenciales— y reventó en el prune de producción.

**El mensaje engaña.** npm dice *«is not in the npm registry, or you have no permission»*. Lo primero es
falso y lo segundo tampoco es exacto: el paquete existe y el token sirve; lo que falta es que **esa capa**
los pueda ver. Leído de frente, manda a revisar permisos del token o a dudar de si el paquete se publicó.

**Nada llegó a producción:** los pasos de deploy quedaron en `skipped` y la revisión servida no se tocó. El
workflow falla cerrado, que es el comportamiento correcto.

---

## Resumen ejecutable

| # | Punto ciego | Guardián |
|---|---|---|
| 1 | Namespace del theme vaciado y no repoblado | ✅ `tailwind-theme.test.ts`, verificado en ambos sentidos |
| 2 | `public/` sin entrada en `assets.ts` | 🔴 **ninguno** |
| 3 | Canary sirviendo un bundle viejo | 🟡 comparación manual de hash |
| 4 | Harness que no puede ejercer lo que protege | ✅ para este caso; el principio no está automatizado |
| 5 | Guard nombrado por su caso | ✅ corregido; feed/viewer/share sin auditar |
| 6 | Proporción de un control vs sus hermanos | 🔴 **ninguno** |
| 7 | Pipeline de build sólo ejercitado al desplegar | 🟡 el workflow falla cerrado |

**Dos huecos siguen completamente abiertos** (#2 y #6) y uno tiene alcance incompleto (#5). Cerrarlos es
trabajo con dueño pendiente de asignar.

## Lo que esta auditoría NO cubrió

- **Feed, viewer y share** por regresiones del port. El hallazgo #5 salió de ahí por observación directa, no
  por barrido — si el patrón se repitió en esas superficies, sigue invisible.
- **Verificación de accesibilidad** más allá de los casos tocados.
- **El resto de los servicios de Globe**: sólo se auditó `globe-studio-internal`.
