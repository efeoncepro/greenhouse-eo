# Instalación, distribución y runtime

## Corte vigente de distribución y revisión candidata

Los 50 documentos propios de Greenhouse están en commit
`ccabbbf1e9e24e4760700bbad2bea052f4a31756`, sin push. Workbench PR 7 permanece draft, head
344c8bafea9ecb1e618330e1e7fc8e6a2e334876 con CI/Vercel SUCCESS; sin merge/promoción.
Cloud Build SUCCESS y revisión 00009-cep READY con tag bound-identity no equivalen a rollout:
0% tráfico, mientras 00008-tv6 conserva 100%. Identity real400 en filtro previo a Google/mint;
primer token/scopes NO probados. [Evidencia y pins](state-continuity.md).

Transporte de JWT íntegro en X-Workbench-Identity + IAM en X-Serverless-Authorization, sin
Authorization fallback, y revocación de tokens App después de usos están en trabajo de agentes.
OIDC propio previo a onboarding del resto del equipo: riesgo MEDIO de audiencia compartida
no aceptado específicamente. API de equipo no constituye binding ni IAM individual; los otros
tres integrantes siguen sin verificar ambos. Presupuesto v2 draft 50/500 USD, quotes0, IA OFF;
no nuevos gastos ni canaries pagados. Conservar criterios de merge/backend/rollout y recuperación.
Los cortes anteriores de esta referencia son historia y no sustituyen el estado vigente.


## Candidata de transporte y rollout: no confundir con el baseline

Main verificado sigue 96eab1e y los merges 3/4/5/6 están cerrados. La unidad siguiente prepara
identidad vinculada en código, sin PR/deploy aún: pins App admitidos por owner y vínculo del
operador aprobado/preparado en privado, sin admisión del runtime. Minter,
Secret Manager consumer, puente/handlers/kernel y CLI ya existen en esa rama; no tratarlos como
faltantes de código ni como runtime habilitado. [architecture.md](architecture.md) resume el
contrato; Workbench `docs/architecture/workbench-bound-identity-rollout.md` gobierna la admisión.

Orden: PR draft revisable → owner revisa única instalación mínima y demuestra ambas cuentas de
cada persona → policies/audiencias/bindings aprobados + secreto/IAM exactos → backend candidato
revisado con IA OFF → endpoint identity real y positivos/negativos/recovery → decisión de merge
CLI por su carril autorizado. No fusionar una CLI incompatible para luego reparar el servidor.
No desplegar o conceder permisos por leer esta referencia; conservar source/image/policy/readback.

La CLI candidata usa Google firmado en ambos headers, respuesta identity cerrada y atribución
local gh api matching; ningún token general de gh sale al broker. El endpoint exige binding y
GitHub vivo, no user claims. Minter 201 sin permissions deniega aunque repos/selection sean
opcionales; no inferir permisos del request. Secret consumer existe con deadline 15.000/cierre,
el operador reportó secreto propio con una versión y SA exacta; token/scopes y consumer/runtime
siguen sin readback efectivo. Rollback sólo bound-compatible con IA OFF;
si no existe baseline compatible, bloquear la operación sin restaurar bearer amplio.

El guard de pago se invoca una sola vez por el adapter real, después de secreto/body. Tras
ledger durable y await de auth, el ticket exacto tiene una comprobación final síncrona; no
consume el ticket antes del adapter ni añade pagos en recovery. [budget.md](budget.md).
App registrada/instalada por el operador y API GitHub de instalación verificada; IDs/alcance
en [state-continuity.md](state-continuity.md). Primer token pendiente por grant de impersonación
SA ausente, sin ampliar IAM. Binding del operador aprobado y preparado en canon privado; faltan
consumer/runtime, positivos/negativos, los vínculos de otras personas y rollout.
La creación de la App no amplía por sí sola la autoridad de ninguna persona.

## Arranque de una persona

Leer Workbench `docs/manual/team-onboarding.md`, `brand-production.md` y la política. Obtener el
repo privado/ref revisado con sesión propia. `pnpm instalar` usa runtime público con lockfile;
no instala identidad AXIS como dependencia raíz. Requisitos actuales: Node >=22 y pnpm fijado
por packageManager. El import FIG nativo puede requerir capacidades Zstd del Node usado: comprobar
runtime real antes de culpar al archivo.

GitHub, Google invoker y Packages son comprobaciones separadas. No compartir tokens ni ADC.
Instalación de canon admitido:

```sh
pnpm marca:instalar sky 0.1.0 reference.compose --broker
pnpm marca:doctor sky reference.compose
pnpm marca:doctor sky ai.image
pnpm provider:doctor sky
```

Revisar versión actual antes de usar el ejemplo. Broker bundle exige invoker, no lectura del bucket
ni Secret Accessor. El instalador verifica autoridad, cliente/marca/version/pack SHA, ZIP/manifiesto,
IDs/bytes; instala sólo el cache privado del cliente y rechaza cache discrepante sin sobrescribirlo.
La instalación local con bundle absoluto previamente entregado existe para maintainer/equipo;
no convertirla en admisión de recursos arbitrarios.

`pnpm doctor` colisiona con el comando interno de pnpm. Usar `marca:doctor`; si se necesita el alias,
`pnpm run doctor`. Doctor IA no requiere font binaria local, pero no prueba autenticación OpenAI
ni habilita generación. Composición sí requiere Metric y recursos exactos instalados.

## GitHub Packages

Tres paquetes SKY candidatos privados 0.1.0, ligados al repo:
`@efeoncepro/sky-tokens`, `@efeoncepro/sky-brand-assets`, `@efeoncepro/sky-creative-contracts`.
Fijar versión exacta; un tag candidate/latest o rango no es identidad de una pieza. Los paquetes
incluyen tokens/assets/contratos y renderer de referencia; no Metric, fotos ni el bundle privado.
El código modular nuevo no se publica por haber sido pusheado al repo.

La versión numérica de pack 0.1.0 tuvo distintos SHA durante el onboarding; identidad completa
incluye el digest. Paquetes npm y bundle/catálogo no son el mismo artefacto ni tienen promoción
automática sincronizada. Un bundle viejo no instala un pack actualizado.

Verificación de instalación por maintainer:
`node tools/sky-package-candidate.mjs --verify-install`, en rama `codex/` limpia y enviada según
su contrato. Usa directorio/config npm temporal y credencial efímera; compara todos los archivos
contra build por SHA. No modificar `.npmrc` global. Probar la sesión del operador no prueba la del
resto del equipo. Para publicar se requiere alcance autorizado, preflight y readback de cada versión;
ante publicación parcial inventariar remoto antes de reintentar.

## Broker y costos

Proyecto dedicado `efeonce-creative-workbench`, Cloud Run `workbench-production-broker`, región
`us-east4`, bucket privado `efeonce-creative-work`. Especificar proyecto en mantenimiento GCP;
no cambiar el default local ni usar proyectos de Greenhouse/Globe. SA propia y permisos acotados.
Nombre de secreto dedicado: `workbench-openai-api-key`; su valor sólo entra al adapter servidor.
No recuperarlo, imprimirlo o pegarlo en esta skill/CLI del agente.

El transporte anterior del baseline usa origen fijo y dos autenticaciones separadas; no
constituye un binding de persona. La candidata anterior a su admisión lo reemplaza por Google
firmado en ambos headers y App mínima server-owned, sin fallback GitHub. El servidor candidato
valida binding/GitHub vivo/canon; no deja elegir endpoint, productor o cuenta en job/env de pieza. `GET /v1/status` acredita proceso y declara readiness limitada; no prueba llave.
`WORKBENCH_GENERATION_ENABLED` sólo se activa por valor exacto `true`, en carril maintainer.
No activarlo ni cambiar canary gates para satisfacer un pedido de diseño.

GCS reserva identidad GitHub/cliente/marca/UUID antes del pago, body sellado y escritura generation=0.
Un replay con autoridad viva devuelve receipt previo, no otra imagen. Reserva sin receipt retorna
`pending-or-uncertain`: no vence por tiempo, no se borra ni se reemplaza por un UUID nuevo.
Fallo terminal tampoco da retry automático. Reconciliar llamada/archivo desde maintainer.

Endpoints de receipt/archive reciben solicitud original, no rutas de objetos. Misma persona/marca,
misma intención/body sellado; sólo lecturas autorizadas. Archivo durable incluye snapshot/locks/
outputs/outcome. Revalidar todos los hashes al descargar. Acceso productivo a todas las marcas no
concede lectura del archivo personal de otro productor por esta entrada.

El bundle actual supera 32 MiB; la ruta de distribución usa streaming con límites y sin Content-Length.
No “arreglarlo” exponiendo bucket público. Cache/bundle no distribuye credenciales. Retención y
readiness general se verifican aparte; no presentar canary de una persona como onboarding global.

## Fuentes y revisiones privadas

