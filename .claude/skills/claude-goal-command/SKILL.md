---
name: claude-goal-command
description: Operar el slash command built-in `/goal` de Claude Code — fijar una condición de cierre y continuar autónomamente turno tras turno hasta cumplirla. Invocar ANTES de fijar un goal en cualquier implementación (TASK-###, migración, backlog), cuando el operador diga "sigue hasta que", "no me preguntes cada paso", "termina esto solo", "goal", "objetivo de sesión", o cuando haya que decidir entre `/goal`, `/loop` y un Stop hook. MANDATORIA cuando la condición pueda cruzar gasto real, deploy, promoción o mutación de runtime. Exclusiva de Claude Code (no existe en Codex).
user-invocable: true
argument-hint: "[condición de cierre propuesta, y si cruza gasto/deploy/promoción]"
---

# `/goal` — continuación autónoma hasta cumplir una condición

`/goal` es un **slash command built-in de Claude Code**. No vive en `.claude/commands/`;
**no crees `goal.md`**. Requiere **v2.1.139 o superior**.

> **Exclusiva de Claude.** Codex no tiene `/goal` como mecanismo; tiene un *protocolo* de goal
> preflight en prosa (`CLAUDE.md` §Delta Codex goal preflight + `AGENTS.md:63`). Mismo contrato
> conceptual, mecanismo distinto. Esta skill NO se replica en `.codex/skills/`.
> Su hermana es [`claude-loop-command`](../claude-loop-command/SKILL.md).

Fuente oficial: [Keep Claude working toward a goal](https://code.claude.com/docs/en/goal).
Verificado 2026-08-02.

## Lo primero: qué es realmente

`/goal` **no es una nota de acuerdo ni un recordatorio de alcance.** Fija una condición y, después
de cada turno, **un modelo pequeño y rápido evalúa si se cumple**. Si dice que no, Claude
**arranca otro turno solo, sin devolverte el control**. El goal se limpia solo cuando se cumple.

Fijar un goal **arranca un turno de inmediato**, con la condición como directiva. No hace falta
mandar un prompt aparte. Mientras corre se ve el indicador `◎ /goal active`.

**Implicación de riesgo:** si la condición abarca acciones que gastan o mutan runtime — canaries
facturables de Globe, fondeo, deploys, promociones, migraciones — el agente **avanza solo a través
de ese gasto sin checkpoint humano intermedio**. El alcance de un goal es una decisión de riesgo,
no de estilo.

`/goal` **no cambia permisos.** En modo por defecto sigue pidiendo aprobación de tool calls que tus
settings no permitan. Para que los turnos corran desatendidos hay que combinarlo con **auto mode** —
y esa combinación es la que de verdad quita al humano del camino. Trátala como tal.

## El hecho que más gente ignora

**El evaluador NO corre comandos ni lee archivos.** Solo juzga lo que Claude ya expuso en la
conversación.

Consecuencia práctica: la condición debe ser algo que **la propia salida de Claude pueda demostrar**.

- ✅ `"pnpm local:check corre y sale 0, con la salida en el transcript"` — Claude lo corre y el
  resultado queda visible para el evaluador.
- ❌ `"el código está limpio"` — no hay nada que leer.
- ❌ `"la feature funciona en producción"` — el evaluador no puede mirar producción. Un turno que
  *diga* que funciona basta para cerrarlo.

Esa última es la trampa peligrosa en Greenhouse: **el evaluador puede aceptar una afirmación como
evidencia.** Por eso la condición debe exigir el *artefacto*, no la conclusión.

## Sintaxis

| Forma | Efecto |
|---|---|
| `/goal <condición>` | Fija (reemplaza el activo) y arranca un turno de inmediato |
| `/goal` | Estado: condición, duración, turnos evaluados, tokens gastados, última razón del evaluador |
| `/goal clear` | Retira el goal activo |

Alias de `clear`: `stop`, `off`, `reset`, `none`, `cancel`. **`/clear` (conversación nueva) también
lo retira.** Confirma con `Goal cleared:` + la condición, o `No goal set`.

**Uno por sesión.** El nuevo reemplaza al anterior.

Después de cada turno el evaluador devuelve una **razón corta** de por qué se cumple o no. La más
reciente sale en el estado y en el transcript, así que puedes ver hacia dónde va.

## Escribir una condición que aguante

Máximo **4.000 caracteres**. Una condición sólida tiene:

- **Un estado final medible** — un resultado de test, un exit code, un conteo de archivos, una cola vacía.
- **Un chequeo declarado** — cómo debe probarlo (`pnpm test sale 0`, `git status queda limpio`).
- **Restricciones que importan** — qué NO debe cambiar en el camino.

**Acótalo en el tiempo.** Incluye una cláusula de turnos o tiempo: `o detente después de 20 turnos`.
Claude reporta progreso contra esa cláusula cada turno y el evaluador la juzga desde la conversación.

## Ciclo de vida

| Situación | Qué pasa |
|---|---|
| Se cumple | Se limpia solo, queda entrada `achieved` en el transcript |
| `--resume` / `--continue` con goal activo | La **condición** se restaura; turnos, cronómetro y baseline de tokens **se reinician** |
| Goal ya cumplido o limpiado | No se restaura |
| No interactivo | `claude -p "/goal ..."` corre el loop entero en una invocación |

En no interactivo con salida de texto por defecto **no imprime nada hasta cumplirse**, así que un
goal largo parece colgado. Usa `--output-format stream-json --verbose`. Se corta con `Ctrl+C`.

## Cómo funciona por dentro

`/goal` es un envoltorio sobre un **Stop hook prompt-based con alcance de sesión**. Al terminar cada
turno, Claude Code manda la condición + la conversación al **small fast model** configurado (por
defecto Haiku en la API de Claude; en terceros, revisa la página del proveedor). El modelo responde
sí/no + razón corta.

- **No** → Claude sigue y **toma la razón como guía del siguiente turno**.
- **Sí** → se limpia el goal y se registra `achieved`.

Los tokens de evaluación se facturan en el small fast model y son despreciables frente al gasto
del turno principal.

> ⚠️ Para evaluar con otro modelo se usa `ANTHROPIC_DEFAULT_HAIKU_MODEL`, **pero Claude Code lee esa
> variable en todos lados donde usa el small fast model** — también resuelve el alias `haiku` y
> corre funcionalidad de background (resúmenes de conversación) con él. No la toques solo para `/goal`.

### Requisitos

Corre **solo en workspaces con el trust dialog aceptado** (el evaluador es parte del sistema de
hooks). No está disponible si `disableAllHooks` está puesto en cualquier nivel de settings, ni con
`allowManagedHooksOnly` en managed settings. En cada caso el comando te dice por qué.

## Elegir entre los tres

| Enfoque | El turno siguiente arranca cuando | Se detiene cuando |
|---|---|---|
| `/goal` | Termina el turno anterior | Un modelo confirma que la condición se cumple |
| `/loop` | Pasa un intervalo de tiempo | Lo paras (`Esc`), o Claude decide que terminó |
| Stop hook | Termina el turno anterior | Lo decide tu script o prompt |

`/goal` y un Stop hook disparan igual después de cada turno. `/goal` es un atajo con alcance de
sesión; un Stop hook vive en settings, aplica a toda sesión en su alcance y puede correr un **script**
para chequeos determinísticos.

**Auto mode** por sí solo aprueba tool calls dentro de un turno pero no arranca uno nuevo. Son
complementarios: auto mode quita los prompts por herramienta, `/goal` quita los prompts por turno.

## Uso en Greenhouse

### Reglas duras

- **NUNCA** fijes un goal cuya condición cruce **gasto real, deploy, promoción o mutación de
  runtime** sin declararlo explícitamente en el texto y tener autorización del operador en el hilo.
  Si no está autorizado, **acota la condición para detenerse antes de esa frontera**.
- **NUNCA** una condición que el evaluador no pueda juzgar desde el transcript. Debe ser
  **evaluable**: alguien externo puede responder sí/no leyendo la conversación.
- **NUNCA** `/goal TASK-### completa` a secas. `code complete ≠ operationally complete`
  (Runtime Rollout Completion Gate). El evaluador no puede ver flags, migraciones aplicadas,
  redeploys ni integraciones externas. Si falta rollout, el estado correcto es
  `code complete, rollout pendiente` u `operativamente bloqueado` — **decláralo en la condición**.
- **NUNCA** incluyas `push` en la condición salvo instrucción explícita. El default local-first es
  no empujar; si el operador dijo `mantente en develop`, la condición debe decirlo.
- **NUNCA** un goal + auto mode sobre un dominio con gates humanos (Proposal Studio, promoción de
  release, aprobaciones de payroll). Esos existen justamente para que un humano cruce la puerta.
- **SIEMPRE** acota con cláusula de turnos (`o detente después de N turnos`). Un goal mal escrito
  sin tope quema tokens hasta que lo notes.
- **SIEMPRE** ante transporte ambiguo (no sabes si el efecto ocurrió): **lee readers/estado antes de
  reintentar**, nunca un segundo submit a ciegas. Un goal reintenta solo — ahí es donde duplica.
- **SIEMPRE** que el trabajo sea de UI, fija `/goal TASK-### UI enterprise-ready` y pasa por
  `greenhouse-ai-design-studio` antes de JSX/copy; la condición debe exigir los cuatro gates
  (`design-contract:lint`, `ui:code-lint`, `ui:visual-gate`, `ui:quality`) y GVC mirado en
  desktop + 390 px.

### La condición debe declarar

Contrato canónico compartido con Codex — `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
§GOAL PREFLIGHT y §UI/UX GOAL GUARD; espejo en `.claude/commands/implement-task.md` §`/goal`:

1. **Objetivo de cierre** — qué significa terminado.
2. **Evidencia obligatoria** — qué comandos deben correr y con qué resultado visible.
3. **Límites de alcance** — qué NO se toca.
4. **Estado correcto si falta rollout** — `code complete, rollout pendiente` u `operativamente bloqueado`.
5. **Rama** — si conviene `mantente en develop`.
6. **Subagentes** — si se autorizan.

### Plantilla

```
/goal TASK-### está code complete con evidencia en el transcript: pnpm local:check
sale 0, pnpm test completo sale 0 y pnpm build de producción sale 0, con las tres
salidas visibles. No se toca <área fuera de alcance>. No se hace push ni deploy ni
promoción: si el rollout queda pendiente, el estado a reportar es "code complete,
rollout pendiente" y eso cuenta como cumplido. Detente después de 25 turnos.
```

Fíjate en tres cosas: exige las **salidas** (no la conclusión), **cierra la puerta** al push, y
declara que `rollout pendiente` **cuenta como cumplido** — sin eso el evaluador puede empujar a
Claude a cruzar la frontera para "terminar".

### Preflight — el paso que no se salta

Si el operador pide ejecutar/implementar/continuar una `TASK-###` **sin `/goal` explícito**:
**propón uno y espera confirmación** antes de implementar. Con `/goal` ya entregado, sigue al hook
de la task. Si el operador pide ejecutar en el mismo turno sin goal, **documenta la excepción** en
Audit/Plan/Handoff — hay precedente registrado (`TASK-1294`, `TASK-1414`).

## Errores frecuentes

| Síntoma | Causa | Arreglo |
|---|---|---|
| Cerró sin que el trabajo estuviera hecho | La condición pedía una conclusión, no un artefacto | Exigir salida de comando en el transcript |
| No cierra nunca | Condición no evaluable desde la conversación | Reescribir en términos de evidencia visible |
| Cruzó un deploy solo | La condición no puso frontera | Acotar antes de la frontera y re-fijar |
| Quema tokens sin avanzar | Sin cláusula de turnos | `o detente después de N turnos` |
| Parece colgado en `-p` | Salida de texto no imprime hasta cumplir | `--output-format stream-json --verbose` |
| `/goal` no disponible | Workspace sin trust, `disableAllHooks` o `allowManagedHooksOnly` | El comando dice cuál es |
| Al reanudar los contadores están en cero | Comportamiento esperado | La condición sí se conserva |

## Ver también

- [`claude-loop-command`](../claude-loop-command/SKILL.md) — repetición por intervalo.
- `.claude/commands/implement-task.md` §`Objetivo de sesión (/goal)` — canon local.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` §GOAL PREFLIGHT — contrato compartido.
- `CLAUDE.md` §Runtime Rollout Completion Gate — por qué `complete` casi nunca es la condición correcta.
