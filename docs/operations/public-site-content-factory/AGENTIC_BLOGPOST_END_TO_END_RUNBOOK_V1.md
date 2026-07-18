# Agentic Blogpost End-to-End Runbook V1

> **Tipo:** runbook operativo canónico.
> **Estado:** vigente.
> **Versión:** 1.0.
> **Fecha de vigencia:** 2026-07-15.
> **Owner del proceso:** Public Site + Content Marketing de Efeonce.
> **Aprobador final:** operador humano autorizado para la publicación.
> **Runtime:** `efeoncepro.com` en WordPress/Kinsta, posts Gutenberg, tema Ohio y Yoast SEO.
> **Caso de calibración:** post WordPress `251363`, Creative Workflows.
> **Frontera:** este runbook gobierna producción y publicación editorial. No autoriza producto, features,
> workflows ejecutables, código de Creative Studio, cambios de theme/plugin ni deploys de runtime.

## 0. Propósito y regla de lectura

Este documento canoniza cómo un agente lleva un blogpost Efeonce desde una intención editorial hasta una URL
pública verificada, con investigación, claims, voz, Gutenberg, media, SEO/AEO/E-E-A-T, aprobación humana,
rollback y cierre documental.

El runbook se divide en dos capas:

1. **Contrato universal:** aplica a todo blogpost nuevo o refresh editorial sustantivo.
2. **Instancia Creative Workflows:** demuestra cómo se materializó el contrato en el primer caso end to end;
   sus IDs, cifras, conceptos visuales y decisiones de taxonomía no se convierten en defaults.

No es una crónica de la sesión. Cada fase declara entrada, acciones, evidencia, gate y condición de bloqueo.
Cuando una fase falla, el proceso se detiene en el último estado seguro. La velocidad nunca justifica saltarse
claims, backup, aprobación o verificación live.

## 1. Autoridad y fuentes de verdad

### 1.1 Source of truth por pregunta

| Pregunta                                                          | Fuente de verdad                                                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Cuál es el proceso operativo end to end?                         | Este runbook.                                                                                                                                       |
| ¿Qué territorio, audiencia, oferta o frontera de producto aplica? | PDR, brief y roadmap vigentes bajo [`docs/public-site`](../../public-site/README.md).                                                               |
| ¿Qué se puede afirmar públicamente?                               | Claim ledger vigente + fuente primaria + permiso aplicable; Notion puede aportar evidencia interna, no reemplazar estas condiciones.                |
| ¿Qué copy está aprobado antes de escribir?                        | Última `GutenbergArticleSpec` aprobada y su hash.                                                                                                   |
| ¿Qué está publicado realmente?                                    | WordPress/Kinsta inspeccionado en runtime, no la spec local ni un handoff.                                                                          |
| ¿Cómo se ensambla y valida Gutenberg?                             | Código actual bajo [`src/lib/public-site/content-factory`](../../../src/lib/public-site/content-factory/) y sus tests.                              |
| ¿Cómo funciona URL, categoría, tags, archivo y búsqueda?          | [WordPress Blog, Content Hub and Search Contract](../../documentation/public-site/wordpress-blog-content-hub-search.md), verificado contra runtime. |
| ¿Qué visual fue generado y cuál se seleccionó?                    | Visual brief + `ai-generations/<run>/manifest.json` + Media Library readback.                                                                       |
| ¿Quién habla y con qué voz?                                       | Router de copywriting + sistema de voz Julio/Efeonce vigente.                                                                                       |
| ¿Qué ocurrió históricamente?                                      | [`Handoff.md`](../../../Handoff.md) y [`changelog.md`](../../../changelog.md), sólo como cronología y evidencia secundaria.                         |

### 1.2 Precedencia ante drift

Si código, runtime, auditoría y documentos discrepan:

1. detener cualquier write;
2. inspeccionar el runtime y el código vigentes;
3. aplicar la arquitectura/PDR vigente;
4. corregir o superseder el artefacto stale antes de continuar;
5. registrar cuál evidencia quedó histórica.

Un manifest visual que diga `private` puede seguir siendo evidencia válida de una fase anterior aunque el post
ya esté publicado. No debe usarse para describir el estado live si una auditoría posterior y el runtime dicen
otra cosa.

### 1.3 Referencias canónicas mínimas

- [PDR y roadmap de Public Site](../../public-site/README.md).
- [Public Site y Content Factory end to end](../../documentation/public-site/public-site-content-factory-end-to-end.md).
- [Ideación y co-creación](../../documentation/public-site/content-factory-ideation-and-cocreation.md).
- [Gutenberg Post Authoring Recipes](../../documentation/public-site/gutenberg-post-authoring-recipes.md).
- [WordPress Blog, Content Hub and Search Contract](../../documentation/public-site/wordpress-blog-content-hub-search.md).
- [Skill operativa Public Site WordPress](../../../.codex/skills/efeonce-public-site-wordpress/SKILL.md) y su
  [referencia Content Factory](../../../.codex/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md).
- [Código de authoring](../../../src/lib/public-site/content-factory/article-authoring.ts),
  [builders Gutenberg](../../../src/lib/public-site/content-factory/gutenberg-blocks.ts) y
  [validator](../../../src/lib/public-site/content-factory/gutenberg-validator.ts).
- [Política de generaciones visuales](../../../ai-generations/README.md).
- [Greenhouse Operating Loop](../GREENHOUSE_OPERATING_LOOP_V1.md).

## 2. Alcance, fronteras y no-goals

### 2.1 Incluye

- research de intención, audiencia, categoría y fuentes;
- evidencia interna aprobada desde Notion u otro sistema gobernado;
- arquitectura pillar/cluster e internal linking;
- elección explícita de voz Julio o Efeonce;
- redacción, hook, caso conductor, running motifs y edición humana;
- `GutenbergArticleSpec`, Content Factory, validación y post privado;
- rich text seguro, TOC, headings, imágenes y Media Library;
- SEO, AEO, E-E-A-T, entidad de autor y metadata Yoast;
- canonical, slug, categoría, tags, robots, Open Graph y schema;
- backups, rollback, aprobación, publicación, caché y QA live;
- verificación de rutas duplicadas WordPress/Think;
- documentación, incidentes, aprendizajes y definition of done.

### 2.2 No incluye ni autoriza

- una landing comercial Elementor/Ohio;
- cambios de theme, plugin, CSS global o arquitectura del sitio;
- publicar Creative Studio u otra capacidad futura como disponible;
- convertir un artículo, diagrama, checklist o template editorial en product spec;
- inventar datos, casos, quotes, permisos, media IDs, URLs o autoría;
- escribir Gutenberg a mano cuando la spec y los builders cubren el caso;
- auto-publicación sin aprobación humana explícita y vinculada a una versión;
- borrar media o contenido publicado como forma normal de rollback;
- limpiar caché, mutar perfiles globales o cambiar taxonomía como side effect de un dry-run.

### 2.3 Cambio de código descubierto durante el artículo

Si el artículo revela un defecto del Content Factory, el carril editorial se pausa. El fix de código debe tener
scope, tests y cierre propios. Sólo después de verificar el primitive se retoma el post. El artículo no sirve de
excusa para desplegar un cambio no gobernado.

## 3. Estados y fail-closed

### 3.1 Estados editoriales del proceso

```text
intake
  -> research_ready
  -> spec_dry_validated
  -> private_created
  -> private_content_complete
  -> human_approved_for_publish
  -> published_unverified
  -> live_verified
  -> documented_closed
```

`published_unverified` nunca equivale a terminado. Es una ventana corta entre el write público y la evidencia
live. Si esa ventana no puede cerrarse, se aplica contención o rollback.

### 3.2 Estados WordPress

| Estado WP                   | Visibilidad                                           | Uso en este proceso                                                          | Regla                                                                                               |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `draft`                     | No público; requiere sesión/capacidad                 | Opcional para edición manual previa                                          | No es el estado emitido por el write canónico actual. No asumir que un `draft` local es un post WP. |
| `private`                   | Sólo usuarios autorizados; anónimo debe recibir `404` | Estado canónico de handoff del agente                                        | El write Content Factory termina aquí. No publicar, indexar ni promocionar.                         |
| `publish` + `noindex`       | Público pero no elegible para indexación              | Excepción para smoke público cuando no existe preview autenticado suficiente | Requiere aprobación explícita; no sustituye `private`. Ventana corta y documentada.                 |
| `publish` + `index, follow` | Público e indexable                                   | Estado final esperado de un artículo evergreen aprobado                      | Sólo tras gate humano y preflight completo.                                                         |

Estado WordPress y política de robots son dimensiones distintas. `publish` no implica `index`; `private` no
elimina la obligación de preparar correctamente la metadata que se activará al publicar.

### 3.3 Condiciones fail-closed

Ante cualquiera de estas condiciones, el resultado seguro es `local/dry` o `private + noindex`; nunca `publish`:

- approval humano ausente, ambiguo, anterior a cambios materiales o no vinculado a hash/readback;
- `validation.status=block`;
- warning sin decisión explícita y evidencia de revisión;
- claim sin fuente, contexto, límite, permiso o vigencia;
- caso de cliente no aprobado para publicación;
- author ID, byline o speaker incierto;
- entidad `Person` de Yoast falsa, stale o contradictoria en un dato material;
- canonical, slug, categoría o ruta sin resolver;
- cambio de categoría que alteraría una URL publicada sin redirect plan;
- slug/ruta duplicada en WordPress, Think u otro runtime;
- media sin `mediaId`, URL, ALT, licencia/provenance o readback `200`;
- link con protocolo no admitido o destino no revisado;
- backup incompleto, rollback no preparado o hash pre-write divergente;
- write/readback que no conserva post ID, owner o manifest esperado;
- caché que no puede purgarse después de una primera publicación;
- render live roto, overflow, TOC sin destinos, canonical/robots/schema incorrectos;
- secreto, token o credencial aparece en artefactos, logs o comandos versionables.

