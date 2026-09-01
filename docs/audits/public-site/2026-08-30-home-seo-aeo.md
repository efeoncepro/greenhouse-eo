# Home — revisión SEO/AEO y metadatos

Fecha: 2026-08-30. URL: <https://efeoncepro.com/>. Página WordPress `251731`.
Alcance: Home publicada, HTML servido sin sesión, enlaces inmediatos, indexabilidad técnica,
metadatos, grafo Yoast, contenido extraíble, imágenes y smoke responsive. No es un crawl completo del sitio,
una auditoría de backlinks ni una certificación de indexación/rendimiento en Search Console.

## Resultado

**Corrección publicada y verificada.** La Home ya tenía metadescripción y schema; no faltaban por completo.
Se mejoró la claridad de su presentación y se corrigió `og:title=Home`, además de dos imágenes HTTP.
Se preservaron H1, copy visible, diseño, header/footer, configuración global de Yoast y demás landings.
El grafo existente es apropiado para una portada de agencia: no se añadió otro proveedor de JSON-LD.

Skills: `seo-aeo` (Technical, AEO/GEO, Entity, Measurement, antipatterns), `seo-aeo-practice`
(boundary de práctica), `copywriting` (voz institucional y titulares), `efeonce-public-site-wordpress`,
Browser, `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.
Intención editorial: comprador que busca una agencia; claridad de categoría + trabajo conectado,
sin keyword stuffing ni promesas de mejora cuantificada. Copy basado en capacidades descritas en la Home;
no se realizó investigación de volumen de keywords ni se presenta como experimento ganador de CTR.

## Metadatos vigentes

| Superficie | Valor |
| --- | --- |
| SEO title | Efeonce \| Agencia de marketing digital y tecnología |
| Meta description | Conectamos creatividad, medios, CRM y desarrollo web en un mismo equipo. Con Efeonce, ves tu operación y sus resultados en Greenhouse, nuestro software propio. |
| OG y Twitter title | Marketing y tecnología, conectados \| Efeonce |
| OG y Twitter description | Misma descripción de la página |
| Canonical y OG URL | `https://efeoncepro.com/` |
| Robots | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` |
| Imagen social | Adjunto existente `248149`, `EO_Opengraph-home.webp`, 2000×960; preservado |

Antes: SEO title «Efeonce | Agencia de Marketing, CRM, contenido e IA aplicada», descripción «Ecosistema
estratégico…», título social «Home» y sin overrides Twitter. El H1 expresivo se mantiene: no necesita ser
idéntico al título SEO. Google puede elegir otros títulos/snippets; estos campos no garantizan su presentación.

## Decisiones de schema

- Un grafo Yoast con `WebPage`, `ImageObject`, `BreadcrumbList`, `WebSite`, `Organization`.
- `WebPage.name` y `description` reflejan los metadatos nuevos; `isPartOf`, `about` y `publisher`
  resuelven los mismos IDs de sitio/organización. Sin IDs de nodo duplicados.
- No añadir otra `Organization`, `LocalBusiness` sin validar datos locales, ni un `Service` genérico
  que sustituya a toda la agencia. Los servicios específicos tienen sus propias landings.
- No añadir `Review`, `AggregateRating`, `Product` ni `Offer`: la Home no respalda reseñas verificadas,
  rating agregado o una ficha/oferta transaccional. Las cifras del panel son expresamente ilustrativas.
- No se añadió `VideoObject`: el showreel se carga tras clic y la Home no es una página dedicada a verlo;
  no se inventan fecha, duración, miniatura o elegibilidad de resultados de vídeo.
- Se conservan las seis FAQ en HTML servidor, legibles al abrir sus `details`. No se añadió `FAQPage`
  como supuesto desbloqueo de rich results: Google retiró ese resultado en mayo de 2026 y su documentación
  en junio. Schema.org puede seguir describiendo FAQ; eso no implica una función vigente de Google.
- No `llms.txt` ni archivos especiales de IA: no sustituyen contenido útil, accesible y verificable.

## Hallazgos y priorización

Prioridad cualitativa para una sola Home; no se fabrican scores RICE con alcance/impacto sin medir.

| Prioridad | Hallazgo | Acción/estado |
| --- | --- | --- |
| P1 | Título social genérico «Home» | Corregido mediante overrides Yoast nativos de esta página. |
| P1 | Dos Media guardados con `http://` | Corregidos a HTTPS por controles Elementor; mismo asset, sin cambio visual. |
| P2 | Title/descripción genéricos respecto a oferta actual | Ajustados a agencia de marketing digital + tecnología; sin lista de keywords. |
| P1 editorial | Testimonio anónimo «MF», cifras comparativas 42/8/33/100 y afirmaciones absolutas | No amplificados en schema. Requieren evidencia o sustitución editorial aprobada; no inferir resultados reales del diseño. |
| P1 global | Footer enlaza recursos demo de Colabrio/ThemeForest; Instagram contiene `instagram.com.com`; social flotante apunta a Facebook de Colabrio | Fuera del cuerpo Home; requiere intervención explícita del tema/header/footer compartido. |
| P2 global | `WebSite.name` aún «Efeonce - Agencia de Inbound & Loop Marketing», descripción contiene entidad literal `&amp;` | Configuración global preservada. Proponer nombre breve «Efeonce» y descripción sin doble codificación en revisión del sitio. |
| P2 entidad | Organization conserva `sales@`, teléfono, fecha fundacional, 51–200 empleados y políticas heredadas | JSON válido no certifica esos hechos. Contrastar con fuente corporativa antes de normalizar; Home visible usa `hola@`. No son necesariamente incompatibles. |
| P2 medición | Sin lectura GSC/CrUX en esta pasada | No afirmar indexación efectiva, CWV aprobados ni aumento de visibilidad IA. |

