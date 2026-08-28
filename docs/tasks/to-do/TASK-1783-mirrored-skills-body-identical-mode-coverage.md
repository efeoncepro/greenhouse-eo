# TASK-1783 — El validador de espejos sólo sabe comparar byte a byte, y por eso no mira las skills que no pueden serlo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm skills:mirrors` valida 16 skills espejadas `.claude/` ↔ `.codex/` en un único modo,
`byte-identical`. Ese modo no admite las skills cuyo contrato **prohíbe** ser byte-idénticas —
frontmatter propio de cada agente y `references/` deliberadamente unilaterales— así que esas skills
quedan fuera del manifiesto y **nadie verifica su espejo**. `dataforseo-operator` es el caso que
destapó el hueco, pero no es el único: hay 77 skills presentes en los dos árboles fuera del
manifiesto, y **32 de ellas ya tienen divergencia real de cuerpo**. Esta task agrega el modo
`body-identical`, define el criterio de admisión al manifiesto y hace que la ausencia de una skill
espejada sea detectable en vez de invisible.

## Why This Task Exists

El script existe con una tesis escrita en su propio encabezado: *"Un espejo que nadie valida diverge
en silencio"*. Sus comentarios documentan cinco casos donde eso ya costó caro — una skill de
contratación que le describía al agente de Codex una cuota de recuperación de acceso que el código
aplica al revés, y le habría escondido a un candidato sin acceso la única salida que le quedaba; una
skill comercial cuya copia `.codex` afirmaba que el AEO de un cliente real iba regalado cuando está
contratado y pagado; una skill de ejecución con un pointer que resolvía a un directorio inexistente,
lo que no falla con error sino que produce el entregable sin el canon.

**El script atrapa exactamente los espejos que ya alguien decidió registrar, y ninguno más.** Su
cobertura no se deriva de la realidad del repo: se deriva de una lista escrita a mano. Y la lista no
puede crecer hacia el caso más común, porque el único modo disponible es incompatible con la forma
que tienen la mayoría de las skills.

**La incompatibilidad es estructural, no un descuido de `dataforseo-operator`.** Dos asimetrías son
convención del repo, no drift:

- `references/` sólo del lado Claude — **45** skills `.claude` tienen ese directorio. En
  `dataforseo-operator` es regla declarada, escrita dos veces: en `.claude/rules/growth-seo.md`
  ("Sus `references/` canónicas viven SOLO bajo `.claude/skills/dataforseo-operator/references/`") y
  en el cuerpo de la propia skill ("ambos agentes las leen de ahí; no duplicarlas — anti-drift").
- `agents/*.yaml` sólo del lado Codex — **47** skills `.codex` tienen ese directorio.
  `dataforseo-operator` tiene `agents/openai.yaml`, que no tiene ni debe tener contraparte Claude.

A eso se suma el frontmatter, que es namespace de cada agente por definición: la copia `.claude` de
`dataforseo-operator` lleva `argument-hint` y la línea de `Triggers` que hace que la skill se cargue;
la `.codex` no. Y ese detalle ya se cobró una víctima registrada en el propio manifiesto: en
`copywriting`, la única divergencia era el frontmatter, y era la que más dolía — sin `argument-hint`
ni triggers, *"la skill simplemente NO SE CARGA"* y el agente escribía copy firmado sin el sistema de
voz del autor, sin saber que existía.

**Por eso `byte-identical` no es una restricción más estricta, es la restricción equivocada para este
caso.** Exigirle a `dataforseo-operator` que sea byte-idéntica obligaría a duplicar las `references/`
—rompiendo la regla anti-drift que la propia skill declara— o a colapsar los dos frontmatter en uno,
degradando el de Claude. Las dos "soluciones" empeoran el repo. La salida correcta es que el
validador aprenda a comparar **lo que sí es contrato compartido**: el cuerpo después del frontmatter,
ignorando los directorios que pertenecen a un solo agente.

