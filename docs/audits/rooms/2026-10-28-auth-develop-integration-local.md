# Auth + Rooms — integración local sobre develop (2026-10-28)

## Corrección del disparador Auth pendiente de promoción

El candidato local elimina `on.push` de `auth-server-deploy.yml`: el deploy productivo normal
queda en `production-release.yml` mediante `workflow_call` después del gate de aprobación;
`workflow_dispatch` queda para break-glass auditado. `worker:build-contract-gate` y
`worker:deploy-path-gate` aceptan este contrato especial y siguen exigiendo cobertura del bundle
Auth en `WORKER_RUNTIME_PATHS`. La prueba del allowlist comprueba el enlace al orquestador.
Esta corrección aún no está en PR #263/#264 ni en producción; no autoriza push o release.

**Estado: candidato local; release retenido.** La rama `codex/auth-develop-integration-local`
parte de `4bf4c6f3c`, los dos fixes locales aún no publicados del guard de PR #264 sobre
`origin/develop` `f93583bb0`. Se trasladaron 15 archivos de producto y pruebas desde el candidato
`codex/auth-focused-main-candidate` mediante el diff de la revisión Auth servida `754a2a280` al
HEAD `b93eaa972`. El patch aplicó sin conflicto y los 15 archivos resultantes coinciden byte por
byte con el candidato de origen. El commit local del traslado es `0b40bba59`.

`origin/develop` no tenía diferencias en `services/auth-server/`, `src/lib/auth-server/`,
`scripts/auth-server/`, `package.json` ni el workflow Auth respecto del SHA servido. La rama
integrada sí contiene `754a2a280` como ancestro. Esto resuelve la procedencia Git para una futura
integración **después** de los gates de PR #264 y #262; no acredita que la imagen Cloud Run sea
idéntica ni habilita un dispatch. El guard Auth permite deploy productivo sólo desde `main` y exige
la revisión activa exacta. La PR #262 sigue draft y el SHA remoto de #264 no contiene sus dos fixes
locales.

## Verificación en esta rama

- Suite `src/lib/auth-server`: **708 PASS / 20 skip**. El test SQL opt-in se ejecutó aparte con
  PostgreSQL 16 desechable, las tres migraciones Auth de TASK-1830 y el rol `greenhouse_app`:
  **2 PASS**; [evidencia y límites](../auth-server/2026-10-28-recovery-atomicity-local.md).
- Guard: `test_deploy_contract.py` **11 PASS** y `test_rooms_config_drift.py` **13 PASS**.
- `tsc --noEmit`, ESLint de los TypeScript trasladados y `bash -n` del smoke: PASS.
- `worker:deploy-path-gate`, `worker:build-contract-gate` y `worker:runtime-deps-gate`: PASS;
  el grafo Auth cubierto contiene 247 archivos. `qa:gates --changed` salió 0 y propone gates
  adicionales para el release real.
- [Rooms B18](2026-10-28-b18-guest-without-internal-sso.md) conserva 51 comprobaciones locales
  PASS en la rama peer; esa UI no se trasladó a Greenhouse.
- Codex Security diff scan `c58df935-17df-4c16-9b65-f65eff8c918f` del rango
  `f93583bb0..7135c5284`: 21 archivos de código revisados, 0 hallazgos reportables,
  cobertura del diff completa e informe sellado. Fue revisión del mismo agente y no sustituye
  aceptación independiente ni ensayo en staging/producción.

La aceptación visual de Julio corresponde al preview local del Login V4 en el candidato de origen.
El código visual de la revisión servida no cambió en este traslado; el feed público de novedades
sí es nuevo y quedó probado localmente. No hay CI remoto, lectura visual productiva del candidato,
simulacro integral en staging ni siete días steady. TASK-1833 sigue en curso con B15/B20 parciales,
rotación/scheduler, privacidad V2 y gates de operación pendientes. La UI nueva de Rooms aún no fue
entregada. No hubo push, merge de PR, deploy, cambio de flags, correo ni segundo canary.

## Relectura visual local del Login V4 integrado

El harness del emisor en `127.0.0.1:19065` sirvió `/login/rooms` a 1440×960 y 390×844,
además del login neutral y editorial. Capturas Playwright de los renderers reales en
`.captures/2026-10-28-auth-integrated-v4-local/` (ignorado por Git): HTTP 200, sin errores de
consola/página y sin desborde horizontal. La captura Rooms desktop a DPR 2 coincide con la
referencia aceptada en 2880×1920 (diferencia media de canales 0,01/255). La composición móvil
se revisó visualmente junto a la referencia; la captura no es píxel idéntica y no se usa como
prueba de paridad exacta.

El reader público de Greenhouse devolvió HTTP 200 y tres novedades; `/login/public-feed-preview`
las mostró en desktop y móvil. Se recorrieron las tres placas móviles: texto y CTA visibles,
sin fallback, errores ni desborde. Es QA **local** de contenido público actual; no acredita que
el candidato esté servido por Auth ni reemplaza la aceptación productiva tras release.
