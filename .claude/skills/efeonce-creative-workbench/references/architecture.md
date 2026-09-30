# Arquitectura y mapa de fuentes

## Estado vigente: transporte y revocación probados en candidata

Head `2629ab4ea8ac5a5ed6aa3bf04d3db1fef2e04aef`, PR 7 draft/cinco checks SUCCESS. Nuevo
transporte implementado/probado: JWT aplicativo íntegro en `X-Workbench-Identity`, IAM en
`X-Serverless-Authorization`, sin fallback aplicativo Authorization. Revocación App tras usos:
cuatro GET scope de repo1395425041 con members/metadata read y cuatro DELETE204 medidos.
Primer mint real acreditado; identidad del operador200 en canary9/9, validate SKY200/provider0
y execute IA OFF400. Dependencia pública google-auth-library10.9.1 fijada en producción.

Build/image/policies y revisión00010-cof READY/0% están en [continuidad](state-continuity.md).
No merge/promoción: main96eab1e y00008-tv6 al100%. Legacy Authorization rechazado con perfil
malformed no explica qué ocurrió a sus bytes; no afirmar eliminación exacta de firma.

Audiencia gcloud compartida sigue riesgo MEDIO no aceptado; OAuth/OIDC propio propuesto antes
de otros tres integrantes o gasto. Binding/IAM de los otros tres pendientes, un operador probado.
Matriz real de otro SUB/token vencido firmado/binding revocado/team withdrawal y nuevo recovery
no certificados. Sin paid calls. Documento propuesto Workbench:
`docs/architecture/workbench-team-identity-admission.md`, fuente de IDs/correos históricos y
admisión individual, no grants. Presupuesto v2 draft, cotizaciones0 e IA OFF permanecen.

## Histórico: Estado posterior: candidato construido, transporte en corrección

El código del head `344c8bafea9ecb1e618330e1e7fc8e6a2e334876` está publicado en PR 7 draft con
CI/Vercel SUCCESS y una imagen candidata construida. Revisión 00009-cep READY/0% tráfico, tag
bound-identity; 00008-tv6 mantiene 100%. Identity400 se rechaza antes de Google/mint: la imagen
no acredita binding aplicado ni token/scopes. [Estado y pins](state-continuity.md).

El transporte de ambos headers descrito abajo corresponde al candidato anterior: un agente
prepara `X-Workbench-Identity` con JWT aplicativo íntegro y `X-Serverless-Authorization` para
IAM, sin fallback aplicativo a Authorization. Otro prepara revocación al terminar usos de tokens
App. No se declaran implementados/admitidos por esta documentación. Audiencia gcloud compartida:
riesgo MEDIO no aceptado específicamente; requiere OIDC propio antes de los otros tres integrantes.
Presupuesto v2 draft, cotizaciones0, IA OFF y ninguna generación pagada nueva.


## Separación de espacios

| Espacio | Responsabilidad | Frontera |
| --- | --- | --- |
| `greenhouse-eo` | Gobierno, documentación y esta skill | Sus CLIs no se modifican ni ejecutan para producir en Workbench |
| `creative-workbench` | Harness nativo, onboarding de clientes, adapters, componentes y piezas | Source activo de esta operación |
| `axis-design-system` / `axis.efeonce.org` | Sistema de diseño e identidad Efeonce | Inspiración de distribución; no identidad de clientes |
| `efeonce-globe` | Producto Creative Studio | No despertar ni usar como fallback de este harness |
| `efeonce-marketing-studio` | Marketing Studio | No confundirlo con Workbench ni con Globe |
| `sky-brand-system` | Borrador local de origen | El sistema activo SKY está dentro de Workbench |

La raíz Workbench instala un runtime público neutral. No requiere paquetes AXIS para SKY.
Engines heredados copiados conservan procedencia histórica; adapters propios los consumen sin
ejecutar el checkout Greenhouse. `.workbench/native-ownership.json` identifica superficies
nativas; `.workbench/sync.lock.json` conserva el sello histórico, no se regenera para esconder drift.

## Fuentes a abrir dentro del checkout Workbench