Si un artículo ya fue publicado y aparece uno de estos fallos, ir a la sección [Incidentes y rollback](#13-incidentes-y-rollback).

## 4. Ownership y matriz RACI

**R** = ejecuta; **A** = aprueba/responde; **C** = consultado; **I** = informado.

| Actividad                               | Agente editorial | Autor/byline | Owner de negocio/producto | SEO/AEO | SME/data owner | Operador WordPress | Legal/brand cuando aplica |
| --------------------------------------- | ---------------- | ------------ | ------------------------- | ------- | -------------- | ------------------ | ------------------------- |
| Intake y fronteras                      | R                | C            | A                         | C       | I              | I                  | I                         |
| Pillar/cluster y canonical de intención | R                | C            | A                         | R       | C              | I                  | I                         |
| Research y claim ledger                 | R                | C            | I                         | C       | A              | I                  | C                         |
| Permiso de caso/cliente                 | C                | I            | A                         | I       | R              | I                  | C/A                       |
| Elección de voz/speaker                 | R                | A            | C                         | I       | I              | I                  | C                         |
| Hook, draft y edición                   | R                | A            | C                         | C       | C              | I                  | I                         |
| Spec y validación Content Factory       | R                | C            | I                         | C       | I              | I                  | I                         |
| Dirección visual y generación           | R                | A/C          | C                         | I       | I              | I                  | C                         |
| Media Library y Gutenberg               | R                | I            | I                         | C       | I              | A/R                | I                         |
| Metadata, canonical, robots, schema     | R                | C            | C                         | A/R     | I              | R                  | I                         |
| Entidad de autor Yoast                  | R                | A            | I                         | C       | I              | R                  | C                         |
| Backup y rollback                       | R                | I            | I                         | I       | I              | A/R                | I                         |
| Aprobación de publicación               | C                | A            | A                         | C       | C              | I                  | C                         |
| Write `publish` y caché                 | R                | I            | I                         | I       | I              | A/R                | I                         |
| Verificación live                       | R                | C            | I                         | R       | I              | C                  | I                         |
| Cierre documental                       | R                | I            | A/C                       | C       | I              | I                  | I                         |

Una misma persona puede ocupar varios roles, pero las responsabilidades no desaparecen. Un agente nunca es `A`
de su propia publicación pública ni de un permiso de cliente.

## 5. Paquete de artefactos obligatorio

Todo blogpost end to end debe poder reconstruirse sin memoria conversacional.

| Fase              | Artefacto mínimo                                                      | Persistencia                                                       |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Intake            | PDR/brief o decisión editorial equivalente                            | Versionado bajo `docs/public-site/` cuando la apuesta es durable   |
| Research          | dossier SERP/intención + claim ledger                                 | Versionado; fuentes y `as-of` explícitos                           |
| Evidencia interna | página/registro Notion + owner + permiso + fecha de corte             | Referencia gobernada; no copiar bases completas al repo            |
| Arquitectura      | mapa pillar/cluster, query owner y canonical                          | En PDR/brief                                                       |
| Voz               | decisión `author + surface + speaker` y corpus usado                  | Brief/audit; no clonar el voice system                             |
| Copy              | contrato editorial/rewrite cuando el riesgo lo amerita                | Versionado para piezas pillar/thought leadership                   |
| Authoring         | `GutenbergArticleSpec`                                                | Versionada si es pieza estratégica; hash antes de aprobación       |
| Build             | draft generado + validación                                           | `tmp/`, no es source; regenerable desde la spec                    |
| WordPress         | post ID + manifest + author ID + status + readback                    | Audit/handoff; no secretos                                         |
| Visual            | visual system/brief + generación + manifest + auditoría               | `docs/public-site/` + `ai-generations/<run>/`                      |
| Media             | media IDs, URLs, ALT, caption, MIME, dimensiones, hash                | Manifest/audit + Media Library                                     |
| SEO/E-E-A-T       | auditoría de metadata, entidad, claims, schema y social               | Versionada para primera publicación o cambio material              |
| Backup            | snapshot pre-write + rollback guard                                   | `tmp/` o `/tmp` remoto, gitignored; ruta y existencia documentadas |
| Approval          | aprobador, timestamp, objeto aprobado y hash/readback                 | Handoff/audit o sistema de aprobación gobernado                    |
| Live QA           | HTTP/head, desktop/mobile, TOC, links, OG, schema, robots, duplicates | Audit/handoff; capturas sólo como evidencia, no como verdad        |
| Closure           | delta en docs owners aplicables                                       | Canonical + links; evitar duplicar la historia completa            |

### 5.1 Naming recomendado

```text
docs/public-site/<TOPIC>_PILLAR_CLUSTER_BRIEF_V1.md
docs/public-site/<TOPIC>_PILLAR_RESEARCH_DOSSIER_V1.md
docs/public-site/<TOPIC>_PILLAR_EDITORIAL_AUDIT_V1.md
docs/public-site/<TOPIC>_PILLAR_GUTENBERG_SPEC_V1.json
docs/public-site/<TOPIC>_PILLAR_VISUAL_SYSTEM_V1.md
docs/public-site/<TOPIC>_PILLAR_WORDPRESS_SEO_AUDIT_V1.md
ai-generations/YYYY-MM-DD_<topic>/README.md
ai-generations/YYYY-MM-DD_<topic>/manifest.json
tmp/<topic>-post-<id>-before-<operation>-<timestamp>.json
```

No es obligatorio crear todos los documentos para una nota pequeña. Sí lo es conservar la evidencia
equivalente. Una Pillar, un caso de cliente, una corrección global de autor o una primera ejecución de pipeline
requieren el paquete completo.

## 6. Flujo end to end universal

### Fase 0. Intake y preflight

**Objetivo:** demostrar que se está produciendo el artefacto correcto, en el runtime correcto y con autoridad
suficiente.

1. Leer `AGENTS.md`, `project_context.md`, `Handoff.md`, `docs/context/00_INDEX.md`, este runbook y el PDR/brief aplicable.
2. Cargar skills por ownership, no por conveniencia:
   - estrategia editorial: `content-marketing-studio`;
   - craft/voz: `copywriting`;
   - SEO/AEO/E-E-A-T: `seo-aeo`;
   - WordPress/Content Factory: `efeonce-public-site-wordpress`;
   - visuales: `design-studio` + `greenhouse-ai-image-generator` cuando corresponda;
   - cierre: `greenhouse-documentation-governor`.
3. Confirmar que el carril es `post` Gutenberg, no landing Elementor.
4. Definir objetivo, audiencia, JTBD, funnel, gran idea, CTA, byline, fecha y alcance.
5. Identificar si es pieza nueva, refresh de existente o migración de canonical.
6. Inspeccionar el runtime y el estado de WordPress antes de cualquier write.
7. Revisar trabajo concurrente y no tocar archivos ajenos.

**Comandos base:**

```bash
git status --short
pnpm public-website:runtime-status
pnpm public-website:discover -- --authenticated --wpcli --write
pnpm public-website:content-factory:patterns
pnpm public-website:content-factory:capabilities
```

`discover --write` crea evidencia de discovery; no autoriza cambios. Si el runtime o el contrato del blog
drifted desde la auditoría vigente, refrescar la lectura antes de avanzar.

**Gate:** objetivo, superficie, owner, aprobador, byline y fronteras explícitos.

**Bloqueo:** petición que mezcla artículo con implementación de producto, ausencia de aprobador o runtime no
verificado.

### Fase 1. Research, Notion y claim ledger

**Objetivo:** separar lo que sabemos, lo que inferimos, lo que Efeonce sostiene y lo que no puede publicarse.

#### 1.1 Research externo

1. Registrar consulta, mercado, idioma, fecha, motor y método de la muestra SERP.
2. Revisar intención: informacional, comercial, software, jobs, servicio o categoría emergente.
3. Medir demanda sólo con herramienta disponible y citada. Si Semrush/GSC u otra fuente no está disponible,
   declarar la limitación y no inventar volumen, dificultad ni forecast.
4. Priorizar fuentes primarias: papers, DOI, documentación oficial, datasets y reportes metodológicamente
   identificables.
5. Para datos volátiles, reverificar al momento de redactar y otra vez antes de publicar.
6. Registrar alternativas, límites, conflictos de interés y si una fuente es encuesta, correlación, experimento,
   caso observado o postura comercial.

#### 1.2 Evidencia interna en Notion

Notion puede contener casos, métricas, aprobaciones y conocimiento operativo. Se consume así:

1. acceder read-only con el conector/API/CLI autenticado disponible;
2. registrar page ID, título, owner, `last_edited_time`, estado de aprobación y fecha de corte;
3. distinguir caso detallado, versión autorizada para blog y material interno no publicable;
4. verificar definiciones, periodo, muestra, denominador, método, mercados, exclusiones y permiso de cliente;
5. pedir confirmación humana si el estado o la redacción aprobada no es inequívoca;
6. enlazar el registro gobernado; no copiar una base completa ni PII al repo;
7. congelar en el claim ledger la formulación permitida y sus caveats.

Una página existente, un checkbox, una base compartida o una mención en chat no equivalen por sí solos a
permiso público. Si Notion no está disponible, el claim interno queda `blocked`, no `estimated`.

#### 1.3 Contrato del claim ledger

Cada claim material debe tener:

| Campo                     | Regla                                                                         |
| ------------------------- | ----------------------------------------------------------------------------- |
| `claim_id`                | ID estable dentro del dossier                                                 |
| `exact_claim`             | Frase o dato evaluado, no un tema genérico                                    |
| `type`                    | `fact`, `measurement`, `inference`, `hypothesis`, `efeonce_doctrine`, `quote` |
| `source`                  | URL/DOI/page ID y título                                                      |
| `source_class`            | primaria, secundaria, interna aprobada o comercial                            |
| `as_of`                   | fecha real de vigencia                                                        |
| `method_sample`           | muestra, periodo, mercados, denominador y método cuando aplica                |
| `evidence_scope`          | `case_first_party`, `vendor_product`, `independent_context` o `author_doctrine` |
| `claim_subject_population` | entidad/población exacta sobre la que habla el claim                          |
| `case_extrapolation`      | `allowed` o `forbidden`, con razón explícita                                  |
| `allowed_wording`         | redacción máxima respaldada                                                   |
| `forbidden_extrapolation` | lo que la fuente no demuestra                                                 |
| `permission`              | owner/aprobación para datos internos o de cliente                             |
| `status`                  | `proposed`, `verified`, `approved_public`, `rejected`, `stale`, `blocked`     |
| `owner`                   | persona responsable de confirmar/corregir                                     |

**Gate:** todo dato, caso y quote material está `verified` o `approved_public`; claims rechazados/stale no
aparecen en la spec.

**Bloqueo:** cifras sin denominador, causalidad derivada de correlación, evidencia interna sin permiso, fuente
secundaria presentada como medición propia o volumen SEO inventado.

No usar `first-party` sin calificador. Escribir `evidencia propia del caso/cliente` o `telemetría first-party del
fabricante`, porque ambas pueden ser auténticas y aun así hablar de poblaciones distintas. Un artículo puede
mostrar carriles separados para caso, proveedor y contexto independiente, pero debe conservar un solo inventario
de claims materiales.

Todo claim sobre una capacidad, automatización o agente debe registrar además `capability_state`, `environment`,
`channel`, `as_of`, `runtime_readback`, `blocker` y `allowed_wording`. Publicar sólo el estado más alto demostrado:
documentado, elegible, configurado, probado en entorno controlado o verificado en operación real. Un estado no
hereda el siguiente por inferencia; una dependencia administrativa, técnica o comercial pendiente se nombra sin
convertirla en una falla del producto ni ocultarla detrás de lenguaje futuro.

### Fase 2. Arquitectura pillar/cluster y query ownership

**Objetivo:** publicar una pieza con trabajo propio dentro del sistema editorial, no un artículo aislado que
después compita con sus satélites.

1. Definir entidad/término principal y pregunta canónica.
2. Declarar audiencia, JTBD, awareness y funnel.
3. Elegir si la pieza es Pillar, satélite, POV, caso, Glitch o nota táctica.
4. Si es Pillar, mapear satélites por intención independiente y aporte original.
5. Asignar una única URL dueña de la definición amplia.
6. Definir enlaces verticales y horizontales; no publicar links a destinos futuros vacíos.
7. Revisar canibalización con contenido existente de WordPress y Think.
8. Separar educación, conversión y producto futuro. La Pillar puede influir negocio, pero debe ser útil sin CTA.
9. Definir medición: descubrimiento, citación AEO, consumo, navegación, negocio y freshness.

**Gate:** query owner, canonical propuesta, cluster, enlaces disponibles y fronteras aceptados en PDR/brief.

**Bloqueo:** dos URLs quieren poseer la misma definición, la landing comercial se usa como Pillar, o el
artículo anuncia una capacidad no disponible.

### Fase 3. Elección de voz: Julio vs Efeonce

**Objetivo:** resolver speaker antes de escribir.

Aplicar el router `author + surface + speaker`:

| Condición                                                 | Voz primaria               | Regla                                                                       |
| --------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Artículo con byline de Julio                              | Julio                      | Observa, narra e interpreta; no inventar primera persona.                   |
| Marketing con Manzanitas                                  | Julio                      | Puede usar sus motivos pedagógicos cuando cumplen una función real.         |
| Thought leadership Efeonce firmado por Julio              | Julio + doctrina atribuida | Julio conduce; la postura organizacional se introduce como `En Efeonce...`. |
| Artículo institucional, multi-autor o sin byline personal | Efeonce                    | Profesional-directo, prueba sobre hype, sin intimidad prestada.             |
| Superficie institucional aunque Julio sea fundador        | Efeonce                    | La superficie prevalece sobre familiaridad tonal.                           |
| Autor/speaker incierto                                    | Bloqueado                  | No imitar a Julio como “voz humana genérica”.                               |

Para voz Julio, cargar el sistema vigente
[`JULIO_REYES_VOICE_SYSTEM.md`](../../../.codex/skills/copywriting/efeonce/JULIO_REYES_VOICE_SYSTEM.md). Para voz
institucional, cargar
[`EFEONCE_VOICE_SYSTEM.md`](../../../.codex/skills/copywriting/efeonce/EFEONCE_VOICE_SYSTEM.md).

#### Running motifs

`con manzanitas` / `te lo explico con manitas` pertenece a Julio. Sólo se usa si:

- la pieza está firmada/hablada por él;
- introduce una explicación realmente más concreta;
- suena natural en el contexto;
- aparece con moderación, normalmente una vez en un artículo largo;
- lleva exactamente `🍏🍏🍏` antes de la puntuación cuando se activa en copy visible; por ejemplo,
  `Vamos con manzanitas 🍏🍏🍏:`;
- el autor lo aprueba en la lectura final.

No se usa para “humanizar” output de IA, en UI, landings, propuestas, políticas, otro autor ni Efeonce
institucional.

**Gate:** decisión de voz escrita y corpus/voice system cargado.

**Bloqueo:** byline y voz no coinciden, doctrina Efeonce aparece como vivencia personal o se fabrica una
anécdota de Julio.

### Fase 4. Contrato editorial, hook y redacción

**Objetivo:** producir una pieza original, útil, citable y pronunciable, no un resumen sintético de fuentes.

1. Fijar una sola gran idea. Cada sección debe demostrarla o salir.
2. Diseñar el hook antes de definir el índice completo:
   - escena concreta;
   - anomalía/dato;
   - pregunta que el marco anterior no resuelve;
   - tensión que reinterpreta lo obvio.
3. Entregar la definición/answer capsule dentro del primer tramo del artículo, normalmente en el primer H2.
4. Usar un caso conductor cuando reduzca taxonomía y dé memoria al argumento.
5. Distinguir en la prosa evidencia, límite, inferencia, doctrina Efeonce y recomendación.
6. Poner fuentes inline próximas al claim; la bibliografía final complementa, no reemplaza.
7. Redactar H2 answer-first y párrafos autocontenidos que mantengan sentido si un motor recupera un pasaje.
8. Usar listas/tablas sólo cuando mejoran comprensión y recuperación.
9. Mantener es-CL neutro, tuteo y sin voseo.
10. Leer en voz alta y buscar simetría excesiva, transiciones genéricas, falsa intimidad, tríadas perfectas,
    preguntas decorativas y cierre prefabricado.
11. Diseñar una ruta de escaneo después de cerrar la prosa: usar énfasis semántico para tesis, cifras,
    contrastes y etiquetas decisivas; como heurística, no más de una guía principal por bloque de lectura.
12. Revisar esa jerarquía en desktop y móvil; el wrapping puede convertir una frase razonable en un muro de
    negrita. El énfasis nunca sustituye una fuente ni eleva un claim débil.
13. Integrar metodología, límites y disclosure en prosa conversacional. Una checklist E-E-A-T puede satisfacer
    un control y aun así romper el ritmo del artículo.
14. Hacer revisión autoral antes de diseñar el sistema visual.
15. Para audiencia `unaware` o `problem-aware`, comprobar que título y primer viewport se entienden sin conocer
    el término técnico: problema/JTBD reconocible primero, definición breve de la categoría después y detalle de
    producto/caso sólo cuando el lector ya ganó vocabulario.

**Gate editorial mínimo:**

- hook concreto;
- definición temprana;
- gran idea estable;
- voz correcta;
- claims y caveats visibles;
- caso ficticio rotulado o caso real autorizado;
- CTA útil y de baja presión;
- valor intacto si se elimina el CTA;
- cero promesas de producto no disponible;
- primer viewport comprensible al nivel de awareness declarado;
- lectura humana del autor.

**Bloqueo:** texto “correcto” pero sin autoría, hook basado en cifra no verificada, first-person inventada,
running motif decorativo o CTA que promete una capacidad inexistente.

### Fase 5. Construir la `GutenbergArticleSpec`

**Objetivo:** separar libertad semántica de ensamblado determinista.

La spec es el source editable. El draft Gutenberg generado es un output regenerable. Corregir contenido en la
spec, no parchear el output para que “pase”.

Campos actuales:

```text
title
slug?
excerpt
seo { title, description, indexPolicy? }
intro[]
sections[] { heading, level: 2|3, blocks[] }
tableOfContents?
cta?
intent?
attribution?
```

Bloques autorables por el primitive actual:

- `paragraph`;
- `list`;
- `table` nativa con headers, filas de ancho consistente y caption opcional;
- `quote`;
- `pullquote`;
- `separator`;
- `image` con media real, caption opcional y `linkDestination: none|media`;
- `embed` YouTube con URL aprobada.

Reglas duras:

- el título de WordPress es el único H1; el cuerpo comienza en H2;
- usar H2 para movimientos mayores y H3 para hijos; sin saltos de jerarquía;
- TOC Yoast poblado y headings con anchors `h-{slug}`;
- no generar `core/freeform` ni HTML libre;
- no inventar media IDs ni URLs;
- no producir un draft de puros párrafos;
- no usar un custom block si los nativos gobernados resuelven el trabajo;
- `indexPolicy` expresa intención editorial, pero el write actual no persiste por sí solo toda la metadata de
  robots, categoría, featured, canonical u Open Graph. Esa reconciliación se verifica antes de publicar.

### Fase 6. Rich text seguro y enlaces

Para enlaces inline en párrafos y listas, usar segmentos estructurados:

```json
{
  "kind": "paragraph",
  "text": [
    { "text": "La investigación encontró un tradeoff. " },
    { "text": "Ver estudio primario", "href": "https://doi.org/10.1126/sciadv.adn5290" },
    { "text": "." }
  ]
}
```

El renderer vigente:

- escapa texto y atributos;
- admite sólo `http:`, `https:` y `mailto:`;
- rechaza protocolos inseguros antes de producir Gutenberg;
- usa `new URL(...)`, por lo que el `href` debe ser absoluto en el contrato actual;
- aplica rich text a intro, párrafos, items de lista, celdas/caption de tabla, captions de imagen y CTA; quote y
  pullquote siguen siendo texto plano.

No insertar `<a>` manual, `target`, `onclick`, iframe, script ni `javascript:` dentro de la spec. Si una
capacidad falta, abrir trabajo del primitive; no rodearla con freeform.

**Gate:** todos los links nacen de segmentos seguros o blocks gobernados y sus destinos están revisados.

### Fase 7. Dry-run, validación y QA del draft

**Objetivo:** comprobar contenido y estructura sin tocar WordPress.

```bash
pnpm public-website:content-factory:run -- \
  --spec docs/public-site/<SPEC>.json \
  --out tmp/<slug>-generated-draft.json

pnpm public-website:content-factory:validate -- \
  --file tmp/<slug>-generated-draft.json
```

Interpretación:

- `pass`: habilita revisión; no autoriza write ni publicación;
- `warning`: requiere decisión humana/operativa por cada warning; `--allow-warnings` no es un bypass silencioso;
- `block`: hard stop;
- `info`: registrar y resolver si corresponde al brief, por ejemplo un slot de media recomendado.

Verificar al menos:

- metadata obligatoria y slug kebab-case;
- allowlist de bloques;
- balance de comentarios Gutenberg;
- ausencia de markup inseguro;
- H1 ausente en body;
- outline H2/H3 válido;
- TOC poblado y anchors presentes;
- lista y enrichment suficiente;
- media real o slot deliberadamente pendiente;
- `observedBlocks` consistente.

Tests focales cuando el primitive fue modificado:

```bash
pnpm exec vitest run \
  src/lib/public-site/content-factory/__tests__/article-authoring.test.ts \
  src/lib/public-site/content-factory/__tests__/gutenberg-blocks.test.ts \
  src/lib/public-site/content-factory/__tests__/gutenberg-validator.test.ts
pnpm typecheck
pnpm exec eslint src/lib/public-site/content-factory scripts/public-website/content-factory-run.ts
```

**Gate:** draft regenerable, validación aceptada y findings documentados.

### Fase 8. Crear el post privado

**Objetivo:** escribir una sola copia privada, con autor humano correcto e idempotencia.

```bash
pnpm public-website:content-factory:run -- \
  --spec docs/public-site/<SPEC>.json \
  --send \
  --author-id <WP_AUTHOR_ID> \
  --manifest greenhouse-cf-<slug>-v1
```

El write actual:

- crea un `post` con `post_status=private`;
- exige `--author-id` válido;
- usa el usuario de integración WP `12` sólo para ejecutar la operación remota;
- asigna el byline al autor humano pasado;
- marca `_greenhouse_owned=1`, manifest y source;
- escribe title, slug, excerpt, content y Yoast title/description;
- emite readback machine-readable;
- es idempotente por manifest.

`already_exists` significa **detenerse e inspeccionar el post existente**. No significa que la nueva spec fue
aplicada. No cambiar el manifest para forzar una copia duplicada.

La reejecución del mismo manifest no actualiza contenido. Para iterar sobre el mismo post privado, usar la
operación de update explícita descrita en la siguiente fase.

Después de crear:

1. guardar post ID, status, author ID/name, manifest, parsed blocks y edit URL;
2. comprobar que autor anónimo recibe `404` en el permalink;
3. ejecutar inspección profunda;
4. confirmar ownership y ausencia de copia previa con el mismo slug/canonical;
5. no purgar caché ni publicar como side effect.

```bash
pnpm public-website:content-factory:inspect-post-deep -- \
  --post-id <POST_ID> \
  --write

curl -sS -o /dev/null -w '%{http_code}\n' 'https://efeoncepro.com/<category>/<slug>/'
```

Un `404` anónimo es PASS para `private`. Un `200` es incidente.

**Nota de conteo:** `parse_blocks()` puede intercalar entradas `core/freeform` vacías entre bloques. Reportar
por separado bloques semánticos/gobernados, total raw y `nonEmptyFreeformCount`. Un freeform vacío no es deuda
autoral; un freeform no vacío sí requiere investigación.

### Fase 9. Iterar el mismo post privado con backup y guard

**Objetivo:** mejorar copy, media y metadata sin crear duplicados ni perder el baseline.

El create path de Content Factory no es un updater. Para escribir una versión posterior sobre el mismo post:

1. hacer readback autenticado `context=edit` o WP-CLI del post completo;
2. snapshotear content, title, excerpt, slug, status, author, categories, tags, featured media, ownership markers y
   meta Yoast relevante;
3. calcular hash del `post_content` y registrar `post_modified_gmt`;
4. preparar rollback antes del write;
5. verificar post ID, `_greenhouse_owned`, manifest y hash esperados;
6. aplicar REST/WP-CLI gobernado al post `private` existente;
7. abortar si el hash o modified timestamp cambió desde el snapshot;
8. leer de vuelta mediante una segunda operación independiente;
9. reejecutar inspección profunda y validación del contrato central.

Backup local recomendado:

```text
tmp/<slug>-post-<id>-before-vN-<ISO timestamp>.json
```

El update debe ser explícito y acotado. No se versiona un script con credenciales; no se imprime auth. Para
WP-CLI remoto usar el wrapper:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/<scoped-operation>.php --wp-user 12
```

Cuando el eval necesita assets o un payload local, usar `--input-file <path>` de forma repetible. El wrapper
copia cada input a `/tmp`, pasa sus rutas como `$args` a `wp eval-file` y elimina PHP + inputs al terminar. Esto
evita abrir una segunda vía SCP/SSH ad hoc y mantiene el mismo preflight/cleanup.

El hash authored puede diferir del hash raw de WordPress por normalizaciones deterministas. Caso confirmado:
WordPress convierte cada `🍏` a `&#x1f34f;` al persistir (`15` bytes de diferencia para tres emojis) y el frontend
lo renderiza como `img.emoji[alt="🍏"]`. Aceptar una equivalencia sólo si se demuestra el diff exacto y el resto
de los bytes/estructura coincide; nunca relajar el guard porque “WordPress suele normalizar”.

El script temporal debe fallar si no coinciden ID, manifest, owner o hash. Debe eliminarse local y remotamente
al terminar; el wrapper ya elimina su copia remota por defecto.

**Gate:** snapshot recuperable, guard pre-write, readback independiente y post aún `private`.

### Fase 10. Sistema visual, GPT Image 2 y Media Library

**Objetivo:** producir imágenes que expliquen el argumento y puedan rastrearse desde prompt a attachment.

#### 10.1 El brief visual nace después del copy

Cada imagen declara:

- trabajo editorial;
- ubicación en la narrativa;
- concepto y motivo recurrente;
- composición, crop y aspect ratio;
- restricciones de marca, personas, texto y derechos;
- ALT, caption y criterio de descarte;
- si es ilustración, diagrama, fotografía o evidencia real.

No agregar imágenes para “romper texto”. Si no aportan comprensión, no se generan.

Para diagramas con labels, cifras o claims, separar arte y tipografía: usar imagen generada sólo como base si
aplica y componer el texto de forma determinista, o producir todo el diagrama con una herramienta de layout
determinista. Revisar el asset dentro del tema real. Safe area no significa sólo crop: incluye sidebars, widgets
sticky, barras sociales y overlays del template. Si un diagrama horizontal pierde legibilidad en mobile,
proveer ALT/caption suficiente y un enlace a la media completa o una variante responsive gobernada.

Separar también **gramática visual** de **skin contextual**. Jerarquía, encoding, solapamiento, crop y responsive
deben ser agnósticos al tema; paleta, tipo, materialidad y firma se deciden por artículo. Una paleta asociada a
HubSpot sólo corresponde cuando el contenido trata realmente de HubSpot y nunca se convierte en branding
general de Efeonce.

Si el operador entrega una página o captura como referencia, auditar primero el source original: tipo de asset
(SVG/Lottie/CSS/raster), dimensiones/viewBox, geometría, transparencias, roles cromáticos, responsive y motion.
No intentar “recrear el look” con un modelo antes de saber cómo fue construido. Para escenas editoriales de
producto y gráficos exactos, cargar `.codex/skills/design-studio/modules/11_PRODUCT_STORY_SCENES.md` y el método
`.codex/skills/content-marketing-studio/references/deterministic-editorial-infographics.md` —o sus mirrors
`.claude/` cuando ejecute Claude—.

#### 10.2 Generación

Para GPT Image 2 usar la vía sancionada disponible en el entorno:

- Codex con herramienta nativa: `image_gen`, registrando `built-in-image-gen` y model family real;
- ejecución repo/operator: `pnpm ai:image` con prompt file, output y modelo explícitos.

```bash
pnpm ai:image \
  --prompt-file ai-generations/YYYY-MM-DD_<run>/prompts/<asset>.txt \
  --out ai-generations/YYYY-MM-DD_<run>/masters/<asset>-master-v1.png \
  --size 1536x1024 \
  --quality high \
  --model gpt-image-2
```

No declarar GPT Image 2 si la herramienta no confirmó ese modelo/familia. No imprimir keys ni usar scripts ad
hoc si el helper canónico cubre el caso.

Cuando se usen varias referencias, registrar su orden y rol (`positive-structure`, `positive-palette`,
`positive-brand`, `negative-cliche`, `negative-contamination`). Una anti-referencia no tiene peso negativo
nativo: describir el rasgo prohibido y verificar contaminación. Si se requieren texto, datos, logos o geometría
exactos, cambiar a SVG/composición determinística en vez de seguir refinando por azar.

#### 10.3 QA visual

Inspeccionar el master a resolución original con cinco gates:

1. concepto en tres segundos;
2. composición, foco y crop seguro;
3. continuidad del sistema;
4. integridad: anatomía, texto, logos, artefactos y provenance;
5. uso editorial: agrega comprensión y no simula evidencia.

Rechazar, no “arreglar con copy”, una imagen que falla el concepto. Una imagen generada no es prueba de cliente,
paper, producto real ni medición.

#### 10.4 Derivados

```bash
pnpm media:webp -- \
  --input ai-generations/YYYY-MM-DD_<run>/masters/<asset>-master-v1.png \
  --out ai-generations/YYYY-MM-DD_<run>/exports/<asset>-web-1440-v1.webp \
  --width 1440 \
  --quality 82

shasum -a 256 ai-generations/YYYY-MM-DD_<run>/masters/* ai-generations/YYYY-MM-DD_<run>/exports/*
```

- cuerpo raster: WebP optimizado con dimensiones conocidas;
- cuerpo vectorial: SVG directo cuando el contrato determinístico demuestra seguridad, autonomía, legibilidad y
  ventaja de entrega; source editable y delivery saneado permanecen separados;
- featured/OG: derivado `1200×630` o cercano a `1.91:1`;
- preferir JPEG/PNG social si el ecosistema de previews no trata el WebP de forma consistente;
- proteger el centro óptico y probar miniatura/card;
- no duplicar el featured dentro del body si Ohio ya lo renderiza.

Para SVG directo, aplicar el
[Editorial Infographic Operating Model](EDITORIAL_INFOGRAPHIC_OPERATING_MODEL_V1.md): un único `<img src>`
fallback dentro de `<picture>`, filename/ALT/caption/contexto HTML, alternativa larga para imágenes complejas,
GET `200`, `image/svg+xml`, dimensiones, crawlability, `currentSrc`, legibilidad CSS proyectada y CLS. En piezas
Efeonce de cuerpo, toda la firma —fuente/as-of, wordmark y `efeoncepro.com`— vive en el footer. El texto
contorneado no sustituye contenido HTML indexable. Featured, Yoast Article image y OG/Twitter conservan raster.

#### 10.5 Media Library

Subir por REST/WP-CLI autenticado sin exponer credenciales. Cada attachment requiere:

- author ID alineado con el owner editorial;
- slug y filename estables;
- title, ALT, caption y descripción;
- MIME, width, height, bytes y URL;
- hash del archivo local;
- `HTTP 200` del attachment/CDN;
- uso declarado: body, featured, Open Graph o fallback.

Registrar el `mediaId + url` real antes de añadir `kind=image` a la spec. El Content Factory no resuelve ni
inventa attachments.

**Gate:** manifest completo, originales inspeccionados, derivados optimizados, attachments `200` y nueva spec
validada con media real.

### Fase 11. SEO, AEO, E-E-A-T y metadata completa

**Objetivo:** alinear el post, la entidad, la ruta y la evidencia antes de pedir publicación.

#### 11.1 Metadata y taxonomía

Verificar como una unidad:

| Campo            | Contrato                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| H1/título WP     | Tesis editorial; único H1                                               |
| SEO title        | Responde intención y puede diferir del H1; tokens Yoast revisados       |
| Meta description | Promesa precisa, sin claim no respaldado                                |
| Slug             | Kebab-case, estable y decidido antes de publicar                        |
| Excerpt          | Curado para cards Ohio; no duplicar la meta sin intención               |
| Focus keyphrase  | Entidad/query primaria de trabajo                                       |
| Categoría        | Categoría editorial canónica; decidir antes del permalink público       |
| Primary category | Coherente con categoría y breadcrumb                                    |
| Tags             | Sólo tags gobernados, útiles y no redundantes; cero tags es válido      |
| Featured media   | Attachment real y apropiado para card/social                            |
| Canonical        | Una URL pública dueña, exacta y auto-consistente                        |
| Robots           | `noindex, follow` mientras no se aprueba indexar; `index, follow` final |
| OG/Twitter       | `article`, título/description, `summary_large_image`, imagen `200`      |
| CTA/UTM          | Destino aprobado, attribution gobernada y sin PII en `dataLayer`        |

El permalink actual usa `/%category%/%postname%/`. Cambiar la categoría de un post publicado puede cambiar su
URL. Antes del primer publish, resolver categoría. Después, cualquier retaxonomía exige redirect/canonical plan.

No heredar tags demo, duplicados o typos del content hub. No crear tags sólo para repetir keywords.

#### 11.2 SEO/AEO de contenido

- answer capsule temprana;
- H2 con respuesta directa antes de desarrollo;
- párrafos autocontenidos y recuperables;
- entidades y términos vecinos definidos sin keyword stuffing;
- fuentes primarias inline;
- enlaces internos sólo a destinos publicados;
- panel de preguntas AEO con motor, fecha, país/idioma y fuente citada;
- freshness y owner de revisión;
- una sola canonical entre WordPress y Think.

#### 11.3 E-E-A-T y transparencia

El artículo debe responder:

- **Who:** autor, cargo/experiencia relevante y, cuando aplica, revisor;
- **How:** método, selección de fuentes, alcance y limitaciones;
- **Why:** trabajo editorial para el lector, no excusa para vender humo;
- **IA:** qué apoyó la IA y qué decidió/revisó el humano.

Casos propios incluyen método, periodo, muestra, mercados, permisos y límites. No presentar un caso observado
como experimento controlado ni una mejora local como garantía universal.

#### 11.4 Entidad de autor Yoast

Antes de publicar, inspeccionar el nodo `Person` que Yoast enlaza desde `Article/BlogPosting`:

- WordPress user ID y nombre correcto;
- URL/perfil de autor;
- bio/description;
- `sameAs`;
- `jobTitle`;
- `worksFor`;
- `knowsAbout`;
- relación `author`/`publisher` dentro del graph.

Corregir un perfil de autor es un cambio global que afecta todas sus piezas. Requiere snapshot separado,
aprobación del autor, write gobernado, purge de caché y readback del JSON-LD público. No “arreglar” datos
personales por inferencia.

Si existen dos usuarios con el mismo display name, resolver por user ID, login y entidad. El usuario de
integración no debe quedar como autor editorial.

#### 11.5 Schema

Preferir el graph de Yoast. Verificar salida renderizada, no sólo metas:

- `Article` o `BlogPosting`;
- `WebPage`;
- `ImageObject`;
- `BreadcrumbList`;
- `WebSite`;
- `Organization` publisher;
- `Person` author.

No duplicar `Organization`, `Article` o breadcrumbs con JSON-LD manual. `FAQPage` sólo si las preguntas y
respuestas son visibles, la política vigente lo justifica y no duplica otro owner.

**Gate:** matriz metadata completa, autor correcto, claims/Who-How-Why/IA visibles y schema esperado en preview/readback.

### Fase 12. Revisión privada y aprobación humana

**Objetivo:** ligar la aprobación a una versión exacta, no a una conversación vaga.

#### 12.1 Revisión privada obligatoria

Revisar en WP Admin/preview autenticado:

- título/H1 y primer viewport;
- hook, intro y TOC;
- outline completo;
- fuentes, caso y disclosure;
- imágenes, crops, ALT y captions;
- CTA;
- desktop y mobile `390px`;
- links, focus/teclado y ausencia de overflow;
- preview Ohio/editor y cards cuando sea posible.

Si no existe acceso autenticado suficiente para ver el template real, el estado es `private content complete;
authenticated render pending`. No publicar por reflejo. Una ventana `publish + noindex` requiere aprobación
específica y rollback listo.

#### 12.2 Approval packet

Entregar al aprobador:

- post ID y URL futura;
- spec y SHA-256;
- timestamp/hash del readback privado;
- H1, SEO title, description, excerpt;
- autor y perfil de entidad;
- categoría, tags, canonical y robots final;
- featured/OG y media de cuerpo;
- resumen del claim ledger y permisos;
- links/CTA;
- findings abiertos y riesgo residual;
- snapshot y rollback;
- cambio exacto que hará `publish`.

Escanear además todo el copy visible dependiente del lifecycle —título, cuerpo, nota de autoría, captions, CTA y
excerpt— contra el estado autorizado. Marcadores como `este borrador`, `antes de publicar`, `cuando se publique`,
`pendiente de aprobación` o `se publicará` deben ser verdaderos para el estado final o eliminarse antes de congelar
el hash. Preferir disclosures estables entre private/public. Si una variante pública es necesaria, ambos textos y
la transición exacta forman parte del approval packet; no se improvisan después.

```bash
shasum -a 256 docs/public-site/<SPEC>.json
```

La aprobación debe registrar aprobador, fecha, versión/hash y si autoriza:

1. contenido/claims;
2. voz/byline;
3. visuales;
4. metadata/canonical/indexación;
5. write público.

Cualquier cambio material posterior en claims, hook, CTA, autor, ruta, robots o media invalida la aprobación y
requiere una nueva. Typos sin cambio semántico pueden seguir una política explícita, nunca una suposición.

**Gate:** `human_approved_for_publish` con objeto exacto y rollback preparado.

### Fase 13. Publicación, caché y rollback inmediato

**Objetivo:** convertir el post privado aprobado en público sin introducir cambios editoriales durante el write.

#### 13.1 Pre-write de publicación

1. volver a leer status, manifest, owner, hash y modified timestamp;
2. abortar si difieren del approval packet;
3. tomar snapshot final completo del post y, si cambió, del author profile;
4. comprobar canonical/rutas duplicadas una última vez;
5. verificar que category, tags, featured, Yoast y robots deseados ya están reconciliados;
6. preparar script/operación de contención `publish -> private/noindex`;
7. repetir el scan de lenguaje de estado sobre el contenido exacto que quedará público;
8. confirmar que el operador sigue autorizando.

#### 13.2 Write

Aplicar una operación acotada por REST autenticado o WP-CLI gobernado:

- mismo post ID;
- `post_status=publish`;
- política robots aprobada;
- cero cambios de copy no presentes en el approval packet;
- readback inmediato de status, permalink, author, categories, featured y metas clave.

No usar el create command con un manifest nuevo. No crear una segunda URL para “probar”.

#### 13.3 Caché

Después de una mutación pública:

1. purgar caché Kinsta;
2. si se cambió entidad Yoast/global u object cache stale, ejecutar también el flush aplicable;
3. verificar que la purga terminó correctamente;
4. hacer requests anónimos sin depender sólo de query params de bypass.

Comando remoto canónico en contexto WP-CLI:

```bash
wp kinsta cache purge --all
```

El wrapper repo acepta `eval-file`, no subcomandos arbitrarios. Si se opera mediante wrapper, el eval temporal
debe invocar el comando WP-CLI de forma acotada y emitir resultado; no mantener un script genérico de cache
purge con secretos.

No purgar caché como efecto lateral de dry-run o de una iteración privada que no afecta render público.

#### 13.4 Falla durante publicación

- Si el write no devuelve readback: estado desconocido; inspeccionar antes de reintentar.
- Si quedó `publish` sin metadata/robots correctos: poner `private + noindex`, purgar y verificar `404`.
- Si es una primera publicación y la caché no puede purgarse: contener a `private`, no declarar éxito.
- Si se actualizó una pieza ya pública: restaurar snapshot público previo o contener según impacto; nunca borrar.
- Si el hash cambió por concurrencia: abortar; no sobrescribir al otro actor.

**Gate:** write confirmado, caché purgada y estado `published_unverified` listo para QA inmediata.

### Fase 14. Verificación live desktop/mobile

**Objetivo:** probar el sistema público completo, no sólo la base de datos.

#### 14.1 HTTP, canonical y rutas

- URL final responde `200` anónimo;
- HTTP→HTTPS y variantes host/path redirigen correctamente;
- `<link rel="canonical">` coincide exactamente con la URL dueña;
- ninguna ruta equivalente en WordPress/Think responde `200` con la misma pieza;
- slug search autenticado no devuelve copias inesperadas;
- categoría/breadcrumb/permalink son coherentes;
- robots meta y `X-Robots-Tag` no se contradicen;
- `robots.txt` no bloquea la ruta indexable;
- sitemap Yoast incluye la URL cuando corresponde.

#### 14.2 Render desktop/mobile

Verificar al menos:

- desktop `1440×1000`;
- mobile `390×844`;
- un único H1, contenido dentro del viewport;
- `document.documentElement.scrollWidth <= clientWidth`;
- sin solapamiento artículo/footer;
- tipografía, contraste y jerarquía legibles;
- imágenes con `naturalWidth > 0`, tamaño/crop correcto y sin duplicar featured;
- `currentSrc` correcto por viewport/tema, texto esencial `>=16 CSS px`, notas `>=12–14 CSS px` y sin LayoutShift
  material cuando una variante cambia aspect ratio;
- infografías complejas con ALT breve y descripción larga equivalente visible/enlazada;
- TOC visible, navegable y con todos sus destinos existentes;
- navegación por teclado y focus de links;
- lenguaje de estado coherente con `publish` en cuerpo, notas, captions, CTA y excerpt;
- consola sin errores relevantes.

Una captura `fullPage` puede ocultar overflow horizontal. Medir `scrollWidth`; no inferirlo de la imagen.

#### 14.3 Links y CTA

1. extraer links HTTP únicos;
2. validar internos, fuentes, media y CTA;
3. clasificar `2xx/3xx`, `403 protegido`, timeout, `404/5xx`;
4. no marcar automáticamente como roto un DOI/provider que bloquea bots con `403`;
5. investigar manualmente todo `404/5xx` y timeout material;
6. verificar UTM/campaign y ausencia de PII en URLs/dataLayer.

#### 14.4 Open Graph y social

- `og:type=article`;
- `og:title`, `og:description`, `og:url`, locale y site name;
- `og:image` pública `200`, MIME y dimensiones esperados;
- Twitter `summary_large_image`;
- image URL no depende de auth y no es un fallback global accidental.

#### 14.5 Schema y author entity

- JSON-LD parsea;
- `Article/BlogPosting` enlaza al `Person` correcto;
- `Organization` publisher correcto;
- `articleSection`, image, breadcrumb, dates e idioma correctos;
- no hay nodos manuales duplicados;
- datos del autor coinciden con el approval packet después de caché.

#### 14.6 Duplicados WordPress/Think

Comprobar:

- slug y variantes de categoría en WordPress;
- rutas candidatas en Think/Astro;
- índices/content collections del repo satélite cuando esté disponible;
- canonical de cualquier versión histórica;
- redirects si existió una URL anterior.

No basta con “no la encontré en Google”: la duplicación se verifica en runtime y source registries.

#### 14.7 Discovery e inspección de indexación

El gate sincrónico de publicación termina cuando la URL live es rastreable y aparece en el sitemap Yoast correcto
con `<lastmod>` honesto. La indexación de Google es asíncrona y no debe falsearse como condición ya cumplida.

- no llamar al sitemap ping legado: Google lo retiró y devuelve `404`;
- no usar la Indexing API para artículos o landings genéricos; sólo corresponde a `JobPosting` y
  `BroadcastEvent` dentro de `VideoObject`;
- URL Inspection API observa la versión conocida por el índice; no ejecuta live test ni solicita indexación;
- una solicitud manual desde URL Inspection puede reservarse para unas pocas URLs críticas, sin promesa de plazo;
- cuando exista la capability verificada de `TASK-1426`, registrar checkpoints `0h`, `24h` y `72h` separados del
  gate de publicación; hasta entonces, no inventar evidencia automatizada.

Contrato técnico ampliado:
`.codex/skills/seo-aeo/references/google-search-console-api-indexing.md`.

**Gate live:** todos los checks críticos pasan. Links protegidos/timeouts quedan clasificados con riesgo
residual; un `404/5xx`, canonical duplicado, robots incorrecto, schema roto o render móvil defectuoso bloquea.

### Fase 15. QA, documentación y cierre

**Objetivo:** cerrar el loop con evidencia durable y estado honesto.

1. ejecutar QA proporcional del Content Factory si hubo cambio de código;
2. ejecutar `greenhouse-qa-release-auditor`/`pnpm qa:gates --changed` para cambios no triviales de runtime,
   tooling o integración; un post content-only puede usar el set focal documentado;
3. invocar `greenhouse-documentation-governor`;
4. actualizar los owners documentales aplicables: PDR/brief, audit, index de generaciones, roadmap,
   `project_context.md`, `Handoff.md`, `changelog.md`;
5. no duplicar el contenido completo: dejar estado, evidencia, riesgo y links al canon;
6. registrar próxima revisión/freshness, owner y trigger;
7. clasificar cierre como `complete`, `published; verification pending` o `operatively blocked`.

Para un cambio exclusivamente documental del runbook, el cierre mínimo es:

```bash
git diff --check -- docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md
pnpm docs:closure-check -- docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md
```

## 7. Contrato de backup y rollback

### 7.1 Snapshot mínimo de post

Antes de cualquier update o publish guardar:

- post ID/type/status;
- title, slug, excerpt y `post_content` raw;
- author ID;
- category IDs, tags y primary category;
- featured media ID;
- permalink;
- `post_modified`/`post_modified_gmt`;
- `_greenhouse_owned`, manifest y source;
- Yoast title, metadesc, focus keyphrase, canonical, robots y social fields relevantes;
- hash SHA-256 de content y del snapshot;
- media refs del body;
- fecha, actor y operación prevista.

El snapshot vive en `tmp/` o `/tmp` remoto, nunca contiene credenciales y no se versiona salvo una política
específica de evidencia redacted.

### 7.2 Snapshot de autor

Si se cambia la entidad global:

- user ID/login/display name;
- URL y description;
- meta de `sameAs`, cargo, organización, conocimiento y SEO;
- JSON-LD público antes del cambio;
- ruta remota/local del backup.

La restauración del perfil no se mezcla con el rollback del post: son dos objetos y dos blast radii.

### 7.3 Rollback por etapa

| Etapa                                      | Acción                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Create privado erróneo                     | Verificar `_greenhouse_owned + manifest + private`; trash, no delete permanente, sólo con autorización.      |
| Update privado defectuoso                  | Restaurar snapshot completo al mismo post, conservar `private`, re-inspeccionar.                             |
| Publish reciente sin indexación confirmada | Contener a `private + noindex`, purgar caché, confirmar `404`.                                               |
| Primera publicación indexable defectuosa   | Contener a `private + noindex`, purgar, restaurar contenido/meta o decidir redirect/retirada con SEO.        |
| Update de post ya público defectuoso       | Restaurar snapshot público anterior, conservar URL/canonical, purgar y verificar.                            |
| Entidad de autor defectuosa                | Restaurar snapshot del usuario/meta, purgar object/Kinsta cache, verificar graph en varias piezas.           |
| Media defectuosa                           | Quitar referencia del post/featured y restaurar attachment previo; no borrar si puede tener otros consumers. |

### 7.4 Guard de rollback

El rollback también debe verificar post ID, ownership y estado actual. No restaurar a ciegas sobre cambios
posteriores de otro actor. Si el hash ya no coincide, abrir reconciliación y mantener el post privado cuando sea
posible.

## 8. Contrato de aprobación humana

La aprobación es una capability, no una cortesía editorial.

### 8.1 Aprobaciones separables

- **Research/claims:** owner de datos/SME.
- **Permiso de cliente/caso:** owner de negocio y legal/brand cuando aplica.
- **Autoría/voz:** byline real.
- **Visuales:** autor/brand/editorial.
- **SEO/canonical/indexación:** SEO/AEO + owner de Public Site.
- **Publicación:** operador humano autorizado.

### 8.2 Qué no vale como aprobación

- silencio;
- “se ve bien” sin identificar versión;
- aprobación de V2 aplicada luego a V4;
- un estado de Notion sin owner/fecha;
- aprobación para borrador interpretada como autorización para indexar;
- que el agente haya pasado tests;
- que el post ya esté accidentalmente visible.

### 8.3 Expiración

La aprobación expira al cambiar materialmente:

- claim/cifra/caso;
- hook/tesis/conclusión;
- author/byline;
- URL/canonical/categoría;
- robots;
- CTA/destino;
- featured/OG o visual con implicaciones de marca;
- disclosure metodológico.

## 9. Definition of Done

Un blogpost está `documented_closed` sólo cuando todos los ítems aplicables son verdaderos.

### Estrategia y research

- [ ] Objetivo, audiencia, JTBD, funnel y gran idea definidos.
- [ ] Pillar/satélite y query owner resueltos.
- [ ] Canonical único decidido antes de publicar.
- [ ] Research declara fecha, mercado, método y limitaciones.
- [ ] No hay volumen/dificultad/forecast inventado.
- [ ] Claim ledger completo; fuentes y casos aprobados.
- [ ] Evidencia Notion conserva owner, versión y permiso.

### Voz y copy

- [ ] `author + surface + speaker` resuelto.
- [ ] Voz Julio/Efeonce aplicada sin mezcla invisible.
- [ ] Hook concreto, definición temprana y una gran idea.
- [ ] Running motif, si existe, es autoral y funcional.
- [ ] Evidencia, inferencia, doctrina y límites se distinguen.
- [ ] Autor humano revisó copy y primera persona.
- [ ] IA y método están transparentados cuando aplica.
- [ ] Copy visible no conserva lenguaje de borrador/aprobación futura incompatible con el estado final.

### Content Factory y Gutenberg

- [ ] Spec versionada o preservada con hash.
- [ ] Dry-run/validator aceptados.
- [ ] Único H1 propiedad de WordPress.
- [ ] Outline H2/H3 válido.
- [ ] TOC poblado y todos los anchors resuelven.
- [ ] Cero freeform no vacío nuevo.
- [ ] Rich text usa segmentos seguros.
- [ ] Bloques/media son soportados y reales.
- [ ] Manifest idempotente y author ID correctos.
- [ ] Inspección profunda post-write realizada.

### Media

- [ ] Visual brief por función narrativa.
- [ ] Motor/modelo real registrados.
- [ ] Masters inspeccionados a resolución original.
- [ ] Derivados web/social optimizados y hasheados.
- [ ] Media IDs, URLs, MIME, dimensiones, ALT y captions verificados.
- [ ] Featured/OG no se duplica accidentalmente en body.
- [ ] Imagen generada no se presenta como evidencia real.

### SEO/AEO/E-E-A-T

- [ ] H1, SEO title, description y excerpt revisados.
- [ ] Slug, categoría, primary category y tags resueltos.
- [ ] Robots final coincide con aprobación.
- [ ] Canonical exacto y sin duplicados WP/Think.
- [ ] Fuentes inline y answers recuperables.
- [ ] Author `Person`, publisher y relaciones correctos.
- [ ] Yoast graph parsea sin nodos duplicados.
- [ ] OG/Twitter e imagen social `200`.
- [ ] CTA/UTM gobernado y sin PII.

### Seguridad operativa

- [ ] Snapshot pre-write completo y rollback preparado.
- [ ] Guard de hash/modified timestamp pasó.
- [ ] Aprobación humana ligada a versión exacta.
- [ ] Write/readback conservó post ID, owner y manifest.
- [ ] Caché purgada después de mutación pública.
- [ ] Ninguna credencial quedó en archivos/logs.

### Live QA y cierre

- [ ] URL anónima `200` final; private previo fue `404`.
- [ ] Desktop `1440` y mobile `390` inspeccionados.
- [ ] Cero overflow horizontal medido.
- [ ] Imágenes cargan y TOC navega.
- [ ] Links clasificados; cero `404/5xx` confirmado.
- [ ] Canonical, robots, OG, schema y author verificados en HTML live.
- [ ] URL incluida en el sitemap correcto con `lastmod` honesto; seguimiento GSC reportado aparte si aplica.
- [ ] Rutas duplicadas revisadas en runtime/source.
- [ ] Consola sin errores materiales.
- [ ] Proceso de QA terminó naturalmente y cerró browser, contexts, requests, timers y reporte.
- [ ] Freshness/owner de revisión definidos.
- [ ] Auditoría, handoff, changelog/roadmap/índices sincronizados cuando aplica.
- [ ] Estado final reportado honestamente.

## 10. Anti-patterns prohibidos

1. **Publicar desde la generación.** El agente produce y valida; el humano aprueba el write público.
2. **Cambiar el manifest para escapar de `already_exists`.** Crea duplicados y rompe idempotencia.
3. **Confundir spec con runtime.** La spec no prueba qué sirve WordPress.
4. **Confundir `private` con `draft` local.** Son estados/artefactos distintos.
5. **Usar el usuario de integración como autor.** El ejecutor técnico no es el byline.
6. **Elegir por display name.** Resolver author por ID/login/entidad; los nombres pueden estar duplicados.
7. **Escribir Gutenberg o anchors a mano.** Reaparece TOC muerto, H1 duplicado y markup frágil.
8. **Insertar HTML de links en la spec.** Usar rich-text estructurado y protocolos allowlisted.
9. **Serializar texto es-CL a PHP con `\uXXXX`.** Usar UTF-8 raw/nowdoc del primitive.
10. **Inventar media IDs o subir placeholders.** La imagen debe existir y responder `200`.
11. **Diseñar visuales antes de aprobar copy.** Produce decoración, no explicación.
12. **Usar GPT Image como evidencia.** Un visual conceptual no prueba ciencia, producto ni caso.
13. **Pegar texto dentro del raster.** Riesgo de texto defectuoso, inaccesibilidad y fragilidad de localización.
14. **Usar WebP social sin probar previews.** Mantener derivado JPEG/PNG cuando la compatibilidad lo requiera.
15. **Retaxonomizar después de publicar sin plan.** La categoría participa en el permalink.
16. **Crear tags por keyword.** El content hub contiene deuda demo/duplicados; cero tags es preferible a ruido.
17. **Forzar canonical manual mientras el sistema está noindex sin entender Yoast.** Verificar output live.
18. **Duplicar Article/Organization/Breadcrumb schema.** Yoast es el owner salvo decisión explícita.
19. **Usar FAQ schema sin FAQ visible.** Schema no crea contenido ni elegibilidad por sí solo.
20. **Corregir datos del autor por inferencia.** Es un perfil global y requiere confirmación/snapshot.
21. **Tratar `403` de una fuente como link roto automático.** Clasificar protección, timeout y fallo real.
22. **Ver sólo screenshot fullPage.** Medir `scrollWidth`, anchors, naturalWidth, head y JSON-LD.
23. **Limpiar caché en dry-run.** Discovery y validación son read-only.
24. **Borrar como rollback.** Restaurar/contener primero; trash sólo para private owned y con autorización.
25. **Convertir el artículo en product spec.** El contenido informa producto; no lo implementa.
26. **Usar Handoff como canon.** Sirve continuidad, no reemplaza PDR, código, runtime ni este runbook.
27. **Publicar copy que describe otro lifecycle.** `Este borrador` o aprobación futura dentro de una pieza live
    es drift editorial; detectarlo antes del hash público y repetir el scan después del publish.

## 11. Comandos y evidencia operativa

### 11.1 Discovery y authoring

```bash
pnpm public-website:runtime-status
pnpm public-website:discover -- --authenticated --wpcli --write
pnpm public-website:content-factory:patterns
pnpm public-website:content-factory:capabilities

pnpm public-website:content-factory:run -- \
  --spec docs/public-site/<SPEC>.json \
  --out tmp/<slug>-draft.json

pnpm public-website:content-factory:validate -- \
  --file tmp/<slug>-draft.json
```

### 11.2 Create privado e inspección

```bash
pnpm public-website:content-factory:run -- \
  --spec docs/public-site/<SPEC>.json \
  --send \
  --author-id <AUTHOR_ID> \
  --manifest greenhouse-cf-<slug>-v1

pnpm public-website:content-factory:inspect-post-deep -- \
  --post-id <POST_ID> \
  --write
```

### 11.3 Operación WP-CLI acotada

```bash
pnpm public-website:wpcli -- \
  --eval-file ./tmp/<scoped-operation>.php \
  --wp-user 12
```

Requisitos del eval temporal:

- sin secretos;
- ID/manifest/owner/hash como guards;
- una sola operación;
- readback machine-readable;
- rollback conocido;
- eliminación al terminar.

### 11.4 Media

```bash
pnpm ai:image --prompt-file <prompt.txt> --out <master.png> --model gpt-image-2 --quality high
pnpm media:webp -- --input <master.png> --out <asset.webp> --width 1440 --quality 82
shasum -a 256 <master.png> <asset.webp>
```

### 11.4.1 Estado actual de automatización de publicación

El repositorio todavía no expone un comando genérico
`public-website:content-factory:publish` ni un verificador live contractual único. Las operaciones acotadas en
`tmp/` son evidencia de cada caso, no una capability reusable. Hasta que exista tooling probado:

- cada publicación usa approval packet, snapshot/rollback, guards y readback propios;
- ningún script temporal se copia como plantilla sin volver a resolver post, hashes, metadata y criterios;
- el QA cierra recursos de Playwright/HTTP en `finally` y termina naturalmente; un proceso colgado es un finding
  de infraestructura, no un PASS, y `process.exit(0)` no sustituye cleanup;
- snapshots local/remoto se conservan y comprueban hasta alcanzar `live_verified`.

Una futura capability durable debe consumir un approval packet machine-readable, publicar sólo el mismo post,
emitir primero `published_unverified` y producir un reporte único para HTTP/canonical/robots, OG/Twitter, schema,
autor, desktop/móvil, TOC/imágenes/overflow, links, archive, sitemap, duplicados y readback. Debe probar success y
failure bajo un budget acotado, sin Chromium children, sockets o timers propios abiertos al terminar.

### 11.5 HTTP/live

```bash
curl -sS -I 'https://efeoncepro.com/<category>/<slug>/'
curl -sS -I 'https://efeoncepro.com/wp-content/uploads/<asset>'
curl -sS 'https://efeoncepro.com/<category>/<slug>/' > tmp/<slug>-live.html
```

No usar sólo `curl -I` para páginas si el CDN/theme trata HEAD distinto de GET. Confirmar también GET anónimo.

### 11.6 Cierre

```bash
git diff --check
pnpm docs:closure-check -- <paths-del-cambio>
pnpm qa:gates --changed
```

Ejecutar `qa:gates` proporcionalmente; registrar blockers ajenos al scope en vez de editar trabajo concurrente.

## 12. Instancia de calibración: Creative Workflows `251363`

Esta sección demuestra la aplicación del runbook. No reemplaza los artefactos fuente ni repite sus textos.

### 12.1 Decisión y arquitectura editorial

- [PDR-014](../../public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md)
  aceptó Creative Workflows como territorio editorial.
- El [brief Pillar + cluster](../../public-site/CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md) fijó audiencia,
  JTBD, gran idea, Pillar y doce satélites en tres olas.
- La Pillar posee la definición amplia; los satélites profundizan preguntas independientes.
- La landing Agencia Creativa conserva el trabajo de conversión.
- El contenido crea soporte científico/editorial para Creative Studio futuro; no implementa Creative Workflows.

### 12.2 Research, claims y Notion

- El [dossier de research](../../public-site/CREATIVE_WORKFLOWS_PILLAR_RESEARCH_DOSSIER_V1.md) registró muestra
  SERP, ausencia de datos Semrush, cinco claims científicos, límites y claims prohibidos.
- No se atribuyeron volúmenes de búsqueda ni dificultad inventados.
- La V4 incorporó mercado, papers primarios y experiencia aplicada con límites visibles.
- El caso SKY se apoyó en dos páginas Notion distintas: caso detallado y versión blog aprobada, enlazadas desde
  la [auditoría E-E-A-T V4](../../public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md).
- El caso declaró `178` piezas, cinco mercados y reducción observada `21–25%`, junto con cuatro caveats. Esos
  valores pertenecen al caso y no son benchmark universal.

### 12.3 Voz y evolución editorial

- Autor real: Julio Reyes, WordPress user ID `1`.
- El user ID `11` con el mismo display name provenía de un import y no debía usarse.
- El user ID `12` fue el ejecutor de integración, nunca el byline.
- La [reescritura V2](../../public-site/CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_REWRITE_V2.md) sustituyó una apertura
  abstracta por una escena, fijó el desplazamiento `generar -> decidir` y usó un caso conductor.
- La [auditoría editorial V2](../../public-site/CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md) validó hook,
  gran idea, voz, claim discipline y una única aparición funcional de `Vamos con manzanitas`.
- El voice system de Julio quedó separado de Efeonce institucional; el motivo no se generaliza.

### 12.4 Content Factory y estados

| Corte         | Estado y evidencia                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1            | Spec validada; create privado con manifest `greenhouse-cf-creative-workflows-pillar-v1`; post `251363`; author `1`; re-run `already_exists`; anónimo `404`.               |
| Inspección V1 | `75` bloques semánticos/gobernados; el raw de `parse_blocks()` reportó `149` por `74` freeform vacíos; `nonEmptyFreeformCount=0`; TOC y 20 headings.                      |
| V2            | Dry-run editorial de `98` bloques; el post no fue modificado en esa fase.                                                                                                 |
| V3            | Update explícito al mismo privado con snapshot; `101` bloques, tres imágenes, featured/OG, categoría y SEO; aún `private/noindex`.                                        |
| V4            | `111` bloques, 21 headings, tres imágenes, fuentes inline, caso SKY, metodología/IA y CTA; publicación humana autorizada; `publish`, `index, follow`.                     |
| V4 lectura    | misma estructura y metadata; `99` énfasis semánticos, metodología condensada en tres párrafos y firma visible `Vamos con manzanitas 🍏🍏🍏:`; QA `1440x1000` + `390x844`. |
| V5 visual     | `114` bloques, cinco imágenes, seis captions y un `core/table`; dos diagramas deterministas con enlace a media; QA live `1440x1000` + `390x844`.                        |

La [inspección profunda V1](post-deep-inspection-251363-2026-07-15T05-25-14+00-00.json) es evidencia histórica,
no estado live. La [spec V4](../../public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json) y la auditoría
E-E-A-T registran el primer corte publicado.

La [spec V5](../../public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json) es el corte live vigente. La
[inspección profunda V5](post-deep-inspection-251363-2026-07-15T20-17-52+00-00.json) confirmó cinco
`core/image`, un `core/table`, cero freeform no vacío y cero media issues.

### 12.5 Rich text seguro y jerarquía de lectura

La necesidad de poner fuentes primarias junto al claim reveló que URLs desnudas al final no bastaban. El
primitive de authoring incorporó segmentos rich text para intro, párrafos, listas y CTA, con `href` allowlisted
y `strong` semántico. Tests focales verificaron escaping, protocolos inseguros, links y combinaciones
`link + strong`. El artículo no introdujo custom blocks ni `core/freeform` nuevo.

La negrita se aplicó como arquitectura de lectura después de cerrar la prosa: `99` segmentos en una Pillar de
4.488 palabras visibles, equivalentes al `16,6%` de las palabras; máximo dos énfasis por bloque y sólo dos
bloques con más de uno. Es evidencia del caso, no un umbral universal. El gate reusable es cualitativo: cada
énfasis debe señalar qué conviene recordar y debe seguir respirando en mobile.

### 12.6 Sistema visual y Media Library

- Concepto: [La señal seleccionada](../../public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md).
- Motor registrado: GPT Image 2 vía `built-in image_gen`.
- Corrida durable:
  [`ai-generations/2026-07-15_creative-workflows-pillar`](../../../ai-generations/2026-07-15_creative-workflows-pillar/README.md).
- Cuatro masters y cinco derivados WebP, más un JPEG social.
- Media Library: WebP `251365–251368`; featured/OG JPEG `251370`; author `1`.
- Body V4: `251366`, `251367`, `251368`; el hero no se duplicó dentro del artículo.
- Todos los assets pasaron concepto, composición, continuidad, integridad y uso editorial según la
  [auditoría visual](../../public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md).
- V5 agregó `CW-V05–V06` como diagramas HTML/CSS deterministas renderizados con Playwright. Media V3 final:
  frontera `251393` y autonomía `251392`; V1 `251386–251387` quedó superseded por la safe area del widget Next
  Post y V2 `251389–251390` por defectos internos de composición detectados en revisión humana.
- Los diagramas enlazan al WebP completo para ampliación mobile y el scorecard usa `core/table`, no una captura.

**Corrección promovida a canon:** el QA de V2 fue un falso positivo porque protegía el theme chrome, pero no
detectó conectores sobre copy/listas, un ordinal oculto, un label recortado, una tarjeta sobre el cierre y una
colisión de puntuación. Para todo diagrama con texto, inspeccionar primero el raster original al `100%` y luego
el runtime live. Los gates son independientes: todos los ordinales/labels deben estar completos; ningún
conector cruza contenido salvo intención semántica explícita; tarjetas/divisores no colisionan; y la puntuación
display no forma ligaduras visuales accidentales.

El manifest visual conserva el snapshot histórico V3 y declara por separado el estado publicado V4; la
auditoría V4 sigue siendo la evidencia detallada de publicación, sin reemplazar hashes ni provenance.

### 12.7 Metadata y entidad

| Campo          | Valor del caso                                           |
| -------------- | -------------------------------------------------------- |
| Post ID        | `251363`                                                 |
| URL            | `https://efeoncepro.com/creative/creative-workflows/`    |
| Slug           | `creative-workflows`                                     |
| Categoría      | `Creative` (`193`)                                       |
| Tags           | Ninguno redundante                                       |
| Autor          | Julio Reyes (`1`)                                        |
| Featured/OG    | `251370`, JPEG `1440×757`                                |
| SEO title live | `Creative Workflows: qué son y cómo funcionan - Efeonce` |
| Robots final   | `index, follow`                                          |
| Canonical      | Único en WordPress; Think sin copia pública equivalente  |

La auditoría V3 detectó datos stale en el nodo `Person`: Instagram mal formado y `worksFor` histórico. La V4
separó ese cambio global, tomó backup y corrigió `sameAs`, cargo, `worksFor`, `knowsAbout`, title y description.
Después de cache purge, el graph público confirmó la entidad.

### 12.8 Backups, aprobación y publicación

- Antes de V3 se guardó snapshot local gitignored del post V1.
- Antes de corregir el autor se guardó snapshot remoto separado.
- Cada write tuvo readback independiente y guard central.
- La autorización humana explícita se recibió el 2026-07-15.
- La publicación se aplicó al mismo post `251363`, no a una copia.
- La caché se limpió antes del readback final de entidad/render.
- WordPress normalizó `🍏` a entidades `&#x1f34f;` en `content.raw` y después las convirtió a imágenes emoji con
  `alt="🍏"` en el frontend. El readback aceptó sólo esa equivalencia conocida y conservó todos los demás guards.

Las rutas exactas de backup quedan en las auditorías V3/V4. No se duplican aquí porque son evidencia temporal,
no nombres universales.

### 12.9 QA live y cierre

- URL pública `200`, canonical exacto y `index, follow`.
- Desktop `1440×1000` y mobile `390×844` sin overflow horizontal.
- Un H1, tres imágenes cargadas y TOC con 21 destinos válidos.
- V5: cinco imágenes cargadas, seis captions, una tabla de cuatro filas y dos enlaces a media completa.
- 34 enlaces HTTP únicos: 29 `2xx/3xx`; tres `403` protegidos y dos timeout clasificados; cero `404/5xx`
  confirmados.
- Open Graph `article`, Twitter `summary_large_image`, JPEG social `200`.
- Yoast graph con `Article/BlogPosting`, `Person`, `Organization`, `WebPage`, `ImageObject`, `BreadcrumbList` y
  `WebSite`.
- Think no sirvió una ruta duplicada.
- Consola sin errores materiales; caso SKY y disclosure visibles.

Estado final del caso: `documented_closed`, con satélites todavía en roadmap y sin implementación de Creative
Studio autorizada por el artículo.

## 13. Incidentes y rollback

### 13.1 Triage por momento

| Momento                                 | Contención inmediata                                             | Siguiente decisión                         |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| Antes de create                         | Mantener todo local; corregir spec/research                      | Revalidar                                  |
| Private expuesto como `200`             | Cambiar/confirmar `private`, noindex, purge, verificar `404`     | Investigar auth/status/cache               |
| Update privado corrupto                 | Restaurar snapshot                                               | Corregir updater/encoding y revalidar      |
| Publish con robots/canonical incorrecto | `private + noindex`, purge                                       | Restaurar o republicar con approval        |
| Render móvil/TOC/media roto             | Contener primera publicación; restaurar update de post existente | Fix en private y repetir QA                |
| Claim o permiso revocado                | Contener sección o post según severidad                          | Legal/editorial decide corrección/retirada |
| Author entity global incorrecta         | Restaurar perfil snapshot y purge                                | Reaprobar cambio global                    |
| Ruta duplicada WP/Think                 | Mantener una canonical; noindex/private la copia                 | Redirect/migración gobernada               |
| Caché stale                             | No reescribir contenido a ciegas                                 | Purgar, comparar origin/CDN y verificar    |

### 13.2 Aprendizajes canonizados por el primer caso y precursores

| Hallazgo                                              | Causa                                                                         | Regla permanente                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TOC muerto en un post anterior                        | TOC vacío y headings sin anchors                                              | Usar `renderYoastTableOfContents` + `renderHeadingBlock`; validator siempre.                                  |
| Meta description con encoding roto                    | Texto es-CL serializado como escapes Unicode dentro de PHP                    | Write usa UTF-8 raw/nowdoc; nunca `JSON.stringify` hacia eval PHP.                                            |
| Dos “Julio Reyes”                                     | Import creó user duplicado                                                    | Author por ID/login/entidad; para el caso, `1`, no `11`.                                                      |
| Service user como riesgo de byline                    | WP-CLI corre con user `12`                                                    | Ejecutor y autor son campos distintos; `post_author` explícito.                                               |
| Re-run no aplicó V2/V3                                | Idempotencia devuelve `already_exists`                                        | Inspeccionar/updatear el mismo privado; no cambiar manifest.                                                  |
| Conteo 149 vs 75                                      | `parse_blocks` incluyó 74 freeform vacíos                                     | Reportar semantic/raw/non-empty por separado.                                                                 |
| V1 correcta pero sin autoría                          | Taxonomía y prudencia sin escena/conversación                                 | Auditoría de voz, hook y lectura del autor antes de visuales.                                                 |
| Fuentes quedaban lejos del claim                      | Spec sólo aceptaba strings                                                    | Rich-text estructurado allowlisted; cero anchor HTML manual.                                                  |
| Visuales podían parecer prueba                        | IA genera escenas plausibles                                                  | Declarar función conceptual, provenance y no usar cliente/logo/texto.                                         |
| WebP no era la apuesta social más robusta             | Compatibilidad variable de previews                                           | Featured/OG JPEG probado; WebP queda body/fallback.                                                           |
| Categoría inicial `Uncategorized` cambiaba futura URL | Permalink incluye `%category%`                                                | Resolver categoría/primary category antes del publish.                                                        |
| Entidad Yoast stale                                   | Perfil global histórico y cacheado                                            | Audit `Person`, backup global, aprobación del autor, purge y readback.                                        |
| Public HTML seguía sirviendo la versión anterior      | caché de página Kinsta después del update REST                                | usar el purge sancionado, esperar y repetir checks públicos; rollback si la versión nueva no aparece          |
| Readback no era byte a byte igual                     | WordPress serializó cada `🍏` como `&#x1f34f;`                                | normalizar sólo esa entidad conocida y mantener equivalencia exacta para el resto; no relajar el guard global |
| Checklist Who/How/Why rompía el ritmo                 | transparencia escrita como evidencia de auditoría, no como parte del artículo | conservar autoría, límites y disclosure en tres párrafos conversacionales antes de fuentes                    |
| Link checker devolvió `403`/timeout                   | Providers protegen bots o tardan                                              | Clasificar; no borrar fuente primaria automáticamente.                                                        |
| Handoff/manifest parecían contradecir live            | Artefactos de fases distintas                                                 | Estado runtime + auditoría más reciente superseden sólo el status, no provenance histórica.                   |
| Nota de autoría seguía diciendo `este borrador` live  | Copy aprobado en `private` describía una transición futura                    | Escanear lenguaje de lifecycle antes del hash público y después del publish; preferir disclosure estable.      |

### 13.3 Registro de incidente

Todo incidente debe registrar:

- timestamp y actor;
- post ID/URL/status/robots;
- síntoma y alcance;
- último snapshot bueno;
- contención aplicada;
- cache state;
- evidencia before/after;
- causa raíz, no sólo síntoma;
- fix permanente o follow-up con owner;
- estado final honesto.

## 14. Checklist rápido del operador

```text
[ ] PDR/brief + research + claim ledger
[ ] Notion/caso con owner, permiso y límites
[ ] Pillar/cluster + canonical + no duplicados
[ ] Voz Julio/Efeonce decidida
[ ] Hook + one thing + review autoral
[ ] Spec + dry-run + validator
[ ] Private create idempotente + author correcto + 404 anónimo
[ ] Snapshot + guarded updates + deep inspection
[ ] Visual brief + GPT Image 2 provenance + Media Library
[ ] Metadata/Yoast/author entity/robots/OG/schema
[ ] Approval packet con hash
[ ] Publish mismo post + cache purge
[ ] Live 200 + desktop/mobile + scrollWidth + TOC/images
[ ] Links + canonical + robots + OG + schema + duplicate routes
[ ] Rollback disponible
[ ] QA + documentación + freshness owner
```

## 15. Criterio final

El proceso fue exitoso si el agente produjo una pieza que una persona puede leer, verificar y atribuir; si el
runtime conserva estructura, autoría, provenance y rollback; y si la publicación no depende de confianza en el
agente sino de evidencia observable.

Un post no está terminado porque existe en WordPress. Está terminado cuando la URL correcta sirve la versión
aprobada, el autor y los claims son verdaderos, el sistema puede revertirla y otro operador puede reconstruir
cómo llegó ahí.