La referencia a «pronto será producto» de Globe y el naming «Visibilidad SEO/AEO» frente a Wave también
merecen revisión editorial de entidad. Esta pasada de metadatos no aprueba todo el discurso comercial previo.

## Evidencia técnica

- SSH/WP-CLI canónico: `pnpm public-website:ssh-check` PASS antes de mutar.
- `blog_public=1`, `page_on_front=251731`, publicada y canonical raíz.
- Respuesta pública 200; sin cabecera `X-Robots-Tag` restrictiva. Robots.txt permite rastreo y declara sitemap.
- `sitemap_index.xml` y `page-sitemap.xml`: 200; raíz aparece una vez, respaldo `/home-2/` excluido.
- Antiguo slug `/home-claude-design-preview/`: 301 a `/`; respaldo `/home-2/`: 200 + `noindex, follow`.
- Un H1; H2/H3 jerarquizados; idioma HTML `es`; seis preguntas/respuestas en SSR.
- 19 enlaces internos únicos de la página completa respondieron 200; comprobación de HTTP, no certificación
  de calidad editorial o ausencia de soft-404 en todas las landings.
- Seis destinos del cuerpo verificados: SEO, Creativa V2, HubSpot, Web, Portafolio y Agenda.
  Anclas del cuerpo resuelven elementos existentes; cuatro tarjetas siguen enlazadas y ocho sin destino.
- Verificador anónimo: 42 imágenes del documento con atributo ALT, 32 recursos/destinos HTTP 200,
  sin imágenes HTTP en el cuerpo; ALT vacío se conserva en duplicados decorativos/isotipos junto a su nombre.
  No se metieron keywords en ALT. Parte de los medios reserva tamaño por CSS, no por atributos HTML;
  la ausencia de esos atributos no se convirtió en un diagnóstico ficticio de CLS.
- Chrome autenticado: título/descripción actualizados, sin imágenes cargadas rotas. Desktop 1710 y tablet
  890: ancho del documento igual al viewport después de estabilizar layout. En 390, `main`, documento
  Elementor y footer miden 390/390; raíz 440 con barra WP autenticada. No certificar overflow anónimo desde
  esa sesión. Captura móvil inspeccionada en la conversación; tablet en `tmp/home-seo-20260830/tablet.png`
  (artefacto local no durable). No cambió composición, CSS ni JS.

Comandos ejecutados:

```sh
php -l scripts/public-website/configure-agency-home-seo.php
pnpm public-website:wpcli -- --eval-file ./scripts/public-website/configure-agency-home-seo.php --wp-user 12
node scripts/public-website/verify-agency-home-seo.cjs
```

Verificador PASS a `2026-08-30T20:48:09.488Z`: valida HTML real, JSON parseado, relaciones del grafo,
metadatos únicos, URLs y respuestas HTTP. No afirma que Rich Results Test o Schema.org Validator se hayan
ejecutado, ni que todas las propiedades corporativas sean verdaderas. No es un test de strings del source.

## Persistencia y recuperación

