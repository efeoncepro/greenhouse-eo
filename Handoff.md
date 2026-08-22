# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-22 — EPIC-042/TASK-1764 gobiernan footers sin big bang; cero cambios de correo o runtime

Se creó `EPIC-042`, su primera child `TASK-1764` y un ADR Proposed para dejar de improvisar footers sin poner en riesgo una de las
superficies más estables del producto. Efeonce es siempre la masterbrand; Greenhouse sólo puede aparecer como su
plataforma. Firma y footer quedan separados, prioridad de entrega no determina propósito y unsubscribe nace
prohibido salvo suscripción opcional o marketing explícitamente clasificados.

El contrato incluye además RRSS, dirección e información legal como bloques independientes: RRSS default `none`
y sólo institucionales en suscripción/marketing; identidad `compact|entity|full` desde el operating entity; nota
`none|security|privacy|regulated`, sin disclaimer universal. Full legal en marketing es baseline conservador sujeto
a validación con abogado habilitado por jurisdicción, no una declaración de cumplimiento global.

La task no posee código ni habilita un reemplazo global de `EmailLayout`. La primera child deberá introducir el
contrato con output legacy byte-idéntico; las siguientes cubrirán una sola familia y máximo cuatro `EmailType`.
Cada cohorte exige baseline, diff limitado al footer, previews 720/390 y sin imágenes, tests, aprobación explícita,
canary consentido en cliente real y rollback por tipo. Access/security, Hiring externo y transaccionales regulados
nunca comparten release. Estado: **diseño/documentación; ADR Proposed; ningún template, envío o runtime cambió**.
Siguiente paso: revisar/aceptar el ADR y sólo entonces crear la child foundation dentro de `EPIC-042`; siguientes
IDs libres `TASK-1765` y `EPIC-043`.

## 2026-08-21 — Correo de selección personalizado adopta una firma visual Efeonce; rollout pendiente

`hiring_decision_selected` ahora separa asunto, preencabezado y título visible, confirma la elección sin declarar
incorporación y explica `carta oferta → aceptación → contrato` con paridad HTML/texto plano. La primera propuesta
3D, el bouquet genérico y la V3 corporativa abstracta quedaron rechazados. Diseño + Talent
convergen en una V4 concreta: sobre abierto, tarjeta sin texto, check de confirmación y un destello naranja. No
representa demografía, contrato ni onboarding, pesa 63.972 bytes y quedó en
`gs://efeonce-group-greenhouse-public-media-prod/emails/hiring-selected-email-mail-icon-v4.png` con readback 200.

Se retiró la tarjeta que repetía la vacante y la imagen permanece decorativa (`alt=""`). La decisión y los hitos
documentales ahora guían la lectura con negritas visibles aplicadas a frases completas,
y ambas variantes de decisión firman `Equipo de Talento · Efeonce`, alineadas con el Reply-To real. La variante de
rechazo no consume la imagen. Capturas finales: `.captures/hiring-selected-email-hero/email-v6-720.png` y
`.captures/hiring-selected-email-hero/email-v6-390.png`. Estado: **code complete, rollout pendiente**. No se envió ningún correo real ni se
desplegó el cambio; el siguiente paso es incluirlo en un release normal y verificar un envío consentido en un
cliente de correo real.

## 2026-08-21 — TASK-1762/1763 formalizan cierre por cupos y correo empático; cero runtime nuevo

Se crearon dos tasks bajo `EPIC-011` y un ADR Proposed. `TASK-1762` posee capacidad explícita separada de
publicación, preview/confirm humano, run durable por item, decisión/evento canónicos y variantes de rechazo directo
o vacante completada. `TASK-1763` es el consumer UI de Application 360 con dirección visual, wireframe y flow.

La selección de una persona nunca auto-rechaza. Sólo un preview fresco y una confirmación explícita crean el run;
el worker llama `decideHiringApplication` por cada application y el correo nace desde ese hecho, conservando dedupe
y recovery parcial. `backup_selected`/`on_hold` se muestran aparte. La frase de Banco de Talentos sólo aparece con
consentimiento futuro vigente; `data_origin` no gatea comunicaciones. TASK-1689 queda histórica y TASK-1721 ahora
apunta a estos owners. Estado: **diseño/documentación; ADR Proposed; sin código, migración, flag ni envío nuevo**.
Siguiente paso: aceptar/ajustar el ADR, tomar TASK-1762 y después TASK-1763.

## 2026-08-21 — TASK-1761 formaliza Hiring → Microsoft Entra; implementación bloqueada por ADR y gates P0

Se creó `TASK-1761` dentro de `EPIC-011` y el ADR Proposed
`GREENHOUSE_HIRING_ENTRA_WORKFORCE_ACCOUNT_PROVISIONING_DECISION_V1.md`. La decisión propone API-driven inbound
provisioning con app dedicada: cuenta disabled-first desde `principal_bound`, reconciliación de provisioning logs,
OID binding al mismo principal antes del SCIM de retorno, y enable/grupo/licencia sólo después de
`workforce_enabled`, approval y capacidad verificada. TASK-1721 observa checkpoints; 770/1731 mantienen sus
owners; 872 conserva Entra → Greenhouse; 1349 entrega el hecho de baja y 1761 compensa en Microsoft.

Dos gates P0 salieron de la revisión adversarial: `src/lib/entra/profile-sync.ts` hoy convierte
`accountEnabled=false` en `client_users.active=false`, por lo que una precreación segura podría apagar `/my`; y
meter la cuenta al grupo SCIM antes de ligar el OID puede crear otro principal/member. Ambos se convirtieron en
precondiciones de canary con negative/roundtrip tests. Email/UPN no son anchor; `202` no es éxito; rollback exige
disable/revoke/remove group-license y no sólo flag OFF.

Azure CLI fue read-only. El tenant tiene Entra P1 consumido 1/1, Microsoft 365 Business Premium consumido 6/6,
ningún grupo con licencias y `Efeonce Group` no es security-enabled. La identidad inbound puede diseñarse, pero
M365 readiness queda bloqueada/unknown hasta readback comercial y de assignment. TAP también quedó unknown por
403. Estado: **diseño formalizado; ADR Proposed; ningún código/runtime/Azure mutado**. Siguiente paso: aceptar o
ajustar el ADR y luego tomar TASK-1761 con goal + task hook.

