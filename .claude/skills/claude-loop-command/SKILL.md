---
name: claude-loop-command
description: Operar el slash command built-in `/loop` de Claude Code — re-ejecutar un prompt o skill en intervalo fijo o auto-regulado mientras la sesión sigue abierta. Invocar cuando el operador pida "monitorea", "revisa cada X minutos", "haz polling", "vigila el deploy/CI/PR", "loop", "/proactive", "tarea programada", "recordatorio en N minutos", o cuando haya que elegir entre `/loop`, `/goal`, Monitor, background task, Routines o Desktop scheduled tasks. Exclusiva de Claude Code (no existe en Codex).
user-invocable: true
argument-hint: "[qué vigilar, cada cuánto, y qué debe pasar cuando detecte algo]"
---

# `/loop` — repetición programada dentro de la sesión

`/loop` es una **bundled skill que viene compilada en el CLI de Claude Code**. No vive en
`.claude/skills/` ni en `.claude/commands/`; **no crees `loop.md` como comando**. Alias: `/proactive`.

> **Exclusiva de Claude.** Codex no tiene `/loop`. Esta skill NO se replica en `.codex/skills/`.
> Su hermana es [`claude-goal-command`](../claude-goal-command/SKILL.md), que cubre el otro
> mecanismo de autonomía de sesión.

