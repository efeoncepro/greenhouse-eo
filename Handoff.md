# Handoff activo

**TASK-1832 — ownership y plan P0/Alto, checkpoint pendiente (Codex, 2026-09-06):** goal confirmado y
`pnpm codex:task-hook TASK-1832 --develop` verde. La task pasó a `in-progress` y el plan quedó en
`docs/tasks/plans/TASK-1832-plan.md`. Auditoría de código/schema/runtime confirmó tres fronteras: el command
comercial conserva `client|both` + `active_client`; el gateway actual no autoriza tools de negocio a
`native-external`; y `person_360`/la búsqueda 360 todavía incluyen perfiles `smoke_test`, por lo que el plan
agrega una exclusión específica para esa procedencia sin redefinir `demo|synthetic_seed`. Diseño propuesto:
registry exacto vacío, purpose canary inmutable, TTL, una sola capability read-only
(`growth.seo.observation.read`), perfiles exclusivamente `smoke_test`, sin
designated admin, gates independientes default OFF en emisor/gateway, allow sólo de `get_seo_entitlement`,
revocación y evidencia redactada. No se implementó código/ADR, no se aplicó migración, no se crearon datos ni
cuentas, y no hubo push/deploy. WIP de TASK-1835 preservado. Siguiente paso: checkpoint humano del plan;
el apply queda además condicionado a autorización para crear un fixture canary dedicado y cuentas M365/Google.
Por instrucción posterior del operador, la organización debe poder eliminarse: `EO-ORG-0050` queda descartada
porque su lifecycle append-only bloquea hard delete. El plan exige organización inactiva/disqualified sin historia
comercial, manifest exacto por corrida, cleanup dry-run/apply, protección de assets compartidos y readback cero;
template en `docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md`.

**Readback adicional TASK-1832 (14:57Z, sólo lectura):** los 30 perfiles `smoke_test` vigentes aparecen hoy en
`greenhouse_serving.person_360`; ninguno tiene membership, `client_user` o contacto CRM. Los seis perfiles usados
por smokes de identidad externa conservan history, pero tienen source link inactivo, invitación/binding revocados
y sólo `efeonce.invalid`, sin entrega real: no hay cobertura M365/Google. El único candidato existente con nombre
diagnóstico es `EO-ORG-0050` (`other`, `disqualified`, cero spaces/memberships/bindings), pero tiene historia de
lifecycle/commercial party y queda descartado porque no es eliminable sin destruir evidencia append-only. Evidencia:
`docs/audits/mcp/TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md`. Sin escrituras ni cambios runtime.

**TASK-1835 (EPIC-044 U06) — `UI ready: yes`, code complete, SIN DESPLEGAR (Claude greenhouse-eo-06, 2026-09-06;
commits `85c67e97d` · `4eb358d5b` · `b15b1690e`).** Efeonce ID queda enterprise-ready en local. Tres hallazgos que
importan más que el trabajo planificado:

1. **El login por passkey no existía.** Backend (`/auth/passkeys/authenticate/*`) y copy estaban desde el
   2026-09-04, pero `/login` no ofrecía el método: los cuatro ids `login_passkey_*` llevaban dos días huérfanos.
   Hallazgo del operador. Implementado con el patrón del step-up; `renderLoginPageResponse` exige el nonce en su
   TIPO, así que el compilador —no la disciplina— impide servir la página sin script.
2. 🔴 **`violations: 0` de axe era una medición vacía.** En las 40 capturas del emisor axe devolvía las 24 filas de
   texto de cada página en `incomplete` («background could not be determined due to a pseudo element»): el lienzo
   pinta su azul con degradado y `::after`. Nunca midió una. Debajo del cero, la ficha de aplicación y el aviso
   «no verificada» del consentimiento estaban a **1.53:1**. Causa raíz: `.id-context`/`.id-muted` compartidas entre
   la ficha (sobre el azul) y el bloque del destino (dentro de la tarjeta) — un color cruzando fondos opuestos.
   Mecanismo nuevo `pnpm auth-server:verify-contrast` (muestrea píxeles): **272 textos, 0 bajo el piso WCAG**.
   *Aplica más allá de esta task: cualquier superficie con fondo compuesto tiene el mismo punto ciego.*
3. 🔴 **Nadie puede tener una passkey.** `/auth/passkeys/register/*` existe y NO tiene superficie en ninguna parte;
   el step-up sólo enrola TOTP. El botón nuevo es un camino inerte hasta que exista el alta, y `EPIC-044` tampoco
   tiene nodo para eso. Hueco del programa → follow-up en la task.

Evidencia: GVC premium 20 fixtures × desktop 1440 y móvil 390 = 40 capturas 20/20; scorecard 4.63 / piso 4.5; los
cuatro gates `ui:*` PASS; `pnpm test` 13896 passed; typecheck limpio; worker gates verdes. Patrón «runtime sin
React» registrado en `PATTERNS.md`. **Próximo paso: NO empujar sin decidirlo** — `auth-server-deploy.yml` dispara
con `src/lib/**` sobre el Cloud Run único que sirve `auth.efeonce.org` en vivo: el push ES el despliegue.

**TASK-1832 / TASK-1841 — certificación sintética separada del piloto cliente (Codex, 2026-09-06):** U07 ya no
usa una organización cliente real para probar la tecnología. TASK-1832 certifica el camino productivo completo
con cuentas M365/Google controladas por Efeonce, personas `data_origin='smoke_test'`, organización canary no cliente,
binding de propósito explícito, Claude/Codex/ChatGPT y Chrome/Safari; un verde acredita preparación técnica, no
adopción ni usabilidad cliente. TASK-1841 (U16) reserva el primer uso real para una organización ya existente en
Account 360, un administrador consentido y una capability read-only vigente, sólo después de TASK-1832/1833/1835,
con acompañamiento y observación por siete días. El cliente nunca actúa como tester ni comparte tokens o logs.
Este cambio es sólo de tasks/registry/README/epic/handoff/changelog: no crea cuentas, bindings, migraciones, flags,
invitaciones, implementación, push ni rollout. Siguiente ID libre: TASK-1842.

