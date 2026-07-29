# AXIS — Mapa de continuidad ejecutable

> **Tipo de documento:** Diagnóstico de continuidad (no es arquitectura ni decisión)
> **Creado:** 2026-07-29 por Claude (Opus 5)
> **Alcance:** AXIS (design system) × Greenhouse (consumidor/integrador) × Globe (producto comercial consumidor)
> **Método:** verificado contra repos, lockfiles, `node_modules`, Vercel y workflows reales — **no contra la documentación**, que en tres puntos resultó stale.
> **Autoridad:** este documento **no** supersede nada. La decisión vive en
> [`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1`](../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md);
> el runbook operativo en [`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1`](./AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

---

## 0. Los cuatro actores, y por qué confundirlos es caro

| Actor | Qué es | Qué NO es | Repo dueño |
|---|---|---|---|
| **AXIS** | El **design system comercial de Efeonce**: tokens, contratos y registry, distribuidos como **paquetes privados versionados**. | No es "el design system de Greenhouse renombrado". No es una biblioteca de componentes. | `efeoncepro/axis-design-system` |
| **Greenhouse** | **Consumidor e integrador**, y además el **control plane documental y de tasks** de todo el ecosistema. | No es el dueño de AXIS. Su implementación MUI/Vuexy **no** viaja en los paquetes. | `efeoncepro/greenhouse-eo` |
| **Globe** | **Producto comercial** que consume AXIS con su propio motor (Tailwind v4 + tokens propios). | No hereda la UI de Greenhouse ni importa MUI/Vuexy (ADR-014). | `efeoncepro/efeonce-globe` |
| **El Lab** | **Fuente de primitives y evidencia**: superficie de exploración y verificación visual del design system. | **NO es producto final** ni superficie de cliente. Que algo exista en el Lab no lo hace promovido. | `axis-design-system-lab` (Vercel) |

La regla que cae de esto y que gobierna todo lo demás: **un contrato compartido no obliga a compartir el
motor de estilos** (Regla 2 del ADR). AXIS distribuye *contratos y tokens*; cada producto materializa su
propio adapter.

---

## 1. Qué está TERMINADO

Todo lo de esta sección está verificado contra artefactos, no contra prosa.

### Distribución y publicación — cerrado

| Hecho | Evidencia verificada |
|---|---|
| Tres paquetes en `0.1.4` | `@efeoncepro/axis-tokens`, `axis-ui-contracts`, `axis-ui-registry` |
| **Publicados de verdad** en GitHub Packages | El lockfile de Globe trae **tarball real + integrity** de `npm.pkg.github.com` — prueba de resolución, no de intención |
| El tag dispara la publicación | `release-packages.yml` corre `on: push: tags: v*.*.*` |
| `v0.1.4` está en `origin` y apunta al HEAD | `v0.1.4` == `10af569` == `HEAD`; repo en `main`, árbol limpio |

### Acceso y credenciales — cerrado (con reloj, ver §7)

- Acceso `Read` de GitHub Actions concedido a `greenhouse-eo` y `efeonce-globe` sobre los tres paquetes.
- Secreto `axis-packages-read-token` en Secret Manager de `efeonce-globe`; el SA de Cloud Build
  (`818083690953-compute@…`) tiene `secretAccessor` **a nivel de secreto**, no de proyecto.
- Vercel `NPM_RC` en `axis-design-system-lab` (Production + Preview).

### Consumo — cerrado como piloto opt-in en LOS DOS runtimes

| | Greenhouse | Globe |
|---|---|---|
| Declara `0.1.4` | `package.json` raíz | `apps/studio-client/package.json` |
| Instalado | ✅ `node_modules/@efeoncepro/*` | ✅ `apps/studio-client/node_modules/@efeoncepro/*` |
| Superficie del piloto | `/design-system/axis-adapters` | `/_axis-pilot` |
| Adapters | MUI/Vuexy | Tailwind + token classes (`AxisStatus`, `AxisProgress`) |
| Auth en CI | ✅ **10 workflows** con `npm.pkg.github.com` | ✅ `ci.yml` materializa `GITHUB_TOKEN` con `trap 'rm -f .npmrc' EXIT` |

### Cloud Build de Globe — **PROBADO EN PRODUCCIÓN, contra lo que dice el runbook**

Esta es la corrección más importante del diagnóstico. El runbook y `TASK-1591` declaran que *«falta ejecutar
una corrida real de CI/Cloud Build»*. **Para Cloud Build ya no falta.**

El primer deploy con paquetes privados **falló** (`ERR_PNPM_FETCH_404`, run 30438182204) porque
`--mount=type=secret` es **por-RUN** y `pnpm deploy --legacy --prod` re-resuelve dependencias en un RUN
posterior sin `.npmrc`. Se corrigió montando el secreto en el segundo RUN, y **el deploy posterior quedó
verde y verificado en Cloud Run**. Desde entonces, **cuatro deploys más** el 2026-07-29 pasaron por ese mismo
Dockerfile (`68a2cbe`, `d009871`, `b9112a8`, `403d346`; revisión viva `00101-x2d`).

> **La lección que quedó y que hay que conservar:** la distribución de paquetes privados **no queda probada al
> publicarlos ni al instalarlos en local — se prueba en la primera imagen de producción que los consume.**

---

## 2. Qué está PARCIALMENTE implementado

| # | Qué | Estado real | Por qué no está cerrado |
|---|---|---|---|
| **P1** | Corrida real de **GitHub Actions** con install de AXIS | ⚠️ **NO VERIFICADO** | El wiring existe en los dos repos y hubo pushes hoy que debieron dispararlo, pero **no pude confirmar la conclusión**: la API de GitHub estaba en rate limit (0/5000). **No se asume verde.** |
| **P2** | Verificación de **digest desplegado** | ❌ falta | Declarado requisito de promoción en `TASK-1591` y en el runbook. Cloud Build corre verde, pero nadie verificó que el digest servido corresponda al build con AXIS. |
| **P3** | **Rollback probado** | ❌ falta | Existe `rollback-internal.yml`, pero no hay evidencia de un rollback ejercido con AXIS adentro. |
| **P4** | Promoción del **registry a `stable`** | ❌ bloqueado por diseño | El ADR es explícito: *«`TASK-1485` pasa a ser consumer/piloto de la plataforma compartida y **debe actualizarse antes de promover el registry como estable**»*. |
| **P5** | `TASK-1485` (motor de estilos + governance de Globe) | `to-do`, **desbloqueada** | Ver §6: su `Blocked by` está stale. |
| **P6** | `TASK-1552` Slice 3 | `in-progress` | Estados de ejecución y evidencia premium del composer. Consume el motor que gobierna `TASK-1485`. |

---

## 2-bis. Hueco que este mapa NO cubrió, y que apareció después (2026-07-29, `e3f3e667a`)

**Los tres Cloud Run workers de Greenhouse construían con `401 Unauthorized` sobre `@efeoncepro/axis-tokens`.**

Este diagnóstico verificó, para Greenhouse, **GitHub Actions** (10 workflows con wiring) y **Vercel**
(`NPM_RC` en tres entornos) — y **no verificó su Cloud Build**. Greenhouse tiene un tercer carril de build que
no es ninguno de esos dos: `services/{ops-worker,ico-batch,commercial-cost-worker}`, cada uno con su
`Dockerfile` + `deploy.sh`. Ahí faltaba la auth.

> **La lección de método, que vale más que el arreglo:** "el consumidor tiene la auth" no es una respuesta
> hasta que se enumeran **todos** sus carriles de build. Greenhouse tiene tres (Actions, Vercel, Cloud Build);
> comprobar dos y concluir da un verde que no existe.

Corregido aplicando el patrón canónico de Globe —Secret Manager + BuildKit `--mount=type=secret`, sin token en
imagen, logs ni runtime— **en los dos RUN de cada Dockerfile**, que es donde el primer deploy de Globe se
había estrellado (`--mount=type=secret` es por-RUN y `pnpm deploy --prod` re-resuelve después). Incluye
extensión del `worker-build-contract-gate` con su test.

### ⚠️ Acoplamiento cross-proyecto: deliberado, temporal, y con condición de retiro

Para habilitarlo se concedió `roles/secretmanager.secretAccessor` **sobre ese único secreto** al SA de Cloud
Build de Greenhouse:

```
axis-packages-read-token  (vive en GCP efeonce-globe)
  ├── 818083690953-compute@  ← Cloud Build de Globe        (preexistente)
  └── 183008134038-compute@  ← Cloud Build de Greenhouse   (agregado 2026-07-29)
```

**Se decidió NO duplicar el secreto.** Dos copias son dos rotaciones, y con el PAT venciendo el 2026-08-27 la
segunda es la que alguien olvida.

**Pero hay que verlo por lo que es:** `axis-packages-read-token` es una credencial **del ecosistema AXIS**
archivada en el proyecto de un **producto**, porque ese producto la necesitó primero. La consecuencia es que
**los builds de Greenhouse dependen hoy del proyecto GCP de Globe** — lo que invierte la dirección de
gobierno, ya que Greenhouse gobierna a Globe.

🔴 **Condición de retiro — y es una DECISIÓN, no un vencimiento automático.** Al reemplazar el PAT por la
identidad de máquina (requisito previo a rollout externo, §7), el secreto nuevo **debe nacer fuera del
proyecto de un producto**. Si simplemente se recrea en `efeonce-globe`, **el acoplamiento se reinstala en
silencio y nadie lo nota**, porque todo sigue funcionando. Es el único momento en que retirarlo cuesta cero.

---

## 3. Qué falta en GREENHOUSE

| Falta | Archivo / superficie | Nota |
|---|---|---|
| **Actualizar `TASK-1485`** al rol que el ADR le asigna | `docs/tasks/to-do/TASK-1485-*.md` | El ADR lo exige **antes** de promover el registry. Hoy la task no refleja que es consumer de la plataforma compartida. |
| **Corregir el `Blocked by` stale** | misma task | Declara `TASK-1455`, que está **`complete`**. |
| **Sincronizar el runbook** con la realidad | `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` | Tres puntos stale, ver §7. |
| **Reemplazar el PAT por identidad de máquina** | operación, no código | Es el único ítem con fecha. Ver §7. |

**No falta** (verificado, y el runbook no lo dice): `NPM_RC` **sí existe** en el proyecto Vercel de
`greenhouse-eo`, para `staging`, `Production` y `Preview (develop)`. El runbook solo menciona el proyecto del
Lab.

---

## 4. Qué falta en GLOBE

| Falta | Archivo / superficie | Nota |
|---|---|---|
| **Promoción de los adapters a superficie de producto** | `apps/studio-client/src/primitives/index.tsx` | Hoy `AxisStatus`/`AxisProgress` viven en el piloto opt-in `/_axis-pilot`. Promoverlos es decisión separada del piloto. |
| **Cerrar `TASK-1552` Slice 3** | composer | Único slice abierto de la superficie que más consume el motor. |
| **Higiene del store de paquetes** | `node_modules/.pnpm/` | Conviven `0.1.3` **y** `0.1.4`. No rompe nada hoy, pero un consumer que resuelva la vieja no daría error. |
| **Rama WIP sin cerrar** | `task/TASK-1552-slice0-internalizar-css` | Congelada con partes a revertir según el propio `TASK-1552`. Decidir si se retira o se retoma. |

---

## 5. Dependencias entre los tres

```
AXIS (axis-design-system)
  │  publica @efeoncepro/axis-{tokens,ui-contracts,ui-registry} 0.1.4
  │  ⇩ tag v*.*.* → release-packages.yml → GitHub Packages (privado)
  │
  ├─► GREENHOUSE ── consume vía package.json raíz + adapters MUI/Vuexy
  │     │            auth: GITHUB_TOKEN en Actions · NPM_RC en Vercel
  │     │
  │     └─► gobierna a Globe (tasks, ADRs, doc) ── NO le presta su motor
  │
  └─► GLOBE ─────── consume vía apps/studio-client + adapters Tailwind
        auth: GITHUB_TOKEN en Actions · axis-packages-read-token en Cloud Build
```

**Dependencias duras:**

1. **Promover el registry a `stable`** ⟵ requiere **`TASK-1485` actualizada** (exigencia explícita del ADR).
2. **Rollout externo/comercial** ⟵ requiere **identidad de máquina** en lugar del PAT (§7) **y** `TASK-1480`,
   que hoy tiene conditional-go solo para el primer **Commercial Production Sprint managed**; el
   SaaS/client-runtime externo **sigue gated**.
3. **`TASK-1552` Slice 3** ⟵ consume el motor de estilos cuyo contrato gobierna **`TASK-1485`**. Avanzar el
   composer sin cerrar la governance deja el motor sin dueño formal mientras se le agregan consumers.
4. **Cualquier bump de versión AXIS** ⟵ toca **los dos** consumers a la vez (lockfile + adapters). No hay
   canario que lo pruebe cross-repo hoy.

**Dependencia que NO existe, y conviene decirlo:** Globe **no** depende del build de Greenhouse. Son
toolchains independientes; lo único compartido son los paquetes versionados.

---

## 6. Qué task ejecutar PRIMERO

### 🔴 `TASK-1485` — y el hallazgo es que **ya no está bloqueada**

Su cabecera declara `Blocked by: TASK-1455`, pero **`TASK-1455` está `complete`** (*"shell internal-only live
y verificada en Cloud Run"*). El bloqueo es **stale**: la task es ejecutable hoy.

Por qué va primera, en orden de fuerza del argumento:

1. **El ADR la nombra como precondición.** Promover el registry a `stable` está explícitamente condicionado a
   actualizarla. Nada de la cadena comercial avanza sin eso.
2. **Es dueña del motor de estilos de Globe** (ADR-016, incorporado por el Delta 2026-07-27). Hoy
   `TASK-1552` le está agregando consumers a un motor cuya governance está en `to-do` — se acumula superficie
   sobre un contrato sin cerrar.
3. **Es barata comparada con lo que desbloquea.** Su trabajo es contrato y registry, no runtime.

### Segundo: la identidad de máquina del PAT

Es lo único con **fecha de vencimiento** (2026-08-27, ~4 semanas). No bloquea a `TASK-1485`, así que corren en
paralelo — pero **empeora solo**: cuando el token venza, el build rompe y el mensaje de npm miente (dice *«is
not in the npm registry»*, que es falso).

### Tercero: cerrar P1–P3 (corrida CI + digest + rollback)

Son evidencia de promoción, no capacidad. Se cierran juntos en una pasada.

### Lo que **NO** debe ir primero

- **`TASK-1552` Slice 3** — le agrega consumers al motor antes de cerrar su governance.
- **Promover adapters a producto en Globe** — es exactamente lo que el ADR y `TASK-1591` mantienen separado
  del piloto.
- **Bump de versión AXIS** — sin canario cross-repo, un bump hoy se prueba en producción.

---

## 7. Gates que faltan

### Seguridad / credenciales

| Gate | Estado | Detalle |
|---|---|---|
| PAT → identidad de máquina | 🔴 **con reloj: 2026-08-27** | Operator-owned. Requisito declarado antes de rollout externo. **Es también la única ventana barata para retirar el acoplamiento cross-proyecto de §2-bis** — el secreto nuevo debe nacer fuera del proyecto de un producto. |
| Credencial AXIS en proyecto neutral | ❌ vive en `efeonce-globe` (proyecto de un producto) | Ver §2-bis. Aceptado como temporal para no crear una segunda copia que rotar. |
| Secreto nunca en la imagen | ✅ | BuildKit `--mount=type=secret`, montado en **ambos** RUNs desde el fix del Delta. |
| Token nunca en logs ni lockfile | ✅ | `trap 'rm -f .npmrc' EXIT` en Actions. |
| Paquetes privados, no públicos | ✅ | El runbook lo prohíbe explícitamente como atajo. |

### Paquete privado

| Gate | Estado |
|---|---|
| Versiones fijadas (no rangos) | ✅ `"0.1.4"` exacto en los dos consumers |
| Registry scoped `@efeoncepro` | ✅ en CI; **`.npmrc` deliberadamente NO committeado** (llevaría token) — se materializa efímero |
| Canario cross-repo ante un bump | ❌ **no existe** |

### Vercel

| Gate | Estado |
|---|---|
| `NPM_RC` en el Lab | ✅ Production + Preview |
| `NPM_RC` en `greenhouse-eo` | ✅ staging + Production + Preview — **el runbook no lo dice** |
| Globe en Vercel | n/a — Globe corre en Cloud Run, no Vercel |

### CI

| Gate | Estado |
|---|---|
| Wiring en Greenhouse | ✅ 10 workflows |
| Wiring en Globe (`ci.yml`) | ✅ |
| **Corrida real verde con AXIS** | ⚠️ **NO VERIFICADO** (rate limit de la API). No se asume. |

### Runtime

| Gate | Estado |
|---|---|
| Cloud Build de Globe con AXIS | ✅ **probado**: 1 fallo + fix + 5 deploys verdes |
| Canario del piloto | ✅ `axis-pilot-canary.test.mjs`, 16 asertos; su leak de proceso se cerró el 2026-07-29 |
| Digest desplegado verificado | ❌ |
| Rollback ejercido con AXIS | ❌ |

---

## 8. Documentación stale detectada (corregir al ejecutar, no antes)

1. **Runbook** — *«falta ejecutar una corrida real de CI/Cloud Build»*: para **Cloud Build ya se ejecutó**,
   falló, se corrigió y lleva 5 deploys verdes. Lo que sigue sin verificar es **GitHub Actions**.
2. **Runbook** — solo menciona `NPM_RC` en el proyecto Vercel del Lab; **también existe en `greenhouse-eo`**.
3. **`TASK-1485`** — `Blocked by: TASK-1455`, que está `complete`.

> Se dejan **anotadas y sin corregir** a propósito: corregirlas es parte del arranque de `TASK-1485`, y un
> barrido documental suelto ahora mezclaría el diagnóstico con la ejecución.

---

## 9. Handoff — para arrancar sin releer nada

**Estado de partida (2026-07-29):**

- AXIS `0.1.4` publicado y consumido por los dos productos como **piloto opt-in verificado**.
- Globe: `main` limpio, revisión viva `globe-studio-internal-00101-x2d` sirviendo `403d3464e88e`.
- Greenhouse: `develop` pusheado y sincronizado. **El release develop→main ya se completó — no repetirlo.**
- Rama abierta en Globe: `task/TASK-1552-slice0-internalizar-css` (WIP congelado, decidir retiro).

**Siguiente paso recomendado, concreto:**

> Abrir **`TASK-1485`**. Primer movimiento: corregir su `Blocked by` (stale) y actualizarla al rol que el ADR
> le asigna — **consumer/piloto de la plataforma compartida**, dueña del motor de estilos de Globe (ADR-016) y
> **precondición declarada para promover el registry a `stable`**. Recargar la skill
> `greenhouse-task-planner` completa antes de editarla; el cierre exige `pnpm task:lint --task TASK-1485` en
> `errors=0 warnings=0`.

**Dos cosas que hay que verificar en cuanto la API de GitHub deje de estar en rate limit:**

```bash
gh run list --repo efeoncepro/efeonce-globe  --workflow=ci.yml --limit 5
gh run list --repo efeoncepro/greenhouse-eo  --workflow=ci.yml --limit 5
```

Si alguna corrió verde con el install de AXIS, **P1 se cierra sin trabajo**. Si ninguna tocó el path, hay que
provocarla.

**Lo que NO hay que hacer todavía:** promover adapters a superficie de producto, bumpear la versión de AXIS,
avanzar `TASK-1552` Slice 3, ni tocar el release develop→main.