Fuente oficial: [Run prompts on a schedule](https://code.claude.com/docs/en/scheduled-tasks) ·
[Commands](https://code.claude.com/docs/en/commands). Verificado 2026-08-02.

## Regla de decisión — antes de programar nada

`/loop` es para **polling rápido dentro de una sesión abierta**. Casi siempre hay algo mejor:

| Situación | Usa esto, NO `/loop` |
|---|---|
| Lanzaste un comando en background (build, test, gate) | Nada. El harness te re-invoca al terminar. Hacer polling es gasto puro. |
| Necesitas seguir la salida de un script en vivo | **Monitor tool** — hace streaming línea a línea, sin re-correr el prompt. La doc oficial lo recomienda explícitamente sobre `/loop` dinámico. |
| El trabajo debe seguir hasta cumplir una condición, no cada X minutos | **`/goal`** → `claude-goal-command` |
| Debe correr sin tu máquina encendida / sin sesión abierta | **Routines** (cloud) o **Desktop scheduled tasks** o **GitHub Actions** |
| Evento externo puede empujarse a la sesión (CI que avisa) | **Channels** |
| Chequeo único a una hora | No uses `/loop`. Di en lenguaje natural: `recuérdame a las 3pm empujar la rama` → tarea de disparo único que se autoborra. |

Queda `/loop` cuando: hay estado externo que el harness **no** puede notificarte (una corrida de CI,
un deploy, una cola remota, la sesión de otro agente) y quieres ciclos repetidos de
observar → verificar → reportar.

## Las tres formas

| Qué pasas | Ejemplo | Qué hace |
|---|---|---|
| Intervalo + prompt | `/loop 5m revisa el deploy` | Cron fijo |
| Solo prompt | `/loop revisa el deploy` | Claude elige el intervalo cada vuelta |
| Solo intervalo, o nada | `/loop` · `/loop 15m` | Corre el prompt de mantenimiento built-in, o tu `loop.md` |

### Intervalo fijo

```
/loop 5m revisa si el deployment terminó y dime qué pasó
```

- El intervalo puede ir **adelante** como token suelto (`30m`) o **atrás** como cláusula (`every 2 hours`).
- Unidades: `s` `m` `h` `d`. **Mínimo real: 1 minuto** (cron tiene granularidad de minuto; los segundos se redondean hacia arriba).
- Intervalos que no mapean a un paso de cron limpio (`7m`, `90m`) se redondean al más cercano que sí; Claude te dice cuál eligió.

### Intervalo dinámico (auto-regulado)

```
/loop revisa si el CI pasó y atiende los comentarios de review
```

Claude elige un delay **entre 1 minuto y 1 hora** después de cada vuelta, según lo que observó:
esperas cortas mientras algo está activo, largas cuando no hay nada pendiente. **El delay elegido y
su razón se imprimen al final de cada iteración.** Por debajo usa `ScheduleWakeup`.

> En Bedrock, Claude Platform on AWS, Google Cloud Agent Platform y Microsoft Foundry, un prompt sin
> intervalo corre en un **fijo de 10 minutos**, no dinámico.

### `/loop` pelado — prompt de mantenimiento

Sin prompt, corre un prompt built-in que en cada vuelta atiende, **en orden**:

1. continuar trabajo sin terminar de la conversación;
2. atender el PR de la rama actual — comentarios de review, CI en rojo, conflictos de merge;
3. pasadas de limpieza (bug hunt, simplificación) cuando no hay nada más pendiente.

**No arranca iniciativas nuevas fuera de ese alcance**, y las acciones irreversibles (push, delete)
solo proceden si continúan algo que el transcript ya autorizó.

### `loop.md` — reemplazar el prompt por defecto

| Ruta | Alcance |
|---|---|
| `.claude/loop.md` | Proyecto. **Gana** cuando existen ambos. |
| `~/.claude/loop.md` | Usuario. Aplica en proyectos sin el suyo. |

Markdown plano, sin estructura obligatoria; escríbelo como si tecleara el prompt. Se **ignora**
cuando pasas prompt en la línea. Los cambios aplican **en la siguiente iteración**, así que puedes
afinarlo con el loop corriendo. Máximo 25.000 bytes (se trunca).

> En Bedrock/AWS/GCP/Foundry `loop.md` no se lee.

### Pasar una skill como prompt

```
/loop 20m /review-pr 1234
```

**Desde v2.1.196, un disparo programado solo ejecuta skills que Claude puede auto-invocar.** Llegan
como *texto plano* y NO se ejecutan:

- comandos built-in (`/permissions`, `/model`, `/clear`);
- skills con `disable-model-invocation: true` — **incluidas las bundled `/verify` y `/code-review`**;
- skills ocultas por `skillOverrides` o una deny rule de `Skill`;
- prompts MCP (`/mcp__github__list_prs`).

Consecuencia para Greenhouse: **`/loop 30m /code-review` no revisa nada.** Si quieres review
recurrente, escribe el prompt en prosa pidiendo la revisión, no el slash command.

## Cómo detener un loop

- **`Esc` mientras espera** la próxima iteración. Limpia el wakeup pendiente. Esta es la vía canónica.
- En modo auto-regulado Claude puede terminarlo solo (`ScheduleWakeup` con `stop: true`).
- Si una iteración termina sin reprogramar ni detener, Claude Code agenda **un** wakeup de respaldo
  ~20 min después y cierra el loop si esa vuelta tampoco reprograma.
- `Esc` **no** afecta tareas que programaste pidiéndoselo a Claude en lenguaje natural; esas se
  borran con `CronDelete`.
- Los loops de intervalo fijo siguen hasta que los pares o pasen **7 días**.

## Ciclo de vida y límites

| Propiedad | Valor |
|---|---|
| Alcance | Sesión. Requiere sesión **abierta** e idle. |
| Cerrar terminal / salir | Dejan de disparar. `/background` los lleva a una sesión en background. |
| `--resume` / `--continue` | Restaura tareas no expiradas. Background bash y monitor **nunca** se restauran. |
| Conversación nueva | Borra todas las tareas de sesión. |
| Expiración | **7 días.** Dispara una última vez y se autoborra. |
| Máximo por sesión | 50 tareas. |
| Catch-up | No hay. Si Claude estaba ocupado, dispara **una** vez al quedar idle, no una por intervalo perdido. |
| Timezone | Local, no UTC. |
| Desactivar | `CLAUDE_CODE_DISABLE_CRON=1` — inhabilita el scheduler y `/loop` entero. |

### Jitter — por qué no dispara a la hora exacta

El scheduler agrega un offset determinista (derivado del ID de la tarea, así que es estable):

- **Recurrentes**: hasta 30 min *después* de la hora agendada — o hasta medio intervalo, si corre más
  seguido que cada hora. Un job horario a las `:00` puede disparar hasta `:30`.
- **Disparo único** agendado en `:00` o `:30`: hasta 90 s *antes*.

Si el timing exacto importa, elige un minuto que no sea `:00` ni `:30` (`3 9 * * *` en vez de
`0 9 * * *`) y el jitter de disparo único no aplica.

### Gestión

Pídelo en lenguaje natural (`¿qué tareas programadas tengo?`, `cancela el job del deploy`). Por
debajo: `CronCreate` · `CronList` · `CronDelete`. Cada tarea tiene un **ID de 8 caracteres**.

## Uso en Greenhouse

### Reglas duras

- **NUNCA** un `/loop` cuya iteración pueda empujar a remoto, desplegar, promover, fondear o gastar
  runtime facturable sin autorización explícita del operador en el hilo. El workflow local-first
  manda: `local = taller`, y el push no es cierre automático de nada. El prompt del loop debe decir
  **"no hagas push"** cuando toque código.
- **NUNCA** uses `/loop` para hacer polling de un background task del harness — te re-invoca solo.
  Si necesitas red de seguridad por si se cuelga, un delay largo (1200 s+), no uno de 60 s.
- **NUNCA** `/loop <intervalo> /code-review` ni `/verify` — no se ejecutan (ver arriba). Escribe el
  prompt en prosa.
- **NUNCA** dejes un loop corriendo sobre un árbol que otra sesión está editando si su iteración
  compila o escribe artefactos. En Globe, `typecheck` y `test` ejecutan `pnpm build` y escriben a
  `dist/`: corre el gate en una **copia** (`rsync` al scratchpad), nunca `git worktree add`.
- **SIEMPRE** declara en el prompt del loop **cuándo callar**. Sin eso reporta cada vuelta y el ruido
  entierra la señal. Formato: *"repórtame solo si X falla"*.
- **SIEMPRE** ten presente que cada iteración cuesta tokens, corra o no corra trabajo real. Un
  intervalo de 5 min son ~12 vueltas/hora.
- **SIEMPRE** verifica que el intervalo sea mayor que lo que tarda la iteración, o se solapa
  consigo misma. Si el gate tarda ~4 min, no programes cada 5 min: usa modo dinámico.

### Receta — vigilar la sesión de otro agente

Caso real 2026-08-02 (TASK-1633 en `efeonce-globe` desde una sesión de VS Code):

```
/loop revisa si hay commit nuevo en ~/Documents/efeonce-globe. Si lo hay:
resincroniza la copia aislada del scratchpad con rsync, corre pnpm check ahí
capturando el exit code real, y revisa el diff contra los invariantes de Globe.
Repórtame solo si algo falla o si se rompe un invariante. No hagas push ni toques
su árbol de trabajo.
```

Modo dinámico a propósito: el gate tarda minutos y los commits llegan irregulares.

### Receta — vigilar CI de un PR

```
/loop 10m revisa el CI del PR actual con gh. Si un job falla, trae el log del job
que falló y diagnostica la causa. No pushees el fix sin decírmelo antes.
```

### Antes de cerrar

Si el loop dejó trabajo hecho, aplican los gates del repo igual que en cualquier implementación:
`pnpm local:check`, y para cerrar una task `pnpm test` completo + `pnpm build` de producción.
Un loop no exime del Runtime Rollout Completion Gate: `code complete ≠ operationally complete`.

## Errores frecuentes

| Síntoma | Causa | Arreglo |
|---|---|---|
| El loop "no hace nada" | Pasaste `/code-review` o `/verify` como prompt | Escríbelo en prosa |
| Dispara tarde | Jitter (hasta 30 min en recurrentes) | Es esperado; elige minuto ≠ `:00`/`:30` |
| Dejó de disparar solo | Expiración de 7 días, o conversación nueva | Recrear, o migrar a Routines/Desktop |
| Se perdió al reanudar | Background bash/monitor nunca se restauran | Re-lanzarlos tras `--resume` |
| Se solapa consigo mismo | Iteración más larga que el intervalo | Modo dinámico, o intervalo mayor |
| Ruido cada vuelta | El prompt no dice cuándo callar | Agregar "repórtame solo si…" |
| `/loop` no existe | `CLAUDE_CODE_DISABLE_CRON=1` | Quitar la variable |

## Ver también

- [`claude-goal-command`](../claude-goal-command/SKILL.md) — el otro mecanismo de autonomía.
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` — por qué el default es no empujar.
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md` — el ciclo formal de trabajo.
