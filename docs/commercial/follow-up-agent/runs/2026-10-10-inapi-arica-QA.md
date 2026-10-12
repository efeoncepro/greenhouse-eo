# QA Release Audit - Alta de radar INAPI y SERNATUR Arica

**Decisión posterior vigente:** Arica NO-BID por Julio; Lead Disqualified/NO_INTEREST y tarea Cancelada, verificados. Control12/10 cancelado. [Descarte y evidencia](2026-10-10-arica-no-bid.md). El corte inferior documenta el alta inicial.

## Verdict

PASS — exclusivamente alta operativa y seguimiento.

Closure state: complete para el registro; la calificación y participación permanecen pendientes. Cierre canónico de Proposal: BLOCK, fuera del entregable pedido y sin oferta creada.

## Scope

- Dos workspaces INAPI/Arica, deltas aditivos al radar/registro CRM, registro y state de seguimiento, reporte focal y evidencia de readback.
- Runtime revisado: HubSpot portal 48713323 y Notion Tasks Comercial, usuario Julio.
- Cambios ajenos del checkout preservados. Sin código, migraciones, deploy, autorización de acceso, propuesta o postulación.

## Risk Classification

| Risk | Level | Why |
| --- | --- | --- |
| Escritura CRM/Notion | Medium | Dos altas autorizadas; requiere identidad, deduplicación y readback independiente |
| Documentación de licitaciones | Medium | Calendario, requisitos y economía deben distinguir fuente, cálculo, cumplimiento y decisión |

## Injected Skills

- `greenhouse-public-private-tenders`: intake público, fuentes, dossier, matriz y separación Lead/Deal/Proposal.
- `hubspot-as-a-service`: identidad, objeto nativo Lead, empresas existentes, notas y readback.
- `notion-platform`: schema real de Tasks, responsable/proyecto, metas internas y lectura posterior.
- `greenhouse-documentation-governor`: índices/deltas focales y conservación de contexto previo.
- `greenhouse-qa-release-auditor`: cobertura proporcional y cierre sin falsas evidencias.
- `deck-studio`: gate de Proposal observado; no aplicado para producción de deck, pues no se pidió oferta.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| HubSpot Lead readback independiente | PASS | New, owner75788512, abierto; JSON CRM-NOTION de ambos expedientes |
| Notas y asociaciones | PASS | Bodies exactos; Lead–Company Primary y nota–Lead/Company, paginación agotada; JSON HUBSPOT-ASSOCIATIONS |
| Unicidad posterior | PASS | Un Lead y cero Deals por ID; dos empresas preexistentes reutilizadas |
| Notion fetch posterior | PASS | Dos tareas, Julio, proyecto vigente, Alta/Sin empezar, deadline interno distinto del externo y cuatro criterios pendientes |
| Documentos originales | PASS para disponibles | Tres DOCX íntegros de INAPI y PDF Arica legible de 7 páginas; cuatro hashes comprobados |
| JSON / enlaces / claves | PASS | 14 JSON válidos en ambos dossiers, cero enlaces locales rotos, 47 claves de seguimiento únicas |
| Documentation closure focal | PASS | `node scripts/check-documentation-closure.mjs -- <rutas focales>`: cero warnings |
| Whitespace | PASS | `git diff --check -- <rutas focales>` sin errores |
| Ops lint | PASS con warnings ajenos | `pnpm ops:lint --changed`: cero errores, 5 warnings de tasks y 14 de epics; no corresponden a este intake. Primer intento de pathspec fue rechazado porque CLI no lo admite; repetido con sintaxis válida |
| QA / cierre Proposal | BLOCK de Proposal | `pnpm qa:gates --changed --agent codex -- <rutas focales>` exit1: falta oferta técnica/plan y verificación canónica; workshop_only. No se altera gate ni se inventa oferta para cerrarlo |

## Blockers

Ninguno para el alta operativa verificada. Antes de participar, permanecen las puertas de cada matriz. La falta del original INAPI y de corroboración oficial de la hora Arica impide afirmar revisión normativa integral/fecha oficial independiente, no registrar la señal con esas limitaciones.

## Conditional Follow-Ups

1. INAPI: descargar RE381 completo (reCAPTCHA), revisar adendas/foro, metas20k/25k, referencias/habilitación, caja y costos; control16/10 12:00 Chile.
2. Arica: revalidar portal/cierre, presupuesto4,5M vs7,1M, destino/formato/accesos, fee/caja; control12/10 09:00 Chile.
3. Julio registra GO/HOLD/NO-BID. No se generan ofertas ni envíos por haber dado de alta el Lead.

## False-Closure Traps Checked

- Runtime: evidencias nuevas de lectura independiente, no solo respuesta de creación o documentación heredada.
- UI: no implementación o cambio de producto visible.
- Env/flags/deploy/backfill: no modificaciones ni dependencia nueva.
- Docs: deltas conservan corte global anterior; listas pendientes no se marcaron resueltas.
- Propuesta: presupuesto no es amount; Lead New no es Deal cualificado; research no es oferta ni Proposal verified.
- Fuentes: original PDF INAPI pendiente y cierre Arica de LicitaLAB explícitos.
- Sentry/observabilidad: fuera del alcance, sin incidente cerrado por inferencia.

## Final Call

El registro de las dos faltantes está hecho y verificado en CRM, Notion y documentación local. Los requisitos y riesgos quedan accesibles en sus expedientes; no puede afirmarse todavía admisibilidad, rentabilidad, precio aprobado, preparación de oferta ni participación.