## 2026-08-21 — Confiabilidad: hallazgos medidos contra runtime; dos umbrellas superseded por EPIC-041

Codex venía reportando hace semanas dos hallazgos de confiabilidad (`wh-sub-notifications` con dead-letters `401` y
dos handlers `contract_mrr_arr` fallidos). Al medirlos contra PostgreSQL el 2026-08-21 resultó que **son los dos
menos urgentes**, que **siete hallazgos previos estaban mal calibrados o eran falsos positivos**, y que el problema
más caro no aparecía en ningún reporte porque el módulo de confiabilidad lo muestra en verde.

`TASK-1432` (2026-07-18) y `TASK-1710` (2026-08-15) describían el mismo incidente con un mes de diferencia, sin
referenciarse, con cero commits y cero tasks hijas. Ambas quedan **superseded** por `EPIC-041`, que conserva el
baseline medido y fechado, la tabla de falsos positivos y el orden de ejecución.

Correcciones que importan para quien retome: el bridge income→HubSpot **nunca se terminó de construir** — su
endpoint receptor `/invoices` no existe en ninguna rama y 80 de 84 incomes vienen de Nubox, que nunca traerá
anchors; no hay `CLP 141.562.545` perdidos, hay ruido P3. La tasa PPM **es correcta** (`0,125%` confirmada por el
operador); lo obsoleto es el campo `notes` de `ppm_rate_config`, que produjo una falsa alarma de P0. Las
notificaciones **sí funcionan hoy** (7 días de actividad, 100% `sent`); los únicos avisos huérfanos son
`member.created` y `compensation_version.created`, y el conteo dio 12 y **1** respectivamente, ambos sin eventos
desde el 2026-06-26.

Se descartó además un fix que parecía obvio: sacar `skipped` de `isSuccessOutcome` en `handler-health.ts` **no
habría arreglado nada** — sólo 4 filas en toda la tabla empiezan con `skipped`, y los 9.001 falsos éxitos los
produce `no-op`. Ese análisis también expuso que **no existe ni un test** de `recordHandlerOutcomes` ni de
`classifyOutcome`, y que la llamada está envuelta en un `try/catch` que sólo hace `console.warn`.

Estado: **documentación completa, ejecución no iniciada**. Ningún cambio de código, ninguna mutación de datos,
ningún flag tocado. Siguiente paso: `TASK-1760` (cablear las projections de PPM y retenciones), único carril cuyo
daño crece. Owner sin asignar.

## 2026-08-21 — Transparencia GPT Image 2 code complete; rollout de Globe pendiente

La documentación oficial completa de OpenAI quedó consolidada en
`OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`: GPT Image 2 es el único miembro activo/recomendado y soporta
`background=transparent` en preview con PNG/WebP. GPT Image 1.5, 1, 1 Mini y `chatgpt-image-latest` están deprecated
con retiros en octubre/diciembre de 2026. Las skills `greenhouse-ai-image-generator` y
`greenhouse-globe-model-fleet` quedaron corregidas y espejadas; el gate ahora valida también el bundle de imágenes.

El helper Greenhouse ya conserva GPT Image 2, rechaza `transparent+jpeg`, evita pagar/descartar outputs múltiples,
valida máscara/formato/dimensiones y no promete partial images sin transporte SSE. Globe transporta
`backgroundMode` desde catálogo/shape hasta request, fingerprint, manifest y output; verifica alfa decodificado,
expone el selector route-driven y usa checkerboard tokenizado. La ruta Globe queda probada localmente, sin deploy ni
gasto desde ese runtime.

El CLI canónico de Greenhouse completó además un canary facturable mínimo con `gpt-image-2`, PNG 1024×1024,
`quality=low` y `background=transparent`: el archivo tiene cuatro canales, alfa real y 470.164 píxeles totalmente
transparentes; la composición visual pasó sobre fondos claro y oscuro. Esta evidencia valida el helper Greenhouse,
no el adapter/runtime autenticado de Globe.

Estado: **code complete, rollout pendiente**. La variante transparente sigue Globe-gated hasta desplegar, ejecutar
un canary autenticado y facturable sobre `ref/still/openai-v2`, leer bytes/metadata/cobro, capturar GVC y ejercer
promoción/rollback. No actualizar evidencia de reader/canary histórico sin revalidación real. Pendientes adicionales
quedan en `TASK-1552`, `TASK-1553` y `TASK-1633`: badge requested/effective en feed/viewer, GVC/canary live,
promoción/rollback del modo preview y WebP sólo si se decide ampliar la ruta PNG actual.

## 2026-08-20 — Hiring Evaluación: espacio vertical fantasma corregido localmente

La tabla accesible del scorecard ya no recibe dimensiones de 1 px directamente: vive dentro de un
wrapper genérico `1×1` clipado y conserva `caption`, encabezados `scope` y las cuatro columnas del
contrato. GVC local premium pasó desktop 1440 y mobile 390 con cero findings/runtime errors; geometría
medida: `scrollWidth === clientWidth`, wrapper `1×1`, `scrollHeight` 1549/2296. El scenario dejó de
ignorar la tabla y el layout gate detecta `layout_out_of_flow_vertical_runaway`. Estado: **code complete,
rollout pendiente**; no hubo push, deploy ni release en esta sesión.

## 2026-08-19 (noche) — Release 1745/1746 en producción, y cuatro hallazgos que quedaron en tasks

Sesión paralela a la de TASK-1747. Lo que sigue es lo que una sesión fresca necesita saber para no
repetir trabajo ni reabrir decisiones ya tomadas.

**El release está en producción y verificado.** `6f85644cd`, orchestrator run `32256882119` success,
watchdog `drift_count=0`. El `ops-worker` muestra SHA distinto: es el change-gate, los árboles son
idénticos, no es drift. Las dos migraciones están aplicadas con readback, el índice concurrente creado
(`valid=true, ready=true`) y **20 bearers que estaban en claro en `delivery_payload` fueron saneados**.

