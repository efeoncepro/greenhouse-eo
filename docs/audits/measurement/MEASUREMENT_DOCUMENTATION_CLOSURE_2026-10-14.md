# Cierre documental integral — medición escalable, CAPI y agentes

Fecha: 2026-10-14. Mandato: lanzar subagentes, actualizar todos los dueños documentales y skills
con lo construido/publicado, y hacer commit sólo de este trabajo. Esta pasada modifica documentación;
no ejecuta otro release, publicaciones GTM, conversiones de prueba, contactos CRM ni gastos.

## Evidencia y método

Se contrastaron código/contratos actuales y el [dossier de producción](../releases/2026-10-14-scalable-measurement-agent-first-release.md):
PR255, main9690efad, orquestador38591329633 success, manifest released, Server9/Web5,
health/watchdog, fuente nueva por CLI y Meta Test Events, cleanup independiente. Esta lectura
no es una nueva consulta live ni acredita tráfico comercial posterior. El cierre documental
anterior61f338c9d ya existía; esta auditoría corrige contradicciones que sus deltas no retiraron.

Tres subagentes, con ownership separado y revisión final del coordinador:

- Skills: Forms/Meetings/GTM Codex y Claude contra prepare/payload/visitor-request/policy/CLI/Client.
- Referencias: canon GTM/CAPI, ADRs, propuesta histórica y referencia de Product API interna.
- Funcional/manuales: flujo de negocio, alta, embeddings, política, CLI, recuperación y diagnóstico CAPI.

El coordinador revisó las arquitecturas consumidoras, rule auto-load, módulos Digital/CRO,
host WordPress, índice ADR, tasks/plan, changelog funcional, handoff e integridad de links/espejos.
No se usó branch/worktree ni se incorporó WIP comercial, creativo o documental ajeno.

## Cobertura completa por capacidad

| Capacidad construida | Canon técnico y evidencia | Funcional / operación / skills |
| --- | --- | --- |
| Form aceptado y reunión confirmada como origen de Lead | Arquitecturas Forms y Meetings; commands, prepare/store y frontera transaccional/savepoint | Funcionales Forms/scheduler; manuales Forms/alta; skills Forms/Meetings |
| Growth Forms → HubSpot Forms → CRM, medición independiente | ADR de policy y arquitectura Forms: mapping/outbox comercial conservados | Manual configurar-medicion-conversiones y operación Forms; no sustituir fieldMapping CRM |
| Política SQL server-only, revisiones inmutables y auditoría | ADR policies, policy-contract/store/command; migración/grants aplicados en dossier | Borrador→review→publish y disable; panel y CLI comparten autoridad |
| Fuente estable, versión/binding, surface/origen y mapping tipado | policy-source/prepare; Forms form_key+fver, Meetings binding fingerprint; dos hosts aprobados | Checklist alta y manual policy: no inferir keys de labels, no editar seed/listas para altas |
| Operación de agentes de primera clase | Referencia API interna nueva y enlace en API_REFERENCE; GET contrato versionado, POST dry-run/commands | CLI discover/validate/apply/verify; sesión user-bound HTTPS/0600, capabilities, CAS/idempotencia/recibo/readback |
| Recuperación de timeout y publicación concurrente | Cliente HTTP compartido: recibo conocido antes de GET; same key/body con outcome desconocido | Manuales y seis skills: retry GET si recibo conocido; conflicto exige redescubrir, no sobrescribir |
| Consentimiento/GPC/revocación/first visit y preferencias | Context/bridge y referencia09; UI nativa HubSpot y rollout visual fechado | Manual consentimiento y skill host; form submit no exige permiso publicitario para aceptarse |
| IP/UA visitante, fbp/fbc/fbclid y external_id | visitor-request/payload/bridge, runtime10 y ADRMeta | Nombres de campos, normalización/hash según proveedor; sin IP/UA de worker ni datos sensibles en logs/Sentry |
| Meta Lead sólo backend, website/URL/tiempo/UUID y schema2 | Client autenticado Server9, sólo template30 cambiado; pixel/tags/Web5 preservados | Manual CAPI/skillGTM: Lead tras aceptación, nunca click/submit intent; PageView existente permanece |
| Cola cifrada, revisión pinneada y revocación antes del envío | prepare/store/dispatch, retención y worker existentes | Cinco intentos/24h, ciphertext48h, HTTP iniciado no recuperable; no reautorizar consentimiento/revisión en retry |
| GA4 único generate_lead y UPD sin events | runtime10/TrackingEngine; Google requiere analytics+ads y client_id real | Funcional/skillDigital/CRO; no PII en GA4 ordinario ni segunda conversión; no audiencias/campañas automáticas |
| Alta compatible sin release/redeploy/publicación GTM | Fuente creada después del release, configuración CLI y Test Event; snapshots antes/después idénticos | Manual y skills; versión nueva requiere revisar policy, nuevo contrato/tipo/host/proveedor requiere cambio gobernado |
| Panel, permisos y calidad visual | TASK-2037 complete, UI review/scorecard y GVC1440/390 +12 estados | Inspector existente; sin nuevo sidebar, autorización server y estados de presentación mock explícitos |
| Infraestructura, flags y release completo | Dossier PR255 y timing/flag ledgers; shared workers, sin proyectos/servicios/crons nuevos | Rollback y manual CAPI; token permanente no se promete ni min0/max1 significa costo cero |
| Test Events temporal y límites | Tres eventos confirmados Server/website; negativos/replay, fixtures archivadas,13fuentes/7policies | Test code por petición, nunca fijo; no submissions/bookings/CRM ficticios, no nuevos probes en esta auditoría |

