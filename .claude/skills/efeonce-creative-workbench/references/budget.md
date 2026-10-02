# Presupuesto del broker — continuidad 2026-09-30

## Corte nuevo: port monetario independiente mergeado en PR 10 — 2026-09-30

[Workbench PR 10](https://github.com/efeoncepro/creative-workbench/pull/10), head
`4d3cd8cfd1933f53f87112143d2adf9a2abd7749`, parte de main `609d876feeef46b5785171d321fb4898ad9973cf`.
Merge verificado `8b6bfe926ccd22cde4f700bb85d24d0ed2b69fef` (19:50:57 UTC); gates, native-harness,
lab-checks y Vercel SUCCESS en ese main. Se porta sólo el guard final de pago, sin
minter/binding/headers/sesión Google del candidato PR 7.
La integración Efeonce ID se difirió expresamente y tiene TASK-1952 en Greenhouse.

Contrato implementado en esta rama: secreto/body → callback server-owned exactamente una vez →
ledger durable → GitHub vivo y policy/pack del canon → ticket exacto consumido síncronamente → POST.
Se preserva el transporte vigente; no se lo certifica como autenticación definitiva. Un guard
omitido/denegado/repetido/concurrente invalida outputs, incluso si se captura la denegación.
El marcador de repetición es irreversible, también si la primera llamada termina después.

Focal final 62 PASS. Privado 257 harness + 7 SKY PASS/0 SKIP; público 241 + 5 PASS, exactamente
16 + 2 SKIP licenciados. Revisión independiente sin fallo de implementación; se corrigió el test
para separar vencimiento de cotización dentro del mismo mes de rollover y contar invocaciones
reales del adapter en replay. Cuatro gates verdes. Fixtures no leen secretos reales ni pagan.

Readback Cloud Run en este corte: 00008-tv6, 100% tráfico, WORKBENCH_GENERATION_ENABLED=false;
00010-cof, tag bound-identity y 0%. Guard nuevo no desplegado; policy draft, quotes vacías y
reserva cero. Techos demostrados/admisión, deploy y canary monetario siguen pendientes.
La secuencia detallada inferior incluye capacidades de la candidata PR 7; su reauth antes de
entrega no se porta en PR 10 ni debe darse por desplegada. Revalidar PR/CI/runtime antes de operar.


Canon: `creative-workbench/docs/architecture/workbench-broker-budget.md`; implementación
`services/production-broker/budget.mjs`, esquema policy v2. El operador aprobó **50 USD por
integrante y 500 USD para toda la organización por mes UTC**, compartidos entre todas las marcas.
También pidió poder aumentarlos por decisión suya. El código está en revisión local: policy
incluida draft, reserva cero y sin cotizaciones. No habilitó IA ni desplegó broker o IAM.

## Identidad, costos y autoridad

La persona es el GitHub ID verificado, no responsable del brief, email de Google ni un ID del job.
El código del vínculo aplicativo Google/GitHub y credencial App mínima está preparado;
pins App admitidos por owner y vínculo del operador aprobado/preparado en policy privada
0600 hasta 2026-12-29, sin runtime verificado. App registrada/instalada por operador y API de
instalación verificada; secreto propio con una versión y SA exacta reportados. Primer token
pendiente por grant de impersonación SA ausente, sin ampliar IAM; runtime pendiente. Ver [state-continuity.md](state-continuity.md). Policy server-owned,
clonada al construir consumer, jamás desde job/env/resource. Montos enteros de microdólares USD.
La reserva uniforme debe cubrir un techo conservador demostrado de TODOS los inputs y output
exactos. La cotización sella marca/cliente/versión/operación/pack/recursos y settings, con vencimiento
UTC y referencia de evidencia; esa referencia no demuestra por sí sola un costo. Tests sintéticos
no son precios. El límite aprobado tampoco autoriza un canary pagado por inferencia.

## Ampliaciones del operador

`increases` usa `decisionId` estable/único, `period: AAAA-MM`, `target` (GitHub ID, `team` o
`organization`) y `limitMicros` como nuevo TECHO TOTAL, nunca monto a sumar. El límite personal
es máximo(base, equipo, persona); el global es máximo(base organización, decisiones organization).
Subir a una persona/equipo no eleva automáticamente los 500 USD globales. Decisiones iguales no se
suman ni multiplican capacidad; cambiar un ID ya persistido falla cerrado. Bases/unidad de reserva
quedan fijas durante un mes iniciado; ampliarlo requiere decisión explícita, sin borrar consumo.
Otro período permite nueva base; decisiones por mes no se arrastran automáticamente.

La policy vive en la imagen del servidor y cambia por el carril de mantenimiento autorizado.
No hay endpoint de autoservicio para productores. Esta frontera lógica no prueba que sólo el
operador pueda cambiar código/cloud: proteger ramas/accesos y certificar rollout todavía faltan.
Retirar una decisión restringe nuevas llamadas en la imagen actual y conserva historial; una
imagen antigua conserva su copia. No prometer revocación live sin readback de revisión/traffic.

## Reserva conjunta y recuperación

Un objeto fijo en el bucket Workbench: `broker/v2/budget/<AAAA-MM>/organization.json`.
Contiene bases, decisiones y asignaciones inmutables por contrato de todas las personas/marcas.
CAS actualiza el objeto completo con la generación observada,0 para primera escritura. Acota a
10 000 asignaciones, 100 decisiones y 8 MB. No hay debitos separados persona/organización ni barrido
lineal GCS por slot; sólo lectura/CAS/readback y lectura anterior al provider. Bajo carrera, hasta
16 conflictos explícitos; una respuesta perdida NO permite otro write especulativo: reconciliar
sólo la asignación propia exacta y decisiones persistidas, o fallar cerrado.

1. Validar request/canon/autoridad; validate no escribe ledger.
2. UUID con reserva original: historia y reautenticación tras storage, sin otro pago.
3. UUID nuevo: interruptor, cotización y CAS que comprueba ambos límites juntos.
4. Readback durable, luego reserva primaria UUID. Duplicado consulta historia.
5. El kernel no consume ticket antes del adapter. OpenAI llama exactamente una vez al callback
   server-owned tras secreto/body: assertBeforeProvider consume ticket inicial y relee ledger,
   decisiones/límites; conserva ese objeto exacto en WeakSet privado de verificados. Después
   del await de reauth, assertAtProvider consume esa verificación y comprueba sin await
   dueño/hash, mes UTC y cotización vigente. Clones, expiración durante auth o uso repetido
   rechazan; guard ausente/denegado/repetido invalida salida aunque el adapter atrape su error.
6. Un fetch autorizado, archive/complete durable y reauth antes de delivery. Revocación tras
   complete niega entrega y conserva UUID/receipt/ZIP; recovery no reserva ni paga otra vez.

Agotamiento o rechazo monetario previo a reserva UUID: HTTP422, `rejected-before-provider`,
`providerInvocations:0` PARA ESE INTENTO, `retryAllowed:false`. No quema UUID. Después de una
ampliación autorizada se puede ejecutar explícitamente esa misma intención, sin retry automático.
Tras reserva primaria, incertidumbre409 conserva UUID y capacidad. Una reserva monetaria perdida
puede ocupar cupo sin pago, por prudencia; nunca devolverlo de forma especulativa. Recibo/archive
siguen con generación OFF o presupuesto retirado, owner/hash/autoridad, sin volver a reservar.
Otro mes expira ticket sin trasladar consumo. El período mide admisión, no fecha de factura.

## Storage, IAM y QA

Store archivos: lock exclusivo/CAS por hash/reemplazo atómico para integración, no Cloud Run.
Lock residual falla cerrado. Store GCS usa origen/bucket/objeto fijados, lecturas con generación
observada, CAS y límites de tamaño; tests simulados no prueban IAM. Plan prepara objectUser sólo bajo
broker/v2/budget; esa cuenta puede reemplazar/borrar ledger, por lo que contrato inmutable no
es protección física ante cuenta comprometida. Certificar acceso exclusivo, auditoría/versionado
y retención antes de producción. El namespace UUID original sigue creator/viewer broker/v1.
No aplicar permisos ni declarar deploy por tener un plan JSON. v1 budget nunca se desplegó;
no migrar saldos antiguos por inferencia si en otro entorno sí existe un ledger operativo.

Tests: agotamiento y carreras persona/global, brands/UUID/restart, replay/hash/owner, aumentos
persona/equipo/global con max, policy base/unidad congeladas, cotización vencida, corrupción,
ACK perdido, GCS con 999 asignaciones previas, ticket uso único y HTTP/CLI rechazo con cero invocaciones. Contexts
Docker/CloudBuild incluyen budget-policy.json. Evidencia de suite completa en auditoríaWB vigente;
Baseline verificado 96eab1e: 241 casos/40 archivos harness y siete/dos SKY. Candidata actual:
294/44 harness y siete/dos SKY; público exige 16+2 SKIP licenciados y privado ninguno. Focal
final 73 PASS, incluyendo kernel + OpenAI + budget con un fetch/un guard/una lectura de secreto
y recovery sin extra calls. Fixtures no pagan OpenAI. Readback local integrado final: privado
294 harness + 7 SKY PASS, cero SKIP; público 278 harness + 5 SKY PASS y exactamente 16+2 SKIP,
cero fallos. Totales 301 PASS privados y 283 PASS/18 SKIP públicos, cuatro TAP en
[state-continuity.md](state-continuity.md). No CI, PR, admisión o despliegue de la candidata:
runtime identity 404 e IA false.
Pendiente operativo: techos reales, reserva/cotizaciones admitidas, credencial mínima/vínculo, despliegue,
IAM/ledger con readback, journal de outputs, onboarding y canary autorizado. Main observado sin
protección; guard no es sandbox. No cerrar objetivo global por esta unidad.