**El webhook de Resend funciona.** Nunca había existido — esa era la causa raíz de ISSUE-160. Probado
con correo real: `email.sent` y `email.delivered` firmados en 45 s. Ya se puede responder "¿este correo
llegó?" con `email_deliveries.provider_status` + `delivered_at`, que era imposible esta mañana.

**Dos cosas que NO hay que deshacer.** El fix de Turnstile `ef30759a1` fue revertido en `a36967531`:
el timeout de 15 s no se cancelaba al entrar el desafío interactivo, y el supuesto de dónde pinta
Cloudflare quedó sin verificar. Y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` sigue en `false`
a propósito: hay `email.clicked` **firmados por webhook**, o sea el rewrite de links está ocurriendo
hoy sobre correos de candidatos, y el bearer del cutover viaja en el fragmento.

**Corrección de un error mío que quedó escrito antes:** dije que el tracking del apex "no medía nada"
por faltarle `tracking_subdomain`. Es falso — ese campo es para un dominio de tracking propio, no un
segundo candado. El flag solo basta. Corregido en la skill `resend-email-platform`, que además quedó
espejada a `.codex` y protegida por el gate de espejos.

**Cuatro tasks nuevas, todas con el análisis dentro:**
- `TASK-1749` — tracking de marketing sobre dominio propio (bloqueada por el cutover)
- `TASK-1750` — el desafío interactivo de Turnstile deja fuera a candidatos; su Slice 1 es **verificar
  con la sitekey `3x00000000000000000000FF` antes de implementar**, que es lo que el intento revertido
  se saltó
- `TASK-1754` — las etapas del dominio son las que el operador puede elegir
- Pendiente sin ID: invertir el default de la política de assessment + revisar plantilla por vacante

**El hallazgo que más cuesta y por qué quedó como patrón.** `GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9:
*un estado que el sistema distingue, la superficie no puede colapsarlo*. Cinco casos del mismo día en
cuatro dominios. El síntoma reconocible: **si responder "¿por qué no funcionó?" exige leer la base de
datos para recuperar un dato que el runtime ya tenía, hubo colapso de estado.** Hoy pasó cinco veces y
cada una costó horas.

**Dominio `mail.efeoncepro.com`**: verificado, con SPF/DKIM/DMARC en PASS. Nace sin tracking y **nunca**
debe configurársele un `tracking_subdomain` — es irreversible, sólo se cambia. Mover Hiring ahí es la
salida limpia al problema del rewrite.

**Estado del árbol:** producción corre `6f85644cd`; hay commits en `develop` sin push de las dos
sesiones. No hay nada mío a medio camino.

## 2026-08-19 (noche) — TASK-1747 en curso, traspasada para una sesión nueva

Slices 1 y 2 cerrados; Slice 3 sin empezar. El estado completo para tomarla en frío está en
**`docs/tasks/in-progress/TASK-1747-…md` §Traspaso 2026-08-19** — commits, qué se revirtió y por qué,
los 8 hallazgos de auditoría abiertos y las 3 decisiones que no hay que re-litigar.

**Lo que la auditoría adversarial cambió, y vale más que el código entregado.** El Slice 2 bajaba al
navegador el consentimiento de la candidata y el estado del proveedor de correo, con **ningún**
componente leyéndolos: las props de un Client Component se serializan en el HTML se lean o no. Ningún
gate lo veía — GVC no captura lo que no se pinta y el build no lo mira. Se revirtió el cableado; viaja
con el slice que lo renderiza.

**Y destapó un bug real de `TASK-1746` que ya estaba en producción:** el cooldown de recuperación era
cross-canal en la lectura y por-canal en el comando. Un correo recién enviado apagaba el enlace seguro
durante 60 s — exactamente ocultarle al candidato la única salida que le quedaba, que es lo que el
comentario de ese bloque juraba evitar diciéndose "espejo EXACTO". Corregido en `2e2d4de86` con
cooldown por canal y 4 tests. Lo que lo mantuvo vivo: al fixture del test le faltaba un campo, así que
`Number(undefined)` daba `NaN` y el presupuesto del enlace seguro nunca se ejercitaba.

**El copy también salió corregido de auditoría**, con tres hallazgos que verifiqué contra el código
antes de aceptarlos: los motivos borraban el "reports" del enum (nadie puede afirmar que un correo NO
llegó, y eso quedaba escrito en un ledger append-only); "la candidatura ya está cerrada" se le habría
mostrado a alguien con decisión `selected`; y el mensaje de vencimiento describía 1 de sus 3 ramas, así
que en las otras dos el operador seguía la instrucción y volvía a chocar.

**Estado: nada de esto está en producción.** `develop` tiene además Sonnet 5 de vuelta en el scoring y
la reconciliación del item del run, ambos sin promover. La promoción exige verificar que el ops-worker
quede en el SHA nuevo: el scoring corre ahí, no en Vercel.

## 2026-08-19 (tarde) — El rollout ya estaba hecho y la documentación decía lo contrario