## Contradicciones corregidas

- “Cobertura fija actual”, “propuesta pendiente de GO” y “alta exige release” seguían en skills,
  arquitecturas consumidoras, manuales Forms, README/referencias y rule auto-load. Se reemplazan
  por la autoridad de policy publicada; GA4 genérico por sí solo sigue sin autorizar matching.
- `efeonce-discovery-30` se conserva sólo como identificador antiguo descartado. Se descubre el
  binding real; el seed inicial usa discovery/fhsf-efeonce-lead-gen-web, no una lista runtime.
- Matching ya no presupone normalizedFields.email/phone/firstName/lastName. Se aplica el mapping
  tipado de la fuente/version, incluido businessEmail u otros keys compatibles y namePolicy explícita.
- Se retiran external_id “pendiente” y Server6/8 como instrucciones actuales. Checkpoints y
  auditorías fechados se preservan como historia, con enlace al cierre vigente.
- El índice ADR ahora registra el contrato Accepted/publicado y la propuesta supersedida, sin
  tener simultáneamente el mismo trabajo como “sin implementar”. Intake de tasks y discovery
  del plan quedan rotulados históricos; lifecycle complete de TASK-2036/2037 no se altera.
- La documentación para agentes distingue configurar medición de provisionar fuentes, mapping
  HubSpot, enviar formularios o probar proveedores. La CLI no añadió tools MCP ni scopes OAuth.

## Revisado sin cambio necesario

- AGENTS/CLAUDE ya enrutan Growth; no nació una regla transversal ni cambió el harness de
  implementación. project_context conserva un único pointer compacto, rotulado API/CLI;
  no se duplican contratos allí.
- DESIGN/UI platform y capturas/scorecards no cambian: esta pasada no modifica UI ni runtime.
- Arquitectura y skill de HubSpot write bridge conservan su servicio separado; Forms secure-submit
  y Meetings no se convierten en rutas de ese bridge por añadir matching.
- Skill production-release, timing ledger y flags ya registran el release/valores observados;
  esta auditoría no equivale a otro pase ni a un readback live nuevo.
- Consentimiento visual La órbita/HubSpot mantiene sus docs y evidencia propios. El host sólo
  distribuye bridge/UI; no contiene policy registry, secretos ni lógica de matching.
- Footer y trabajos comerciales/creativos concurrentes conservan sus owners y cambios intactos.

## Pendientes que se conservan

TASK-2034 sigue parcial: primera aceptación/reserva comercial consentida, conciliación de ledger
con proveedor/CRM cuando corresponda y evolución de EMQ requieren evidencia de tráfico real.
TASK-2035 no se cierra completa: CRO, abandono, suscripciones del blog y nuevos resultados CRM
quedan fuera del goal ejecutado. Configurar transporte/UPD/audiencias no acredita elegibilidad,
serving, atribución ni mejora de matching. Las pruebas con ocho claves en Think no inventan un
teléfono que esa fuente no mapea; agenda y fuente de prueba sí verificaron nueve.

## Verificación de este cierre

Verificación proporcional documental: mirrors/cmp, links locales, diff sanitizado, task lint,
closure-check y context-check estricto después de la última edición. No se ejecutan
build Next, typecheck global ni pruebas de negocio/proveedores por cambios documentales.
El commit posterior registra sólo los paths/hunks propios; producción permanece en el release
previamente verificado y este cierre no inicia una nueva promoción.

Resultados de revisión: cuatro task lint sin errores/warnings; seis pares específicos de skills/
módulos/referencia idénticos y gate global de espejos PASS; enlaces locales añadidos sin destinos
faltantes. El subagente de manuales validó los ejemplos draft/review/publish/disable contra el
Zod real, con tsx limitado a512MiB. Sólo paths documentales/skills/rule y hunks propios en el stage.

El closure checker conserva un advisory preexistente `architecture_doc_monolith` de Forms:
12 secciones Delta tanto en HEAD como después de esta corrección (1398→1402 líneas). No se
añadió otro Delta ni se cambió el gate. Se revisó el contrato vigente dentro de su owner;
separar todo el historial sería un refactor documental amplio distinto de esta conciliación.
El resto de findings se resolvió; no se declara este chequeo completo como strict sin warnings.
Context/handoff se exige sin errores ni warnings antes del commit.