| Decisión o capacidad | Fuente |
| --- | --- |
| Contrato común y alcance del agente | `AGENTS.md`, `CLAUDE.md` |
| Nativo frente a sync heredado | `docs/architecture/workbench-native-harness.md` |
| Cliente → marca → pack | `clients/brands.json`, `tools/brand-context.mjs` |
| Recursos y operaciones admitidos | `clients/<cliente>/pack.json`, `production-policy.json` |
| Autoridad productiva | `tools/production-authority.mjs` y entrada de la operación |
| Broker y fronteras cloud | `docs/architecture/workbench-production-broker.md`, `workbench-cloud-boundary.md` |
| Prompt compilado y auditoría opcional del proveedor | `tools/brand-production.mjs`, `services/production-broker/openai-image.mjs`, `docs/architecture/workbench-openai-usage.md` |
| Lector de App preparado y binding pendiente | `services/production-broker/github-app-authority.mjs`, `github-app-authority-policy.json`, `github-app-manifest.json`, `docs/architecture/workbench-broker-identity.md` |
| Emisión App y Google firmado | `services/production-broker/github-app-token.mjs`, `google-bound-identity.mjs`, sus policies y `docs/architecture/workbench-github-app-minting.md`, `workbench-google-bound-identity.md` |
| Integración/compatibilidad de rollout | `tools/production-authority.mjs`, `services/production-broker/server.mjs`, `docs/architecture/workbench-broker-transport.md`, `workbench-bound-identity-rollout.md` |
| Orden semántico SKY y revisión candidata | `tools/sky-zone-contract.mjs`, `tools/sky-semantic-revision.mjs`, `docs/architecture/workbench-sky-semantic-revision.md` |
| Consumidor del broker | `tools/broker-client.mjs`, `tools/marca-producir.mjs` |
| Composición propia | `tools/marca-disenar.mjs`, `tools/brand-design.mjs` |
| Catálogo/zonas | `tools/kv-zones.mjs`, `docs/architecture/workbench-kv-zones.md` |
| Componentes SKY | `brands/sky-airline/components/index.mjs`, `native-graph.mjs`, `assemble.mjs` |
| Lectura Figma nativa | `tools/sky-import-fig.mjs` y sus dependencias, inventario SKY |
| Revisión de recursos | `docs/architecture/workbench-resource-revisions.md` |
| Estado observado y evidencia | `docs/operations/HARNESS_STATUS.md`, `docs/audits/`, evaluaciones de proyectos |

## Lab de referencia y presentación

El visor se llama Lab. La unidad de 2026-09-30 migra `apps/brand-reference` a Astro 7.3.5, TypeScript
nativo 7.0.2 para módulos y Tailwind CSS 4.3.3 compilado por Vite; `astro check` conserva la API compatible
TS6 separada. Compila HTML estático con componentes y módulos nativos de interacción, sin trasladar
la autoridad productiva al navegador. Leer [Lab](lab.md) para stack, operación y checks; los dueños
WorkBench son `docs/architecture/workbench-lab-astro.md` y `docs/manual/workbench-lab.md`.

`reference:build` sigue admitiendo una sola marca/corrida antes de preparar el payload/assets propios
e invocar Astro; el output compilado se sella por digest y no sobrescribe snapshots. El header Efeonce
más cliente y footer Efeonce son identidad de autor del Lab, con manifest host separado. El logo host
nunca entra en pack, inputs u outputs de producción SKY. Los originales y su QA siguen en las corridas;
thumbnails no los reemplazan, muestras Metric no distribuyen fuentes binarias. Un plan/build/captura
no demuestra deployment, protección, aprobación comercial o cierre del harness; consultar evidencia.

## Resolución y garantía de marca

El catálogo gestionado vincula un cliente con una identidad canónica, versión exacta y SHA del
pack. El pack admite IDs con categoría, identidad, versión, procedencia y digest de bytes.
El contexto vuelve a verificarse antes de producir; editar pieza/pack después de validar no
autoriza la ejecución preparada. No basta una carpeta llamada SKY ni un archivo parecido.

Separar tres capas: **mecanismo neutral**, **datos/recetas propios de marca**, **contenido de pieza**.
El motor puede compartirse. Valores, assets, componentes, maestros y anclas no se heredan entre
marcas. Una foto de un UUID de otra persona/marca o un resource ID no admitido se rechaza.
Co-branding requiere una relación y recursos explícitamente admitidos; no una excepción general.

La frontera protege contra errores en las entradas gobernadas. Hooks y permisos locales no
son un sandbox frente a un dueño de máquina con credenciales directas. La IA puede desviarse
visualmente aun con referencias correctas: la revisión de píxeles sigue siendo necesaria.

## Autoridad y concurrencia