- Writer guardado: `configure-agency-home-seo.php`; ownership, portada, hash y controles verificados.
- Antes: `30bab640e2dae49b9f6b13582c6dd426c018c4fda2419c0f199634cdc659605c`.
- Después: `747470a5f5083b8a5d851433e10618f5c3b714889d6205c64e36a1da242091b1`.
- Sólo cambian dos Media: Proof Engine `70f00f7.f002_imagen`, Comparison `df965fd.f005_imagen`.
  Guardado por `Document::save()`, comparación del árbol completo leído contra el esperado.
- Seis metas Yoast de title/description/search/social, reconstrucción del indexable de `251731`,
  limpieza Elementor y purga Kinsta. No despliegue del plugin ni modificación del repo runtime hermano.
- Snapshot durable en WordPress: `_gh_home_seo_20260830_204702`, con post, elementos, settings,
  metas previas y protected state. Readback confirma páginas de referencia, Yoast global, header/footer,
  thumbnail, canonical y robots intactos.
- Recuperación sólo autorizada: contrastar drift, restaurar únicamente los seis metadatos desde `seo`
  (eliminar overrides que no existían) y, si corresponde, las dos Media por `Document::save()`.
  No restaurar todo el documento si alguien ha seguido editando. Reconstruir indexable, purgar y verificar.
  El writer es de checkpoint, no idempotente: rehúsa una segunda aplicación sobre hash nuevo.

## Medición y límites de cierre

En GSC, comparar ventanas equivalentes después de recrawl: clics, impresiones y CTR de la raíz,
segmentando marca/no marca, país y dispositivo. No atribuir cambios exclusivamente a esta edición.
Inspección de URL debe confirmar canonical elegida e indexación; robots/sitemap sólo prueban elegibilidad.
CrUX/CWV necesita evidencia de campo; no se produjo ni inventó un score Lighthouse en esta sesión.
Para AEO, usar panel estable de consultas y registrar fecha/motor/fuentes, no prometer citas por schema.
No se solicitaron rastreos de pago, envío de indexación, cambios de robots ni nuevas integraciones.

**QA: PASS para metadatos/HTTPS y preservación del grafo existente.** La revisión completa registra
pendientes editoriales/globales y de medición; no declara toda la web SEO-perfecta ni cierra TASK-1358.
No hay rollout pendiente para estas correcciones; no hubo commit ni push en esta pasada.

Gates de cierre: PHP lint, Node syntax, ESLint del verificador y task lint PASS; context strict 0 errores/0
warnings. Closure-check terminó 0 con tres avisos advisory revisados: `project_context` ya apunta al contrato
Home, no hay skill nueva que registrar y TASK-1358 conserva `to-do`/`UI ready: no` en el registry. No se altera
ese lifecycle por cerrar metadatos. No se ejecutó build Next.js: no cambió su aplicación ni sus dependencias.

## Incorporación documental y skills — 2026-08-30

La revisión posterior solicitada por el operador consolidó el
[método reutilizable de metadatos y schema](../../../.codex/skills/seo-aeo/references/home-landing-metadata-schema.md)
en `seo-aeo`, con ruta desde `efeonce-public-site-wordpress`, ambas espejadas Codex/Claude.
Se corrigieron la recomendación antigua de FAQ (módulo y plantilla), el alcance de llms.txt,
y la confusión entre login observado y prueba pendiente del editor. Contrato técnico, funcional y manual
distinguen ahora revisión Home aplicada de SEO global/claims/medición pendientes.
Esta consolidación no hizo nuevas escrituras en WordPress ni ejecutó otra vez el writer.
La evidencia live de arriba pertenece a la revisión SEO; no equivale a una nueva comprobación del sitio.
Validación documental: cuatro bundles válidos (SEO y WordPress en ambos agentes), diez pares de archivos
espejo idénticos, plantillas FAQ parseables y enlaces locales de contrato/manual/audit existentes.
Task lint, diff check y context strict pasan. Tras reconciliar la descripción de TASK-1358 en el registry,
closure-check conserva sólo dos avisos advisory sobre project_context/registro de skills, revisados:
el router durable ya apunta al contrato Home y a las skills existentes; no se crea una skill nueva.
No se cambia el lifecycle de TASK-1358.

## Fuentes primarias consultadas

- [Títulos en Google](https://developers.google.com/search/docs/appearance/title-link).
- [Metadescripciones y snippets](https://developers.google.com/search/docs/appearance/snippet).
- [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization).
- [AI features y requisitos](https://developers.google.com/search/docs/appearance/ai-features).
- [Actualizaciones: retiro FAQ y aclaración llms.txt](https://developers.google.com/search/updates).
