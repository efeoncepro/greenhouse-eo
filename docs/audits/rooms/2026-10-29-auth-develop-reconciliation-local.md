# Auth + Rooms — reconciliación local en la línea develop (2026-10-29 UTC)

## Guard de revisión activa añadido después del corte inicial

En las ramas locales de guard `main@c3e89bdb3` y `develop@6a20397eb`,
`auth-server-deploy.yml` ahora comprueba después del deploy que Cloud Run
sirve **una sola revisión con 100% del tráfico** y que su `GIT_SHA` coincide
con el SHA objetivo. Si el deploy se omitió por equivalencia de runtime,
exige que siga activa la revisión observada en el preflight. Una decisión de
deploy ausente o un SHA incompleto fallan cerrado. El resumen de release
registra por separado el SHA objetivo y el SHA de la revisión activa. La
misma corrección está en la rama Auth apilada `f2f221257`.

El workflow anterior podía terminar verde al observar `Ready=True` y la
última revisión lista aunque el tráfico siguiera en otra revisión. El test
offline ejecuta el bloque real del workflow: guard main **11/11 PASS**,
guard develop y rama Auth **13/13 PASS**. `worker:deploy-path-gate` cubre los
247 inputs de Auth y `workflow-allowlist.test.ts` da 16/16 PASS en la rama
apilada. No hubo deploy ni lectura cloud nueva: la comprobación productiva
del SHA activo sigue pendiente de promoción autorizada.

Codex Security selló el scan de diff `95b60ebb-3592-47d3-b20b-c6752f9a9d65`
para `e139363d5..6a20397eb`: revisó los dos archivos cambiados y las rutas
de release/deploy que los sustentan, con **0 hallazgos reportables** en ese
alcance. El bloque `Verify active Auth revision` tiene el mismo SHA-256 de
contenido (`3a02cb4c66b51729` como prefijo) en guard main, guard develop y
stack Auth. El scan no prueba ejecución en GitHub Actions ni lectura viva de
Cloud Run; la política de seguridad aplicable conserva el reporte detallado
fuera de este repositorio.

**Estado: candidato local; release retenido.** La rama `codex/auth-develop-reconciled-local`
parte de `codex/auth-develop-integration-local@92f24c710` y conserva como ancestro el SHA
`754a2a28045ebfc9353c86a2d6236ecf59dd805e` que sirvió Auth en el último readback.
No se hizo un merge ficticio del candidato focal: `git merge-tree` mostró 45 conflictos,
incluidos documentos, workflow y runtime. Se trasladaron cambios concretos sobre la línea
que ya contiene ese SHA.

## Cambios y comprobaciones

La sesión dueña de Rooms repitió después su arnés de dos adapters contra las
fuentes ejecutables de `codex/auth-pr-develop-stack@ca97eecd1`: **35 checks
browser/HTTP/PG PASS**. El checkout avanzó a `0ab888728` sólo por dos
documentos durante la corrida; el peer verificó la equivalencia de los
scripts del issuer y dejó recibo saneado en su commit local `6462910e0`,
`docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md`. Cookie y callback
cruzados se rechazaron en ambos sentidos, sin consumir la transacción dueña;
los dos logins legítimos coexistieron. El arnés ejecutó el issuer QA con
protocolo/store reales, no `services/auth-server/server.ts` completo ni HTTPS
productivo. No se incorporó WIP de Rooms a esta rama.

- `9ac6b470b`: revocación de consentimiento OAuth y familias access/refresh en una transacción.
  PostgreSQL desechable con migraciones TASK-1828/1829 y rol `greenhouse_app`: 3/3 PASS,
  incluidos rollback por fallo en refresh/access y aislamiento de otro entorno.
- `9ee370dde`: código OTP de Rooms falla cerrado si falta o falla la lectura de su gate;
  el feed público del login usa caché local de 30 segundos con petición concurrente única.
  Pruebas focales de anuncios y delivery: 35/35 PASS.
- `a8395d3ba`: el login deriva marca y retorno del RP registrado y rechaza la
  continuación cruzada. Suite de protocolo first-party: 20/20 PASS.
- `20b9a8815`: smoke local HTTP + PostgreSQL de dos clientes first-party. Pasó la
  separación de redirect, code, audiencia JWT, handle, revocación y sesión de issuer
  compartida. El B10 local `--mcp-smoke --mcp-pg --mcp-authority` volvió a pasar con reader
  real de autoridad externa y grants en la base efímera; no equivale a browser/gateway cloud.

En el HEAD `20b9a8815`: suite `src/lib/auth-server` **713 PASS / 23 skip**;
`test_deploy_contract.py` **11 PASS**; `worker:deploy-path-gate` PASS con 247 inputs del
bundle Auth cubiertos; TypeScript y ESLint focal PASS. Los archivos de guard, rotación
de llaves y pruebas de transporte más recientes de develop se conservaron. La prueba
de aislamiento de dos clientes usa dos registros locales en un mismo issuer, no dos
productos desplegados.

