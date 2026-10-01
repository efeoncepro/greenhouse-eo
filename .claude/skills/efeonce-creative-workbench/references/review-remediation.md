# Revisión de gobierno, identidad y recuperación — 2026-09-30

## Cómo usar esta revisión en el corte integrado — 2026-10-01

Registro histórico de remediación, no lista automática de bloqueos vigentes. La secuencia de
integración cerró gobierno/transición, guard, reserva previa/carrera/policy y CI exacta; el
main actual incluye PR14 comparación Figma, PR15 componentes/identidad Git y PR16 premium Lab.
Ver [continuidad](state-continuity.md) y canon actual Workbench antes de aplicar otro parche.

Siguen abiertos en su carril: identidad definitiva Efeonce ID (TASK-1952), onboarding real,
admisión/cotizaciones/despliegue monetario, retención/recuperación donde falta evidencia y
revisión semántica candidata travel-window 2.1.1. No ejecutar otra transición total ni tocar
CLIs Greenhouse para replicar el orden ya cerrado del PR244. No restaurar 2.1.0 ni OAuth propio.
CI pública actual exige 30 SKIP exactos (28 harness + 2 SKY), 56 + 2 archivos y 348 + 7 tests;
Lab 17 PASS. Los 18 SKIP y bloqueos del PR3 de abajo pertenecen al momento de su revisión.

## Histórico: candidata posterior de identidad, aún sin PR en aquel corte

Código preparado sobre main 96eab1e: minter/Secret Manager, Google bound identity, puente,
HTTP/server/kernel/history/bundle y transporte CLI sin token GitHub remoto. Pins App admitidos
por owner, vínculo del operador aprobado y policy privada preparada hasta 2026-12-29;
registro/instalación App por el operador ya confirmados y API GitHub de instalación verificada;
sin token/readback efectivo, binding consumido por runtime, endpoint live o rollout por esta unidad. No describir el minter
como inexistente; no afirmar la App operativa por tests. [architecture.md](architecture.md) y
[operations-distribution.md](operations-distribution.md) enrutan el canon Workbench sin duplicarlo.

Cada proof workspace verifica canon vivo antes/después del await y reresuelve pack/version/recursos;
policy SHA inicial e identidad deben permanecer iguales. Google captura reloj/observaciones
privados y denegación invalida proof definitivamente. Reauth de presupuesto→ticket→UUID→adapter
real tras secreto/body→durable complete/delivery conserva pagos y recovery ante revocación.
Se corrigió doble consumo del ticket: sólo el adapter llama una vez al callback server-owned,
con assertBeforeProvider durable → await reauth → assertAtProvider síncrono de objeto verificado.
Callback ausente/denegado/repetido falla cerrado. [budget.md](budget.md).

Inventario candidato 294 harness/44 archivos (+53 sobre 241: puente 8, Google 13, minter 15,
transporte 6, kernel 9, provider 1, budget 1), SKY siete/dos sin cambios. Focal final 73 PASS;
readback local privado 294 harness + 7 SKY PASS, cero SKIP; público 278 harness + 5 SKY PASS,
exactamente 16+2 SKIP licenciados y cero fallos. Total privado 301 PASS, público 283 PASS/18 SKIP.
Cuatro TAP finales en [state-continuity.md](state-continuity.md); no CI ni admisión del runtime.
Runtime identity 404, IA false y sin PR creado aún.
Preparar PR draft, admitir backend/endpoint y comprobarlo con IA OFF antes del merge CLI;
App registrada/instalada con API verificada; secreto propio/una versión/SA exacta reportados
por operador. Primer token bloqueado por grant de impersonación SA ausente, sin ampliar IAM.
Vínculo del operador aprobado/preparado; token/scopes, consumer/runtime, vínculos del resto del
equipo y cotizaciones siguen pendientes separados;
IDs y límites en [state-continuity.md](state-continuity.md).

## Histórico: follow-up de producción integrado

La secuencia de merges 244→3→4→5 y main 4f868c6a con CI verde están acreditados en
[state-continuity.md](state-continuity.md). Los cortes históricos de abajo conservan sus estados
draft, once drifts y bloqueos de aquel momento; no son instrucciones para restaurar el sync viejo.

