# Corte de continuidad: 2026-09-30

## Exportación REST independiente completa — 2026-09-30 (Chile)

El operador autorizó guardar su nuevo PAT en Secret Manager de Workbench. Se creó
`projects/efeonce-creative-workbench/secrets/workbench-figma-api-token`, versión 1 ENABLED,
con escritura por stdin y readback exacto en memoria. Sin valor local/Git, grants nuevos
al equipo/broker ni lectura del PAT antiguo expirado. Vencimiento nuevo no verificado.
El consumer de mantenimiento puede transmitirlo por stdin al exporter; un job nunca
selecciona secretos. La autenticación GCP se renovó con el runner autorizado.

Figma REST devolvió HTTP 200 en 2 segundos para los 126 nodos en una llamada de imágenes,
fijada a la versión `2404786957900889048` del JSON previamente sellado. Se descargaron
y verificaron 126/126 PNG (nodos, dimensiones, SHA y versión), en 91 segundos.
El MCP había respondido límite de llamadas; no confundirlo con este resultado REST ni
atribuir una causa confirmada al fallo histórico sin diagnóstico.

Canon privado SKY `2026-09-30/figma-rest-retry-2026-10-01T01-34-27-808Z/`: `exports.json`,
`verification.json` y `attempt.json`; sufijo UTC, fecha local 30/09. Manifest SHA
`615c6adb60be867820e465240366b952fd75cb1d469d6275c60fa178c24d94c8`.
Los cortes inferiores «PNG incompleto» son historia. Comparación visual individual,
aprobación comercial y actualización del Lab NO se cierran por descargar los PNG.
No cambió pack, broker, IA, Packages ni Vercel. No certificar push de este corte local.

## Corte vigente: lotes de agentes y círculos nativos integrados — 2026-09-30 (Chile)

