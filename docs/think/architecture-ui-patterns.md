# Think UI Patterns Architecture

Tipo: documentacion tecnica / arquitectura UI publica.

Estado: vigente desde la landing Brand Visibility publicada el 2026-07-05.

Owner: Growth / Think, con Greenhouse como source of truth de datos y contratos.

## Proposito

Este documento captura el patron de landing publica que quedo aprobado en
`https://think.efeoncepro.com/brand-visibility`: una experiencia editorial,
conversion-oriented y tecnicamente precisa, donde Think controla la presentacion
pero no duplica el runtime gobernado de Greenhouse.

## Pattern: Public Diagnostic Landing

Usar este patron cuando Think presenta una herramienta publica que:

- pide datos para iniciar un diagnostico o reporte;
- depende de un form gobernado por Growth Forms;
- entrega un resultado privado en pantalla;
- necesita educar al usuario antes o despues del submit;
- debe sentirse como producto Efeonce, no como pagina generica de marketing.

No usarlo para pages informativas simples, articulos editoriales, dashboards
privados del portal ni flujos donde el usuario ya esta autenticado en
Greenhouse.

## Anatomia

### 1. Hero inmersivo

Responsabilidad: explicar la promesa en una frase, mostrar el universo de
motores/superficies y preparar el scroll hacia el formulario.

Contrato visual:

- Fondo navy Efeonce Think.
- Header de marca `efeonce | Think`.
- Badge de contexto (`Brand Visibility Grader`, por ejemplo).
- H1 editorial con saltos intencionales.
- Bajada breve orientada a resultado.
- Grupo de motores/superficies con logos reconocibles.
- Animacion/asset principal amplio, no decorativo.
- Cue de scroll en circulo con movimiento suave.

Invariantes:

- No arreglar el H1 robando espacio a la animacion.
- Si el H1 colapsa en demasiadas lineas, revisar grid, ancho de columna,
  `text-wrap`, saltos manuales y breakpoints antes de reducir el visual.
- Topbar, hero content y form dock deben respirar dentro de un sistema de
  margenes consistente.
- La animacion hero se considera asset principal: cualquier cambio de escala,
  encuadre o timeline requiere captura comparativa local y live.

### 2. Form dock gobernado

Responsabilidad: alojar el renderer de Growth Forms sin apropiarse del dominio
del formulario.

Contrato:

- Think renderiza el contenedor y estados alrededor del form.
- Growth Forms renderiza campos, validacion, consentimiento, captcha y submit.
- Think escucha `gh_form_submission_accepted`.
- El evento debe traer `run_handle` y `status_url` cuando el behavior
  `tokenized_report` este publicado.
- Think muestra loader/handoff y consulta `status_url`.
- Cuando el status esta `ready`, Think abre `/brand-visibility/r/<token>`.

Prohibido:

- crear campos locales para reemplazar el renderer;
- duplicar validacion o consentimiento;
- cerrar el flujo por email si el contrato prometio reporte en pantalla;
- meter un proxy CORS Astro para resolver una configuracion de Greenhouse;
- inventar progreso, scores o resultado antes de que Greenhouse los devuelva.

### 3. Framework ladder

Responsabilidad: traducir la metodologia Efeonce a una lectura clara, recordable
y accionable.

Patron aprovado:

- Eyebrow con marca inline: `FRAMEWORK DE <logo efeonce>`.
- Titulo corto: `La visibilidad en IA se gana capa por capa.`
- Intro que resume los cinco niveles: acceso, lectura, exactitud, operabilidad y
  preferencia de marca.
- Cinco cards horizontales:
  - `01 Be Found` - que te encuentre.
  - `02 Be Readable` - que te entienda.
  - `03 Be Correct` - que te describa bien.
  - `04 Be Actionable` - que pueda actuar.
  - `05 Be Intrinsic` - que te prefiera.
- Iconografia Lucide/Iconify o equivalente, centrada y sin wrappers que recorten
  visualmente el icono.
- Borde visible y consistente en todas las cards.
- Barra inferior multicolor como acento funcional, no como decoracion dominante.

Reglas de copy AEO:

- `IA` puede aparecer en la idea de negocio cuando ayuda al reconocimiento.
- Evitar redundancias como `motores de respuesta con IA`.
- Diferenciar `motores de busqueda` de `motores de respuesta`.
- `Google`, `Bing` y AI Overviews pertenecen a busqueda/superficies de busqueda.
- `ChatGPT`, `Perplexity`, `Claude`, `Gemini` y similares pertenecen a motores de
  respuesta o asistentes conversacionales.