**TASK-1840 — logout multiproducto registrado, sin implementación (Codex, 2026-09-06):** unidad backend-critical
separada de TASK-1834 para tres operaciones distintas: salir sólo del producto, cerrar la sesión Efeonce ID del
navegador actual y cerrar todas las sesiones. El contrato exige `sid` opaco, RP-Initiated/Back-Channel Logout,
ledger/tombstone server-side por RP, fan-out durable, revalidación, auditoría, señales, conformance multi-RP y
rollback. No revoca consentimientos, roles, entitlements, memberships, `gv`, factores ni upstream Microsoft/Google.
TASK-1834 y Globe quedan como consumers separados. Sólo task/registry/README/epic/handoff; sin código, migración,
flag, push, deploy ni modificación de TASK-1834. Siguiente paso: Slice 0/Delta ADR con checkpoint humano.

**TASK-1834 — especificación corregida, sin implementación (Codex, 2026-09-06):** auditoría paralela contra
código/ADRs confirmó que `auth.efeonce.org` aún no entrega OIDC utilizable por NextAuth (sin `openid`/`id_token`/
`userinfo`, access token con audiencia MCP) y que source link + binding no bastan sin `client_users`/acceso vigente.
Una segunda auditoría de autorización confirmó que Efeonce Auth debe probar identidad, no emitir permisos del portal:
OIDC Greenhouse queda separado de scopes/consentimiento/`gv`/grants MCP, mientras Greenhouse conserva roles, route
groups, vistas internas, módulos cliente, entitlements, `can()` y scopes de datos. La task ahora cubre clientes +
internos mediante Delta ADR, OIDC de audiencia Greenhouse, resolvers separados hasta `TenantAccessRecord`, ledger,
UI/flow/motion y rollout por población; preserva Microsoft, Google, credenciales y magic link. También deja como gates
de activación la sesión que hoy conserva claims al quedar inactivo el principal, el drift de vigencia de roles PG/BQ,
la selección multicontexto no determinista y la posible diferencia entre permisos del Admin Center y enforcement
`can()`. TASK-1832/1833 gatean activación, no dark deploy. Sólo docs locales; sin código, commit, push ni deploy.
**Dirección adicional del operador:** Efeonce ID será la identidad humana canónica de todos los productos Efeonce
para clientes e internos; Greenhouse es el primer relying party, no el dueño permanente del login. Cada producto
mantiene cliente/audiencia/cookie/sesión y autorización propios; una identidad con varias relaciones selecciona un
contexto sin sumar permisos. Auditoría Globe: hoy usa el broker Greenhouse, acepta sólo internos y conserva tenancy
en transición, por lo que su adopción requiere unidad y Delta propios coordinados con TASK-1480/TASK-1511. TASK-1834
ahora exige Delta ADR multiproducto, foundation OIDC reusable, conformance cruzada y registro de esas unidades antes
de implementar. Siguiente paso: plan/ADR de Slice 0 con checkpoint humano antes del primer cambio de código.