Workbench [PR 11](https://github.com/efeoncepro/creative-workbench/pull/11) está mergeado en
`b8e944dd3e8b6717a7690cfb705a3d2820156b5d`. [PR 12](https://github.com/efeoncepro/creative-workbench/pull/12)
está mergeado en `2bb761aa2f76a22a0e9ca8530cfdcc064cf64a91`, el 2026-10-01T00:06:54Z.
Este es el baseline de código verificado al corte; refrescar GitHub antes de asumir que sigue
siendo el último. `marca:lote` ya permite componer campañas con jobs completos y aislados;
la prueba real fue de cuatro formatos, no 126 campañas ni generación pagada.

Los contenedores cuadrados plenamente redondeados con `fillGeometry` conservan el círculo
nativo y su transformación. Contenedores ordinarios mantienen su fallback; los dos pins de
máscara OUTLINE no se amplían. El baseline geométrico sella 126 fuentes contra FIG/pack/renderer:
21 PNG cambian y 105 conservan sus bytes. Privado **277 PASS/0 SKIP**; público
**259 PASS/18 SKIP licenciados exactos**; cuatro gates PASS. CI PR 12: gates `36794450982` y
native-harness/lab-checks `36794451041` SUCCESS. Vercel informó preview SUCCESS; no acredita
inspección del sitio público ni el dominio creative.efeonce.org.

Lab local recompilado con `--native-previews`: 126 referencias y cuatro muestras de corridas
anteriores, 308 archivos, digest `d68376a194183bc17b55949ca8dd59f8874fdc148f7c30a2ecefeee59eebc408`.
Se inspeccionó el círculo de Calama en PNG y navegador. Evidencia privada en el canon del
maintainer `operations/2026-09-30-circular-contours/`: site, logs, verification.json y comparación
antes/después. No mover binarios a Git. Ver [lab.md](lab.md) y [components.md](components.md).

**Pendientes concretos:** las muestras productivas antiguas cuadrado/story requieren corridas
nuevas: el intento fue rechazado antes de ejecución por falta de sesión propia GitHub o Google,
sin llamadas pagadas. `--native-previews` no cambia sus outputs. No editar una corrida cerrada ni
inventar revisión visual. Fidelidad Figma 126/126, foto nueva adecuada, habilitación monetaria y
onboarding de cada integrante siguen pendientes. Efeonce ID permanece diferido (TASK-1952),
sin AUTH paralelo. No hubo deploy del broker en esta unidad; el estado IA OFF de los cortes
anteriores es evidencia fechada, debe revalidarse antes de operar.

Este corte documental no certifica su propio push: comprobar commit remoto y PR. Los cortes
inferiores son historia, incluidos estados «sin push», hashes anteriores, OAuth propio propuesto
y pruebas del candidato de identidad. No usarlos como autoridad actual.


## Histórico: producción SKY y guard de pago — 2026-09-30

Baseline de esta unidad: `609d876feeef46b5785171d321fb4898ad9973cf`; incluye PR 8 y PR 9,
pruebas modulares y reemplazo de foto proporcional por fuente exacta. Efeonce ID continúa diferido
por decisión del operador; TASK-1952 creada/localmente validada, sin implementación.

Nueva unidad independiente [PR 10](https://github.com/efeoncepro/creative-workbench/pull/10),
head `4d3cd8cfd1933f53f87112143d2adf9a2abd7749`, branch codex/broker-final-payment-guard:
extrae el guard monetario final del candidato de identidad sin activar su autenticación.
62 focales PASS; privado 264 PASS/0 SKIP; público 246 PASS/18 SKIP exactos; cuatro gates PASS.
PR 10 MERGED en main `8b6bfe926ccd22cde4f700bb85d24d0ed2b69fef` a las 19:50:57 UTC, árbol
idéntico al head. CI postmerge gates/native-harness/lab-checks SUCCESS y estado Vercel SUCCESS,
verificados por APIs. Broker sin deploy nuevo; esos checks no acreditan contenido público del Lab.

Cloud Run revalidado: 00008-tv6 mantiene 100% del tráfico y generación false; candidata
00010-cof con tag bound-identity mantiene 0%. No confundir main mergeado con revisión productiva.
Faltan techos verificables de inputs/output, cotizaciones/reserva admitidas, deploy monetario,
canary autorizado y cierre del flujo IA. Efeonce ID se retomará mediante la task, después del flujo.

Prueba de foto Always On anterior recupera una corrida existente sin nuevo pago y compone cuatro
formatos: fotografía recibida SHA1dd0f323… (distinta de la aprobada originalmente), runs separados
para cuadrado/story/4:5/banner; entregables privados bajo el canon 2026-09-30/always-on-photo-demo.
La selección del Lab muestra esa prueba; legibilidad de texto blanco sobre cielo/terreno falla
en partes. No heredar aprobación visual ni comercial; sigue pendiente una fotografía adecuada
para las reservas nativas. Ver verification.json del proyecto y references/sky-production.md.

Los cortes inferiores son historia, especialmente cualquier main96eab1e, propuesta OAuth propia
y obligación de terminar identidad antes de composición: la prioridad posterior del operador es
producción, conservando IA OFF y controles monetarios. La autenticación definitiva reutilizará
Efeonce ID, nunca un AUTH paralelo. Ver [budget.md](budget.md) para el port y sus límites.


## Histórico: canary de identidad 9/9, candidato sin promoción — 2026-09-30

**Git y CI:** Greenhouse registró documentos propios en `ccabbbf1e9e24e4760700bbad2bea052f4a31756`
y luego `95125d8a6`, ambos **sin push**. Este corte nuevo no está commiteado. Workbench
[PR 7 draft](https://github.com/efeoncepro/creative-workbench/pull/7), head
`2629ab4ea8ac5a5ed6aa3bf04d3db1fef2e04aef`: cinco checks SUCCESS. **Sin merge/promoción**,
main continúa `96eab1eff46f77e6cd6f242fc243957bbdbee1c1`; no instalación del equipo acreditada.

**Pruebas:** harness 303 y SKY 7. Privado **310 PASS/0 SKIP**; público harness 287 PASS/16 SKIP
y SKY 5 PASS/2 SKIP, total **292 PASS/18 SKIP licenciados**, cero fallos; cuatro gates PASS.
Dependencia pública runtime `google-auth-library` **10.9.1** fijada en producción. Son pruebas
de este candidato; no habilitan pagos ni certifican toda la matriz de controles reales.

**Build y revisión candidata:** Cloud Build `0d726072-992b-4cf2-b1db-6c3d60c99846` SUCCESS; imagen
`8ba42f191cfbdf39fa16f4fbf8e47e9900154225560a95635208f51e9d74d995`, UID1000. Google overlay SHA256
`d60ead18c9e5da3e3e9ccf4aa74e56ed00a6637df5640c61102a67c504572e92`. Revisión `00010-cof` READY,
**0% tráfico**, tag `bound-identity`, generación false. `00008-tv6` conserva **100%** del tráfico.

**Canary real 9/9 PASS, sin pago:**

| Caso medido en candidata | Resultado |
| --- | --- |
| Identity del operador | 200; ID87578376, login cesargrowth11 |
| Firma alterada / token truncado | 400 / 400 |
| Authorization legacy solo / junto al header propio | 400 / 400 |
| Bearer GitHub falso | 400 |
| Body con otro ID | 400 |
| Validate SKY | 200, providerInvocations0 |
| Execute con IA OFF | 400, sin paid call |

**Primer mint real medido:** audit/readback de cuatro tokens, GET de scope para cada uno con
un único repo **1395425041**, `members:read` y `metadata:read`; cuatro DELETE **204** al finalizar
usos. App **5138627**, instalación **166592362** fijadas. Transporte aplicativo íntegro en
`X-Workbench-Identity` + IAM en `X-Serverless-Authorization`, sin fallback Authorization, y
revocación tras usos implementados/probados en esta candidata. No guardar tokens, llave,
subjects o claims. Cloud Run reporta perfil malformed en Authorization legacy: el rechazo medido
no prueba exactamente cómo transformó los bytes ni permite afirmar que eliminó la firma.

**Límite del logro:** sólo el operador está probado en canary. Membresía GitHub verificada:

| Login | ID GitHub | Admisión individual |
| --- | --- | --- |
| cesargrowth11 | 87578376 | Operador probado en canary; candidata sin promoción |
| AndresCarlosamaDev | 117703586 | Binding/IAM pendientes |
| daniela349 | 335077130 | Binding/IAM pendientes |
| MelkinH77 | 335077253 | Binding/IAM pendientes |

Correos siguen como referencia histórica, nunca permisos. Los otros tres mantienen bindings/IAM
pendientes; no hubo mutación API/IAM al equipo. [Documento propuesto de admisión](architecture.md) enruta la fuente Workbench de
IDs y referencias; no autoriza permisos por inferencia.

Audiencia gcloud compartida: riesgo **MEDIO NO aceptado específicamente**. OAuth/OIDC propio
sigue propuesto **antes de otros tres integrantes o gasto**. No se certificaron reales: otro
SUB Google, token vencido firmado, binding revocado, retirada de equipo; fixtures sí los cubren.
Sin recovery real nuevo ni paid calls. Policy budget v2 draft 50 USD/persona y 500 USD/organización
por mes UTC, quotes0, IA OFF. Pendientes OAuth propio, bindings individuales, matriz real
restante, promoción autorizada, cotizaciones/presupuesto/canary pago y QA Figma/Packages/Lab.
Los cortes inferiores preservan historia; no tomar identity400 previo, token no probado o
trabajo en curso de headers/revocación como estado actual.

## Histórico: Corte vigente: PR 7 draft y revisión candidata sin tráfico — 2026-09-30

**Greenhouse:** los 50 documentos propios se registraron en commit
`ccabbbf1e9e24e4760700bbad2bea052f4a31756`, **sin push**. Este corte posterior sigue sin commit.
**Workbench:** [PR 7 draft](https://github.com/efeoncepro/creative-workbench/pull/7), head
`344c8bafea9ecb1e618330e1e7fc8e6a2e334876`, CI y Vercel SUCCESS. Sin merge ni promoción;
esos checks no acreditan endpoint, token de instalación, piezas SKY o canary pagado.

**Imagen candidata:** Cloud Build `eee0b541-659a-45fd-8905-beec23249d60` SUCCESS, digest
`ee9df4997fb995223a3ab616c7d704ab41fdb006fd4a5f7701f855f009fae45e`. Runtime UID1000;
Google overlay SHA256 `d60ead18c9e5da3e3e9ccf4aa74e56ed00a6637df5640c61102a67c504572e92`.
Revisión `00009-cep` READY, **0% tráfico**, tag `bound-identity`; `00008-tv6` conserva **100%**.
Prueba positiva real de identity: **400 request-rejected**, rechazada en el filtro **antes**
de verificar Google o emitir token App. No es autenticación positiva ni prueba del primer token/scopes.
La policy monetaria v2 permanece draft: 50 USD/persona y 500 USD/organización/mes UTC,
cero cotizaciones, IA OFF. No se agregaron gastos USD ni paid canaries.

**Correcciones en curso, no verificadas como entregadas:** transporte aplicativo con JWT íntegro
en `X-Workbench-Identity` y token IAM en `X-Serverless-Authorization`, sin fallback aplicativo
a Authorization; otro agente prepara revocación de tokens App al terminar sus usos. No atribuir
estas correcciones a la imagen/revisión anterior ni declarar nuevos tests/CI por trabajo en curso.

[Comentario de revisión](https://github.com/efeoncepro/creative-workbench/pull/7#issuecomment-5916472410):
audiencia gcloud compartida es un riesgo **MEDIO**, **no aceptado específicamente**. Separar
OIDC propio antes de habilitar a los otros tres integrantes; una aprobación del vínculo del operador
no acepta este riesgo por inferencia. API de equipo: cuatro integrantes; sólo el vínculo del
operador está aprobado/preparado. Los otros tres no tienen bindings verificados ni IAM comprobado.
Correos son referencia histórica, nunca grant. Subjects/JWT/claims no se copian al repo.

| Login GitHub verificado | ID GitHub | Estado Google/IAM |
| --- | --- | --- |
| cesargrowth11 | 87578376 | Vínculo del operador aprobado/preparado; identity positiva y token/scopes aún no probados |
| AndresCarlosamaDev | 117703586 | Binding no verificado; IAM no comprobado |
| daniela349 | 335077130 | Binding no verificado; IAM no comprobado |
| MelkinH77 | 335077253 | Binding no verificado; IAM no comprobado |

Membresía comprobada por API en esta vuelta; no amplía autoridad a GCP, Packages, broker o Vercel.
El diagnóstico de audiencia cubre sólo un owner, IA OFF y candidato con 0% tráfico; el riesgo
MEDIO sigue sin aceptación específica.

Los bloques siguientes preservan cortes anteriores (incluidos sin PR, identity404 y policies
preparadas); prevalece este corte para estado vigente. Falta identidad positiva/token/scopes,
OIDC propio, controles negativos/recovery, rollout individual y promoción autorizada;
cotizaciones, presupuesto admitido, canary, Figma, Packages y Lab conservan gates separados.


## Candidata de identidad vinculada: código preparado, sin PR — 2026-09-30

Baseline main **96eab1eff46f77e6cd6f242fc243957bbdbee1c1**, PR 3/4/5/6 fusionados y CI del
último merge verificada abajo. La candidata siguiente aún no tiene PR, merge, admisión o
rollout; pins de policy App admitidos por el owner y binding del operador aprobado/preparado
en canon privado, sin consumer/runtime verificados. IA **OFF**. El código ya implementa minting/consumer
Secret Manager, lector Google, puente, handlers/kernel/history/bundle y CLI Google-only;
no confundir preparación de código con binding real o endpoint live.

**Nuevo readback de instalación:** Julio confirmó la creación/instalación de
`efeonce-workbench-authority`, App **5138627**, instalación **166592362**. La API GitHub
verificada por el agente raíz confirma organización **234934634**, `members:read`,
`metadata:read`, selección `selected` y `events: []`. No se infiere acceso a otros repos.
El operador reportó secreto propio con una versión y SA exacta; aún falta lectura efectiva
del token/scopes y readback del consumer/runtime. No se copiaron valores del secreto.
El owner admitió los pins App en la policy candidata de Workbench. El primer token aún no
tiene readback: la impersonación de la SA no dispone del grant requerido; no se amplió IAM.

**Vínculo del operador aprobado:** el agente raíz verificó firma y audiencia exacta del ticket
Google y la sesión humana del operador. El usuario aprobó issuer/sub → `cesargrowth11`, GitHub
ID **87578376**. Policy preparada en canon privado con modo `0600`, vigencia 90 días hasta
**2026-12-29**. No copiar sub, JWT ni claims de email a Git. Ese vínculo aprobado no admite a los
otros integrantes ni certifica sesión/endpoints live. Runtime identity sigue 404, IA OFF;
rollout, presupuesto/cotizaciones y canary continúan pendientes.

Cambios de frontera: canon vivo y policy SHA inicial antes/después de proof workspace,
reresolución de recursos/pack/version; snapshot nunca autoridad. Google startedAt/lastObservedAt
privados rechazan retroceso y la denegación elimina proof definitivamente. Reauth antes de
budget, tras ticket antes de UUID y después de complete durable antes de delivery; revocación
no destruye el resultado pagado. El kernel no consume el ticket antes del adapter: OpenAI llama
una sola vez al guard tras secreto/body. assertBeforeProvider durable → await reauth →
assertAtProvider síncrono del objeto exacto verificado comprueba dueño/hash/período/quote.
Guard ausente, denegado o repetido rechaza la salida. Recovery no añade pagos.

Inventario candidato **294 casos harness/44 archivos**, 53 añadidos (puente 8, Google 13,
minter 15, transporte 6, kernel 9, provider 1, budget 1), y SKY siete/dos sin cambios. Público exige
16+2 SKIP licenciados; privado cero. **Focal final: 73 PASS**. Readback de suites locales finales:
privado harness **294 PASS/0 SKIP** y SKY **7 PASS/0 SKIP**; público harness **278 PASS/16 SKIP**
(total 294) y SKY **5 PASS/2 SKIP** (total 7). Total privado **301 PASS**, público **283 PASS/18 SKIP**,
cero fallos. Evidencia `/tmp/cw-bound-{private,public}-{harness,sky}-final.tap`, cuatro archivos
leídos por separado. Resultados locales, no CI, grant o canary. Runtime `/v1/identity` devuelve
404 e IA permanece false; sin admisión ni PR creado aún. La App ya está registrada e instalada
por el operador, con API de instalación verificada y pins App admitidos por owner; vínculo
del operador aprobado y preparado en privado. Minting/token y runtime siguen pendientes.

Canon Workbench: `docs/architecture/workbench-broker-identity.md`,
`workbench-github-app-minting.md`, `workbench-google-bound-identity.md`,
`workbench-broker-transport.md`, `workbench-bound-identity-rollout.md` y
`workbench-broker-budget.md`; [budget.md](budget.md) resume el punto de consumo.
Preparar PR draft, leer/verificar token de la instalación mínima ya registrada, reunir evidencias
de ambas cuentas por persona,
bindings/audiencias aprobados y secreto/IAM exactos; backend admitido/readback IA OFF **antes del
merge CLI**. Rollback sólo compatible con binding o bloqueo cerrado, sin bearer GitHub legacy.
Cotizaciones/canary, admisión travel, Figma completo, Packages y Lab conservan gates independientes.

## Follow-up fusionado: PR 6 y main 96eab1e verificados — 2026-09-30

[PR 6](https://github.com/efeoncepro/creative-workbench/pull/6), head
`409c113e4429a7f8a5ab765b1e5658e03935970c`, 23 paths, fusionado por squash el
`2026-09-30T16:03:53Z`. Main exacto **`96eab1eff46f77e6cd6f242fc243957bbdbee1c1`**;
árbol idéntico al head: `d854609304d6a6b2b0da9ca271ccb0d57111fa07`. CI postmerge:
[gates 36741454085](https://github.com/efeoncepro/creative-workbench/actions/runs/36741454085)
y [native-harness/Lab 36741454046](https://github.com/efeoncepro/creative-workbench/actions/runs/36741454046)
SUCCESS; [Vercel SUCCESS](https://vercel.com/efeonce-7670142f/creative-workbench/5uM1P8jQ1nFbF9UTuEJhoTFoLswh).
El cierre previo 244→3→4→5 de abajo se conserva como antecedente verificado.

- Travel: candidata catálogo **2.1.1**, revisión `sky-airline.travel-window.v2`. Contrato común
  conserva las 19 definiciones históricas y añade travel al final; conserva geometría/copy de
  las 20 adaptaciones. Pack operativo **0.1.0**, catálogo activo **2.0.0**, sin nueva activación,
  bundle admitido ni publicación Packages. Preparación y admisión son operaciones diferentes.
- Prompt completo: límite de 32.000 unidades UTF-16 antes de presupuesto/reserva UUID; un único
  compilador y el mismo cuerpo en el adapter. Auditoría opcional saneada de request ID/usage en
  outcome y ZIP; ausente/inválida es null, nunca cero inventado ni cotización previa.
- Lector de GitHub App, manifiesto y policy draft preparados. No existe minting, binding propio
  Google→GitHub, registro/instalación ni wiring live por esta unidad. Transporte actual aún
  vigente; tests del lector no certifican sesiones del equipo ni permiso de producción.

Verificación integrada local archivada: **241 casos/40 archivos harness públicos, 225 PASS/16 SKIP/0 fail**;
**siete/dos SKY públicos, cinco PASS/dos SKIP/0 fail**. Privado: **241 harness + siete SKY =
248 PASS, cero SKIP y cero fallos**. Allowlist licenciado permanece 16 + 2. Los ajustes de captura
de identidad antes del await y formato opaco de credencial quedan incluidos; diez focales del
lector y los cuatro gates finales pasan. No atribuir esos fixtures a una App integrada, un
binding real o la candidata activa. La CI del merge es evidencia separada de estos logs privados.

Logs durables `0600`, con SHA-256 comprobados, y `merge.json` en
`/Users/jreye/Documents/creative/creative-workbench-canon/operations/workbench-production-readiness-2026-09-30/`:
`harness.tap`, `sky.tap`, `private-harness.tap`, `private-sky.tap`. Contrato y hashes en
`docs/architecture/workbench-public-ci-coverage.md`; auditoría
`docs/audits/workbench-production-readiness-2026-09-30.json`. Los documentos Workbench mantienen
el corte local previo al commit como historia; este readback acredita publicación, merge y CI.

Readback runtime del operador: servicio broker revisión **00008-tv6**, Ready y 100% del tráfico,
`WORKBENCH_GENERATION_ENABLED: false`. Ese despliegue ocurrió externamente en paralelo: no se
atribuye al PR 6 ni certifica que su imagen incluya el código nuevo. IA permanece **OFF**;
precios/cotizaciones admitidas, canary del presupuesto vigente, binding y onboarding individual
siguen pendientes. Vercel genérico verde no acredita un build o promoción del Lab SKY.

Canon de Workbench: `docs/architecture/workbench-sky-semantic-revision.md`,
`workbench-openai-usage.md`, `workbench-broker-identity.md`, `workbench-public-ci-coverage.md`
y `docs/operations/HARNESS_STATUS.md`. Unidad 6 cerrada en Git/main/CI; objetivo global activo.
Continuar admisión semántica, minting/binding/transporte, cotizaciones, runtime y comparación
Figma completa por sus carriles propios, con pruebas y readback antes de habilitar IA.

## Estado vigente · transición fusionada 244 → 3 → 4 — 2026-09-30

Este bloque supersede «PR 3 abierto/draft», «sin merge», «transición sin publicar» y la
reautenticación pendiente y «PR 4 abierto» descritos anteriormente. Los bloques inferiores conservan historia
fechada; no sustituyen el estado actual ni acreditan habilitación productiva.

| Acción | Estado y evidencia |
| --- | --- |
| Greenhouse [PR 244](https://github.com/efeoncepro/greenhouse-eo/pull/244) → develop | Fusionado el `2026-09-30T15:09:06Z`; merge `df5db4479ddbfe2d3c19d6a5e64a00e266b627d6`. CI completo SUCCESS y merge verificados por el operador. Su árbol coincide con el head revisado `d2dfee05a56d4b951fa910aa852ede61cafba7f7` |
| Workbench [PR 3](https://github.com/efeoncepro/creative-workbench/pull/3) → main | Fusionado el `2026-09-30T15:09:31Z`; merge `17bc3a6f5f52b2c4c3c10ba88bd308308e443189`, desde head `5416d54e52a28bd6a0c91f397e0afe82e17ad6e4`. Native-harness, Lab y Vercel pasaron; el gate legacy conservaba las once diferencias esperadas del sello anterior |
| Ensayo aislado de transición | Planner auténtico del 244 sobre el merge de Workbench: 829 gestionados, dos nuevos, 59 cambiados, once entregados al ownership nativo, cero retirados y cero colisiones. Managed-drift, hygiene, piezas y native-policy en verde |
| Integridad del ensayo | `verifySeal` y hashes exactos de todo el plan comprobaron fuente; segundo plan con bytes idénticos y reconciliación vacía. Las 14 rutas nativas y 401 archivos originales fuera del plan conservaron sus bytes. No se ejecutó la CLI de sync en el ensayo |
| Intento propio de sync | `creative:sync --ref df5db4479ddbfe2d3c19d6a5e64a00e266b627d6 --pr` desde fuente aislada preparó el mismo candidato; su push fue rechazado por falta del scope GitHub `workflow`. Ese intento no creó un PR; no se repitió el push ni se forzó la rama |
| Transición adoptada en main | [PR 4](https://github.com/efeoncepro/creative-workbench/pull/4), creado en paralelo el `2026-09-30T15:13:51Z`, fusionado el `2026-09-30T15:26:23Z`; merge `31e91f6a6bcc7e954caea7833a5b54b6dc491e40`, desde head `8e3467fb1ec9b57dd3a2992dfcd6256bb5934c13`. Readback MERGED; el lock publicado se conserva idéntico en ese main. No acredita CI del nuevo merge hasta verificar su ejecución |
| Autenticidad del candidato publicado | Su lock fija source commit `df5db4479ddbfe2d3c19d6a5e64a00e266b627d6`; las 14 rutas nativas y los 829 hashes gestionados coinciden exactamente con el ensayo auténtico. El lock publicado usa `source.ref: HEAD`; el ensayo usa el SHA explícito, por lo que sus hashes de archivo difieren |
| Identidad y checks del PR 4 | El head anterior `ba2a02c703d6d873f111239f64e9e16b27582693` tenía gates/native-harness/lab-checks SUCCESS y Vercel FAILURE con enlace a diagnóstico de colaboración. Un commit vacío corrigió la identidad Vercel: el árbol Git es idéntico. En el head actual los tres checks y Vercel son SUCCESS; deployment [EbUCEKtjFbiKL19wa71ERTp3JUzA](https://vercel.com/efeonce-7670142f/creative-workbench/EbUCEKtjFbiKL19wa71ERTp3JUzA). Los checks corresponden al head del PR, no al nuevo merge de main |
| CI postmerge de main | En el merge `31e91f6a6bcc7e954caea7833a5b54b6dc491e40`, gates/lab-checks/Vercel SUCCESS y native-harness FAILURE. El test 138 de `test/native-ownership.test.mjs` ejecuta la prueba de refspec permitida desde el checkout main; el guard bloquea correctamente esa rama. [PR 5](https://github.com/efeoncepro/creative-workbench/pull/5), head `f45ac74e022e1436a466ff9067c4457038cd18e9`, cambia únicamente nueve líneas de ese test (7 añadidas/2 retiradas): fixture Git aislado en `codex/safe`, sin cambios al guard. Reproducción local de main 5 pass/1 fail → 6/6 pass; suite pública 225 total/209 pass/16 skip/0 fail. Revisión independiente sin hallazgos y cuatro gates locales PASS. Gates/native-harness/lab-checks/Vercel del head f45 SUCCESS. PR 5 fusionado el `2026-09-30T15:32:41Z`, merge `4f868c6a7fc18ce6b7b67c59cc5ff0af58846345`; readback final del main exacto `4f868c6a` con gates/native-harness/lab-checks completados SUCCESS y Vercel SUCCESS (runs `36737550439` y `36737550291`). La falla histórica de 31e no se borra ni se interpreta como una falla actual del guard |
| Vercel y Lab SKY | El operador verificó por API el deployment genérico `dpl_EbUCEKtjFbiKL19wa71ERTp3JUzA` READY, con `builds: []`, framework/rootDirectory null y raíz 404. Es el proyecto genérico, no un nuevo build del Lab SKY. El snapshot/Preview SKY anterior permanece sin cambios; no afirmar despliegue nuevo del Lab ni promoción estable |
| Cobertura Figma | Se conservan las 126 adaptaciones de fuente; no afirmar cobertura nueva de PNG ni cerrar la comparación visual por estos merges |
| Reautenticación | La ampliación de `workflow` fue cancelada; el operador verificó la denegación en la UI. No se amplió ningún permiso. No reabrir la autenticación ni crear otro PR como reparación de un intento ya superado por la publicación paralela |
| Producción IA | Continúa **OFF**. No se admitieron precios/cotizaciones reales ni un nuevo canary del presupuesto vigente. Los canaries anteriores son historia; merges y gates no habilitan generación, no ejecutan proveedores y no prueban presupuesto productivo |

Pruebas durables privadas, con archivos `0600`, directorio `0700` y hashes de archivo verificados:
`/Users/jreye/Documents/creative/creative-workbench-canon/operations/workbench-native-transition-2026-09-30/`.
`proof.json` conserva el ensayo `d2dfee05a` → `5416d54`; `proof-merged.json` conserva los dos merges
exactos y la conservación de 401 archivos; `proof-manifest.json` fija bytes/SHA y procedencia de
ambos ensayos. `published-pr4-readback.json` conserva la comparación del lock publicado con el
candidato; `published-pr4-followup-readback.json` fija el nuevo head, su árbol idéntico y los checks.
`merged-pr4-readback.json` acredita el merge, el lock idéntico en main y sus límites de runtime.
El SHA-256 del lock del ensayo final es
`844198508ff6116801964a5376194d9af1262ed556d31cf033fed224691871c5`;
el del lock publicado es `1e140bce8fe5423739d2fd2b56b7ed09f620b4b46fad7ad430e95a694b6039d4`.
La diferencia corresponde a `source.ref`, con commit, native y hashes gestionados iguales.
Ninguna prueba es un archivo de campaña ni habilita generación.

La secuencia de merges y la verificación de CI de main quedaron completas; el objetivo global
sigue activo. Evidencia de cierre: canon privado `operations/2026-09-30-merge-transition-closure.json`.

Siguiente acción: continuar precios/cotizaciones admitidas y canary del presupuesto vigente antes
de habilitar IA; verificar bindings de diseño y cerrar comparación Figma con evidencia visual de
cada adaptación. Tratar la actualización del Lab SKY como una operación separada con build,
deployment y readback propios. No duplicar el PR, forzar la rama, ampliar scopes, crear otro paquete, promover
Vercel, encender IA ni ejecutar un canary por estos merges. No ejecutar la CLI vieja del checkout
compartido ni cambiar sus CLIs o su rama: el trabajo local y la documentación WIP de Greenhouse
siguen separados del commit fuente autorizado.

## Corrección de presupuesto y gobierno, 2026-09-30 (local en revisión)

El operador aprobó 50 USD/persona y 500 USD/organización por mes UTC, ampliables por decisiones
explícitas. Budget v2 reemplaza los slots v1 locales por CAS organizacional conjunto; rechaza
antes de UUID primario con cero invocaciones de ese intento. No IA ni IAM/deploy por este código.
Guard porta seis casos; gates WB restaurados a main por orden humano: 11 diferencias del sello viejo.
Transición sellada debe venir del PR 244. Templates nativos y tests retirados de Greenhouse con respaldo privado;
TASK-1945 conserva historia y corrige comando inexistente. No tocar CLIs locales de Greenhouse.
Figma token funciona: nativeSize fraccional se compara como geometría y canvas redondeado con ceil como export;
no cambió el pack/catálogo. Ver referencia budget y HARNESS_STATUS real antes de actuar.
Corridas anteriores 215/222/204/18 y contrato de slots quedan como historia, no cierre vigente.


Este archivo es un **snapshot**, no un reader de runtime. Diferencia inspección de código actual
de hechos cloud observados anteriormente. Al retomar, verificar estado antes de afirmar vigencia.
No cerrar el harness ni una task a partir de esta skill.

## Avance presupuesto y CI — 2026-09-30

Control durable por GitHub ID/mes UTC, slots compartidos entre marcas, cotización exacta y
verificación inmediata antes del provider. Política fija draft,50USD/persona/mes aprobados, sin reserva/precios reales admitidos,
sin generación/despliegue. [budget.md](budget.md) detalla operación, incertidumbres y cierre pendiente.
Privados222pass/0skip (215harness+7SKY); público aislado204pass/18SKIP; focales43 y gates verdes.
Contextos Docker/GCP incluyen policy; selección local32 inputs, sin upload/image build.
CIv2 fija inventario39/2 y totales215/7, SKIP16+2 exigidos en público, cero en privado.
Main GitHub observado sin protección y en0c2e3d7. Identidad, gobierno, costos y semántica activa
siguen pendientes. No merge ni cambio de pack, IAM, broker live, Packages o snapshot SKY.
Canon Workbench: docs/architecture/workbench-broker-budget.md y docs/audits/workbench-budget-ci-2026-09-30.json.

Arreglo externo separado: Preview Greenhouse835f53ec con NPM_RC genérica sensible read:packages;
redeploydpl_4Sc7EwzVk5brzyqZHsiV4XDV4hFt READY y login/session200, sin código ni CLIs ni Production.
Ese readback no certifica habilitación de Workbench. Source previo de esta unidad289a12e;
commit/push/CI remotos del avance se registran después de verificar.

## Avance composiciones y recetas — 2026-09-30

Registro 1.0.0: 37 composiciones, 126 adaptaciones con membership única, 21 recetas de componente,
108 tokens globales y diez referencias curadas por composición (binding no establecido).
126 templates/41 CTA/41 fields contrastados con el grafo propio sellado.
CLI `marca:recetas` consulta o prepara planes por variante; todos los campos nuevos quedan vacíos.
`marca:disenar` incorpora identidad de composición y receta en QA para runs nuevos.
Validación real 3928: estado validated, cero proveedores y PNG idéntico al run 6402bcef.
176 pruebas locales sin skips, TS7/Astro (26 archivos)/gates pasan. Lab nuevo: Recetas con búsqueda,
variantes expandibles, diálogo/teclado/foco y selección de zonas; móvil 390 px sin overflow.
Build `66d258eb5ad3f0a88300fa86c1080cd391e9850d77f89c5f6ee0ee4d4e37e9a4`,
298 archivos, repetición idéntica y cero fonts. Archivo privado composition-recipes bajo
creative-workbench-canon/sky-airline/2026-09-30, los 298 hashes verificados.
Código Workbench `207f2394412ba05dce53fc81b449fd6e2155cfda`, subido al draft PR 3;
CI gates/native-harness/lab-checks SUCCESS. Preview `dpl_H9icU12cxB24mxBSa1yFydFwGNdx` READY,
https://creative-workbench-rk0670mof-efeonce-7670142f.vercel.app, proyecto SKY propio y protección all.
Marca/source/build cotejados con API; 16 archivos críticos servidos iguales por SHA, incluido
composition-recipes.json. Tres rutas Preview y raíz del alias estable anónimas responden 302.
Archivo completo de 298 ficheros cotejado localmente; no afirmar los 298 remotos. Sin merge ni
promoción estable. Evidencia: Workbench docs/audits/sky-composition-recipes-2026-09-30.json.
Sin publicación npm, proveedores, edición de outcomes ni cambios en CLIs de Greenhouse.
Canon humano/agentes: Workbench docs/manual/composition-recipes.md y docs/architecture/workbench-composition-recipes.md;
[recipes.md](recipes.md) conserva operación y límites.
Cierre de evidencia subido en `7c4024d7e9dcbf7efbdceb4f795e1607a9ae2789`; el PR 3 continúa draft.
CI de ese head: gates y workflow native-harness SUCCESS; el Preview conserva el source de implementación 207f239.

## Avance Lab Astro — 2026-09-30

Código Workbench `3958475`, rama `codex/brand-isolated-harness`, subido al draft PR 3.
Astro 7.3.5 estático, Tailwind 4.3.3, módulos TS 7.0.2 strict; checker Astro con API TS 6.0.2.
Diez componentes, guía `/lab-guide/`, galerías filtrables, dialog y zonas tipadas.
Header Efeonce | SKY y footer Efeonce son host-only; no mezclar esa firma en arte SKY.
165 tests locales pasan, TS7/Astro/gates verdes, UI 1410×899 y 390×844 comprobada.
Catálogo adulterado Berel fue rechazado; inspector vaciado, galerías siguieron funcionando.
Build `4928dca34aa6ca4a3c32d673a9a64a2e4ec47f8674f7f470f5d3e2829e6a8203`: 297 archivos, cero binarios licenciados,
126 referencias históricas, seis corridas modulares y 132 WebP derivados. Repetición idéntica;
selección vacía crea digest propio sin residuos; staging limpio.
Archivo privado `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-30/lab-astro/4928dca34aa6ca4a3c32d673a9a64a2e4ec47f8674f7f470f5d3e2829e6a8203`
con 297 hashes cotejados. Preview `dpl_99v1Df6YKwyy3p3hR3eQHqgxGxGn` READY:
https://creative-workbench-pz9aql5to-efeonce-7670142f.vercel.app. Proyecto SKY `prj_7D9AODtfOOEf1su21wqyQASOdzOc`, protección all,
metadata source `3958475`/build exacto. Quince archivos críticos servidos cotejados por SHA,
no los 297 remotos; tres rutas Preview y raíz estable anónimas responden 302. CI del head
`3958475892a10573c6b7e7868ecb892a709637de` gates/native-harness/lab-checks SUCCESS.
No merge ni promoción estable. No proveedores ejecutados ni CLIs de Greenhouse modificadas.
Canon humano: `docs/manual/workbench-lab.md`; arquitectura y QA en Workbench, referenciados
por [lab.md](lab.md). Este bloque supersede el renderer antiguo; conserva abajo historia fechada.

## Alcance humano confirmado

- Espacio compartido para múltiples marcas y personas del equipo Efeonce, con SKY como primer cliente.
- Todo el equipo GitHub puede producir para todas las marcas; ninguna ejecución mezcla identidades.
- Metric vigente para SKY; Inter auxiliar/experimental.
- Harness/ports en Workbench; CLIs de Greenhouse intactas.
- Inspeccionar todas las adaptaciones Figma; componentizar partes reutilizables, logos/flechas/CTA/legal.
- Esta skill Greenhouse empieza ahora para conservar continuidad; se amplía conforme avance el harness.

## Código inspeccionado al crear la skill

Repo `/Users/jreye/Documents/creative-workbench`, rama `codex/brand-isolated-harness`, commit
`4ec008a4408e079c1027dbffd427f6fbf83cbb9e`, subido al PR draft
https://github.com/efeoncepro/creative-workbench/pull/3. Es ref de trabajo; no asumir merge a main.

Catálogo: SKY ready con pack trial 0.1.0 SHA
`2357640e83fbe3e6477e705e3dda202a7647f4ae15cba3a15fb232ddf08fef26`;
Efeonce/Berel gated sin pack. Ready significa admisión local de esas operaciones, no producción
general cloud ni aprobación de diseño. 193 recursos, cinco caras Metric; catálogo 2.0.0.

Figma SKY fileKey `ZhnJUPqzvYqy7nTcLLKLr1`, source FIG SHA
`473054c8e0603de27636c8dc72c4a9c39a8229ef406e3d40dade370fd5cf0045`.
126 adaptaciones nativas, 19 tipos de zona. Biblioteca modular: 21 familias, 1196 campos con
ownership único, trece módulos, seis logos de escala reparada y 74 flechas continuas.

Prueba modular: 142 tests harness + siete SKY locales, cero skips; gates y CI del head verdes.
Los 126 compositores históricos mantienen sus hashes PNG. Seis runs productivos reales con
GitHub vivo, foto/copy históricos, cero providers y PNG completos inspeccionados:

| Nodo | Run |
| --- | --- |
| 2026:3825 | b2ffd524-b43b-43ee-8b92-b9949acdd3f6 |
| 2026:3854 | fbc4e654-3167-47e3-a31e-43bb5343144f |
| 2026:3891 | c4330563-e1d4-421b-ab47-8256aa33380d |
| 2026:3928 | 6402bcef-84a6-4c5f-8f23-5e51fc1bc65b |
| 2026:3378 | d344f26f-5a28-4471-a3e6-32b1299e4f94 |
| 2026:4685 | fda8793c-7422-4e01-ad4a-3fd474618d6c |

Adapter SHA de esas seis corridas:
`2a92ed74cfc8049da14f2bf4570fa5592910a98bf7ddc77f5bb0b310a51f581d`.
Auditoría en Workbench `docs/audits/sky-components-2026-09-30.json`; evaluación en
`projects/sky/components-proof/evaluation.md`. No aprobación comercial.

## Registro inicial preservado

El [resumen de arranque del 29/09](startup-record-2026-09-29.json) conserva literalmente y por
SHA la nota antigua que estaba en Handoff antes del pointer de esta skill. Es historia supersedida:
no indica equipo vacío actual ni autoriza ejecutar el sync/CLIs antiguos. Los contratos nativos y
las evidencias posteriores de Workbench gobiernan la operación.

## Hechos cloud anteriores: requieren refresco live

Último readback documentado: broker revisión `00008-tv6` Ready, tráfico 100%, generación exacta
false. La skill no repitió llamadas cloud para certificarlo. Un canary propio anterior sí probó
proveedor, receipt, archivo, replay y descarga. No certifica readiness general ni acceso de todos.

Paquetes SKY 0.1.0 candidate privados publicados e instalación real propia por SHA verificada;
108 tokens, siete assets y contratos/renderer, sin fonts. Esta unidad de componentes no publicó
otra versión. Sincronización npm, pack/broker y visor es explícita, no automática.

Visor SKY Preview protegido observado anteriormente:
https://creative-workbench-g3o74xdsb-efeonce-7670142f.vercel.app,
deployment `dpl_FdXHeFwhq4pkZhi8K5xbkwx1WXQA`, ref anterior a los últimos cambios.
No declarar que allí ya aparecen componentes nuevos. Alias estable
`creative-workbench-sky.vercel.app` también requiere readback/promoción propios. El check Vercel
genérico del repo en 4ec008a pasó; no prueba actualización del visor separado SKY.

Doce corridas anteriores de texto/artwork archivadas remotamente y releídas por SHA; 213 entradas.
Fuente de evidencia: Workbench `docs/audits/sky-native-archives-2026-09-30.json`.
Las seis corridas modulares tienen archivo privado local, no afirmar nuevo archivo GCS.

## Pendientes concretos

| Pendiente | Próximo paso y evidencia necesaria |
| --- | --- |
| Figma independiente | PAT existente Greenhouse expirado (/me 401 expired-token, file 403). Formulario nuevo preparado; creación no completada por frontera de tool. Confirmar credencial vigente sin imprimirla; exportar una versión única y revisar cada pieza |
| Fidelidad de todas las piezas | Cinco controles UI independientes, 121 faltantes. Import propio no sustituye control Figma; comparar textos, CTA, logos, composición, máscara y bordes por nodo |
| Always On contraste | Título mínimo ~1,00855:1, subtítulo ~1,45511:1 sobre nubes claras. Foto aprobada como criterio no aprueba KV; resolver reserva/crop y medir pieza final |
| Nueva foto con reserva | `projects/sky/always-on-photo-reserve-proof/` preparado, trece copys caben con foto histórica. Nueva SCENE/prompt no admitidos ni ejecutados; llamada pagada adicional sin autorización, no activar por esta skill |
| Equipo completo | Verificar sesión GitHub/Packages y Google invoker de cada persona. No inferir correos ni claims de instalación a partir de un maintainer |
| Publicación estable SKY | Build modular/histórico diferenciado, identidad/scope/protección correctos, deployment/alias y readback después de promoción autorizada |
| Otras marcas | Packs, fuentes, contratos, bibliotecas y canaries propios; Efeonce/Berel siguen gated en el corte |
| Readiness/retención | Certificar equipo, límites, almacenamiento/recuperación y política de retención; canary propio no cierra todo |
| Skill final | Esta versión inicia continuidad; actualizar con evidencias y revisar al cierre real, sin borrar pendientes |

No convertir un bloqueo anterior en permiso para bypass, ni volver a pedir autorización ya otorgada.
Progresar en trabajo independiente del bloqueo; si la tool exige intervención humana, explicar la
restricción concreta. No anunciar un token generado ni acceso cloud basándose en formulario/doc.

## Evidencia privada local

Base: `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/`.

| Directorio | Qué conserva |
| --- | --- |
| `2026-09-29/figma-native/` | FIG original/source privado |
| `2026-09-30/comparison-126-baseline/` | Comparación por nodo y cinco controles independientes |
| `2026-09-30/mixed-text-proof/` y `mixed-text-proof-v2/` | Propuesta de texto rechazada y corridas corregidas, sin overwrite |
| `2026-09-30/native-archives-v1/` | Recibos y readbacks del archivo remoto de doce corridas |
| `2026-09-30/components-v1/` | 126 before/after de mantenimiento y siete planchas de 74 flechas |
| `2026-09-30/components-production-v1/` | Seis runs completos, audit y comparación Florianópolis |

`components-v1` verifica conservación histórica y corrección logo/flecha; no usa todo el pipeline de
copy nuevo. Las seis corridas `components-production-v1` sí ejercitan composición modular actual.
No mezclar esas dos evidencias ni presentar la importación propia como referencia independiente.

## Cómo actualizar y retomar sin perder contexto

1. Leer este corte, status Workbench y brief de la unidad. Revisar HEAD/status y evidencia original.
2. Resolver la operación con las referencias de la skill; abrir los dueños canónicos actuales.
3. Avanzar dentro del alcance humano. No cerrar pendientes por deducción ni reejecutar llamadas pagadas.
4. Documentar resultado donde se lee: decisión/contrato en Workbench, evaluación de pieza/run,
   auditoría de hashes cuando proceda, status y siguiente acción. Conservar estados de release separados.
5. Actualizar referencias temáticas de esta skill si cambió el método. Actualizar corte con fecha y
   fuentes cuando cambió estado. Mantener historia de rechazo en evaluación/lessons, no borrar v1.
6. Espejar bundle `.codex` y `.claude` completo, comparar rutas/bytes, validar frontmatter y links.
   No añadir scripts al motor Greenhouse para guardar documentación ni exportar secretos/assets.

Antes del cierre global: garantizar fuentes/admisiones de cada variante, composición/contraste,
controles Figma reales, autoridad de cada persona, costo/recovery, distribución, referencia live,
archivos durables y handoff. Lo no verificado permanece pendiente con siguiente paso concreto.

## Design System Lab / bibliotecas y zonas — 2026-09-30

Source `d025c5a603df021c8d50975cfb355fa719d6f09b` en `codex/brand-isolated-harness`, pusheado con GitHub gates, native-harness y lab-checks en success. Snapshot `9a5193568e3530ad7657f52c6b5b00148b591cfa4973161ec3ebdfee09466460`, 313 archivos. Se verificaron 152 recursos originales y cuatro archivos de metadata SKY sin cambios. Preview protegido [dpl_GtLQ8sy429MS3wNPbVESqrRRtBDh](https://creative-workbench-ij8r3fi3h-efeonce-7670142f.vercel.app), proyecto `creative-workbench-sky`, scope `efeonce-7670142f`, estado READY y target preview. Los 31 archivos comprobados en el servidor coinciden por SHA; ocho accesos anónimos devuelven 302. No hubo promoción estable ni nueva publicación de Packages.

El host usa Bricolage/Poppins de Efeonce y una proyección sellada de AXIS. El build sólo incluye cinco WOFF2 OFL, con licencia; Metric permanece fuera de la distribución. CTA compacto de 48 px, header sin caption, galerías masonry, portada con accesos a `/tokens/`, `/tipografia/` y `/recursos/`, inspector con campos propios y footer `Design System Lab` + `Efeonce Group SpA`.

Tokens tiene búsqueda, filtro por colección, copia y paginación de 24; sin JavaScript conserva los 108 valores. Tipografía muestra cinco SVG Metric. Recursos reúne siete vectores y 21 familias relacionadas con 37 composiciones y 126 adaptaciones. Un módulo incluido en una composición no certifica su presencia en cada variante.

Verificación: 187 pruebas locales sin skips (169 harness, siete SKY y once Lab), TypeScript 7 y Astro con 34 archivos sin errores. Las tres bibliotecas mantienen 390 px sin overflow. Se ejercitó copia real, filtro combinado con once resultados, Ver más con 48, footer-legal ausente en `node-2026-2885` sin herencia, links históricos y navegación activa tras resize y carga de fuentes. Arte y recursos privados permanecen separados del host.

Evidencia privada: `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-30/efeonce-lab-host/reviews/9a5193568e3530ad7657f52c6b5b00148b591cfa4973161ec3ebdfee09466460`. Consultar el manual de Workbench y las decisiones `workbench-lab-efeonce-host.md` / `workbench-lab-navigation.md`. La skill se actualizó localmente en ambos espejos de Greenhouse; no se ejecutaron ni modificaron sus CLIs y ese repo no se pusheó. El Preview no certifica fidelidad Figma global ni aprueba una campaña.

## Revisión PR y primeras correcciones — 2026-09-30

La revisión de 16 puntos y los límites pendientes se conservan en [review-remediation.md](review-remediation.md).
Se retiran dos consumidores directos, se refuerza el guard, se preserva UUID/receipt tras fallos
posreserva y se derivan objetos de deployment desde admission. Legal valida enum/presencia.
199 tests locales pasan sin skips; pack de 193 recursos/catálogo 2.0.0 siguen intactos. No despliegue
del broker/IAM/habilitación/Packages/merge. Gobierno sellado, identidad mínima+binding, gasto
por período y travel-window permanecen abiertos. Ver HARNESS_STATUS de Workbench y auditoría
review-remediation para source/CI actual; esta skill no certifica su runtime.

Readback de source `001164e`: push confirmado, gates 36721466624 y native-harness 36721466361
SUCCESS; CI público: 183 pass / 16 skips / 0 fail, separado de 199 locales / 0 skips. El operador autorizó
merge sólo cuando sea seguro; identidad, presupuesto, gobierno sellado y revisión semántica
activa continúan abiertos. No se fusiona por el estado CLEAN de GitHub.

Preparación semántica SKY: candidato 2.1.0 / 20 zonas / 22 familias requeridas, 193 recursos; sólo
catálogo cambia (SHA 80baf3a5),pack candidato d1eeeb7f. 20 campos, 17 bindings divididos, 3 sólo
ventana; 126 templates intactos. Admisión activa sigue 2.0.0 / 19 zonas / 21 familias. El preparador
real revalidó maintainer y recursos; no admitió ni produjo. Contrato CI declara 18 skips
licenciados y rechaza omisiones nuevas. Consultar unidad fechada Workbench para tests/head/CI.

Source `387a441` pusheado y validado: gates 36723761793 / native-harness 36723761886 SUCCESS;
CI: 193 pass / 18 skips / 0 fail (harness 177/16, SKY 5/2, Lab 11/0), con allowlist exigido. Locales
211 pass / 0 skips (193 harness, 7 SKY, 11 Lab conservados). Los cuatro bloqueos de merge siguen
abiertos; no activación, provider, IAM, broker, Packages ni snapshot Lab nuevos.


## Comparación completa y corrección modular — verificada 2026-09-30

Los 126 exports REST independientes están disponibles y sellados. Se compararon todas
las piezas por nodo y se localizaron causas compartidas de logos, flechas, círculos,
máscaras, premios, iconos y tipografía. Ver [components.md](components.md) para método
portable y `docs/architecture/workbench-sky-reference-comparison.md` en Workbench
para controles, findings y cierre verificado. Fuente REST 2404786957900889048,
SHA JSON 288435cb5b29b687c2e242dbaa1cee9e1ada820703a1d2ddba060a214ba1288f.

No ejecutar CLIs Greenhouse para reproducir esto. No re-sellar pack/catálogo ni cambiar
PNGs/QA/outcomes de UUID anteriores. La auditoría actual se genera en el canon privado,
sin IA ni acceso productivo; las decisiones CTA Metric se distinguen de diferencias
Figma. Verificación: 126 renders, 126 nodos revisados técnicamente, cero defectos detectados
pendientes, 305 tests locales sin SKIP. Modo público: 273 PASS y 21 SKIP licenciados
exactos. Lab local 308 archivos/126 proyecciones, digest
f61406d21a5accc9cd729316eb5868ced422dbb9dd99af4ebc25ddc322a82136; conserva
las cuatro muestras de producción antiguas como corridas originales. Audit
3d77325e5f1fcf4df30046dd0c3dfc7856834354fd3d3689406798c6a930d242 y review
a81b8a2a81f4814bccbb170f9b00de5513e2df63917f76bd643258a5123a45a7, privados
en `comparison-final-02` del canon SKY. Registro completo en HARNESS_STATUS; un
cambio local no implica push, merge, Packages o publicación en creative.efeonce.org.
