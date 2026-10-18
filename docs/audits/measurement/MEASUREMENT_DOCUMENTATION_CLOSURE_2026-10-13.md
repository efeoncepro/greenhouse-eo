# Auditoría documental integral de medición — 2026-10-13 Chile

Este es el corte histórico previo a la configuración escalable. Para instrucciones vigentes,
ver la [auditoría14/10](MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-14.md) y el [contrato runtime](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

## Mandato y estado

El operador pidió tres subagentes y documentación de **todo lo construido**, antes del GO
para escalabilidad, y luego commit. Alcance: consentimiento WP/Think, GTM web/server,
PageView/Lead, matching Meta/Google, cola/worker, secretos, GA4/audiencias, release, costos,
rollback, pruebas y límites. No se ejecuta la propuesta configurable ni se publican cambios.

Código Greenhouse del matching y recuperación: commit aa9a7ee9a450,75rutas; builderidempotente
c9766318e y heapCI27403a165. Promoción completa PR254/main d692ab51dc48, no sólo matching.
Cierre de rollout ya commiteado/pusheado en develop124327bd7. El presente commit completa
los dueños documentales que faltaban y versiona fuentes previamente desplegadas sin push.

[Contrato runtime10](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md),
[release y recibos](../releases/2026-10-13-full-develop-matching-release.md),
[matching](META_LEAD_MATCHING_2026-10-13.md), [recuperación histórica](META_CAPI_RECOVERY_2026-10-13.md).
No afirmar un nuevo readback live por consultar esos recibos ni declarar TASK2034 completa.

## Cobertura por capacidad y dueño

| Construido | Documentación dueña / cierre |
| --- | --- |
| Hosting existente recuperado, billing canónico, límites/costo/persistencia | ADRMeta + recuperación histórica + dossier release; min0/max1 no es gratis ni presupuesto monetario |
| HubSpot2hosts, defaultdenied, GPC, banner automático y preferencias inline | Referencia09, canon10§2; WP/ThinkREADME y skillWP; hashes puente comunes |
| PageView consentido por destino y UUID/evnid, routing SiteKit/Think | Referencias08/09 y LEARNINGS; evita duplicado y GA4 con ads-only |
| Forms aceptados, normalización/contexto, SAVEPOINT | Arquitectura/funcional/manual Forms, skillmirrors; canon10§3–5 |
| ProviderMeeting/ledger succeeded, replay y UUIDbackend | Arquitectura/funcional/manual Meetings, skillmirrors; noncebrowser sólo espejoGA4 |
| Allowlist6slugs+1scheduler/surface en ambos lados | Canon10 y todas skills de operación; publicar nuevoform no autoautoriza matching |
| Hashes Meta/Google, clasificadores, fbp/fbc/IP/UA y URL | Canon10§4/6; no HMACinterno/PIIenGA4/dataLayer, almenos email/teléfono |
| AES-GCM/UUIDdurable, proyección/delivery y grants | SQLaplicada20261013233429748, canon10§5 y PGcanary; no drop automático |
| Claims/retries/leases/CAS/deadletter/retención | Canon10§5, manualMeta lectura operacional; worker existente, sin cron nuevo |
| Ingress autenticado/schema/MetaClient/tagcallback | ClientJS/template30/31/33, MetaTag6 [11,33], frozenartifact; canon10§6 |
| Cutover6/5 y fronteraGA4Client | ADRcierre, Tracking§19.6, deploymentADR, referencias06/08/10, trackingplan |
| UPDsin events y GA4correcto, MPsecret/linkAds | Canon10§6/7, Googleaudit, módulosDigital/CRO; no segunda conversión |
| 7audiencias90d y nuevas dimensiones | Canon10/filtrosexactos/scriptconfigure; creación no es serving ni importaciónCRM |
| 3secretrefs pinned/SA/grants y4flags persistentes | Flagledger, dossier, manualMeta; canary dentro del worker, tokenMetaTTL noverificado |
| Release full develop→main, CIheap, gates/manifestequivalence | Dossier, timingledger, skillsrelease ya sincronizadas; sin nuevo release documental |
| Negativos/TestEvents/replay/cola/credenciales | Audits+canon10§9 y manifest de huellas; no fakebusiness ni dedupe/qualityclaim |
| Diagnóstico/rollback/seguridadoperacional | ManualMeta y helpers inventariados; mutación no es read-only/dry-run |
| IncidenteMindicador aparte | Dossier y Sentry abiertos; este cierre no lo arregla ni modifica Finance |
| Escalabilidad conversada | Propuesta versionada e indexada como Proposed, pendiente de GO, sin implementar |

Se conserva la triple capa: arquitectura/contrato, funcional y manual. No duplicar un spec
entero en cada skill: los skills cargan el canon y añaden invariantes del dominio.

## Revisión de subagentes y correcciones

- Measurement docs: contradicciones ADR/readme/ref06/08/09 y scopes; corrección de skillsGTM,
  reglasClaude, módulosCRO/Digital y trackingplan. ConfirmaciónMeeting Web5 publicada no implica
  funnelworkspace6ajeno publicado ni todas sus dimensiones registradas. Snapshotweb antiguo
  etiquetado, no regenerado/exportado sin readback; no se inventó paridad live.
- Forms/Meetings: faltaba capturabackend en skillsForms y Meetings prescribía senderbrowser
  antiguo. Arquitecturas,funcionales,manuales y espejos actualizados, allowlists exactas visibles.
- Ops/release: recuperación mezclaba estados actuales/históricos; separados sin borrar intentos,
  rollback/recreaciónprevia ni QAaccidental. Manual y dossier precisan costos, identidad efectiva,
  permanente configuración vs tokens, límites de canaries y falta de aceptacióncomercial.
- Root: consolidó canon10, ADRappend-only con cierre vigente, TrackingEngine(declara que el
  matching no implementa todo el TrackingEngine futuro), deploymentADR, índice, routecontext,
  WP/Thinkdocs/skillhost, task/handoff/changelog y esta matriz/inventario.
- Revisión independiente canon10: límites URLs no detectoruniversal, em**o**ph, excepción429,
  resoluciónform_key→slug/rename y expresiónexacta audienciaComerciales registrados.

## Propuesta pendiente de GO

[Configuración por formulario/calendario](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md)
es Proposed. No existe nueva columna/policyAPI/editor/envelopefirma/Clientgenérico ni
migración/featureflag/publicaciónGTM por este commit. Se documentan alternativas, mapping,
identidadestable/version/surface, autoridadserver, APIparity, revocación/cache pendientes y
migracióncoordinada de ambas listas. Requeriría un release+publicación inicial. No prometer
cero releases para nuevos contratos/hosts/destinos. No crear audiencias/campañas automáticamente.

## Fuente original Greenhouse:75 rutas

Inventario mecánico de `git show --name-only aa9a7ee9a450d6228f684e6b773c350250b997e2`.
Incluye source, tests, scripts y documentación de ese commit; no atribuye todo el batch de
6154rutas del release a esta implementación. Las parked siguientes fueron trasladadas a
SQL canónica aplicada en el cierre124327bd7; no volver a ejecutarlas por este inventario histórico.

```text
.claude/rules/measurement-gtm-ga4.md
.claude/skills/digital-marketing/modules/03_PAID_MEDIA.md
.claude/skills/greenhouse-growth-meetings/SKILL.md
.claude/skills/greenhouse-gtm-ga4-operator/SKILL.md
.claude/skills/growth-marketing-cro/modules/07_MEASUREMENT_ANALYTICS.md
.codex/skills/digital-marketing/modules/03_PAID_MEDIA.md
.codex/skills/greenhouse-growth-meetings/SKILL.md
.codex/skills/greenhouse-gtm-ga4-operator/SKILL.md
.codex/skills/growth-marketing-cro/modules/07_MEASUREMENT_ANALYTICS.md
.github/workflows/ops-worker-deploy.yml
Handoff.md
changelog.md
docs/architecture/DECISIONS_INDEX.md
docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md
docs/architecture/GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md
docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md
docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md
docs/audits/measurement/META_CAPI_RECOVERY_2026-10-13.md
docs/audits/measurement/META_LEAD_MATCHING_2026-10-13.md
docs/changelog/internal/2026-10.md
docs/documentation/growth/medicion-gtm-ga4.md
docs/manual-de-uso/growth/operar-meta-capi-servidor.md
docs/operations/FEATURE_FLAG_STATE_LEDGER.md
docs/operations/public-site-runtime-repository-binding-20260614.json
docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md
docs/reference/measurement-gtm-ga4/06-gtm-tagging-as-code-and-ops.md
docs/reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md
docs/reference/measurement-gtm-ga4/09-hubspot-consent.md
docs/reference/measurement-gtm-ga4/README.md
docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md
docs/tasks/README.md
docs/tasks/TASK_ID_REGISTRY.md
docs/tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md
docs/tasks/pending-migrations/TASK-2034-growth-measurement-enrichment.sql.pending
eslint.config.mjs
project_context.md
scripts/measurement/__tests__/hubspot-consent-bridge.test.cjs
scripts/measurement/__tests__/sgtm-lead-client.test.cjs
scripts/measurement/build-sgtm-lead-draft.ts
scripts/measurement/configure-google-lead-audiences.ts
scripts/measurement/deploy-wordpress-consent.php
scripts/measurement/hubspot-consent-bridge.js
scripts/measurement/prepare-preview-canary.ts
scripts/measurement/provision-matching-secrets.ts
scripts/measurement/read-release-state.ts
scripts/measurement/send-preview-canary.ts
scripts/measurement/sgtm-lead-client.js
scripts/release/ops-worker-runtime-secrets-contract.test.ts
services/ops-worker/deploy.sh
services/ops-worker/server.ts
src/app/api/public/growth/forms/[formSlug]/submit/route.ts
src/app/api/public/growth/meetings/book/route.ts
src/growth-forms-renderer/api-client.ts
src/growth-measurement-context/context.test.ts
src/growth-measurement-context/context.ts
src/growth-meeting-renderer/__tests__/telemetry.test.ts
src/growth-meeting-renderer/api-client.ts
src/growth-meeting-renderer/telemetry.ts
src/lib/growth/forms/commands.ts
src/lib/growth/forms/contracts.ts
src/lib/growth/forms/store.ts
src/lib/growth/measurement/__tests__/crypto.test.ts
src/lib/growth/measurement/__tests__/dispatch.test.ts
src/lib/growth/measurement/__tests__/payload.test.ts
src/lib/growth/measurement/__tests__/store.test.ts
src/lib/growth/measurement/contracts.ts
src/lib/growth/measurement/crypto.ts
src/lib/growth/measurement/dispatch.ts
src/lib/growth/measurement/payload.ts
src/lib/growth/measurement/prepare.ts
src/lib/growth/measurement/store.ts
src/lib/growth/meetings/command.ts
src/lib/growth/meetings/contracts.ts
src/lib/growth/meetings/store.ts
src/lib/growth/meetings/validation.ts
```

Los fixes posteriores c9766318e(templateprop) y27403a165(heapCI) están en el mismo main
promovido. Readbacks, manifiesto, SHAequivalence y digests en el dossier evitan asumir que
un label viejo implique código viejo o que un commitdocs requiera otro deploy.

## Fuentes de hosts y propiedad del checkout

WP: plugin eo-measurement-consent1.0.3 (PHP+bridge); footer del theme no modificado por esto,
integración de preferencias desde wp_footer. Think: BaseLayout.astro, index.astro y bridge.
Ambos assets coinciden byte a byte con scripts/measurement/hubspot-consent-bridge.js:
SHA25615026e5d27ed54a8188a67b100f812ef5d33129bb15f7eb365054cac6f4f0d3a.
PHPplugin SHA256f4c2daa96c6198dd2cbcbe78eb45bb3514e38e28428729423e38ffa39c75807c.
No editar copias a mano ni confundir sources locales, commit y deploy.

Al iniciar este cierre, WP HEADf12dd64c0784e8f5067bbf9925fbb994814754a5 con pluginuntracked;
Think HEAD9a36dac1490089624c63db97322c5dd18a7c6be5 con layout/indexM y bridgeuntracked.
Subagente confirmó esos diffs y hashes; root revisólos5paths y preparó commits explícitos
sin stageajeno ni push/deploy. Commits locales finales: WordPress `cf7f10d1c676ec4cb1d57ddbb68a08f9323ebd53` (2archivos),
Think `63e9fa7c734616e2d26b496a7c9dc6fb444fa877` (3archivos), ambos en main sin push.
Readback gitshow confirma los cinco archivos byte-idénticos a los revisados; no nuevo deploy.
Las fuentes desplegadas previas están descritas en recuperación; versionarlas no es un nuevo
readback de los sitios. WIP ajeno WordPress y todo WIP comercial Greenhouse preservado.

## Evidencias persistidas y privadas

[Manifest](MEASUREMENT_EVIDENCE_MANIFEST_2026-10-13.json) contiene sólo nombre/tamaño/SHA256
integral de19recibos/capturas locales usados; nunca payload ni valores secretos. Los archivos
originales de .captures son evidencia local ignorada, no adjuntos publicados por este commit.
No subir exports de GTM/tokens/env/contactos; los resultados redactados están en las auditorías.
No sumar estos controles a una prueba de conversión real que todavía no ocurrió.

## Verificación de cierre

Se ejecutan checks proporcionales de mirrors,links/anchors de nuevosdocs, tasklint, flagsaudit,
migrationmarker y contextstrict **después de la última edición raíz**; resultados al final.
No nueva suite/buildGreenhouse ni tráfico comercial. Fuentes host preservadas byte-idénticas,
PHPsyntax/JScheck y Thinktypecheck separados. Scope de commit explícito: docs/skills/reglas y
fuentes anteriores sólo en sus repos; no push/release, no cambio de runtime, no nuevoGO inferido.
AGENTS/CLAUDErouters existentes ya llevan Growth/GTM/release; no nueva regla transversal que
requiera duplicar estas specs ahí. GenericAstro no recibe política específica Efeonce;
los hostowners y docsThink son quienes la cargan. No otras skills/comercial/FinanceWIP.

TASK2034 sigue parcial por primera fuente comercial consentida post-flip/recepciónprovider;
auditoría documental completa no la tilda. Dedupe atribución, matchquality/serving y TTLMeta
siguen sin afirmar. EstadoMindicador abierto según último readback, sin nueva prueba aquí.


### Resultado de las comprobaciones

- Espejos: pnpm skills:mirrors PASS y comparación explícita de Forms/Meetings/GTM/WordPress,
  más módulos CRO/Digital, todos byte-idénticos. Baselines de skills también eran idénticos;
  no se borró una diferencia previa entre agentes al sincronizarlos.
- Tasklint2034 PASS,0warnings; flagsauditstrict/no-vercel PASS. No se ejecutó auditoría live
  de flags por una actualización documental; recibos previos delimitan el estado externo.
- Nuevos enlaces relativos de las46rutas propias resuelven, sin regresiones; gitdiff--checkPASS.
  El escaneo detectó 50 targets rotos preexistentes de índices históricos de tasks,
  idénticos al baseline HEAD y ajenos a este cambio; no se repararon como refactor amplio.
- PHPsyntax y JScheck pluginWP PASS; Thinktypecheck124files,0errors/0warnings/17hints.
- Closure focal46rutas:1warning heurístico por monolito Forms existente (12seccionesDelta
  ya presentes antes del cambio; no refactoramplio). Index/taskstatus/ADR/skills sincronizados.
  Contextstrict de staging final:0errores/0warnings, ejecutado después de la última edición.
  Migrationmarker:0errores,2warningslegacy1277/1700; no SQL nueva por este cierre.
  No suite/build completoGreenhouse, ni fakeLead ni mutaciones provider en esta auditoría.
