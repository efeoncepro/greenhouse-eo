# Efeonce MCP — matriz de clientes y tokens del canary externo

> TASK-1832 · fecha de apertura: 2026-09-06 · estado: **plantilla publicada; ejecución runtime pendiente**.

## Alcance y regla de evidencia

Esta matriz se completa con una organización canary dedicada y personas `smoke_test` controladas por Efeonce.
No contiene tokens, codes, cookies, verifier, secretos, correo completo ni `sub` crudo. Un verde prueba
compatibilidad técnica; no prueba adopción, usabilidad ni experiencia de una organización cliente.

Al 2026-09-06 están implementados y probados localmente el contrato de propósito/TTL, los gates fail-closed,
la allowlist de una tool, el aislamiento de 360 y el cleanup. El schema se aplicó accidentalmente fuera del
checkpoint y el [readback](TASK-1832_SCHEMA_APPLY_READBACK_2026-09-06.md) confirmó registry/bindings canary en
cero; no se creó el fixture, no se encendieron flags y no se ejecutaron sesiones de cliente. Por eso todas las
filas runtime siguen `PENDIENTE`.

Evidencia local que no sustituye runtime:

- Greenhouse: 144/144 tests focales, `tsc --noEmit`, lint completo con 0 errores y build Next.js verde;
- gateway hermano: `pnpm check` con 152/152 tests, 0 skipped y build verde;
- gates estructurales: manifiesto MCP, rutas, workers, crons, ops/task lint y diff check verdes;
- `secrets:audit` local no concluyente para runtime: 6/8 saludables; `NEXTAUTH_URL` tiene shape local inválida y
  `CRON_SECRET` no está configurado. TASK-1832 no agrega ni rota secretos y sus helpers no imprimen tokens.

## Identidad de la corrida

- `run_id`: `PENDIENTE`
- `canary_registration_id`: `PENDIENTE`
- `manifest`: `PENDIENTE`
- `environment`: `staging → production`
- `organization`: `PENDIENTE` (registrar ID, nunca inferir por nombre)
- `profiles`: `PENDIENTE` (conteo + fingerprint, sin correo/sub)
- `expires_at`: `PENDIENTE`
- `served Greenhouse SHA/revision`: `PENDIENTE`
- `served auth-server SHA/revision`: `PENDIENTE`
- `served gateway SHA/revision`: `PENDIENTE`

## Matriz de compatibilidad

| Cliente            | Revisión    | Redirect                        | Registro                          | Discovery   | Login + consentimiento | Claims redactados | Allow read  | Refresh     | Revocación  | Resultado   |
| ------------------ | ----------- | ------------------------------- | --------------------------------- | ----------- | ---------------------- | ----------------- | ----------- | ----------- | ----------- | ----------- |
| helper TASK-1832   | `PENDIENTE` | loopback `127.0.0.1:<dinámico>` | DCR público                       | `PENDIENTE` | `PENDIENTE`            | `PENDIENTE`       | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| Claude Code        | `PENDIENTE` | loopback exacto                 | `CIMD/DCR observado`              | `PENDIENTE` | `PENDIENTE`            | `PENDIENTE`       | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| Claude Desktop/web | `PENDIENTE` | `PENDIENTE`                     | `CIMD/DCR/pre-registro observado` | `PENDIENTE` | `PENDIENTE`            | `PENDIENTE`       | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| Codex              | `PENDIENTE` | loopback exacto                 | `CIMD/DCR observado`              | `PENDIENTE` | `PENDIENTE`            | `PENDIENTE`       | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| ChatGPT            | `PENDIENTE` | HTTPS hospedado exacto          | `CIMD/pre-registro observado`     | `PENDIENTE` | `PENDIENTE`            | `PENDIENTE`       | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |

Para cada celda de claims registrar sólo:

```text
iss=<origen exacto>
aud=<resource exacto>
sub_fingerprint=<sha256 truncado 16 hex>
azp_matches_client=true|false
scope=<lista no sensible>
gv=<entero>
exp_present=true|false
```

## Pruebas negativas por cliente

| Cliente            | Base-only sobre scope superior | Token expirado | Authority revocada ≤60 s | Sin consentimiento | Externo sobre internal-only | Evidencia   |
| ------------------ | ------------------------------ | -------------- | ------------------------ | ------------------ | --------------------------- | ----------- |
| helper TASK-1832   | `PENDIENTE`                    | `PENDIENTE`    | `PENDIENTE`              | `PENDIENTE`        | `PENDIENTE`                 | `PENDIENTE` |
| Claude Code        | `PENDIENTE`                    | `PENDIENTE`    | `PENDIENTE`              | `PENDIENTE`        | `PENDIENTE`                 | `PENDIENTE` |
| Claude Desktop/web | `PENDIENTE`                    | `PENDIENTE`    | `PENDIENTE`              | `PENDIENTE`        | `PENDIENTE`                 | `PENDIENTE` |
| Codex              | `PENDIENTE`                    | `PENDIENTE`    | `PENDIENTE`              | `PENDIENTE`        | `PENDIENTE`                 | `PENDIENTE` |
| ChatGPT            | `PENDIENTE`                    | `PENDIENTE`    | `PENDIENTE`              | `PENDIENTE`        | `PENDIENTE`                 | `PENDIENTE` |

## Igualdad de sujeto

| Persona smoke_test | Fingerprint loopback | Fingerprint hospedado | Iguales     | Evidencia   |
| ------------------ | -------------------- | --------------------- | ----------- | ----------- |
| `PENDIENTE`        | `PENDIENTE`          | `PENDIENTE`           | `PENDIENTE` | `PENDIENTE` |

## Cleanup y observación

- revocación de familia OAuth: `PENDIENTE`
- revocación de consent/context/session: `PENDIENTE`
- revocación de grant/binding/registro: `PENDIENTE`
- deny con access token previo: `PENDIENTE`
- cleanup staging `deletion_ready=true`: `PENDIENTE`
- cleanup staging `unexpected_refs=0`: `PENDIENTE`
- cleanup staging readback cero: `PENDIENTE`
- siete días de señales estables: `PENDIENTE`
- cleanup production final: `PENDIENTE`

## Veredicto

`NO CERTIFICADO — implementación local completa; rollout, clientes y ventana de observación pendientes.`
