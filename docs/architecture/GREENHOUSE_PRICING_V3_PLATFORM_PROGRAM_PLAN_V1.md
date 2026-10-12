# Cotizador V3 como plataforma — plan del programa

> **Estado:** Aprobado por el CEO el 2026-10-12. Formalizado en la
> [decisión de promoción](GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md) y coordinado por `EPIC-053`
> (tareas `TASK-2023` a `TASK-2030`). Aprobar el plan no ejecuta nada: cada fase se entrega con su tarea y sus puertas.
> **Dueño de la decisión:** CEO. **Preparado por:** agente, con tres auditorías y dos levantamientos de hechos.
> **Base:** [auditoría del cotizador actual](../audits/commercial/2026-10-12-cotizador-actual-auditoria.md), [frontera de promoción de V3](../documentation/finance/cotizador-v3-promocion-canonica.md),
> [contrato operativo de V3](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md),
> [pendientes de V3](../../data/pricing/v3-operating/operational-gaps.json).

## 1. Lo que se decide

Convertir el cotizador V3, que hoy es una CLI local sobre archivos, en el cotizador de la plataforma, en este orden:

1. **API** con su base de datos.
2. **La misma CLI** operando contra esa API.
3. **MCP.**
4. **Interfaz**, al final.

Con una condición que manda sobre todo lo demás: **la CLI no deja de funcionar en ningún momento.** Con ella se cotiza y
se arman licitaciones hoy, y seguirá siendo el instrumento principal de los agentes cuando el programa termine.

La interfaz va al final porque todavía no está decidido si el cotizador se queda en el portal o pasa a Efeonce Rooms.
El plan no depende de esa decisión hasta la última fase.

## 2. Por qué así

La auditoría del cotizador actual (motor V2, tablas `greenhouse_commercial.quotations*`, constructor en el portal) dejó
tres hechos que ordenan este plan:

- **No se usa para cotizar.** De 110 cotizaciones, 80 son copias de HubSpot y Nubox; las 30 de origen manual son
  pruebas o borradores vacíos. Nunca se usó una aprobación, un enlace compartido ni una segunda versión.
- **Lo que calcula y guarda no es confiable**: el número que se guarda no lo produce el motor de precios sino una
  segunda etapa más antigua; pierde los meses al guardar, deja emitir con margen negativo, permite a
  quien cotiza fijar piso y costo, y una versión no congela lo necesario para reproducir un precio.
- **No hay historial real que migrar.** Lo que sí cuelga de esas tablas es otra cosa: las copias de HubSpot y Nubox,
  contratos, ingresos y el vínculo con las propuestas de licitación.

Por eso V3 no se «enchufa debajo» del cotizador actual: entra con su propio registro y su propia API, y el actual se
mantiene intacto hasta que se retire a propósito.

## 3. La idea central: un motor, dos transportes

```text
                    ┌──────────────────────────────────────────┐
                    │  Motor V3 (src/lib/finance/pricing-v3)   │
                    │  calcula, congela, verifica, lee         │
                    └───────────────┬──────────────────────────┘
                                    │  mismo código
              ┌─────────────────────┴─────────────────────┐
        modo local                                   modo plataforma
   CLI → archivos del repo                  CLI / MCP / interfaz → API → base de datos
   (hoy; se conserva siempre)               (lo que este programa construye)
```

- El motor es el único lugar donde se calcula. La API y la CLI importan **el mismo código**; ningún consumidor lleva
  fórmulas. Sigue valiendo «el agente interpreta, el dominio calcula».
- La CLI no se reescribe: gana una capa de transporte. Cada comando puede ejecutarse en local, como hoy, o contra la
  API, con las mismas entradas, las mismas salidas, los mismos códigos de salida y los mismos errores tipados.
- La prueba de que ambos caminos son el mismo es la que V3 ya tiene: una cotización congelada se recalcula y su huella
  (digest) debe ser idéntica. Si la API devuelve una cotización, la CLI local puede verificarla, y al revés.

## 4. Cómo se garantiza que la CLI siga funcionando

| Regla | Qué significa en la práctica |
| --- | --- |
| El modo local no se retira | Ninguna fase borra ni degrada el modo sobre archivos. Queda para trabajar sin conexión, simular y revisar cambios de catálogo antes de aplicarlos. |
| El modo por defecto cambia una sola vez, al final de la fase 5 | Hasta entonces `pnpm pricing:v3` hace exactamente lo de hoy. El modo plataforma se pide de forma explícita. |
| Sin respaldo silencioso | Si la API no responde, el comando en modo plataforma falla con un error claro. Nunca cae a local sin avisar: eso produciría cotizaciones que parecen registradas y no lo están. |
| Las cotizaciones ya congeladas no cambian | Los artefactos versionados en el repo siguen recalculándose idénticos en cada fase. Es una puerta de cada entrega. |
| Lo hecho en local se puede registrar después | La API acepta una cotización congelada hecha en local, la recalcula con las versiones de catálogo que nombra y, si la huella coincide, la registra. Nada de lo cotizado durante la transición se pierde. |
| Paridad medida, no supuesta | Un comando de paridad pasa todos los ejemplos y artefactos del repo por los dos caminos y compara byte a byte. El cambio de modo por defecto exige esa paridad en verde. |

