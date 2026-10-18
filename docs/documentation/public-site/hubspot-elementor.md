# Landing Servicios HubSpot — Módulos editables en Elementor (v2)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.0
> **Creado:** 2026-08-31 por Codex
> **Ultima actualizacion:** 2026-10-17 por Claude
> **Documentacion tecnica:** contrato v2 pendiente; hoy el detalle técnico vive en el
> [audit de publicación v2](../../audits/public-site/2026-10-16-hubspot-v2-publication.md) y en la fuente
> `scripts/public-website/hubspot-v2-source/`. El [contrato v1](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md)
> describe la versión anterior y queda como referencia histórica.
> **Manual de uso:** [Operar la landing Servicios HubSpot](../../manual-de-uso/public-site/hubspot-elementor.md)

## Qué es

[`/servicios-contratar-hubspot/`](https://efeoncepro.com/servicios-contratar-hubspot/) (página WordPress `244079`)
es la landing pública del servicio HubSpot de Efeonce. Desde el **2026-10-16** muestra la **v2**: un rediseño
completo organizado por los cuatro resultados que HubSpot promete a sus clientes y que presenta a HubSpot como
«Agentic Customer Platform». La v2 reemplazó a la v1 en la misma página y con la misma URL: no hay página nueva,
redirección ni cambio de slug.

El diseño nace de la reunión con Simón Suárez (PDM de HubSpot) del 2026-10-07 y de un canvas aprobado en la línea
gráfica «La órbita», con el acento revenue/HubSpot (`#e86bd0` sobre fondo oscuro, `#8e1b82` sobre fondo claro).
El header, el footer y los controles globales siguen siendo los de Ohio, como en el resto del sitio. La entrada del
menú se sigue llamando «Servicios HubSpot».

> Detalle técnico: identidad de la página, hashes, snapshots y commits en el
> [audit de publicación](../../audits/public-site/2026-10-16-hubspot-v2-publication.md).

## Qué ve el visitante

La página tiene **14 módulos**, en este orden. Cada uno es un widget propio de Elementor:

| # | Módulo | Qué muestra |
| --- | --- | --- |
| 1 | Hero | La promesa: implementamos y operamos HubSpot, la Agentic Customer Platform, para que sus agentes rindan lo que sabe tu negocio. |
| 2 | Marquesina | Franja tipográfica en movimiento con los cuatro resultados. |
| 3 | Números | Cuatro cifras de respaldo (+90 empresas, 6 productos de HubSpot, −56 % de carga en ANAM, +10 años) y los logos de clientes. Las cifras nunca se parten de línea. |
| 4 | Punto | «¿En qué punto estás?»: tres puntos de partida (lo estás evaluando, lo tienes y no rinde, funciona y quieres más), cada uno con su enlace a la reunión. |
| 5 | Diferencia | «No te dejamos un portal. Te dejamos una operación»: comparación fila a fila. |
| 6 | Resultados | Los cuatro resultados: **Genera demanda**, **Cierra negocios**, **Supera las expectativas de tus clientes** y **Acelera el crecimiento**. |
| 7 | Riesgo | «Te quitamos el riesgo antes de que compres». |
| 8 | Agentes | «Cada agente responde a una persona»: qué hace cada agente y quién lo supervisa; incluye «¿Workflow o agente?». |
| 9 | Método | «Nada llega a producción sin tu aprobación». |
| 10 | Seguridad | «Tus datos, bajo tu control». |
| 11 | Caso | El Customer Agent de HubSpot en ANAM y lo que ganó su equipo de atención. |
| 12 | Partner | El respaldo como Gold Solutions Partner de HubSpot, con enlace al directorio oficial. |
| 13 | Preguntas | «Lo que nos preguntan»: preguntas frecuentes que se abren y cierran. |
| 14 | Agenda | «Cuando quieras»: el formulario de alcance y la opción de agendar una reunión. |

Las animaciones están ligadas al scroll: cada tarjeta, título o barra termina de aparecer cuando entra completa a la
pantalla, nunca a mitad de la lectura. Quien tenga activado «reducir movimiento» ve todo estático.

En móvil la página se adapta: la etiqueta de cada fila de la comparación aparece antes de la fila, los textos tachados
se tachan línea por línea, «¿Workflow o agente?» pasa a una columna, las fichas laterales de agentes se ocultan, los
títulos de panel no se parten a mitad de palabra y todas las áreas que se tocan miden al menos 44 px.

> Detalle técnico: la lista completa de correcciones de layout y animación está en el
> [audit, «Rondas de corrección»](../../audits/public-site/2026-10-16-hubspot-v2-publication.md#rondas-de-corrección-2026-10-16).

## Dock móvil

En pantallas de hasta 760 px aparece una cápsula fija abajo con dos botones:

- **Agendar reunión:** abre el agendador nativo de Efeonce en pantalla completa, sin salir de la página. Se cierra con
  Escape o con «Cerrar agenda».
- **Ir al formulario:** baja directo al formulario de alcance.

El dock aparece cuando el visitante sale del hero y se oculta al llegar a la sección de agenda (ahí el formulario ya
está a la vista) y en el footer. Mientras el dock está visible, el interruptor claro/oscuro de Ohio se aparta y vuelve
desde el formulario. En navegadores que no soportan animaciones ligadas al scroll, el dock queda siempre visible y un
poco más arriba. En escritorio no existe.

«Agendar reunión» es un CTA gobernado de Greenhouse (`hubspot-discovery-meeting`), con su propio permiso para
funcionar en este sitio. Si ese permiso faltara, el botón no se rompe: lleva a la página `/agenda/`.

> Detalle técnico: slug, surface, targeting y medición en el
> [audit, «Dock móvil»](../../audits/public-site/2026-10-16-hubspot-v2-publication.md#dock-móvil-2026-10-16) y en el
> [plan de medición](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md). El agendador se describe en
> [Scheduler de reuniones nativo](../growth/scheduler-reuniones-nativo.md).

## Formulario de alcance

El formulario es un Growth Form de Greenhouse (`efeonce-hubspot-scope`), no un formulario de Elementor ni un embed
de HubSpot. Tiene tres pasos: situación y Hubs que se usan hoy, necesidades/plazo/equipo y, al final, los datos de
contacto. Retroceder conserva lo elegido. Los errores aparecen al intentar continuar o enviar, nunca antes.

Cada solicitud aceptada se entrega directamente a HubSpot, al formulario «Lead Gen - Servicios HubSpot». Los campos,
el consentimiento y el destino se cambian sólo en Growth Forms, no en la página.

**Pendiente:** todavía no se hizo un envío real controlado con lectura del lead en HubSpot sobre la v2.

> Detalle técnico: identidad del formulario y su entrega en el
> [audit](../../audits/public-site/2026-10-16-hubspot-v2-publication.md#publicación-inicial-2026-10-16) y en la
> [auditoría de entrega a HubSpot del 2026-10-09](../../audits/public-site/2026-10-09-growth-forms-hubspot-delivery-audit.md).

## SEO y datos estructurados

La investigación de palabras clave (Chile, México y Colombia, 2026-10-16) mostró que casi nadie busca
«implementación hubspot»; la demanda está en «hubspot crm», «que es hubspot» y «partner hubspot». Por eso:

- **Título:** «Partner HubSpot: implementación de CRM y agentes de IA | Efeonce».
- **Descripción:** «Somos Partner Gold de HubSpot. Implementamos y operamos tu CRM y sus agentes de IA para generar
  demanda, cerrar negocios y cuidar a tus clientes.»
- **Frase clave:** «partner hubspot».
- **Imagen para redes (Open Graph/Twitter):** una imagen propia de 1200×630, que también es la imagen destacada.
- **Datos estructurados:** un `Service` con los cinco países y un catálogo con los cuatro resultados, los agentes,
  el Blueprint y la operación, más un `FAQPage` generado desde las mismas preguntas visibles. El schema de servicio
  de la v1 deja de emitirse en esta página para que no haya dos.

**Pendiente:** Rich Results Test y solicitud de indexación en Search Console.

> Detalle técnico: snapshot SEO, adjunto de la imagen y reglas del schema en el
> [audit, «SEO y schema»](../../audits/public-site/2026-10-16-hubspot-v2-publication.md#seo-y-schema).

## Qué se edita y dónde

| Quiero cambiar… | Dónde se hace |
| --- | --- |
| Textos, enlaces, imágenes, filas de una lista | Elementor, en el widget del módulo (`greenhouse_hubspot_v2_*`). |
| El diseño de un módulo o de la página | La fuente aprobada en Greenhouse, que se recompila y despliega. No se pega HTML en Elementor. |
| Campos, consentimiento o destino del formulario | Growth Forms. |
| El botón «Agendar reunión» del dock | El CTA gobernado `hubspot-discovery-meeting`. |
| Título, descripción y redes | El script SEO de la v2 (Yoast). |

> Detalle técnico: pasos exactos, despliegue, republicación y rollback en el
> [manual de uso](../../manual-de-uso/public-site/hubspot-elementor.md).

## Qué sigue pendiente

- Envío real controlado del formulario y lectura en HubSpot.
- Rich Results Test e indexación en Search Console.
- Decidir si la cifra de empresas es +90 o +120, y confirmar el nivel Gold leyendo el directorio de HubSpot.
- El arreglo del título y del botón «Cerrar agenda» dentro del agendador en móvil (versión 1.3.1 del renderer de CTAs)
  está hecho en código, pero llega a la página sólo con la próxima publicación de Greenhouse a producción. Hasta
  entonces, a 390 px el título del agendador puede verse más grande y el botón partido en varias líneas.

## Historia

- **2026-08-30/31 — v1:** once widgets «HubSpot · …» con paneles por capacidad, sectores, licencias, timeline de
  método y caso ANAM. Su registro sigue en las auditorías de esas fechas en `docs/audits/public-site/`; ya no
  describe lo que se ve en la página.
- **2026-10-16 — v2:** los 14 módulos descritos arriba, el dock móvil y el SEO nuevo.
