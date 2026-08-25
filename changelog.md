# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al

## 2026-08-25 — La metodología de priorización editorial SEO queda escrita, y aparece un motor que ya existía sin usarse

- **La lección más cara: Greenhouse ya calculaba lo que se reconstruyó a mano.** `/admin/growth/seo/keywords` (`TASK-1308`) expone el mismo score de striking distance que el reader canónico `keyword-opportunities-reader.ts` (`TASK-1302`) — clics incrementales contra la curva de CTR de la propia organización, con la canibalización ya separada como consolidación y no como optimización. La capacidad estaba construida, la conexión de Search Console del cliente llevaba semanas acumulando, y nadie la había corrido para esa cuenta. Quedó como antipatrón: verificar no solo que la capacidad exista, sino que esté **habilitada para la organización** — la página está gateada por flag y por entitlement, así que «existe» y «está encendida para este cliente» son dos hechos distintos.
- **Se separaron dos carriles que se venían mezclando.** Striking distance contesta *qué página existente empujo*; el volumen de una herramienta externa contesta *dónde hay demanda que no capturo*. Usar impresiones de Search Console para descartar contenido nuevo es razonamiento circular: un tema sin contenido no puede aparecer en un filtro que exige estar rankeando. La regla previa de «no priorices por volumen de terceros teniendo GSC propio» quedó acotada a la priorización de páginas existentes, que es donde aplica.
- **Tres trampas de lectura de Search Console quedaron documentadas con medición.** La posición promedio no es interpretable sin un piso mínimo de impresiones, y el diagnóstico real es la brecha entre volumen estimado e impresiones entregadas. Con dimensiones consulta+página los sitelinks inflan los agregados: una query de marca sumaba 86.282 impresiones repartidas en 300 páginas. Y la curva de CTR se deriva del propio sitio, porque el benchmark de industria no describe un vertical donde la posición 1 rinde 4,25%.
- **Nuevo modelo operativo y nuevo runbook.** `SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` cubre el proceso de punta a punta —intake del sistema editorial del cliente, los dos carriles, respaldo de producto, producción con subagentes, entrega y medición— con el camino primario apuntando al producto y el proceso manual declarado como fallback. `producir-serie-de-briefs-seo.md` es el paso a paso de producir y depositar una serie de briefs en el sistema editorial de un cliente, incluida la sintaxis de encabezado desplegable y la regla de concurrencia.
- **El caso del cliente quedó en `docs/audits/seo/`** con su línea base medida, el backlog de los dos carriles y los defectos de arquitectura de su sitio ordenados por impacto. La recomendación de mayor retorno no requiere construir nada ni que el cliente toque su sitio: correr la superficie que ya existe.
- **La skill `seo-aeo` entró al repo por el lado de Claude.** Estaba versionada solo como `.codex/skills/seo-aeo` porque una sesión de Codex commiteó su copia; la de Claude vivía a nivel de usuario, fuera de git, y se habría perdido al cambiar de máquina. Ahora están las dos, con 24 de 27 archivos idénticos. Tres siguen divergiendo y necesitan fusión con criterio, no copia.

## 2026-08-24 — TeamBot deja de prometer una mención que Teams no soporta

- Un anuncio real a `EO Team` demostró que usar el ID del chat como identidad de `@todos` no funciona: Teams aceptó el mensaje, pero mostró `todos` como texto común y no notificó colectivamente.
- La capacidad oficial es más acotada: un bot puede mencionar personas explícitas en un chat grupal, pero no puede mencionar a todos. La causa no era idioma ni configuración del tenant.
- Se corrigieron las skills, arquitectura, invariantes, runbook y `TASK-716`. El diseño futuro solo admite `none` o `explicit_users`; también conserva las Adaptive Cards sin `activity.text` para evitar la burbuja duplicada.
- No se reintentó el envío. El soporte local especulativo de `--mention-all` fue retirado y no forma parte del runtime versionado.

## 2026-08-24 — Queda registrado que nadie puede darse de baja de un correo, y quién lo va a arreglar

- Se abrió el incidente que documenta el defecto: el enlace «Dejar de recibir estos correos» del pie **falla por los tres caminos posibles**, incluido el botón «Cancelar suscripción» que Gmail y Outlook muestran sobre el asunto. Ninguno da de baja a nadie.
- **No es algo que se rompió después.** La capacidad se cerró así: la task que la construyó quedó marcada como terminada con su propio criterio sin cumplir y sin la página de preferencias que había planeado. El endpoint existe y no lo usa nadie.
- Se creó la task que lo repara, con una decisión de diseño que vale nombrar: **hacer clic en el enlace no dará de baja de inmediato**, mostrará una confirmación. Los escáneres de seguridad de los correos corporativos abren los enlaces solos, así que un enlace que diera de baja al abrirse desuscribiría a gente que nunca lo tocó. El botón nativo del cliente de correo sí actúa directo, porque ahí la intención ya la expresó la persona.
- También deja de guardar permisos de baja que nadie puede usar: hoy la liquidación de sueldo genera uno que dura un mes y no aparece en ninguna parte.
- Tres tasks vecinas quedaron corregidas: los avisos de vacantes para el Banco de Talento —que serían la **primera suscripción voluntaria de verdad** del sistema— asumían que la baja funcionaba; el desalineamiento de la dirección de casa matriz dejó de ser deuda de una pantalla y pasó a bloquear todo el programa de correos; y el aviso de pagos a contractors quedó con una pregunta pendiente sobre a qué carril pertenece.

## 2026-08-24 — El rediseño de los pies de correo se revisó contra el sistema real, no contra su diseño

- **El botón de "darse de baja" no funciona hoy.** El enlace del pie lleva a una dirección que el servidor no atiende, y el botón propio que Gmail muestra arriba del correo tampoco: los dos fallan. Además el sistema agrega ese enlace **solo, por accidente**, a cualquier correo enviado a más de una persona. La liquidación de sueldo llega a generar un permiso de baja de 30 días que nadie ve nunca. Arreglarlo pasa a ser condición previa del programa.
- **La marca queda cerrada, no en discusión.** "Efeonce Greenhouse" no existe: Efeonce es la marca que lidera y Greenhouse es la plataforma, dos capas de la misma jerarquía y no dos opciones a elegir. Se corrigió el planteo excluyente que traía la task de marca, que ahora ejecuta la arquitectura ya aprobada en vez de reabrirla. Son cinco textos, ningún logo: el remitente, el tagline del pie, el texto alternativo del logo y los dos cuerpos de la invitación.
- **Los correos en inglés muestran parte del pie en castellano.** El diccionario en inglés no tiene sección de correos: apunta al español por atajo, y ni el compilador ni las pruebas lo notan. Ya se ve en toda liquidación a colaboradores fuera de Chile.
- **Los correos salen de dos lugares, no de uno.** Veinte tipos salen del servicio en la nube, seis salen del portal —los que uno espera en pantalla al apretar el botón— y tres salen de ambos. Para esos tres, actualizar un solo lado haría que el mismo documento llegue con dos pies distintos según si fue automático o reenviado a mano.
- **Los datos legales del pie todavía no tienen camino ni política de respaldo.** Se adoptó la conducta que ya usan los PDF: si la base no responde, se usa el dato de respaldo y queda registrado; el RUT se omite antes que inventarse. Y la dirección de casa matriz tiene tres versiones distintas en el sistema, con una decisión pendiente que bloquea a todo el programa.
- Se confirmó que el gobierno de la migración estaba bien: nada se cambia por herencia, cada tanda migra pocos tipos y cada una puede revertirse sola. También se corrigieron dos supuestos previos: el encabezado ya usa el logotipo de Efeonce en las treinta plantillas, y el pie sí tenía red de pruebas.

## 2026-08-24 — Revisar postulaciones ya no obliga a entrar y salir del Pipeline

- Application 360 permite pasar a la postulación anterior o siguiente de la **misma vacante y etapa**. La cola excluye archivadas y usa orden cronológico estable; no es un ranking y no consulta score, afinidad ni recomendaciones IA.
- Si hay una decisión, corrección o nota sin guardar, Greenhouse pregunta antes de cambiar de postulación. En móvil el contador se compacta y la pestaña padre activa se mantiene visible.
- Al volver por la pestaña `Pipeline`, Greenhouse recupera la postulación exacta incluso si quedó fuera del límite habitual, consume el foco temporal de la URL y deja la tarjeta enfocada. Si ya no existe, muestra una recuperación honesta en vez de seleccionar otra.
- El recorrido `1 de 2 → 2 de 2 → Pipeline` pasó Playwright/GVC en 1440 y 390 px, con View Transition compartida y cero errores de consola, página, hidratación o red.
- El contrato quedó incorporado en arquitectura y en las skills de Talent, Motion y GVC. La auditoría documental detectó que el snapshot del board aún puede incluir postulaciones archivadas; el delta no está listo para rollout hasta cerrar esa brecha.

## 2026-08-23 — Los tests contra base real dejan de fallar por pisarse entre ellos