**Corrección de estado.** Las entradas de más abajo dicen "nada aplicado: ninguna migración, ningún secreto, ningún
webhook, ningún flag". Eso dejó de ser cierto a las 13:00 UTC de hoy y **nadie actualizó los documentos**. El peligro no
era cosmético: un agente siguiendo el runbook al pie habría creado un **segundo webhook** al mismo endpoint (eventos
duplicados que el dedupe por `svix-id` NO detiene, porque son ids distintos) y publicado una **segunda versión del
secreto**, rompiendo la verificación del webhook vivo. Corregidos: runbook, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1`,
ledger de flags, `ISSUE-160`, `TASK-1749` y este Handoff.

**Lo que faltaba de verdad, ya aplicado con readback.** El índice único `uq_email_deliveries_token_intent_v2` (los
writers que rotan credenciales llevaban horas corriendo **sin** el backstop que el runbook exigía aplicar antes) y el
CONTRACT de credencial. Sus tres precondiciones se verificaron una por una antes de tocar nada: código en `origin/main`,
Vercel productivo posterior al merge, y ops-worker en `1438906b8` — un SHA de `develop` que **sí** incluye el writer. La
confirmación empírica fue mejor que el chequeo de SHA: un assessment creado después del deploy ya nació con
`access_token_version_id`, y 0 filas violaban el invariante. El guard se probó en transacción revertida y rechaza como
debe.

**La reconciliación destapó 44 correos que nunca llegaron** — 23 `suppressed` y 21 `bounced` — y después, al mirar los
destinatarios, que **todos van a dominios internos de Efeonce**: `efeoncepro.com` (23), `efeonce.org` (13),
`greenhouse.efeonce.org` (7), `efeonce.test` (1). **Cero externos.** Los 8 `hiring_assessment_assigned` fallidos son
direcciones de prueba/QA, no candidatas. O sea: **el daño temido no ocurrió** y no hay cola de rescate para People.
Casi lo reporto al revés — el conteo agregado parecía un incidente grave hasta que se miró a quién le llegaba. Lo que el
dato sí muestra es datos sintéticos y de prueba transitando el pipeline de correo productivo, la misma clase de
problema que `ISSUE-159`.

**`email.suppressed` no estaba suscrito.** Los 8 eventos registrados omitían justo el noveno — y `recover-email.ts`
consulta ese estado para bloquear un reenvío ciego. Un falso negativo silencioso en la puerta de recuperación. Ya son 9.

**El smoke externo real ya está probado por tráfico productivo:** la cadena `email.sent` → `email.delivered` se observó
firmada sobre un `hiring_assessment_assigned` a `gmail.com` — un candidato real, no una casilla interna. Y el
`email.clicked` firmado sobre un assessment a `hotmail.com` es la **prueba dura** de que el rewrite de links de Resend
ya opera sobre correos de candidatos: el gate de `click_tracking` que bloquea el flip de enlaces seguros no es teórico.

**Huecos declarados, no cerrados:** 78 despachos de los últimos 30 días quedan sin lifecycle porque su último evento es
de engagement (`opened`/`clicked`) y el reconciliador prefiere no inferir `delivered` — honesto, pero descarta una señal
que el `opened` implica; 283 despachos fuera de la ventana de 30 días sin reconciliar por diseño;
`redrivePendingResendWebhookEvents` sigue sin caller automático; no se ejercitó un replay real del proveedor.

**`mail.efeoncepro.com`: el DNS está perfecto, Resend no lo confirma.** DKIM publicado con valor idéntico byte a byte,
SPF y MX en su lugar; el dominio sigue `pending`. Aprendizaje operativo: **re-disparar `POST /verify` resetea los tres
registros a `pending`** — hay que esperar, no reintentar. Cuando verifique, mover el remitente de Hiring ahí desbloquea
el flip de enlaces seguros **sin** apagar el `click_tracking` del apex, que marketing usa. Es la salida limpia al gate
que hoy bloquea `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`.

**Estado: TASK-1745 complete e ISSUE-160 resuelto. TASK-1746 sigue in-progress** — le faltan los dos smokes funcionales
(requieren una candidata con consentimiento, decisión humana) y el flip de enlaces seguros. TASK-1747 quedó desbloqueada.

## 2026-08-19 — Seis auditorías pararon el rollout de assessment antes de romper producción

El bloque TASK-1745/1746 estaba por promoverse. Tres auditores independientes (arquitectura,
talento, seguridad) lo revisaron antes; dos encontraron **el mismo P0 sin verse entre sí**, y una
segunda ronda encontró un P0 en la propia corrección. Todo corregido en `5937f6e35`.

**La migración de 1746 no era aplicable en NINGÚN orden.** El CHECK + trigger de
`access_token_version_id` rompían el writer de `main` (23514 en toda asignación de test, en Vercel
y en el ops-worker), y el código nuevo rompía sin la migración (42703). Medido contra la base real:
22 assessments con token, los 22 de los últimos 30 días — el camino está vivo. Y hay **una sola
instancia Cloud SQL** compartida prod/staging/local, así que aplicarla desde local es un cambio
productivo inmediato. Partida en expand/contract.

**El split sin enforcement seguía siendo el mismo P0.** `node-pg-migrate` aplica TODAS las
pendientes en una transacción: dejar el CONTRACT en `migrations/` con un comentario de advertencia
no impedía nada — el runner no lee comentarios. Vive en `scripts/operations/`, se aplica a mano.

**Dos regresiones que golpeaban al candidato.** La sesión caducaba en el plazo para EMPEZAR, no en
el de responder: quien abría el enlace poco antes del límite y arrancaba perdía la sesión a mitad
del test. Y un enlace con el fragmento borrado por un reescritor dejaba al candidato fuera **sin
producir un solo request** — indetectable. Ambas cerradas: deadline vivo + señal
`hiring.assessment.access_never_exchanged` sobre un hecho durable.

**El cap de recuperación cerraba la última puerta.** Contaba intentos FALLIDOS y compartía cuota
con el enlace seguro: tres correos rebotados por un proveedor degradado dejaban al candidato sin
NINGÚN canal por 24 h, con su plazo corriendo. Ahora sólo consume cuota lo que entregó algo, y cada
canal tiene presupuesto propio.

**`boundary-domain.test.ts` estaba ROJO en `HEAD`.** `hiring_assessment_public_session` nunca entró
al allowlist del dominio. No lo vio nadie porque sólo aparece corriendo `src/lib/hiring` completo,
no los tests focales del módulo. Lección: los gates focales no sustituyen al dominio.

**Riesgos residuales declarados, NO cerrados** (ninguno bloquea el release, todos anteceden al flip):
- `purge_expired_assessment_public_sessions` borra filas ACTIVAS por `expires_at`. Hoy es coherente
  porque el trigger de refresh mantiene ese campo canónico; el día que el trigger no dispare, el
  purge le corta el test al candidato sin dejar fila `expired` que lo explique. Hacerlo
  deadline-aware.
- La copy terminal ("Puede haber expirado o ya haberse usado") cubre seis causas distintas, cuatro
  de ellas con el enlace VIVO. El bootstrap ya sabe cuándo faltó el fragmento y lo colapsa en el
  mismo mensaje: distinguirlo da copy honesta **y** medición directa del reescritor.
- `purge_assessment_access_recovery` no tiene ningún caller: la retención de 12 meses y el purgado
  por retiro de consentimiento están declarados y nunca se ejecutan.
- `--reporter=basic` da falso verde en vitest 4.1.0 (falla al cargar, exit 0). No está en ningún
  gate; anotado para que no se introduzca.

**Estado: code complete, rollout pendiente.** Nada aplicado: ninguna migración, ningún secreto,
ningún webhook, ningún flag movido. Orden en
`docs/operations/runbooks/resend-email-lifecycle-rollout.md`, con dos scripts operacionales nuevos
que se aplican DESPUÉS del deploy: el CONTRACT de credencial y el saneador de los bearers que
quedaron en claro en `delivery_payload` desde el 12-ago.

## 2026-08-19 — Hallazgos post-Codex sobre el bloque 1745/1746: guard corregido y ledger reconciliado

Codex cerró el paquete de recuperación de acceso (`5d5eb2f9c` + `f4b5f622f`). Una revisión posterior
encontró tres cosas que no estaban en su alcance; las dos primeras ya quedaron corregidas en `b2ff2b33e`.

**El guard de la migration de TASK-1746 tenía un hueco.** No verificaba la tabla de buckets ni las cuatro
funciones de acceso público, que su propio Down sí dropea. La regla generalizada quedó en
`GREENHOUSE_DATABASE_TOOLING_V1.md` §"El guard anti pre-up-marker debe ser simétrico con el Down". Como la
migration **todavía no se aplica**, se corrigió en el archivo original: no hay forward-fix pendiente.

**El ledger de flags mentía en dos filas.** Corregidas contra runtime real, no contra el doc:
`HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` está en `true` en la revisión activa `ops-worker-00585-nv6` (la fila
del snapshot decía OFF), y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` está `<NO SET>` en esa misma
revisión — OFF de verdad, no sólo por default declarado — y ya tiene fila en `§ Pendientes de acción`.
Nota operativa: la revisión activa ya no es la `00576-7zz` del flip original; el flag sobrevivió a deploys
posteriores porque está declarado en `deploy.sh`, que es exactamente para lo que sirve declararlo ahí.

