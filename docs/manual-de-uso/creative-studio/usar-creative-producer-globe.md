# Usar Efeonce Globe Creative Producer

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.2
> **Creado:** 2026-07-23 por Claude
> **Ultima actualizacion:** 2026-08-04 por Claude (presupuesto de espera de una generación sana)
> **Doc funcional:** [efeonce-globe-creative-producer.md](../../documentation/creative-studio/efeonce-globe-creative-producer.md)
> **Doc tecnica:** [Creative Producer V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

> Estado actual: operativo internal-only en `https://globe.efeoncepro.com/producer` para personas con grants
> Producer. No equivale a acceso comercial externo.

## Para qué sirve

Para crear una pieza de imagen, video o audio en Globe y seguirla hasta que esté usable: escribir el
prompt, elegir con qué y en qué forma sale, ver cuánto va a costar **antes** de gastar, generar, y
después revisarla, continuarla o compartirla.

## Antes de empezar

- Confirma que la cabecera muestre tu sesión y el espacio correcto. Si el saldo aparece como `—`, lee
  la sección del panel de créditos antes de intentar generar.
- Ten claro que **el saldo que ves es el del espacio completo**, no el de tu proyecto: hoy no hay
  desglose por proyecto ni lista de reservas en curso.
- Un límite máximo de créditos por generación es tuyo de fijar, no un default del sistema.

## Crear un activo

1. Confirma el workspace/proyecto visible en la cabecera.
2. Elige `Imagen`, `Video` o `Audio`.
3. Escribe el prompt y, si corresponde, agrega referencias privadas. Una referencia no queda utilizable hasta que
   su ingest y derechos estén listos.
4. Selecciona modo, preset, ruta/modelo y shape. En Video, `Editar` requiere un asset fuente elegible.
5. Si necesitas reproducibilidad, bloquea la seed y ajusta su valor o usa reroll. Agrega un negative prompt sólo
   como restricción creativa; no incluyas secretos ni instrucciones de proveedor.
6. Define un límite máximo de créditos y selecciona `Calcular costo`.
7. Revisa costo, restricciones y vigencia del estimate. `Generar` se habilita sólo con una cotización vigente;
   cambiar prompt, shape, seed o negative prompt obliga a calcular nuevamente.
8. Sigue el estado durable en la biblioteca. Cerrar el browser no cancela el run.

El halo azul del composer responde al hover/puntero y al foco; al activar un modo de edición permanece encendido para
indicar que el composer está condicionado por un asset fuente. Con `prefers-reduced-motion` conserva la señal de
color/borde sin persecución espacial ni animación.

## Leer el panel de créditos

Se abre haciendo clic en la píldora de la cabecera. Los tres números que muestra **no son el mismo dato
repetido**: cada slot responde una pregunta distinta.

| Dónde miras | Qué te dice | Cuándo lo usas |
|---|---|---|
| El anillo (el porcentaje del centro) | qué **proporción** del presupuesto sigue disponible | de un vistazo, sin hacer cuentas |
| El encabezado (`500.444 de 500.610 disponibles`) | la **cifra exacta**, con puntos de miles | cuando necesitas el número real |
| Las tres celdas (Disponible · Reservado · Gastado) | en qué se **reparte** ese presupuesto | para comparar reservado contra disponible |

Cómo interpretarlo sin equivocarte:

- **El porcentaje redondea hacia abajo.** Con 166 créditos gastados vas a leer `99 %`, no `100 %`. Es
  deliberado: un `100 %` conviviendo con gasto visible haría dudar de todo el panel.
- **Los puntos de color de las tres celdas son la leyenda de la barra** de arriba. Si una celda te
  parece de más, no lo es: sin ella un segmento de la barra quedaría sin rótulo.
- **Una cifra abreviada (`1,3 M`) no es una cifra perdida.** El exacto sigue en el encabezado, en el
  tooltip al pasar el mouse y en lo que anuncia un lector de pantalla. Sólo se abrevia sobre el millón.
- **`Reservado` no es gasto.** Son créditos retenidos por corridas en curso; si la corrida no entrega,
  vuelven.

Cuando algo no se puede mostrar, el panel lo dice en vez de poner un cero:

| Lo que ves | Qué significa | ¿Sirve reintentar? |
|---|---|---|
| «No pudimos leer tu saldo. Vuelve a cargar la página en unos segundos.» | falló la lectura, no el permiso | **sí** — recargando la página, no reabriendo el panel |
| «Tu sesión no tiene acceso al saldo de créditos.» | la capability no está habilitada para tu sesión | no — hay que pedir el acceso |
| «Todavía no podemos mostrarte el consumo del mes en esta cuenta.» | la lectura del mes no está publicada | no |
| «necesita más historial de uso» en la proyección | no hay suficiente historia para proyectar | no — aparece sola con el uso |
| `—` en una cifra | no hay dato, y no se inventa un cero | depende del mensaje que lo acompaña |

⚠️ **Reabrir la píldora no reintenta nada.** El saldo se pide una vez al cargar la superficie; para
volver a leerlo hay que recargar la página.

## Leer el bloque de costo del composer

El bloque anclado al pie de la columna izquierda se lee en este orden: **cuánto cuesta › qué hacer › en
qué estado está el estimado**.

| Estado | Qué ves | Qué hacer |
|---|---|---|
| Sin estimado todavía | `—` en gris y «Se calcula antes de gastar» | escribe el prompt; no se cobra por escribir |
| Estimado vigente | la cifra en naranja y «Vigente» en gris | puedes generar |
| Estimado desactualizado | la línea se **atenúa** y dice «Recalculando» | espera el recálculo: la cifra en pantalla ya no es la que se va a ejecutar |
| Bloqueado | el estado en naranja | lee la línea de abajo: dice qué falta (presupuesto, acceso, ruta) |

- **El naranja es señal, no decoración.** Sólo lo llevan una cifra real de gasto y los dos estados que
  reclaman algo. Si ves naranja, hay algo que atender.
- **La línea gris debajo de la cifra es la accionable**: es la que dice qué hacer para desatascarse.
- **Si el contenido se desvanece contra el bloque de costo, no está cortado**: ese degradado significa
  que hay más abajo y que puedes seguir bajando.

## Explorar y continuar

- Abre un candidato para ver modelo/versión, recipe efectiva, costo, lineage, provenance y review.
- `Recrear` reutiliza la recipe gobernada; `Variación` crea hijos explícitos; `Inpaint` exige máscara e intención.
- Favoritos, collections y selección batch son durables. Un toast no sustituye el resultado persistido.
- Usa `J/K` para navegar, `Enter` para abrir, `F` para favorito, `R` para recrear, `G` para ir al prompt y `⌘/Ctrl+K`
  para la paleta. Todos los dialogs restauran el foco al cerrar.

## Revisar y compartir

Comentarios, aprobación y solicitud de cambios se aplican a una versión exacta. Sharing crea una vista read-only,
expirable y revocable; el token no aparece en query strings ni logs. No entregues un asset marcado
`internal-evaluation-only` o `no-client-delivery`.

## Estados que no deben confundirse

- `policy-blocked`: la capability existe, pero no está habilitada para esta superficie/persona.
- Modo deshabilitado: el workspace no tiene autoridad de assets/provenance confirmada; no intentes eludirlo con
  otra ruta o un identificador externo.
- `dependency_unavailable`: una dependencia real no respondió; reintentar puede ser válido.
- `quarantined` / governance pendiente: los bytes existen, pero todavía no son elegibles. **Ver abajo cuánto
  esperar antes de tratarlo como un problema.**
- `candidate_ready`: la generación terminó y el output fue retenido; no implica aprobación humana ni derechos
  irrestrictos.
- `degraded`: una proyección secundaria falló; consulta el detalle antes de operar.

## Cuánto tarda una pieza sana (y cuándo sí preocuparse)

**Una generación sana tarda ~8 minutos de punta a punta.** Medido el 2026-08-04 sobre generaciones reales:
imagen 471,8 s y video 474,0 s. Los tiempos son prácticamente iguales para imagen y para video, así que **no
esperes que una pieza «liviana» salga antes**: lo que manda no es el peso del archivo.

De esos ~8 minutos, el proveedor tarda unos 2; el resto es Asset Governance, que revisa la pieza en cuatro
etapas (inspección → malware → C2PA → derechos) y avanza una por minuto. Hasta que termina, la pieza se ve
«generando» y **eso es normal**.

- **Menos de ~10 minutos:** está trabajando. No reintentes.
- **Más de ~15 minutos:** ahí sí conviene mirar. Sigue el
  [runbook del ciclo de vida de corridas](operar-ciclo-de-vida-corridas-globe.md).

🔴 **Nunca vuelvas a enviar la misma generación porque «se demoró».** El envío ya reservó tus créditos; un
segundo envío a ciegas crea **un segundo cobro**. Primero se lee el estado, después se decide.

> Detalle técnico: el presupuesto y su razón estructural están en
> [ADR-007 § Presupuesto de latencia](../../architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md);
> el incidente que lo midió, en [`ISSUE-137`](../../issues/resolved/ISSUE-137-globe-experiment-running-forever-zero-attempts.md).

Ante un error, conserva el correlation ID y no repitas un command de gasto si la respuesta fue ambigua: consulta
primero el reader del experimento.

## Lo que se ve raro y no es un error

- **Un audio que bajaste antes del 2026-08-04 puede tener la extensión equivocada.** La ficha de la pieza
  anunciaba el formato **adivinado por su tipo de medio**, así que un MP3 se descargaba nombrado `.wav`. **Los
  bytes siempre estuvieron intactos**: el archivo está bien, el nombre no. Renómbralo a `.mp3` o vuelve a
  descargarlo — **no regeneres la pieza**, eso sí cuesta créditos. Desde el arreglo la ficha declara el formato
  real (`ISSUE-139`).

- **Los rótulos del composer son chicos y densos, y así se quedan.** Esos tamaños se midieron y se
  aprobaron para una consola interna que un operador usa el día entero; no es un descuido pendiente de
  agrandar. Lo que sí se corrigió el 2026-07-29 son los textos que se **leen** —ayudas, estados vacíos,
  la propuesta de «Mejorar»—, que estaban a un tamaño pensado para rótulos pegados a un control.
- **Las miniaturas de video y los títulos cortados con «…»** tienen su explicación en el manual del
  feed: [operar el feed y el viewer](./operar-feed-viewer-producer-globe.md).

## Qué no hacer

- **No repitas un command de gasto** cuando la respuesta fue ambigua: puede duplicar el cargo. Consulta
  primero el reader del experimento.
- **No trates un `—` como un cero.** Es ausencia de dato; operar como si fuera saldo cero lleva a la
  acción equivocada.
- **No reabras la píldora de créditos esperando que el saldo se refresque.** Recarga la página.
- **No leas el saldo como presupuesto de tu proyecto.** Es el del espacio completo.
- **No entregues un asset marcado `internal-evaluation-only` o `no-client-delivery`.**
- **No intentes eludir un modo deshabilitado** con otra ruta o un identificador externo.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El saldo aparece como `—` | falló la lectura, o la capability no está habilitada | lee el mensaje del panel: distingue los dos casos y sólo uno se arregla recargando |
| `Generar` no se habilita | no hay cotización vigente | vuelve a calcular el costo; cambiar prompt, forma, seed o negative prompt la invalida |
| La cifra de costo se ve atenuada | el estimado quedó desactualizado | espera el recálculo antes de generar |
| El contenido de la columna parece cortado abajo | es el degradado sobre el bloque de costo | sigue bajando: hay más contenido |
| El viewer no abre una pieza que existe | sesión o serving | ver la sección siguiente |

## Si un asset existe pero el viewer no abre

1. Comprueba si la cabecera todavía muestra una sesión válida. Un `401` de `/v1/session` exige volver a iniciar
   sesión; no significa que el archivo se haya perdido.
2. Tras reautenticar, vuelve a abrir la pieza desde el feed. El cliente renueva descriptor/grant y no reutiliza una
   Blob URL anterior.
3. Si persiste con sesión válida, conserva correlation ID y hora. `403` del reader apunta a sesión/CSRF/autoridad;
   `dependency_unavailable` después del descriptor apunta al serving/integridad.
4. No recargues ni reenvíes el command de generación para “recuperar” una vista previa: eso puede duplicar gasto.

La recuperación automática cubre CSRF rotado mientras la sesión sigue viva y hace un solo retry. El CTA explícito
para una sesión realmente expirada sigue siendo deuda conocida.

## Referencias

- Explicación en simple: [Creative Producer](../../documentation/creative-studio/efeonce-globe-creative-producer.md)
- Feed y viewer: [operar el feed y el viewer](./operar-feed-viewer-producer-globe.md)
- Descarga y acciones sobre una pieza: [operar retrieval de assets](./operar-retrieval-assets-globe.md)
- Ponerle presupuesto al mes: [fondear créditos de Globe](./fondear-creditos-globe.md)
- Valores exactos de la superficie (para quien implementa):
  [`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