- Los tests que corren contra la base de verdad ahora se ejecutan **de a uno**, no en paralelo: comparten una sola base con producción, así que correrlos a la vez hacía que se pisaran y fallaran sin motivo real.
- Cada archivo de test usa **su propio candidato de prueba** en vez de tomarlo de una bolsa común de tres, que era la causa de que tres archivos se estorbaran entre sí.
- Hay un comando nuevo para correrlos (`pnpm test:live`) que **sólo entrega credenciales de base**. Antes, la forma habitual de dárselas volcaba toda la configuración local al proceso y rompía quince tests de otros equipos que no tenían nada que ver.
- Dos fallas que engañaban ahora se declaran: un test saltado ya no se puede confundir con uno exitoso, y si falta el túnel a la base el comando lo dice de entrada en vez de fallar al final.

## 2026-08-23 — Quien no queda porque el cupo lo tomó otro ya no figura como rechazado

- El cierre de una vacante llena registra ahora **«sin selección»** con la causa «vacante completada», no un descarte. La diferencia no es de palabras: un descarte es un juicio sobre la persona, la deja fuera del Banco de Talento por defecto y **cuenta como rechazo en el análisis que mide si un proceso discrimina**.
- El operador ve **exactamente a cuántas personas afectaría** antes de confirmar, agrupadas por cómo entrarían. Quien está en pausa o es respaldo **no entra** salvo que se pida: una la dejó esperando alguien a propósito, y con la otra hay un compromiso abierto.
- Si el resumen cambió desde que se miró, el sistema **no deja confirmar**: estarías cerrando un grupo distinto del que aprobaste.
- El correo tiene su propio texto y su propio interruptor, así que se puede pausar un cierre masivo **sin silenciar** los correos de decisión individual. La frase «mantendremos tu perfil» aparece **sólo** si esa persona lo autorizó, verificado en el momento de enviar.
- Nada de esto está encendido todavía: el cierre y el correo nacen apagados, a la espera del sign-off de Talent y Privacidad.

## 2026-08-23 — Los follow-ups de Hiring quedaron vivos en producción