**TASK-1837 (EPIC-044 U12) — `EN PRODUCCIÓN 2026-09-06, COMPLETE`.** Release `b3e324cb5c8d-3cfce865-236f-4e4e-b128-8e144de193cf` (run `34029501838`, PR #227, target `b3e324cb5c8d`), manifest `released` 11:23:09Z en un solo intento. Break-glass con hechos (la migración `20260906004450748` ya estaba aplicada en la instancia única, `run_on 04:27:58Z`); el smoke de `main` se PRODUJO en vez de bypassearse. Cinco servicios Cloud Run OK: `ops-worker` y `auth-server` quedaron en `2b385284d594` con **hash de árbol IDÉNTICO** al target (`d3a1432a1f71`) — no-op legítimo probado por identidad de árbol, no por el change-gate; watchdog `drift_count=0`. Ambos flags `EXTERNAL_INVITATION_*` ON en Production (valor live leído con `vercel env pull`) + redeploy obligatorio `greenhouse-j7aix61yk`. **Canary de contrato contra producción**: la misma llamada a la lane delegada pasó de `404` anti-oráculo a `422 field=bindingId`, y con `organizationId` a `403 forbidden` — la lane ejecuta la resolución de autoridad, no sólo existe. Federación mergeada en `efeonce-mcp` (PR #3 → `65ae1d5`, revisión `00038-8jj`); ese repo **NO** despliega en push a `main`, va por dispatch de `deploy.yml`.

**Pendiente real (no bloqueante):** (1) la **primera persona CLIENTE real** es decisión comercial tuya — hasta que exista, el flujo delegado de punta a punta y las dos tools del gateway sólo están probados en staging y por los negativos del canary; (2) la señal `identity.external_invitation.token_revealed` marca 3 por las revelaciones de prueba y **se apaga sola** al vencer su ventana de 24 h; (3) **punto ciego abierto en el gate de versión del gateway**: `test/version.test.ts` sólo compara el hash de las tools FEDERADAS desde Greenhouse, así que las tools propias del gateway crecieron la superficie de 37 a 39 con el test verde y `version` congelada — se subió a `1.1.0` a mano, pero la próxima volverá a pasar sin bump.

**Barrido documental del 2026-09-06 (posterior al release).** Tres agentes disjuntos actualizaron identidad, MCP/gateway y control plane de release: los dos docs funcionales y el manual de identidad pasan a estado de producción, el runbook del MCP documenta por primera vez que **el gateway se despliega por dispatch manual, nunca por push a `main`**, que su servicio Cloud Run vive en `southamerica-west1`, y la diferencia entre `GREENHOUSE_ECOSYSTEM_API_URL` (producción, la que usan los providers) y `GREENHOUSE_API_URL` (dev-greenhouse, fondeo Globe). El playbook de release suma el caso positivo del día y dos anti-patterns: pedir la autorización de mutaciones externas al EMPEZAR (costó 64 min con la evidencia ya verde) y no leer como drift un SHA distinto cuando los ÁRBOLES son idénticos.

**Dos defectos encontrados por la verificación cruzada, ambos cerrados el mismo día.** (1) El gate de versión del gateway medía sólo las tools federadas: `efeonce-mcp` PR #4 (`5c28a7a`) lo cambia a medir el servidor construido; visto encenderse en los dos casos. (2) Al agregar `efeonce.mcp.identity.write` se cubrió el documento del RECURSO pero no el bloque del emisor NATIVO, así que el scope salía sólo cualificado y un cliente que armara su authorize desde discovery nunca lo habría pedido: `efeonce-mcp` PR #5, abierto, con test de regresión visto fallar sin el arreglo. ⚠️ Ese fix **no** agrega el scope a Entra, que el ADR del gateway prohíbe explícitamente.

**TASK-1836 / TASK-1831 — evidencia consolidada, 2026-09-06:**
Tres subagentes actualizaron contratos, funcionales, manuales, tasks/epic y skills espejo.
[Mapa de construcción, pruebas y pendientes](docs/audits/2026-09-06-task-1836-1831-consolidated-evidence.md).
PR225 está certificado: main `08acfb2c6`, run `34000876213`, manifest released sin override.
Canary MCP real: emisión, lectura propia, aislamiento y revocación en 6.633 s; refresh y rollback
medidos. Piloto gv5, vencimiento original 2026-09-12T15:00Z, señales unaudited/mixed cero.
El fix directo quedó promovido por PR226 a main `456d9accf`: release `456d9accffb6-3b09047e-c37f-4ac7-acbc-0e463e1610fd`,
run `34005056894` success, auth `00032-h45` Ready100% y cinco servicios con el SHA exacto.
Flags OAuth/personas/interno ON; Microsoft visible y clic correcto en `/login` público a1440/390.
Gateway `00036-5wc` sigue Ready100%, nativo/interno ON. Próximos pasos: reconciliar alcance del PR
antes de promover (Claude añadió TASK1837 después del corte21aa), probar retorno humano `/auth/session`
y logout; completar matrices externas/multicontexto y WebKit con los owners. No extender el piloto.
El primer run `34004535327` quedó aborted por un deploy concurrente de develop; el retry se hizo sin bypass
tras drenar esa carrera. No existe todavía un nuevo canary humano directo completo.

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

**MCP gateway — cartel del servidor, 2026-09-05 — DESPLEGADO:** `efeonce-mcp` `815df9b` en producción,
revisión `efeonce-mcp-gateway-00036-5wc`. El gateway declara `title`/`websiteUrl`/`icons` y sirve UN ícono
(isotipo blanco sobre placa navy opaca, sin `theme`, sin radio horneado). Front door verificado en vivo:
`/icon-512.png` 200 `image/png` con bytes idénticos al asset del repo y sin challenge de auth;
`/.well-known/oauth-protected-resource` 200; `POST /mcp` sin token 401 (fail-closed intacto);
`/icon-512-dark.png` 404; `auth.efeonce.org/readyz` 200 (el piloto de TASK-1836 no se tocó). El deploy llevó
sólo estos commits: la revisión anterior `00035-bhd` estaba construida desde `d7469d7`, su padre exacto. Sin
impacto visible: ningún cliente Claude renderiza `icons` todavía. Razones:
[ADR](docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) §Delta 2026-09-05.

**Berel, 2026-09-04:** Playbook Producción y feedback nuevo de septiembre leídos completos y promovidos a
`berel-content-production` en los espejos Claude/Codex. La skill ahora distingue ficha técnica de página
pública, elimina lenguaje interno del cuerpo, agrega la rama de awareness con render oficial, normaliza
Kelvin/tablas/CTA y registra catálogo y pendientes técnicos. Se preservaron las reglas posteriores que
superan líneas antiguas del Playbook. Alcance local documental: no se tocaron artículos, assets, Drupal ni
el estado de publicación. Ver `SOURCES.md` de la skill para IDs, timestamps y drift.

**SEO/AEO y Berel, 2026-09-04:** método de informes documentado en
[modelo operativo](docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md) y skills espejo.
[Auditoría agosto](docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md) guardada y verificada en
[Notion](https://app.notion.com/3d139c2fefe781ba8928eef8dadfb219) y Markdown. El run EO-GRUN-00049
no es línea base comercial válida: categoría amplia y probes MCP/API falsos positivos. Corregir instrumento
y repetir medición sigue pendiente; este cambio solo documenta el método y el caso.
[Informe PDF A4](docs/audits/seo/berel-agosto-2026/BEREL_INFORME_AGOSTO_2026_A4.pdf): 55 páginas revisadas,
desempeño de Berel y pie institucional completo. [Estándar de informes](docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md)
y skill `report-studio` creada para Claude/Codex: investigación primaria, siete módulos, plantillas y preflight probado. HTML queda como insumo; cobertura On-time explícita y exportación reproducible. Entrega local, sin envío al cliente.


**Globe, 2026-09-03:** caller externo pausado; protección deploy sólo local, sin commit/push/deploy.
Platform debe promoverla y medir ahorro. Reactivación/evidencia:
[runbook TASK-1807](docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).

**RELEASE 2026-09-04 `9100bbd2765d` — `released`** (greenhouse-eo-45; run `33893120972`; PR #221; manifest `9100bbd2765d-d5fae366-…`). EPIC-044 en producción: `auth-server` vivo (readyz 200, JWKS 2 kid, rev `auth-server-00005-pk8`, `oauth:false`); lane 1631 verificado (200/400/401); Vercel READY; watchdog `ok` 5/5 (ops-worker y auth-server change-gated, árbol idéntico). Post-release: `AUTH_SERVER_JWKS_URL` en Vercel Production+staging + redeploy; environment `efeonce-auth` registrado `draft` (`pnpm auth-server:register-issuer-environment`). Fix en develop: el watchdog ya clasifica el change-gate del `auth-server` (espejo + test de paridad). Pendientes: señales `identity.external_binding.*` en prod con sesión humana; retiro de llave v1 (eo-0f); `AUTH_SERVER_OAUTH_ENABLED` ON en staging con environment `active`. Detalle: ledger de tiempos.

🔴 **TASK-1830 — el correo del magic link está MUERTO en producción** (hallado 2026-09-05 por el canary nuevo): `RESEND_API_KEY is not configured`. Declaré el `*_SECRET_REF` sin montar el secreto, y `sendEmail` usa el cliente SÍNCRONO. Corregido en `services/auth-server/deploy.sh` (commit `38fbfaeeb`), **pendiente de redeploy del auth-server**. La respuesta HTTP es 202 idéntica por anti-enumeración, así que nadie se habría enterado hasta que una persona real reclamara. Gate nuevo: `pnpm auth-server:person-auth:canary` (22 ok en vivo; exit 2 = incompleto, 1 = rojo). El resto del carril autenticado quedó verificado en vivo por primera vez.

**TASK-1830 (EPIC-044 U03) — `code complete, rollout pendiente`** (sesión greenhouse-eo-18, 2026-09-04, develop; commits `7459d96d4` · `937087404` · `db2622ba9` · `5b57b73f9`). Autenticación de personas externas sin contraseñas detrás de `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: sesión propia `__Host-efeonce_auth` que implementa el `SubjectSessionPort` que dejaba a `authorize` en `login_required`, magic link (selector/verificador, 15 min, un uso, anti-enumeración con piso de latencia), passkeys (credenciales descubribles, contador anti-clonación), TOTP de step-up y recuperación por re-invitación. 8 tablas `greenhouse_auth` aplicadas y verificadas contra PG real; capability `identity.auth_person.revoke` + `POST /api/admin/auth-server/persons/revoke`; 3 señales `auth.person.*`. **Infra creada:** llave KMS simétrica `auth-server-totp-envelope` (HSM, rotación 90 d) — la de firma es EC y no cifra. **Desviaciones declaradas:** ledger propio `person_auth_attempts` (el del portal tiene CHECK de NextAuth y GRANT a otro rol) y `sha256`+timing-safe en vez de bcrypt (evita 300-800 ms de CPU en un endpoint no autenticado). **Próximo paso:** prender el flag en staging — exige `AUTH_SERVER_OAUTH_ENABLED=true` + environment `efeonce-auth` en `active`, si no la sesión se crea pero `authorize` responde `environment_inactive` — verificar que el correo sale de verdad por Resend (la respuesta es idéntica por anti-enumeración: un correo muerto NO se reporta solo) y ejercitar passkey en dos navegadores. Gate: `pnpm auth-server:person-auth:smoke`. TASK-1835 (pantallas Efeonce ID, sesión greenhouse-eo-45) consume el contrato del flujo maestro §5.bis.

**TASK-1829 (EPIC-044 U02) — `code complete, rollout pendiente`** (greenhouse-eo-45; commits `263ee3a74` · `19d1658de` · `d31e6e913`). Superficie OAuth del emisor detrás de `AUTH_SERVER_OAUTH_ENABLED=false` (ya en producción por el release de arriba): metadata, CIMD primario + DCR compat, authorize/token/revoke/introspect/consent, JWT ES256 con `gv`, 7 tablas `greenhouse_auth` y 2 capabilities aplicadas, 3 señales `auth.oauth.*`; contrato `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`. Decisión del operador: `localhost` como loopback sólo para clientes públicos. Próximo paso: flag ON en staging (environment `efeonce-auth` a `active`, metadata validada, clientes CIMD/DCR de prueba); persona real exige TASK-1830 (`SubjectSessionPort`). `pnpm build` de producción no se corrió localmente (CI/Vercel lo construyeron). No se corrió el canary de Globe OAuth (hibernado).

**EPIC-044 (2026-09-03) — authorization server PROPIO, decidido por el operador; WorkOS descartado.** ADR aceptado
`docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`; epic `in-progress` con TASK-1626/1631/1813 y las
nuevas TASK-1828…1834 (runtime · OAuth/CIMD/tokens · personas sin contraseña · gateway multi-issuer · canaries · pentest ·
convergencia login). Emisor como segundo host del front door del gateway (≈ USD 15/mes medidos). DNS `auth.efeonce.org` →
`34.111.78.237` creado y verificado. Excepción EPIC-027 para `services/auth-server` **APROBADA** por el operador (Build Unit
ADR Delta 2026-09-03, fila Accepted en DECISIONS_INDEX); **TASK-1828 EN EJECUCIÓN (sesión Claude greenhouse-eo-a3, `/implement-task 1828`, 2026-09-03/04)**: Slice 0 (KMS HSM `auth-server-es256` v1 + SA) y Slice 1 (schema `greenhouse_auth`, `src/lib/auth-server/keys`, `services/auth-server`, workflow, gates; commit `765ff0ca7`) HECHOS; token real firmado por HSM y verificado con el JWKS de PG. Slice 2 HECHO: `https://auth.efeonce.org` vivo (cert ACTIVE; rev `auth-server-00002-gfh`, `AUTH_SERVER_ENABLED=true`): `/readyz` 200 (postgres/kms/activeKey ok), JWKS publicado; rotación ejercitada (KMS v2 activa, v1 `retiring` — retiro pendiente tras 1 h: `pnpm auth-server:rotate-key --retire VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8` + `gcloud kms keys versions disable 1`); `tofu apply` en `efeonce-mcp` `6a144a5` (pusheado), allowlist + orquestador + señales `auth.*` + runbook. CI `Auth Server Deploy` verde en develop (rev `auth-server-00003-jtf`, GIT_SHA `02dc5d987`; el deployer necesitó `cloudkms.viewer` sobre la llave). Barrido documental hecho (ADR nativo §Delta 2026-09-04, `GREENHOUSE_IDENTITY_ACCESS_V2`, invariantes identity/ops, `cloud-infrastructure/CLOUD_RUN.md`, control plane de reliability, runbook MCP, doc funcional + manual del autorizador, rule `.claude/rules/auth-server.md`, skills, EPIC-044 y tasks 1829–1833). **Retiro de la llave v1 pendiente** (`pnpm auth-server:rotate-key --retire VjbDUgwc…nI8` + disable KMS v1); `AUTH_SERVER_JWKS_URL` en Vercel pendiente de autorización. Producción del emisor = `code complete, rollout pendiente` (release control plane). Otra sesión tiene WIP sin commit de TASK-1631 (`src/lib/identity/external-access/`, `reliability/registry.ts`, `event-catalog.ts`, entitlements): no acoplar; señales del emisor se agregan después de que ese WIP se commitee. Task ui-ux de login sin ID hasta
tener wireframe/flow reales. Siguiente ID libre `TASK-1835` / `EPIC-045`.
**TASK-1631 (U04) Slice 1, 2026-09-04 — code complete, rollout pendiente.** Binding aplicado en PG, dominio
`src/lib/identity/external-access/**`, rutas admin, reader del gateway `GET /api/platform/ecosystem/identity/binding` y 4
señales; smoke `pnpm identity:external-access:smoke`. **Staging verificado 2026-09-04** (develop `02dc5d987` pusheado coordinado con TASK-1828): 4 señales en `/api/admin/reliability`, rutas admin 200, lane ecosystem 401 sin consumer. **En producción** desde el release 2026-09-04 (run 33893120972; canary del lane 400/200 `environment_inactive`/401; emisor `efeonce-auth` en `draft`). **Próximo paso:** operador lee las 4 señales en `/admin/operations` prod con sesión humana; TASK-1829 emite tokens y pasa el environment a `active`; TASK-1831 consume el reader.
Paridad registry↔catálogo roja por 11 capabilities ajenas sin seed (task aparte).

Maggie/María Fernanda: cierre 4/4, unresolved=0; agosto ready. Método documentado en runbook/manual y
skills Payroll/Talent Codex/Claude; Finance histórico pendiente de conciliación. [Evidencia 03/09](docs/audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).

Valentina (03/09): misma persona/usuario/member, correo nuevo y elegibilidad SSO verificados; login
interactivo no probado. Último día anterior 30/05/2026, EO-CENG-0001 ending; EO-CENG-0002 activo desde
20/08, bruto mensual 530.973 (450.000 líquidos). Agosto 12/31: EO-CPAY-0002 pending_readiness,
neto 174.193,55, única falta boleta; sin obligación/orden nueva. Recuperación y evidencia abajo.

TASK-1349 **EN PRODUCCIÓN + recovery aplicada** (2026-09-03; release `62356c9b7fd4`, run `33779259694`, flag
`WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` ON prod+staging). Recovery por los commands canónicos, autorizada
en chat: **Felipe** revisado `relationship_ended` con causal `termination` declarada por el operador → approved →
scheduled → executed; member inactivo, compensación cerrada al 02/06, mayo `full_period`, junio `exclude_from_cutoff`,
julio+ `exclude_entire_period`. **Luis Reyes y María Camila Hoyos**: lifecycle cerrado (relación employee terminada
al LWD real, member inactivo) y stubs SCIM cerrados como `access_only`. Snapshot inicial, sustituido por el cierre Maggie/María Fernanda de arriba: unresolved **1** (Maria Fernanda,
draft 07-29, decisión manual de HR), executed_member_still_active **0**, deprovisioned_without_case 0.

🔴 **«Colaboradores fantasma» (2026-09-03 ~17:50Z, resuelto):** la pre-nómina de septiembre mostró seis
`Colaborador <uuid>` sin contrato: sujetos sintéticos de mi live test con compensación abierta, que `derivePolicy`
trataba como salida decidida (`identity_only` ejecutado → `full_period`). Compensaciones cerradas por command,
`hasDecidedExitFact` ya excluye `identity_only`, el live test limpia al terminar; fix en PR #220 (`main`).

**Valentina Hoyos — restauración gobernada APLICADA por Codex a las 18:38:48Z:** member activo/status activo,
asignable y sin corte antiguo; asignación existente activa sin fecha final. Se verificaron alias Production hacia
`a824d073` y 100% del tráfico `ops-worker-00641-dl2` hacia el árbol corregido antes de aplicar. Las siete categorías
protegidas (relaciones, engagements, envíos, payables, usuario, obligación y orden) siguen idénticas; SSO elegible con
correo nuevo y rol collaborator. Clave `valentina-lifecycle-reentry-restore-2026-09-03`; no repetir ni usar el SQL retirado.
Eventos publicados 18:40:03Z y People completado 18:42:05Z; employee cerrado y datos protegidos idénticos.
**Release cerrado:** `33795564223` success, manifest `a824d073a5fb-c2cf99e9-1ba1-40b3-9d85-76ad0a8e8372`
released 19:30:49Z, health success y watchdog ok/4 de 4 workers. Dos intentos anteriores fueron abortados por
cancelaciones concurrentes; Claude se retiró y Codex cerró bajo un solo operador. La auditoría conserva el incidente
independiente de matching SHA/run ID. Readback final: recuperación y siete categorías protegidas intactas.
[Auditoría](docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md) ·
[runbook](docs/operations/runbooks/workforce-reentry-recovery.md).
Finance de Felipe (obligación junio + SII) sigue como dependencia sin command de anulación. UI: TASK-1814.

**Delta Claude 19:40Z — PR #220 CERRADO por Codex** (run `33795564223`, manifest released 19:30:49Z; ver arriba).
Attempts 1 y 2 `aborted` por cancelaciones cruzadas: el webhook empareja por `target_sha` antes que por
`workflow_run_id`, así que cancelar un run duplicado aborta el manifest ajeno (bug a tasquear). **Purga sintética
APLICADA 18:37Z:** 12 members `TASK-1349 live …` (253 filas, `scripts/workforce/purge-task1349-live-subjects.sql`);
265→253 members, 8 activos, reales. Barrido documental 20:10Z + [TASK-1815](docs/tasks/to-do/TASK-1815-release-webhook-reconciler-run-id-matching.md).

Offboarding: la [auditoría inicial](docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md)
es antecedente, no estado vigente. [TASK-1349](docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md)
conserva pendientes Finance; [TASK-1814](docs/tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md) posee
la UI aún sin implementar. No repetir las recoveries cerradas para probar ese recorrido.

Cierre documental 03/09: tres subagentes sincronizaron Workforce/Talent, Contractors/Finance y Release/QA;
root integró identidad, arquitectura, tareas e índices. [Cobertura y límites](docs/audits/payroll/VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md).
Bug independiente de correlación de releases por SHA/run ID sigue pendiente; el runbook documenta mitigación
con un coordinador y lectura de intentos/eventos, sin declararlo corregido.

Seguimiento OAuth (2026-09-02): [TASK-1813](docs/tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md)
creada `to-do`, sin implementar. Codex 0.152.0 rechazó discovery; metadata pública revalidada a las 22:51Z.
La [auditoría](docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md) identifica scopes sin cualificar
al apagar shim, fallback de deploy que lo reactiva y canary directo que no prueba discovery. El plan B histórico
de abajo no basta sin esos gates. Próximo paso: plan humano aprobado y coordinación con dueños de archivos;
no push/deploy ni mutación de Entra autorizados por esta creación. Incidente Git/Berel separado.

## 2026-09-03 — EPIC-043: Payroll confiable y operable desde chat

[EPIC-043](docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md), `to-do`, P0: doce tasks
TASK-1816–TASK-1827, con contratos y dependencias por unidad. Por instrucción del operador, TASK-731/1214/1215/730
quedaron `complete` por supersesión documental hacia TASK-1820/1821/1825/1827; sin certificar implementación.
TASK-1625/ISSUE-129–134 conservan trazabilidad; OAuth TASK-1813 e identidad TASK-1631 son dependencias compartidas.
Primer paso: plan y ADR acotado de TASK-1816, cálculo atómico/aprobación de versión.
[Baseline](docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md).
Sólo planificación/documentación; sin código, migraciones, envíos, pagos ni deploy.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista + rutina de recordatorio del cutover ETV

Después del cierre `complete` de TASK-1806 (ver entrada debajo, release `bda12be7e33a`), el operador preguntó
quién vigila la señal `seo.etv_methodology.drift` — hoy sólo es pull vía `/admin/operations`, nadie se entera
si no lo abre. Autorizado en chat ("las 3 formas de vigilar"), se desplegaron dos capas nuevas: (1) cron
`ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) que llama
`checkAndAlertSeoEtvMethodologyDrift()` (`src/lib/growth/seo/etv-methodology/drift-alert.ts`), lee la señal
existente sin tocarla y avisa a Teams sólo si `severity=error` — endpoint `POST /seo/etv-methodology-drift-watch`,
dispatcher `sendManualTeamsAnnouncement`, destino nuevo `growth-seo-reliability-alerts`
(`src/config/manual-teams-announcements.ts`), mismo canal físico "EO - Admin" que `production-release-alerts`.
Commit `79a1c3f74` en `develop`. Verificado en vivo (revisión `ops-worker-00637-2ww`): llamada real respondió
`{"severity":"warning","alerted":false}` — correcto, hoy es `warning` no `error`. 6/6 tests verdes. (2) Rutina
`trig_015zxhP1D4yXfTacUm5HqmQU`, dispara una vez el 2026-09-17 13:00 America/Santiago tras la primera captura
improved desatendida, sin credenciales locales: sólo recuerda verificar manualmente, no ejecuta verificación real.

## 2026-09-03 — TASK-1806 COMPLETE: Improved ETV en producción (release `bda12be7e33a`), rebaseline versionado

Cuarto release del día: PR #218 squash (`main=bda12be7e33af93906805054146c5e17a8b9c328`, 12:42Z), orquestador
`33758619690` (13:01→13:14Z, un solo run, sin retry; los DOS gates `production` aprobados a 13:04:26Z/13:04:57Z),
manifest `released` (`bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990`), watchdog `ok`, 3/4 workers en el
target y ops-worker change-gated en `d2ebdb8f3` (diff de árbol completo = sólo el ledger de flags). **Canary de
contrato 13:15:26Z:** lanes prod `domain-overview`/`url-visibility` de Berel sirven
`etvMethodology.version=improved_layout_clickstream_v2` `single_methodology`; `/health` del worker
(`00636-h6w`) improved en escritura y lectura; `/api/auth/health` 200. Vercel Production+staging con ambos
selectores improved (valores verificados por `env pull`); staging con cutover y **drill de rollback** ejercitado
(legacy → improved, 3 redeploys).

**Decisión:** el shadow (USD 1,095) mostró improved 6× mejor calibrado contra GSC en Berel (err. rel. 49 % vs
321 %), Jaccard 1,0 e historia continua; el operador aprobó `go_rebaseline` y el cutover. Rebaseline acotado:
historia improved de Berel 2025-09..2026-09 y de Comex 2025-09..2026-03 (backfill USD 0,2568, sembró 14 filas);
la de julio 2026 en adelante es `fully_recomputed`, antes `calibrated_approximation`; `breakpointDate=null`.
Efeonce se mide aparte (su org/CL/GSC); guard en `assertEtvShadowCohort` para que un bulk nunca mezcle
organizaciones; cohorte v2.

**Riesgos abiertos / pendientes con dueño:** (1) señal `seo.etv_methodology.drift` en `warning` hasta que las
filas contractuales del 27-29/08 salgan de la ventana de 7 días (≤ 2026-09-05); el cron del 16/17 será la
primera captura improved DESATENDIDA del worker — si escribiera otra cosa, es incidente. (2) Berel verá sus
cifras de tráfico estimado ≈ −60 % por cambio de fórmula, no por pérdida real: comunicarlo. (3) Sujetos sin fila
improved degradan `not_available_for_method` hasta su próxima captura (subfolder/url de Berel el día 17).
(4) Rollback a legacy sólo antes del 2026-11-01T00:00:00Z (selectores + deploy.sh + redeploy). Sin push de
docs de cierre hasta este commit; WIP ajeno en el árbol intacto.

## 2026-09-03 — Berel: cobertura temática y minería solicitadas por el operador

Fecha local 2026-09-02. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md) y skills
Berel/SEO-AEO/DataForSEO sincronizadas; Playbook Notion ampliado y confirmado por nueva lectura.
[Research](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md): 14 runs succeeded,
1.517 keywords distintas, 13 SERPs, 52 PAA, costo US$1,23572. 27 intenciones propuestas; 60 keywords
representativas revisadas, el resto del CSV es triage explícito. El tutorial público de baño aparece
#2 en SERP fuera de los 49 cuerpos del Hub: no crear duplicado. Priorizar elección/protección/aplicación.
Ese corte describe discovery, no las ediciones posteriores en Notion. Continuidad 2026-09-03: N29 pasó
a Berelex Semibrillante tras Wiki/página/PDF; tutorial, ALT paso 3, ficha N2 y nota de tarea releídos.
Artes y copies sociales aún pendientes; no asumir paquete aprobado ni publicación Drupal. La skill
incorpora [control técnico y QA](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md) para futuras piezas.
Etiquetado: [auditoría](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md), 51 correcciones
Notion releídas (formato/canal/tipo), sin otros cambios. Nov/dic: 65 tareas visuales por mes, no archivos
ni entregas; rollups numéricos no expuestos por MCP. Operador confirma solo etiquetas, sin migración.
Relectura oct–dic: 221 tareas, 196 visuales etiquetadas y 25 principales excluidas; sin nuevas escrituras.
Skills espejo exigen tipo/canal desde la creación y en QA. Histórico fuera de esos meses y N31 pendientes.
Distribución selectiva: [auditoría y continuación](docs/audits/seo/BEREL_SELECTIVE_SOCIAL_DISTRIBUTION_2026-09-03.md).
Playbooks/skills y matrices de 17 slots + principales actualizados; 34/34 releídas e historial intacto.
Aplicación terminada: 193 páginas modificadas releídas, 128/128 registros sociales; octubre excluido. Cupos 8 artículos de 3.000–5.000 palabras,
50 gráficas y 3 videos/mes (cortesía mayo–octubre extendida a nov/dic). Operador confirmó: las 50
incluyen blog/RRSS; superficies Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad aprobada:
4 banners N52 Cancelada sin etiquetas de reserva, historial intacto; 4 banners y 2 sociales N59 creados.
Conteo vivo + briefs: 50 gráficas + 3 videos/mes (41/44 tareas estáticas); N45/N46 En curso, N50/N54 con gates.
Siguiente paso: conciliar derivados/assets de N29 y mantener bloqueos de sistemas no validados.
Commit local solicitado del trabajo editorial propio; sin push/cambio de branch/release.
Cambios ajenos de SEO y OAuth preservados; este trabajo no resuelve ese incidente Git/MCP.

Corrección de numeración verificada: [mapa y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Noviembre N43–N51 (Navidad adicional), diciembre N52–N59; números de párrafos/auditorías anteriores
son históricos. Módulo 16 en skills espejo; no renombrar archivos ni reutilizar IDs por número.
Complemento autorizado: el método SEO/AEO y DataForSEO excluido de `1fcc2ade3` se incorpora por separado:
referencia 09 de minería, routers/espejos, priorización §2.3, brief, manual y funcional; sin nueva compra ni push.

## 2026-09-03 — TASK-1805 en producción: la fórmula detrás de `etv` es identidad del hecho, todavía legacy

Tercer release del día (`5ec4cf769977-18572878-583b-43f0-aad0-01eb7b394aba`, run `33698245254`, target `5ec4cf76997722d5ae31621808b5ae967602bf0a`, PR #217): manifest `released`
00:20:29Z, watchdog `ok`, 3/4 workers en el target y ops-worker change-gated en `57abe3f1e` (diff de árbol
completo vacío: el `push:develop` ya lo había desplegado). Dispatch con bypass forense por `cloud_release`
(`deploy.sh`), sin runs quemados; coordinado con `Task-1804` para no pisar su release #216 (freeze de ~25 min).

**Verificado en producción (00:22Z):** lanes `domain-overview` y `url-visibility` de Berel MX sirven
`etvMethodology` (`legacy_static_v1`, evidencia `contract_default_pre_cutoff`, corte `2026-11-01T00:00:00Z`);
`/health` del ops-worker → `configuredWriteSource: env`, `policyVersion: etv-policy.v1`. Selectores
`GROWTH_SEO_ETV_METHODOLOGY_VERSION`/`_READ_` = `legacy_static_v1` en Vercel Production+staging (horneados por el
build del release) y en `deploy.sh`. Gateway `efeonce-mcp` con el manifest sincronizado desplegado
(`efeonce-mcp-gateway-00029-bwg`). `TASK-1805` → `complete/`.

**Riesgos abiertos / pendientes con dueño:** (1) el **contract** de schema sigue parqueado en
`docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending`; su condición de 7 días sin filas con
evidencia contractual empieza a correr con este release y es precondición 4 de `TASK-1806` — sin él la coexistencia
legacy/improved por sujeto/día sigue cerrada a propósito. (2) La señal `seo.etv_methodology.drift` queda en
`awaiting_data` hasta la primera captura explícita del worker (cron `ops-seo-domain-overview`, día 16); si tras ese
run sigue en `awaiting_data`, el worker no está escribiendo evidencia explícita — investigar, no esperar.
(3) Improved ETV, shadow pagado, decisión histórica y cutover: **sólo `TASK-1806`**, con presupuesto aprobado.
Evaluador dry-run listo: `scripts/growth/_sanity-task-1805-etv-evaluator.ts`.

## 2026-09-02 (9) — DCR quedó deprecado en MCP `2026-07-28`: el shim de `mcp.efeonce.org` se mantiene, con dos hallazgos que la evaluación no buscaba

Evaluación de impacto pedida por el operador, **sin migración**. Verificada contra la spec en vivo.
Ya en producción vía release `375f56e24187` (commits `7788c8626` + `b4135f287`, verificados por blob
contra `origin/main`). **Cero cambios de código.**

**Veredicto:** el shim DCR sigue siendo correcto y no por inercia. La spec retiene DCR *"for backwards
compatibility with authorization servers that do not support Client ID Metadata Documents"* — que es
literalmente Entra, que no soporta **ni CIMD ni RFC 7591**. El shim es pre-registro (prioridad 1 de la
spec) por el único canal que los clientes MCP estándar consumen sin configuración manual. Earliest
removal de DCR: primera revisión publicada en o después de **2027-07-28**.

**Hallazgo estructural:** *"migrar el gateway a CIMD" no existe como trabajo.* CIMD es capacidad del
**authorization server**; el nuestro es Entra y el gateway **espeja** `authorize`/`token` en vez de
proxearlos. Soportarlo exige emitir los tokens = el broker de `TASK-1631`, cuyos invariantes **ya** lo
exigían al proveedor. No se abrió task paralela; esta evaluación es insumo de esa task.

**🔴 Riesgo más cercano que la deprecación, en la misma revisión:** la página nueva *Authorization
Server Discovery* (no existía en `2025-11-25`) exige `issuer` **idéntico** al identificador usado para
construir la well-known URL. **Los nuestros difieren** desde que el shim existe. Funciona sólo porque
los clientes todavía no lo aplican — empírico, no garantizado. **No se parchea** reclamando issuer
propio: rompería la validación `iss` de RFC 9207, que hoy pasamos *porque* espejamos el de Entra.

**Dos hallazgos que salieron de coordinar con otras sesiones, no de la evaluación:**

1. *Confused deputy* (aporte de `greenhouse-eo-1e`, adoptado a medias tras verificar): la letra del
   `MUST` no ata —no reenviamos— y el modo de la cookie de consentimiento quedó **refutado** leyendo
   `src/app.ts`. Pero el riesgo está por construcción: `client_id` estático compartido +
   `http://localhost` **sin puerto** + consentimiento cacheado por Entra = un proceso local toma un
   código en silencio. Acotado a lectura porque ese cliente **no lleva scopes de escritura**.
2. *La etiqueta miente:* `32617b87-…` se llama **"Efeonce MCP Local Canary Client"** siendo el cliente
   compartido de producción; el canary real es `66985833-…`. Quien lee "Local Canary" y asume radio de
   juguete es quien no auditará las redirect URIs.

**Plan B declarado, sin ejecutar:** si un cliente endurece cualquiera de las dos validaciones antes del
broker → pre-registro puro (apuntar `authorization_servers` a Entra, apagar `OAUTH_PUBLIC_CLIENT_ID`
—el shim ya está gateado por esa env— y `client_id` manual por usuario).

**Pendiente con dueño:** renombrar el cliente en Entra y decidir sobre las redirect URIs — **NO**
angostando `http://localhost` a secas, que es el loopback que Claude Code necesita. Opcional para quien
formalice `TASK-1654`: publicar `client_id_metadata_document_supported: false` explícito.

**Deuda de proceso, ajena a la task:** el worktree de esta sesión nació de `origin/main` (1490 commits
detrás de `develop`) porque `origin/HEAD` apunta a `main`. Le pasó igual al worktree
`busy-shirley-80edbf` del 2026-08-27. Fix propuesto y **no aplicado** (decisión del operador):
`git remote set-head origin develop` + borrar ambos worktrees.

## 2026-09-02 (8) — El release `375f56e24187` quedó huérfano y se recuperó; `main` vuelve a tener manifest

La promoción `develop→main` del 2026-09-02 entró a `main` por el PR #215 a las `20:51:04Z` (726 archivos,
1490 commits, 2 migraciones) y quedó **sin manifest de release**: la sesión que la promovía fue archivada por
accidente antes de dispatchar el orquestador. Un commit en `main` sin manifest es exactamente la condición que
la regla dura del control plane prohíbe dejar abierta, así que otra sesión lo retomó con autorización directa
del operador y cerró el ciclo.

Cierre: run `33683893124` **completed/success** en 11m50s, `release_id`
`375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, máquina de estados completa
`preflight → ready → deploying → verifying → released`. Los DOS gates `production` se aprobaron con 34 s de
diferencia (sin el stall del gotcha #6). Único bypass: `release_batch_policy`, inevitable por las 2 migraciones
—dominio irreversible por precedencia del clasificador, donde el marker `[release-coupled: …]` no aplica—, con
razón citando un hecho verificado y no un adjetivo: `migrate:status` en dry-run reporta cero migraciones
pendientes contra la única instancia Cloud SQL.

Verificación runtime, con la trampa del día atajada: el `ops-worker` cerró con un **skip de 51 s** y sirve
`c4c838dea9d1`, no el target. Se verificó con el **diff de árbol completo** (43 archivos, 5 de código, tres bajo
`src/mcp/**`) y con `pnpm worker:deploy-path-gate`, que confirma que los 1451 archivos del bundle caen bajo
prefijos declarados y que `src/mcp` no es uno: ese código lo sirve Vercel, que sí desplegó el target. Skip
legítimo. El watchdog reportó `data_missing=4`, que **no es drift**; la lectura autoritativa fue
`pnpm release:workers`: 3/4 workers en el target, `Ready=True`. Canary de contrato del lane MCP `skills` verde
**después** del `released`.

Flags: se prendió `GROWTH_SEO_SITE_FINDINGS_ENABLED` en el ops-worker con los dos pasos (revisión activa
`ops-worker-00631-jfw`), tras probar por blob que el evaluador desplegado es idéntico al de `main`. Quedan
pendientes sus verificaciones post-flip (3) y (4). La cadencia `ops-seo-keyword-discovery-drain` quedó
reconciliada: `main` ya declara `*/2`. **No** se prendió `HIRING_FAIRNESS_MONITOR_ENABLED`: su condición de
retiro sigue vigente hasta `TASK-1365` y prod carece de la policy row de privacidad, así que daría cero en
silencio en una métrica de equidad.

Aprendizaje operativo del día: **dos sesiones recibieron el mismo mandato y ninguna verificó peers vivos antes
de arrancar.** La colisión se detectó porque `origin/main` ganó un commit entre dos comandos consecutivos. Nadie
tocó el control plane durante el solapamiento. Regla que queda: anunciar no es coordinar — hay que preguntar con
`ListAgents` y esperar respuesta antes de tocar el árbol.

## 2026-09-02 (7) — Salesforce ya tiene oferta canónica y task de landing, sin implementación

La práctica Salesforce quedó canonizada por outcomes y lifecycle en cuatro fases: `Diagnose & Architect`,
`Implement & Integrate`, `Activate & Adopt` y `Operate & Evolve`; seis solution lanes cubren Revenue/Sales,
Service, Marketing/Lifecycle, Data/Identity/Consent, Agentforce/Automation y Experience/Integration/Analytics.
El mapa previo conserva el routing de producto y separa CRM, Marketing Cloud Engagement y Marketing Cloud Next.

Se registró `TASK-1812` para convertir esa oferta en una landing pública `Universo conectado`. Ya existen dirección
visual, wireframe 1440/390, flujo installed-base/evaluation y motion contract. Efeonce lidera; Salesforce aporta
reconocimiento referencial. Nubes/agentes son originales y cualquier logo, badge, screenshot, mascota o claim de
partnership queda bloqueado hasta rights y readback contractual. `TASK-1404` sigue dueña de la comparación HubSpot
vs Salesforce.

Estado honesto: documentación y contrato UI listos; no hay implementación, WordPress postId, CMS save, publicación,
cache purge, indexación, conversión ni live readback. La ejecución empieza con Discovery/VoC/SEO/rights/runtime,
continúa con un first fold `noindex` y se detiene para `ACCEPT FIRST FOLD` antes del below-fold.
