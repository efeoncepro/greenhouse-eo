# Cotizador V3 en la plataforma — modelo de datos del registro

- Estado: **escrito y probado en PostgreSQL 16 local; migraciones creadas y todavía sin aplicar** (`TASK-2025`, fase 2
  de `EPIC-053`, 2026-10-12). Son `migrations/20261012123154614_task-2025-quoter-source-documents-and-pointer.sql`,
  `…155887_task-2025-quoter-quote-aggregate.sql` y `…157583_task-2025-quoter-capabilities.sql`.
- Decisión que lo origina: [promoción de V3 a la plataforma](GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md),
  decisiones 2 (registro nuevo, sin tocar el cotizador actual), 4 (una versión es el artefacto congelado), 5 (ciclo
  de vida) y 7 (quién puede qué).
- Contrato que implementa: [puerto de almacenamiento de Pricing V3](GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md).
- Código: `src/lib/commercial/quoter/`. Esquema: `greenhouse_commercial`, prefijo `quoter_`.
- No toca ni lee `greenhouse_commercial.quotations*`. No expone ninguna ruta: las APIs son de `TASK-2026` y
  `TASK-2027`.

## Qué guarda

Dos cosas distintas, que no se mezclan:

1. **El catálogo por huella.** Catálogo, política de recursos y catálogo de créditos, cada versión una vez, y el
   historial del puntero que dice cuáles rigen. En esta fase el repositorio sigue siendo la autoridad; la base es su
   reflejo.
2. **El registro de cotizaciones.** Una cotización con sus versiones, su estado, su destinataria, su número, los
   textos de su documento y las decisiones sobre excepciones bajo el piso.

| Tabla | Qué es | Se modifica |
| --- | --- | --- |
| `quoter_source_documents` | un documento de catálogo, política o créditos, por rol, versión y huella | nunca |
| `quoter_pointer_history` | cada puntero de versiones vigentes que rigió; rige el último | nunca |
| `quoter_quotes` | la identidad de una cotización: dueña, si es real o sintética, quién la creó | nunca |
| `quoter_quote_versions` | una versión: el artefacto congelado tal cual, con el veredicto del motor | nunca |
| `quoter_quote_version_index` | índices de lectura de una versión (moneda, motor, fuentes) | se reconstruye |
| `quoter_state_matrix` | qué cambios de estado existen | sólo por migración |
| `quoter_state_transitions` | el historial de estados; emitir y responder nombran qué versión y qué documento | nunca |
| `quoter_quote_recipients` | la organización destinataria, como asignación; rige la última | nunca |
| `quoter_quote_number_counters` | el siguiente número de cada serie | sólo avanza de a uno |
| `quoter_quote_numbers` | el número público, asignado en la primera emisión | nunca |
| `quoter_exception_approvals` | aprobar o revocar una excepción bajo el piso, por versión | nunca |
| `quoter_version_documents` | los textos y los datos del documento del cliente; rige el último | nunca |

Vistas: `quoter_current_pointer` (el puntero vigente) y `quoter_quote_current` (por cotización: estado, estado
efectivo, número, destinataria, última versión, lo último emitido con su vigencia, y la aceptación vigente).

## Las reglas, y quién las sostiene

Una regla de este modelo vive en la base, y además en el código que responde con un nombre legible. La base es el
respaldo: quien llegue a una tabla por otro camino recibe el mismo rechazo.

**Nada se reescribe.** `UPDATE`, `DELETE` y `TRUNCATE` fallan en toda tabla de historia, para todo rol incluido el
dueño. El estado, el número, la destinataria y «la versión vigente» no son columnas: se leen del historial.

**Lo que se guarda es el texto que se recibió.** Un documento fuente, un puntero y un artefacto se guardan byte a
byte, sin reserializar. Cada uno lleva dos huellas con trabajos distintos:

| Objeto | Huella del texto (la comprueba la base al insertar) | Huella de identidad (la define el motor) |
| --- | --- | --- |
| Documento fuente | `document_text_digest` | `document_digest`, la que nombra el puntero |
| Puntero | `pointer_text_digest` | `pointer_digest` |
| Artefacto | `artifact_digest` | `replay_digest` |

La razón no es estética. Una cotización calculada con un documento lo lleva dentro, con el orden de claves con que se
lo entregaron. Guardar el documento como JSON canónico daba, en la plataforma, un artefacto con la misma huella de
reproducción y **otros bytes** que el que la CLI calcula desde el archivo: lo midió el caso 8 de la batería de
conformidad. Sin los mismos bytes no hay paridad entre transportes. La huella se comprueba con un disparador y no
con una restricción porque `convert_to(text, name)` es `STABLE` en PostgreSQL 16, y una restricción exige funciones
inmutables. Sólo los datos del documento del cliente se guardan canónicos: ahí las dos huellas son una.

**El orden no depende del reloj.** El historial de estados, las asignaciones de destinataria, los documentos y las
decisiones sobre excepciones llevan un correlativo por cotización, asignado bajo bloqueo. «Lo vigente» es la fila de
mayor correlativo. La hora de cada fila la fija la base; quien inserta no puede declarar otra.

**Cada fila dice quién actuó.** `*_principal_id` es obligatorio. El registro de comandos de la plataforma caduca y se
purga: `command_execution_id` es una referencia que puede dejar de resolver, nunca la única huella.

**Los estados.** `draft`, `issued`, `revising`, `accepted`, `rejected`, `withdrawn`. Trece cambios posibles, sembrados
como dato en `quoter_state_matrix` e iguales a los de `state-machine.ts` (una prueba lo exige). Sólo `withdrawn` es
terminal. Ningún cambio exige una persona: un agente los aplica todos.

- Emitir nombra una versión real con su huella (la última, o la última emitida para volver a lo que el cliente ya
  tenía), el documento que rige para ella, y hasta qué día vale. Exige destinataria y, si la versión está bajo el
  piso, una aprobación vigente.
- Aceptar y rechazar nombran lo último que se emitió: esa versión y ese documento.
- Una cotización que el cliente ya tiene no recibe versiones: primero se abre una revisión.
- La destinataria se cambia sólo en borrador. El documento se escribe en borrador y en revisión.

**«Vencida» no es un estado.** Se deriva de la vigencia de la última emisión, en un solo lugar:
`quoter_quote_current.effective_state` vale `expired` cuando la cotización está emitida o en revisión y esa fecha
pasó. «Hoy» también tiene un solo dueño, la función `quoter_today()`, que es el día en `America/Santiago`. Aceptar una
cotización vencida se permite; que fue fuera de vigencia, y por cuántos días, se lee derivado en la misma vista
(`accepted_after_validity`, `accepted_days_after_validity`). No existe un tope de antigüedad.

**El número lo asigna la base.** En la transacción de la primera emisión, desde un contador por serie: la primera
cotización real es `EO-QTE-15001` y las siguientes son correlativas, sin huecos ni relleno. Una emisión que no
confirma no consume número. Las cotizaciones sintéticas tienen su propia serie (`EO-QTE-T-1`). Nadie elige un número:
el runtime no puede escribir en esas tablas.

**Bajo el piso.** Si una versión calculó y si alguna fila está bajo el piso lo dice el motor, en una sola función
(`replayFrozenArtifact`), sobre el resultado recalculado y no sobre el texto recibido. Ese veredicto se congela con
la versión (`below_floor`). La base no puede ejecutar el motor, así que esa garantía descansa en que hay un solo
escritor por tabla: una prueba estática lo sostiene (`boundary-domain.test.ts`). Aprobar una excepción es el acto de
una persona; se puede revocar mientras la versión no se haya emitido.

**La dueña.** Toda cotización es de Efeonce. La organización se resuelve por su identificador público `EO-ORG-0007` y
tiene que ser la entidad operativa activa; si no, crear una cotización falla sin escribir. Ningún UUID está escrito
en código ni en una migración.

