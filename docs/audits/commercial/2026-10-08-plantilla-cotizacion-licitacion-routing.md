# Plantilla documental A4 para licitaciones — continuidad de agentes

## Mandato y alcance

Julio pidió lanzar subagentes para enseñar el uso de la plantilla rápida, evitando confundirla con el sistema de cotizaciones de Greenhouse. Trabajo documental local del 08/10/2026; sin changes de renderer, contratos runtime, DB, CRM, envío ni emisión financiera.

## Resultado

- [Manual de plantilla](../../commercial/templates/cotizacion-a4/README.md): elección por intención, oferta económica formal desde alcance/precio/condiciones aprobados, JSON/slots, comando, QA del PDF y conservación de expediente.
- [Cotizador](../../documentation/finance/cotizador.md) y [pricing histórico](../../documentation/finance/pricing-comercial.md): dirección al módulo vigente y separación de preparación documental frente a registros y aprobaciones del sistema. Se corrigió la declaración histórica «no implementado»/«runtime owner» contrastando código y arquitectura; no se verificó despliegue ni disponibilidad live.
- Cinco pares de skills Codex/Claude: Tenders principal y companion de plataformas; Report Studio; Pricing; lessons de Graphic Line. Las diferencias anteriores entre los dos SKILL de Pricing se conservaron; el nuevo bloque es equivalente.
- AGENTS, CLAUDE, project_context y [router machine-readable](../../operations/agent-context-router.json): intención específica `tender-economic-document`; no captura una petición genérica de operar cotizaciones. Frontera en [invariantes Tenders](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md). Handoff/changelog actualizados.

La oferta PDF puede presentarse formalmente con la aprobación comercial del expediente. Su referencia y JSON no son `quotation_id`, `quote_id`, template ni snapshot persistidos. El renderer no valida costos/margen/capacidad, satisface GO, ejecuta approvals ni registra operaciones financieras. Si se pide además registrar una cotización del sistema, se opera el command canónico y se concilian los datos por separado.

## Verificación independiente

Tres subagentes:

1. `docs_cotizacion_licitacion`: guía canónica e índice comercial; enlaces añadidos y diff PASS.
2. `skills_cotizacion_licitacion`: cinco pares de skills; paridad y links PASS, diferencias históricas de Pricing preservadas.
3. `audit_frontera_cotizaciones`: revisión read-only de renderer, autoría/persistencia/emisión canónicas, template runtime y gate de Proposal Studio; revisión final PASS después de corregir el ownership del documento histórico.

Fuentes verificadas: `scripts/documents/render-cotizacion-a4.mjs`; `src/lib/commercial/submit-quote-from-builder.ts`; `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`; `src/lib/commercial/quotation-issue-command.ts`; `src/lib/commercial/tenders/proposals/quote-gate.ts`. El módulo persiste `greenhouse_commercial.quotations`, items y versiones. El gate de Proposal Studio falla con `quote_missing`/`margin_unknown`; el documento local no lo reemplaza.

## Gates y límites

- `pnpm skills:mirrors`: PASS.
- Enlaces incorporados y ruta/skills/fuentes del nuevo router: PASS.
- `git diff --check` focal: PASS.
- Cierre documental focal: PASS, cero warnings. Contexto/handoff estricto: PASS, cero errores y warnings.
- `pnpm claude-md check`: presupuesto PASS (34.974 /35.000 tokens); content-loss global conserva **un orphan histórico ajeno a este cambio**. Es la línea de branding del baseline `27ce06a11:CLAUDE.md:623`, que exige logo Greenhouse in-app y entra en conflicto con la identidad vigente de octubre. Nuestro diff CLAUDE sólo cambia el ruteo de licitaciones. No restaurar la regla obsoleta ni modificar allowlists para hacer pasar este trabajo; conciliarla con su owner de branding en otro alcance.
- El auditor detectó doce links históricos a tasks antiguas en `pricing-comercial.md`; los nuevos links están resueltos. No se amplió este pedido a mantenimiento general del programa.
- HTML/PDF de UTEM y diseño fuente de la plantilla conservados. Copia de la guía actualizada en carpeta local OneDrive; sincronización remota no verificada.

No hay commit, push, publicación o rollout asociados a esta actualización documental.
