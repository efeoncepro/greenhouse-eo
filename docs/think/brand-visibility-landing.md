# Brand Visibility Landing

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

Promesa:

`Mide como los motores de respuesta entienden y recomiendan tu marca.`

La bajada explica que el sistema analiza presencia, citabilidad y operabilidad
en motores de respuesta y superficies generativas de busqueda. El grupo de
logos aterriza la categoria: ChatGPT, Gemini, Claude, Perplexity/otros motores y
Google como superficie de busqueda.

La animacion de lupa/lente es el asset principal. Su escala y respiracion forman
parte del patron; no se considera decoracion reemplazable.

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
- `src/components/HeroAnswerLens.astro`
- `src/components/BrandVisibilityFormDock.astro`
- `src/components/EngineAvatarGroup.astro`
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