- El eje de desenlace, el vocabulario de seis etapas, el filtro de procedencia del archivo sintético, el callejón de intentos del assessment y el predicado único de «proceso activo» pasaron a producción en el release `709e15f6688e` (PR #206, 140 archivos, 5 migraciones).
- El monitor de equidad **sigue apagado a propósito**: su etapa por defecto quedó retirada por el contract nuevo, así que prenderlo hoy devolvería cero en silencio — y un cero silencioso en una métrica de equidad se lee como «no hay impacto adverso», que es lo contrario de lo que sabemos.
- Producción quedó verificada más allá del health check: cero errores nuevos en Sentry, 321 eventos de outbox publicados desde el despliegue sin ninguno atascado, y las seis etapas renderizando en el pipeline con sesión real.
- De paso se corrigieron dos instrucciones equivocadas de la propia documentación de release: la que verifica el worker de operaciones miraba una lista de rutas que ya no existe, y la receta del merge podía duplicar texto en los manuales sin que ninguna verificación lo notara.

## 2026-08-23 — Application 360 vuelve al pipeline de la vacante que corresponde

- La pestaña `Pipeline` ahora funciona como retorno contextual desde cualquier postulación: deriva la vacante desde `application.openingId`, en vez de caer en la vacante más reciente.
- La URL conserva el scope de vacante y, al regresar, el Kanban enfoca la tarjeta de origen sin aplicar filtros que oculten a otros postulantes.
- La tarjeta y el hero comparten una View Transition breve; reduced motion conserva el mismo destino y foco sin animación. La validación local pasó en 1440 y 390 px, sin errores de consola, página, hidratación ni red.

## 2026-08-23 — Cinco personas reales eran buscables en el Banco de Talento por una postulación que alguien había retirado

- «Postulación en proceso activo» pasó a tener **una sola definición** en toda la plataforma, y son **tres
  ejes, no uno**: el proceso no terminó (`decision`) **y** el registro no fue retirado de la vista
  (`archived_at`). Antes, once lugares distintos respondían esa pregunta mirando la **etapa**, cada uno con su
  propia lista escrita a mano.
- Preguntar por etapa fallaba por una razón concreta: **archivar devuelve la postulación a su etapa anterior**.
  Una postulación archivada volvía a verse «en Preseleccionado», así que seguía contando como viva. Medido: **5
  personas reales** figuraban como «en proceso activo» en el Banco de Talento —y por lo tanto buscables e
  invitables— únicamente por una postulación que alguien había archivado a propósito. Pasan a
  `needs_reconsent`.
- La señal de salud de la asignación de pruebas dejó de vivir en amarillo por datos de humo (`ISSUE-162`):
  contaba **13** postulaciones esperando, de las cuales **10 eran de prueba, archivadas**. Ahora cuenta **3**,
  que son las reales, y **reporta aparte** las 10 que excluyó — un filtro que no dice cuánto dejó fuera es
  indistinguible de un tope silencioso.
- Si ves un conteo de activas más bajo que ayer, es esto y no se perdió ningún dato: las postulaciones
  archivadas siguen completas, sólo dejaron de contarse como procesos vivos. Cuántas son se lee en
  `/admin/operations`.
- Un gate de CI rechaza que alguien vuelva a escribir la lista a mano, y una señal de confiabilidad detecta en
  runtime lo que el gate no alcanza a ver.

## 2026-08-23 — Los footers aprobados dejaron de depender de la imaginación del siguiente agente

- El mockup aprobado ahora es el punto de partida obligatorio para implementar footers: conserva jerarquía,
  espaciado, contraste, wordmark Efeonce, identidad legal, iconos sociales y reglas responsive.
- Los cinco perfiles visuales no borran la semántica: representan siete propósitos, y suscripción opcional no se
  confunde con marketing aunque compartan anatomía.
- La skill de email ya no infiere baja desde `broadcast`: unsubscribe y RRSS dependen de propósito y consentimiento.
- La revisión final endureció tipografía, jerarquía semántica, listas, tabla de policy, targets, foco y contraste en
  los cinco perfiles; los diez estados desktop/mobile quedaron sin overflow y GVC no registró errores runtime.
- Cada cohorte deberá probar Outlook Desktop Windows, Outlook Web, Gmail, un cliente WebKit e imágenes bloqueadas.
  El mockup sigue siendo diseño aprobado, no evidencia de envío, deploy o runtime.

## 2026-08-23 — Cuando el sistema intentaba mandar la prueba solo y se trababa, esa persona quedaba en un limbo que nadie veía

- Si la prueba la asignaba una persona y se bloqueaba, corregir la causa y volver a proponer alcanzaba. Si la
  iba a mandar el sistema solo, el intento quedaba registrado **reservando el lugar de esa persona en esa
  vacante** — a propósito, para que un error de configuración no le mande tres veces la misma prueba a alguien.
  Pero ese lugar reservado no tenía forma de liberarse, y mientras siguiera ahí la postulación **desaparecía de
  las listas de recuperación**: no porque estuviera resuelta, sino porque el sistema ya había anotado que lo
  intentó.
- Lo grave no era que fuera irreversible: era que **las tres superficies que debían delatarlo callaban a la
  vez**. La cola la excluía, la señal del panel era su espejo exacto, y la métrica que sí la contaba no movía
  la alarma y además caducaba a las 24 horas. A las 24 h el caso salía hasta de la evidencia mientras la
  persona seguía trabada.
- Ahora esas postulaciones aparecen en una lista propia y quien gobierna la prueba de la vacante puede liberar
  el lugar. Con dos condiciones que la plataforma verifica sola: **sólo se libera si hoy la prueba SÍ se
  mandaría** —liberar con la causa viva vuelve a bloquear en el acto y gasta uno de los tres intentos de
  recuperación de esa persona— y **tres recuperaciones por persona y vacante**, tras las cuales el caso pide
  revisión humana.
- Liberar **no manda ningún correo**, no borra el motivo del bloqueo y no devuelve cupo al tope de envíos de la
  vacante: ese tope cuenta correos que ya salieron, y liberar no des-envía nada.
- El panel distingue dos cosas que no son lo mismo: la que ya se puede destrabar **alarma**, y la que sigue
  bloqueada por una causa vigente **no** — avisar de algo que nadie puede arreglar todavía es la forma más
  rápida de que el equipo deje de mirar el tablero.
- **Todavía no está en producción.** El código está completo y verificado contra la base real; falta el
  release. Y de paso quedó abierto `ISSUE-162`: la señal de salud vive en amarillo por diez postulaciones de
  prueba archivadas, no por un defecto real.

## 2026-08-23 — Las trece etapas del pipeline quedaron en seis, y las que sobran ya no son etapas

- El recorrido de una postulación se describía con trece etapas, y cinco de ellas no decían _dónde está_ la
  persona sino _cómo terminó_: «seleccionado», «rechazado», «retirado». Dos preguntas distintas contestadas
  con el mismo campo. Ahora el recorrido tiene seis etapas y el desenlace vive en su propio eje.
- Otras dos, «calificado» y «revisión de cliente», se habían absorbido en «Evaluación» pero seguían existiendo
  por debajo: era el origen del bug que dejó quince vacantes con su política de pruebas bien configurada y
  ninguna disparando.
- El contract que retira los siete literales de la base **está escrito y revisado, y todavía no aplicado**:
  espera autorización. Hasta entonces el candado de seis vive en la aplicación y la base sigue aceptando trece.
- Un detalle que parecía poda y era corrección: el mapa de «etapas posteriores al gatillo» listaba «revisión de
  cliente» como posterior a «Evaluación», cuando el colapso la había metido **dentro**. Mandaba a revisión
  humana postulaciones que la reconciliación automática sí sabe recuperar.
- Y una deuda que se declara en vez de esconderse: el monitor de equidad medía su cubo terminal en una etapa
  que dejó de existir. En vez de devolver cero —que en una métrica de equidad se lee como «no hay impacto
  adverso»— ahora falla ruidoso, y no se prende hasta que se le apunte al eje correcto.

## 2026-08-23 — El dominio de Hiring reparado llegó a producción, y el reloj de retención con él

- Las cuatro correcciones del día estaban `code complete, rollout pendiente`: el eje de desenlace, el colapso de
  trece etapas a seis, el filtro de procedencia del Banco de Talento y el callejón del ledger de asignación de
  pruebas. Ninguna servía de nada mientras producción siguiera corriendo el código anterior. Ahora corren.
- Viajó dentro el fix de una regresión con implicación legal: el reloj de retención de la Ley 21.719 no
  arrancaba para `not_selected`, la población más grande del pipeline. No estaba viva porque producción todavía
  no podía escribir ese desenlace — **se habría vuelto viva en el mismo instante en que este release lo
  habilitó**. Por eso no podía quedar para el siguiente.
- Quedan tres migraciones escritas y revisadas que **no** viajaron: viven fuera de `migrations/` a propósito,
  porque una migración committeada y sin aplicar bloquea a cualquiera que corra `migrate:up`, incluido quien
  esté reparando un incidente. Corren después del release, en cadena, y cada una espera que el código del
  eslabón anterior esté desplegado.
- La lección que ordena esa cadena, y que ya costó un incidente: **«cero filas» no es «nadie lo escribe»**. Lo
  que decide si un valor es alcanzable es el contrato de la superficie desplegada, nunca el contenido de la
  tabla.

## 2026-08-22 — Mover a «Evaluación» ya no guarda una etapa distinta de la que muestra

- El tablero mostraba seis columnas sobre trece etapas del dominio, y tres de ellas se veían todas como
  «Evaluación». Soltar una tarjeta ahí guardaba `qualified`, mientras la automatización de pruebas vigilaba
  `shortlisted`: **quince vacantes tenían su política bien configurada y ninguna disparaba**, sin que en pantalla
  se viera nada raro. Dos candidatas reales cruzaron esa columna el 2026-08-19 y no recibieron su prueba.
- Ahora hay una etapa por columna. `qualified` y `client_review` se absorbieron en `shortlisted`, y el carril del
  tablero declara **una sola** etapa: la que lo titula es la que se escribe, así que ese error dejó de poder
  cometerse. Siete postulaciones reales se movieron con el cambio y quedan visibles en la cola de reconciliación
  de su vacante para que una persona decida si corresponde asignarles la prueba.
- El desk leído en inglés mostraba las seis columnas en castellano: heredaba los nombres del diccionario es-CL sin
  sobreescribirlos. Ya no.
- **«Preselección» en el correo al candidato y «Evaluación» en el tablero se conservan distintos a propósito.**
  Hacia afuera el registro es más suave, y decirle «Evaluación» chocaría con el correo del test, que ya dice
  «tienes una evaluación pendiente». Queda escrito con su razón para que nadie lo lea como error.
- Nada de esto está en producción todavía: allí mover a «Evaluación» sigue guardando la etapa vieja.

## 2026-08-22 — Archivar un dato de prueba dejó de marcarlo como «Cerrado»

- Archivar y cerrar eran la misma escritura, y no son la misma cosa. Cerrar significa que el proceso de una
  persona terminó **con un desenlace que alguien declaró**; archivar sólo saca un registro de la vista. Al
  mezclarlos quedaron 32 postulaciones de prueba marcadas como cerradas sin que nadie hubiera decidido nada.
- Archivar ahora tiene su propia marca y **nunca** toca la etapa, y cubre las tres piezas de un candidato de
  prueba: su postulación, su ficha y la vacante inventada. Una vacante que alguien ya cerró o llenó no se
  reescribe.
- El **Banco de Talento** dejó de mostrar personas de prueba **por su procedencia declarada**. Antes tampoco
  aparecían, pero por casualidad: bastaba con que su estado en el ciclo de vida cambiara para que reaparecieran.
- Nada de esto está en producción todavía: el cambio de las 32 filas ya escritas espera al despliegue.

## 2026-08-22 — Demo 35 queda documentada antes de tocar la home del blog

- La página candidata se revalidó read-only: siete raíces, 113 nodos y 15 widgets de posts; cuatro ya están
  vacíos porque apuntan a attachments y otros dos pierden un slot. La estructura no falla por Elementor: falla el
  contenido fijo si se borra antes de recablear cada bloque.
- El contrato operativo deja explícito que Demo 35 debe seguir como página Elementor normal, nunca como
  `page_for_posts`, y que el futuro corte debe conservar una sola canónica `/blog/`, sus metas Ohio y rollback.
- La skill del sitio público ahora registra la landing, sus parámetros, guards y secuencia de adaptación. No se
  modificó WordPress, Kinsta, formularios ni caché.

## 2026-08-22 — Cerrar una postulación ahora obliga a decir cómo terminó

- El proceso de una persona ya no se cierra arrastrando su tarjeta a «Cerrado». Cerrar es **decidir**, y la
  decisión pide el desenlace. Ese camino silencioso, además de no avisarle a nadie, **congelaba el borrado de los
  documentos de esa persona en todas sus postulaciones** — una obligación legal bloqueada sin que se notara.
- Aparecen dos desenlaces que faltaban. **«Sin selección»** para quien llegó al final y no quedó: antes había que
  marcarla como descarte, un juicio que nadie emitió, que la sacaba del Banco de Talento y que distorsionaba el
  análisis de equidad de su cohorte. Y **«Sin respuesta»** para quien deja de responder: antes había que
  inventarle un retiro que no declaró o un juicio que no hubo.
- «Sin selección» **exige decir por qué**: el cupo lo tomó otra persona, se cerró la búsqueda o se canceló el
  proceso. Es una lista cerrada, no texto libre, porque el embudo de equidad y el correo cambian según cuál sea.
- **Una pausa deja de ser un cierre.** «Dejar en espera» desaparece: para pausar, la tarjeta se queda en la
  columna «Decisión». Su proceso no terminó, así que no tiene desenlace.
- Ningún desenlace nuevo manda correo todavía. Es deliberado: preferible no escribir a mandarle un correo de
  rechazo a quien nadie rechazó. El correo de «Sin selección» llega con su propia entrega.

## 2026-08-22 — Un test bloqueado ya no deja a esa persona sin segunda oportunidad

- Corregir la causa de un bloqueo —registrar el correo, activar la plantilla, habilitar la política— y volver a
  proponer ahora **sí asigna la prueba**. Antes el intento bloqueado ocupaba el cupo de esa persona de forma
  permanente y no había forma de destrabarlo desde el portal.
- El intento bloqueado no se borra: queda como intento 1 y el nuevo entra como intento 2, así que el historial
  sigue diciendo qué pasó y en qué orden.
- Lo que no cambió: una prueba ya asignada sigue sin reintentarse (para eso está cancelar), y un bloqueo del
  carril automático —al mover de etapa— todavía no se destraba solo; hay que asignar a mano.
- Sin migración ni flags. Verificado contra PostgreSQL real, no sólo con tests.

## 2026-08-21 — El correo de selección celebra sin adelantar la incorporación

- El asunto identifica nombre y vacante; el título visible evita duplicar el saludo y el cuerpo explica la
  secuencia real: selección, carta oferta, aceptación y firma del contrato.
- Las tres primeras rutas fueron rechazadas por resultar tecnológicas, genéricas o demasiado abstractas. Diseño +
  Talent convergen en una V4 concreta: icono 3D de sobre abierto, tarjeta sin texto, check de confirmación y un único
  destello naranja. El PNG transparente pesa 63.972 bytes y su URL respondió `200 image/png`.
- HTML y texto plano conservan la misma verdad; la variante de rechazo no carga el hero. Código completo con
  captura local revisada. La decisión, la carta oferta y el contrato reciben negritas visibles sobre frases
  completas; las dos variantes de decisión firman `Equipo de Talento · Efeonce`, sin atribuir el mensaje a una
  persona inexistente.
  Rollout del template pendiente y ningún correo real enviado.

## 2026-08-21 — Hiring formaliza el cierre empático de una vacante cuando se completan sus cupos

- `TASK-1762` separa capacidad de publicación y selección: preview fresco, confirmación humana y run durable por
  aplicación antes de rechazar/notificar a la cohorte restante.
- `TASK-1763` diseña el segundo paso en Application 360 con CTA explícita `Cerrar vacante y notificar a N personas`,
  estados stale/partial y evidencia desktop/mobile planificada.
- El ADR Proposed conserva `TASK-1689` como pipeline individual, prohíbe batch SQL/email directo y sólo permite
  afirmar Banco de Talentos cuando el consentimiento futuro está vigente. `data_origin` no gatea comunicaciones.
- Estado: documentación/diseño; no hay migraciones, código, flags ni emails nuevos activos.

## 2026-08-21 — Hiring incorpora un plan gobernado para crear la cuenta Microsoft del nuevo colaborador

- `TASK-1761`, anclada a `EPIC-011`, separa la cuenta Entra deshabilitada, su binding OID, la habilitación laboral
  y el readiness M365; no trata selección, handoff ni `member.created` como permiso suficiente.
- El ADR Proposed elige API-driven inbound provisioning con app dedicada, matching por ancla longitudinal y
  reconciliación de logs; rechaza `POST /users`, email/UPN como identidad y grupo/licencia antes del OID binding.
- Quedan documentados dos blockers P0 previos al canary: `accountEnabled=false` no puede apagar el principal `/my`
  y el roundtrip SCIM debe actualizar la misma persona sin crear otro principal/member.
- Azure no se modificó. El snapshot read-only no muestra capacidad libre de Microsoft 365 ni grupo de
  licenciamiento válido; ADR, licencia, app/consent, security group y canary siguen pendientes.

## 2026-08-21 — La revisión de confiabilidad pasa de reportar síntomas a medir causas

- `EPIC-041` reemplaza a `TASK-1432` y `TASK-1710`, dos umbrellas P0 que describían el mismo incidente con un mes
  de diferencia, sin referenciarse y sin una sola task hija; el epic conserva un baseline de 16 hallazgos medidos
  contra PostgreSQL y fechados, con la instrucción explícita de re-medir antes de actuar.
- Siete hallazgos previos quedan reclasificados como mal calibrados o falsos positivos: los "4 leads de Growth" son
  correos de prueba con runs no releasables, la "retención en drift" es un documento anulado que el reader no
  filtra, el "rate MXN/CLP faltante" es una señal insatisfacible por diseño USD-pivot, y los "79,6 días" de
  writeback son la edad del ítem atascado, no la frescura del tablero.
- El bridge income→HubSpot se degrada de P0 a P3: su endpoint receptor `/invoices` nunca se escribió y 80 de 84
  incomes vienen de Nubox, que estructuralmente no traerá anchors. Las cotizaciones sí llegan al CRM.
- `TASK-1760` documenta que PPM y retenciones no se recalculan desde el 2026-06-20 porque **nunca se cableó un
  disparador** — el IVA sí tiene projection reactiva y por eso está al día —, y que su señal de drift es ciega a un
  período ausente porque parte desde las posiciones existentes.
- Queda registrado que sacar `skipped` de `isSuccessOutcome` no habría corregido los 9.001 falsos éxitos, que los
  produce `no-op`, y que la state machine de `handler_health` no tiene ningún test que la cubra.

## 2026-08-21 — GPT Image 2 gana transparencia end-to-end en código, con rollout aún gated

- La nueva matriz oficial cubre GPT Image 2/1.5/1/1 Mini/`chatgpt-image-latest`, endpoints, tamaños flexibles,
  edición/máscaras, streaming, precios, datos, provenance, deprecaciones y contradicciones entre páginas oficiales.
- Se elimina el fallback falso Greenhouse GPT Image 2→1.5; el helper valida transparencia/formato, máscaras,
  singularidad de salida y streaming no implementado antes de llamar al proveedor.
- Globe incorpora `backgroundMode` de forma provider-neutral en shape, catálogo, request, fingerprint, manifest y
  output; el driver comprueba alfa real y el Producer deriva selector/checkerboard desde constraints.
- `greenhouse-ai-image-generator` y `greenhouse-globe-model-fleet` quedan alineadas entre Codex y Claude; el gate de
  mirrors incorpora por primera vez el bundle completo de generación de imágenes, incluido `agents/openai.yaml`.
- La ficha GPT Image 2 separa código local verificado de reader/canary históricos. La variante sigue gated hasta
  deploy, canary billable, readback, GVC, promoción y rollback; WebP no se anuncia en la ruta PNG vigente.

## 2026-08-20 — El gate de rutas de skills queda sin enlaces rotos

- `validate-skill-routes --all` ahora reconoce las referencias canónicas de una misma skill alojadas en el runtime
  hermano del repo, sin permitir que una instalación global o externa oculte archivos faltantes.
- `resend-email-platform` incorpora sus tres referencias prometidas —dominios/tracking, webhooks/eventos y
  envío/límites— en espejos byte-identical para Codex y Claude, verificadas contra fuentes oficiales actuales.
- La guía de Resend separa el contrato documental vigente de la evidencia runtime que lo contradice: links con
  secreto siguen fail-closed y requieren `click_tracking=false` más un canary del href recibido.

## 2026-08-20 — Skill compartida para diseñar y operar dashboards en Google Data Studio

- La nueva skill `google-data-studio` queda invocable por Codex y Claude con bundles byte-identical y aliases para
  el nombre histórico Looker Studio; separa el producto de Looker/LookML y consulta fuentes oficiales fechadas.
- Cubre selección de gráficos, modelado, calculated fields, filtros, controles, parámetros, blends, responsive,
  rendimiento, credenciales, sharing y embedding mediante referencias load-on-demand.
- Su ejecución browser parte en `inspect`, distingue Browser/Playwright, Computer Use y Webwright, exige cambios
  atómicos por el autosave y protege OAuth, credenciales, fuentes reutilizables, sharing y costos con gates explícitos.
- La auditoría adversarial amplía el contrato con onboarding de Sheets/BigQuery, row-level security por email,
  lifecycle `refresh fields|reconnect`, copias/rollback, draft/published, extracts, freshness, delivery/alertas, APIs
  limitadas y una escalera de troubleshooting; también refuerza sesión autorizada y minimización de evidencia en
  ambos runtimes.
- El aprendizaje de operación con Search Console queda generalizado: polaridad inversa de Average Position,
  protección contra ejes globales en combos, rangos parciales visibles, cohortes `new|rewrite`, fórmulas ponderadas y
  una narrativa cliente que separa resultado observado, inferencia e impacto de negocio demostrado.

## 2026-08-20 — La tabla accesible del scorecard deja de inflar la página

- La tabla `sr-only` de Hiring > Evaluación aplicaba su caja de 1 px directamente sobre `<table>`;
  el layout tabular envolvía texto carácter por carácter y extendía el documento varios miles de píxeles.
- El fallback se conserva dentro de un wrapper genérico 1×1 clipado y gana semántica completa:
  `caption`, encabezados con `scope`, competencia, objetivo, puntaje y estado.
- GVC ya no ignora ese nodo y reporta `layout_out_of_flow_vertical_runaway` cuando un elemento
  `absolute|fixed` vuelve a extender anormalmente el layout vertical.

## 2026-08-19 — El lifecycle de correo quedó operativo, y la documentación decía que nada estaba aplicado

- **La doc mentía en la dirección peligrosa.** Runbook, arquitectura de webhooks, ledger de flags e
  `ISSUE-160` afirmaban "ninguna migración, ningún secreto, ningún webhook" cuando todo llevaba
  horas aplicado. Seguir el runbook al pie habría creado un segundo webhook al mismo endpoint
  —eventos duplicados que el dedupe por `svix-id` no detiene, porque son ids distintos— y una
  segunda versión del secreto, rompiendo la verificación del webhook vivo.
- **44 correos nunca llegaron** (23 `suppressed`, 21 `bounced`) — y todos van a dominios internos
  de Efeonce. Cero externos: los 8 `hiring_assessment_assigned` fallidos son direcciones de
  prueba/QA, no candidatas. El daño temido no ocurrió. `sent` nunca significó entregado, y ahora se
  puede demostrar cuáles no lo fueron y a quién. Lo que sí queda a la vista es data sintética
  circulando por el pipeline de correo productivo.
- **Faltaba suscribir `email.suppressed`.** El bloqueo de reenvío consulta ese estado para no
  mandar a ciegas a una dirección suprimida — y ese evento nunca iba a llegar. Falso negativo
  silencioso en la puerta de recuperación.
- **Los writers de credenciales corrían sin su backstop.** El índice único token-intent, que el
  runbook exige aplicar ANTES de desplegar esos writers, no existía. Aplicado, junto al CONTRACT
  de credencial, verificando una por una sus tres precondiciones de despliegue.
- **`mail.efeoncepro.com` está bien por nuestro lado y Resend aún no lo confirma.** DKIM publicado
  con valor idéntico byte a byte. Aprendizaje: re-disparar la verificación resetea los registros ya
  verificados a `pending` — se espera, no se reintenta.

## 2026-08-19 — El rollout de assessment iba a romper producción y a cortarle el test a los candidatos

- **Una migración que no era aplicable en ningún orden.** El CHECK y el trigger de versión de
  credencial rompían el writer que corre en `main`; el código nuevo rompía sin la migración.
  Partida en expand/contract, con la fase contract FUERA de `migrations/` — porque el runner
  aplica todas las pendientes en una transacción y un comentario de advertencia no detiene a un
  runner.
- **La sesión del candidato caducaba en el plazo para EMPEZAR, no en el de responder.** Quien
  abría el enlace poco antes del límite y arrancaba perdía la sesión a mitad del test.
- **Un enlace roto era invisible.** El bearer viaja en el fragmento, que nunca llega al servidor:
  si un reescritor lo borra, el candidato queda fuera sin generar un solo request. Ahora hay un
  hecho durable del canje y una señal que lo delata.
- **El cap de recuperación castigaba al candidato por fallas nuestras**: contaba intentos fallidos
  y compartía cuota con el enlace seguro, que es justamente el canal de rescate cuando el correo
  no llega.
- Todo salió de auditorías independientes con skills de arquitectura, talento y seguridad, corridas
  ANTES de promover. Dos auditores encontraron el mismo P0 sin verse entre sí.

## 2026-08-19 — Un guard que verificaba menos de lo que su propio Down borraba

- **La migration de TASK-1746 tenía un hueco silencioso.** Su bloque anti pre-up-marker contaba
  capabilities, triggers y columnas de sesión, pero no la tabla `hiring_assessment_public_request_bucket`
  ni las cuatro funciones de acceso público — que el Down sí dropeaba. La migration creció en dos tandas y
  el guard, que vive al final del Up, no se actualizó con la segunda. Un fallo en ese DDL habría quedado
  registrado como aplicado, verde, y sólo habría aparecido a las 04:17 cuando el cron de retención llamara
  una función inexistente. Corregido antes de aplicarla, así que no hizo falta forward-fix.
- **Regla nueva en la spec de migraciones:** el guard del Up debe cubrir todo lo que el Down dropea, y una
  migration editada en varias tandas necesita revisarlo en cada tanda. Es una comparación mecánica de dos
  listas: los `DROP` del Down contra los contadores del guard.
- **El ledger de flags afirmaba dos cosas falsas.** `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` figuraba ON en
  una sección y OFF en otra; la revisión activa `ops-worker-00585-nv6` lo tiene en `true`, así que la
  segunda era la equivocada. Y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`, code-complete sin prender,
  sólo estaba en el snapshot y no en `§ Pendientes de acción`, que es donde la regla del propio ledger lo
  exige. Ambas corregidas contra runtime, no contra memoria.

## 2026-08-19 — Un patrón nuevo en el catálogo, y una señal que nadie había registrado

- **Octavo patrón canónico: "hecho declarado al nacer + copia derivada donde se filtra + obligación de
  propagar".** Cruzó el umbral de tres dominios que el propio catálogo exige (Hiring, Knowledge y
  Finance), y su valor no es describir lo que ya hacíamos: es forzar una decisión explícita. O te
  obligas a propagar en la misma transacción y con señal de divergencia —y entonces los readers pueden
  confiar en la copia—, o no te obligas y los readers críticos leen la raíz. Lo prohibido es el tercer
  camino: filtrar por una copia que nadie se comprometió a mantener.
- **Once señales del módulo Hiring estaban vivas en runtime pero sin documentar** en el control plane;
  ahora hay inventario con la task dueña de cada una. Ocho siguen sin delta propio: deuda documental
  declarada, no ausencia en producción.
- **Cinco punteros quedaron rotos** al mover TASK-1739 a `complete/`, uno de ellos dentro de una señal
  de reliability que corre en producción. Corregidos.

## 2026-08-19 — On-Going y On-Demand ya comparten una ontología sin confundir engagement con proyecto

- Se formalizó `Organization → Engagement → Project/Campaign → Task`: la organización y su Space conservan la
  relación y memoria; el engagement gobierna contrato, capacidad, economics y cierre; proyectos/campañas siguen
  siendo contenedores de tareas para ejecutar trabajo del cliente.
- Un engagement On-Going puede producir múltiples proyectos/campañas y uno On-Demand puede contener uno o varios;
  On-Demand describe un compromiso acotado, no un proyecto pequeño ni un retainer corto.
- La venta se activa hacia Delivery mediante una Ficha de Activación que referencia quote/SOW/contrato, y crea sólo
  la diferencia sobre el workspace durable. La Gantt es opcional y se deriva de Projects/Tasks.
- `Product Service` no se usa como sinónimo de todo lo vendido: campaña audiovisual, plan de medios, brandbook y
  otros servicios/deliverables conservan su categoría y nivel real de productización.
- El contrato queda `Proposed` y sin cambio de runtime. La forma física sobre `services`, Notion, HubSpot, Finance,
  equipos y Client Portal requiere cohortes reales, task y ADR antes de implementarse.

## 2026-08-19 — El acceso al test ya tiene sesión opaca y reloj autoritativo

- Cada credencial de evaluación tiene una versión explícita; las sesiones candidatas guardan solo un digest
  opaco vinculado a esa versión, de modo que una recuperación invalida de inmediato los accesos anteriores.
- El test distingue plazo para comenzar, plazo para responder y 30 minutos de gracia para revisar/enviar. Las
  evaluaciones sin límite cierran a las 24 horas y ya no aparecen como “0 min”.
- El navegador proyecta el reloj de base de datos con tiempo monotónico, por lo que cambiar el reloj local no
  adelanta ni atrasa los límites. Durante la gracia se congelan respuestas, pero revisar y enviar siguen activos.
- GET/start/save/submit y SELF-ID legacy mantienen decisión, consentimiento, captura y audit bajo una sola
  transacción. El código fue auditado sin P0/P1/P2; sigue OFF y sin migración aplicada hasta completar el
  fragment exchange, la cookie HttpOnly, Product API y los smokes reales.
- La frontera browser ya está implementada localmente: elimina `#access` antes de React/red, intercambia por cookie
  `__Host-` HttpOnly y usa rutas token-free con CSP/no-store/no-referrer. Maintenance y trailing slash no desvían el
  bootstrap; un fence evita que dos pestañas muten assessments distintos.
- El correo vigente no cambia al desplegar este código: el cutover vive en
  `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`, default OFF. ON queda bloqueado por migración+índice, rutas live,
  `click_tracking=false` de Resend, rate limit y smokes reales de href/cookie/browser.
- El backend de recuperación ya tiene un único command para email o enlace manual, Product API sólo para sesiones
  humanas y revelación one-time. Siempre rota el acceso del assessment existente; nunca crea otro test, reinicia el
  reloj, cambia etapa, score o respuestas.
- El guard antiabuso combina cuota por credential/sesión válida con techo IP confiable de Vercel. Tokens aleatorios
  inválidos no crean cardinalidad durable; la purga diaria drena con readback/señal. Savepoints conservan el consumo
  de cuota y revierten writes parciales si una acción falla.
- Arquitectura, manuales, issue/tasks y skills de Talento/Arquitectura/Secret Hygiene quedaron sincronizados. El
  runbook global de Resend fija orden de migraciones, índice concurrente, webhook firmado, reconciliación,
  `click_tracking=false`, smokes y rollback. Todo sigue `code complete, rollout pendiente`.

## 2026-08-19 — El reenvío gobernado de tests ya tiene command seguro

- La recuperación por email genera un acceso nuevo sin duplicar el test, conserva el plazo cuando la evaluación
  ya comenzó y registra actor, motivo y resultado sin guardar el enlace secreto.
- Si Resend acepta y el proceso cae antes de cerrar la operación, el sistema reconcilia el receipt desde evidencia
  durable sin enviar otro correo ni invalidar nuevamente el enlace; Platform Health muestra el drift restante.
- HTML y texto plano distinguen despacho de entrega, invalidan enlaces anteriores y, para tests en curso, piden
  continuar de inmediato con el deadline expresado en hora de Chile.
- El command está validado localmente, pero sigue inaccesible: el tipo de correo está OFF y faltan la sesión
  HttpOnly, API autorizada, migraciones, índice y smokes antes de cualquier activación.

## 2026-08-19 — Los correos con enlaces de acceso ya no dependen de reintentos ciegos

- Reset de contraseña, invitaciones, verificaciones, magic links, tests y acceso a Talent Pool comparten ahora
  una protección global: el sistema guarda una intención redactada antes de emitir la credencial y nunca
  persiste el enlace secreto para reconstruirlo después.
- Dos workers concurrentes o un replay del mismo evento no pueden rotar dos veces el acceso. Si el proveedor
  rechaza el correo se registra como fallo; si lo aceptó pero faltó confirmación local, se registra como incierto
  y requiere recuperación explícita en vez de afirmar que no salió o reenviarlo automáticamente.
- El cambio está validado localmente por Arquitectura, Talento y Seguridad. Todavía no está activo: primero se
  instalará el índice concurrente con readback verde, sin pausar el resto del correo del sistema.

## 2026-08-19 — La recuperación de acceso a tests ya tiene una base segura y auditable

- Se definieron dos permisos distintos: reenviar por email y revelar un enlace temporal. Ninguno recupera ni
  almacena el enlace anterior; cada acción futura rotará el acceso y quedará auditada sin nombre, correo,
  teléfono, URL ni token.
- La base bloquea recoveries sobre postulaciones cerradas, consentimiento retirado, tests terminados o timers
  vencidos. Un test iniciado conserva exactamente su deadline, accommodations y gracia; una transacción larga
  no puede confirmar después del vencimiento.
- La evidencia nace automáticamente en la misma transacción y la retención distingue candidatos de personas
  seleccionadas. El retiro de consentimiento Hiring no puede borrar registros que ya pasaron a retención
  laboral.
- Este slice está validado localmente pero todavía no opera en producción: la migración no se aplicará hasta
  que exista el command token-safe y los smokes PostgreSQL prueben ACL, concurrencia, rollback y purga.

## 2026-08-19 — El tablero de Hiring dejó de mostrar gente y vacantes que no existen

- **Lo que ve hoy quien abre el desk son procesos reales.** El tablero pasó de 24 vacantes y 79
  postulaciones a **2 y 47**: la diferencia no se perdió ni se borró, era dato de prueba que hasta ayer
  se contaba como si fuera un candidato o una búsqueda de verdad. Las dos vacantes vivas siguen ahí,
  con todos sus postulantes, verificadas una por una antes y después.
- **Menos filas no es pérdida de datos.** Si el tablero se ve más vacío que ayer, es porque por primera
  vez muestra sólo lo que representa a una persona o una búsqueda del mundo real. Lo demás quedó
  archivado y recuperable, no eliminado.
- **La evaluación con IA ya no puede aprender de respuestas inventadas.** Había una respuesta de prueba
  calificada con 90 puntos, lista para entrar al conjunto con que se calibra el sistema. No era un riesgo
  a futuro: ya había pasado. Ahora queda excluida sin interruptor para volver atrás.
- **Los conteos y métricas de contratación por fin cuentan personas.** Todo lo que se lee desde el
  tablero y la reserva de talento parte del mismo criterio, así que dejaron de convivir dos verdades
  sobre cuánta gente hay en un proceso.
- **Lo que todavía no cambia**: nueve registros de prueba quedan archivados en vez de borrados, a la
  espera de una decisión explícita. No aparecen en ninguna pantalla, así que borrarlos es prolijidad,
  no necesidad.

## 2026-08-18 — Evaluación provisional automática y CV por MCP interno

- Los assessments elegibles de cualquier vacante generan ahora evaluación IA provisional en segundo plano para
  operadores. No cambia el score efectivo y el postulante no recibe resultado, rationale ni estado de revisión.
- El expediente auto-propone análisis con CV procesado + assessment puntuado; la confirmación sigue siendo humana.
- Los agentes internos pueden leer el review packet exacto por MCP con CV minimizado/redactado y ligado a hash.
  Sin contacto, PDF crudo, ranking, decisiones, writes ni acceso B2B.
- La UI operator-only quedó compactada y validada GVC 4,82/5; su último ajuste visual aún espera promoción
  ordinaria. TASK-1742/1718 conservan observación, rollback y firmas pendientes.

## 2026-08-18 — Un dato de prueba de Hiring ya no puede hacerse pasar por un candidato real

- **La procedencia ahora es un hecho declarado, no una adivinanza.** Cada persona y cada vacante dice
  si representa algo del mundo real, y la postulación lo hereda de ambas. Antes la única forma de
  distinguir un seed de un candidato era adivinar por el nombre, y esa adivinanza falla en las dos
  direcciones: hay una respuesta REAL de un candidato que dice "pequeñas pruebas o pilotos" y que un
  barrido por regex habría borrado como basura.
- **Omitir la declaración deja el dato visible, nunca oculto.** Es deliberado: la suciedad es molesta
  y evidente; perder un candidato real sería grave e invisible.
- **Una vacante de prueba ya no se puede publicar.** Ocho llegaron a estar publicadas en el careers
  real y que ningún candidato externo postulara fue suerte. La guarda bloqueó el día uno al smoke que
  las creaba, que además nunca limpiaba lo que dejaba.
- **La IA deja de poder calibrarse contra respuestas inventadas.** El gold set excluye datos sintéticos
  sin interruptor para volver atrás: es evidencia de un gate de promoción, no una preferencia.
- **El desk podrá dejar de contar fantasmas**, detrás de un flag que nace apagado y con aviso previo a
  HR, porque 12 de 14 vacantes son sintéticas y sin contexto eso se lee como pérdida de datos.

## 2026-08-18 — Los dos flags que quedaron "ON con pendiente" ya tienen su verificación hecha

- **Canary de identidad del intake (TASK-1736), ejecutado y verde.** Los 5 puntos del runbook contra PG
  real: la evidencia guarda el nombre EXACTO como lo escribió la persona, la clasifica `degenerate_lower`
  y propone la versión capitalizada; la Person queda con esa propuesta y no con el verbatim; el audit
  registra `reconcile/applied`; un segundo envío en MAYÚSCULAS no duplica a la persona y deja el outcome
  del CAS; un reenvío idéntico no agrega evidencia. **Cero correos** emitidos.
- **El canary NO se corre contra una vacante real, y ahora el runbook lo dice.** Hacerlo mete un candidato
  falso en el pipeline de una vacante viva (llevaban 15 y 33 candidatos) y dispara el aviso a People. Peor:
  la evidencia es **append-only por grant**, así que ese candidato falso **no se puede borrar** — queda
  pinneado por FK hasta que un humano purgue con perfil `ops`. El carril correcto es un live test opt-in
  sobre una vacante desechable propia, que se despublica sola.
- **Expediente de evaluación (TASK-1735): el arreglo del truncado quedó probado con el caso real.** La nota
  posterior al fix persistió sus 8240 caracteres completos —termina en punto— contra los 8000 exactos de la
  mutilada, y la vieja quedó enlazada como _versión superada_, no como vigente. El límite en base ya es 20000.
- **Una señal que iba a mentir para siempre.** `evidence_coverage_gap` contaba TODAS las postulaciones, pero
  la evidencia sólo la escribe el intake público: cada postulación cargada a mano desde el desk (6 en 30 días)
  la habría dejado en `warning` de forma permanente, sobre la señal que justamente gatea este rollout.

## 2026-08-18 — Careers público en producción: una vacante que se lee como una oferta, y que Google entiende

- **Lo que ve ahora un candidato.** El detalle de una vacante dejó de ser un bloque de prosa con
  requisitos: hoy abre con la promesa del rol y sigue con qué resultados se esperan, cómo es el trabajo
  real, qué es imprescindible, qué es deseable y **qué puede aprender ahí** — separado a propósito, para
  que nadie se autodescarte por algo que el rol enseña. Lee además cuánto dura el proceso y **en qué
  plazo tendrá respuesta: 3 a 4 semanas**, avance o no. Y ve la vinculación sin letra chica: en Chile
  contrato laboral local; fuera de Chile, vía internacional con pago directo de Efeonce, sobre 20 países
  elegibles (toda Latinoamérica salvo Cuba, más Estados Unidos y España). Las dos vacantes vivas ya están
  escritas así.
- **Lo que ve Google.** Cada vacante publicada emite `JobPosting` estructurado, construido desde el mismo
  contenido visible en la página — nunca desde datos que la persona no puede leer. El schema **pasó la
  validación externa de `validator.schema.org` con 0 errores y 0 advertencias**. Una vacante remota sin
  países declarados sigue sin emitir schema, a propósito: es preferible no aparecer a aparecerle a alguien
  a quien no podemos contratar. Pausar o cerrar una vacante la retira del aire y del schema en el mismo acto.
- **Republicar una vacante viva ya no la saca del aire.** La barra editorial se exige al publicar por
  primera vez, no al volver a publicar: antes, pausar una vacante con postulantes en proceso la habría
  dejado en 404 hasta reescribir su contenido completo.

## 2026-08-17 — TASK-1740: una vacante pública tiene contenido estructurado y schema honesto

- **El contenido candidate-facing deja de vivir sólo en prosa parseada.** Un opening puede declarar
  el bloque versionado `PublicOpeningContent` v1 (promesa, resultados, trabajo, essentials/learnables,
  evidencia, modelo remoto, proceso, beneficios y compensación estructurada opcional). Se escribe por
  el command canónico con validación estricta (422); su ausencia degrada al fallback legacy de prosa,
  nunca a huecos. La allowlist pública sigue siendo la única puerta al navegador (anti-leak extendido).
- **El schema de Google nace del mismo contenido visible y es fail-closed.** Canonical explícito en
  toda leaf publicada; `JobPosting` JSON-LD detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`
  (Vercel-only, nace OFF). Remoto exige países elegibles ISO reales
  (`public_remote_eligible_countries` — `LATAM`/`Global` se rechazan como país); híbrido/presencial
  exige ciudad+país; salario sólo desde compensación estructurada; nunca `directApply` ni
  `validThrough`. Pausar/cerrar retira URL y schema (404). Hoy ninguna vacante viva emite schema
  (ambas son remotas `LATAM` sin país declarado) — comportamiento correcto por diseño.
- Estado: `code complete, rollout pendiente` (países por confirmar con People/Legal, flag
  staging→Rich Results→prod). TASK-1741 (renderer editorial) queda desbloqueada con fixture.

## 2026-08-17 — Backlog de Careers: contenido público/JobPosting y renderer editorial separados

- Se registran `TASK-1740` y `TASK-1741` para mejorar el detalle de una vacante sin una regresión de
  aplicación. La primera posee proyección pública allowlist-safe, fallback legacy, lifecycle,
  canonical y `JobPosting` coherente con el HTML visible; no implementa Indexing API ni inventa
  países, salario, beneficios o `directApply`.
- La segunda consume ese contrato para un renderer `Editorial dossier` incremental de
  `/public/careers/[publicId]`, con baseline/GVC desktop+móvil y flag reversible. El formulario no
  cambia y se conservan exactamente los CTA existentes del hero y resumen; no se añade CTA final.
- Sin cambio runtime: son tasks de diseño/ejecución futura. El contrato de contenido y el schema se
  implementan antes del render.

## 2026-08-17 — Se pueden otorgar ajustes razonables en las evaluaciones

- **Tiempo extra para quien lo necesita.** Hasta ahora el campo existía en el sistema pero **nadie
  podía escribirlo**: 17 evaluaciones, las 17 sin ajuste, porque no había forma de concederlo. La
  única salida era alargar el límite de la plantilla, que se lo alarga a todos. Ahora People puede
  conceder entre 1 y 180 minutos a una persona concreta, **incluso mientras está rindiendo** — el
  contador se le alarga en el momento.
- **El motivo no se guarda, a propósito.** Un ajuste revela una condición de salud o discapacidad:
  dato protegido. Guardarlo sería crear el registro con el que después se discrimina. Se guarda sólo
  el arreglo. La constancia narrativa va al expediente de evaluación, que tiene su propio control.
- **El correo de la prueba ahora invita a pedirlo**, en español e inglés, y dice explícitamente que
  no hay que explicar por qué. Sin esa línea sólo preguntan quienes ya se sienten con derecho a
  hacerlo, que es justo el sesgo que el ajuste existe para corregir.
- Otorgarlo requiere ser People: no alcanza con poder autorar evaluaciones.

## 2026-08-17 — TASK-1719: la vacante declara su prueba y una sola pieza decide qué recibe el candidato

- **La vacante declara su plantilla una vez y Greenhouse la resuelve sola.** Quien asigna ya no elige
  plantilla: confirma. El camino manual es proponer→confirmar, atado por una huella del efecto que se
  mostró y con vencimiento de 30 minutos **enforceado server-side** — si algo cambia en el medio o
  pasa demasiado tiempo, el confirmar se rechaza en vez de ejecutar algo distinto de lo aprobado.
- **Un avance de etapa produce UNA comunicación: ni cero ni dos.** El consumer
  `hiring_stage_changed_candidate_comms` **reemplaza** a `hiring_stage_changed_email` (TASK-1689) y
  decide: correo de la prueba si se asigna, aviso genérico si la asignación se detuvo. Nunca se le
  promete al candidato una prueba que no existe. La etapa que se comunica es la vigente en la base,
  nunca la del payload — el consumer reactivo coalescea y pierde las intermedias.
- **Cancelar una prueba no iniciada libera el cupo** y permite reasignar: es recuperación real, no
  sólo un cierre. El enlace muere de inmediato y responde igual que cualquier enlace inválido. Si el
  correo ya había salido, la plataforma lo declara para que una persona avise — no manda correcciones
  automáticas sin texto aprobado. Una prueba cancelada no entra al expediente de evaluación.
- **Se archivaron dos plantillas de Content Creator que eran irrenderizables** (una entregaba 5
  preguntas para 8 módulos, con 45% del peso sin instrumento). El módulo sin preguntas no desaparecía:
  el candidato veía la sección vacía y el examen encogido se enviaba sin error. Señal nueva
  `hiring.assessment.template_module_without_questions` para que la clase no vuelva a pasar inadvertida.
- Runtime: la asignación automática nace **apagada** (`HIRING_STAGE_TEST_ASSIGNMENT_ENABLED`, sólo
  ops-worker). Con el flag OFF el comportamiento visible es el mismo de antes.

## 2026-08-17 — Baseline global de beneficios para vacantes Efeonce documentado en las skills

- Las skills espejo de Talent y Payroll incorporan el `Efeonce Candidate Benefits Charter` para comunicar en
  todas las vacantes una política global: 15 días hábiles de vacaciones remuneradas más un día por cada año
  continuo cumplido hasta 20, dos días flotantes, 16 horas de atención médica, dos días de bienestar, duelo,
  deber cívico, matrimonio/unión civil, 10 semanas para la madre/persona que da a luz y 2 para el padre/progenitor no gestante (adopción/cuidado: 4/2), mudanza, desarrollo, apoyo remoto y feriados corporativos chilenos aparte de vacaciones.
  La ley local puede mejorar ese piso, nunca reducirlo. La carta diferencia esta política candidato-facing del
  runtime actual de Leave y del instrumento contractual/proveedor que Payroll/Legal debe validar. También
  define devengo, arrastre, familia, retorno postparto, cobertura, equivalencia contractor y wallets de
  aprendizaje (US$500/año), conectividad/coworking (US$50/mes) y salud mental (US$300/año). El aporte de
  equipo (US$400/36 meses) continúa como política, pero se revela durante entrevista u oferta, no en el copy
  estándar de vacantes. Sin cambio de runtime, schema, contratos ni configuración de permisos.

## 2026-08-17 — Vacantes públicas e inbound recruiting reforzados en la skill de Talent

- Las skills espejo de Talent para Claude/Codex ahora exigen evidence packet, benchmark actual,
  claim ledger y condiciones explícitas para roles remotos/globales antes de redactar una vacante.
  La nueva referencia documenta evidencia y límites para atracción, realistic preview, inclusividad,
  roles creativos senior, aplicación de baja fricción, candidate experience, Talent Pool consentido,
  compensación, distribución y experimentación por quality-of-hire. Sin cambio de runtime ni de
  política de beneficios.

## 2026-08-17 — Cierre del programa Hiring: Expediente + Scoring IA + Identidad (TASK-1734/1735/1736/1737/1738)

- Hiring: cierre documental del programa. Las 5 tasks quedan `complete` con estado honesto y las
  dos ADRs pasan a **`Accepted`** — la decisión fue autorizada por el CEO e implementada.
  **Aceptar no es prender:** el rollout de cada flag manda y vive en el ledger.
- Hiring: **remediación de nombres EJECUTADA** el 2026-08-16 — 3 personas reales corregidas
  (Valentina Villa, Stana Medina, Aldo Romano) con actor + razón en auditoría, 2 perfiles QA
  podados a mano. Los docs que citaban "4 propuestas = 2 humanos" quedaron corregidos.
- Hiring: `HIRING_EVALUATION_DOSSIER_AI_ENABLED` y
  `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` quedan **ON en staging** (2026-08-16, CEO) y
  **OFF en producción**. El ledger decía OFF en todos lados: corregido contra `vercel env ls`.
- Hiring: **el gate del gold set ya no está bloqueado por instrumento, sino por volumen.** El
  muestreo real encontró **11 respuestas humanas calificadas contra un piso de 49**: falta DATA,
  no personas. El carril uno-a-uno es el modo correcto hoy porque es el que genera esa materia
  prima; el instrumento (muestreo estratificado + rúbrica BARS + protocolo en ciego) se entrega
  vacío y ningún agente puede llenarlo.
- Hiring: el expediente ya no trunca en silencio (límite **20.000**, error explícito en vez de
  recorte) y la nota reparada se lee como historia con chip **"Versión superada"**.

## 2026-08-17 — Workbench de scoring IA + escala explícita de criterios (TASK-1738, TASK-1734)

- Hiring: el **workbench de revisión del scoring IA** queda operable desde la card del assessment
  en la Application 360 — cobertura honesta sticky, cola por riesgo, muestra ciega real (la
  propuesta no llega al navegador) y confirmación con manifest. Revisar deja de ser solo API.
- Hiring: **la escala de `perCriterion` ahora es explícita.** Los criterios son aportes ponderados
  que suman el score global (`18 / 25`), no notas independientes: el prompt lo pide
  (`...scoring.v2`), el contrato lo valida y el router de riesgo compara contra lo que el contrato
  garantiza. La señal `per_criterion_contradictory` disparaba en 11 de 14 items reales — justo en
  las respuestas buenas — y dejaba muerto el carril por lote; ahora dispara en 2, que son
  contradicciones reales.
- Hiring: el resumen del manifest dejó de mostrar siempre 100% (`{a}/{a}`) y las frases
  load-bearing del workbench pasaron a tinta AA.

## 2026-08-16 — Tab Expediente en la Application 360 (TASK-1737)

- Hiring: el tab "Actividad" pasa a ser **Expediente** — timeline de notas persistidas con
  provenance del agente intercalado con eventos de etapa, composer tipado y flujo
  propose → editar → confirmar/rechazar del análisis IA. Deep-links `?tab=activity` intactos.
- Hiring: **gate anti-anclaje cerrado server-side.** Un evaluador con scorecard propio abierto
  deja de recibir el análisis IA y las notas de evaluación ajenas — el filtro vive en el reader
  con el MISMO predicado del anti-anclaje de ratings; sus notas propias y las `general` ajenas
  siempre pasan. La ceguera no es de la pantalla: cualquier consumer futuro la hereda.
- Rollout gated: flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` sigue OFF en producción (la UI lo
  declara honestamente); evidencia visual del panel de propuesta pendiente de staging.

## 2026-08-16 — Identidad de intake canonicalizada completa (TASK-1736)

- Hiring: cierre del trío del día — TASK-1736 complete con remediación gobernada
  (dry-run → allowlist humana → apply CAS → rollback real), señales de reliability y
  runbook. Flag OFF; 4 nombres históricos esperan la allowlist del operador.

## 2026-08-16 — Scoring IA de assessments a escala (TASK-1734) + intake de identidad (TASK-1736 S0-S2)

- Hiring: run asíncrono gobernado de scoring IA por assessment — propone todos los scores
  abiertos, enruta por riesgo (mandatory/muestra ciega estructural/batch), confirmación humana
  por lote con manifest auditable; gate de promoción bloqueante hasta gold set humano. Flags
  OFF; rollout por runbook.
- Hiring: intake de identidad — normalización culturalmente segura del nombre (evidencia raw
  inmutable + display corregible + searchKey), reconciliación CAS del sticky name y corrección
  humana capability-gated. Flag OFF.
  > inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
  >
  > Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
  > `pnpm docs:context-rotate --apply`.

## 2026-08-16 — Pipeline Hiring contenido en un plano operacional

- El selector de vacante y el conteo se integran al encabezado canónico; búsqueda, ayuda y Kanban comparten una
  sola superficie blanca, con lanes tonales internas y tarjetas como elementos dominantes.
- El selector conserva títulos completos en 390 px; se corrigieron nombres accesibles y contraste del scope.
- Evidencia local desktop/mobile: `.captures/2026-08-16T22-13-39_task355-hiring-pipeline-board` (0 findings GVC).

## 2026-08-16 — Radar de assessment legible y honesto

- Application 360 reemplaza el radar SVG manual por Recharts sobre el wrapper tipográfico canónico.
- Los ejes muestran etiquetas humanas sin cortar palabras; una guía visible conserva los nombres completos,
  puntajes y objetivos, con leyenda explícita y adaptación a 390 px.
- Un scorecard parcial ya no convierte competencias pendientes en cero ni dibuja un perfil engañoso.
- Evidencia local desktop/mobile: `.captures/2026-08-16T19-02-20_task1363-assessment-radar-runtime`.

## 2026-08-16 — Hiring Desk contenido en planos canónicos

- Hiring Desk y Application 360 migran su chrome compartido a `SurfaceRecipe`, `WorkbenchHeader`, breadcrumbs y `DetailHero`; el gris queda reservado como gutter.
- Navegación global y tabs locales corrigen su semántica y teclado; la evaluación elimina card-on-card y compacta la cola sin pendientes.
- Evidencia local desktop/mobile: `.captures/2026-08-16T21-30-17_task1363-assessment-radar-runtime`.

## 2026-08-16 — Expediente de Evaluación SMART (TASK-1735) + fix scorecard parcial (ISSUE-159)

- Hiring: nueva capa de expediente per-application — notas append-only tipadas + borrador de
  análisis CV↔assessment generado por IA (claude-sonnet-5) con confirmación humana obligatoria.
  APIs `/api/hiring/applications/[id]/notes` y `/dossier`; capability `hiring.application.annotate`;
  flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` OFF (rollout pendiente).
- Application 360: el scorecard ya no muestra un promedio parcial como resultado final — estado
  "Parcial · X de Y competencias corregidas" mientras haya respuestas por corregir (ISSUE-159).
- Storage: timestamps del asset mapper corregidos (bug latente TASK-1718).
- TASK-1734: ADR del scoring IA a escala aceptado como Proposed (Slice 0), con autorización
  ejecutiva del CEO registrada.

## 2026-08-16 — TASK-1736 registrada para canonicalizar el intake de candidatos

Se agregó a `EPIC-011` una task backend-critical para separar el nombre submitted por aplicación, el display
person-first normalizado/corregible y una search key versionada; ambas entradas públicas deberán usar el mismo
primitive. La remediación histórica queda limitada a ADR y sign-offs previos, detector read-only, dry-run,
allowlist humana, compare-and-set, audit y rollback ensayado. No hubo implementación, migración ni cambios de datos.

## 2026-08-16 — Sincronización documental y de skills del Talent Pool

Después del rollout productivo se auditó todo el contrato construido en la sesión: arquitectura Hiring, API reference,
manual operativo, EPIC-011/038, TASK-1718/1723/1724/1725, ledgers de flags/releases, `project_context` y README/registry.
Las skills espejo `.codex`/`.claude` de Talent, MCP y release quedaron alineadas con el runtime real. Se preservaron los
límites: CV/review por MCP y automatización de tests continúan OFF; invite/self-service sólo operan mediante consentimiento
explícito, confirmación tokenizada y rollback por flags. Sin cambios de código ni schema en este barrido.

## 2026-08-16 — Talent Pool self-service e invitación gobernada habilitados en producción

Por autorización explícita del CEO, los flags `HIRING_TALENT_POOL_SELF_SERVICE_ENABLED` y
`HIRING_TALENT_POOL_INVITE_ENABLED` quedaron en `true` en Vercel Production y el consumer de confirmación quedó
declarado en `ops-worker`. El cambio se promovió por PR #197 y el orquestador `31953851353`, con preflight break-glass
auditado por el único archivo `services/ops-worker/deploy.sh` que toca `cloud_release`; no hubo migraciones nuevas.

Evidencia live: Vercel redeploy `dpl_CTxG3tx66S159tazMSyNiGSmqzHJ` `READY`, health 200, CI/CI Deep/Playwright verdes,
workers Ready y watchdog `aggregateSeverity=ok`/`drift_count=0`. El endpoint tokenizado conserva el anti-oracle
`404 talent_pool_link_unavailable` para tokens inválidos y la API interna sin sesión responde `401`. No se envió correo a
un candidato real durante el flip; el primer correo real debe verificarse con un candidato de prueba controlado.
El opt-in futuro sigue siendo explícito, versionado y revocable; la revisión jurídica formal de copy, TTL y retención
queda como sign-off residual si la política interna la exige.

## 2026-08-16 — Cuenta candidata y `/my` longitudinal quedan formalizados en EPIC-011

Se aceptó la arquitectura para que una persona postule, reclame una cuenta y use `/my` antes de ser colaborador,
sin recrear su identidad ni copiar su ficha al ser seleccionada. El mismo principal y `identity_profile_id`
persisten; `candidate_facet` y `member` pueden coexistir y la activación laboral agrega capabilities sobre la misma
cuenta. `/my` pasa conceptualmente de “workspace de member” a espacio personal compuesto por capabilities, pero el
runtime actual permanece sin cambios hasta implementar las tasks.

El perfil profesional reusable será person-scoped —skills, herramientas, idiomas, certificaciones, links,
portfolio, evidencia y CV versionado— mientras cada `hiring_application` conserva su propio status publicado, CV
snapshot, respuestas del rol y expectativa económica. El estado candidato nunca deriva stages/notas/scores crudos
y una actualización del perfil no reescribe evidencia histórica.

Se agregaron el ADR y la arquitectura canónica, se actualizó `EPIC-011` y se registró el grafo `TASK-1727`–
`TASK-1733`: identidad/sesión, professional profile, application self-service, `/my` UI, activation continuity,
People 360 reader y People 360 UI. Las tasks UI tienen direction/wireframe/flow/motion iniciales y permanecen
`UI ready: no`; no se implementó código, schema, migración, flag ni rollout.
