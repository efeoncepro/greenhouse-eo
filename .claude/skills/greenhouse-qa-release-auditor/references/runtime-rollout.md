# Runtime Rollout Gate

Code complete is not operationally complete. Block closure or downgrade to
`code complete, rollout pendiente` when any required runtime step is missing.

Check:

- flags and env vars in each target environment
- secrets resolved through the canonical secret path
- migrations applied
- backfills/recoveries completed or explicitly pending
- Vercel/Cloud Run/worker redeploy or restart applied when needed
- cron/webhook/scheduler/external app provisioned
- source-of-truth data shape confirmed
- active runtime smoke completed against the correct URL/service
- rollback or disable path exists for risky rollout

Common traps:

- Vercel env changes need redeploy.
- Worker/Cloud Run env changes need service revision/restart.
- Custom staging domains may be SSO-protected; use canonical `.vercel.app` plus bypass.
- A flag default OFF can still be code-complete only, not operationally complete.
- A migration in repo is not applied in Cloud SQL until verified.

## `NODE_ENV` no distingue entornos en Vercel — usa `VERCEL_ENV` (2026-08-09)

**Vercel compila TODOS los deployments con `NODE_ENV=production`** — Preview, el
custom environment de staging y Production. Por eso un guard escrito como
`if (process.env.NODE_ENV === 'production')` **no discrimina entorno**: es
siempre verdadero en los tres entornos desplegados y sólo se comporta distinto en
local. Un guard así, escrito para bloquear una afordancia fuera de producción,
queda **solo-local**: la afordancia sigue expuesta en staging *y* en producción, y
todo test unitario pasa.

Caso fuente: se escribió ese guard existiendo ya el patrón canónico del repo en
`src/app/api/auth/agent-session/route.ts` y `src/proxy.ts`
(`process.env.VERCEL_ENV === 'production'`). No fue un error de conocimiento sino
de no buscar: el repo ya tenía la forma resuelta.

- **Regla: para distinguir staging de producción en este repo se lee `VERCEL_ENV`,
  nunca `NODE_ENV`.** `NODE_ENV` sólo sirve para separar local de desplegado.
- En Cloud Run el discriminante tampoco es `NODE_ENV`: es la env var explícita que
  declare el `deploy.sh` del servicio (y ahí el SoT es ese archivo, no el
  `--update-env-vars` en vivo).
- Verificación mínima de cualquier guard por entorno: ejercitarlo en el runtime
  desplegado (`pnpm staging:request` o `curl` con bypass), no sólo en local.
- Antes de inventar una variante de guard por entorno, `grep -rn "VERCEL_ENV" src/`
  y copia el patrón vigente.

## Recuperaciones que publican eventos y varios intentos de release

- Mapea quién puede consumir cada evento: un worker nuevo no protege una ruta Vercel que todavía
  ejecute el consumer anterior. Verifica alias, revisión y tráfico, no sólo existencia del build.
- Aplica sólo el command gobernado con preview, sujeto exacto, snapshot esperado e idempotencia;
  conserva baseline de relaciones, compensaciones, pagos e identidad que deben permanecer intactos.
- Después de la mutación, identifica los outbox IDs, confirma publicación y ejecución de las
  proyecciones relevantes y repite el readback protegido. La ausencia de error inmediato no cubre
  una escritura reactiva posterior que reabra una relación histórica o vuelva a desactivar al sujeto.
- Caso verificado 2026-09-03: Valentina fue restaurada a las 18:38:48Z; eventos publicados a las
  18:40:03Z y People completado a las 18:42:05Z; la relación employee siguió cerrada y las siete
  categorías protegidas permanecieron idénticas. Es evidencia fechada, no estado actual permanente.
- Separa elegibilidad de acceso, sesión interactiva y pago. Un reader SSO elegible no acredita login;
  un payable pendiente de boleta no acredita obligación, orden ni transferencia.
- Para el control plane exige conclusión de run, manifest, health, workers y watchdog. `completed`
  con `cancelled` no es verde. Comprueba anotación/actor para distinguir cancelación de fallo técnico.
- Antes de reintentar tras una colisión, el coordinador verifica eventos terminales/inbox y manifest.
  El reconciler todavía prioriza SHA sobre run ID; un duplicado cancelado puede abortar otro intento.
  Un manifest `aborted` requiere un nuevo intento canónico, nunca SQL ni retry del job final.

Fuente operativa: `docs/operations/runbooks/production-release.md` §0.1; evidencia y defecto pendiente:
`docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` §16 y
`docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md`.
