# AEO X-Ray — composición multipieza y sharing por edición

- Status: Accepted
- Date: 2026-09-30
- Owner: Comercial/Growth + Platform + AXIS + Think
- Scope: contrato X-Ray portable, dominio de casos/ediciones/grants y renderer Think.
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: renderer/sample Think publicados 2026-09-30; foundation Greenhouse local, rollout pendiente.

## Context

El operador aprobó ejecutar el [plan del X-Ray](../think/aeo-xray-composer-extension-plan-2026-09-30.md)
con tokens de composición y enlaces por cliente; requiere landing y artículo inmersivos de Banco Pichincha
Perú. El X-Ray legacy es un artículo estático con URL no adivinable, sin grant revocable.

## Decision

AXIS posee tokens, contrato y validator de composición sin conocer auth ni clientes privados. Greenhouse
posee caso, borrador editable, edición inmutable y grants propios. Think renderiza por SSR la proyección
validada. Se admite además el carril de muestra empaquetada independiente descrito abajo. No se crean nuevos deployables, repos ni un editor visual. La ejecución se divide en TASK-1950
(foundation) y TASK-1951 (experiencia/contenido). Aprobación del operador: goal de esta conversación.

Reutilizar primitives de crypto/DB/auth, nunca tablas ni entitlements de Insights para prospectos. Owner
tenant es Efeonce; el target comercial no concede acceso. Commands y readers canónicos, con adapters de
API programática gobernados. Grants usan digest-only, expiración por defecto 30 días y máximo 90;
revocación comprobada en cada request, también para assets protegidos. Ningún bearer abre borradores.

Edición congela manifest, contenido, tokens/versiones y assets. Corregir crea nueva edición, no altera un
envío existente. Retirar edición deniega sus grants. Leer no permite autorar/emitir. El enlace es bearer
reenvíable, no prueba identidad del destinatario.

Preservar legacy SKY y sus URLs; la ruta nueva es `/aeo-xray/r/<token>` y usa queries relativas para
artifact/view/assets. Desactivar analytics que capturen URL, no-store/no-referrer/noindex y canonical
genérico. No loguear tokens ni devolver fallos crudos. Schema bancario sólo exhibido, nunca activo.

Landing y artículo tienen lectura plena e inspección opcional; anotaciones block/page/site y estados
propuesto/implementado/verificado/medido con ámbito. Evidencia externa no demuestra resultados propios.
Fuentes financieras se revalidan al producir; CTA de muestra sin captación bancaria. Distribución AXIS
puede ser snapshot generado con hashes y drift check; no copia manual. Publicación de paquetes es gate
separado y no condiciona pruebas locales reproducibles.

## Alternatives Considered

JSON estático extendido: sencillo, pero revocar requiere build. Reusar dominio Insights: mezcla permisos y
clientes con prospectos. Inspector permanente: reduce lectura del espécimen. Se elige dominio acotado y
dossier multipieza; se conserva reutilización de primitives sin un compositor universal prematuro.

## Consequences

Nueva persistencia/autorización con costo de pruebas cross-runtime. A cambio, el envío referencia una
edición verificable y la producción cambia payload, no componentes por cliente. PDF/deck y CMS quedan
fuera de la primera entrega. El usuario autorizó construcción; release y envío mantienen sus gates.

## Runtime Contract

Homes nuevos autorizados dentro de runtimes existentes: `src/lib/aeo-xray/` Greenhouse, adapters API propios,
paquetes contracts/tokens existentes AXIS, `src/components/aeo-xray/Experience.astro` compartido con legacy y ruta SSR Think. Tests deben cubrir
tenant/case, revocación, draft no público, schema/asset/URL seguros y compatibilidad legacy. La autoridad
real se obtiene del actor autenticado, nunca del payload de un importador.

## Revisit When

Login destinatario, colaboración del cliente, publicación CMS, datos confidenciales o export multiformato
requieran ampliar el contrato. No inferir esas capacidades desde este ADR.

## App API y autoridad inicial