**Riesgo abierto — `--reporter=basic` da falso verde.** En vitest 4.1.0 el reporter ya no existe: el comando
falla al cargarlo y **sale con exit code 0**. Si alguien lo mete en un gate, ese gate pasa siempre. Los tests
reales del dominio están verdes (439 pass, 42 skipped por falta de proxy PG). No se corrigió nada porque no
está en ningún gate hoy; queda anotado para que nadie lo introduzca.

**Estado del bloque: code complete, rollout pendiente.** Nada del rollout se ejecutó: ninguna migración
aplicada, ningún secreto provisionado, el webhook de Resend sigue sin registrar y ningún flag cambió de
estado. El orden completo está en `docs/operations/runbooks/resend-email-lifecycle-rollout.md` y el siguiente
paso es suyo, no de código: aplicar las dos migraciones + el índice concurrente con readback.

**Owner del siguiente paso: operador.** El rollout cruza Vercel, Cloud Run y un proveedor externo con gates
humanos; no es candidato a automatización desatendida.

## 2026-08-19 — Ronda de documentación post-release: lo que quedó y la deuda que se hizo visible

Tres subagentes cerraron los huecos que dejó el release de TASK-1739. Lo que el siguiente agente
necesita saber:

**El catálogo de patrones tiene un octavo.** Antes de inventar una forma propia para "declarar un hecho
que no se puede inferir después", léelo: obliga a elegir entre propagar en transacción o hacer que los
readers críticos lean la raíz.

**El módulo Hiring emite 16 señales de reliability y sólo 5 estaban documentadas.** Ahora hay inventario
con dueño; quedan 8 sin delta propio (`talent_pool.integrity`, `assessment.template_module_without_questions`,
`assessment.assignment_health` y las 5 de `assessment_ai.*`). Ninguna está rota: es deuda documental.

**Mover una task a `complete/` rompe punteros.** Cinco quedaron colgando, incluido uno dentro del reader
de una señal productiva. Al cerrar una task, correr `grep -rn 'in-progress/TASK-####' src/ scripts/ docs/`
antes de dar por terminado.

**Deuda viva de TASK-1739** en `TASK-1748`: los readers del Banco de Talento no filtran por procedencia
—hoy las 11 personas sintéticas quedan fuera por su `lifecycle_status`, no por el filtro—, el archivado
escribe sólo sobre la postulación, y las 9 huérfanas del lane B siguen sin decisión.

## 2026-08-19 — Working contract para operar engagements On-Demand sin confundirlos con Projects

Se documentó la ontología `Organization → Engagement → Project/Campaign → Task` en
`docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md`. La decisión de trabajo preserva Projects y
Campaigns como contenedores de tareas en Notion para un cliente; el Engagement es el compromiso comercial que
gobierna términos, capacidad, accountability, economics y cierre. On-Going y On-Demand comparten los mismos objetos
operativos: un engagement puede contener uno o varios Projects/Campaigns.

La activación venta→Delivery usa una `Ficha de Activación del Engagement` como snapshot ejecutable —sin reemplazar
quote/SOW/contrato— y provisiona sólo la diferencia sobre la Organization. `Product Service` queda como
clasificación condicional: campaña audiovisual, plan de medios, brandbook u otro deliverable/servicio conserva su
categoría y madurez real. La Gantt es una vista opcional según complejidad, no un requisito ni otro SSOT.

Estado honesto: **diseño conceptual Proposed; cero cambio de runtime**. El repo ya tiene `services`, phases,
progress, outcomes, lineage, asignación de equipo por `service_id` y `notion_project_id`, pero `engagement_kind` no
distingue un contrato regular On-Going de uno regular On-Demand y el catálogo documenta ambos como `retainer`.

