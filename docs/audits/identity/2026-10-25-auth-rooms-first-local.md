# Efeonce Auth y Rooms: implementación y verificación local

Fecha: 2026-10-25. Alcance autorizado por Julio: Rooms primero, login renovado de Greenhouse en Auth, discovery paralelo y coordinación con la sesión de Rooms.

## Entrega

- TASK-1834 posee el registro first-party, OIDC code + PKCE S256, identidad vigente e introspection/revoke independientes del consentimiento MCP.
- TASK-2064 adapta la pantalla V4 aprobada a HTML/CSS/JS del emisor. Entrada neutral «Entra a Efeonce» y contexto Rooms sólo desde un RP registrado. Microsoft, passkey y enlace por correo conservan sus contratos reales.
- TASK-2063 conserva la migración posterior de Greenhouse; no se cambia NextAuth del portal con esta entrega.
- TASK-2067 implementa el código de invitación: un correo gobernado Resend incluye enlace y código, con HMAC, caducidad, presupuestos agregados y consumo único. Rooms mantiene invitaciones, permisos y sesión guest mediante TASK-2066.
- La sesión «Mira el epic de rooms» posee TASK-2065/2066 y el runtime hermano. Contratos y callback `/auth/callback` acordados; recorrido integrado browser/PG reales PASS.

## Evidencia verificada

| Control | Resultado |
| --- | --- |
| Regresión Auth, servicio HTTP y correo | 571 tests PASS, 16 omitidos por gates SQL/live; no presentados como ejecutados |
| PostgreSQL first-party efímero, roles de runtime reales | 6 PASS; GC dry/apply, registro/audit, restricciones, concurrencia/replay, transacciones, revocación y procedencia corporativa |
| Authority HTTP y registro de RP | 22 PASS; URL fija, token de servicio separado, payload acotado, binding exacto, no caché y fallos cerrados |
| Runtime OTP | 8 PASS; gates OFF, RP activo explícito, exclusión de cookies/Origin, despacho sin exponer correo ni link |
| Firma | `typ` de proof `rooms-invitation-proof+jwt`; JWT ordinario conserva `JWT` |
| Rooms → Auth → Rooms | Peer TASK-2065 ejecutó `../efeonce-rooms/scripts/auth-integration.ts`: Chrome + PG ambos runtimes; 0/1/N, permisos separados, cross-org404, logout401 y revocación issuer401 PASS. Hallazgo `iss` del callback corregido y regresionado |
| Typecheck global | `pnpm typecheck` PASS |
| GC integrado | 10 PASS; misma transacción/lock, helpers ausentes no bloquean deploy previo, retención extendida no se acorta |
| Bundle del servicio | esbuild con aliases del Dockerfile PASS; artefacto temporal eliminado |
| Shell de despliegue | `bash -n services/auth-server/deploy.sh` PASS; script no ejecutado |
| Taxonomía modificada | `pnpm ops:lint --changed`: 0 errores; advertencias históricas de paridad/stale-progress fuera de esta entrega |
| Revisión visual independiente | Pantalla desktop/móvil y correo móvil inspeccionados; sin texto cortado ni desborde observado |

Revisión independiente adicional: corregido retry OTP que omitía auditoría; 15 tests core PASS y reintento falla cerrado sin duplicar correo. Basic malformado devuelve 401.

QA propia de cada unidad y evidencia visual detallada: tareas TASK-1834, TASK-2064 y TASK-2067. El arnés usa PostgreSQL nuevo y claves ES256 de prueba; no es un canary productivo.

## Ejecución reproducible

```sh
python3 scripts/qa/verify-auth-first-party-local-pg.py
python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --redirect-uri http://127.0.0.1:19335/auth/callback
bash scripts/auth-server/email-otp-local-smoke.sh
pnpm exec vitest run src/lib/auth-server services/auth-server --reporter=dot
pnpm typecheck
```

El modo `--serve` conserva el cluster hasta finalizar el proceso y escribe la configuración de fixture con modo 0600. No copiar sus secretos ni cookies a documentos o logs. El modo ordinario limpia el cluster al salir.

## Estado de runtime y trabajo posterior

Implementación local. No se aplicaron migraciones en Cloud SQL, no se registró un RP cloud, no se desplegó Auth y no se envió ningún correo real. Los gates first-party e invitación nacen OFF y el nuevo tipo de correo queda deshabilitado en SQL.

El consumidor OIDC ya se integró y verificó localmente. La invitación OTP también pasó E2E local TASK-2066 con ambas PG y ES256, entrega RAM única, lectura guest, aislamiento y revocación. Ambos harnesses de identidad/OTP y sus datos/credenciales temporales se eliminaron al terminar. Antes de activar: aplicar las migraciones por el carril gobernado; registrar el RP con callback exacto; montar secretos separados de HMAC y autoridad; comprobar el remitente y el enlace recibido con canary autorizado; verificar login/logout/revocación en el entorno destino. El feed vivo de novedades permanece pendiente: la pantalla usa el fallback fotográfico oficial, sin acoplarse a los readers del portal.