Consultar `workbench-resource-revisions.md`. `sky:font-revision` prepara metadata candidata;
`sky:font-activate` activa localmente por maintainer. Preparar no activa, activar no despliega
bundle/broker ni publica npm. No readmitir un pack existente con `admit-local.mjs` para hacer pasar
un job. Cambios de recursos requieren original sellado, revisión y transición explícita.

Metric tiene cinco caras admitidas en el corte: Regular, Semibold, Bold, Black y Medium.
Nombre PostScript y peso efectivo vienen de bytes/manifiesto; no confiar en nombre de ZIP.
Fonts licenciadas, originales FIG/ZIP/anclas/fotos y entregables binarios quedan fuera de Git.

## Vercel: visor de marca

`reference:build` construye snapshot aislado de un brandId/run con inputs sellados, no un servidor
productivo ni un release. Revisar si muestra originales históricos o composición modular efectiva.
Las 126 referencias históricas conservan los bugs de la fuente cuando existen; el Lab separa
las seis corridas modulares corregidas. Nunca vender la galería histórica como corrección completa.

El renderer vigente es Astro SSG: [lab.md](lab.md). `reference:build` prepara recursos propios,
valida datos/pines, compila en staging aislado y sella el snapshot por digest. 132 WebP derivados
aceleran la exploración; PNG/SVG originales permanecen íntegros. No desplegar fuentes licenciadas,
`.staging`, datos de build privados o un directorio compartido mezclando marcas. Se despliega el
snapshot exacto; `.vercel/project.json` es metadata local de enlace, fuera del hash y del archivo.
Cambiar interfaz exige compilar otro digest, nunca parchear el snapshot. El run primario legacy
carece de enlace outcome→execution hash: el manifest lo declara; las seis corridas de diseño sí
validan la cadena completa. No reescribir outcomes antiguos para llenar esa ausencia.

Antes de deploy autorizado: comprobar identidad Vercel, scope/team, project ID y protección de
deployment. Un primer deploy puede recibir alias Production aun sin `--prod`. Protección debe ser
`all` y verificarse anónimamente en aliases pertinentes. No desproteger un visor para evitar login.
Un check Vercel exitoso del repo genérico no confirma actualización del proyecto separado SKY.

Identidad observada del despliegue SKY: `julioreyes-4376`, scope `efeonce-7670142f`, team
`team_gmNiF4YCHmc1wqsHUTCvqjmN`. Es dato fechado de continuidad, no permiso ni identidad vigente;
verificar con sesión/config reales antes de mutar. No reautenticar con la identidad errónea usada
anteriormente ni atribuir un bloqueo de scope a fallo de build.

Publicación exige commit/ref, build, deployment/Ready, dominio/alias, protección y readback de la
superficie real. Preview protegido, publicación estable y paquetes npm son estados diferentes.

## Archivar y entregar

Canon privado de esta máquina:
`/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/<fecha>/`.
La ruta es evidencia local, no ubicuidad para todo el equipo. Registrar dónde queda la copia duradera,
run/brand/lock/PNG/ZIP SHA y, si es remoto, objeto/generación/readback independiente. Sólo subir con
alcance autorizado y precondición sin overwrite; no publicar binarios privados en GitHub por comodidad.
No usar `pieza:subir/bajar` como certificación del archivo nativo.

Salida ejecutada, review, aprobación, archivo y entrega tienen evidencias distintas. El harness no
publica redes ni manda piezas al cliente. Autorización del diseño no autoriza ese envío.


### Readback CLI protegido

`vercel curl` requiere el cwd/`--cwd` del snapshot enlazado al proyecto de la marca:
`--deployment` solo no reemplaza ese contexto al resolver el acceso. Para SHA de HTML usar
`--location` y header `x-vercel-skip-toolbar: 1`, sin exponer credenciales ni bypass.
La prueba anónima se hace separada, sin credenciales ni seguimiento del redirect. Registrar el
número real de archivos remotos cotejados; archivo completo local no significa readback remoto completo.

### Recuperación posreserva y plan derivado

La corrección de2026-09-30 conserva UUID/pending-or-uncertain y HTTP409 ante cualquier excepción
posterior a la reserva adquirida. Un marcador aditivo de fallo es best effort, nunca permiso de
reintento. La CLI indica --receipt con el UUID incluso si pierde respuesta de red/HTTP. Ver
[revisión y límites](review-remediation.md); no confundir estos cambios locales con broker desplegado.
El planIAM versionado se genera desde el admission exacto con deployment-plan.mjs; no ejecuta
GCP ni modifica permisos. El presupuesto por persona/período continúa pendiente.