Siguiente iteración: elegir 2–3 familias reales de engagements On-Demand, probar casos multi-capability y decidir si
una root row de `services` sigue siendo el aggregate o si hace falta un Engagement superior. Cualquier schema/sync,
Finance, access, team o Notion writeback requiere task + ADR; no implementar desde este handoff.

## 2026-08-19 — TASK-1739 cerrada en producción: qué queda vivo después del cierre

El filtro de procedencia ya opera en producción (`HIRING_SYNTHETIC_DATA_FILTER_ENABLED` ON, release PR #203
sobre `30301816955f`, watchdog `ok`) y el marcado/archivado está aplicado con autorización del CEO. Lo que
sigue importando no es lo hecho sino lo que cambia el terreno para el siguiente que toque Hiring.

**El desk se ve vacío a propósito y eso va a parecer un bug.** Pasó de 24 vacantes / 79 postulaciones a 2 / 47.
Si HR o cualquier agente reporta "desaparecieron candidatos", la respuesta no es apagar el flag: es mirar
`data_origin`. Revertir es un `false` + redeploy en menos de 5 minutos, pero hacerlo devuelve los fantasmas al
pipeline y vuelve a contaminar toda lectura downstream.

**Riesgo abierto #1 — el smoke bloqueado.** `scripts/hiring/verify-growth-forms-application-smoke.ts` NO corre:
declara `smoke_test` y la guarda del write path le prohíbe publicar. Es correcto, no es una regresión que
arreglar. Sus únicas dos salidas legítimas son que deje de necesitar la superficie pública real o que limpie lo
que crea. **Marcar su vacante como `real` para destrabarlo NO es una salida** — fabrica otra vez fantasmas
indistinguibles de una vacante verdadera, que es exactamente el problema que esta task cerró.

**Riesgo abierto #2 — falsa garantía de autorización.** Las capabilities `hiring.data_origin.mark`/`.purge`
están deferidas a propósito: la operación es hoy por CLI con actor registrado y sin superficie API/UI. Quien
construya el consumer (badge, toggle, vista de administración, ruta Nexa/MCP) las declara **en ese mismo PR**,
con grant a ≥1 rol real; declararlas antes sólo simula un control que ningún `can()` verifica.

**Decisión pendiente del operador — lane B de la purga.** Las 9 huérfanas siguen archivadas, no borradas. Es la
única mutación irreversible de la task y su valor marginal es bajo, porque archivar ya las saca de toda lectura.
El protocolo está intacto (`plan → allowlist → sign-off → apply`, abort total si una sola fila tiene dependiente
auditable); ejecutarlo requiere decisión humana explícita, no la inercia de "quedaba pendiente".

**Próximo paso concreto**: cerrar el impacto cruzado que no cabía en el dominio de edición del cierre — registrar
el cierre en `EPIC-011`, agregar el `## Delta` a `TASK-1734` (el sampler del gold set ya excluye sintéticos por
construcción, no por suerte) y anotar `scripts/hiring/purge-task-1378-test-applications.ts` como superado por el
CLI genérico. Y vigilar `hiring.data_quality.synthetic_records_aging` durante 7 días: steady `0`.

## 2026-08-18 — Incident response: delivery de Resend y recuperación de test planificadas

Discovery read-only confirmó que Resend **sí despacha** (393 IDs de proveedor), pero Greenhouse no captura
su lifecycle: no hay webhook registrado en la cuenta productiva, no hay secreto de firma operativo y las
proyecciones históricas no tienen ningún `delivered`/bounce/engagement. `sent` significa aceptación de la API,
no entrega al buzón. El handler existe pero debe corregir su resolución asíncrona de secretos antes de activar
el webhook, porque hoy puede responder `200 ignored` durante cold start.

Quedan creados `ISSUE-160`, ADR aceptado el 2026-08-19
`GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md` y tres tasks compactas:
`TASK-1745` (webhook/reconciliación), `TASK-1746` (ADR aceptado; command de recovery con rotación,
capabilities separadas y enlace fragment→sesión HttpOnly; implementación local en curso) y `TASK-1747`
(consumer Application 360). Gates de las tres tasks
verdes. `TASK-1745` está ahora `in-progress`: el preflight confirmó que el dedupe existente no es
transaccional y que un fallo posterior puede perder el evento en un retry. El fix preservará el sender
outbound como boundary independiente y activará el webhook sólo después de un canary firmado. Todavía no hay
cambio de runtime ni configuración externa.

El Slice 1 de `TASK-1746` quedó code-complete y validado localmente tras cinco rondas independientes de
Arquitectura, Talento y Seguridad: capabilities separadas, eligibility fail-closed, locks
assessment→application→candidate facet, receipt idempotente, events automáticos append-only, deadline
revalidado al commit con reloj real, retención candidate/workforce y purga gobernada. La migración sigue sin
aplicarse; no debe promoverse antes del command token-safe y de smokes PG que prueben ACL, constraints
diferidas, concurrencia y transiciones de retención. Evidencia local: 200 tests, ESLint, TypeScript, marker
gate 586/0, lint operativo y diff-check verdes.

El Slice 2A de `TASK-1746` también quedó code-complete local y validado por Arquitectura, Talento y Seguridad
sin P0/P1/P2. La capa global de email ahora clasifica los tipos que transportan credenciales, persiste un intent
redactado antes de rotar, bloquea batch/retry genérico y distingue rechazo del proveedor de aceptación incierta.
Assessment assignment y Talent Pool verification comparten claim atómico por evento+entidad; un replay o dos
workers concurrentes no vuelven a rotar. El índice único todavía no existe en runtime: antes de desplegar estos
writers debe correrse `scripts/operations/task-1746-create-token-intent-index.sql` y conservar su readback
`unique/valid/ready`. Ninguna migración, índice, secret, webhook ni configuración runtime se aplicó en este slice.

El Slice 2B de `TASK-1746` quedó code-complete local y validado sin P0/P1/P2 por Arquitectura, Talento y
Seguridad. El recovery email liga intent+receipt+rotación bajo una transacción, mantiene el deadline de tests
iniciados y no persiste el bearer. Replay y reconciliación solo proyectan evidencia durable; nunca reenvían ni
rotan, y Platform Health detecta receipts divergentes después de 15 minutos. El tipo de correo sigue OFF y sin
adapter productivo. Próximo paso: Slice 3, con fragment exchange, sesión HttpOnly, auth/capability server-side y
smoke de tracking. Migración, índice y runtime continúan sin aplicar.

