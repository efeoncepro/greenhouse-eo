# QA Release Audit — consolidación documental y skills del Cotizador V3

## Verdict

PASS

Closure state: complete (documentación y skills; motor local, economía y promoción separados).

## Scope

Pedido del operador: lanzar subagentes, actualizar toda la documentación y las skills relevantes a lo
construido y hacer commit. Baseline de esta revisión: `53d625880`; implementación local: `8ff088f64`;
[cierre previo](2026-10-09-pricing-v3-operating-workflow.md). Esta revisión contrasta contratos con código,
schemas, datos, CLI y pruebas actuales, conservando antecedentes fechados como evidencia histórica.

99 archivos propios: 32 de skills, 30 funcionales/manuales/data READMEs, 23 de arquitectura/modelos/servicios/tasks
y 14 de integración documental/contexto/índices/auditoría. Tres subagentes trabajaron con ownership separado: documentación funcional/manuales/data READMEs;
skills Codex/Claude; arquitectura/modelos/servicios/tasks. El agente principal revisó integración, rutas,
contexto, cobertura y verificación y realiza el commit explícito de archivos propios.

La unidad no modifica código, importes, catálogos JSON, Excel, snapshots, runtime canónico, CRM,
correo, contratos, inventario, permisos o proveedores. Se preservan cambios ajenos de marca,
follow-up comercial y assets Pibank presentes en el checkout compartido. No push ni deploy.

## Risk Classification

| Riesgo | Nivel | Criterio de cierre |
| --- | --- | --- |
| Instrucciones de agentes y semántica económica | Alto | Contratos y fórmulas contrastados con dominio, fuentes y estados reales |
| Rutas, espejos y evolución documental | Medio | Enlaces válidos, parity de skills y contexto dentro de presupuestos |
| Confundir prototipo con oferta o runtime aprobado | Alto | Separación explícita de cálculo, evidencia, aprobación y promoción |
| Checkout compartido | Medio | Paths propios explícitos y readback del commit |

## Injected Skills

- Codex `greenhouse-documentation-governor`: canon por dueño, ADR index, referencias, contexto y cierre.
- Codex `greenhouse-qa-release-auditor`: cobertura, evidencia proporcional y prevención de cierre falso.
- Codex/Claude `efeonce-pricing-operator`: workflow y mantenimiento completos, interpretación por el agente y cálculo por el dominio.
- Codex/Claude `greenhouse-finance-accounting-operator`: costo, caja, reparto y límites de evidencia.
- Codex `software-architect-2026` / Claude `arch-architect`: núcleo puro, adapters y futura API parity.
- Skills comerciales y de práctica actualizadas por el subagente responsable; cada dominio conserva sus aprobaciones y pisos.

## Cobertura de lo construido