- Usar `citabilidad`, `operabilidad`, `exactitud`, `cobertura por canal`,
  `autoridad de entidad`, `preferencia` y `Share of Model` cuando el contenido lo
  soporte.

### 4. Report expectation section

Responsabilidad: bajar ansiedad post-form y mostrar que el informe no es un
lead magnet vacio.

Contrato de composicion:

- Eyebrow `INFORME PRIVADO`.
- Titulo descriptivo: `Que esperar despues de enviar tus datos`.
- Texto lateral que explique la traduccion de senales tecnicas a lectura de
  negocio.
- Cards de salida esperada con titulos descriptivos, icono funcional, copy breve
  y ejemplos de decisiones.
- Preview del informe o snapshot visual con jerarquia de reporte privado.
- Proof row o lista de lo que el reporte devuelve, sin prometer datos que el
  contrato no expone.

La seccion debe sentirse mas como preview de producto que como lista de
beneficios. Si aparece pobre, mejorar jerarquia, ritmo y evidencia visual antes
de sumar copy.

### 5. SEO/AEO metadata layer

Responsabilidad: que la landing sea legible para buscadores, motores de
respuesta, previews sociales y crawlers especializados.

Minimo esperado:

- `title` unico y orientado a intencion.
- `meta description` con promesa, mecanismo y marca.
- canonical a la URL publica.
- Open Graph y Twitter Card coherentes.
- JSON-LD con `WebPage`, `SoftwareApplication` o `Service` cuando aplique.
- `Organization` apuntando a Efeonce Group SpA con `url` principal
  `https://efeoncepro.com`, no a Think como sitio corporativo principal.
- `BreadcrumbList` si existe jerarquia publica.
- `FAQPage` solo si hay FAQ visible equivalente.
- `llms.txt`/robots/crawl surface cuando el proyecto Think lo soporte.

## Motion

Motion Think puede ser mas expresivo que el portal privado, pero debe seguir
siendo operacional:

- la animacion del hero es parte del mensaje, no ornamento;
- el scroll cue debe bajar suave;
- `prefers-reduced-motion` debe tener fallback honesto;
- los timelines no deben bloquear el primer contenido util;
- todo cambio visible se valida con captura despues de que la animacion haya
  estabilizado;
- no se tocan timelines aprobados para resolver problemas de layout no
  relacionados.

## Responsividad

Breakpoints minimos:

- Desktop wide: revisar que el H1 no colapse y que la animacion conserve escala.
- Laptop 1280: revisar balance hero/form y cards del framework.
- Mobile 390: revisar overflow horizontal, line-height, orden de secciones,
  touch targets y que el form no quede oculto por la composicion.

Checks obligatorios:

- `scrollWidth == clientWidth`.
- Captura despues de 3s si hay animacion hero.
- Captura con form loaded y con form degraded/error.
- Captura del handoff loader si existe.

## Anti-patterns aprendidos

- Reducir el asset hero para ganar espacio textual sin diagnosticar el grid.
- Usar `text-wrap: balance` sobre un H1 que ya tiene saltos manuales aprobados.
- Confundir `motores de respuesta` con `motores de busqueda`.
- Suprimir `IA` de todo el copy: el termino ayuda al usuario, pero no debe
  sustituir la jerga tecnica.
- Hardcodear iconos sin caja optica y luego corregir a ojo.
- Quitar iconos por frustracion de encuadre; el problema se resuelve con
  iconografia y alineacion correctas.
- Debilitar bordes hasta que una card parezca cortada o sin contorno.
- Crear un form local en Think para acelerar el pase visual.
- Resolver CORS con proxy local en Astro.
- Desplegar sin comparar local vs live en el mismo viewport.

## Checklist de reutilizacion

Antes de copiar este patron a una nueva landing Think:

- identificar el contrato Greenhouse que alimenta la experiencia;
- confirmar si existe renderer gobernado;
- definir si el output es reporte, descarga, agenda, short link o handoff;
- escribir el copy con SEO/AEO y copywriting juntos;
- preservar un asset principal inspeccionable;
- validar el hero local y live con el mismo ancho;
- documentar la excepcion si el patron se adapta al portal Greenhouse.