## Límites y siguiente secuencia

La rama local aún no está en PR #262/#264; los guard fixes de #263/#264 tampoco están
publicados. El SHA servido como ancestro resuelve sólo la procedencia Git de esta
ruta; el guard exige además revisión activa exacta, inputs del build y aprobación
del release. TASK-1833 continúa en curso: B15/B20 parciales, simulacro de recuperación
y rotación en staging, decisión de privacidad/retención y observación productiva.
La UI nueva de Rooms de Claude Design sigue sin entrega. No hubo push, merge remoto,
deploy, cambio de flags, segundo canary ni correo.

## Scan del delta y corrección posterior

Codex Security cerró el scan `d93e47e0-416e-406f-b2b7-7df42ff0b56c` para
`92f24c710..e0113bde4`: 14 archivos fuente revisados, un hallazgo bajo en
el runner PostgreSQL local y ningún bypass de producto confirmado. El runner
iniciaba `initdb -A trust` y TCP loopback; un `pg_hba.conf` generado confirmó
acceso local sin contraseña. El riesgo exigía otro usuario del mismo host
durante la prueba; no hubo evidencia de exposición remota ni productiva.
La coordenada del hallazgo sellado quedó desplazada dos líneas: en
`e0113bde4`, `initdb` y `pg_ctl` están en las líneas 14–15 del runner;
las líneas 16–17 son los clientes PostgreSQL. El control y el riesgo
descritos por el scan corresponden a las líneas 14–15.

`245851792` movió ese PostgreSQL a un socket Unix dentro de un directorio
`0700`, deshabilitó TCP y exigió en el test socket privado del usuario actual.
La prueba con migraciones reales volvió a dar 3/3 PASS y verificó
`listen_addresses=''`; TypeScript, ESLint y `bash -n` PASS. El mismo commit
evita que el callback predeterminado del segundo RP coincida con el primero.
Los smokes de dos RP pasaron con callback normal y con el primer callback
personalizado en el puerto antes conflictivo. El scan quedó sellado sobre el
SHA anterior; estas pruebas y el nuevo commit son evidencia del fix local.

## Rama apilada para revisar la PR de Auth

La rama `codex/auth-pr-develop-stack` se reconstruyó localmente sobre el
guard develop actualizado `6a20397eb` en `414729486`. La comparación de
árboles contra el corte anterior `6af682cce` dio exactamente
`174d9d3d3069c3d490699f3782ae4799b4db6cfa`: no cambió ningún archivo
al corregir la procedencia. `git merge-base --is-ancestor 6a20397eb HEAD`
pasó y el árbol quedó limpio. El diff Auth frente al guard actualizado tiene
64 archivos; la reconstrucción evita depender de commits paralelos del guard
en la PR hacia develop. El resumen de PR propuesto está en el
[handoff de PR](2026-10-29-auth-pr-readiness-local.md); sigue sin publicar.

La rama local `codex/auth-pr-develop-stack@fa84dc95e` nace del guard develop
`e139363d5`; ese guard y el SHA Auth servido `754a2a280` son ancestros
reales. Su árbol es idéntico al de
`codex/auth-develop-reconciled-local@231646a3f`
(`156553d68404bed533a8847fa171d15fd83c6c18`). El diff frente al guard
tiene 64 archivos de código, pruebas y documentación, con 3.900 líneas
agregadas y 269 removidas. No hubo merge vacío para fabricar procedencia.

Readback GitHub de sólo lectura, 2026-10-29 02:10 UTC:

| PR | SHA remoto | Rama local preparada |
| --- | --- | --- |
| #262 `develop → main` draft | `f93583bb0` | Espera la integración y revisión del batch de develop. |
| #263 guard `main → main` | `5e1fc2554` | `codex/auth-production-deploy-guard@47817496b`. |
| #264 guard `develop → develop` | `aabd6d78d` | `codex/auth-production-deploy-guard-develop@e139363d5`. |

Tras levantar la retención, la secuencia de preparación remota es actualizar
y validar #263/#264, incorporar el guard develop, publicar la rama apilada como
PR de Auth hacia develop y obtener CI sobre el SHA remoto exacto. #262 debe
revisarse de nuevo con ese develop y con el control plane de release antes de
promover a main. Ningún gate local autoriza un push o merge productivo por sí
solo; los flags permanecen OFF hasta una decisión de rollout separada.

En `codex/auth-pr-develop-stack@c9ec3dd8d` también pasaron
`worker:build-contract-gate`, `worker:runtime-deps-gate`,
`test_rooms_config_drift.py` (13/13) y
`src/lib/release/workflow-allowlist.test.ts` (16/16). El código de esa rama
es el mismo código verificado por los smokes y la suite Auth; su último commit
sólo agrega documentación de handoff. Faltan CI y preflight sobre el SHA remoto que se
publique después de levantar la retención.
