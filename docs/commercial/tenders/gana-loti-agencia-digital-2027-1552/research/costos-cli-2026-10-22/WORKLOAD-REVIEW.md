# GRD-1552: dimensionamiento interno sobrio, sin propuesta

Fuente actual: ZIP425489 íntegro leído de nuevo, SHA256ea8e819335cd5977c9038cf956704580f66fdfdc76cf1c24d30d184b27fc092f. Extracción acotada `current-rfp-source.json`. No uso el precio, el equipo ni la solución de propuestas anteriores. Sin modificaciones a originales, CRM, ATS, publicaciones ni catálogo.

## Cómo leer las cifras

Son hipótesis propias de planificación, NO tiempos observados, benchmark de mercado, productividad auditada ni promesa al comprador. No encontré una telemetría actual que permita probar tiempo por pieza en esta cuenta. Para usar como compromiso hay que contrastarlas con un lote representativo y capacidad real. La policyV3 declara180h/FTE/mes histórico/estimated, NO180h de producción neta. Para dimensionar esta simulación uso125h productivas/FTE/mes (hipótesis de planificación), equivalentes al69,44% de180h programadas. No es utilización medida ni permite superar42h/semana. El presupuesto asume carga compartida; no crea capacidad ni reserva a nadie.

## Base recomendada

| Capacidad funcional | Horas/mes base | Rango de sensibilidad | FTEproductivo125h | Qué cubre |
|---|---:|---:|---:|---|
| Diseño gráfico |90|75–105|0,7200|35posts,35historias,20carruseles de hasta5slides; montaje, adaptación, exportación y correcciones acotadas |
| Edición de video/motion |90|75–105|0,7200|20reels y15shorts/GIF/animaciones simples a partir de material disponible; postproducción y control técnico |
| Dirección creativa |18|16–22|0,1440|8h QA/coherencia de producción +10h promedio para10conceptos y2campañas macro anuales |
| Estrategia/análisis |24|20–32|0,1920|8h acompañamiento/alineación +5h promedio de research anual +7h consolidación/reportes +4h adaptaciones/riesgo |
| Cuenta/operación |14|13–17|0,1120|Un único responsable, coordinación del flujo, reuniones, solicitudes, prioridades, calendario de entregas |
| Reputación/Social Listening humano |12|12–32|0,0960|10h analista +2h revisión senior; el agente de herramientas detalla y presupone esa misma labor; no sumar16h adicionales |
| TOTAL ADICIONAL A LOS3DEDICADOS |248|211–313|1,9840|No es248h cobrables ni propuesta comercial |

Agrupación para costos: **125entregables =188h** (diseño90+video90+QAcreativo8); **estrategia/gobierno =48h** (conceptos10+estrategia24+cuenta14); **listening humano =12h**, más herramienta. Evitar volver a sumar las18h de dirección si se usa esta agrupación.

## Cálculo de producción, sin inflar por125entregables

Diseño:35posts×0,65h=22,75;35historias×0,40h=14;20carruseles×2h=40; organización/exportación/correcciones13,25=90h. Los carruseles cuentan como20entregables, pero pueden llegar a100slides; esa labor está dentro de2h/carrusel, no125piezas homogéneas.

Video:20reels×2,5h=50;15shorts/GIF/animaciones simples×2h=30; organización/render/control/correcciones10h=90h. El caso base requiere capturas utilizables del ContentCreator, assets y lineamientos de marca reutilizables, edición social estándar y animaciones simples; no rodajes extra,3D, locución/talento adicional, stock premium ni piezas hero nuevas. El término “creación y edición” no autoriza suponer que todo el video puede ser una adaptación automática.

Se presupuestan hasta2rondas consolidadas simples como hipótesis interna para dimensionar; las bases no las limitan así. No presentar ese límite al comprador como ya aceptado. Si hay múltiples decisores, correcciones de concepto, materiales insuficientes, ratios adicionales o motion complejo, recalcular hacia la banda superior. No se atribuye ahorro de IA no medido ni costo cero a herramientas.

## Estrategia anual y picos

Los10informes research/año:4sector×6h +4tendencias×5h +2benchmark×8h=60h/año=5h/mes. Son deskresearch acotado con fuentes abiertas, sin investigación primaria/paneles pagos. Los conceptos:10×8h +2campañas macro×20h=120h/año=10h/mes, en dirección creativa. Son conceptualización, mensaje,brief y dirección; producción se cruza con la cola125, sin agregar otra vez lo incluido. Si las campañas exigen producción aparte, hay un gap real. Usar10conceptos cubre la cantidad técnica más alta; persiste discrepancia8/10 en Formato. No asumir2campañas por cada marca ni usar bases2025 para resolverlo.

