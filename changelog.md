# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-08-14 — Las keywords descubiertas ahora saben llegar a los motores de IA (TASK-1666)

El mismo día que el discovery quedó operativo, se cerró el puente que faltaba hacia el otro
internet de búsqueda: un operador selecciona hasta 20 candidatos de una corrida y pide un
**borrador de grounded queries** para el grader AEO. La regla central es semántica: una keyword
de Google no es una pregunta a ChatGPT — el sistema la usa como **tema de investigación** (dato
delimitado, inmune a prompt injection) y redacta preguntas naturales con la identidad de marca ya
autorizada del perfil. La prueba real lo mostró: de "recubrimiento epóxico" salió "qué tipos de
recubrimientos existen para madera", no una copia; y ninguna pregunta de descubrimiento nombra la
marca (la medición a ciegas sigue siendo a ciegas).

La honestidad quedó cableada, no prometida: el modo `grounded_llm` sólo existe cuando la autoría
usó de verdad el contexto (cerebro versionado aparte; el authoring sin contexto quedó byte a byte
idéntico y probado); sin autoría disponible el borrador sale del baseline **y lo dice** con un
aviso obligatorio. La trazabilidad viaja como referencias opacas (corrida, candidatos y hash
verificable del contexto exacto) — jamás la keyword en logs. Y el puente sólo crea borradores:
aprobar y activar sigue siendo el flujo AEO con revisión humana, sin atajos.

Verificado contra el mundo real: 16/16 checks contra PG incluyendo una autoría LLM real de 15
preguntas evaluadas a mano, idempotencia que devuelve el mismo borrador sin segundo gasto, y el
active previo intacto. Con esto TASK-1665 (el workbench visual) quedó sin bloqueos.

## 2026-08-14 — Descubrir keywords deja de ser un viaje a otra herramienta (TASK-1664)

El módulo SEO contestaba qué empujar de lo que ya aparece en Search Console; no contestaba cómo
pasar de una hipótesis a un conjunto priorizado de términos. Hoy existe el primitive completo de
**keyword discovery**: una corrida recibe hasta 10 seeds (manuales, de las consultas GSC, del set
monitoreado o del dominio propio), las expande con DataForSEO Labs, deduplica y deja **candidatos**
con procedencia trazable — y con volumen, intención y barrera de enlaces compuestos desde el store
de mercado de TASK-1661, porque el `keyword_info` que viene inline y pagado en cada respuesta se
persiste ahí mediante un writer canónico nuevo (`persistKeywordMarketData`) en vez de tirarse.
`keyword_overview` quedó como top-up sólo del faltante: en el smoke real, el enriquecimiento costó
**cero llamadas** porque el inline ya había dejado todo fresco.

Las tres fronteras que la spec exigía quedaron en el código, no en la disciplina: el **costo se ve
antes de gastar** (preview con fórmula, gate de entitlement y fence cada 10 llamadas); **descubrir
no es seguir** (ninguna pieza escribe el set monitoreado; las decisiones son un log append-only y
la promoción usa el command de tracking existente); y **repetir la pregunta no paga dos veces**
(idempotencia por intent completo — el smoke lo midió: segunda corrida USD 0). Paridad completa en
el mismo cambio: route admin, lane ecosystem (write sólo bindings internos), tools MCP con preview
y confirmación humana obligatoria, y dos señales de confiabilidad nuevas.

Verificado contra el mundo real, no contra mocks: sanity de 27 checks contra PG y una corrida live
de Berel MX que costó **USD 0.0132** (estimado conservador 0.0612) y dejó 10 candidatos. Queda
apagado por diseño: flag OFF en ambos runtimes y scheduler pausado hasta el sign-off de rollout.

## 2026-08-13 — Berel se mide donde vive su mercado, y el país deja de elegirse en silencio

Una pregunta del operador sobre un dato dudoso destapó dos problemas reales, y los dos quedaron
resueltos el mismo día.

**El primero era de datos.** El seguimiento SEO de Berel llevaba un año midiendo Chile — y Berel es
una marca mexicana. Su propio nombre tiene 1.650 veces más búsquedas en México que en Chile, y nada
en el dashboard lo delataba porque la serie se veía poblada y sana. La corrección respetó la regla
de oro del histórico: no se reescribió nada. Se creó un target nuevo para México, el de Chile quedó
pausado con su serie íntegra, y las 31 keywords se re-trackearon por el command canónico. La
verificación con capturas reales contó el final de la historia: **Berel es #1 en México en sus
términos de marca** — la marca siempre fue real; el país era el equivocado.

**El segundo era de arquitectura, y era más profundo.** El módulo asumía que una organización tiene
UN mercado, y esa suposición vivía escondida en un `LIMIT 1` copiado en cuatro lugares: con dos
países activos, cada pantalla servía el más nuevo sin error, sin señal y sin decir cuál. Efeonce
misma —que opera en Chile, México, Colombia y Perú— es el caso que ese código no sabía describir.
Ahora la resolución vive en un solo lugar y dice la verdad: un mercado resuelve solo, varios exigen
elegir (con la lista de opciones en la respuesta), y toda lectura declara qué país está sirviendo.
Las posiciones de países distintos jamás se promedian: son experimentos distintos.

## 2026-08-13 — El módulo SEO deja de leer "volumen: sin dato", y un smoke real destapa una fuga de costo

Durante meses la tabla de oportunidades mostraba las columnas de volumen y dificultad vacías, y eso
se leía como "falta integrar DataForSEO". Era falso: la cañería estaba desde hace tiempo; lo que
faltaba eran las columnas donde guardar el agua. Ahora existen, y `market` deja de estar cableado a
"no disponible".

La decisión de fondo no fue traer el dato sino **dónde vive**. El volumen de una keyword es un hecho
de la keyword, el país y la fecha — no de si nosotros la seguimos ni de quién la descubrió: "pintura
industrial" tiene el mismo volumen en Chile para todos los clientes de la cartera. Por eso la tabla
no cuelga de un target ni del set monitoreado, y nace **multi-productor**: la captura de hoy la llena
desde un endpoint, y el descubrimiento de keywords y el análisis de competencia que vienen después
escribirán en la MISMA tabla el dato que ya viene incluido y pagado en sus propias respuestas.
Guardarlo dos veces habría garantizado que dos pantallas mostraran cifras distintas para lo mismo
dentro del mismo mes.

La captura corre **una vez al mes**, porque el proveedor refresca una vez al mes: un cron diario
pagaría treinta veces por el mismo número. Y nace con dos frenos independientes —el cron pausado y
el flag apagado— porque a diferencia del resto del módulo, esta corrida le paga al proveedor por cada
fila.

**Lo que enseñó correrlo de verdad.** El smoke con dinero real (USD 0.05 en total) destapó un defecto
que ningún test con mocks podía ver: una keyword que el proveedor **no tiene** no escribía fila, y
como el chequeo previo mira filas, esas keywords nunca quedaban "ya consultadas" y se volvían a
comprar en cada corrida, para siempre. El modelo correcto son tres estados y no dos —nunca
preguntamos, preguntamos y no hay, demanda cero real— y con eso la segunda corrida pasó a costar
exactamente cero. Quedó también una observación honesta sin resolver: el proveedor devuelve
dificultad 0 para cabeceras de alto volumen, y esa columna no se le muestra a un cliente hasta
contrastarla con otra fuente.

## 2026-08-13 — La credencial de partner entra al deck sin duplicar la contraportada

El badge de HubSpot Solutions Partner apuntaba a una carpeta fuera del catálogo, y eso rompía la
regla que mantiene los decks reproducibles: un catálogo tiene que renderizar igual en cualquier
máquina, y una referencia que se sale funciona en el repo del autor y falla en el worker. El badge se
mudó adentro del catálogo y ahora se pide por una clave cerrada, el mismo trato que los logos de
cliente: una acreditación que no se tiene no se puede presentar por accidente.

No hizo falta una contraportada nueva. La misma lámina ya sirve las dos versiones —con y sin
credencial— porque el motor borra el elemento cuando el plan no lo declara; una segunda plantilla
casi idéntica solo habría garantizado que las dos se separaran con el tiempo.

Los aprendizajes quedaron escritos donde se van a leer: el runbook del gate visual explica por qué
declarar un slot nuevo siempre mueve la imagen de referencia de esa lámina, y cómo distinguir un
drift propio de un baseline viejo; el estándar premium de UI incorpora que un scorecard es una foto
con fecha (uno vencido bloqueó cuatro días un trabajo ya terminado) y que ningún gate lee lo que la
pantalla dice; y la skill de captura registra que una superficie gateada por organización exige la
persona de esa organización, con la consulta que la encuentra.

## 2026-08-12 — El portal SEO del cliente quedó cerrado, y su propio scorecard estaba equivocado

`TASK-1310` cierra la cara cliente del módulo SEO: dashboard `/growth/seo` con Resumen, Evolución y
Quadrant 360, más el informe `/growth/seo/report` en web e imprimible sobre el mismo modelo de
artefacto que el AEO. Con ella el módulo tiene sus dos caras —las cuatro pestañas del operador y el
portal del cliente— y la pata visible del criterio de paridad queda cubierta.

El cierre empezó desmintiendo su propia evidencia: el scorecard vigente bloqueaba la task con 2.29
sobre capturas tomadas nueve horas antes del commit que ejecutó la ronda premium, así que describía
una interfaz que ya no existía. Medida de nuevo contra el código real —tres superficies, escritorio y
móvil, con sesión de un cliente de verdad atravesando el gate por organización— las tres cierran sin
un solo hallazgo de calidad y los cuatro gates de UI quedan en verde.

En el camino aparecieron dos defectos que ningún gate podía ver porque ninguno es un error técnico:
el informe anunciaba "Aún no hay una posición media para leer" con la posición impresa al lado, y el
botón global de "volver arriba" no tenía nombre accesible en ninguna ruta del portal. Los dos
salieron mirando las capturas, no leyendo los reportes.

## 2026-08-12 — El contrato de contacto de Careers quedó cerrado de punta a punta

Segundo release del día (`950f5bdb4`): el país de residencia pasó a ser requerido también en el
parser (antes sólo la UI lo exigía), el formulario nativo lo muestra en «Tus datos» junto al correo
—ya no relegado a una sección genérica— y el selector dejó de mostrar la primera opción como si
estuviera elegida cuando no hay valor. El sexto y último correo del ciclo (seleccionado) se
ejercitó en vivo, el scorecard visual formal quedó en PASS con capturas de escritorio y móvil, y la
revisión de privacidad de los tres campos quedó documentada con dos recomendaciones no bloqueantes.
De paso se cazó un flake real del CI (timer de verificación de email que dispara tras el teardown).

## 2026-08-12 — Los emails de hiring y el contacto completo de Careers quedaron VIVOS en producción

Rollout completo en una sesión: el flag de los 6 emails del ciclo de contratación quedó prendido en
el ops-worker (con default durable en deploy.sh), un ejercicio E2E real con los commands canónicos
recorrió postulación → preselección → evaluación → rechazo y los 5 correos salieron `sent` con
asuntos personalizados (el aviso interno llegó a people@efeoncepro.com con teléfono, país y mensaje
del candidato). El Growth Form de careers se republicó (v4) con el país de residencia para cerrar la
paridad nativa, y el release `393144e9f` promovió todo a producción por el control plane (manifest
`released`, watchdog ok, campo país verificado en vivo). Quedan como pendientes menores la revisión
de Privacy, el flip del país a requerido-en-parser y el scorecard GVC formal.

## 2026-08-12 — Archivo puntual de adjuntos Wherex

- `wherex:radar` incorpora `--tender-id` + `--archive-originals <carpeta>`: guarda y analiza originales únicamente cuando Wherex emite una descarga nativa; el visor protegido queda explícitamente en `manual-save-required`, sin extraer enlaces firmados.
- Para una sesión Chrome principal expresamente autorizada, el manual y ambas skills documentan el fallback visible: activar temporalmente **Descargar archivos PDF**, validar cada descarga individual y restaurar el visor cuando corresponda. Sika LIC-1120 quedó archivada en OneDrive; sus anexos contienen una discrepancia de plazo que exige aclaración antes de cotizar.