El Slice 3A de `TASK-1746` también quedó code-complete local y auditado sin P0/P1/P2. Cada token ahora rota
con una versión explícita y la sesión candidata persiste solo un digest opaco ligado a esa versión; una nueva
emisión invalida las sesiones anteriores. El dominio distingue start-by, deadline de respuestas y 30 minutos
de gracia de envío; no-limit cierra a las 24 horas. El reloj autoritativo viene de PG y el navegador lo proyecta
con tiempo monotónico, por lo que un equipo adelantado o atrasado no congela ni extiende el test. Legacy
GET/start/save/submit y SELF-ID conservan elegibilidad, consentimiento y audit bajo los mismos locks y la misma
transacción. El feature continúa OFF y la migración no está aplicada. El siguiente slice debe construir la
limpieza síncrona `#access`, exchange→cookie HttpOnly, rutas token-free y Product API antes de cualquier smoke o
activación.

El Slice 3B quedó code-complete/dormant y reauditaron Arquitectura, Talento y Seguridad hasta P0/P1/P2=0. Ya
existen bootstrap pre-React que borra `#access`, exchange same-origin acotado, cookie `__Host-` HttpOnly, página y
API token-free, CSP enforced y protección ante maintenance/trailing slash. La sesión conserva elegibilidad y reloj;
un fence por public ID impide que dos pestañas con assessments distintos muten la instancia equivocada. El modal
de envío reutiliza MUI Dialog con foco, Escape, trap y reduced motion. El correo inicial **no cambia todavía**:
`HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` nace OFF en el ops-worker y OFF conserva el enlace legacy. El
workflow del worker incluye notifications en trigger, latest-SHA y drift-check. Antes del flip siguen obligatorios
migración+índice, cuatro rutas live, `click_tracking=false` verificado en Resend, rate limit público y smokes
PG/browser/href. No se aplicó migración, no se desplegó ni se cambió ninguna env.

El Slice 4 de `TASK-1746` quedó code-complete local y reauditaron Arquitectura, Talento y Seguridad hasta
P0/P1/P2=0. Existe un único command `recoverCandidateTestAccess` para email o enlace seguro; la Product API exige
sesión humana canónica, capabilities por canal antes de lookup, lineage exacta, Origin/JSON/idempotencia cerrados y
errores anti-oracle. El enlace manual rota el mismo assessment y se revela una vez; replay nunca devuelve el bearer.
El rate limit usa techo IP confiable de Vercel más bucket por credential/sesión válida, sin amplificación por tokens
aleatorios; savepoints conservan la cuota pero revierten cualquier write parcial. El owner diario de retención drena
buckets con readback y señal. Documentación, manuales y skills de Talento/Arquitectura/Secret Hygiene quedaron
sincronizados, incluido el runbook global `docs/operations/runbooks/resend-email-lifecycle-rollout.md`.

**Handoff a Claude:** no implementar de nuevo TASK-1745/1746. Slice 4 quedó versionado en
`5d5eb2f9c`; el siguiente bloque es TASK-1747 (UI Application 360). Antes de cualquier rollout: aplicar
migración TASK-1745, luego migración `20260819072130586`, ejecutar/verificar el índice concurrente de TASK-1746,
desplegar app+worker dormantes, configurar webhook firmado global de Resend, verificar `click_tracking=false`, hacer
smokes PG/browser/email consentidos y recién entonces habilitar capability/email type/cutover. Hoy no se aplicó ni
activó nada; el correo inicial continúa por el enlace legacy y `sent` no prueba entrega.

## 2026-08-18 — Hiring AI y candidate review MCP: runtime reconciliado

El release `7e7a474217eb` (run `32193134959`) dejó `global_provisional` activo para assessments elegibles de
todas las vacantes: ops-worker `00584-r4x`, 100% tráfico, concurrencia 1, cap 1000 y scheduler cada 2 minutos.
Exception policy y batch confirm siguen OFF; nada muta el score efectivo ni llega al postulante. El dossier está
ON en producción y auto-propone con Google `gemini-2.5-flash`/prompt v2 cuando CV limpio y assessment puntuado
están listos; nunca auto-confirma.

Candidate review MCP también quedó activo internal-only con applicationId exacto, chunks minimizados/redactados,
hash, purpose y audit. Canary OAuth/MCP 200 y borde sin auth 401. B2B y todos los writes siguen bloqueados.

Lifecycle honesto: TASK-1743 cerró code complete con GVC 4,82/5, pero la compactación final de barras
`20964b72a..3616cb5b8` es posterior al SHA productivo y viaja en el siguiente release ordinario. TASK-1742 y
TASK-1718 permanecen in-progress por cooldown/rollback/sign-offs; no se inventaron aprobaciones. El release
classifier omitió rutas Hiring del ops-worker y exigió corrección manual; verificar siempre parity 4/4 por SHA.

## 2026-08-18 — TASK-1739: procedencia de datos de Hiring, slices 1-4 y 6 implementados

Ocho commits. Lo que ya opera: la procedencia existe como HECHO declarado en el nacimiento del dato
(dos raíces, persona y demanda) con copia derivada por trigger en la postulación; los readers del desk
dejan de contar fantasmas detrás de flag; el gold set los excluye SIN flag; hay marcado gobernado con
allowlist humana; y un gate mecánico impide que un seed nuevo cree datos sin declarar.

**Nada cambió todavía para el operador**: el flag nace OFF y nadie marcó nada. Estado correcto:
`code complete, rollout pendiente`.

**Lo que falta y por qué no lo hice**: el apply del marcado exige que un humano pode la allowlist
línea a línea —ese es el punto del protocolo, no un trámite—; el flip del flag en producción exige
**aviso previo a HR**, porque 12 de 14 vacantes son sintéticas por autor y el desk no perderá "algunas
filas" sino casi todas las vacantes; y el Slice 5 (purga) está prohibido por la propia task hasta que
el Slice 4 esté aplicado y verificado. Falta además la triple documentación y las dos capabilities
(`hiring.data_origin.mark`/`.purge`), que hoy no tienen consumer porque la operación es por CLI.

