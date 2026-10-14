# Cierre documental del consentimiento público — 14/10/2026

Encargo: lanzar subagentes, actualizar documentación y skills del último despliegue y hacer commit.
Base auditada: Greenhouse `02e3fcc1b`, Think `f7d8f36` y WordPress `8d6ff95`.
Este cierre documenta; no publica código ni modifica consentimiento o credenciales.

## Revisión paralela e integración

| Revisión | Dueño documental | Resultado |
| --- | --- | --- |
| Contrato, rollout y recibos | Subagente `consent_docs_closure` | Precisó autoridad HubSpot, GPC, scopes, rutas de evidencia, fuentes/hashes y límites de prueba. |
| Marca y hosts | Subagente `consent_brand_skills_closure` | Registró producción/mantenimiento en La órbita y WordPress; distinguió prototipo, adapter nativo y publicación de AXIS. |
| Operación y seguridad | Subagente `consent_ops_skills_closure` | Manual operativo, routing GTM y aprendizaje CLI Vercel; renovación de credencial pendiente. |
| Funcional, índices y continuidad | Agente principal | Completó explicación del visitante, acceso al manual/contrato y estado vigente en roots; preservó WIP ajeno. |

## Fuentes donde se consulta el resultado

- **Técnica:** [contrato09](../../reference/measurement-gtm-ga4/09-hubspot-consent.md) y
  [rollout/rollback](CONSENT_UI_ROLLOUT_2026-10-13.md).
- **Funcional:** [cookies y preferencias del visitante](../../documentation/growth/medicion-gtm-ga4.md#cookies-y-preferencias-del-visitante).
- **Operación:** [manual](../../manual-de-uso/growth/operar-consentimiento-cookies-publico.md).
- **Evidencia:** [recibo saneado con procedencia](consent-ui-evidence-2026-10-13.json).
- **Skills:** La órbita (`applications`/`ledger`), host WordPress (`runtime-and-discovery`), Astro,
  operador GTM y Vercel. Marca/WordPress/GTM conservan espejos idénticos desde `.claude` a `.codex`.
  Astro recibió el mismo delta propio en ambos overlays; una sección previa de video de 32 líneas
  que sólo existe en Claude queda preservada. Vercel permanece sólo Codex, como estaba antes del cierre.
- **Continuidad:** `Handoff.md`, `changelog.md` y puntero compacto de `project_context.md`.

## Precisiones que evita repetir la auditoría

La elección pertenece a HubSpot; la versión de política y `consent_source=hubspot_categories`
no se reemplazan por la versión de diseño. El checkbox visual y la presencia del aviso no son
prueba de consentimiento. GPC puede resolver una denegación sin mostrar opt-in.

La regresión del panel intercepta `/g/collect`, incluso con `--live`. Su PASS y el axe del subtree
no acreditan nuevas entregas Meta/GA4, ausencia total de red ni una certificación completa del sitio.
GPC, aislamiento de `analytics=false` y primera conversión comercial tienen evidencia/alcance separados.

El JS canónico se formateó tras generar los artefactos del corte publicado: los bytes difieren, pero
su AST coincide con las distribuciones. El builder copia bytes crudos y, al reconstruir, cambiará
el digest. No se regeneraron assets para «arreglar» un recibo histórico ni se publicó ese nuevo candidato.
Los artefactos productivos se identifican por los commits consumidores y sus manifests.

El rollback de presentación conserva el default, bridge, routing y matching. El despliegue WP
anterior fue un payload acotado; no demuestra que el resto de su repositorio sea desplegable.

## Verificación de este cierre

- Inspección de código, commits y recibos; checks de JSON, enlaces y hashes locales.
- Lectura HTTP de CSS/JS en ambos hosts: cuatro respuestas 200 y digests coincidentes con el
  manifest publicado. No se aceptaron cookies, enviaron formularios ni repitieron eventos de QA.
- Validación de espejos, cierre documental acotado, `git diff --check` y gate de contexto estricto
  después de las últimas ediciones. El commit incluye sólo cambios propios, con hunks de roots
  separados del trabajo comercial concurrente.
- Resultado del cierre: 21 rutas propias, 40 enlaces relativos introducidos válidos, nueve hashes
  de procedencia coincidentes y cero patrones de credencial Vercel en el contenido preparado.
  `skills:mirrors`, closure staged y contexto estricto PASS; sin errores ni warnings en los dos gates documentales.

## Pendientes y límites

La renovación/revocación de la credencial que imprimió la CLI sigue pendiente; las medidas de salida
saneada no equivalen a revocación. No se leyó ni reprodujo su valor para este cierre.
La primera conversión comercial enriquecida sigue sin un nuevo recibo en este encargo; no se cierra
por inferencia. La configuración escalable de fuentes sigue siendo propuesta sin GO.

AGENTS/CLAUDE y la arquitectura de consentimiento se comprobaron sin nuevo ADR o regla global:
no cambia la autoridad, esquema, transporte ni autorización. El runtime ya publicado no se modificó.