| Superficie real | Contrato/documentación dueña | Adopción y límite |
| --- | --- | --- |
| Extracción del Excel y trazabilidad | `pricing:workbook`, manual histórico y ADR de workbook | Investigación histórica; Excel no es dependencia de cálculo V3 |
| Núcleo Decimal, localización, markup/margen, factores, FX, impuestos y redondeo | [Superficie implementada](../../documentation/finance/cotizador-v3-superficie-implementada.md), ADR local y contrato | País de talento y mercado distintos; desconocido no equivale a cero |
| Catálogo, variantes de consultor, selección, kits y calendario | Manual de catálogo y ADR de mantenimiento | 32 perfiles históricos; no nuevo salario vigente ni especialidad salarial inferida |
| Roles frente a servicio | Superficie, modelos de capacidad y servicios CRM/Creative Pod | Funciones internas vs fee del servicio; SOW y piso de práctica requieren revisión propia |
| Base común, herramientas por trabajo, usuarios y acceso | Policy/composer, manual de herramientas y workflow | Notion/M365 comunes; SEMrush, Adobe e IA según tarea; nominativos y mínimos contractuales |
| Adobe, Notion, planes públicos y procedencia | Datos/evidencias y READMEs operativos | Paquete Adobe sin Express doble; alza sin fecha condicional; factura no prueba pago; público no prueba contrato |
| Capacidad declarada y costos de plataforma | Portfolio/plan/inspect y manual operativo | Clientes, interno, sin asignar y residual reconciliados; ejemplo no es cartera real |
| Créditos IA y packs adicionales | ADR/créditos, planner y manual | Base atribuida, packs discretos, caja y vencimiento por proveedor; no compra ni reserva live |
| Licencias aportadas por el cliente | Composer y reference de agentes | Cobertura por línea/mes y evidencia; excepciones no eliminan base o crédito |
| Snapshots, explain, replay y comparación | Adapters, superficie y CLI | Artefactos congelados; no repricing con catálogo nuevo |
| Actualización monetaria y de policy/créditos | ADRs y manuales de mantenimiento | Preview/apply, base/context/impact digests, evidencia nueva, sucesor y rollback explícitos |
| Preparación, preguntas, readiness, preview y export | Workflow, schemas, CLI y guía de agentes | Needs-input/review vs rechazo; preview interno allowlisted; no aprobación o emisión |
| Promoción a API/UI/CLI/MCP | [Handoff canónico](../../documentation/finance/cotizador-v3-promocion-canonica.md) | Primitives V2 existentes; autoridad, audiencias, persistencia y rollout pendientes |
| Continuidad y discovery | AGENTS/CLAUDE, manifest, índices, tasks y data READMEs | Rutas selectivas al contrato vigente; antecedentes y TASK-2017 parcial preservados |

Cada capacidad deriva de archivos actuales bajo `src/lib/finance/pricing-v3/`,
`scripts/commercial/pricing-v3.ts` y `data/pricing/`. La referencia central y la skill contienen schemas,
operaciones y reglas observables; no un segundo motor escrito en prosa. Las referencias secundarias enlazan
la fuente dueña y conservan la evidencia original en lugar de reescribir simulaciones viejas.

## Evidence

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Regresión económica actual | PASS | `pnpm exec vitest run src/lib/finance/pricing-v3/__tests__/ src/lib/finance/pricing/__tests__/ --reporter=dot`: 213 pruebas / 17 archivos; ejecución nueva de esta revisión |
| CLI y ejemplos documentados | PASS | Nueve smokes nuevos: inspect=0, scaffold=2, portfolio/plan/quote/explain/replay/assess/preview=3; JSON parseado, stderr vacío, preview Markdown y artefacto0600 |
| Rutas y enlaces de documentación/skills | PASS scoped | Links locales de la unidad y links nuevos en macroíndices válidos; referencias antiguas TASK-463–468 reparadas. Links históricos ajenos en macroíndices se reportan separados |
| Espejos Codex/Claude | PASS | `pnpm skills:mirrors`; pricing SKILL y referencia V3 byte-identical; customer/architecture conservan estructuras distintas previas |
| Taxonomía/tasks, closure y contexto | PASS local | Task lint2017/2022 sin errores/warnings; ops lint0errores/19warnings ajenos preexistentes; closure completo y scoped estricto0warnings; context strict0errores/0warnings y CLAUDE bajo presupuesto |
| Alcance Git | Revisado | Selección explícita de99paths propios; todos documentación/skills y manifest de router. Commit sólo de esa selección y readback como cierre de entrega |

Las 26 operaciones previas y las verificaciones previas de types/lint/runtime no se atribuyen a este
nuevo turno. No se vuelve a validar una tarifa pública como contrato actual. Esta revisión no requiere
nuevos tipos/build/deploy: sólo cambia documentación e instrucciones; sí revisa su conformidad con el motor.

### Readback de ejemplos y alcance de gates

Los comandos del [manual operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) se ejecutaron
con `catalog.review-v2.json`, `resources.review-v2.json` y `ai-credits.review-v1.json`, creando demanda, artefacto
y preview en directorio temporal nuevo. Se leyeron archivos y permisos: artefacto/preview0600; semantic y
`replayDigest` iguales a `designer.artifact.json`:
`50c9dbe7ec6e58c03f62c9be13ee94f2e9034ae4443fbdf5d3266c248cef6dd1`. El timestamp de ejecución es nuevo;
no se afirma igualdad byte de todo el archivo. JSON limpio corresponde a las ocho salidas estructuradas;
el noveno comando solicita Markdown. Exit3 significa revisión, no fallo ni aprobación.