## 2026-08-12 — El formulario de Careers ya no pierde el contacto del candidato (TASK-1688)

Se cerró la pérdida silenciosa que descubrió la auditoría de postulaciones: teléfono y mensaje se
validaban en el navegador pero el command los descartaba, y no existía país de residencia. Ahora el
apply (estándar y Growth Form nativo, mismo parser/command) pide país de residencia autodeclarado
(select textual del catálogo ISO — jamás deducido del prefijo telefónico), guarda el teléfono E.164
opcional en el perfil del candidato con política anti-wipe y el mensaje como contexto de esa
postulación. El reclutador lo lee en la Postulación 360; las postulaciones históricas muestran "No
informado" sin inventar datos. ADR registrado, migración aditiva aplicada, país requerido primero
en UI (expand/contract). Pendiente de rollout: ejercicio en staging + GVC, revisión de Privacy y el
flip a requerido en parser.

## 2026-08-12 — El proceso de contratación ahora avisa por correo en cada hito (TASK-1689)

Greenhouse deja de estar mudo durante el hiring: al llegar una postulación, People recibe un aviso
con los datos del postulante y el candidato un acuse de recibo; al asignarle un test le llega su
link de acceso (con token re-emitido de forma canónica — nunca viaja por el outbox); al avanzar a
una etapa candidate-facing (Preselección/Entrevista, nunca etapas internas) se le informa; y la
decisión final llega como felicitación o como agradecimiento cuidado si no quedó. Todo corre como
consumers reactivos en el ops-worker sobre la plataforma de email canónica, idempotente ante
retries, con kill-switch por tipo (el de rechazo pausable aparte) y detrás de
`HIRING_LIFECYCLE_EMAILS_ENABLED` default OFF. Code complete con suite completa verde; el flip
espera deploy del worker, ejercicio en staging y revisión del copy por Talent.

## 2026-08-12 — Sentry separa el ruido del bridge de Facebook de los errores reales de Careers

El cliente de Sentry filtra exclusivamente la firma del bridge nativo que Facebook inyecta en
Android cuando el objeto Java desaparece durante el ciclo de vida de su WebView: exige el mensaje,
navegador y frame `app://` exactos. No toca Careers, Turnstile ni la captura de otros errores de
Facebook/Android. La investigación comprobó que la página pública y el formulario nativo responden
correctamente; el cambio llegó a producción por `d139726ff` y 8W no tuvo recurrencias posteriores al rollout.

En el mismo cierre se recupera la gobernanza persistida de `/admin/globe/credits`: una migration
añade el registry y el único grant que autoriza su contrato (`efeonce_admin`), eliminando el
fallback que generaba `role_view_fallback_used` durante el refresh de claims. La migration quedó aplicada y
el grant se verificó en Cloud SQL. También se corrigió el smoke de identidad: el `ops-worker` compartido
consultaba el portal staging protegido por SSO (HTTP 302); al usar el portal público dos runs fueron 5/5 y
la health fue `ready`. Los tickets remotos de Sentry quedan por marcar como resueltos cuando exista una
sesión o token con escritura.

## 2026-08-12 — El escáner de malware quedó vivo en producción, verificado de punta a punta

Cierre de la historia que las dos entradas siguientes cuentan: el escáner de firmas
está operativo en staging y en producción, y esta vez la verificación corrió donde
tenía que correr. Tres capas independientes, todas desde el runtime real: el
endpoint de diagnóstico acuñó la credencial y el servicio la aceptó ANTES de
prender el flag; después del flip el mismo endpoint confirmó el flag horneado; y
una postulación de prueba por el formulario público real atravesó el camino
completo — escaneada por los dos motores, limpia y adjunta en 129 ms. La issue del
doble incidente quedó resuelta y la task de provisión cerrada. Costo steady del
servicio: ≈USD 19/mes. Recursos Humanos descarta la postulación de prueba desde el
Hiring Desk.

## 2026-08-11 — El flag del escáner falló dos veces en producción; causa raíz cerrada en código

Corrección al estado que reporta la entrada siguiente: en producción el escáner de
firmas quedó **apagado**. Prenderlo falló dos veces el mismo día bloqueando CVs de
candidatos reales (recuperados todos, 5+1): primero porque el código estaba sólo en
`develop` y producción sirve `main`; después —con el código ya promovido— porque
producción resuelve credenciales GCP por service account key (postura transicional,
TASK-800) y el camino de ID tokens del scanner no tenía esa rama: caía a un método
que exige credenciales ambiente que Vercel no tiene, y fallaba en 21 ms. Staging
nunca lo mostró porque usa la rama WIF, que sí existía.

El fix agrega la rama de service account key al resolver canónico
(`src/lib/google-credentials.ts`), con el plan de credencial exportado y testeado
contra los shapes exactos de producción y staging, y nace el endpoint de diagnóstico
`GET /api/internal/health/scanner-auth`: acuña el ID token en el runtime donde corre
y opcionalmente golpea el `/scan` real, sin tocar el path de uploads. Es la
verificación que faltó dos veces — probar con la identidad del operador no prueba
nada sobre el runtime. Verificado con la credencial real de producción: token en
120 ms y el Cloud Run lo aceptó. El flag se re-prende recién cuando el endpoint
responda verde EN producción (ISSUE-150 tiene la secuencia exacta). Staging sigue
operativo end-to-end.

## 2026-08-11 — Escaneo de malware activo sobre los archivos que suben desde afuera

El escáner de firmas dejó de ser código latente y quedó operativo en staging y en
producción. Todo archivo que entra desde afuera pasa ahora por dos revisiones
complementarias: la estructural, que mira los bytes reales y detecta un ejecutable
renombrado a `.pdf`, y ClamAV, que reconoce firmas de malware dentro de archivos que
sí son del tipo que dicen ser. El peor veredicto gana. No es una función de
reclutamiento: cubre el CV público, los adjuntos de Growth Forms y los pliegos y
entregables que se cargan a una propuesta.

Se verificó con postulaciones reales por el formulario público, no con mocks: un PDF
válido queda adjunto y un archivo de prueba EICAR queda en cuarentena, sin que la
persona que lo subió reciba ninguna señal distinta — avisarle a un atacante que su
archivo fue rechazado le diría qué probar después. Si el escáner no puede
pronunciarse, el archivo también se bloquea: es deliberado, y por eso una mala
configuración es más peligrosa que no tener antivirus.

Corre en un único servicio Cloud Run cerrado por IAM, ≈USD 19/mes, con las firmas
actualizándose solas dentro del contenedor. De paso quedó corregida en el flag ledger
una calibración de costo que estaba desfasada 24×: Cloud Run no cuesta USD 7,32 cada
30 días sino ≈USD 169.

## 2026-08-11 — Distribución de vacantes en Facebook, trazable y reusable

Se difundieron las vacantes públicas `EO-OPN-0061` (Content Creator) y `EO-OPN-0009`
(Account Manager) en grupos de Facebook ya unidos y afines; la expansión dejó diez
envíos adicionales por rol, con nueve visibles y uno a moderación en cada caso al
momento de verificar. El registro operativo conserva copy, beneficios aprobados,
destinos, evidencia de estado y la decisión explícita de continuar sin imágenes.
Hiring Desk, el manual de Careers y las skills espejo ahora separan con claridad la
publicación canónica del opening de su distribución externa: confirmación humana,
sin grupos nuevos ni DMs no autorizados, y nunca reintentar un estado ambiguo sin
verificar antes el texto exacto.

## 2026-08-11 — Radar Wherex reutilizable y documentado

La skill de licitaciones incorpora el companion `wherex-radar-chrome-playwright.md`, el manual comercial y la
CLI `pnpm wherex:radar`. Su setup aislado guarda la cuenta sólo en `.auth/` con `0600` y Git ignore; el runner
usa un perfil Chrome separado, revisa **Nueva** y **Editando**, lee fichas y adjuntos técnicos temporales, y deja
un reporte local protegido. Su salida es read-only y evidence-first; participar, responder, cargar o firmar sigue
bajo control humano explícito. El flujo documentado continúa con el archivo de originales en OneDrive y con la
verificación/alta por MCP HubSpot de empresa, deal y asociación en dos confirmaciones; no se eluden visores
protegidos ni se guardan URLs firmadas. El dictamen exige leer la descripción completa y el Centro de mensajes →
Preguntas, porque ahí pueden estar el máximo de presupuesto, pago, alcance, inicio, facturación y exclusiones; si
el reporte no contiene esas aclaraciones, se revisan en la UI autenticada antes de clasificar. La misma fuente ahora
documenta el cierre de una postulación: precio desde cotización aprobada → condiciones/adjuntos → reconciliación
en resumen → aceptación y envío únicamente con confirmación humana final.

## 2026-08-11 — Oferta completa para Ajinomoto LIC-962

Se redactó la propuesta técnica y económica para el programa influen-SER Team de Ajinomoto del Perú, con ledger
trazable al brief y a las respuestas de Wherex, matriz de cumplimiento, límites de alcance y condiciones de
facturación Chile–Perú. La oferta fija S/ 7.000 mensuales sin IGV peruano y S/ 84.000 referenciales para los 12
meses de la ficha; no promete resultados de plataforma ni producción ilimitada. Se emitió la cotización XLSX y
se compuso una presentación técnica de 11 láminas, validada por el composer. Ningún precio, adjunto, término o
envío fue ingresado en Wherex. El blueprint interno conserva el gate de Finanzas por costo cargado/squad y la
revisión tributaria previa a adjudicación.

## 2026-08-10 — TASK-1685 cerrada: el portal cliente tiene un solo primitive de visibilidad

El menú del portal cliente y la puerta de cada página dejaron de decidir por su cuenta. Existe un solo
predicado —`acceso = interna ∨ (¬revocada ∧ (vistaBase ∨ móduloDeLaOrgLaDeclara))`— y lo consumen los
cuatro caminos: page guard, lista base del menú, ⌘K y layouts de ruta. Antes el menú preguntaba por el
ROL y la puerta por el MÓDULO contratado, y ninguna de las dos mitades podía observar a la otra:
medidos contra PG, eran **36 enlaces que el menú ofrecía y la puerta negaba**, sobre los 8 usuarios
cliente activos, incluidos los 3 reales de Sky Airlines. Hoy el menú muestra exactamente lo que se
puede abrir. Un `user_view_overrides` con `override_type='revoke'` pasó de decorativo a cerrar la
puerta de verdad.

Cambio de acceso, no sólo de experiencia: cuatro rutas de detalle del portal (`/proyectos/[id]`,
`/campanas/[campaignId]`, `/sprints/[id]`, `/notifications/preferences`) no tienen guard propio y su
única puerta era un layout que gateaba por el carril de rol — un cliente cuyo rol concedía la vista
pero cuya organización no tenía el módulo entraba al detalle por URL. Los cuatro pasan al guard
canónico.

Verificado contra PG antes y después: los 24 pares usuario×vista contratados quedaron intactos —ningún
cliente perdió una superficie que su organización pagó— y los enlaces muertos bajaron de 36 a 0. Sin
migraciones y sin feature flag: la tabla de overrides estaba vacía, así que el delta de acceso es cero.
`role_view_assignments` deja de gobernar vistas `cliente.*` (para el portal interno sigue siendo el
carril canónico) y un lint en `error` impide reintroducir la segunda fuente. Cierra `ISSUE-148`.

## 2026-08-10 — Task planner: un resultado `legacy=1` deja de ser registrable

Se corrigió TASK-1686 para preservar los cinco marcadores HTML `ZONE` del template y se endurecieron los
planners `.codex` y `.claude`: antes de tocar registry/README o commitear, toda task nueva debe pasar
`pnpm task:lint --task TASK-###` con `template=1 legacy=0 errors=0 warnings=0`. La salida `legacy=1`,
aunque tenga cero errores, es un fallo bloqueante. La reparación también completó los contratos
wireframe/flow/motion/readiness de TASK-1686; no cambió runtime, rutas, acceso ni la implementación de
la task.

## 2026-08-10 — TASK-1389 cerrada: la navegación quedó con candado anti-regresión