**Dry-run real listo para revisar**: 34 candidatos, todos de confianza ALTA — 12 demandas y 12
vacantes por autor (8 de ellas marcadas además como "estuvo publicada" en el careers real) y 10
personas por dominio de correo reservado. Cero falsos positivos: ningún `@efeoncepro.com`, ninguna
coincidencia por nombre. Correr `pnpm hiring:data:mark-synthetic` para verlo.

**Tres cosas que aparecieron al construir**, todas en los commits:

- La guarda de publicación **bloqueó el smoke que causó el problema**: `verify-growth-forms-application-smoke.ts`
  creó las 8 vacantes fantasma publicadas y no tiene teardown. Queda bloqueado a propósito, con sus dos
  salidas legítimas registradas como follow-up. Destrabarlo marcando su vacante como `real` no es una.
- El guard de frontera del dominio atrapó mi tabla de audit sin declarar. Declarada.
- Corriendo la suite con live tests aparecieron **dos roturas preexistentes** de
  `submit-application.live.test.ts` que CI nunca vio (sólo corren con PG): `publicSeniority` obligatorio
  desde TASK-1740 y `residenceCountryCode` requerido desde el flip de TASK-1688. Ambas reparadas.

## 2026-08-18 — Canary de identidad y smoke del expediente: los dos pendientes declarados, cerrados

Los dos flags que se prendieron "ON con pendiente" ya tienen su verificación. Ambas filas del ledger
quedaron actualizadas con la evidencia.

**Canary TASK-1736 — verde, 4/4.** Se ejecutó como live test gobernado
(`HIRING_CANARY_T1736=1 pnpm vitest run src/lib/hiring/candidate-intake/canary.live.test.ts`), no por el
endpoint público. La razón importa: la base es UNA sola para dev/staging/prod y el ops-worker de correos
es el mismo, así que postular contra `EO-OPN-0009`/`EO-OPN-0061` habría dejado un candidato falso
—indeleble— en una vacante con candidatos en proceso. Verificado además que **no salió ningún correo**.

**Lo que el canary enseñó y el runbook no decía.** Con el flag ON, la evidencia y el audit son
append-only **por grant** (`greenhouse_runtime` no tiene DELETE) y esas filas pinnean por FK toda la
cadena application → facet → Person → opening → demand. O sea: **el canary no puede limpiarse a sí
mismo**. Mi teardown lo intentó y falló en silencio porque tenía `.catch(() => undefined)` — ese swallow
está eliminado y ahora reporta el residuo a gritos. El runbook lleva la advertencia y el residuo exacto.

**Residuo pendiente (bloqueado por la misma credencial que ISSUE-159).** Sujeto 100% sintético:
Person `identity-…-canary-t1736-1787066079713-live-test-invalid`, application `happ-ffebd53b…`,
opening `EO-OPN-0101` **ya despublicado** (`internal_only`, el listado público volvió a tener sólo las 2
vacantes reales), más 2 filas de evidencia y 3 de audit. Registrado como **Delta en TASK-1739**, que es su
hogar natural: su lane de purga ya distingue archivar-con-historia de borrar-huérfanos, y este es su primer
objetivo concreto. `purge-test-facets` NO sirve acá (exige cero postulaciones y consent `not_captured`).

**Smoke del expediente (TASK-1735) — verificado sobre el caso real, sin escribir nada nuevo.** El
propose→confirm post-fix ya había ocurrido el 17-ago 00:12: la nota `hnote-d710c072` guardó sus 8240
caracteres completos (termina en punto) contra los 8000 de `hnote-e2fd7280`, y lleva `supersedesNoteId` +
`repairedFullLength` en su `context_json`. Queda **sólo la revisión humana del primer expediente real**:
es el gate de supervisión humana, no lo puede firmar un agente.

**Fix de paso:** `evidence_coverage_gap` ahora filtra `source='public_careers'`. Contaba todas las
postulaciones, pero la evidencia sólo nace del intake público — cada carga manual desde el desk la habría
dejado en `warning` para siempre. Test de regresión sobre el SQL. `local:check` EXIT=0.

## 2026-08-18 — Las dos vacantes vivas ya están en el contrato editorial v2

Autoradas y publicadas con `PublicOpeningContent` v2 completo por el command canónico. Antes tenían
sólo `workModel` poblado y toda la hoja caía al fallback de prosa; ahora sirven las 13 secciones del
formato canónico, incluida **"Cómo se ve un buen primer año"** — los outcomes observables, que es el
campo que el formato agrega y que ninguna de las dos declaraba.

Casi todo se **derivó de la prosa ya aprobada** (descripción, requisitos, deseables, notas de
proceso), que es reestructurar, no inventar. Los tres hechos que no existían en ninguna fuente los
resolvió el CEO, tal como exige la receta (`job-offer-recipe.md` §0: *"if a fact cannot be resolved,
carry `needs confirmation` and stop before publication"*): **Account Manager reporta al CEO**,
**Content Creator a la Creative Operations Lead**, y el **compromiso de respuesta es de 3 a 4
semanas**. Ese último es el campo que más pesa: es donde la vacante deja de vender y se compromete —
y hoy hay 35 postulaciones sin revisar, así que el compromiso es deliberadamente conservador.

Corregido de paso: `EO-OPN-0061` publicaba "Contrato indefinido" como jornada, que con vinculación
internacional sólo es exacto para Chile. Ahora dice "Jornada completa" —la dedicación sí es
universal— y la forma contractual se explica en el modelo de trabajo. Efecto colateral correcto:
`employmentType: FULL_TIME` en el schema, que antes se omitía por ambiguo.

Verificado en producción: ambas 200, las 13 secciones presentes, JSON-LD de 5756 y 4508 caracteres
con los outcomes incluidos, `baseSalary` sólo en Content Creator (la única con rango aprobado) y
`employmentType: FULL_TIME` en las dos.