La entrada de autoría es `/api/platform/app/growth/aeo-xray/**`, con sesión cookie o first-party
validada, capabilities propias y owner interno activo resuelto server-side. Admin/Account internos
reciben los verbos; cliente y OAuth delegado no reciben acceso implícito. El contrato delegado y
MCP quedan excluidos inicialmente: falta consentimiento específico y mapping de scopes X-Ray.

Los adapters usan `runAppRoute` para auth, rate limit y request audit. Los commands auditan dentro
de su transacción y la emisión implementa idempotencia por revisión. No usar el wrapper genérico
que persiste respuestas: guardaría el bearer y su replay omitiría la comprobación actual de capability.
Crear grant devuelve token una sola vez y rechaza `Idempotency-Key`; listar devuelve metadatos.

Media original se ingresa por `POST .../cases/{caseId}/assets` (binario imagen, máximo 10 MiB),
se decodifica y normaliza a WebP sin metadatos, queda en contexto privado `xray_source` ligado
a case/org y obtiene ID nuevo por versión. Emisión exige hash SHA-256 y dimensiones congruentes
con registry; el snapshot congela ese hash. El reader de media revalida grant, case/org, estado
adjunto y bytes/hash en cada descarga. No admite proxy HTTP ni accede assets de otros dominios.
Cambiar una imagen exige ID nuevo y edición nueva.

Owner se valida por `organizations.is_operating_entity=true` y `status=active`, no por
`organization_type=efeonce_internal`: investigación live de 2026-09-30 encontró la entidad
operativa Efeonce tipada `other`. Session org, si existe, restringe; sin org se exige un único
resultado. La etiqueta de prospecto nunca participa en esa resolución.

## Fidelidad y enriquecimiento del producto existente

El operador corrigió explícitamente la implementación paralela reducida. La experiencia original es el
producto que se extiende: cuatro pasos, brecha, lectura, instrumento técnico/evidencia, átomos sociales
y coreografía. El mismo Experience atiende legacy y grant SSR. `artifact.experience` conserva el contrato
original portable y añade scopes/estados/refs, sin inventar otro DSL. Landing y selección de piezas se
incorporan al recorrido; Article e Instrument se reutilizan. El renderer V2 reducido se retira.


## Delta aceptado: entrega comercial independiente en Think

El operador pidió enviar la demo sin depender del release general de Greenhouse y prohibió promover
Greenhouse. Se conserva el dominio futuro; la entrega presente usa un registry de samples en el runtime
Think existente. No nace otro deployable ni se comparte autoridad con Insights.

- Keys `sample_` resuelven un payload empaquetado validado por AXIS/acceptSharedXray; no llaman al provider.
- Es distribución no listada de una muestra, sin autenticación de receptor, TTL real o revocación por request.
- Media registrada resuelve302 a paths estáticos públicos. La refportableprotected no cambia esa garantía.
- Retiro requiere redeploy con registro/media retirados; la fecha de compatibilidad del envelope no es lifecycle.
- Grants `xrg_` mantienen el contrato definido arriba, pero migración/storage/flags/actor/canary están pendientes.
- No confundir vídeo/SVG del sample con soporte automático del reader de media grant, acotado a imágenes.
- Fixtures siguen sóloDEV. No introducir una flag deployada basada en `NODE_ENV` para abrir fixtures.

Renderer final comparte Experience con legacy; implementa 2 piezas×4 etapas, navegación por query/ClientRouter,
Opportunity ilustrativo, ValueExplorer con trazabilidad, módulos completos, medios reales y telón accesible.
La corrección de unidadesms/s de CSS compilado se verificó en producción; movimiento real es gate, no
sólo existencia de token/script. Release Think: SHA `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`,
deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, alias `think.efeoncepro.com`.

Ver [dossier detallado](../think/aeo-xray-implementation-dossier-2026-09-30.md),
[auditoría de alcance](../think/aeo-xray-completion-audit-2026-09-30.md) y
[handoff](../think/aeo-xray-release-handoff.md). La key del envío no se replica en documentos versionados.