Todo el equipo GitHub `efeoncepro/creative-workbench` puede producir para todas las marcas.
Las entradas verifican usuario, membership activo y acceso al repo por llamada; la persona
del brief, nombre de Git o `responsable` sólo atribuye trabajo. Los jobs actuales no eligen
productor ni proveedor mediante campos adicionales.

La identidad Google invoker del broker y la identidad GitHub se verifican en planos separados.
Acceso Write de Packages no acredita broker, Vercel ni sesión instalada de un compañero.
Nunca inferir email Google desde un login GitHub ni compartir credenciales.

Cada ejecución usa `projects/<cliente>/<pieza>/runs/<uuid>/`. Inputs, temporales y outputs
pertenecen a esa corrida. No compartir una carpeta mutable entre personas ni sobrescribir un
run para cambiar copy, marca o versión. Una corrección del adapter produce una corrida nueva.

## Contratos y entradas

| Entrada | Resultado y autoridad |
| --- | --- |
| `marca:preflight` | Contexto local; incluso `--run` no concede autoridad productiva |
| `marca:adaptaciones`, `marca:zonas` | Lectura local de referencia; plan/borrador sin generación |
| `marca:instalar`, `marca:doctor` | Instalar/verificar canon propio; no generar |
| `marca:producir` | IA por broker privado, intención durable y autoridad viva |
| `marca:componer` | Reproduce referencia histórica, no nueva campaña |
| `marca:disenar` | Composición con copy completo y foto declarada, autoridad viva |
| `reference:build` | Catálogo web de una marca/run; build no acredita deploy |

Schemas vigentes se inspeccionan en código/manual. IA usa `workbench.image-job.v1`;
histórico usa `workbench.reference-job.v1`; diseño usa `workbench.design-job.v1` aunque su
operación sea también `reference.compose`. No intercambiar sus campos.

Scripts crudos `ai:*`, `foto:*` y `assets:pull` están retirados. La presencia del código heredado
no permite ejecutarlo con otra tool. `pieza:subir/bajar` son utilidades antiguas y no certifican
locks/autoridad de corridas nativas.

## Corrida verificable

Una corrida nativa conserva `inputs/`, `brand.lock.json`, `execution.lock.json`, `outputs/`
y `outcome.json`. El lock de marca fija contexto y dependencias; el execution lock fija adapter,
persona/autoridad, supplemental inputs y foto cuando corresponda. El outcome sella outputs y
execution lock por SHA, estado y número de llamadas. No lo reescribir para añadir aprobación.

El QA registra fuentes, geometría efectiva, recetas, grafo de componentes, medidas, crop y
contraste. La revisión humana/píxel es otro registro ligado al run/PNG SHA. Descargar/archivar
exige verificar bytes y locks, no sólo éxito HTTP o existencia de un ZIP.

## Entrada compilada y auditoría opcional del proveedor

`compileBrandImagePrompt` en `tools/brand-production.mjs` es el único ensamblador del prompt
completo: marca/version, skill y recursos sellados y tarea admitida. La tarea conserva su límite
propio, pero el cuerpo efectivo no puede superar **32.000 unidades UTF-16** (`String.length`).
El broker valida este mismo flujo antes de `budget.reserve` y `store.reserve`; un exceso rechaza
sin llamar al proveedor ni consumir una reserva UUID. El adaptador recibe exactamente el texto
compilado, sin reconstruirlo. El recheck del adapter ocurre antes de secreto/fetch.

`outcome.promptAudit` fija caracteres, bytes UTF-8 y SHA-256 sobre ese cuerpo, sin duplicarlo.
`input.recordProviderAudit` es un callback del servidor, nunca un campo del job: recibe metadata
cerrada y saneada de OpenAI, conserva request ID acotado y usage sólo cuando fue reportado y sus
counters son válidos. Datos ausentes/inconsistentes quedan **null**, no consumo cero. Cero sólo
se conserva si fue explícitamente reportado. El callback se cierra al concluir la ejecución.
`outcome.providerAudit` entra en el ZIP cuyo SHA sella el recibo, sin ampliar acceso de recovery.
Usage es consumo posterior; no admite una cotización, presupuesto o costo máximo por sí solo.

## Candidata de identidad: código integrado, admisión parcial sin runtime