Cierra el programa de navegación del día (1388 → 1686 → 1389): Contrato de Asignación de Superficies
canónico (qué destino va a qué superficie, sin duplicar, nada nuevo colgado del primer nivel fuera de
zonas) + campo `Nav placement` obligatorio en tasks con destino visible + gate `pnpm nav:budget` que
mide el árbol real del rail interno contra el presupuesto (8 slots top-level · profundidad 2 · cero
`/my/*`) y el manifest. Nació directo en `error` con 0 violaciones medidas; doble cobertura CI (suite
+ job en design-contract.yml). Lo que infló el sidebar a 96 hojas ya no puede repetirse en silencio.

## 2026-08-10 — TASK-1686 cerrada: el colaborador puro deja de ver un portal ajeno

Continuación directa de TASK-1388, mismo día: la rama no-interna del menú bifurca con
`isPureCollaborator` y el colaborador (solo rol Colaborador) ve exclusivamente su portal — rail =
Mi Greenhouse + Mi Ficha + recursos concedidos; avatar = identidad + Mi Perfil + salir. Se cierran
los shortcuts cliente sin gating del avatar, el heading "Mi Cuenta" vacío y el borde de claims
vacíos. El trigger del avatar pasa a botón semántico (aria + teclado + Esc/restore) para TODAS las
audiencias. Cliente, interno e híbrido my+client conservan su salida byte-a-byte (tests de control
19+7). Evidencia GVC con la persona collaborator real, baselines durables y scorecard 5.0.

## 2026-08-10 — TASK-1388 cerrada: la navegación interna se reparte entre sus 3 superficies

Reequilibrio del portal interno en develop (5 commits, sin push): el rail pasa de 12 grupos top-level
a 3 zonas (Operación · Administración · Recursos) con dominios colapsables uniformes; las hojas
personales `/my/*` viven ahora en el dropdown del avatar (header de perfil clickeable, sin atajos
admin duplicados) servidas por el builder canónico `src/lib/navigation/my-nav-items.ts`; y hay UNA
sola palette ⌘K (la `CommandPalette` de TASK-696, ahora con filtro de audiencia + recientes +
acciones — la `NavSearch` retirada exponía el `VIEW_REGISTRY` completo sin filtrar).

- Cero cambios de ruta/URL ni de gating: el set de hojas por rol quedó fijado por test de identidad
  (`VerticalMenu.test.tsx`, interno + no-interno).
- Dedup: Sample Sprints con hogar único en Comercial, Growth como sección de Comercial, "Spaces
  (admin)" desambiguado, Herramientas IA una sola vez, `verticalMenuData.tsx` legacy borrado.
- Los 4 hallazgos a11y del chrome que TASK-1675 midió quedaron cerrados: focus ring en el rail,
  región scrollable con role/label/foco, toggle del drawer accesible, desborde de 8px del panel.
- Evidencia GVC premium (3 scenarios, desktop+390px) + scorecard 4.93 + baselines durables
  promovidos. Cerrada el mismo día con autorización del operador: build de producción verde, test
  full (10.447), `UI ready: yes` (card-sort formal queda como validación posterior no bloqueante).

## 2026-08-09 — Barrido documental del carril cliente: el doc de contrato estaba invertido

Tres auditorías paralelas (arquitectura, docs funcionales/manuales, skills) tras los dos releases.

- 🔴 **El §0 Status de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1` afirmaba que no existían cuatro piezas que
  se implementaron entre `TASK-824` y `TASK-828`** — carpeta, namespace de API, schema y modelo de
  módulos. Tres meses así, y es lo primero que lee un agente que abre el doc de contrato del dominio.
- ⚠️ **Defecto vivo que causó el assignment de hoy:** `/creative-hub` no existe y Sky Airlines ve el
  enlace. Señal nueva `identity.client_portal.assigned_view_without_route` (hoy en 1). La condición la
  crea un cambio de DATO, no un deploy, así que ningún gate de código la veía — y
  `route-reachability-gate` sólo cubre la dirección contraria.
- Los dos companions de invariantes no tenían nada del page guard ni de la derivación invertida, que es
  justo lo que un agente carga al tocar el dominio. Agregados.
- Cinco aprendizajes de proceso a sus skills dueñas: el context gate va último, un gate con expectativa
  hardcodeada no prueba el motor, un override de lint fuera del alcance de la regla no protege nada,
  `VERCEL_ENV` nunca `NODE_ENV`, y una nota del Handoff no es evidencia.

## 2026-08-09 — El carril del portal cliente, cerrado y verificado EN PRODUCCIÓN (release `ee0d568b8614`)

Segundo release del día. Manifest `released`, watchdog `drift_count=0`, **sin bypass del batch policy**
(cero migraciones — el contraste con el release de la mañana, que sí lo necesitó, muestra que la
diferencia es la presencia de migraciones y no el tamaño del batch).

- **Verificación completa en producción:** 9 rutas × 3 personas con sesión real. Las 3 vistas base
  sirven `200`, las 6 module-gated redirigen a `/home?denied=<slug>`, cero `resolver_unavailable`, y
  `/proyectos` sirve `200` al operador interno donde antes devolvía `/401`.
- 🔴 **Corrección de un supuesto propio:** `agent-session` **sí** funciona en producción
  (`AGENT_AUTH_ALLOW_PRODUCTION` seteada desde ~90 días). Lo negué toda la sesión tomándolo de una nota
  del Handoff sin verificarlo. Postura abierta en `TASK-1684`.
- Dos aprendizajes de release documentados en runbook + ambas skills: `vercel redeploy` no arregla un
  staging cancelado por docs-only, y el context gate va último porque `docs:closure-check` no lo
  reemplaza.

## 2026-08-09 — La verificación en staging del portal cliente encontró dos defectos más

Recorrí las 9 rutas × 3 personas con sesión real contra staging. El fix quedó confirmado en runtime
desplegado —3 base sirven `200`, las 6 module-gated redirigen a `/home?denied=<slug>`, **cero**
`?error=resolver_unavailable`— y de paso salieron dos cosas que sólo se ven ejerciendo el flujo:

- **`/proyectos` devolvía `/401` al operador interno**, y era la única de las 9 que conservaba un gate
  legacy por route group **encima** del canónico, con el comentario de al lado diciendo que el
  canónico lo reemplazaba. Corría primero, así que ganaba, y el scope del operador interno no incluye
  `client`. Arreglado, con una guarda de source que barre las 9 páginas. **Producción sigue con el
  síntoma hasta el próximo release** — clasificado `MENOR`: es fail-closed de más, no expone nada.
- **El override de organización era solo-local por usar `NODE_ENV`.** Vercel compila todos los
  deployments con `NODE_ENV=production`, así que el bloqueo apagaba el flag también en staging. El
  discriminador canónico del repo es `VERCEL_ENV` (mismo que `agent-session` y `proxy.ts`). Corregido,
  y **sin** válvula de escape de producción: la divergencia con `agent-session` es deliberada porque
  este override concede lectura cross-tenant.

## 2026-08-09 — El carril de acceso del portal cliente queda cerrado del todo (TASK-1680 + Creative a SKY)

Las tres piezas que quedaban después del release: el módulo Creative asignado, el lint cerrado y los
dos hallazgos de tooling con ID.

- **Creative Hub Globe asignado a Sky Airlines** vía el command canónico `enableClientPortalModule`
  (no SQL: es el único camino con audit + outbox + invalidación de cache en una transacción). Las 4
  páginas Creative del portal abren para SKY y siguen en empty state para el resto — que es el
  producto funcionando.
- **`TASK-1680`**: el lint `no-untokenized-business-line-branching` pasa a `error`. La medición dio
  **0 violaciones** con el override intacto, y reveló que **4 de sus 6 entradas eximían paths que la
  regla nunca miró** — hacían ver la gobernanza más estricta de lo que era. Quedó una exención, medida
  y con dueño. 6 archivos muertos borrados de paso.
- **El gate de verificación pasa a derivar su expectativa de los datos.** Hardcodeaba "3 abren y 6
  empty state" y al asignarle el módulo a SKY reportó cuatro desvíos **por hacer lo correcto**. Un
  gate que se edita por organización no prueba el carril: prueba que la primera organización sigue
  igual.
- `TASK-1682` (la capability del bypass de release sin verificador ni grant) y `TASK-1683` (la
  rotación de contexto que borra el puntero al archive) quedan registradas con su medición.

## 2026-08-09 — El carril de acceso del portal cliente, EN PRODUCCIÓN (release `2c87d71e2eca`)

`TASK-1678` + `TASK-1679` promovidas juntas a propósito: la contención del fail-open se retira en el
mismo instante en que el fail-open se cierra, así que no hubo ventana de exposición. Manifest
`2c87d71e2eca-f444748c-92aa-484c-b118-02713ee63e06` en `released`, run `31335921151`, watchdog
`drift_count=0`, `/api/auth/health` 200 con los 3 providers `ready`.

- Pasó a la primera con un solo bypass previsto: los dos hallazgos del preflight se pre-emptaron antes
  de tocar `main` (el staging `CANCELED` se resolvió con el propio push de código; el smoke sobre `main`
  se **produjo** en vez de bypassearse).
- 🔴 **Aprendizaje que no estaba en ningún runbook:** el marker `[release-coupled:]` **no** sirve para
  `requires_break_glass` — sólo limpia `split_batch`. Ponerle marker a un `requires_break_glass` es
  cargo-cult; su única salida es el bypass.
- **Hay una sola instancia Cloud SQL:** producción, staging y local leen la misma base, así que las 2
  migraciones del batch ya estaban aplicadas antes del deploy. Eso cambia cómo se evalúa el riesgo de un
  release con `db_migrations`.
- `TASK-1680` quedó desbloqueada (su `Blocked by` apuntaba a `TASK-1679`).

## 2026-08-09 — Las 9 páginas del portal cliente dejaron de mentir (TASK-1679, cierra ISSUE-146)

Las nueve rutas guardadas redirigían con `?error=resolver_unavailable` —el banner de "el servicio no
está disponible"— por tres defectos que vivían en la misma función y se tapaban entre sí: el
`redirect()` del camino `denied` estaba **dentro** del `try`, así que su propio `catch` lo interceptaba;
el guard pasaba un `clientId` donde el resolver espera un `organizationId`; y seis viewCodes de rutas
vivas no los declaraba ningún módulo. Ahora cada resultado tiene su destino: empty state para
module-gated sin módulo, `organization_unresolved` para sesión sin organización, y
`resolver_unavailable` sólo cuando el resolver falla de verdad.

- `ModuleNotAssignedEmpty` volvió a existir en runtime, y una denegación legítima dejó de reportarse a
  Sentry como error del resolver — el dominio `client_portal` acumulaba incidentes por funcionamiento
  normal.
- Tres vistas pasaron a allowlist base (`notificaciones`, `configuracion`, `actualizaciones`): no son
  producto vendible. Ciclos y Analytics quedaron module-gated por decisión del operador.
- `/reviews` se unificó en `cliente.reviews`; `cliente.revisiones` queda marcado como retirado
  (append-only).
- **Medido, no supuesto:** corregir el guard NO abre las 9. Los módulos que declaran 4 de esas vistas
  no están asignados a ninguna organización, así que 3 abren y 6 muestran el empty state. Abrirlas es
  un assignment, no código.
- Persona de verificación con organización configurable, con 4 condiciones fail-closed y auditoría.
  **Rollout pendiente:** no está en `main`.

## 2026-08-09 — El carril rol→vista del portal cliente falla hacia cerrado (TASK-1678, cierra ISSUE-147)

`resolveAuthorizedViewsForUser` otorgaba por defecto: un rol `client_*` y una vista `cliente.*`
comparten routeGroup `client`, así que toda vista cliente nueva se auto-otorgaba pese a que 18 de las
25 están gobernadas por módulo contratado. Ahora el default se invierte sólo para ese routeGroup, el
camino degradado devuelve lista vacía para tenants `client` en vez del `VIEW_REGISTRY` completo, y el
`fallback` de lista vacía de `hasAuthorizedViewCode` deja de aplicar a sesiones cliente — sin eso
último, degradar hacia cerrado habría abierto todo. El portal interno no se mueve: su default
permisivo es lo que lo hace usable sin seedear cientos de filas.

- Medido antes de apagar nada (`scripts/identity/client-view-fallback-audit.ts`): el cambio apaga
  **un** viewCode por rol cliente y es module-gated → cero seed necesario.
- Dos supuestos de `ISSUE-147` eran falsos: `role_view_assignments` no tiene columnas de vigencia, y
  su punto 5 ("revisar el fallback de los callsites") no era limpieza sino requisito.
- Los denials de rol siguen siendo unión, por decisión medida y no por omisión — el veto per-usuario
  vive en `user_view_overrides`. Rationale en `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2.
