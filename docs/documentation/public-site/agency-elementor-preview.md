# Home editable en Elementor

La [Home de Efeonce](https://efeoncepro.com/) usa el cuerpo del diseño de Claude Design adaptado
mediante las revisiones del operador, con header y footer Ohio del sitio. La página `251731` fue
promovida desde la preview el 2026-08-30; la anterior `2791` conserva su diseño en `/home-2/`, con noindex.
La ruta de este documento conserva el nombre histórico `preview`, pero describe la portada vigente.

## Criterio editorial vigente

La Home se dirige a equipos de empresas medianas y grandes, con un tono desafiante y concreto.
El hero dice «Tu marketing debería mover tu negocio. No solo tu calendario.»; Problema explica
el costo de coordinar proveedores y reportes. El reencuadre propone un aliado para el equipo.

La comparación describe qué implica cada modelo de trabajo, sin puntajes inventados. Su columna
propia muestra «Con» junto al logo Efeonce. Greenhouse se presenta como seguimiento de proyectos
y métricas; los ejemplos visuales no son resultados certificados ni datos en vivo.

Las seis FAQ se mantienen para resolver dudas de contratación. Cada respuesta separa una idea
principal en negrita, explicación y aclaración opcional. Agenda pregunta «¿Qué necesita lograr tu
marketing?» y ofrece una conversación inicial, sin prometer un diagnóstico completo en 30 minutos.

Las ocho revisiones están aplicadas; persisten revisión de claims fuera de ese alcance, prueba del
editor, teclado del video y flechas de la tabla móvil. [Cierre y evidencia](../../audits/public-site/2026-08-31-home-editorial-closure.md).
Esta consolidación versiona docs/skills; no incluye el runtime hermano ni certifica conversiones.

## Cómo se edita

Hay 16 módulos visuales independientes y un módulo transversal de experiencia. Textos, enlaces,
imágenes, iconos y señales numéricas se editan desde controles Elementor, sin pegar HTML/CSS/JavaScript.
Marcas del hero, trabajos, servicios, fases y FAQ permiten agregar, quitar y reordenar filas.
La composición y sus microinteracciones pertenecen al widget: crear otra composición requiere desarrollo,
no significa que cada átomo del diagrama sea un widget independiente.

## Recorrido del visitante

- El hero mantiene su gráfico animado y prueba de marcas Berel/SKY/Bresler dentro de círculos. Al pasar
  el cursor, cada marca se eleva con un halo; la fila de logos siguiente comparte componente con Redes Sociales.
- «Mira cómo operamos» abre el showreel de Efeonce en un modal navy. El video sólo carga tras pulsar el
  botón; cerrar la ventana detiene y retira el reproductor. La URL sigue editable y hay enlace a YouTube
  si la reproducción embebida no funciona. No es una demo navegable de Greenhouse ni carga en el editor.
- Las bandas de trabajos muestran diez piezas de la Home anterior. Su bucle se adapta al ancho de pantalla
  para no dejar huecos. No se necesitan duplicados manuales en Elementor.
- Servicios muestra doce capacidades con filtros Marketing/Tecnología. SEO/AEO, Contenido/creatividad,
  CRM/automation y Desarrollo web/CMS tienen landing enlazada; las otras ocho permanecen sin enlace.
- Ecosistema usa los isotipos oficiales de Greenhouse, Kortex, Globe y Wave. Verk está retirado; el aviso
  de lanzamiento está oculto, pero sus textos/enlace se conservan para recuperarlo desde un control.
- Casos es una banda compacta navy: «Del desafío al trabajo hecho.» y un botón teal «Ver casos de éxito»
  hacia `/portafolio/`. Las cuatro tarjetas anteriores y sus cifras ya no se muestran.
- FAQ conserva preguntas desplegables y una tarjeta de contacto con botón, sin correo. Agenda conserva
  su correo y un CTA horizontal, apilado en móvil, sin formulario. Los botones de reunión abren `/agenda/`;
  pulsarlos no crea una reserva.

## Comportamiento visual y accesibilidad

Los títulos sobre fondos oscuros son claros; el sprocket de HubSpot mantiene la identidad correcta y
hereda el teal del servicio CRM, con blanco en hover. El CTA final conserva texto/flecha visibles durante
todo el hover. Halos suaves e isotipos proporcionales evitan bloques rectangulares y desbordes en tablet.

En móvil, el motor reacomoda sus tarjetas, FAQ se apila y la tabla comparativa desplaza sólo su contenido
horizontalmente. Movimiento reducido mantiene el contenido visible y detiene animación ambiental,
bucles y transformaciones decorativas. El cierre del video retorna el foco al botón de origen; las teclas
dentro del reproductor YouTube pertenecen a esa superficie externa. La prueba de recorrido completo con
teclado y Escape dentro del iframe no está certificada.

## Límites de aprobación

La presentación en búsqueda y al compartir usa campos Yoast propios de la Home: título SEO de agencia
de marketing digital y tecnología, descripción del equipo conectado y título social sin «Home» genérico.
El H1 visual no cambia. El grafo existente identifica página, sitio y organización; no convierte cifras
ilustrativas en reseñas/resultados. [Revisión SEO/AEO](../../audits/public-site/2026-08-30-home-seo-aeo.md).

La Home está publicada, con canonical raíz y habilitada para indexación; eso no demuestra indexación
efectiva en buscadores. Los ajustes narrativos puntuales eliminan notas del wireframe y reducen una
afirmación maximalista. La revisión SEO de esta Home está documentada; **siguen pendientes claims residuales fuera de las secciones revisadas,
SEO global del sitio, CRO y medición GSC/CWV**. Ni la publicación ni las cifras del diseño constituyen
por sí solas validación comercial de esos claims.

El registro de widgets, contenido persistido y frontend están verificados en los checkpoints del audit.
La prueba de editar/guardar/recargar desde la interfaz Elementor sigue pendiente; hay sesión Chrome
autenticada observada el 2026-08-30, pero esta revisión SEO no certifica ese flujo del editor.

[Contrato técnico](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md) ·
[Manual de edición](../../manual-de-uso/public-site/agency-elementor-preview.md) ·
[Evidencia por revisión](../../audits/public-site/2026-08-30-home-visual-review.md).