**Cómo se detectó, y por qué eso es parte del problema.** `TASK-1696` tocó `dataforseo-operator` y
hubo que verificar el espejo **a mano**, con un `diff` del cuerpo sin frontmatter. Dio idéntico —
**esta vez**. Un espejo que se sostiene porque alguien se acordó de mirarlo no está validado: está de
suerte. Y la suerte se acaba, que es literalmente la tesis del script.

**El alcance medido (primera pasada, método explícito para poder refutarlo):** de las 110 skills
`.claude` y 105 `.codex`, **93 existen en los dos árboles**; el manifiesto cubre **16**, así que
quedan **77 fuera**. Comparando archivo por archivo, ignorando frontmatter en los `.md`: **33** ya son
byte-idénticas (candidatas inmediatas), **2** difieren sólo en frontmatter, y **32 tienen divergencia
real de cuerpo** — entre ellas `greenhouse-payroll-auditor` (4 archivos), `hubspot-solutions-partner`
(6), `greenhouse-production-release`, `greenhouse-documentation-governor`, `legal-privacy-ip-operator`
y `greenhouse-qa-release-auditor`. Esa medición es un piso: no distingue una divergencia sustantiva de
una cosmética, y la task debe re-derivarla con el validador nuevo antes de decidir a quién admitir.

**Lo que esta task NO es: agregar 77 entradas.** El manifiesto declara su propia disciplina — *"Keep
the manifest intentionally small: an entry means the two complete bundles are a shared contract, not
merely similarly named skills"*. Meter las 77 lo convierte en un inventario de directorios y lo vacía
de significado. El entregable es el **criterio de admisión** más el mecanismo que hace visible a quién
le falta, para que la próxima skill de dominio no vuelva a quedar afuera por omisión.

## Goal

- El validador soporta un modo `body-identical` que compara el cuerpo tras el frontmatter e ignora los
  paths declarados como propios de un agente, sin aflojar la exigencia sobre lo que sí es compartido.
- `dataforseo-operator` queda validada, con su frontmatter propio y sus `references/` unilaterales
  intactos.
- Existe un criterio de admisión al manifiesto, escrito y aplicable, que distingue un espejo que es
  contrato compartido de dos directorios con el mismo nombre.
- La ausencia de una skill del manifiesto deja de ser invisible: el propio script reporta las skills
  presentes en ambos árboles que nadie declaró ni excluyó.
- Las skills de dominio que hoy divergen quedan admitidas tras reconciliarse, o excluidas con razón
  escrita — ninguna queda en el limbo de "existe en los dos lados y nadie mira".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `AGENTS.md` — convivencia de namespaces de agente (Claude / Codex) y qué es compartido

Reglas obligatorias:

- El frontmatter es namespace de cada agente y **NUNCA** se colapsa: es lo que decide si la skill se
  carga, y degradarlo apaga la skill sin error visible.
- Las `references/` de `dataforseo-operator` viven **SOLO** bajo `.claude/skills/`. Duplicarlas para
  satisfacer al validador reintroduce el drift que esa regla existe para evitar
  (`.claude/rules/growth-seo.md` y el cuerpo de la propia skill).
- Los directorios `agents/` del lado Codex son namespace de ese agente y no exigen contraparte.
- El manifiesto se mantiene pequeño **a propósito**. Admitir una skill es una decisión con razón
  escrita, igual que hoy: cada entrada vigente lleva su comentario explicando qué se rompe si diverge.
- Un modo nuevo no puede aflojar el existente: las 16 entradas `byte-identical` siguen exigiendo
  igualdad byte a byte, incluido su frontmatter.

## Normative Docs

- `scripts/skills/validate-mirrored-skills.mjs` — manifiesto vigente, sus 16 entradas y los comentarios
  que documentan qué costó cada drift.
- `.claude/rules/growth-seo.md` — regla anti-drift de las `references/` de `dataforseo-operator`.
- `.claude/skills/dataforseo-operator/SKILL.md` — la misma regla declarada dentro de la skill.

