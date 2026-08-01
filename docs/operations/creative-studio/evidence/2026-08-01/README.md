# Studio Credits — evidencia live 2026-08-01

## Corte verificado

- Workspace: `greenhouse-org:efeonce`.
- Greenhouse: `develop`, superficie `https://dev-greenhouse.efeoncepro.com/admin/globe/credits`.
- Globe: `main@e369ef8`, Producer
  `https://globe.efeoncepro.com/producer`.
- Identidad Chrome: `jreyes@efeonce.cl`; identidad Greenhouse atribuida:
  `user-efeonce-admin-julio-reyes`.
- Operación: `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a`, estado `completed`.
- Resultado: objetivo 800, grant 800, cap 1500, capacidad efectiva `0 → 800`, pool
  `internal-month:2026-08`, cero blockers.

## Evidencia

- [`greenhouse-globe-credits-funded-live.png`](greenhouse-globe-credits-funded-live.png): readback terminal del
  workbench Greenhouse, operación seleccionada y capacidad coincidente.
- [`globe-producer-credit-capacity-live.png`](globe-producer-credit-capacity-live.png): self-view Producer con
  800 efectivos, cap/remaining 1500, spent/held 0, funding 800, una fuente activa y daily fence separado.
- CLI OAuth PKCE `status --requested-credits 1`: `state=ready`, `allowed=true`, `effectiveAvailable=800`,
  `eligibleFunding=800`, `monthly.cap=1500`, `monthly.remaining=1500`, `blockers=[]`.

Las capturas son evidencia visual, no autoridad económica aislada. La causalidad se sostiene con el receipt de
la operación, el reader CLI/API y el self-reader de Producer sobre el mismo runtime.

## Worker de expiry y recovery

- Código/grants final: Globe `d3fe90e`; baseline IaC live: `e369ef8`.
- Deploy exacto: GitHub Actions `30717266572`, `success`.
- Imagen live: `southamerica-west1-docker.pkg.dev/efeonce-globe/globe-runtime/globe-producer-worker@sha256:d8295862dc12c14427e90e0bb413577802916c37ca6bf32c202680492ca7bae9`.
- Topología: task count 1, parallelism 1, scheduler minutely habilitado,
  `GLOBE_CREDIT_EXPIRY_ENABLED=true`, retry 300000 ms.
- Grant least-privilege: workflow `30717172080`, `success`; agregó exclusivamente `SELECT`/`INSERT` sobre
  `globe.governed_run_control_commands` y verificó el contrato exacto por readback.
- Ejecución scheduler `globe-producer-worker-lmb2r` sobre el digest final: `claimed=2`,
  `reconciliationRequested=2`, `deferred=2`, `failed=0`.
- Canary `globe-producer-worker-j8nnw` sobre el mismo digest: ejecución completa, cola gobernada
  `claimed=4`, `rescheduled=4`, sin fallo del worker.
- OpenTofu `fmt -check`, `validate` y plan live con `-detailed-exitcode`: `No changes`, exit 0.

Los dos holds vencidos son runs históricos `submission_unknown`, sin `providerOperationId`, con resultado de
envío desconocido. El worker los reconcilia y difiere; no los libera ni cobra a ciegas. Su edad continúa visible
como señal operacional hasta una resolución autoritativa o financiera explícita.