El [PR 6](https://github.com/efeoncepro/creative-workbench/pull/6), head
`409c113e4429a7f8a5ab765b1e5658e03935970c`, reúne 23 paths del follow-up. CI del head:
gates `36741156355`, native-harness/Lab `36741156458` y Vercel SUCCESS. Fusionado por squash
el `2026-09-30T16:03:53Z`, main `96eab1eff46f77e6cd6f242fc243957bbdbee1c1`, con árbol idéntico
al head. CI postmerge gates `36741454085`, native-harness/Lab `36741454046` y Vercel SUCCESS.
Unidad cerrada en Git/main/CI; no acredita App/binding integrados, cotizaciones o habilitación IA.

- `compileBrandImagePrompt` valida el cuerpo completo de **32.000 unidades UTF-16** antes de
  presupuesto/reserva UUID; el adapter reutiliza los mismos bytes y revisa el límite antes de
  secreto/fetch. Exceso no produce pago ni reserva remota. Prompt audit fija longitud y SHA.
- Request ID/usage de OpenAI se sanearon como metadata opcional de outcome/ZIP. Ausente o
  inválida es **null**; consumo cero sólo si fue reportado. Esa auditoría no es una cotización
  previa, techo monetario, factura ni permiso de generación.
- Lector de App mínimo preparado, con policy draft, un repo y members/metadata read. Captura
  identidad antes de esperar y copia credencial/permisos; admite formatos opacos actuales sin
  confiar en claims decodificados. No existe minting/binding/wiring live por estas pruebas;
  el transporte vigente permanece deuda y no se considera sustituido.
- Contrato común SKY **2.1.1/v2** corrige el orden divergente de preparador/importador: conserva
  las 19 definiciones históricas y añade travel al final, sin cambiar geometría/copy. Pack 0.1.0/
  catálogo 2.0.0 siguen activos; candidata, admisión y distribución son pasos distintos.

Verificación local integrada: privado **248 PASS, cero SKIP** (241 harness/40 archivos + siete
SKY/dos archivos); público 230 PASS/18 SKIP exactos (16+2), cero fallos; cuatro gates PASS.
Logs/SHA en `docs/audits/workbench-production-readiness-2026-09-30.json` de Workbench y canon
privado `operations/workbench-production-readiness-2026-09-30/`. Son pruebas con fixtures y
canon local, no App registrada, cotizaciones admitidas, canary nuevo ni aprobación de campaña.
IA **OFF**, CLIs Greenhouse intactas. Readback del operador: broker `00008-tv6` Ready/100%,
generation false; despliegue externo paralelo, no atribuible a este PR ni prueba de imagen con
estos módulos. [architecture.md](architecture.md) detalla contratos;
[state-continuity.md](state-continuity.md) es dueño del estado de merge y runtime.

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


La revisión de Claude del PR 3 (comentario 5911024777, corte 7c4024d) tiene siete bloqueos y nueve
observaciones adicionales. Se verificaron contra fd9b78d; el PR tenía 52 commits/384 archivos y
seguía draft. Su texto es evidencia y propuesta, no permiso para operar Greenhouse, leer secretos,
ejecutar sync, publicar o fusionar. Canon de la unidad: Workbench
`docs/architecture/workbench-review-remediation.md` y `docs/audits/workbench-review-remediation-2026-09-30.json`.

## Correcciones en código; verificar despliegue aparte

- Retirados los dos consumidores directos nativos sin callers. Doctor oficial sigue el consumer
  privado del broker. Regresión de fuentes productivas nativas fuera del broker; no altera engines
  históricos ni convierte un escaneo estático en sandbox.
- Hook rechaza destinos main/refs/heads/main, refspecs múltiples/+, borrados, comodines que incluyan
  main, --all y --mirror. Pruebas pasan texto al hook sin ejecutar los pushes. Rama normal va por PR.
- Tras adquirir reserva, una excepción devuelve pending-or-uncertain, UUID original y retryAllowed
  false (HTTP409). failure.json es aditivo y best effort, no reemplaza receipt ni habilita otro pago.
  Una respuesta perdida de complete puede reconciliarse consultando el recibo terminado.
- Consumer conserva UUID y explica --receipt también ante red/HTTP/recibo inválido. Nunca crear otra
  intención como retry pagado. No afirmar que no se cobró: providerInvocations permanece unknown.
- deployment-plan.mjs deriva objetos exactos de admission.json y mantiene generación OFF. --write
  escribe sólo el JSON propio local. No aplica IAM ni modifica cloud. Revisiones de pack deben
  regenerar y probar coherencia antes de desplegar.
- legalPlacement tiene enum por versión y coherencia con footer-legal. Diseño conserva metadata
  original, sin default. Se corrigió un fixture sintético que omitía el dato, con regresión de
  plan/render. Los 126 compositores históricos mantienen sus hashes y el pack activo no cambia.

## Histórico: lo que permanecía abierto en la primera revisión

1. Ownership/gates: sync.lock histórico tiene 838 archivos y no native. La lista local exime sus
   propios gates; el inventario native-ownership no acredita autoridad. El §8 está en una rama
   propuesta upstream, no se trata como canon integrado. Resolver transición sellada manteniendo
   el harness nativo y las mejoras OFL/hygiene; no falsear hashes ni ejecutar CLIs del operador.
2. Credencial: el transporte aún envía gh auth token completo en memoria; su alcance concreto no
   se leyó. Google/GitHub son controles separados, sin binding aplicativo. Preparar credencial
   mínima propia y vínculo verificable; read:org solo no certifica acceso al repo privado.
3. Presupuesto: implementación local de límite durable/atómico GitHub ID/mes y slots entre marcas.
   Límite aprobado50USD/integrante/mes; policy draft, faltan techos/reserva admitidos y despliegue/readback.
   [budget.md](budget.md) conserva contrato, recuperación y límites.
4. Ventana de viaje: el catálogo operativo conserva 20 campos mal clasificados. La preparación
   trial ya existe y el importador futuro distingue meses: travel-window 2.1.0, no fallback
   other-copy. El preparador verifica maintainer antes/después, 193 recursos y 20 paths exactos;
   devuelve bytes/plan en memoria y no activa nada. Se verificó una preparación real, archivada
   con ID sky-travel-window-v1-prepared-2026-09-30. Divide 17 bindings mixtos y 3 sólo fechas. Los 126
   templates permanecen iguales; sólo sky-adaptation-catalog necesita nuevos bytes. Revisión
   cambia catálogo/registry/pack/bundle/pins y añade zona/familia (20 zonas/22 familias), conservando
   recursos visuales, fuentes y predecessors. No usar activador de fuentes ni rehash automático.
5. Recovery: activación/descarga/caché pueden dejar locks huérfanos por muerte abrupta; los rollback
   de excepciones no prueban recuperación ante SIGKILL. Se necesita journal durable y recovery.
6. Completar inventario cloud y sesiones de cada persona, privacidad/portabilidad de evidencia,
   clasificación de pruebas técnicas y atribución de agentes sin reescribir historial.

## Evidencia proporcional

Esta unidad pasa 199 tests locales sin skips (181 harness, siete SKY y once Lab). El primer pase
integrado encontró seis fallos del fixture legal; tras corregir la metadata, todos pasan. No se
relajó la validación productiva. La CI anterior fd9b78d tenía 171 pass/16 skips/0fail, porque omite
el canon licenciado. Una prueba local y una pública son carriles distintos; conservar sus heads,
logs, hashes y número de omisiones. Source 001164e quedó pusheado: gates 36721466624 y
native-harness 36721466361 SUCCESS, con 183 pass/16 skips/0fail (harness167/14, SKY5/2,
Lab11/0). Esto no habilita merge: continúan los cuatro bloqueos declarados.

Mantener estado de implementación, commit/push/CI, broker desplegado, habilitación, IAM, Packages,
Lab y main separados. El Preview del Lab conserva el snapshot anterior; estos cambios de broker
no prueban actualización del runtime. No cerrar el harness ni la fidelity Figma global por esta unidad.

La cobertura pública tiene contrato explícito en `test/public-ci-policy.json` y runner TAP.
18 casos licenciados pueden omitirse (16 harness/dos SKY), pero deben aparecer. Unknown skip,
TODO, ausencia, duplicado, cancelación o resumen incompleto falla; los mismos casos pasan
localmente con el canon. No actualizar automáticamente el allowlist desde un log. Canon:
`docs/architecture/workbench-public-ci-coverage.md` y `workbench-sky-semantic-revision.md`.

Source `387a441` pusheado y validado: gates 36723761793 / native-harness 36723761886 SUCCESS;
CI: 193 pass / 18 skips / 0 fail (harness 177/16, SKY 5/2, Lab 11/0), con allowlist exigido. Locales
211 pass / 0 skips (193 harness, 7 SKY, 11 Lab conservados). Los cuatro bloqueos de merge siguen
abiertos; no activación, provider, IAM, broker, Packages ni snapshot Lab nuevos.

## Segunda revisión: presupuesto y cobertura v2

Comentario5912619209 contrastado con289a12e. Main observado protected:false; hooks/wrappers
no hacen cumplir CODEOWNERS en el servidor. Vías históricas, imports/credenciales directos y
ownership sellado siguen pendientes. Preparador/importador SKY tienen orden semántico distinto
bajo2.1.0: corregir/versionar antes de admitir. No merge por CI verde.

Nueva unidad local:222 privados pasan (215harness/7SKY), pública aislada204pass/18SKIP,
focales43 y gates verdes. PolicyCIv2 exige16+2SKIP públicos y cero privados, inventario39/2
archivos y total215/7, con parser del bloque final. El budget tiene reserva durable y recheck
antes del provider; política draft con50USD/persona/mes aprobados y ningún provider/deploy nuevos. Canon y evidencia en Workbench
workbench-broker-budget.md y workbench-budget-ci-2026-09-30.json. Commit/push/CI del avance
se registran al verificarse; no confundir esta validación local con runtime desplegado.