`pnpm qa:gates --changed --agent codex --docs -- <paths propios>` se revisó como diagnóstico advisory.
Sus sugerencias de integración no implican cambios de Teams/HubSpot/Vercel: sólo rutas documentales.
La nota del helper sobre auditor Finance ausente en Claude está desactualizada frente a la skill espejo
existente que se verificó. La aprobación financiera sigue fuera de este cierre documental.
`pnpm docs:closure-check` ejecuta sus gates completos; el scope estricto usa directamente
`node scripts/check-documentation-closure.mjs --strict -- <paths propios>`, porque argumentos al script
compuesto de pnpm llegan al último proceso. No confundir éxito global con aplicación del scope solicitado.
El gate de contexto se ejecuta después de la última edición y closure; el presupuesto Claude se verifica aparte.

### Revisados sin cambios y advertencias ajenas

`efeonce-agency` ya enruta pricing/business/customer. `efeonce-agent-seo-aeo`, `higgsfield-provider`,
`efeonce-mcp-platform`, Payroll y Legal mantienen ejecución, compra, autoridad y contratos propios: no se
incorpora un workflow comercial allí por coincidencia de proveedor. Canon V2/API parity y primitives de
simulación, redacción y emisión fueron leídos; no se altera autoridad o lifecycle. Excel, JSON y snapshots
históricos permanecen intactos. No se reescriben auditorías previas como si fueran ejecuciones nuevas.

Los macroíndices generales `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` contienen54destinos históricos
preexistentes ausentes o placeholders `url`, fuera del bloque pricing; el contraste con HEAD confirma que
ninguno se introdujo aquí. Se comprobaron las rutas nuevas/cambiadas y todos los links del conjunto específico
V3. El lint operativo conserva19warnings de registry/epic-child ajenos. No se corregirá otra unidad para
silenciar un gate. La frescura informativa de fichas AI tampoco acredita ni bloquea esta unidad sin generación.

## Blockers

Ninguno para esta consolidación documental. Los datos comerciales pendientes conservan sus owners;
no son una aprobación tácita ni se rellenaron durante la revisión.

## Conditional Follow-Ups

[Pendientes operativos](../../../data/pricing/v3-operating/operational-gaps.json): salarios y coberturas locales,
costos medidos de Assurance/operación, capacidad/acceso/seats, planes reales, fecha Adobe, factores,
márgenes/precio/SOW, impuestos y entidad. TASK-2017 continúa parcial; TASK-2022 conserva cierre local.
La propuesta genérica V3 de margen 40%/35% no reemplaza el piso aprobado 45% de Creative y SEO Practice.
Promover el motor canónico requiere unidad formal y los gates del handoff, sin fórmulas por consumer.

## False-Closure Traps Checked

- Pruebas verdes no certifican tarifas, permisos, inventario, contratos o API parity remota.
- Sin cambios UI: no hay claim de QA visual ni necesidad de captura de UI para esta unidad documental.
- Sin env/flags/migraciones o procesos remotos: no hay rollout encubierto por el cierre local.
- Historia y lifecycle: nuevas referencias no reabren ni convierten tareas históricas en pendientes terminados.
- Fuentes fechadas: capturas, declaración del operador, factura, histórico y tarifa pública conservan alcance.
- Skills espejo: diferencias previas intencionales se mantienen; no se afirma identidad de paquetes que difieren.
- Cambios ajenos: ninguna edición a La órbita, follow-up comercial o assets Pibank entra en este commit.

## Final Call

La documentación y las skills adoptan el flujo local construido y sus contratos completos, con evidencia
del motor y la CLI y con pendientes económicos y de promoción explícitos. La entrega se cierra con commit
de los paths propios; no concede aprobaciones ni escribe sistemas externos.