## 5. Decisiones de diseño propuestas

**D1 — Registro y API propios de V3.** Agregado nuevo en `greenhouse_commercial`, con prefijo propio, y familia de rutas
nueva en la API de plataforma. No escribe en `quotations*`. Reemplaza la línea de la frontera de promoción que decía
«promover el motor debajo de los primitives vigentes y no crear otra API de cotizaciones», y enmienda la decisión de
paridad de API de cotizaciones (hoy: MCP y externos sólo simulan). Ambos cambios se formalizan en un ADR (fase 0).

**D2 — El almacenamiento es un puerto.** El motor ya separa el cálculo del acceso a archivos (la CLI concentra toda la
lectura y escritura). Se define un puerto de almacenamiento con dos adaptadores: archivos (lo de hoy) y PostgreSQL. La
API en Vercel no puede leer los JSON del repo en tiempo de ejecución, así que el catálogo vive en la base.

**D3 — Una versión es el artefacto congelado, tal cual.** Se guarda el texto canónico del artefacto con su huella,
verificada al escribir y al leer; no se normaliza en columnas para volver a derivar el resultado. Las columnas que se
agreguen (totales, moneda, estado) son índices de lectura, no la verdad. Sólo se registra una cotización **calculada**;
una bloqueada no es una cotización.

**D4 — Historial que no se puede reescribir.** Versiones, transiciones de estado y auditoría son de sólo agregar, con
guardas en la base (el patrón que ya usan las propuestas de licitación y Efeonce Insights). Corregir es crear una
versión nueva que reemplaza a la anterior. El número público sale de una secuencia, asignado una sola vez.

**D5 — El catálogo cambia de autoridad en dos pasos.**
1. *Espejo:* los documentos de catálogo, política y créditos del repo se importan a la base **por huella**. El repo
   sigue mandando. Local y plataforma calculan con los mismos documentos, así que dan lo mismo.
2. *Autoridad:* más adelante (fase 6) los cambios se hacen por la API —revisar, aplicar y mover el puntero, con las
   mismas huellas de confirmación de hoy— y el repo recibe una copia exportada. Aplicar nunca activa: mover el puntero
   sigue siendo un acto aparte.

**D6 — Lo humano es humano.** Un agente puede cotizar, registrar una versión y preparar el documento. No puede aprobar
una excepción bajo el piso, mover el puntero del catálogo ni emitir: esos actos exigen una persona con la capacidad
correspondiente y quedan registrados con su motivo. Quien cotiza no fija pisos ni costos: salen del catálogo vigente.

**D7 — Dos carriles de la API.** El carril de aplicación para personas y el de ecosistema para agentes sin sesión
interactiva (la CLI de un agente usa un token de consumidor guardado en Secret Manager, como ya hace `pnpm studio`).
Los actos humanos van sólo por el carril de aplicación. La organización sale de la identidad, nunca de un dato que mande
quien llama.

**D8 — El documento.** La API entrega los datos del documento (los de `compose document`), con número y versión cuando
la cotización está emitida. Mientras no haya interfaz, el PDF se sigue generando en local con la plantilla A4, como hoy.
El render en producción (por el trabajador de artefactos, que exige convertir la plantilla en un catálogo del
compositor) se construye junto con la interfaz, no antes.

**D9 — Ubicación del código.** El motor se queda donde está; moverlo no aporta y arriesga la CLI. El agregado con estado
(almacén, comandos, lectores, autorización, eventos) va bajo `src/lib/commercial/`, sin imports de interfaz, listo para
extraerse. Cada tarea declara su contrato de ubicación modular.

**D10 — El cotizador actual no se toca hasta su retiro.** Sigue recibiendo las copias de HubSpot y Nubox. Su retiro es
la última fase y tiene su propia decisión. Aparte, y sin depender del resto, se propone una contención inmediata
(decisión 2 de la sección 9).

### Alternativas descartadas

- **Poner V3 debajo del cotizador actual** (lo que decía la frontera de promoción): heredaría una tabla que mezcla tres
  cosas, versiones que no congelan y tres puertas de escritura sin control.
- **Reescribir la CLI como cliente puro de la API desde el primer día:** deja sin herramienta al CEO y a los agentes
  ante cualquier caída, y elimina la verificación cruzada entre los dos caminos.
