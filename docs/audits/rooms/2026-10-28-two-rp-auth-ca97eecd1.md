# Retest de dos adapters RP — candidato Auth ca97eecd1

**PASS: 35 comprobaciones** usando el mismo arnés Rooms `8750750495b8a19b59d097addd647f34c980eced`,
sin cambios de fuentes. [Recibo saneado](2026-10-28-two-rp-auth-ca97eecd1.json).
Repite el [ensayo anterior con Auth e7b127647](2026-10-28-two-rp-auth-adapters.md).

## Procedencia exacta

Candidato solicitado: `codex/auth-pr-develop-stack@ca97eecd158192ded14af46bc50df139debcebdb`,
en `/Users/jreye/.codex/worktrees/auth-develop-integration/greenhouse-eo`. Se verificó limpio y con
ese HEAD al arrancar el issuer. Durante la preparación de Rooms, otro agente avanzó el checkout a
`0ab8887284169fb2caf6c8be7ba41736790d5ba7`, cambiando exclusivamente:

- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V2.md`.
- `docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`.

Antes y después del recorrido se comprobó que no había cambios de fuentes ni WIP y que los dos
scripts del issuer eran byte por byte iguales a ca97eecd1. El JSON conserva ambos SHA, las dos rutas
documentales y hashes. No se presenta el HEAD observado como si fuera literalmente el solicitado:
la atribución es a sus **fuentes ejecutables idénticas**. Esta sesión no modificó ni cambió de rama Auth.

## Ejecución y resultado

Auth, desde ese checkout:

```sh
python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --second-rp-redirect-uri http://localhost:19337/auth/callback --port 19334 --redirect-uri http://127.0.0.1:19335/auth/callback
```

Rooms, con PG18 temporal/puerto dinámico y ocho migraciones aplicadas, roles mínimos runtime/migrator,
allowlist de tooling y credenciales sólo en el entorno privado:

```sh
node --conditions=react-server --import tsx scripts/auth-two-rp-integration.ts --issuer-fixture <ruta-absoluta-privada>
```

Un BrowserContext, dos hosts de RP y la misma sesión issuer sin renovar: login legítimo de ambos200,
cookie cruzada401 en ambos sentidos, callback+transacción cruzados400 invalid_transaction, transacción
original sin consumir en SQL y callback original aún funcional. Logout ajeno no revoca al dueño;
ambas sesiones legítimas coexisten. El replay explícito se comprueba además de la separación natural
entre cookies de127.0.0.1 y localhost. La clave de cifrado compartida deliberadamente sóloQA se conserva.

## Límites y cierre

El entrypoint ejecutado es `scripts/auth-server/first-party-local-server.ts`, que monta el protocolo
first-party y store PostgreSQL reales. **No se ejecuta `services/auth-server/server.ts` como servidor
completo**: esta prueba no certifica cambios de middleware/montaje/config de ese entrypoint, aunque
sean del mismo candidato. Tampoco acredita dos productos completos, HTTPS/Secure/__Host-, MFA
humana, Microsoft, entitlements entre productos, runtime cloud o aceptación de la nueva UI Claude.
RP2 sigue siendo otro adapter del mismo consumer Rooms y la autoridad es sintética.

Ambas bases fueron efímeras y retiradas. Puertos issuer19334/RP1-19335/RP2-19337 (IPv4+IPv6) y PG54390
libres; Rooms conserva checkout limpio8750750 y no se tocó su DB habitual. Sin trazas, cookies, códigos,
secretos ni callbacks persistidos en evidencia pública. Sin correo, canary, push, merge, deploy ni flags.
No se repitieron lint/types/full suite porque Rooms no cambió; este recibo acredita la ejecución nueva.
Contrato dueño: [entrada RP y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