- Señal `identity.view_access.client_role_without_grants`, steady 0 verificado contra PG.
- Verificado con las tres personas agente (`scripts/identity/client-view-rail-persona-check.ts`).
  **Rollout pendiente:** no está en `main`, y `TASK-1679` va después por el orden de contención.

## 2026-08-09 — El cutover SEO cerró del todo, en dos releases (TASK-1677, cierra ISSUE-143)

La ventana expand/contract que `ISSUE-143` había dejado abierta a propósito quedó cerrada: el código
dejó de leer `seo_v1` y los assignments quedaron superseded. Lo que vale registrar no es el cierre
sino su forma.

**Fueron dos releases, y no por prudencia: por construcción.** El check `postgres_migrations` del
preflight es estricto, así que una migración commiteada y sin aplicar bloquea el release. Y aplicarla
antes de desplegar el código es exactamente lo que el ordering del cutover prohíbe. Las dos reglas
juntas hacen que un expand/contract no quepa en un solo ciclo — y eso, lejos de ser fricción, es lo
que garantiza que exista un punto de verificación entre el código y los datos.

La verificación fue con el canary del provider contra producción, antes y después de tocar los datos:
la superficie de Grupo Berel abre con datos medidos, sin estado de "sin entitlement" y sin errores de
consola. **No con un `SELECT`** — ése fue el método que falló en el incidente original y por eso la
task lo prohíbe explícitamente.

El bloque `DO` de la migración verificó que ninguna organización quedara sin cobertura antes de dejar
pasar el cambio. Estado final: cero `seo_v1` vigentes, dos superseded con su historia intacta, dos
`seo_v2` activos. La fila `seo_v1` sigue en el catálogo: el contract es `effective_to`, nunca un
`DELETE`.

## 2026-08-09 — El gate que aprobaba sin mirar (TASK-1676, cierra ISSUE-145)

El `release_batch_policy` del preflight comparaba contra `origin/main`. Pero el orquestador lo corre
con el `target_sha` ya mergeado en `main`, así que el rango quedaba vacío y el check devolvía `ship`
sin haber mirado un solo archivo. No era una hipótesis: los `preflight-result.json` de tres releases
consecutivos reportan `filesChanged=0, decision=ship`, y uno de ellos llevaba 1045 archivos y 14
migraciones. Un gate que grita de más hace perder tiempo; uno que nunca grita entrega una seguridad
que no existe.

La base pasa a ser el `target_sha` del último manifest en estado `released` para la rama. El filtro
por estado no es cosmético: en este repo conviven dos manifests con el mismo `target_sha`, uno
`aborted` y uno `released`, y el helper que ya existía no filtraba. De paso, `rolled_back` queda
excluido solo, así que el ancla nunca apunta a código que se sacó de producción.

El invariante quedó formulado sobre el resultado y no sobre la base, que es más fuerte de lo que pedía
la issue: **un diff vacío nunca es aprobación**, venga de donde venga el ancla. Eso permite conservar
el fallback a la HEAD de la rama sin reabrir el agujero — y hace falta, porque los 75 manifests son de
`main` y un preflight sobre otra rama habría quedado mudo para siempre.

El marker `[release-coupled: …]` tenía el problema simétrico: nunca se leía donde el runbook decía, y
al mismo tiempo lo disparaba cualquier mención en prosa dentro de los ~509 commits del rango — 442 KB
donde una cita basta, y donde el marker desactiva de una sola vez TODA la detección de mezcla de
dominios. Se cerró con dos candados: la regex exige que el marker abra la línea, y el texto donde se
busca es sólo el cuerpo del commit objetivo. El caso de regresión más elocuente resultó ser el commit
que creó la task para arreglar el defecto: al describirlo, lo disparaba.

Aparte, `pnpm release:workers`. En el release del 2026-08-08/09 fallaron tres comandos copiados de la
documentación y ninguno de los envueltos en `pnpm`. Un wrapper se arregla una vez y el uso diario lo
ejercita; un snippet en markdown es un fósil que nadie corre hasta el incidente, y ahí el operador no
puede distinguir "comando viejo" de "sistema roto".

Verificado contra el batch real: el check pasó de no ver nada a clasificar 65 archivos citando su base.

## 2026-08-09 — El menú del portal cliente ya puede mostrar un módulo contratado (TASK-1675)

El portal cliente tenía dos carriles de verdad que nunca se tocaban: el gate de cada page leía
`module_assignments`, y el menú leía `authorizedViews`, que se deriva de `role_view_assignments` y
nunca de módulos. La consecuencia era estructural, no de un módulo puntual: Grupo Berel tenía SEO
contratado, la pantalla renderizaba con sus datos reales, y no había forma de llegar salvo escribiendo
la URL. Cualquier módulo per-org que se contratara heredaba lo mismo, y la única salida era hardcodear
otro ítem — justo lo que la spec del dominio prohíbe desde TASK-827.

`(dashboard)/layout.tsx` resuelve los módulos de la organización y pasa `clientNavItems` por props;
`VerticalMenu` los suma a la lista base. Server-side y no fetch desde el cliente porque el sidebar es
chrome persistente y un ítem que aparece tarde es CLS en el peor lugar posible. Dos cosas son
load-bearing y no defensivas: el `try/catch` del layout, que es la raíz de todo el dashboard e
internos incluidos —sin él, un resolver caído deja de ser "un cliente no ve un ítem" y pasa a ser
"nadie entra al portal"—, y que el merge sea aditivo, porque la rama "cliente" del componente es en
realidad la rama no-interno y los colaboradores puros caen ahí.

Se mergean los tres grupos del composer y no sólo el primario. La captura lo justificó de inmediato:
junto a SEO apareció **AEO**, un módulo del grupo `capabilities`, compuesto sin una línea de código
dedicada. Con un merge sólo-primary se habría descartado en silencio.

De paso, el `route-reachability-manifest` dejó de mentir: `/growth/seo` declaraba
`parent:'/home', via:'inline-link'` para un enlace que nunca existió, y el gate no lo notaba porque
verifica que la ruta esté declarada, no que el enlace declarado exista. Ahora vive en
`MODULE_COMPOSED_NAV_ROUTES`, la categoría de rutas que sí son ítem de menú pero cuyo `href` se compone
en runtime.

Cierra la deuda `client-portal-vertical-menu-resolver-migration`, que TASK-827 dejó nombrada en cuatro
lugares del repo y nunca registró como task. Llevaba meses sin tomarse en parte por eso.

**Rollout gated por la promoción `develop → main`**: mientras el catálogo TS viva sólo en `develop`,
`syncViewRegistryCatalog` apaga esos viewCodes desde cualquier runtime con código viejo.

## 2026-08-09 — El batch policy del release preflight dejó de mentir (ISSUE-114)

`release_batch_policy` computaba el diff con base three-dot (`origin/main...target`). Como la
promoción es por squash-merge, la merge-base queda congelada antes del último squash y el check
resucitaba archivos byte-idénticos a producción como cambios del release, fabricando dominios
irreversibles falsos y empujando releases normales a `requires_break_glass`. Los 4 releases previos
lo habían tapado con marker `[release-coupled: …]`, tres declarando explícitamente que la mezcla no
era real. Ahora usa two-dot, y tanto el diff de archivos como los commit bodies resuelven su base por
`buildReleaseDiffRange`. El hueco de cobertura estaba en que `checks/release-batch-policy.ts` no tenía
archivo de tests; el guardrail nuevo fija el rango en el argv de git, verificado rojo antes y verde
después.

Una verificación adversarial del propio fix encontró cuatro defectos, todos corregidos: un docstring
que sobre-prometía (compartir el rango no iguala `git diff` con `git log`), dos docstrings del
contrato aún en three-dot, dos tests que eran teatro por un mock ciego al rango, y un byte NUL
invisible en un fixture.

Se abrieron `ISSUE-145` (alta: el batch policy del orquestador es decorativo post-merge, y el marker
nunca se lee donde el runbook dice pero se dispara con prosa) e `ISSUE-144` (`vercel_readiness`
confunde build saltado a propósito con fallido). Se desplegó además el batch SEO EPIC-022
(TASK-1308/1309/1310, 322 archivos, 3 migraciones) y se corrigieron dos comandos documentados que las
herramientas dejaron de aceptar.

## 2026-08-09 — El release desbloquea el contract del cutover SEO; queda TASK-1677

- **Verificado, no supuesto.** Tras el release: `main` trae `SEO_MODULE_KEYS_READ`, el canary del
  provider contra producción da **100% verde** —con `track`/`untrack` devolviendo `400` en vez de
  `404`, o sea que esas rutas ya existen— y el `ops-worker` corre una revisión que es **ancestro de
  `main`**. Los otros dos Cloud Run no consumen SEO. Con eso caen las dos condiciones que mantenían
  abierta la ventana de `ISSUE-143`.
- **`TASK-1677` creada** para la fase contract, separada de `TASK-1310`: es `backend-data` de bajo
  riesgo y no debe quedar atada a un ciclo de diseño abierto. 🔴 **El código va antes que la
  migración, y no es preferencia**: lo impone el guardrail que se escribió tras el incidente —
  primero dejas de leer la clave, después la apagas.
- Falsos positivos de `task:lint` detectados al escribirla, ambos anotados como deuda de tooling: la
  regla de placeholder lee la palabra española **"todo"** como el marcador inglés `TODO`, y lee unos
  corchetes de tipo TS como placeholder (éste ya estaba en `TASK-1675`).

## 2026-08-08 — TASK-1309 CERRADA: el conmutador de Search Visibility queda completo

- **`TASK-1309` pasa a `complete`.** Build de producción verde (exit 0) con autorización del operador
  — era el último gate. Con ella **las 4 tabs de Search Visibility navegan** y el conmutador del
  operador queda cerrado; la pata UI del exit criterion de EPIC-022 queda abierta sólo por el cliente
  (`TASK-1310`) y su alcanzabilidad por nav (`TASK-1675`).
- **El bloqueo previo lo había cerrado la migración de 1310.** Estaba `code complete` frenada por 2 rojos
  ajenos en `client-role-visibility.test.ts` (viewCodes en el catálogo TS sin migración de
  `role_view_assignments`). Aplicada esa migración: **`pnpm test` en 1429 archivos / 10377 tests / 0
  rojos**, `ui:quality` PASS 4.63, reachability 0 huérfanas. Falta el build de producción para el
  cierre formal.
- 🔴 **§10.6 de la arquitectura SEO se auto-contradecía por un delta mío**: el bloque nuevo cambiaba el
  orden de hallazgos a tres ejes mientras el contrato 4 seguía declarando la regla vieja de dos. Un
  agente que leyera el contrato sin bajar al delta implementaba lo equivocado. Corregido: el contrato
  ahora enuncia la regla vigente y apunta al delta en vez de contradecirlo.
- **Cinco commits de feature habían aterrizado después del pase documental**, así que las tres capas
  (arquitectura, funcional, manual) describían una pantalla anterior a la construida. Actualizadas:
  doc funcional a v1.10, manual a v1.1, más los dos índices que seguían diciendo "tres pantallas de
  operador" y listando la Auditoría en "qué falta".
- **Los aprendizajes se generalizaron fuera de SEO**, que es donde valen: `dataviz-design` v1.2 fija
  que el `radialBar` de Apex mide 0 en contenedor fluido y **no dibuja** —con build y tests verdes— y
  extiende la sospecha a cualquier chart que derive tamaño del contenedor (tabs ocultas, acordeones,
  el `fullPage` de Playwright que produce cards vacías que parecen bug); `state-design` v1.2 fija los
  **seis** estados de un job async (nunca corrió · corriendo · limpio · parcial · con techo ·
  fallido); `greenhouse-ui-review` v1.2 y `greenhouse-ui-enterprise-review` suman como blocker el
  número cuya procedencia difiere de sus vecinos sin declararlo en pantalla.
