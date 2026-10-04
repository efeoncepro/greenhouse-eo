# AI Visibility Report — landing

> **Nombre público canónico (decisión 2026-10-02):** **Efeonce AI Visibility Report**, con su lockup oficial y la línea Engine. Publicada y verificada en producción el 2026-10-03: Think `f4426d2`, Vercel READY, formulario cargado; sin envío de prueba. La evidencia productiva histórica de este documento no certifica este branding. [ADR](../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md) · [Revisión local](../ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/README.md).

## Estado verificado 2026-07-27

La landing está publicada en producción en `https://think.efeoncepro.com/brand-visibility` y respondió `HTTP 200`.
El HTML productivo contiene el renderer Growth Forms y el form gobernado del grader:
`formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`, `surface=fhsf-ai-visibility-grader`.

El loop documentado es operativo: submit del form → `gh_form_submission_accepted` → `status_url` → polling del run
→ `/brand-visibility/r/<reportToken>`. La evidencia de submit real y navegación al reporte queda registrada como
evidencia funcional del flujo; el cierre administrativo de las tasks 1327/1335/1336 requiere únicamente consolidar
un smoke E2E productivo fechado y sincronizar sus estados.

Tipo: documentacion funcional de producto.

URL publica: `https://think.efeoncepro.com/brand-visibility`.

Repositorio runtime: `/Users/jreye/Documents/efeonce-think`.

## Que es

La landing Brand Visibility es la experiencia publica de Think para iniciar un
diagnostico de visibilidad de marca en motores de respuesta y superficies
generativas de busqueda.

El usuario deja sus datos en un Growth Form gobernado. Greenhouse crea el run,
procesa el diagnostico y devuelve un token de reporte privado. Think muestra el
loader y abre el informe en `/brand-visibility/r/<token>` cuando el status esta
listo.

## Narrativa aprobada

La pagina no vende "IA" de forma generica. La usa como categoria reconocible,
pero explica el problema con lenguaje AEO:

- si los motores y superficies encuentran la marca;
- si pueden leer su sitio sin adivinar;
- si describen bien la marca;
- si pueden operar con rutas, datos y acciones utiles;
- si la marca empieza a ser opcion preferida en la categoria.

La frase guia del framework es:

> La visibilidad en IA se gana capa por capa.

## Secciones

### Hero

Composición publicada: «¿Te recomiendan las IA?» / **«Averígualo»**, con esfera Engine, una órbita oficial con entrada CSS de 2 s y cuadro final fijo, fila de motores y CTA «Empezar mi análisis» al formulario. El CTA deja foco en su encabezado; sin desplazamiento animado.

Lockup `Efeonce | AI Visibility Report` en el encabezado. Framework y preview en papel con tinta Engine e íconos Trazo; Efeonce firma con «Empower your Engine» al 64 % del ancho del logo. Assets sin modificar desde AXIS brand-assets 0.4.10; tokens centralizados en `src/lib/ai-visibility-landing-tokens.ts`.

### Formulario

El form es el Growth Form real:

- `formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`
- `surface=fhsf-ai-visibility-grader`
- renderer Growth Forms
- `successBehavior.kind=tokenized_report`

Think no crea inputs, no valida, no duplica consentimiento y no envia el submit.

### Framework Efeonce

La seccion `FRAMEWORK DE efeonce` traduce el diagnostico en cinco niveles:

1. `Be Found` - acceso, indexacion, robots y cobertura por canal.
2. `Be Readable` - estructura semantica, schema, contenido y senales legibles.
3. `Be Correct` - exactitud, claims, categoria y confusion competitiva.
4. `Be Actionable` - acciones, rutas claras, datos utiles y experiencia operable.
5. `Be Intrinsic` - autoridad de entidad, preferencia y share of voice sostenido.

El objetivo funcional es que la persona entienda que el informe no es un score
unico. Es una lectura por capas que muestra donde se corta la cadena.

### Que esperar despues de enviar los datos

La seccion reduce incertidumbre y muestra el output esperado:

- mapa de presencia;
- lectura competitiva;
- precision y riesgos de descripcion;
- siguiente accion recomendada;
- preview del reporte privado.

Los titulos de las cards deben permanecer descriptivos. La mejora visual debe
venir de jerarquia, iconografia, ritmo y preview, no de nombres opacos.

## Flujo operativo

1. El usuario completa el Growth Form.
2. Growth Forms acepta el submit y emite `gh_form_submission_accepted`.
3. El evento entrega `run_handle` y `status_url`.
4. Think muestra loader y consulta `status_url`.
5. Greenhouse procesa el run via `growth_grader_run_from_submission`.
6. El status publico devuelve `reportToken`.
7. Think navega a `/brand-visibility/r/<token>`.

## Dependencias Greenhouse

- Growth Forms renderer.
- Public Forms runtime contract.
- Consumer `growth_grader_run_from_submission`.
- Public status route `GET /api/public/growth/ai-visibility/run/[handle]`.
- Public report route `GET /api/public/growth/ai-visibility/report/[token]`.
- CORS gobernado para `https://think.efeoncepro.com`.

## Dependencias Think

- `src/pages/brand-visibility/index.astro`
- `src/lib/ai-visibility-landing-tokens.ts`
- `src/components/EfeonceSlogan.astro`
- `src/components/BrandVisibilityFormDock.astro`
- `src/components/primitives/EngineAvatarGroup.astro`
- `src/pages/brand-visibility/r/[token].astro`

## Copy guidelines

- Mantener `IA` donde ayuda al usuario a reconocer la categoria.
- Evitar `motores de respuesta con IA`; es redundante.
- Usar `motores de respuesta` para ChatGPT, Perplexity, Claude, Gemini y
  experiencias conversacionales equivalentes.
- Usar `motores de busqueda` o `superficies generativas de busqueda` para Google,
  Bing, AI Overviews y resultados generativos dentro de busqueda.
- Preferir `citabilidad`, `operabilidad`, `exactitud`, `autoridad de entidad` y
  `preferencia` sobre claims vagos como "la IA entiende tu marca" cuando el
  contexto exige precision.

## Estado productivo

Al cierre del 2026-07-05 la landing esta live, el submit real genera run y el
handoff abre el reporte. El pendiente conocido no pertenece a la UI: TASK-1341
debe proteger runtime config de DataForSEO/Google AI Overview en `ops-worker`.

## Validación local 2026-10-03

Build y tipos pasan; cinco anchos sin overflow, una órbita, assets iguales a AXIS y foco verificado por CUA. El formulario externo falla en localhost por `MissingAllowOriginHeader`; no se amplió CORS ni se hizo submit. El reporte web/PDF y el panel de análisis quedan fuera. TASK-1966 sigue in-progress con aceptación y rollout pendientes.

Motion local posterior: [contrato y evidencia](../ui/motion/TASK-1966-ai-visibility-report-orbit-motion.md); fallback de movimiento reducido verificado, sin JS de motion añadido.

## Iteración UX y motion 2026-10-04

Think `09e1976` empujado a `origin/main` por autorización del operador: órbita continua con pausa, muestra real ampliable del PDF, método desplegable, jerarquía más ligera, aclaraciones de entrega y CTA final. El contrato marca primero está implementado en Greenhouse y probado en QA, sin activar. [Evidencia y activación](../ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/ux-revision-2026-10-04/README.md). Los estados de las secciones anteriores son históricos; el despliegue y readback de esta iteración aún no están verificados.
