# Landing Performance Marketing — Módulos editables en Elementor

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-17 por Claude
> **Ultima actualizacion:** 2026-10-17 por Claude
> **Documentacion tecnica:** [Registro de primitives del sitio público (`PerformanceLandingModules`)](../../architecture/public-site/PRIMITIVES.md#registry) ·
> [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-de-pauta-performance-marketing) ·
> [decisión de posicionamiento PDR-022](../../public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md)
> **Manual de uso:** [Operar la landing Performance Marketing](../../manual-de-uso/public-site/operar-performance-marketing.md)

## Qué es

[`/servicios/performance-marketing/`](https://efeoncepro.com/servicios/performance-marketing/) es la landing
pública del servicio de performance marketing de Efeonce: pauta en Google, Meta, TikTok y LinkedIn optimizada
por ventas y oportunidades reales, no por clics. Se publicó el 2026-10-17, con el diseño que el operador aprobó
(«Bien, está aprobada… publícala»), y vive como hija de la página `/servicios/`.

Reemplaza a la página antigua `/servicio-gestion-campanas-publicitarias/` (ver
[Qué pasó con la página antigua](#qué-pasó-con-la-página-antigua)). El header y el footer son los mismos del resto
del sitio.

> Detalle técnico: página WordPress `251997`, hija de `251077`; canvas aprobado (v25) con copia versionada en
> `docs/ui/sources/TASK-1865/`; trabajo registrado en
> [TASK-1865](../../tasks/complete/TASK-1865-landing-performance-marketing.md).

## A quién le habla

A empresas que ya invierten (o quieren invertir) en medios pagados y no logran conectar esa inversión con
ventas. La pregunta que abre la página es «¿Dónde termina mi pauta? En ventas.» y el título principal dice
«Agencia de performance marketing que optimiza tu pauta por ventas, no por clics.». La página insiste en que las
cuentas publicitarias quedan a nombre del cliente.

## Secciones de la página

La página tiene diez secciones, una por módulo:

| # | Módulo | Qué muestra |
| --- | --- | --- |
| 1 | Hero | La pregunta de apertura y el título principal |
| 2 | Confianza | Partners y clientes |
| 3 | Problema | El problema del que parte el servicio |
| 4 | Solución | Un circuito de tres pasos: medición, señal y optimización |
| 5 | Plataformas | Pestañas por plataforma (Google, Meta, TikTok, LinkedIn, entre otras) |
| 6 | Creatividad | Cómo la creatividad aprende, con enlace a la producción creativa a escala |
| 7 | Por qué ahora y autodiagnóstico | Tres cambios de 2026 que afectan la medición (atribución de Meta, AI Max de Google y la ley chilena de datos personales, con fuentes) y una órbita con cinco preguntas de sí o no |
| 8 | Qué recibes | Lo que entrega el servicio (bitácora e informe) |
| 9 | Sin letra chica | Las condiciones del trabajo |
| 10 | Diagnóstico | El formulario para pedir el diagnóstico y las seis preguntas frecuentes |

El contenido exacto de cada sección se lee en la página o en el editor; esta tabla sólo ordena los módulos.

En el teléfono aparece una barra fija abajo con el botón «Agenda un diagnóstico». Se muestra después de pasar el
hero y se esconde sola al llegar al formulario, para no tapar lo que la persona está llenando.

> Detalle técnico: diez widgets nativos `greenhouse_performance_{hero,confianza,problema,solucion,plataformas,creatividad,autodiagnostico,recibes,condiciones,diagnostico}`
> del plugin `eo-elementor-widgets`, uno por contenedor; las pestañas y la órbita las maneja
> `assets/js/performance-landing.js`. La barra móvil (`.mbar`) usa animación ligada al scroll; detalle en la
> [entrada del registro de primitives](../../architecture/public-site/PRIMITIVES.md#registry).

## Qué se puede editar y qué no

**Se puede editar desde Elementor:**

- Los textos de cada sección, desde los controles de su módulo, y también sus enlaces e imágenes en las secciones
  que los tienen (las imágenes se eligen desde la biblioteca de medios).
- Las preguntas frecuentes, que son una lista: se pueden agregar, quitar o cambiar preguntas. Esa misma lista
  alimenta los datos que la página entrega a los buscadores, así que lo que se ve y lo que se declara siempre
  coinciden.
- En el módulo Diagnóstico: qué formulario se incrusta (su identificador y su superficie) y la descripción del
  servicio que se entrega a los buscadores.
- Un interruptor «Animaciones» en cada módulo para encender o apagar el movimiento. Aunque esté encendido, se
  respeta la preferencia de movimiento reducido de quien visita.

Las preguntas frecuentes son la única lista de la página: el resto de los elementos de cada sección (pestañas,
preguntas del autodiagnóstico, tarjetas) tienen una cantidad fija que no se agrega ni se quita desde el editor.

Ningún campo acepta HTML, CSS ni JavaScript. Los módulos son widgets propios de Elementor, no cajas de HTML
pegado.

**No se puede editar desde Elementor:** la estructura y el diseño de cada sección. Esas plantillas salen del
diseño aprobado y se generan con un compilador. Cambiar el diseño exige modificar la fuente, recompilar y
desplegar un paquete por el carril técnico (ver el [manual](../../manual-de-uso/public-site/operar-performance-marketing.md#cambiar-el-diseño-no-el-contenido)).

Una advertencia honesta: todavía no se probó abrir la página en el editor de Elementor, guardar y recargar. Los
controles existen y se revisaron al publicar, pero esa prueba completa sigue pendiente.

> Detalle técnico: fuente `scripts/public-website/performance-source/`, compilador
> `scripts/public-website/compile-performance-elementor-source.cjs`; el publicador actual sólo crea la página y no
> sirve para reescribir el cuerpo de una página existente.

## Cómo funciona el formulario

El módulo Diagnóstico incrusta el formulario «Diagnóstico de pauta · Performance Marketing» de Greenhouse
Growth Forms. Es un formulario propio de esta landing (decisión del operador: «Uno propio»), en dos pasos: primero
la pauta (a quién le vendes, dónde inviertes hoy, inversión mensual, qué quieres que traiga la pauta y qué necesitas
resolver primero; el CRM sólo se pregunta si se vende a empresas) y luego los datos de contacto. El botón dice
«Pide tu diagnóstico».

Cada solicitud aceptada se entrega directo a HubSpot, al formulario «Lead Gen - Performance Marketing», con los
datos de contacto y las respuestas de la pauta. La casilla obligatoria autoriza a Efeonce a contactar a la persona
sobre esa solicitud; no hay casilla de novedades.

En vivo, el formulario dibuja sus 26 campos. Lo que **no** se ha comprobado todavía es un envío real: la
verificación anti-bots impide hacerlo con automatización, así que lo hará una persona desde un navegador.

> Detalle técnico: Growth Form `efeonce-performance-diagnostic`, surface `fhsf-efeonce-performance-diagnostic`;
> [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-de-pauta-performance-marketing)
> y fila de medición en el [Tracking Plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#forms).

## Buscadores y redes sociales

- **Título en buscadores:** «Agencia de performance marketing y publicidad digital | Efeonce».
- **Frase clave principal:** «agencia de performance marketing», validada con Semrush el 2026-10-17.
- **Descripción:** habla de pauta en Google, Meta, TikTok y LinkedIn optimizada por ventas, con cuentas a nombre
  del cliente.
- **Vista para redes:** «Performance marketing optimizado por ventas, no por clics | Efeonce», con una imagen
  propia de 1200×630.
- **Datos estructurados:** la página declara el servicio y sus seis preguntas frecuentes visibles. Yoast sigue
  siendo dueño de la página, las migas y la organización; la landing sólo agrega el servicio y lo enlaza a la
  página.
- La página es indexable, tiene su propia URL canónica y aparece en el mapa del sitio.

Pendiente: revisar los datos estructurados en Rich Results Test y la página en Search Console.

> Detalle técnico: Service `#service` + FAQPage `#faq` emitidos por el widget `diagnostico`;
> `includes/performance/seo.php` agrega `about → #service` al WebPage de Yoast sólo en la página que tiene ese
> widget. Metadatos aplicados con `configure-performance-seo.php`; imagen social: attachment `252002`. Brief SEO/AEO:
> [`PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md`](../../public-site/PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md).

## Qué pasó con la página antigua

- La página antigua `/servicio-gestion-campanas-publicitarias/` quedó **privada**: no se borró y se puede
  recuperar, pero ya no es pública ni aparece en el mapa del sitio.
- Quien entra a la dirección antigua llega a la nueva por una redirección permanente (301). Funciona con y sin
  barra final, y conserva los parámetros de campaña (por ejemplo `?utm_source=`) que traiga el enlace.
- Tres redirecciones que antes llevaban a la página antigua ahora apuntan directo a la nueva, sin saltos
  intermedios.
- El ítem del menú «Performance Marketing & Paid Ads» ahora lleva a la página nueva. Su nombre, su ubicación y su
  orden no cambiaron. La Home no tenía enlaces a la página antigua.

> Detalle técnico: página antigua `242862` en `private`; redirect plain 301 de Yoast Premium. Los parámetros de
> campaña sobreviven gracias al mu-plugin `efeonce-redirect-query-passthrough`, no a Yoast
> ([diagnóstico](../../public-site/YOAST_REDIRECT_QUERY_STRING_DIAGNOSIS_V1.md)). Menú primario `61`, ítem `242915`.
> Migración y snapshot: `migrate-performance-legacy.php`, opción `_gh_performance_migration_before_20261017_181625`.

## Qué se verificó al publicar

El 2026-10-17 se revisó la página en vivo a 1440 y 390 px sin desborde horizontal, con los diez módulos
funcionando, un solo título principal, URL canónica, vista para redes, datos estructurados, el formulario con sus
26 campos, el menú desde la Home y las landings hermanas (Agencia de Medios, Servicios HubSpot y Agencia Creativa)
respondiendo bien después del despliegue.

## Qué está pendiente

- **Primer envío real del formulario** desde un navegador, para confirmar que el lead llega a HubSpot.
- **Medición:** comprobar que el envío dispara el evento `generate_lead` en GA4.
- **Buscadores:** Rich Results Test y Search Console.
- **Revisión visual completa:** capturas a 1536 y 890 px, con movimiento reducido y navegando con teclado.
- **Prueba de edición en Elementor:** abrir, guardar y recargar desde el editor.
- **Republicador con guarda de versión:** hoy el carril sólo sabe crear la página; para cambiar su cuerpo de forma
  programática falta una herramienta que verifique primero que nadie la cambió.
- **Núcleo común:** el carril técnico se copió del de Agencia de Medios; extraer la parte compartida queda para
  después.
