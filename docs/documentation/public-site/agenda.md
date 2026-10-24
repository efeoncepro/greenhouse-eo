# Landing Agenda — Página para agendar una reunión con Efeonce

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-20 por Claude
> **Ultima actualizacion:** 2026-10-20 por Claude
> **Documentacion tecnica:** [Registro de primitives del sitio público (`AgendaLandingModules` y `NativeMeetingSchedulerHost`)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [arquitectura del agendador nativo](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md)
> **Manual de uso:** [Operar la landing Agenda](../../manual-de-uso/public-site/operar-agenda.md)

## Qué es

[`/agenda/`](https://efeoncepro.com/agenda/) es la página donde una persona que ya decidió conversar con Efeonce elige
día y hora para una reunión. Desde el 2026-10-20 tiene un diseño nuevo con la línea gráfica «La órbita», hecho desde el
canvas «Landing Agendar — Efeonce». Antes era un piloto aislado del agendador nativo; la dirección y el agendador son
los mismos.

La página presenta la reunión (30 minutos por Microsoft Teams, en la zona horaria de quien agenda), pone el agendador
real en las primeras pantallas y ofrece escribir por [`/contacto/`](https://efeoncepro.com/contacto/) a quien no encuentre
un horario que le sirva.

> Detalle técnico: página WordPress `251583`; piloto del agendador nativo: `TASK-1510`. Guía del agente:
> `efeonce-public-site-wordpress/references/landings/agenda.md`.

## Cómo está compuesta

La página tiene cinco secciones. El header y el footer son los globales del sitio, sin cambios.

| # | Sección | Qué muestra |
| --- | --- | --- |
| 1 | Hero (oscuro) | La pregunta «¿Por dónde empiezo?» y la respuesta «Por aquí.», con Nexa en su órbita de retrato |
| 2 | Agendador | El agendador nativo de Efeonce con la disponibilidad real, enmarcado sobre el borde del hero |
| 3 | Cómo es la reunión | Qué esperar de la conversación |
| 4 | Preguntas | Dudas frecuentes antes de agendar (por ejemplo, «¿Por dónde es la reunión? Por Microsoft Teams…») |
| 5 | Cierre (oscuro) | «Ya sabes por dónde. Elige tu horario», que invita a volver al agendador |

El copy sólo afirma lo que existe: la duración y el canal vienen del agendador real. Por eso se retiró una sección
«Quién te recibe»: Nexa no acompaña dentro del agendador. El eslogan de Efeonce no aparece en la página porque ya lo
firman el header y el footer.

> Detalle técnico: cuatro widgets nativos `greenhouse_agenda_{hero,como,preguntas,cierre}` del plugin
> `eo-elementor-widgets`, compilados desde `scripts/public-website/agenda-source/`; el agendador va en un widget HTML
> propio entre el hero y «Cómo es la reunión». Los enlaces de la página a `#agenda` hacen scroll al agendador y le pasan el foco,
> respetando la preferencia de movimiento reducido (`assets/js/agenda-landing.js`).

## Qué es del agendador y qué es de la landing

Son dos cosas distintas, con dueños distintos:

- **El agendador** es el mismo del piloto, sin cambios de comportamiento: muestra los horarios disponibles, valida los
  datos y crea la reserva. Lo opera Growth Meetings en Greenhouse; HubSpot trabaja por detrás y la página no muestra
  enlaces a HubSpot. En vivo se ve con el diseño de producción del agendador; la composición AXIS aprobada para él
  todavía no está adoptada.
- **La landing** sólo lo enmarca y le da los colores de la página (el acento Growth y una superficie clara). No dibuja
  un agendador propio ni lo reemplaza: si el agendador no carga, la página no lo simula.

Esta página monta el agendador **en línea**, dentro de la página. Otras landings abren el agendador en una ventana
(diálogo) desde un botón; ese botón es el único mecanismo que hoy trae el núcleo común de las landings, por eso aquí el
agendador vive en una pieza aparte.

> Detalle técnico: `<efeonce-meeting-scheduler surface="fhsf-efeonce-lead-gen-web" scheduler-key="discovery">` cargado
> por el loader público `efeonce-public-renderers.vercel.app`; colores con las variables `--gh-meeting-*` desde
> `agenda-source/page.css`. Contrato del agendador: [scheduler de reuniones nativo](../growth/scheduler-reuniones-nativo.md).
> La composición AXIS pendiente es `TASK-2007`.

## Indexación y presencia en el sitio

- **Buscadores:** la página es indexable desde el 2026-10-20 (decisión del operador). Tiene título propio «Agenda tu
  diagnóstico de marketing | Efeonce», descripción propia, imagen para redes de 1200×630 y aparece en el sitemap de
  páginas.
- **Menús:** no está en el menú, por decisión del operador. El botón «Agenda tu diagnóstico» del nuevo header global
  (en construcción, `EPIC-055`) es el que la enlazará; hoy ya la enlazan los botones de reunión de la Home y el enlace
  de respaldo de los botones de reunión de otras landings.
- **Reserva de prueba:** no se hizo una reserva controlada para verificarla («no por ahora», según el operador). La
  verificación en vivo confirmó que el agendador carga con disponibilidad real, sin errores y sin desborde en
  escritorio ni en teléfono.

> Detalle técnico: metadatos Yoast nativos escritos por `scripts/public-website/configure-agenda-seo.php`; imagen OG
> compuesta desde `agenda-source/og/og.html` (adjunto `252024`, también imagen destacada).

## Qué no hace

- No reemplaza a [`/contacto/`](contacto.md): Contacto sigue siendo la vía escrita y la que reparte por motivo.
- No promete acompañamiento de Nexa ni nada que el agendador no haga.
- No usa el CTA `efeonce-discovery-30` ni el botón que abre el agendador en ventana.

> Detalle técnico: [manual de operación](../../manual-de-uso/public-site/operar-agenda.md) y
> [registro de primitives](../../architecture/public-site/PRIMITIVES.md#registry).