- **Mantener el catálogo sólo en archivos y que la API los lea:** la API en Vercel no puede leerlos en tiempo de
  ejecución, y dos personas no pueden cambiar un catálogo con control de concurrencia sobre git.
- **Empezar por la interfaz:** su ubicación no está decidida, y el constructor actual muestra lo que cuesta poner reglas
  de negocio en la pantalla.

## 6. Fases

Cada fase se entrega sola, con su prueba, y deja la CLI funcionando. Las fases 1 a 4 no cambian nada de lo que hoy usa
una persona o un agente.

| # | Fase | Qué entrega | Estado de la CLI | Puerta de salida |
| --- | --- | --- | --- | --- |
| 0 | Encuadre | ADR que formaliza D1–D10; épica y tareas; decisiones de la sección 9 | Igual que hoy | Plan y ADR aceptados por el CEO |
| 1 | Cimientos | Puerto de almacenamiento con adaptador de archivos; motor ejecutable sin acceso a disco; arnés de conformidad | Igual que hoy, byte a byte | Suite de V3 verde; todos los artefactos del repo se recalculan idénticos por el puerto |
| 2 | Base de datos | Tablas del catálogo por huella, puntero con historial, cotización, versiones, transiciones, datos de documento; capacidades y permisos; importador repo → base | Igual que hoy | Catálogo vigente importado; huellas en la base = huellas del repo |
| 3 | API de cálculo | Buscar catálogo, inspeccionar recursos, esqueleto, plan, preparar, simular y todas las lecturas de una cotización. Sin persistir | Igual que hoy | Paridad en staging: cada ejemplo del repo da la misma huella por la API |
| 4 | API de registro | Crear cotización, agregar versión, registrar una hecha en local, guardar textos del documento, ciclo de vida con actos humanos, número | Igual que hoy | Cotizaciones de ejemplo registradas en staging y verificadas recalculando desde la base |
| 5 | CLI sobre la API | Capa de transporte, comando por comando; diagnóstico de conexión; comando de paridad; skill y manual al día. Al cierre, el modo plataforma pasa a ser el modo por defecto | Local por defecto durante la fase; plataforma al cierre; local disponible siempre | Un agente nuevo, sólo con la skill, cotiza y registra un negocio real de punta a punta por la API |
| 6 | Catálogo en la plataforma | Revisar, aplicar y mover el puntero por la API; exportación al repo | Mantenimiento de catálogo también por la API | Un cambio real de precio hecho por la API, con su copia en el repo |
| 7 | MCP | Herramientas de lectura, simulación y registro; las de aprobar y emitir no se exponen | Sin cambios | Canario del gateway en verde; herramientas actuales de V2 siguen respondiendo |
| 8 | Interfaz y documento en producción | Decisión portal o Rooms; pantallas de lista, detalle, aprobación y emisión; enlace público; render del PDF en producción | Sin cambios | Se define al abrir la fase |
| 9 | Retiro del cotizador actual | Cierre de sus puertas de escritura; herramientas de Nexa y MCP apuntando a V3; vínculo de propuestas de licitación; salida a HubSpot | Sin cambios | Decisión propia, con su plan de reversa |

Orden pedido por el CEO: API (fases 1–4), CLI (5), MCP (7), interfaz (8). La fase 6 es parte de la API y se hace con
la CLI ya conectada, porque el mantenimiento del catálogo se opera con ella.

### Qué puede hacerse en paralelo

- Fase 2 y fase 1 se solapan: las tablas no dependen del puerto.
- La contención del cotizador actual (sección 9, decisión 2) es independiente de todo.
- Fase 6 y fase 7 pueden ir a la vez una vez cerrada la 5.

## 7. Lo que cualquier fase debe respetar

Estas reglas ya existen en los documentos de V3 o en la plataforma. El programa las hereda; no las renegocia.

- **Nunca** un cálculo fuera del motor, ni en la API, ni en la CLI, ni en una herramienta, ni en una pantalla.
- **Nunca** recalcular, «actualizar» o cambiar de versión una cotización guardada en segundo plano. Una cotización se
  reproduce con las versiones que nombra, jamás con «la vigente».
- **Nunca** registrar como cotización un cálculo bloqueado, los avisos de la corrida ni una lectura derivada.
- **Nunca** borrar ni editar una versión, una transición o una fila de auditoría.
- **Nunca** aceptar de quien llama el piso, el costo, la organización o el estado.
- **Nunca** fecha de inicio ni duración de contrato en el cotizador: una cotización no es un contrato.
- **Nunca** la nómina como base de costo: el costo de personas es el nivel objetivo del catálogo.
- **Nunca** una segunda proyección para el cliente: lo que ve el cliente sale del único filtro que ya existe.
- **Siempre** entrada con su versión de contrato declarada; el registro de motores sigue cerrado.
- **Siempre** escritura con clave de idempotencia, huella del pedido, auditoría y evento, en una transacción.
- **Siempre** una base compartida por desarrollo, staging y producción: las migraciones sólo agregan antes de un
  despliegue, y una migración aplicada en local ya es un cambio en producción.