- `seo-aeo` gana §8 en su módulo técnico (leer un site audit sin mentir el diagnóstico) y la regla de
  que **ordenar hallazgos de un crawler no es ordenar iniciativas con RICE**; `dataforseo-operator`
  aterriza los cuatro huecos de cobertura a campos concretos del proveedor.
- Deuda detectada: `greenhouse-ui-enterprise-review` vive en los dos árboles de skills pero **no está
  en el manifiesto de espejos** y ya divergía. Se aplicó el mismo bloque a ambas copias para que el
  gate sea idéntico; la divergencia previa sigue sin reconciliar.

## 2026-08-08 — ISSUE-143: la migración del cutover SEO colapsó expand y contract, y tumbó producción

- **Resuelto el mismo día (~25 min de caída).** La migración de viewCodes de TASK-1310 hace expand y
  contract en el mismo archivo: crea `seo_v2` y en el mismo statement supersede `seo_v1`. Eso anula el
  dual-read `SEO_MODULE_KEYS_READ` aplicado a los 5 consumidores, cuyo valor entero era que existiera
  un período con ambas claves vigentes. Vercel producción corre `main`, que pide `seo_v1` literal:
  Grupo Berel pasó de `domainQuadrant=riesgo keywords=50` a `hasModule=false` + 404 en los cinco lanes.
- **El ops-worker no se vio afectado** (su deploy ya tenía el dual-read): los tres batches que le pagan
  al proveedor siguieron sanos. El daño fue de lectura, no de gasto ni de datos.
- Restaurado reabriendo la ventana y hecho durable por
  `20260808184512073_task-1310-reopen-seo-module-cutover-window`, que hornea el invariante de simetría
  (ambas claves cubren las mismas orgs; una ventana asimétrica aborta la migración con `RAISE`).
- **El guardrail es lo que faltaba:** la regla ya estaba escrita en §10.7 de la arquitectura y no
  impidió nada, porque nadie revisa una migración contra un párrafo. Ahora hay un test que escanea la
  sección `Up` de `migrations/` y falla si una migración nueva supersede una clave que
  `SEO_MODULE_KEYS_READ` todavía acepta. Probado por mutación contra la migración culpable.
- Segunda causa, de método: verificar una migración de cutover con un `SELECT` es verificar la mitad
  del contrato. La otra mitad es qué versión de código la lee en cada uno de los **cinco runtimes con
  despliegues independientes**.
- **Hallazgo colateral, arreglado de raíz: `docs:context-rotate` estaba ciego y reventaba.** Rotando el
  Handoff para registrar este incidente, el rotador murió con `TypeError: Cannot read properties of
  undefined (reading 'index')`. Su patrón buscaba secciones `##` con fecha y el archivo hace rato usa
  `###`: 0 de 23. Es la **segunda** vez que la herramienta se queda ciega por la misma causa —el
  propio código documenta la primera (`^## Sesi[oó]n…` matcheaba 1 de 40)—, y esta vez además crasheó
  en vez de degradar. Una herramienta que el gate te MANDA a correr y muere sin explicar empuja a
  rotar a mano, que es exactamente como se corrompen los marcadores de integridad de los shards.
  El fix no es ampliar el patrón: el nivel de heading ahora se **descubre** (gana el que más secciones
  fechadas produce), porque el ancla estable es la fecha, no el nivel. Sin secciones fechadas degrada
  con un mensaje accionable en vez de tirar un stack. El script pasó a ser importable (guard de
  entrypoint) y estrenó suite —5 tests, uno de ellos contra el `Handoff.md` real, que es el que se
  romperá la próxima vez que la convención derive. Verificado: rotó `keep 20; archive 3` + `keep 60;
  remove 1` donde antes decía "manual compaction required".

## 2026-08-08 — TASK-1310: contrato de navegación SEO cliente corregido (rollout pendiente)

- Se corrigió el drift entre los viewCodes TS de `/growth/seo` y `/growth/seo/report` y el catálogo
  de módulos: la migración crea `seo_v2`, supersede los assignments activos de `seo_v1` preservando
  tier/metadata y registra los dos viewCodes en `view_registry`.
- SEO permanece module-gated por organización; los tres roles cliente reciben denials explícitos y
  las rutas conservan `growth.seo.report.read_client` scope `own`. La paridad ahora falla también si
  se agrega una surface module-gated al registry sin seed DB.
- Validación local: 53 tests focales y migration marker gate verdes. No se aplicó la migración, no se
  hizo push/deploy y no se ejecutó build completo por el límite de recursos del equipo.
- **Verificación cruzada de la task (2026-08-08, tarde).** El barrido encontró que el código estaba
  adelante de sus documentos y de sus gates, y que **dos gates estaban verdes de mentira**:
  - la señal `seo.rank_capture_lag` tenía `module_key = 'seo_v2'` hardcodeado, así que veía 0 orgs y
    reportaba `ok` — falsa-sana. Con el expand aplicado reporta `warning` con un hallazgo real; su
    test pinneaba el bug (asertaba el literal SQL) y ahora aserta el contrato;
  - los tres scenarios GVC de cliente capturaban con sesión de **operador** contra superficies
    client-gated, así que el frame decía "SEO no está activo en tu plan" y el visual-gate daba BLOCK
    por una razón que no era la UI. Se agregó `requiresStorageState` al contrato de scenario, exigido
    antes de lanzar el browser: `ui:visual-gate --task TASK-1310` pasó de BLOCK a PASS.
- **El scorecard se regeneró desde la auditoría premium.** El anterior daba PASS 4.61 y afirmaba "axe
  sin violaciones" mientras la auditoría de las 10:25 registra 2 violaciones de contraste y economía
  de superficies en 1.8. Ahora `ui:quality --task TASK-1310` da **BLOCK `average=2.29 floor=1.8`**,
  que es el estado correcto para una task con `UI ready: no` y release gate bloqueado.
- **Drift documental cerrado:** wireframe y flow describían un `masterDetail` con rail lateral que la
  implementación descartó — la ruta exacta por la que el siguiente cambio lo reintroduce. Corregidos a
  `composition='single'` + tabs, con el "por qué no" escrito. La superficie cliente salió de "Que NO
  existe todavía" del doc funcional, ganó su sección con el estado de rollout declarado y su manual
  (`docs/manual-de-uso/growth/habilitar-portal-seo-cliente.md`); README, EPIC-022 y el ledger de flags
  quedaron sincronizados.

## 2026-08-08 — TASK-1309: Auditoría del sitio, y con eso el conmutador SEO queda completo

- **`/admin/growth/seo/audit` (tab Auditoría) COMPLETA** — cuarta y última tab de Search Visibility:
  con ella las 4 rutas del conmutador navegan. Cliente puro de `readSiteAuditReport` +
  `queueSiteAudit`. Salud con freshness explícito, issues como **lista priorizada** (no tabla plana),
  drill `?issueGroup=` con las URLs afectadas, y estados que no se mezclan: un crawl que terminó sin
  hallazgos es buena noticia, no un error, y `healthScore` null dice "Pendiente", nunca 0/100.
- **Dos desviaciones deliberadas de la spec, ambas por evidencia.** (a) El wireframe pedía radialBar
  de ApexCharts; se descartó porque TASK-1306 ya había probado en GVC que mide 0 en contenedor fluido
  y no dibuja — se extrajo su arco SVG a `shared/SeoHealthGauge` y ahora lo comparten las dos
  pantallas hermanas, que era el riesgo real de duplicarlo. (b) El copy prometía orden "por impacto y
  esfuerzo", pero el contrato de datos no trae señal de esfuerzo: se curó un tier por check junto al
  label es-CL —declarado como estimación nuestra en la UI— y el orden quedó severidad ▸ páginas ÷
  esfuerzo, con la severidad como corte absoluto para que 400 imágenes sin `alt` no entierren un 5xx.
- **Catálogo es-CL de los 34 checks del allowlist** (`GH_GROWTH_SEO_AUDIT_ISSUES`): el reader entrega
  ids de máquina. Un check sin ficha se NOMBRA en vez de esconderse, y hay test de drift en ambos
  sentidos que obliga a escribirla cuando el backend sume uno.
- **`POST /api/admin/growth/seo/audit/run`** gateado por `growth.seo.audit.run` (distinta de
  `observation.read`: diagnosticar y gastarle al proveedor son permisos distintos). 202, no 200. 6
  códigos canónicos nuevos con `actionable` deliberado — el guard de idempotencia y el cupo agotado
  NO ofrecen reintento; sólo la caída del proveedor sí.
- **Tres hallazgos salieron de mirar los frames, no de los gates:** el drill volcaba 91 URLs en un
  muro de ~5000px sin scroll interno (expulsaba de pantalla la lista que el operador venía
  recorriendo), su encabezado quedaba en 3.25:1 sobre el fondo de costura, y las cifras de salud
  flotaban sin ritmo sobre el ancho completo. Los cuatro gates de UI pasan (`ui:quality` 4.58/4.5).
- Se commiteó además un checkpoint de TASK-1310 (trabajo de Codex que estaba sin commitear) cerrando
  10 errores de typecheck que dejaban el árbol rojo y bloqueaban el gate de cualquier trabajo
  paralelo. Esa task **sigue `in-progress`**: el checkpoint no la declara cerrada.

## 2026-08-08 — TASK-1310: surfaces cliente SEO para Grupo Berel (code complete local)

- Se construyeron las tres direcciones aprobadas como una familia: dashboard `masterDetail`
  `/growth/seo`, quadrant 360 SEO×AEO y report artifact `/growth/seo/report` con render web + print.
- El report agrega `modelFromSeoReport` sobre el mismo `ReportArtifactModel` del AEO; no duplica scoring,
  no expone costos/provider snapshot y mantiene `clientPortal`/`attachment` público-safe.
- Grupo Berel quedó verificable con assignment SEO activo y gate `growth.seo.report.read_client` scope `own`.
  GVC local desktop + mobile pasó sin errores de consola, página, hidratación ni HTTP; el desktop no tiene
  findings axe. Los warnings mobile del shell global y el rollout staging/prod quedan declarados en
  `docs/tasks/in-progress/TASK-1310-growth-seo-client-dashboard-report-artifact.md`.
- GCloud/ADC y proxy PostgreSQL renovados/verificados. Lint, 28 tests focales, task lint y reachability
  pasan. No se ejecutó build completo para proteger recursos; no hubo push/deploy.

## 2026-08-07 — Growth SEO: pantalla ancla Rendimiento + Historical Data Platform (TASK-1307 + TASK-1655)

- **`/admin/growth/seo/performance` (tab Rendimiento) COMPLETA** — la feature ancla de EPIC-022: chart
  hero ECharts (primer consumer del stack; decisión de librería tomada acá y heredada por el módulo) con
  eje de posición invertido declarado en palabras, meta top-3, dataZoom, colorblind-safe por forma,
  cobertura real declarada ("N de M días con medición"); banda KPI `MetricTrendCard`; tabla
  `DataTableShell` con Δ30d invertido + sparkline + drill; set compartible en `?urls=`/`?keywords=`.
  Readers nuevos `readSeoPerformance`/`readSeoPerformanceCatalog` con parity (lane + MCP tools mismo PR)
  y **fallback de fuentes por cobertura** (◑ exacta ↔ ● medida, nunca promediadas). GVC premium: rubric
  enterprise pass, ui:quality 4.56/4.5. Primitives nuevas: `CustomTabsNav` (@core), `SurfaceRecipe.plane`,
  `AppECharts`.
- **Ronda de mejoras post-cierre (revisión product-design + seo-aeo, mismo día)** — presets de
  comparación data-driven desde `seo_keyword_sets`; "Lectura del período" (insight cruzado de los 4 KPIs:
  demanda vs ranking vs erosión de CTR/AIO, sólo cuando el patrón es inequívoco); marcadores de AI
  Overview desde `serp_features` (sólo serie ◑, puente SEO↔AEO); rango 365 días; granularidad
  Diario/Semanal (default semanal >120 días medidos); métrica integrada al selector; affordance visible
  de drill; bandas de updates confirmados de Google (registro curado `algorithm-updates.ts`). Fix del
  primitive `MetricTrendCard`: con `invertY` el área se pintaba sobre la línea (`baseValue='dataMax'`).