La rama preparada sobre main 96eab1e ya implementa minter App, consumer Secret Manager,
lector Google, puente de autoridad y wiring server/HTTP/kernel/history/bundle/CLI. No tiene PR,
admisión ni deployment por este avance. La App ya fue registrada/instalada por el operador,
con API de instalación verificada: IDs y estado efectivo en [state-continuity.md](state-continuity.md).
Pins App admitidos por el owner; vínculo del operador aprobado/preparado en policy privada
0600 hasta 2026-12-29, sin subjects/claims copiados aquí. No prueba minting o runtime ni
extiende ese vínculo a otras personas.
El estado exacto se conserva en [state-continuity.md](state-continuity.md); el canon técnico
completo está en los documentos Workbench de minting, Google, transporte y rollout de la tabla.

App candidata: sólo members read de organización y metadata read del único repo privado
Creative Workbench. Los pins App/instalación de la policy candidata ya fueron admitidos por
owner; una policy draft continúa denegando antes de secreto/red como contrato general.
Minter RSA pide un repo y verifica GET del alcance emitido, sin confiar en decode de token opaco.
Repositories/selection opcionales en 201 no omiten ese GET; permissions ausente o ampliado
**deniega**, una limitación de admisión actual. Consumer propio en server tiene timeout 15.000 ms
más cierre de cliente. Operador reportó secreto propio con una versión y SA exacta;
lectura efectiva del primer token, consumer/runtime y revocación siguen pendientes de readback.
Impersonación de la SA carece del grant requerido; no se amplió IAM para sortearlo.

Google usa ticket firmado, audiencia exacta e issuer/sub aprobado; email humano verificado,
cuentas gserviceaccount rechazadas y email nunca usado como binding. Proof emitida guarda
startedAt/issuedAt/lastObservedAt privados y el reloj propio. Assert no acepta now externo;
rechaza retroceso incluso entre asserts válidos y elimina la proof al denegar, sin revival
por revertir policy/reloj. El puente reassert Google antes/después de GitHub vivo y emite
una autoridad no fabricable para root, marca y operación exactos.

El workspace sólo conserva inputs: cada proof workspace verifica primero canon vivo con
mismo ID/login y policy SHA que initialAuthority, reassert canon tras el await y reresuelve
marca/version, pack y recursos. Snapshot intacto nunca sustituye una admisión retirada.
Rechecks antes de presupuesto y tras ticket antes de UUID. El kernel no consume el ticket
antes del adapter: OpenAI llama exactamente una vez al callback server-owned tras secreto/body.
Dentro: assertBeforeProvider durable → await reauth viva → assertAtProvider síncrono sobre
objeto exacto verificado, dueño/hash, período y quote vigente. Ausencia, denegación o repetición
del callback rechazan la salida, incluso si el adapter atrapa el error. [budget.md](budget.md).
Después de durable complete se reautentica antes de delivery.
Revocación tras pago conserva receipt/ZIP/UUID y niega delivery; recovery exige dueño y autoridad
actuales, no otro pago ni destrucción de historia.

CLI obtiene sólo Google ID token en memoria, POST identity `{}` al origen fijo y mismo JWT
firmado en Authorization/X-Serverless-Authorization. Recibe identidad vinculada cerrada, sin
claims del job; no extrae gh auth token ni transporta bearer GitHub. Doctor e instalador usan
gh api local como atribución y comparan ID/login antes/después. Backend legacy sin endpoint
compatible falla cerrado. No fusionar/distribuir esta CLI antes del endpoint admitido y readback
positivo/negativo con IA OFF; preparar PR draft y rollback bound-compatible, sin broad-token fallback.

## Revisión SKY 2.1.1: orden compartido, sin activación

`tools/sky-zone-contract.mjs` conserva exactamente las 19 definiciones históricas y añade
travel-window al final; importador y preparador usan el mismo contrato. En 17 grupos mixtos,
origin→travel ocupa el primer encuentro histórico; tres ventanas sin origin conservan su lugar.
No ordena el dibujo, los miembros o los fields ni cambia geometría/copy. Catálogo candidato
**2.1.1**, revisión **sky-airline.travel-window.v2**; la solicitud v1 se rechaza para no devolver
bytes nuevos bajo identidad antigua. Pack operativo 0.1.0 y catálogo activo 2.0.0 permanecen.

Propuesta, preparación con maintainer, admisión, bundle, deployment y snapshot son pasos
distintos. Deben admitir coherentemente 20 zonas/22 familias, conservar predecessor y recovery
histórico, y verificar los 193 recursos/126 templates. No activar con el mecanismo de fonts,
rehash ni fallback. Las pruebas públicas/privadas no constituyen activación ni aprobación visual.