## Dependencies & Impact

### Depends on

- `scripts/skills/validate-mirrored-skills.mjs` — el validador y su manifiesto.
- `package.json` → `skills:mirrors`, encadenado en `pnpm local:check` (y por lo tanto en el hook de
  pre-push y en CI).
- Los pares `.claude/skills/<id>/` ↔ `.codex/skills/<id>/` de las skills candidatas.

### Blocks / Impacts

- `TASK-1626` (`in-progress`, MCP Platform Gateway) — **declara `Files owned` sobre
  `scripts/skills/validate-mirrored-skills.mjs`**, pero por haber agregado su propia entrada
  (`efeonce-mcp-platform`). Partición declarada: **1626 posee una ENTRADA del manifiesto (dato); 1783
  posee el MECANISMO del validador (modos, criterio de admisión, detección de cobertura)**. El orden se
  coordina con esa task para no chocar en el mismo archivo; ninguna de las dos toca la entrada de la
  otra.
- `pnpm local:check`, y por transitividad el hook de pre-push: admitir skills divergentes sin
  reconciliarlas primero rompe el push de cualquier agente.
- Toda skill de dominio espejada: al aparecer la lista de no declaradas, se vuelve visible una deuda
  que hoy no se ve.

### Files owned

- `scripts/skills/validate-mirrored-skills.mjs`
- `scripts/skills/validate-mirrored-skills.test.ts` (nuevo — self-tests del validador)
- Los pares `.claude/skills/<id>/` ↔ `.codex/skills/<id>/` de las skills que la task reconcilie, sólo
  en el archivo que se reconcilia y sólo para eliminar la divergencia

## Current Repo State

### Already exists

- `scripts/skills/validate-mirrored-skills.mjs` con manifiesto de 16 entradas, comparación por
  `sha256` archivo a archivo y detección de archivo presente en un solo espejo.
- El campo `mode` ya existe en cada entrada y el script ya rechaza explícitamente cualquier valor
  distinto de `byte-identical` (`unsupported mirror mode`) — el punto de extensión está previsto.
- `pnpm skills:mirrors` encadenado en `pnpm local:check`.
- Convención estable de asimetría por namespace: 45 skills `.claude` con `references/`, 47 skills
  `.codex` con `agents/`.
- `dataforseo-operator` con cuerpo idéntico verificado a mano el 2026-08-27, frontmatter divergente por
  contrato, `references/` sólo en `.claude` y `agents/openai.yaml` sólo en `.codex`.
- Precedente de self-tests para scripts de CI: `scripts/ci/epic-child-parity.test.ts`,
  `scripts/lib/e2e-smoke-navigation-contract.test.ts`.

### Gap

- Un solo modo de comparación, incompatible con la forma que tiene la mayoría de las skills.
- Ningún criterio escrito de admisión al manifiesto: entrar depende de que alguien se acuerde.
- Ninguna detección de cobertura: una skill presente en los dos árboles y ausente del manifiesto no
  produce ninguna salida, ni siquiera informativa.
- El validador no tiene tests. La comparación de digests es correcta hoy, pero un modo nuevo sin red
  puede aflojar el existente sin que nada lo delate.