Los promedios anuales no dan capacidad para un pico de2campañas en un mismo mes. Hay que asignar calendario y capacidad cuando se conozca demanda; no prometer simultaneidad ilimitada.

## Inicial, separado del costo recurrente

- Diagnóstico/arquitectura inicial:32h estratega +8h dirección=40h adicionales de instalación.
- Protocolo anual de crisis:8h PR +4h dirección=12h (si existe uno, revisar antes de reducir).
- Preparación mínima del sistema de producción (assets/templates):8h diseño +6h motion=14h.
- Total instalación inicial indicativa:66h. No amortizar ni vender por defecto; es costo interno que el cálculo debe mostrar aparte. El protocolo se actualiza1vez/año; en el primer año se prepara al inicio y no se repite cada mes.

## Solapes excluidos

- ContentCreator ya cubre dos parrillas, ideas, copies orgánicos, tomas y entrega de material. No otrocopywriter ni cámara de tiempo completo. Su dedicación exclusiva y administración del comprador impiden usarlo como diseñador/editor de la agencia o para pauta.
- Trafficker ya cubre campañas, presupuestos, dashboard, GA4/GTM/Pixel y análisis. La estrategia integra sus hallazgos; no se presupuesta otroanalista para replicar dashboard ni otrocomprador de medios.
- EmailSMS ya cubre60asuntos/cuerpos,60copiesSMS,segmentación,automatización,envíos y análisis. Diseño no asignado al gestor ≠60templates nuevos obligatorios. No agrego60maquetaciones de email al costo base. Hay que precisar cuántos diseños/adaptaciones requieren y si entran en125.
- Los informes consolidados y research no vuelven a cobrar análisis individual ya incluido en tresdedicados; se presupuesta síntesis, interpretación y recomendaciones.
- Reputación tiene licencia y horas humanas separadas; un dashboard no sustituye interpretación ni protocolo. Monitoreo permanente automatizado +revisión en horario operativo no equivale a guardia humana24/7. Crisis “a demanda” no tiene cantidad/horario y continúa como exposición sin capacidad infinita implícita.

## Catálogo y vía canónica

Catálogo currentv11 revisado: ECG003CreativeDesigner,ECG018VideoEditor/Motion,ECG001CreativeOperationsLead,ECG016ProjectManager/AccountManager yECG004PRAnalyst ya existen; no hay que crear duplicados para el resto. HayECG010ContentManager, pero su nombre no demuestra aptitud para arquitectura estratégica de dos marcas: no forzar un match por conveniencia de costo. Las24h de estrategia deben ir a una persona/capacidad con ese oficio real; CreativeOpsLead figura en el canon como dirección creativa/QA de marca: eso NO acredita arquitectura estratégica/negocio. Por tanto las24h quedan como función SeniorDigitalStrategist con costo y perfil por verificar; no las escondo en ContentManager ni CreativeOpsLead. No existe un perfil explícito DigitalStrategist en los32históricos revisados. Si se necesita un perfil nuevo, corresponde definirlo y usar la ruta de actualización gobernada, no editar costo de otroperfil o inventar alias para superar un gate.

Los perfiles históricos son estimated/review; no probaron disponibilidad, seniority operativo, experiencia antioqueña ni asignación real. Las bandas de costo las resuelve el cotizador/canon financiero; este informe entrega carga y no aprueba precio ni salario.

## Fuentes canónicas usadas

- creative-practice/SKILL.md y modules/04_PRICING.md: producción, dirección, cuenta,QA y recursos tienen costo; sin precio porpieza ni IA gratis.
- greenhouse-talent-people-operator/references/client-squad-design.md: alcance→horas→FTE, owner porlane y una cuenta responsable; capacidad por confirmar.
- data/pricing/v3-operating/current.json y catalog.review-v11.json:perfiles existentes y180h histórico.
- RFP2027original FormatoC12/C13 y Requisitos técnicosC11:C15: cantidades, responsabilidades y contradicciones.

## Corrección de conciliación final

Listening12h se cuenta una sola vez:10h PRAnalyst y2h Senior/CreativeLead según competencia reputacional verificada. En filas funcionales son12h; si el cotizador trabaja por persona/perfil, las2h se añaden a CreativeLead (20h=18+2) y PRAnalyst queda10h. Producción188h +estrategia48h +listening12h=248h. En un pool de125h productivas/FTE da1,984FTE adicionales: CreativeDesigner0,72;VideoMotion0,72;CreativeLead0,16;Strategist0,192;Account0,112;PRAnalyst0,08. El residual de capacidad no demuestra posibilidad de venderlo ni equipo libre. Las tres personas exclusivas del comprador son3FTE enteros, no se reducen por utilización.
