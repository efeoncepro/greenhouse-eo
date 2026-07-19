# Greenhouse Agent Context Router Decision V1

## Status

Accepted — 2026-07-19, por instrucción explícita del operador.

- **Modo:** migración de context engineering / developer tooling para un sistema agéntico.
- **Arquetipo primario:** Agentic AI system; secundarios: Developer tool/CLI y operating-system-of-the-business.
- **Reversibilidad:** two-way-but-slow. Los snapshots permiten restaurar los cuatro roots; volver al modelo
  append-only es posible pero reintroduce el problema medido.
- **Confidence:** High para la separación y los budgets iniciales; Medium para que todos los dominios estén
  perfectamente clasificados desde el primer día, mitigado por fallback + corrección del router.
- **Validated as of:** 2026-07-19, contra archivos, scripts, skills, índices y working tree locales. No hubo
  stack/vendor/pricing/compliance claims que requirieran investigación externa.

## Contexto

Los archivos de arranque creados para continuidad multi-agente se convirtieron en stores append-only:

- `Handoff.md`: 39.325 líneas, 1.357 sesiones y ~1,04 M tokens estimados;
- `project_context.md`: 6.527 líneas y ~169 k tokens;
- `AGENTS.md`: 1.886 líneas y ~58 k tokens.

La acumulación preservaba texto pero degradaba el objetivo original: las fuentes vigentes quedaban enterradas,
el orden del handoff dejó de ser confiable, aumentaban conflictos concurrentes y ningún agente podía consumir
el corpus completo de forma estable. Borrar o resumir sin red de seguridad tampoco era aceptable: podía perder
reglas load-bearing, decisiones, pendientes o evidencia histórica.

`CLAUDE.md` ya tiene un refactor y CI independientes. Esta decisión no modifica ese archivo ni su governance.

## Decisión

Greenhouse adopta un modelo de contexto **router-first, load-on-demand y con preservación verificable**:

1. **Bootstrap**
   - `AGENTS.md` conserva reglas transversales, preflight, loop, gates y un router por dominio.
   - El detalle específico vive en specs, ADRs, `agent-invariants/*`, operations y skills repo-tracked.
2. **Estado vigente**
   - `project_context.md` es un snapshot durable y pequeño; no acepta diarios ni `## Delta YYYY-MM-DD`.
   - `Handoff.md` es cabina activa con estado, riesgos, pendientes y máximo 20 sesiones.
3. **Historia**
   - Tasks, issues, ADRs, commits, arquitectura y changelog siguen siendo evidencia canónica.
   - `Handoff.archive.md` es índice; los archivos históricos viven bajo
     `docs/operations/agent-context-history/` y se buscan por keyword.
4. **No pérdida**
   - Antes del primer corte se preservan los cuatro archivos completos byte-for-byte.
   - Un manifest versionado guarda SHA-256, líneas y caracteres; el gate estricto recalcula todo.
   - El router declara un fallback explícito al snapshot legado cuando la ruta canónica no resuelve una duda.
5. **Anti-reacreción**
   - `pnpm docs:context-check:strict` verifica presupuestos, sesiones, targets del router e integridad.
   - `pnpm docs:context-rotate --apply` conserva las sesiones más recientes por fecha, mueve excedentes a
     archivos mensuales idempotentes, enlaza cada shard desde el índice y aborta si detecta una edición
     concurrente del handoff.
   - Un workflow CI independiente ejecuta el gate cuando cambian estos contratos.
   - Claude conserva su `CLAUDE.md` y CI independientes: el pointer existente lleva al operating model, mientras
     `.claude/commands/implement-task.md` y su documentation governor aplican carga, fallback y cierre. El gate
     verifica esos pointers sin modificar ni duplicar `CLAUDE.md`.

## Presupuestos V1

| Archivo activo       |                                   Techo |
| -------------------- | --------------------------------------: |
| `AGENTS.md`          |                 20.000 tokens estimados |
| `project_context.md` |                 12.000 tokens estimados |
| `Handoff.md`         | 12.000 tokens, 600 líneas y 20 sesiones |
| `Handoff.archive.md` |                            2.000 tokens |

La estimación usa `ceil(chars / 4)`, igual que el gate documental existente. Los techos son límites, no metas
de relleno: agregar contexto solo se justifica si es transversal y accionable.

## Protocolo de recuperación

Cuando un agente no encuentra una regla:

1. revisa spec/ADR/task, código, schema y runtime;
2. busca por keyword en arquitectura, operations y skills;
3. busca por keyword en el snapshot legado, sin cargarlo completo;
4. contrasta la evidencia histórica;
5. mueve la regla vigente a su dueño canónico y actualiza el router.

El snapshot permite recuperar texto; no puede imponerse sobre una decisión o runtime posterior.

## Alternativas consideradas

### Mantener los monolitos y confiar en búsqueda

Rechazada. `rg` ayuda a investigar, pero no corrige el costo de arranque, la contaminación con estados stale ni
los conflictos append-only.

### Borrar historia y dejar un resumen humano

Rechazada. Reduce tamaño pero rompe trazabilidad y hace imposible probar que no se perdió una regla.

### Mover todo a un único archivo archive

Rechazada como patrón futuro. Resuelve el auto-load, pero mantiene conflictos y un nuevo monolito. El corte
legado puede permanecer como snapshot inmutable; el archivo incremental se divide por mes.

### Router sin snapshot ni manifest

Rechazada. Depende de que la primera curaduría sea perfecta y no ofrece recuperación ante una omisión.

## Consecuencias

### Positivas

- Menor costo y mejor adherencia en cada arranque.
- Contexto específico más rico porque se carga la fuente dueña del dominio, no un resumen stale global.
- Historia completa y auditable con integridad verificable.
- Menos conflictos concurrentes en archivos raíz.
- Gate ejecutable que previene la regresión.
- Shards incrementales con hash por sesión e índice explícito, verificables sin cargar el archivo completo.

### Costos y riesgos

- El agente debe cumplir el router; saltarse la fila de dominio puede dejarlo subcontextualizado.
- Un target puede quedar stale; el checker valida existencia y el cierre debe validar vigencia semántica.
- El snapshot legado es grande, pero no participa del arranque y es inmutable.

## Rollback

1. Verificar hashes del manifest.
2. Restaurar los snapshots a sus cuatro paths raíz.
3. Retirar temporalmente el workflow `agent-context-governance.yml` o elevar budgets mientras se corrige el
   contrato.
4. Conservar este ADR y el manifest como evidencia de por qué ocurrió el rollback.

No se requiere migración de datos, deploy, feature flag ni coordinación con runtimes externos.

## Self-critique

- **Qué puede romper en 12 meses:** el router puede apuntar a docs existentes pero semánticamente stale, o un
  dominio nuevo puede no registrarse. Mitigación: manifest machine-readable, revisión en cierre y corrección
  obligatoria cuando el fallback sea usado.
- **Qué puede romper en 36 meses:** 20 dominios pueden convertirse en 50 y el router volver a crecer. Condición
  de revisit: >20 k tokens o más de 10% de trabajos que requieran fallback; entonces agrupar routers por
  capability o adoptar carga diferida nativa del harness.
- **Cognitive debt:** un router demasiado breve puede esconder el “por qué”. Mitigación: ADR, modelos
  operativos, sources exactas, snapshots y colas formales; una persona nueva puede reconstruir el sistema sin
  leer un millón de tokens.
- **Lock-in:** bajo. Markdown, JSON, SHA-256 y Node estándar son portables; no hay proveedor nuevo.
- **Fallo silencioso:** no se observa directamente si un agente omite cargar la fila correcta. El gate prueba
  estructura/integridad, no obediencia semántica. Mitigación: hooks de task/issue, QA auditor y revisión de
  falsos cierres; futura telemetría de context loading solo si el harness la expone sin invadir privacidad.
- **Riesgo AI específico:** una instrucción histórica puede estar superseded o contener contexto engañoso.
  Los snapshots nunca son auto-load ni source of truth; todo hallazgo se contrasta con runtime/canon.
- **Seguridad/compliance:** no cambia auth, PII, secrets ni data residency. El snapshot conserva material ya
  versionado; no autoriza agregar secretos o payloads sensibles a handoffs futuros.

## Evidencia de migración

- Índice: `docs/operations/agent-context-history/2026-07-19/README.md`.
- Manifest: `docs/operations/agent-context-history/2026-07-19/manifest.json`.
- Gate: `scripts/check-context-handoff.mjs`.
- Rotación: `scripts/maintenance/rotate-handoff-context.mjs`.
- CI: `.github/workflows/agent-context-governance.yml`.

## Revisit when

- un agente falla por falta de contexto que sí existía en el snapshot;
- dos o más dominios carecen de target canónico en el router;
- los budgets impiden una regla verdaderamente transversal;
- el harness ofrece carga diferida nativa de instrucciones repo-level para todos los agentes.