**Aislamiento.** Estas tablas sólo se escriben bajo `READ COMMITTED`. Las reglas leen lo vigente después de tomar el
bloqueo, y bajo otro nivel leerían una foto anterior. Otro nivel se rechaza. Una transacción escribe una sola
cotización.

**Permisos.** El esquema concede por defecto `UPDATE` y `DELETE` al runtime y todo al rol de migraciones en cada tabla
nueva. Las migraciones los quitan y conceden lo justo. Los roles de la instancia son de dos clases (leído de
`pg_roles` y `pg_auth_members` el 2026-10-12): los **grupos** `greenhouse_runtime` y `greenhouse_migrator`, que no
inician sesión, y los **usuarios** que sí: la aplicación entra como `greenhouse_app`, que hereda de
`greenhouse_runtime`, y las herramientas de migración como `greenhouse_migrator_user`, que hereda de
`greenhouse_migrator`. Se concede al grupo y se comprueba el privilegio **efectivo** del usuario que entra
(`has_table_privilege`): lo que cuenta es lo que una conexión real puede hacer.

## Rechazos con nombre

Cada regla que la base hace cumplir tiene nombre: una restricción de tabla, o el `CONSTRAINT = '<nombre>'` de un
`RAISE` en un disparador. `src/lib/commercial/quoter/errors.ts` (`QUOTER_CONSTRAINT_CODES`) es el único lugar que lee
esos nombres y los traduce a un código del registro. Nada interpreta el texto de un mensaje de la base.

## Acceso

Seis capacidades `commercial.quoter.*`, propias: nada del cotizador actual se reutiliza. Una sola puerta,
`src/lib/commercial/quoter/authz.ts`. Dos actos exigen una persona identificada aunque el rol tenga la capacidad:
activar el catálogo y decidir una excepción bajo el piso. Un agente es el sujeto máquina de un binding interno, con
el rol `efeonce_account`: emite, retira y registra lo que respondió el cliente por la misma puerta, sin persona.

## Agregar un estado más adelante

Ninguna tabla enumera estados en una restricción: la matriz es la lista. Sumar «enviada» o «ganada» es agregar filas a
la matriz y reemplazar las funciones y la vista que nombran estados (`CREATE OR REPLACE`), más `state-machine.ts`. No
se altera una tabla con filas.

## Cómo se comprueba

`pnpm quoter:test:local` levanta un PostgreSQL 16 local, aplica las tres migraciones, las baja, las vuelve a subir y
corre las pruebas conectado como `greenhouse_app`, el usuario con que entra la aplicación, con los mismos roles y
membresías que la instancia compartida. Cada prueba clona una base desechable. Nada de eso puede llegar
a la base compartida: el socket y el directorio de datos se comprueban en cada conexión. Una prueba omitida por falta
de clúster no cuenta como verde.

Las reglas se ejercitan dos veces, por el almacén (código) y con SQL directo (SQLSTATE y nombre), con concurrencia
real de dos conexiones. Antes de dar una regla por probada se quitó y se confirmó que la suite se ponía roja.

## Aplicar

Hay **una** base para desarrollo, staging y producción: aplicar una migración es un cambio en producción y exige el
visto bueno del operador en ese momento. Antes: leer que `EO-ORG-0007` es la entidad operativa activa y qué privilegios
tiene `greenhouse_migrator` en el esquema (leído el 2026-10-12: lo es, y es la única; PostgreSQL 16.14, `READ
COMMITTED` por defecto, ninguna tabla `quoter_*` todavía, ninguna migración pendiente de otra sesión). La migración de capacidades va después de que el código que las declara
esté en producción. Con la primera cotización real registrada ninguna de las tres baja: la corrección es una
migración nueva. Paso a paso: [manual del importador](../manual-de-uso/finance/importar-catalogo-v3-a-la-plataforma.md).