- 77 skills en ambos árboles fuera del manifiesto, 32 de ellas ya con divergencia de cuerpo.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/skills/validate-mirrored-skills.mjs`, ejecutado por `pnpm skills:mirrors` dentro de `pnpm local:check`
- Future candidate home: `remain-shared`
- Boundary: el validador es lector puro de `.claude/skills/**` y `.codex/skills/**`; su contrato de salida son la lista de fallas y el exit code, y su consumidor autorizado es `local:check`
- Server/browser split: `n/a` — script Node de CI, jamás importado por runtime de Vercel ni de Cloud Run
- Build impact: `none` — sigue usando `node:crypto` y `node:fs`, sin dependencias nuevas
- Extraction blocker: `none` — depende sólo del árbol del repo

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: los pares de directorios `.claude/skills/<id>/` y `.codex/skills/<id>/`; el manifiesto declara cuáles son contrato compartido
- Consumidores afectados: `pnpm local:check` (hook de pre-push y CI) y los agentes que cargan las skills
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: exit code `1` con la lista de fallas, `0` con la línea de skills validadas; las 16 entradas `byte-identical` conservan su semántica exacta
- Contrato nuevo o modificado: el campo `mode` acepta `body-identical`, y cada entrada de ese modo declara qué paths pertenecen a un solo agente
- Backward compatibility: `compatible` — `byte-identical` no cambia; el modo nuevo es aditivo
- Full API parity: `N/A — no capability`. Es tooling de repo: no expone acción de negocio, no muta estado y no tiene consumidor UI, MCP ni Nexa

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. No toca PostgreSQL ni BigQuery
- Invariantes que no se pueden romper:
  - El validador es read-only sobre los dos árboles de skills; **NUNCA** reescribe una skill para hacerlas coincidir
  - `byte-identical` sigue comparando bytes, frontmatter incluido, para sus 16 entradas
  - `body-identical` ignora **sólo** el frontmatter y los paths declarados por namespace; todo lo demás se compara byte a byte
  - Un path ignorado se declara explícito por entrada; **NUNCA** una regla global que exima `references/` o `agents/` en todo el manifiesto, porque eso apagaría la validación de esos archivos donde sí son compartidos
  - Admitir una skill exige reconciliarla primero: el manifiesto nunca registra un par que el validador dejaría rojo
- Write-target allowlist: `N/A` — la task no introduce destinos de escritura
- Tenant/space boundary: `N/A` — herramienta de repo, sin tenant
- Idempotency/concurrency: el validador es puro respecto del árbol; dos corridas sobre el mismo commit dan el mismo resultado
- Audit/outbox/history: `none` — la trazabilidad la da el comentario de cada entrada del manifiesto

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: el modo nuevo nace sin entradas; las admisiones se agregan una a una, cada una con su skill ya reconciliada y su razón escrita
- Backfill plan: la lista de skills no declaradas nace **informativa** (no falla el build). Endurecerla a bloqueante sólo si el saldo de skills de dominio sin decisión llega a cero, y sólo si el operador lo aprueba
- Rollback path: `revert PR` — el validador vuelve al modo único y el manifiesto a sus 16 entradas
- External coordination: ninguna fuera del repo; sí coordinación con `TASK-1626` por el mismo archivo

### Security and access

- Auth/access gate: `N/A` — corre en local y en CI con el mismo permiso que hoy
- Sensitive data posture: `no sensitive data`. Compara archivos de documentación de skills; no lee secretos ni credenciales. Si una skill contuviera un secreto, el validador **NUNCA** debe imprimir contenido: reporta rutas y el hecho de la divergencia, jamás el diff
- Error contract: una skill declarada con directorio ausente sigue fallando explícito (`mirror directory missing`), nunca en silencio
- Abuse/rate-limit posture: `N/A`

### Runtime evidence

- Local checks: `pnpm vitest run scripts/skills/validate-mirrored-skills.test.ts`, `pnpm skills:mirrors`
- DB/runtime checks: `N/A` — la task no toca base de datos
- Integration checks: `pnpm local:check` completo, que es donde el gate corre de verdad
- Reliability signals/logs: `N/A` — el validador no emite señales; su salida es la lista de fallas
- Production verification sequence: `N/A — repo-only tooling`. No hay despliegue: el efecto es sobre el gate local y de CI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Red de tests del validador, escrita contra el defecto

- `scripts/skills/validate-mirrored-skills.test.ts` con el comparador extraído y exportado desde el
  script (hoy el bucle vive suelto en el módulo).
- Casos que deben quedar ROJOS antes del Slice 2: un par cuyo cuerpo es idéntico y su frontmatter no,
  con `references/` de un lado y `agents/` del otro, hoy no admisible en ningún modo.
- Casos que deben seguir VERDES: las 16 entradas vigentes en `byte-identical`, incluida la detección de
  archivo presente en un solo espejo y la de directorio ausente.
- Caso de no-aflojamiento: una divergencia de frontmatter en una entrada `byte-identical` sigue siendo
  falla.

### Slice 2 — Modo `body-identical`

- Comparación que separa frontmatter YAML del cuerpo en los `.md` y compara sólo el cuerpo; el resto de
  los archivos se siguen comparando byte a byte.
- Cada entrada de este modo declara sus paths por namespace (por ejemplo `references/` del lado Claude,
  `agents/` del lado Codex) y esos paths quedan fuera de la comparación de sets, pero **sin** exención
  global: lo declarado es por entrada.
- Un archivo compartido que existe en un solo lado sigue siendo falla, salvo que caiga bajo un path
  declarado por namespace.
- El mensaje de falla dice qué modo se aplicó y qué se comparó, para que quien lo lea no crea que se
  comparó más de lo que se comparó.

### Slice 3 — `dataforseo-operator` admitida, con su razón escrita

- Entrada nueva en el manifiesto, en modo `body-identical`, con el comentario que explica qué se rompe
  si diverge — el mismo estándar que las 16 vigentes.
- La regla anti-drift de las `references/` queda declarada en la entrada, para que la próxima persona
  no "arregle" la asimetría duplicándolas.
- `pnpm skills:mirrors` valida la skill sin que nada del par haya tenido que degradarse.

### Slice 4 — Detección de cobertura y criterio de admisión

- El script reporta las skills presentes en `.claude/skills/` y `.codex/skills/` que no están en el
  manifiesto ni en una lista de exclusión explícita. Nace **informativo**, no bloqueante.
- Lista de exclusión con razón por entrada, para las skills que legítimamente no son contrato
  compartido (bundles de terceros o vendored, skills de un solo agente que casualmente comparten nombre).
- Criterio de admisión escrito en el encabezado del script, junto a la disciplina de manifiesto pequeño
  que ya declara: qué hace que un par sea contrato compartido y no dos directorios homónimos.
- Inventario re-derivado con el validador nuevo (no con `diff` a mano): cuántas skills quedan fuera,
  cuántas divergen y cuáles son de dominio Greenhouse/Efeonce.

### Slice 5 — Decisión sobre las skills de dominio que hoy divergen

- Para cada skill de dominio Greenhouse/Efeonce con divergencia de cuerpo que el Slice 4 liste, una de
  dos salidas, nunca el limbo: reconciliar y admitir, o excluir con razón escrita.
- La reconciliación se hace archivo por archivo y se declara qué copia mandó y por qué. Una divergencia
  de cuerpo puede ser una copia vieja **o** una corrección que sólo un lado recibió; asumir cuál sin
  mirar es cómo se pierde trabajo.
- Se prioriza por daño: las skills que gobiernan dinero, personas, producción o compromisos con
  clientes van primero.

## Out of Scope

- **No** se agregan las 77 skills al manifiesto. El manifiesto es pequeño por decisión declarada, y
  convertirlo en un inventario de directorios lo vacía de significado.
- **No** se duplican las `references/` al lado Codex ni se colapsan los dos frontmatter en uno. Las dos
  cosas empeoran el repo y contradicen reglas vigentes.
- **No** se reescribe el contenido de ninguna skill más allá de lo estrictamente necesario para
  eliminar una divergencia declarada en el Slice 5. Mejorar una skill es otro trabajo.
- **No** se toca `scripts/skills/validate-skill-routes.mjs` ni `motion-overlay-guard.mjs`: son gates
  vecinos con otro objeto.
- **No** se resuelve el destino de las skills de terceros o vendored (`wp-*`, `hyperframes*`, `gsap`,
  `wpds`): entran a la lista de exclusión con razón, no a un análisis de contenido.
- **No** se endurece la lista de no declaradas a bloqueante en esta task salvo que el Slice 5 llegue a
  saldo cero y el operador lo apruebe.

## Detailed Spec

**El defecto no es que falte una entrada: es que el mecanismo no admite la forma de la mayoría.** Si la
respuesta fuera "agrega `dataforseo-operator` al manifiesto", el script la rechazaría — sus
`references/` existen de un solo lado y su frontmatter difiere, así que `byte-identical` la deja roja
el primer día. Por eso el orden importa: primero el modo, después la entrada. Una task que sólo agrega
la entrada no compila con la realidad del repo.

**La forma exacta del par, verificada (2026-08-27):**

```
.claude/skills/dataforseo-operator/     .codex/skills/dataforseo-operator/
  SKILL.md            ← cuerpo idéntico → SKILL.md          (frontmatter distinto)
  references/*.md  (9 archivos)             agents/openai.yaml
```

El cuerpo de `SKILL.md` tras el frontmatter es idéntico byte a byte. El frontmatter de `.claude` lleva
`argument-hint` y la línea de `Triggers`; el de `.codex` no. Las nueve `references/` son unilaterales
por regla declarada; `agents/openai.yaml` es unilateral por namespace de Codex.

**Por qué la exención tiene que ser por entrada y no global.** La tentación es hacer que el validador
ignore siempre `references/` y `agents/`. Sería un error: hay skills donde esos directorios **sí** son
compartidos, y una exención global apagaría su validación sin que nadie lo note — el mismo defecto que
esta task cierra, movido un nivel más arriba. La declaración por entrada obliga a decidir caso por
caso y deja la decisión escrita.

**Por qué el frontmatter no se compara pero tampoco se ignora.** No comparar el frontmatter no
significa que dé lo mismo: el caso `copywriting` del propio manifiesto demuestra que un frontmatter
degradado apaga la skill en silencio. Lo que corresponde es no exigir **igualdad** entre agentes, que
tienen contratos de carga distintos. Si más adelante hace falta, la validación de que cada frontmatter
esté completo **en su propio dialecto** es un chequeo distinto, y va como follow-up — no se mezcla acá.

**Sobre la lista de no declaradas.** Nace informativa a propósito. Con 77 skills fuera y 32
divergentes, hacerla bloqueante el primer día rompe el pre-push de todos los agentes por deuda que la
propia task recién destapó. La secuencia sana es: hacerla visible, decidir las de dominio, y recién
entonces evaluar el endurecimiento.

**Sobre las 32 divergencias de cuerpo.** No hay que asumir que todas son "la copia Codex quedó vieja".
El manifiesto documenta al menos un caso donde la copia versionada estaba **más vieja** que la que el
agente realmente cargaba (`seo-aeo`, que ni siquiera tenía copia `.claude` en git). Cada
reconciliación del Slice 5 exige mirar las dos, no elegir por costumbre.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tests) → Slice 2 (modo) → Slice 3 (`dataforseo-operator`) → Slice 4 (cobertura + criterio)
  → Slice 5 (decisión sobre las divergentes).
- **Slice 1 va PRIMERO y su caso del defecto debe quedar ROJO antes del Slice 2.** Un test escrito
  después del modo demuestra que el modo funciona, no que el hueco existía.
- **Slice 2 DEBE cerrar antes del Slice 3.** Registrar `dataforseo-operator` sin el modo la deja roja y
  rompe `pnpm local:check` de cualquier agente que haga push.
- **Slice 4 DEBE cerrar antes del Slice 5.** Sin el inventario re-derivado por el validador, la decisión
  del Slice 5 se toma sobre una medición hecha a mano.
- **Ninguna skill entra al manifiesto sin estar reconciliada primero.** El manifiesto no registra
  aspiraciones: cada entrada tiene que dejar el gate verde el mismo commit en que se agrega.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Registrar una skill divergente rompe `local:check` y con él el pre-push de todos los agentes | CI / hook de pre-push | high | Ninguna entrada se agrega sin reconciliar; el commit que la agrega deja el gate verde | `pnpm skills:mirrors` rojo en `develop` |
| El modo nuevo afloja `byte-identical` por refactor compartido | CI / gate de espejos | medium | Test de no-aflojamiento en el Slice 1: divergencia de frontmatter en una entrada byte-identical sigue siendo falla | Una divergencia conocida deja de reportarse |
| Exención global de `references/`/`agents/` en vez de por entrada, apagando validación donde sí son compartidos | CI / gate de espejos | medium | Invariante explícito: los paths por namespace se declaran por entrada; test que lo ejercita | El manifiesto deja de nombrar paths por entrada |
| Reconciliar en la dirección equivocada y perder una corrección que sólo un lado tenía | Skills de dominio (payroll, release, legal, comercial) | medium | El Slice 5 exige mirar las dos copias y declarar cuál mandó y por qué; se prioriza por daño | Una skill pierde una regla que estaba documentada de un lado |
| Chocar con `TASK-1626` en el mismo archivo | Coordinación entre tasks | medium | Partición declarada: 1626 posee su ENTRADA, 1783 posee el MECANISMO; se coordina el orden | Conflicto de merge en `validate-mirrored-skills.mjs` |
| Endurecer la lista de no declaradas antes de tiempo | CI / hook de pre-push | low | Nace informativa; el endurecimiento exige saldo cero y aprobación del operador | Un agente no puede pushear por una skill de terceros |

### Feature flags / cutover

Sin flag de runtime: es tooling de repo. El control de graduación es el **modo de reporte de la lista
de no declaradas** (informativa antes que bloqueante) y el hecho de que las admisiones al manifiesto
son una a una, cada una reversible por sí sola. Revert instantáneo: `git revert` del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del commit de tests; el validador queda intacto | <5 min | sí |
| Slice 2 | `git revert`; el script vuelve a rechazar cualquier modo distinto de `byte-identical` | <5 min | sí |
| Slice 3 | Quitar la entrada de `dataforseo-operator` del manifiesto (una línea de bloque) | <5 min | sí |
| Slice 4 | `git revert`; desaparece la lista de no declaradas, que nunca fue bloqueante | <5 min | sí |
| Slice 5 | Quitar la entrada admitida; las reconciliaciones de contenido se quedan si son correctas, y se revierten por archivo si no | <15 min | parcial — el contenido reconciliado se evalúa archivo por archivo |

### Production verification sequence

1. `pnpm vitest run scripts/skills/validate-mirrored-skills.test.ts` — el caso del defecto ROJO antes
   del Slice 2, VERDE después; los casos de no-aflojamiento VERDES siempre.
2. `pnpm skills:mirrors` — las 16 entradas vigentes siguen validando y el mensaje nombra el modo
   aplicado por entrada.
3. Con `dataforseo-operator` admitida: introducir a propósito una divergencia de cuerpo en una copia,
   confirmar que el gate se pone ROJO nombrando el archivo, y revertirla.
4. Confirmar que una diferencia sólo de frontmatter en esa misma entrada **no** produce falla, y que en
   una entrada `byte-identical` **sí** la produce.
5. Revisar la lista de no declaradas y contrastarla con el inventario del Slice 4.
6. `pnpm local:check` verde antes de cerrar.

### Out-of-band coordination required

- **`TASK-1626`** — comparte el archivo `scripts/skills/validate-mirrored-skills.mjs`. Se coordina el
  orden de los cambios; ninguna de las dos tasks toca la entrada de la otra.
- **Decisión del operador** para endurecer la lista de no declaradas a bloqueante, si el Slice 5 llega
  a saldo cero. No se endurece por iniciativa del agente.
- Nada externo al repo: `repo-only change` en cuanto a proveedores, nube y secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `scripts/skills/validate-mirrored-skills.test.ts` existe y cubre: cuerpo idéntico con frontmatter
      distinto, paths por namespace de cada lado, archivo compartido presente en un solo espejo,
      directorio ausente, y no-aflojamiento de `byte-identical`.
- [ ] El caso del defecto quedó ROJO contra el validador viejo y el commit lo deja evidenciado.
- [ ] El campo `mode` acepta `body-identical` y las 16 entradas vigentes siguen en `byte-identical` sin
      cambio de semántica.
- [ ] Los paths exentos se declaran **por entrada**; no existe ninguna exención global de `references/`
      ni de `agents/`.
- [ ] `dataforseo-operator` está en el manifiesto con su comentario de razón, y `pnpm skills:mirrors`
      pasa sin que se haya duplicado una `reference/` ni degradado un frontmatter.
- [ ] Una divergencia de cuerpo introducida a propósito en `dataforseo-operator` pone el gate ROJO
      nombrando el archivo; una diferencia sólo de frontmatter no.
- [ ] El script reporta las skills presentes en ambos árboles que no están en el manifiesto ni en la
      lista de exclusión, y ese reporte no bloquea el build.
- [ ] Existe la lista de exclusión con razón escrita por entrada.
- [ ] El criterio de admisión está escrito en el encabezado del script, junto a la disciplina de
      manifiesto pequeño.
- [ ] El inventario del Slice 4 quedó re-derivado con el validador nuevo y registrado en la task; las
      cifras de este diseño (77 fuera, 32 divergentes) **no** se citan como resultado final sin
      re-derivarlas.
- [ ] Cada skill de dominio Greenhouse/Efeonce con divergencia de cuerpo terminó admitida tras
      reconciliarse o excluida con razón; ninguna queda sin decisión.
- [ ] `pnpm local:check` verde.
- [ ] El validador sigue siendo read-only: no reescribe skills por su cuenta y no imprime contenido de
      archivos, sólo rutas y el hecho de la divergencia.

## Verification

- `pnpm vitest run scripts/skills/validate-mirrored-skills.test.ts`
- `pnpm skills:mirrors`
- `pnpm local:check`
- Prueba manual de divergencia inducida y revertida sobre `dataforseo-operator` (paso 3 de la secuencia
  de verificación)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1626` quedó notificada del cambio de mecanismo en el archivo que ambas tocan
- [ ] las skills reconciliadas en el Slice 5 quedaron registradas con la dirección de la reconciliación
      y su razón

## Follow-ups

- Validación de que cada frontmatter esté **completo en su propio dialecto** (que la copia Claude tenga
  `description`, `argument-hint` y triggers; que la Codex tenga lo suyo). Es un chequeo distinto del
  espejo y no se mezcla acá — pero es el que habría atrapado el caso `copywriting` antes.
- Evaluar si `pnpm skills:mirrors` debe correr también en el CI remoto además de `local:check`, para
  que un push con `--no-verify` no lo salte.
- Si el saldo del Slice 5 llega a cero, proponerle al operador endurecer la lista de no declaradas a
  bloqueante, para que una skill de dominio nueva no pueda nacer espejada sin decisión.
- La misma clase de ceguera —un gate cuyo alcance sale de una lista a mano y no de la realidad del
  árbol— vale revisarla en los demás gates de `scripts/`.

## Open Questions

- ¿Las skills de terceros o vendored (`wp-*`, `hyperframes*`, `gsap`, `wpds`, `astro`) entran a la lista
  de exclusión una por una, o conviene una regla por prefijo? Una regla por prefijo es más corta y
  también más fácil de que se trague una skill propia por accidente.
- ¿La lista de exclusión vive en el mismo archivo del manifiesto o en uno aparte? Mismo archivo mantiene
  la decisión junto a su contexto; archivo aparte evita que el manifiesto pequeño se vea grande.
- ¿Alguna de las 32 divergencias de cuerpo es en realidad una skill que se bifurcó a propósito y no
  debería estar espejada? Si la hay, la salida correcta es exclusión con razón, no reconciliación — y
  esa decisión es del operador, no del agente que ejecuta.
