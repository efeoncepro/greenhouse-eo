# Efeonce MCP — matriz de clientes y tokens del canary externo

> TASK-1832 · fecha de apertura: 2026-09-06 · estado: **fixture y navegadores certificados; matriz OAuth/MCP pendiente**.

## Alcance y regla de evidencia

Esta matriz se completa con una organización canary dedicada y personas `smoke_test` controladas por Efeonce.
No contiene tokens, codes, cookies, verifier, secretos, correo completo ni `sub` crudo. Un verde prueba
compatibilidad técnica; no prueba adopción, usabilidad ni experiencia de una organización cliente.

Al 2026-09-06 están implementados el contrato de propósito/TTL, los gates fail-closed, la allowlist de una tool,
el aislamiento de 360 y el cleanup. Existe un único fixture registrado y documentado en su manifiesto; M365,
magic link, sesión, passkey real en Chrome, reutilización en Safari, step-up UV y logout tienen readback. Los
gates canary siguen OFF y todavía no se ejecutó el flujo OAuth/MCP de las filas siguientes; esas celdas permanecen
`PENDIENTE` hasta contar con evidencia del issuer y gateway, no por inferencia desde la sesión.

Evidencia local que no sustituye runtime:

- Greenhouse: 144/144 tests focales, `tsc --noEmit`, lint completo con 0 errores y build Next.js verde;
- gateway hermano: `pnpm check` con 152/152 tests, 0 skipped y build verde;
- gates estructurales: manifiesto MCP, rutas, workers, crons, ops/task lint y diff check verdes;
- `secrets:audit` local no concluyente para runtime: 6/8 saludables; `NEXTAUTH_URL` tiene shape local inválida y
  `CRON_SECRET` no está configurado. TASK-1832 no agrega ni rota secretos y sus helpers no imprimen tokens.

## Identidad de la corrida

- `run_id`: `task-1832-canary-20260906-a`
- `canary_registration_id`: `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`
- `manifest`: `TASK-1832_CANARY_ASSET_MANIFEST_task-1832-canary-20260906-a.md`
- `environment`: `staging → production`
- `organization`: `org-602d7057-7fd5-47e7-b73b-21892e3f06e7` (dedicada, no cliente)
- `profiles`: `1`, `data_origin=smoke_test`, Person 360 `0` (IDs exactos sólo en el manifest)
- `expires_at`: `2026-09-14T19:43:30Z`
- `served Greenhouse SHA/revision`: `PENDIENTE`
- `served auth-server SHA/revision`: `PENDIENTE`
- `served gateway SHA/revision`: `PENDIENTE`

## Matriz de correo, sesión y passkey

| Superficie | Evidencia | Resultado |
| --- | --- | --- |
| M365 compartido | mensaje visible en `Creative - Efeonce`; delivery `2108c319-c433-4c82-90e0-e5304b6fde5c`, estado `delivered` | `PASS` |
| Magic link Chrome | consumo scanner-safe por POST; sesión `amr=magic_link`; cierre/revocación leídos en DB | `PASS` |
| Passkey Chrome | plataforma real; registro + login descubrible `primary` + step-up explícito `passkey,uv`; logout, activas `0` | `PASS` |
| Passkey Safari | misma credencial descubrible; login real `amr=passkey`; terminal visible y logout con razón `logout` | `PASS` |
| Google controlado | no provisionado; Gmail personal se excluye como evidencia laboral | `PENDIENTE` |

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