- **Un solo header canónico para las tres pestañas de Search Visibility** — Resumen, Rendimiento y
  Keywords resolvían su chrome de tres formas distintas (y ninguna usaba la región `header` de la
  recipe, así que los controles flotaban sobre el lienzo gris). Ahora las tres usan
  `SurfaceRecipe header={<WorkbenchHeader kind='report'>}` con el mismo reparto: alcance en
  `secondaryActions`, frescura en `meta`, tabs en `supporting`. Keywords deja de duplicar los
  controles dentro del veredicto y de cada superficie de estado; Rendimiento baja la leyenda ●/◑ a
  la card del gráfico. Dos defectos de 390px corregidos: el tab activo recortado bajo las flechas de
  scroll y el período truncando su valor vigente.
- **El módulo SEO dejó de ser forward-only (TASK-1655, Slices 1-4)** — hallazgo de la ejecución: había 5
  días de GSC teniendo 16 meses en la API. Ahora: mirror `seo_gsc_history` en BigQuery (SoT del
  histórico; PG = ventana caliente) espejado por el batch diario, backfill por API ejecutado (**Berel
  487/487 días · 6,67M filas · 0 fallos; Efeonce 474 días** — su OAuth GSC conectado hoy), split de
  lectura por cobertura (180 días servidos desde BQ con ventana previa comparable, verificado), y semilla
  histórica de rank vía `historical_serps` (granularidad dispersa verificada en sandbox ANTES de gastar;
  4 keywords con historia real hasta 2025-08). Pendiente de 1655: export nativo GSC en la propiedad de
  Berel (permiso Owner, out-of-band) y promoción para que el espejo diario corra en el ops-worker real.
- **OAuth Search Console cableado en producción** — el flag llevaba ON pero el cliente OAuth existía solo
  en staging (`oauth/start` respondía `not_configured`; clase "flag sin cablear"). Vars en Vercel
  Production + redeploy; verificación del redirect URI al primer consent real.

## 2026-08-07 — Los tres modelos de servicio dejan de ser vocabulario y pasan a ser contrato (TASK-1663)

Al revisar quién debería declarar los objetivos de un cliente, el operador señaló que el módulo de
búsqueda tiene los mismos tres modelos de servicio que el estudio creativo: operado por nosotros,
co-operado, u operado por el cliente. Y que "el cliente contrata la herramienta" no es un cuarto
modelo, sino el tercero cruzado con una forma de entrega distinta.

Resultó que el vocabulario ya era canónico desde el modelo de negocio, y que el estudio creativo ya
lo había convertido en un contrato de datos real y desplegado. Lo que faltaba era que Greenhouse
tuviera el suyo: lo que había con nombre parecido pertenece a cotización, no a esto, y ningún módulo
de producto conocía el concepto.

La regla que hace que esto funcione, copiada tal cual del contrato existente: **el modo dice quién
responde, nunca quién puede.** Si otorgara permisos, cambiar una etiqueta comercial en una tabla
cambiaría en silencio quién puede comprometer gasto con un proveedor. Por eso el entregable más
importante de la tarea no es la tabla: es la prueba automatizada de que cambiar el modo no altera lo
que nadie puede hacer.

Quedan tres preguntas separadas que antes se confundían: quién puede actuar, quién responde, y quién
paga. Y una decisión deliberada: no hay valores por defecto por modelo. Cada acuerdo con un cliente
declara explícitamente sus responsabilidades, y la ausencia de declaración es un estado cerrado, no
una suposición. Un default parece cómodo y es justamente lo que hace que nadie revise el reparto
real — que en el modelo co-operado es distinto para cada cliente.

## 2026-08-07 — Growth SEO: el módulo responde tres preguntas, no una (TASK-1659…1662)

Cuestionar por qué la pantalla de keywords no se construyó como estaba especificada destapó algo
más grande que un desacuerdo de diseño: el módulo tiene **tres preguntas distintas** y sólo una
tenía superficie.

La construida contesta "de lo que ya tengo, ¿qué empujo?". Faltaban "¿dónde quiere estar el
cliente?" y "¿qué me estoy perdiendo entero?". Y no es que estuvieran postergadas: de las doce
tareas abiertas del programa SEO, ninguna las cubría.

La razón de fondo es que **Search Console es ciego por construcción a las dos últimas**. Si el
cliente no aparece en las primeras cien posiciones no hay impresiones, así que esa búsqueda
sencillamente no existe en sus datos. Ninguna pantalla construida sobre esa fuente va a poder
contestarlas nunca, por buena que sea.

Eso corrige algo que veníamos diciendo mal. Para una búsqueda donde el cliente ya aparece, el
volumen de mercado es un complemento y la medición propia es mejor insumo. Pero para una donde no
aparece, la medición propia no entrega nada, y el volumen y la dificultad pasan a ser la única
forma de contestar si vale la pena perseguirla y cuánto va a costar. Dejan de ser opcionales.

También apareció que media capacidad ya existía sin que nadie lo notara: el comando acepta
cualquier búsqueda, incluidas las que el cliente no rankea, y la captura diaria las mide igual. Lo
que faltaba era dónde declararlas. La capacidad estaba disponible desde un asistente y no desde la
pantalla — justo al revés del error habitual, y justo donde nadie ve el cupo ni el gasto que
compromete.

Cuatro tareas nuevas, en orden de dependencia: distinguir un objetivo declarado de una oportunidad
detectada, la pantalla para declararlos y seguir su avance, los datos de mercado, y finalmente qué
gana la competencia donde el cliente es invisible. Esta última es la de más valor comercial: es lo
que se le muestra a un prospecto en la primera reunión.

## 2026-08-07 — Growth SEO: Oportunidades de keywords, completa (TASK-1308)

La ruta `/admin/growth/seo/keywords` quedó cerrada. Nació declarada como superficie de UI
pura y terminó con backend propio, contrato programático y dos herramientas federadas al
gateway MCP, porque el command que la especificación daba por construido no existía.

Lo que ordenó todas las decisiones fue entender que **seguir una keyword no es guardar un
dato: es comprometer gasto que se repite**. La captura diaria de posiciones le paga al
proveedor por cada keyword vigente, en cada ciclo, hasta que alguien la saque. De ahí un
techo por sitio con rechazo explícito, el permiso separado del de mirar, el resultado
detallado keyword por keyword en vez de un "listo", y sobre todo la contraparte para dejar
de seguir — sin la cual el compromiso era permanente y el tope del set, un callejón sin
salida. Dejar de seguir no borra: cierra la ventana y conserva la medición histórica, que es
lo que después permite explicar una factura.

El mapa de oportunidad no usa los ejes que pedían el wireframe y la arquitectura. Volumen,
dificultad e intención de mercado no tienen fuente hoy, y priorizar por un volumen estimado
teniendo el Search Console propio es un error de método: la demanda ya está medida en la
búsqueda del propio cliente. Los ejes son posición y demanda medida, y el dato de mercado —
cuando llegue— será una columna y un filtro, nunca un eje.

La pantalla pasó por tres rondas de crítica de producto con todos los gates automáticos en
verde desde la primera versión. Lo que se corrigió salió de mirar el resultado real: no
servía en un teléfono, la selección múltiple podía gastar sobre keywords que ya no estaban a
la vista, la zona destacada del mapa se contradecía con su propia leyenda, y la fecha de
corte de los datos había desaparecido en un rediseño intermedio.

El permiso del gateway obligó a decidir algo que va más allá de esta pantalla. Se había
declarado un permiso por cada acción; se cambió a uno por dominio de escritura, porque una
lista de permisos por acción termina siendo una copia mal mantenida —editada a mano en el
directorio de identidad— del registro de permisos que ya vive dentro del producto, y las dos
listas divergen. La regla quedó escrita: un permiso por clase de riesgo, no por acción. Su
consecuencia práctica es que la próxima escritura de este dominio ya no toca el directorio de
identidad, que era justo la fricción que hace que una herramienta se quede sin publicar.

Al ir a entregarle ese permiso al llavero que usan los asistentes apareció lo que de verdad
importaba: por ese camino el actor es la máquina, no la persona, así que el permiso del
directorio de identidad es la **única puerta de toda la cadena que depende de quién eres tú**.
Entregarlo al llavero compartido —que tiene cualquiera del equipo que se conecte— habría dado
poder de comprometer gasto a todo el tenant, incluido quien en el portal no puede hacerlo, y
sin que nada fallara: simplemente habría empezado a funcionar para todos. No se hizo, y quedó
escrito como prohibición explícita, porque el día que alguien vea el error de permiso la
tentación va a ser exactamente esa. La única otra herramienta que gasta dinero tampoco está en
ese llavero.

Estado: código completo y verificado, permiso creado en el directorio de identidad con
verificación de que ningún permiso vecino se perdió. Las dos herramientas quedan publicadas y
cerradas con llave a propósito: abrirlas necesita un llavero con entrega revocable por persona,
que es trabajo ya planificado aparte. Queda publicar el despliegue del gateway.

## 2026-08-07 — Autenticación local Gcloud con Playwright

Se agregó `pnpm gcloud:auth:playwright` y la skill espejo `greenhouse-gcloud-auth-playwright` para renovar bajo solicitud los dos carriles de Google Cloud
(`gcloud auth login` y ADC) usando Playwright como navegador visible, con verificación final mediante el
preflight canónico. La credencial local se configura con `pnpm gcloud:auth:playwright:setup` en `.auth/`
ignorado por Git y protegido con permisos `0600`; no se habilitó scheduler ni ejecución automática.

## 2026-08-07 — Capacitación HubSpot ANAM · deck y material operativo

Se alineó el deck de 26 láminas con la pauta recibida por Outlook y el caso canónico de ANAM: objetos y
asociaciones, Growth/Renovación, Service/Ticket, dashboards, estados de madurez, Breeze, Meeting Notetaker,
handoff de los tres intents y ejercicio integrado. Se dejaron el PDF/PNG derivado en `.captures/` y el
runbook/handout como fuentes operativas; no se modificó la configuración live de HubSpot.

## 2026-08-06 — Cockpit SEO Overview (TASK-1306)

Nueva superficie operador `/admin/growth/seo`: la puerta de entrada del módulo SEO y la casa de
la sección "Search Visibility". Muestra los 4 KPIs medidos de Search Console (con la posición en
semántica invertida: bajar de número es mejorar), la evolución de visibilidad, la salud técnica
del sitio, los movimientos de la semana y el cruce honesto con el AEO Grader.

Codifica el contrato de honestidad del módulo: sin Search Console no hay panel (aviso accionable,
nunca ceros), medido y estimado se marcan distinto y jamás se promedian, cada región del panel
degrada por separado diciendo "Pendiente: {razón}", y sin ventana anterior comparable no se dibuja
variación en vez de inventar un 100%.

Se expone la MCP tool `get_seo_overview_kpis` en el mismo cambio, así que Nexa y el lane ecosystem
consumen exactamente el mismo cálculo que la pantalla.

Code complete; el despliegue y la migración del viewCode en staging/producción quedan pendientes.

## 2026-08-06 — TASK-1304: site audit OnPage (queue+poll) + backlink snapshot (code complete, schedulers pausados)

- **Ciclo async OnPage en 2 fases**: `queueSiteAudit` (gate de costo que SÍ consume el cupo
  mensual de audits + guard anti doble-encolado sin gasto) crea la task y persiste el run
  `running`; `collectSiteAuditRuns` poll-ea con claim `FOR UPDATE SKIP LOCKED` y materializa
  run + findings + outbox **en la misma transacción** (exactly-once por construcción). Mapeo
  honesto: 0 findings = `succeeded` (sitio limpio) ≠ `degraded` (parcial) ≠ `failed` (0 páginas
  o task colgada >24h). Findings desde un **allowlist curado** de checks OnPage (true=problema).
- **Backlink snapshot semanal**: `summary/live` (rank 0–100) + `bulk_new_lost`; idempotente por
  `(target, capture_date)`; `partial` honesto si el delta falla. `toxic_share` = spam score del
  perfil entrante / 100 (proxy documentado).
