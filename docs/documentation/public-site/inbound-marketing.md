# Landing Inbound Marketing — Módulos editables en Elementor

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-18 por Claude
> **Ultima actualizacion:** 2026-10-18 por Claude
> **Documentacion tecnica:** [Registro de primitives del sitio público (`InboundLandingModules`, `EfeonceMention`, lanzador de reunión)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md) ·
> [decisión PDR-026: cada landing deriva su patrón de diseño de su necesidad](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)
> **Manual de uso:** [Operar la landing Inbound Marketing](../../manual-de-uso/public-site/operar-inbound-marketing.md)

## Qué es

[`/agencia-inbound-marketing/`](https://efeoncepro.com/agencia-inbound-marketing/) es la landing pública del servicio
de inbound marketing de Efeonce. El 2026-10-18 se reemplazó su contenido por el diseño «La órbita», que el operador
aprobó ese mismo día. La dirección, la página padre y el ítem del menú no cambiaron: quien ya tenía el enlace llega a
la misma URL. La página está publicada e indexable.

El mensaje de la página es que el método no depende de una herramienta. El trabajo se presenta como un ciclo de cuatro
etapas escritas como verbos —**Definir, Adaptar, Amplificar y Optimizar**— y cada etapa enlaza al servicio de Efeonce
que la resuelve. HubSpot aparece sólo como partnership (Gold Partner), en la etapa Adaptar y en las preguntas
frecuentes.

> Detalle técnico: página WordPress `242601`, cuerpo reemplazado en el mismo lugar; ítem de menú `243616` (bajo
> «HubSpot y servicios relacionados»). Canvas aprobado: `https://claude.ai/artifact/R3pppHeU6tVLmXJ9BtaDN4`; fuente
> versionada en `scripts/public-website/inbound-source/Main.dc.html`.

## Por qué la página se ve así (y por qué no es una plantilla)

El diseño de esta landing responde a lo que esta landing necesita decir: que el inbound no murió, que el cliente ya no
se mueve por un embudo sino en ciclos, y dónde se le rompe ese ciclo a quien visita. De ahí salen la órbita, el hero
«El loop.», la sección clara, el gráfico del ciclo, «Arma tu primer ciclo», el aspecto del diálogo de reunión y la piel
de los botones.

**Ese aspecto es de esta landing, no del sitio.** No es la plantilla ni el estilo por defecto de las próximas landings.
Cada landing parte de su propia necesidad (a quién le habla, en qué etapa de compra está, qué oferta y qué prueba
tiene, qué tiene que decidir quien visita) y su diseño se deriva de eso. Lo que sí se reutiliza entre landings son los
**mecanismos**: el compilador común, el carril de publicación y rollback, el lanzador de reunión, la mención de servicio
de Efeonce y la integración con Growth Forms y Growth CTA. Cada landing decide si los usa y les pone su propia piel.

> Detalle técnico: la regla está registrada como
> [PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md) y en el
> [registro de primitives](../../architecture/public-site/PRIMITIVES.md#purpose).

## Secciones de la página

La página tiene once secciones, una por módulo:

| # | Módulo | Qué muestra |
| --- | --- | --- |
| 1 | Hero | El título principal, el botón «Agenda un diagnóstico» y el botón secundario «Agenda una reunión» |
| 2 | Confianza | Partner y clientes |
| 3 | Punto de partida | «De cada 100 búsquedas, 68 terminan sin un clic» |
| 4 | No murió | «No murió. Se le murió el clic»; es la única sección de fondo claro |
| 5 | El cambio de fondo | «Tu cliente ya no baja por un embudo. Se mueve en ciclos» |
| 6 | ¿Dónde se te rompe? | Los puntos donde el ciclo suele romperse |
| 7 | Cómo trabajamos | «Primero la estrategia. Después, las herramientas»: los fundamentos y las cuatro etapas, cada una con su servicio |
| 8 | Arma tu primer ciclo | Una interacción: la persona escribe su producto y elige un mercado, y la página arma la pregunta que le haría a una IA |
| 9 | Formas de empezar | «Empieza por donde estás» |
| 10 | Lo que no te vamos a prometer | Las condiciones honestas del trabajo |
| 11 | Diagnóstico | El formulario, el bloque «¿Prefieres conversarlo en vivo?» con el botón de reunión y las siete preguntas frecuentes |

El contenido exacto de cada sección se lee en la página o en el editor; esta tabla sólo ordena los módulos.

En el teléfono aparece una barra fija abajo con dos mitades iguales: «Agenda una reunión» y «Diagnóstico».

> Detalle técnico: once widgets nativos `greenhouse_inbound_{hero,confianza,partida,vivo,cambio,rompe,metodo,ciclo,planes,reglas,diagnostico}`
> del plugin `eo-elementor-widgets`; `vivo` es la sección clara. La interacción de «Arma tu primer ciclo» la maneja
> `assets/js/inbound-landing.js`. Barra móvil: `nav.mbar`.

## Qué se puede editar y qué no

**Se puede editar desde Elementor:**

- Los textos de cada sección, desde los controles de su módulo, y sus enlaces e imágenes donde existen.
- Las preguntas frecuentes, que son una lista: se pueden agregar, quitar o cambiar. Esa misma lista alimenta los datos
  que la página entrega a los buscadores, así que lo visible y lo declarado coinciden.
- En el módulo Diagnóstico: qué formulario se incrusta y la descripción del servicio que se entrega a los buscadores.
- En los módulos Hero y Diagnóstico: la configuración del botón de reunión (qué CTA usa y adónde lleva si falla).

Ningún campo acepta HTML, CSS ni JavaScript. Los módulos son widgets propios de Elementor, no cajas de HTML pegado.

**No se puede editar desde Elementor:** la estructura y el diseño de cada sección. Salen del canvas aprobado y se
generan con un compilador. Cambiar el diseño exige modificar la fuente, recompilar, armar un paquete, desplegarlo y
republicar (ver el [manual](../../manual-de-uso/public-site/operar-inbound-marketing.md#cambiar-el-diseño-no-el-contenido)).

Una advertencia honesta: todavía no se probó abrir la página en el editor de Elementor, guardar y recargar.

> Detalle técnico: compilador `scripts/public-website/compile-inbound-elementor-source.cjs` sobre el núcleo común
> `scripts/public-website/lib/source-led-compiler.cjs`. No se editan a mano los archivos generados.

## Cómo funciona el formulario

El módulo Diagnóstico incrusta el formulario «Diagnóstico de inbound» de Greenhouse Growth Forms, en dos pasos:

1. **«Cuéntanos de tu marketing»:** dónde se le rompe el ciclo (con una opción por etapa y «Todavía no lo tengo
   claro»), qué CRM usa y su mercado principal.
2. **«¿A quién le respondemos?»:** nombre y apellido, empresa, correo de trabajo, sitio web y cargo.

El botón dice «Pide tu diagnóstico». La única casilla obligatoria autoriza a Efeonce a contactar a la persona sobre esa
solicitud. Al terminar, el formulario confirma «Recibimos tu solicitud» y ofrece elegir un horario.

Cada solicitud se entrega directo a HubSpot, al formulario «Lead Gen - Inbound Marketing», con los datos de contacto y
las respuestas del primer paso.

Lo que **no** se ha comprobado todavía es un envío real con su llegada a HubSpot y su medición en GA4.

> Detalle técnico: Growth Form `efeonce-inbound-diagnostic`, surface `fhsf-efeonce-inbound-diagnostic`, estilo
> `hubspot_pillar` + `multi_step_light`; publicador `scripts/growth/publish-inbound-diagnostic-form.ts`. Fila en el
> [contrato runtime](../../architecture/growth-public-forms-runtime-contract.md) y en el
> [Tracking Plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md). La precarga del formulario desde lo que la
> persona hace en la página está registrada como `TASK-2039` (sin implementar).

## Agendar una reunión desde tres lugares

«Agenda una reunión» abre el agendador nativo de Efeonce en una ventana sobre la misma página, sin salir de la landing.
El botón aparece en tres lugares:

- el botón secundario del hero;
- el bloque «¿Prefieres conversarlo en vivo?» del cierre;
- la mitad izquierda de la barra fija en el teléfono.

Los tres abren la misma ventana. Cada lugar se mide por separado, así que se puede saber desde dónde agenda la gente.
En el escritorio la ventana muestra sólo el agendador flotando sobre la página desenfocada, con un botón redondo para
cerrar; en el teléfono ocupa toda la pantalla. La tecla Escape la cierra y el foco vuelve al botón que la abrió.

Si el botón no tiene su configuración, se muestra un enlace a `/agenda/` en su lugar.

Ese aspecto de la ventana es una decisión de diseño de esta landing, no un estándar para otras páginas.

> Detalle técnico: Growth CTA `inbound-discovery-meeting` (`open_meeting_scheduler`, scheduler
> `fhsf-efeonce-lead-gen-web` + `discovery`), surface propia «Efeonce Inbound landing (WordPress)». Placements por
> `cta-location`: `inbound_hero`, `inbound_closing`, `inbound_mobile_dock`. El lanzador vive en la base común de las
> landings compiladas ([registro de primitives](../../architecture/public-site/PRIMITIVES.md#registry)); la piel del
> diálogo está en `inbound-source/page.css` y la de los botones en `inbound-source/host.css`.

## Menciones de servicios de Efeonce

Cuando el texto nombra un servicio de Efeonce (por ejemplo, en cada etapa del ciclo), el enlace se muestra como una
mención: el isotipo de Efeonce delante del nombre del servicio, sin subrayado, con un pequeño giro del isotipo al pasar
el mouse. La página tiene diez menciones. Es un mecanismo de todo el sitio, no de esta landing: cualquier página puede
usarlo.

> Detalle técnico: primitive `EfeonceMention` (`a.eo-mention`), contrato en
> [PRIMITIVES.md](../../architecture/public-site/PRIMITIVES.md#efeoncemention-contract).

## Buscadores y redes sociales

- **Título en buscadores:** «Agencia de inbound marketing y Loop Marketing | Efeonce».
- **Frase clave principal:** «agencia de inbound marketing».
- **Título principal de la página:** «Agencia de inbound marketing: estrategia, contenido, búsqueda, medios y datos
  funcionando como un solo ciclo.»
- **Vista para redes:** imagen propia, que también es la imagen destacada de la página.
- **Datos estructurados:** la página declara el servicio y sus preguntas frecuentes visibles. Yoast sigue siendo dueño
  de la página, las migas y la organización; la landing sólo agrega el servicio y lo enlaza a la página.
- La página es indexable y tiene su propia URL canónica.

> Detalle técnico: Service `#service` + FAQPage `#faq` emitidos por el widget `diagnostico`; `includes/inbound/seo.php`
> agrega `about → #service` al WebPage de Yoast. Metadatos aplicados con `configure-inbound-seo.php`; imagen social:
> attachment `252016` (fuente `inbound-source/og/og.html`).

## Qué se verificó al publicar

El 2026-10-18 se revisó la página en vivo a 1440 y 390 px sin desborde horizontal, con los once módulos, un solo título
principal, URL canónica, indexable, vista para redes, datos estructurados, el formulario dibujado, la interacción de
«Arma tu primer ciclo» y las diez menciones. Los tres botones de reunión están en la página; la ventana abre y cierra
desde el hero, Escape la cierra y devuelve el foco, y desde la barra móvil abre a pantalla completa. Las dos mitades de
la barra miden lo mismo (179 px cada una a 390 px). Las landings de Agencia de Medios y Performance Marketing se
revisaron después de cada cambio en la base común y siguen iguales.

## Qué está pendiente

- **Primer envío real del formulario**, para confirmar que el lead llega a HubSpot y que GA4 registra `generate_lead`.
- **Primera reserva real** desde la ventana de reunión.
- **Buscadores:** revisar los datos estructurados en Rich Results Test.
- **Prueba de edición en Elementor:** abrir, guardar y recargar desde el editor.
- **Barra móvil:** esconderla mientras el formulario está en pantalla, como ya hace Performance Marketing.
- **Precarga del formulario** desde lo que la persona hace en la página (`TASK-2039`).
