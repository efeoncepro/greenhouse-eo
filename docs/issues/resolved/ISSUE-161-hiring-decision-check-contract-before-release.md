# ISSUE-161 — El CHECK de `decision` se angostó antes del release y dejó rota «Dejar en espera» en producción

## Ambiente

`production` (y con ella `staging` y `dev`: **hay una sola instancia Cloud SQL compartida por los tres**).

## Detectado

2026-08-22, por revisión de la sesión que auditaba el vocabulario de etapas de Hiring — **no** por un
usuario ni por una alerta. Ningún operador reportó el fallo durante la ventana.

## Síntoma

El botón **«Dejar en espera»** de Application 360 seguía visible y pulsable en producción, pero la base
rechazaba la escritura con `23514` (`check_violation`). La acción se ofrecía y no se podía ejecutar.

## Causa raíz

La migración `20260822203905818_task-1765-hiring-outcome-axis-contract` angostó el `CHECK` de
`hiring_application.decision` a seis valores y **sacó `on_hold`**.

El readback previo a aplicarla **era correcto** —0 filas con `decision='on_hold'`, 0 entradas de
historial— pero **la pregunta estaba mal formulada**:

> **«Cero filas» no es «nadie lo escribe». Sólo dice que nadie lo escribió TODAVÍA.**

Lo que había que verificar es el **contrato de la superficie**: qué valores puede escribir el código que
corre en producción. Y el código de producción es **`origin/main`**, no el working tree ni `develop`:

- `src/types/hiring.ts` en `main` todavía tenía `on_hold` en `HIRING_DECISIONS`
- `Application360View.tsx` en `main` todavía pintaba el botón «Dejar en espera»

Como la instancia de Cloud SQL es **una sola**, angostar el `CHECK` «en dev» lo angostó **en producción**,
contra un front-end que seguía ofreciendo el valor.

Es el §3.6 de la auditoría del vocabulario ocurriendo en carne propia:
*«Derivar la alcanzabilidad del contrato de la superficie, nunca del contenido de la tabla.»*

## Impacto

- **Funcionalidad**: la acción «Dejar en espera» de una postulación, para cualquier operador con
  `hiring.application.decide`.
- **Datos**: **ninguno**. Cero filas afectadas, cero datos perdidos, cero corrupción. Un `CHECK` rechaza
  la escritura; no daña lo escrito.
- **Personas**: sin evidencia de que un operador real haya pulsado el botón durante la ventana. El daño
  verificado es una **acción rota**, no un fallo consumado.
- **Ventana**: acotada por la creación de las dos migraciones (`20:39:05` → `20:46:09`, ~7 minutos). **El
  momento exacto de aplicación de cada una no se midió contra `pgmigrations`**, así que la ventana real
  de exposición podría diferir.

## Solución

Migración **forward-fix puramente permisiva**
`20260822204609045_task-1765-hiring-outcome-restore-on-hold-until-release.sql`: devuelve `on_hold` al
`CHECK`. Agregar un valor admitido no puede chocar con ninguna fila existente — riesgo cero, no toca datos.

**No se editó la migración con el bug** (ya estaba registrada en `pgmigrations`; editarla rompe cualquier
environment nuevo). Forward fix idempotente, que es el patrón canónico del repo.

El contract vuelve a aplicarse **cuando `main` ya no ofrezca `on_hold`**, o sea **después** del release que
suba los Slices 1-4. Ese SQL quedó parqueado en
`docs/tasks/pending-migrations/TASK-1765-decision-enum-contract.sql.pending`, con su condición y los
`git show origin/main:` exactos **dentro del propio archivo**, no sólo en la task.

## Verificación

- `on_hold` restaurado en el `CHECK`; los cuatro constraints clonados a una tabla temporal y **cada valor
  escribible por `main` probado en transacción abortada** — todos aceptados.
- `590` archivos en `migrations/` = `590` filas en `pgmigrations`, diferencia simétrica vacía: no quedó
  ninguna migración committeada sin aplicar.

## Prevención

Nacieron **dos reglas duras** en `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`:

1. **El `contract` de un enum se aplica DESPUÉS del release que retira al escritor, nunca antes.** Se
   verifica con `git show origin/main:<archivo>`, no contra el working tree.
2. **No existe «migración escrita pero sin aplicar».** Un archivo en `migrations/` bloquea cualquier
   `migrate:up` posterior — incluido el de quien esté apagando un incendio. Las migraciones condicionadas
   viven en `docs/tasks/pending-migrations/` con su condición en el propio SQL.

**Sin gate mecánico todavía.** Hoy es disciplina humana + revisión. Un gate que compare el `CHECK` de una
migración `contract` contra los valores escribibles en `origin/main` es candidato natural, y no existe.

## Estado

`resolved`

## Relacionado

- `TASK-1765` — el eje de desenlace; su Slice 4 originó el incidente
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` §3.6 — la regla que el
  incidente ilustra
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` §16
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — las dos reglas duras
- `docs/tasks/pending-migrations/README.md` — el mecanismo de parqueo
- `ISSUE-068` — misma familia: una migración que se registra como aplicada sin ejecutar su SQL