- **Parity en el mismo PR**: readers `readSiteAuditReport`/`readBacklinkProfile` + lanes ecosystem
  + MCP tools `get_seo_site_audit_report`/`get_seo_backlink_profile`; signal
  `seo.audit.stuck_tasks` (6h warn / 30h error = el collect no corre); mirrors BQ
  `seo_site_audit_history`/`seo_backlink_history` (tablas creadas).
- **Smoke E2E con dinero real** (~USD 0.05, efeoncepro.com): crawl 10 págs → health 93.41,
  60 findings; backlinks 15 ref domains / 455 links / rank 44. **Gotcha cazado en vivo**: el poll
  `summary` es POST con id en el BODY — la variante por path responde 200 sin tasks (fix + guard).
- **Rollout pendiente**: 3 Cloud Scheduler (`ops-seo-audit-enqueue`/`-collect`/`ops-seo-backlink-capture`)
  nacen PAUSADOS en `deploy.sh`; falta push + deploy del worker + despausar (enqueue antes que collect).

## 2026-08-06 — TASK-1303: captura diaria de rankings + reader de evolución (backend de la pantalla ancla)

- **`captureRankSnapshot` + batch ops-worker + mirror BQ + `readRankEvolution` + signal + MCP tool**:
  la serie diaria de posiciones exactas (DataForSEO SERP, depth 20 + AI Overview async) queda
  code-complete con gate de costo + **spend fence** (re-consulta el gate cada 10 llamadas — cierra
  la deuda medida por TASK-1300 de 3× de sobregiro), idempotencia sin gasto (pre-check antes del
  provider; el trigger de 1299 prohíbe DO UPDATE → `ON CONFLICT DO NOTHING`), y el ledger de gasto
  escrito solo por el transporte.
- **`enforceSeoRunEntitlement` gana `consumesAuditAllowance`** (default true): el rank capture no
  crea audit runs — un org con el cupo de audits agotado ya no queda con la serie diaria congelada.
- **Cloud Scheduler `ops-seo-rank-capture` (05:00 CLT) nace PAUSADO** declarativo en `deploy.sh`;
  dataset BQ `greenhouse_growth_analytics` + tabla `seo_rank_history` creados. Rollout pendiente:
  push + redeploy ops-worker + despause tras verificar gate de costo en staging (runbook
  `docs/manual-de-uso/growth/operar-captura-rankings-seo.md`).
- Parity MCP-first: tool `get_seo_rank_evolution` + lane
  `/api/platform/ecosystem/growth/seo/rank-evolution` en el mismo PR (patrón TASK-1645).

## 2026-08-06 — Efeonce deja de ser cliente de sí misma: rol comercial corregido

- **`EO-ORG-0007` (la entidad legal operadora) tenía `organization_type='client'`**, herencia del
  space de cliente de marzo 2026. La exponía en 5 readers que filtran `IN ('client','both')` sin
  consultar `is_operating_entity` — salía primera de 17 en `/finance/clients` — y
  `resolveFinanceClientContext` la aceptaba como cliente facturable, con la misma org como emisor
  fiscal. Daño consumado: 0 income, 0 contratos, 0 usuarios de portal.
- **Nueva puerta canónica `scripts/commercial/reset-organization-commercial-role.ts`**: baja el rol
  a `'other'` vía `upsertCanonicalOrganization`, nunca SQL directo. Existe porque
  `deriveOrganizationType` es **monótona** (nunca degrada un rol adquirido), así que ninguna
  llamada normal puede bajar el tipo; el script declara `currentType='other'` explícitamente y
  aborta si el lifecycle implica rol real o si hay income. `remediate-half-baked-orgs.ts` no
  servía: sólo cubre el drift contrario.
- **Verificado tras el cambio**: `is_operating_entity` y los 2 `module_assignments` intactos, y el
  canary SEO contra producción sigue dando `hasModule=true tier=contracted`. El dogfooding no
  dependía del tipo.
- **Contrato semántico escrito** en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` §Organization
  Types: `organization_type` es un **rol comercial**, `'other'` significa **sin rol comercial**
  (no "sin clasificar"), los tres ejes son ortogonales (identidad legal / rol comercial /
  capabilities), y **NUNCA** se agrega un valor de identidad al enum — ya se intentó y quedó una
  rama muerta contra `'efeonce_internal'`, que es un `tenant_type` de usuarios.
- **Follow-ups creados**: `TASK-1648` (guard por flag en los 5 readers), `TASK-1649` (el `space` y
  `client_profile` heredados, con inventario antes de tocar), `TASK-1650` (emisor legal de
  cotizaciones compartidas: query a columnas inexistentes tapada por un `catch` mudo).

## 2026-08-06 — Search Visibility 360 operable por MCP en producción (TASK-1645 + TASK-1647 complete)

- **Release `develop→main` `70e912056273`** (PR #177, `release_id=70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`,
  run `31058032196`, manifest `released`, workflow 10m51s, watchdog `drift_count=0`). Batch de 355 commits /
  221 archivos de código / 14 migraciones: EPIC-022 SEO completo (1299/1300/1301/1302/1305/1645), EPIC-028
  Globe (1629/1630/1641/1586), identity 1616 + 1631 Slice 0, payroll 1630, Nexa 1182, EPIC-040. Pasó a la
  primera sin `bypass_preflight_reason`: merge canónico `-X ours` antes del PR, marker `[release-coupled: …]`
  en el squash y `playwright.yml` disparado sobre `main` antes del dispatch.
- **`GROWTH_SEO_ENABLED=true` en Vercel Production** + redeploy `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`. El flag es
  multi-runtime: ya estaba ON en el `ops-worker` (materializer GSC) y ahora también gatea el lane ecosystem.
- **Canary del provider contra producción**: Berel `domainQuadrant=riesgo` (50 keywords, AEO 44.5), Efeonce
  `contracted` con `no_seo_data` honesto, deny anti-oracle `404`.
- **Provider habilitado en `mcp.efeonce.org`**: `efeonce-mcp` `76cb121`, workflow `31059346243`, revisión
  `efeonce-mcp-gateway-00012-dkj` con el token como secret ref de Cloud Run. El secreto se había creado sin
  ninguna binding IAM; se le otorgó `secretAccessor` scoped al SA del gateway. Front door: health 200,
  protected-resource metadata 200, `POST /mcp` anónimo 401 con challenge.
- **Smoke MCP autenticado por `mcp.efeonce.org` VERDE**: `scripts/oauth-canary.mjs` extendido con las tools
  SEO (`MCP_CANARY_SEO_ORGANIZATION_ID` + `MCP_CANARY_SEO_DENY_ORGANIZATION_ID`); con token Entra real
  (authorization-code + PKCE) sobre el scope base `efeonce.mcp.read` devolvió `initialize 200`,
  `seoEntitlementStatus 200`, `seoVisibility360Status 200`, **`seoDomainQuadrant: "riesgo"`** (el quadrant
  real de Berel por el front door público) y `seoDenyFailedClosed: true`. Exige login interactivo → paso
  asistido por humano, no automatizable en CI.

## 2026-08-05 — Provider Greenhouse-SEO federado en el gateway MCP (TASK-1647, code complete)

- **Provider `greenhouse-seo` + 3 tools federados en el repo `efeonce-mcp`** (main, commits `a53b77f`+`4870e90`):
  adapter delgado fail-closed default OFF, scope base `efeonce.mcp.read`, 6 tests + canary e2e committeado.
  Consumer sister-platform `EO-SPK-0004` + binding `EO-SPB-0004` provisionados en greenhouse
  (`scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`; token en Secret Manager
  `efeonce-mcp-gateway-greenhouse-token`). `GROWTH_SEO_ENABLED=true` aplicado en Vercel staging + redeploy.
- **Canary e2e verificado por HTTPS real** (provider del gateway → lane staging → readers → PG): Berel con su
  quadrant real `domainQuadrant=riesgo` + 50 keywords + AEO 44.5 · entitlement Efeonce `contracted` 8/$50 +
  `no_seo_data` honesto · deny anti-oracle 404 por la cadena completa.
- **Enable en `mcp.efeonce.org` gated por el release prod:** greenhouse PROD aún no tiene el lane; la secuencia
  de cierre (release develop→main → flag Vercel prod → env del provider en el gateway Cloud Run + deploy
  dispatch → smoke por `mcp.efeonce.org`) queda documentada en TASK-1647.

## 2026-08-05 — Efeonce provisionada como org own-brand del 360 (dogfooding)

- **Decisión de modelado:** la agencia se trackea como su propio cliente sobre la org canónica `EO-ORG-0007`
  (Efeonce Group SpA, `is_operating_entity=true`) — sin org especial paralela.
- **Quedó provisionado:** assignment `cpma-efeonce-seo-own-brand` (`seo_v1`, `contracted`, nota `own_brand`),
  target `seot-efeonce-own-brand` (`efeoncepro.com`, CL/es) y los 4 perfiles del grader ligados. Script
  idempotente committeado `scripts/growth/provision-efeonce-own-brand-seo.ts` (patrón commit + verificación con
  chokepoint) como plantilla para provisionar otras orgs.
- **Pendientes:** conectar la propiedad de Google Search Console (segunda lente del 360) y el merge/dedupe del
  registro en HubSpot.

## 2026-08-05 — ISSUE-142: los dos formularios públicos del AEO registran consentimiento a una política que nunca se mostró

- Al cerrar `TASK-1327` quedó anotado "confirmar, no asumir" sobre un `consent.checkboxes` vacío. Confirmado
  contra producción: **es un hueco de cumplimiento (Ley 21.719)**, no una decisión de diseño.
- **La cadena:** las definiciones publicadas de `ai-visibility-grader` (landing de Think) y
  `efeonce-aeo-diagnostic` (`/aeo-2/`) traen `checkboxes: []` **y sin `noticeText`** → `renderConsent()` retorna
  `null` y no pinta nada en pantalla; pero el renderer envía `consent: true` igual, porque
  `(checkboxes ?? []).length === 0` cuenta como otorgado. El gate server-side existe y es correcto
  (`commands.ts:404-406`) — recibe un `true` fabricado por el cliente. La submission queda con
  `consentPolicyVersion` afirmativo. **El registro es peor que un vacío: documenta algo que no ocurrió.**
- **No es falla del motor Growth Forms:** auditados los 5 formularios públicos, **3 tienen su bloque de consent
  correcto** (`efeonce-lead-gen-web`, `efeonce-seo-diagnostic`, `efeonce-web-agentica-ebook`). Los dos afectados
  son justo los del AEO: se publicaron sin él y el fallback del renderer lo volvió silencioso en vez de ruidoso.
- **Nada se aplicó.** Publicar texto legal en un formulario público live es decisión de operador + legal. El issue
  documenta la contención, el fix de las dos definiciones, el fix del bug class (que publicar un form sin bloque
  de consent **falle**, en vez de registrar consentimiento inventado) y el destino de los leads ya capturados.
- `TASK-1246` no puede declarar su sign-off legal cumplido mientras `ISSUE-142` siga `open`; queda cruzado en
  ambas direcciones. Bug class al motor: `EPIC-040` / `TASK-1255`.

## 2026-08-05 — TASK-1327 `complete`: la landing pública del lead magnet está live y verificada en runtime

- `TASK-1327` (landing `think.efeoncepro.com/brand-visibility` + embed del form gobernado) cerrada con
  **verificación en runtime, no lectura de docs**: HTTP 200 con el `<greenhouse-form>` real
  (`formKey 69cd5269…`, `surface=fhsf-ai-visibility-grader`), y `GET /api/public/growth/forms/<formKey>` contra
  **producción** devolviendo 200 con los campos del intake, **Turnstile `required`** con site key real y
  `consentPolicyVersion = ai-visibility-grader-consent-v1`. EPIC-020 queda en **49 childs: 33 `complete`,
  16 abiertas**.
- **Lo que NO se cerró con ella:** el smoke E2E productivo del loop completo sigue siendo de `TASK-1246` (gate de
  readiness), y `TASK-1335`/`1336` siguen `in-progress` por mérito propio — se les agregó delta de impacto cruzado:
  ya no bloquean una landing pendiente, sino su propio endurecimiento.
- ⚠️ **Hallazgo para el sign-off legal:** la definición publicada del form trae `consent.checkboxes` **vacío** —
  hay versión de política pero ningún checkbox renderizado. Puede ser por diseño o ser un hueco de cumplimiento;
  queda anotado como input obligatorio de `TASK-1246`, sin asumir cuál de las dos.
- **Corrección de una recomendación previa:** se había sugerido cerrar también `TASK-1321` por "superseded".
  Es falso: `/aeo-2/` submit → grader → email con PDF + dedupe de HubSpot es una **capacidad propia** (segunda
  superficie self-serve), con 8 criterios de aceptación sin cumplir y dos flags apagados
  (`GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED`, `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`). Sigue `in-progress`.

## 2026-08-05 — Registro de epics reconciliado: EPIC-040 nace, gate `epic-child-parity`, 193 childs huérfanas al descubierto

- **El bug class:** el campo `Epic:` de una task y el `## Child Tasks` de su epic son dos escrituras que nada
  reconciliaba, así que divergían en silencio y el epic reportaba un avance que no era el suyo. `EPIC-020` decía
  **"12/13 childs complete, sólo falta TASK-1246"** mientras 25 tasks se declaraban suyas fuera de la lista.
  Conteo canónico real tras reconciliar: **49 childs, 32 `complete`, 17 abiertas** — no una.
