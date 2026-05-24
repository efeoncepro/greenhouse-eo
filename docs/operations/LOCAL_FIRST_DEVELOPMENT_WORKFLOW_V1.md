# Local-First Development Workflow V1

> **Status:** Accepted
> **Created:** 2026-05-24
> **Domain:** platform / CI cost / multi-agent operations
> **Related:** TASK-931, TASK-637, `GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`, `RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

## Why This Exists

Greenhouse usa Vibe Coding de forma intensiva. Eso acelera el desarrollo, pero cada push remoto a `develop` o a una rama con preview puede disparar GitHub Actions, Vercel deployments y, segun paths, workers o validaciones cloud.

La respuesta no es apagar CI. CI existe porque antes los errores llegaban tarde a produccion. La respuesta canonica es cambiar el flujo:

- **local = taller de iteracion**
- **branch/PR = validacion remota acotada**
- **develop = integracion compartida**
- **main = produccion via release control plane**

## Decision

Los agentes deben trabajar local-first por defecto. Un agente no debe hacer push remoto como cierre automatico de cada flujo salvo instruccion explicita del operador o release/hotfix documentado.

Antes de pedir push, el agente debe dejar evidencia local proporcional al cambio. Si hay UI, debe levantar o reutilizar localhost y entregar ruta exacta para revision humana.

## Operating Contract

### 1. Default Loop

```text
plan slice -> edit local -> validate local -> localhost/manual review if UI -> commit local -> wait for push approval
```

### 2. Push Policy

| Target | Uso | Regla |
|---|---|---|
| Local working tree | Iteracion, fixes, exploracion | Default |
| Local commit | Cierre atomico de slice validado | Permitido |
| Feature/task branch remote | Preview o colaboracion explicita | Requiere que el agente lo diga antes |
| `develop` | Integracion compartida | Push solo con validacion local y confirmacion humana, salvo override explicito |
| `main` | Produccion | Nunca desarrollo directo; solo release control plane |

### 3. Local Validation Commands

Comandos canonicos agregados al repo:

```bash
pnpm local:check
```

Corre `pnpm lint` + `pnpm exec tsc --noEmit`. Es el minimo para cambios de codigo normales.

```bash
pnpm local:check:ui
```

Corre `local:check` + `design:lint` + `build`. Usar cuando el cambio toca UI visible, rutas Next, layouts, componentes, copy reusable o frontend behavior.

```bash
pnpm local:check:full
```

Corre `local:check` + `pnpm test` + `pnpm build`. Usar para cambios compartidos, backend/data/runtime, helpers transversales, release/CI, billing, auth, payroll, finance, cloud o alto blast radius.

Además:

- tests focales siguen siendo obligatorios cuando existe suite especifica;
- `pnpm pg:doctor` aplica si toca PostgreSQL/runtime DB;
- `pnpm design:lint` aplica si toca UI o DESIGN.md.

### 4. Localhost Review For UI

Si el cambio toca UI visible:

```bash
pnpm dev
```

El agente debe entregar:

- URL local exacta, por ejemplo `http://localhost:3000/admin/integrations`;
- que validaciones corrio;
- si hay barrera de auth o datos;
- si hizo captura visual con `pnpm fe:capture` o browser local.

No se debe empujar a `develop` solo para "verlo en Vercel" si localhost puede mostrar el cambio. Preview remoto queda para casos donde:

- la feature depende de Vercel runtime/env;
- hay callbacks/webhooks externos;
- se necesita validar deployment behavior;
- el operador pidio preview remoto.

### 5. Agent Prompt Snippets

#### Implementacion local sin push

```text
Implementa esto local-first. No hagas push.
Trabaja slice por slice, valida con pnpm local:check y tests focales.
Si toca UI, levanta pnpm dev y dame la URL localhost exacta.
Espera mi confirmacion antes de empujar a develop o crear preview remoto.
```

#### UI visible

```text
Implementa y verifica en localhost.
Corre pnpm local:check:ui, levanta pnpm dev, revisa consola/errores visuales
y dime la ruta local. No pushees hasta que yo lo apruebe.
```

#### Cambio sensible

```text
Antes de pedir push, corre pnpm local:check:full y la suite focal del dominio.
Si toca DB, corre pnpm pg:doctor. Si algo falla, arregla primero.
No uses develop/main como ambiente de prueba.
```

### 6. When Remote Validation Is Still Required

Usar GitHub Actions / Vercel / staging cuando:

- cambia workflow, release, deploy script, env vars o runtime Vercel;
- hay integraciones externas que no funcionan en localhost;
- se toca Cloud Run worker behavior;
- se requiere proof de branch preview para stakeholder;
- se promueve a `develop`/`main`;
- el release control plane lo exige.

## Risks And Mitigations

| Riesgo | Mitigation |
|---|---|
| Menos pushes ocultan errores locales | `local:check*`, tests focales y hooks pre-push mantienen feedback |
| Agente dice "listo" sin UI review | Para UI debe entregar localhost o declarar bloqueo |
| Worktree local se aleja de develop | Pull/rebase antes de push; usar worktrees para trabajo paralelo |
| CI remoto deja de verse como fuente de verdad | CI sigue siendo gate de integracion/release; local-first solo mueve iteracion barata al entorno local |

## Relationship With TASK-931

TASK-931 optimiza el plano remoto: split CI, path filters, budgets y workflow/job attribution.

Este operating model optimiza el plano humano/agente: menos pushes innecesarios y mejor evidencia local antes de gastar compute remoto.

## Delta YYYY-MM-DD

N/A.