- **Siempre** bandera nueva registrada en el libro de banderas, y encendida en cada entorno donde se lee.

## 8. Riesgos

| Riesgo | Qué lo contiene |
| --- | --- |
| La API calcula distinto que la CLI | Mismo código; comparación de huellas como puerta de las fases 3, 4 y 5; comando de paridad permanente |
| La CLI queda inutilizable en la transición | Modo local intacto y por defecto hasta el cierre de la fase 5; sin respaldo silencioso; cada entrega recalcula los artefactos del repo |
| Dos catálogos que divergen | Paso de espejo por huella con el repo como autoridad; después una sola autoridad, con exportación |
| Guardar el artefacto en la base altera su huella | Se guarda el texto canónico y se verifica la huella al escribir y al leer; prueba específica en la fase 2 |
| Un agente aprueba o emite | Actos humanos sólo por el carril de aplicación y con persona identificada; una sesión de agente no cuenta como aprobación |
| El programa choca con trabajo en curso sobre el cotizador actual | Barrido de tareas en la fase 0; las que suponen el motor V2 se reencuadran o se cierran como superadas |
| El vínculo de las propuestas de licitación exige una cotización del cotizador actual | Se mantiene hasta la fase 9; mientras tanto las licitaciones siguen cotizándose con la CLI y la plantilla A4, como hoy |
| El render del PDF en producción resulta caro | Se aísla en la fase 8 con una prueba de concepto antes de comprometerlo; hasta entonces el PDF se genera en local |

Evaluación contra los cuatro pilares:

- **Seguridad:** autorización derivada de la identidad, actos humanos separados, costos fuera de toda salida al cliente
  por un único filtro, sin datos de nómina.
- **Robustez:** versiones inmutables verificadas por huella, idempotencia en cada escritura, guardas en la base además
  de las del código.
- **Resiliencia:** el modo local es el plan de contingencia permanente; cada fase se puede detener sin dejar a medias
  lo que ya se usa; banderas por fase.
- **Escalabilidad:** el motor es puro y no guarda estado; el catálogo se versiona por huella; las lecturas son
  funciones de una versión guardada.

## 9. Decisiones que necesito de ti

> **Resueltas el 2026-10-12.** 1: plan aprobado. 2: se cierran las puertas de escritura del cotizador actual
> (`TASK-2023`). 3: excepción bajo el piso, sólo administración; puntero del catálogo, administración y finanzas.
> 4 y 5 siguen abiertas y no bloquean. El texto de abajo queda como se presentó.

1. **Aprobar este plan** y que se escriba el ADR que lo formaliza. Sin eso no empieza la fase 1.
2. **Contención del cotizador actual, ahora.** Nadie lo usa, pero sigue abierto: publica borradores en HubSpot como
   cotizaciones publicadas y permite marcar una cotización como emitida sin aprobación. Propongo cerrar sus puertas de
   escritura (queda de sólo lectura; las copias de HubSpot y Nubox siguen entrando). ¿Lo cierro o lo dejo como está?
3. **Quién puede aprobar una excepción bajo el piso y quién puede mover el puntero del catálogo.** Propongo: excepción,
   sólo administración (tú); puntero, administración y finanzas.
4. **Portal o Rooms.** No bloquea nada hasta la fase 8. Un dato para cuando decidas: los documentos de Rooms dicen hoy
   que Rooms no calcula ni genera precios. Si el cotizador se muestra en Rooms, Rooms consume esta API; el cálculo no
   se muda.
5. **Las tres pendientes de negocio que ya conoces** (prorrateo del fee de plataforma, costo de puesta en marcha de un
   servicio gestionado, excepción del diseñador por dedicación) no bloquean el programa: entran por el catálogo cuando
   las decidas.

## 10. Qué queda fuera

- Firmas electrónicas, cobro, facturación y cierre de negocio: se conectan después, por eventos, sobre una cotización
  emitida.
- Migrar las cotizaciones del cotizador actual: no hay ninguna real que migrar.
- Cambiar cómo calcula V3. El motor, sus contratos y sus cifras no se tocan en este programa.

## 11. Siguiente paso

Hecho el 2026-10-12: ADR aceptado, épica `EPIC-053` y tareas `TASK-2023` a `TASK-2030` escritas. Sigue la ejecución,
que empieza por `TASK-2024` (cimientos, sin cambio visible) y `TASK-2023` (contención del cotizador actual), que son
independientes entre sí. La interfaz y el retiro del cotizador actual son unidades de la épica todavía sin tarea.