- **Gate mecánico nuevo `epic-child-parity`** en `pnpm epic:lint` (`scripts/ci/ops-artifact-lint.mjs`): barre las
  ~1.720 tasks del corpus, lee el epic declarado y verifica que el id aparezca en su `## Child Tasks`; también caza
  tasks que declaran un epic inexistente. **Primer hallazgo: 15 epics con drift, 193 tasks sin listar** (EPIC-028:
  89 · EPIC-019: 21 · EPIC-013: 20 · EPIC-007: 14). Severidad `warning` por defecto — con 193 violaciones
  preexistentes, `error` dejaría el lint rojo por deuda ajena; se enciende con `--strict-child-parity` (exit 1),
  pensado para verificar un epic reconciliado y para promoverse a gate de CI cuando el backlog esté limpio.
  Test: `scripts/ci/epic-child-parity.test.ts` (8 casos, incluye guardrail contra el repo real).
- **`EPIC-040` — Growth Public Forms Engine (nuevo).** El motor de formularios no tenía epic dueño: **21 tasks**
  con `Epic: none`/`optional`, y cuatro colgando de EPIC-020 sólo porque el AEO fue su primer consumer. El AEO
  **usa** el motor; no es su dueño. Frontera declarada: EPIC-040 = motor · EPIC-035 = distribución del bundle ·
  EPIC-020/011/019 = consumers. `TASK-1255` (PII Ley 21.719) es la de mayor consecuencia del epic.
- **Reasignaciones aplicadas en el campo `Epic:` de la task** (que es lo que el gate lee — editar sólo los epics
  habría dejado el drift intacto): 21 tasks del motor → `EPIC-040` (incluidas `TASK-1335`/`1359`, ex EPIC-020);
  `TASK-1326` → `EPIC-019`; `TASK-1266`/`1267`/`1279`/`1286` → `EPIC-021` (declaraban EPIC-020 siendo hijas de 021).
  EPIC-020 conserva los formularios que el AEO usa (`1251`/`1257`/`1263`/`1296`/`1298`/`1327`/`1336`).
- **Correcciones de estado del programa AEO, verificadas en runtime:** `TASK-1276` (cockpit operador) está
  `complete`, no `to-do` — el "gap #1" que el doc de programa declaraba ya no existe; y **la cara pública
  self-serve está LIVE** (`think.efeoncepro.com/brand-visibility` HTTP 200 + definición del form 200 en producción
  con Turnstile `required`), así que `TASK-1246` dejó de ser "construir el lanzamiento" y su residuo es el smoke
  E2E + el gate de gobernanza. `EPIC_ID_REGISTRY` tenía `EPIC-021` como `to-do` estando `complete`.
- Docs: `docs/epics/AEO_PROGRAM_STATUS.md` § Delta 2026-08-05 (b) (método, 4 hallazgos, falsos positivos
  descartados, decisiones dejadas abiertas), `EPIC-020`/`021`/`022`/`019`/`040`, `README` y registry de epics.
- **Pendiente conocido:** `pnpm ops:lint --changed` reporta 6 errores `ui-wireframe-contract` **preexistentes**
  en `TASK-1231`/`1232`/`1256`/`1259`, expuestos sólo porque editar su campo `Epic:` las volvió "changed". No se
  fabricaron wireframes para apagarlos (son tasks ya `complete`; crear docs UI de relleno viola el contrato de
  diseño). Requieren cleanup con su dueño. Los otros 12 epics con drift de parity quedan fuera de alcance: cada
  task necesita el juicio de su dueño para decidir si entra a la lista o si el campo `Epic:` está mal.

## 2026-08-05 — Cloud Infrastructure doc reestructurado: temáticos + HISTORIAL + router stub (TASK-1646)

- `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (1340 líneas, 24 `## Delta` apilados) se particionó siguiendo el
  precedente ui-platform: **`docs/architecture/cloud-infrastructure/`** con 11 docs temáticos de SÓLO estado
  vigente (README/TOPOLOGY/CLOUD_SQL/BIGQUERY/STORAGE_BUCKETS/CLOUD_RUN/SCHEDULING/VERCEL/SECRETS/CICD_WIF/
  SECURITY) + `HISTORIAL.md` con los 25 deltas verbatim y anotaciones de supersede. El path original quedó como
  router stub (33 líneas) — ningún referrer se rompe. ADR nuevo:
  `GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md` (indexado en `DECISIONS_INDEX`).
- Contradicciones resueltas contra runtime al separar: la topología compartida staging/prod es **canónica** (no
  "por ahora"); los inventarios estaban congelados en la auditoría 2026-04-23 — hoy son **46 scheduler jobs** del
  ops-worker (no 16), **8 crons Vercel** (no 13; el event bus ya no depende de Vercel) y **7 workflows de deploy**
  (no 3). Los inventarios nuevos declaran as-of + source of truth (`deploy.sh`, `vercel.json`, workflows) para que
  el drift futuro sea detectable; la re-auditoría live completa sigue en TASK-127.
- `pnpm docs:closure-check` ya no emite `architecture_doc_monolith` para ese path; referrers vivos con anclas
  `§4.9`/`§5` actualizados a los temáticos.

## 2026-08-05 — Growth SEO (EPIC-022): registry de familias DataForSEO + ledger de gasto (TASK-1300)

- El cliente DataForSEO deja de estar candado a `/v3/serp/`: allowlist cerrado de 5 familias, con
  `normalizeEndpoint(endpoint, family)` table-driven y un transporte único (`postDataForSeoTask`).
  `postDataForSeoSerpLiveAdvanced` delega sin cambiar contrato — el AEO pasó sin tocar ninguno de sus archivos.
- **Circuit breaker por familia**: una familia caída no arrastra a las demás pese a compartir credenciales.
- **`seo_provider_spend_daily` pasa a ser la fuente ÚNICA de presupuesto.** Lo escribe el transporte en cada
  llamada cobrada, así que una captura no puede gastar sin quedar contabilizada; `enforceSeoRunEntitlement` dejó
  de sumar el `provider_cost` de los snapshots, que contaba el mismo gasto dos veces. Ese hook estaba declarado
  en TASK-1301 pero sin dueño desde que esa task cerró.
- Endurecido sobre la spec: `organizationId` obligatorio por tipo en las familias que gastan, y el transporte
  **lanza** si el runtime no registró el contador — gastar sin contabilizar se descubre en la factura.
- **`code complete, rollout pendiente`: la cuenta DataForSEO tiene USD 0,90**, así que el smoke por familia está
  bloqueado por saldo. Sanity live 7/7 contra PG real; suite 10130/0 + build prod verdes.
- Hallazgo transversal: el patrón `BEGIN`/`ROLLBACK` de los sanity scripts **no es transaccionalmente seguro**
  (el helper toma una conexión del pool por llamada). Este se reescribió sobre `withGreenhousePostgresTransaction`;
  verificado que ningún otro sanity del repo lo usaba (el de 1301 ya limpiaba en `finally`); la regla de decisión quedó canonizada en `SQL_DATE_MATH_AGENT_INVARIANTS`.

## 2026-08-05 — Growth SEO (EPIC-022): serie GSC propia + striking-distance (TASK-1302)

- Google Search Console deja de ser read-through: `greenhouse_growth.seo_gsc_daily` materializa query×page por
  `capture_date` y la serie sobrevive la ventana de 16 meses de Google. Anclada a `organization_id` (grano de la
  propiedad verificada) y no a `seo_target_id`, que tiene grano más fino que GSC no particiona.
- El primitive GSC compartido ganó paginación real (`startRow` aditivo): antes cortaba en 100 filas **sin señal**,
  lo que sobre una serie histórica es pérdida permanente. Si se topa el techo se declara `truncated` + warning.
- `readKeywordOpportunities`: striking-distance 8–20 con posición ponderada por impresiones, umbral por percentil
  de la propia org y score en **clics incrementales estimados** con curva de CTR derivada de la propia
  organización — no depende de datos de mercado, así que aterrizó sin esperar a TASK-1300.
- Batch diario en Cloud Scheduler + ops-worker (nunca Vercel cron), resiliente per-org. Job creado **pausado** y
  `GROWTH_SEO_ENABLED` default OFF: `code complete, rollout pendiente`.
- Sanity live 9/9 contra PG real destapó un bug de alias SQL↔TS que ningún mock atrapaba. Suite 10102/0 + build
  prod verdes.
- **Rollout ejecutado el mismo día: LIVE.** 26.192 filas reales de `sc-domain:berel.com`, scheduler activo, 375
  keywords en striking-distance. El rollout destapó dos defectos que ningún test podía ver: (a) el ops-worker no
  tenía NINGUNA variable de Search Console —TASK-1302 fue su primer consumer del reader GSC— y prender el flag
  habría degradado todas las orgs en silencio (bug class ISSUE-113); (b) **GSC no publica D-1**, así que apuntar a
  "ayer" habría escrito días vacíos para siempre sin volver por ellos → ventana móvil de 5 días, que de paso
  corrige el consolidado tardío de Google. Una sola instancia Cloud SQL y un solo ops-worker compartido
  staging+prod ⇒ la capacidad quedó viva sin promoción a `main`.

- **Cierre documental (3 subagentes).** Capa funcional (`docs/documentation/growth/` v1.1) + manual de operación
  nuevo (`operar-serie-search-console.md`, por CLI/logs: verificar el job, forzar corrida, leer el batch,
  re-materializar un día, rollback). Las tres trampas del rollout canonizadas en
  `OPS_RELIABILITY_AGENT_INVARIANTS.md` + `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (su Delta 2026-04-15 decía
  "por ahora" sobre la topología compartida del ops-worker; quedó marcado superseded — es canónica). Los hallazgos
  de oficio (GSC no publica D-1, posición ponderada por impresiones, striking-distance sin datos de mercado)
  entraron a la skill `seo-aeo` marcados como **medidos**, y a `seo-aeo-practice` como segundo diagnóstico gratis.
- **Dos deudas con dueño:** `CLAUDE.md` llegó al 100% de su presupuesto (34.998/35.000) y bloqueó una invariante
  que quedó sólo en el companion → `## Delta` en TASK-1160, cuyo Slice 5 pasa a desbloqueante. Y la skill
  `seo-aeo` tiene su copia Claude fuera del repo (sin versionar): le faltaban 2 referencias, incluida la de la API
  de GSC; el gate `skills:mirrors` no puede ver ese drift porque la skill no está en su manifiesto.

## 2026-08-05 — SEO operable por MCP (TASK-1645, code complete)

- Lane ecosystem machine-authed + 3 MCP tools read-only (`get_seo_keyword_opportunities`,
  `get_seo_visibility_360`, `get_seo_entitlement`) sobre los primitives gobernados del módulo SEO;
  entitlement per-org con 404 anti-oracle y degradaciones honestas passthrough.
- Smoke live del lane con quadrant real; rollout pendiente: smoke e2e HTTP con binding, flag en Vercel y
  federación al gateway `mcp.efeonce.org` (TASK-1647 creada). Todo reader SEO futuro nace con su tool
  (criterio en 7 tasks).
