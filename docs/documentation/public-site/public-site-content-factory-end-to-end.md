# Public Site y Content Factory end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 2.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-07-15, despues del primer blogpost agentic publicado end to end
> **Modulo:** Public Site / WordPress / Astro / Content Factory
> **Rutas/scripts principales:** `/admin/public-site`, `GET /api/admin/public-site/binding`, `pnpm public-website:*`, `docs/operations/public-site-*`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`, `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md`

## Para que sirve

Public Site conecta Greenhouse con `efeoncepro.com` en WordPress/Kinsta. Content Factory ayuda a inspeccionar, planificar y preparar drafts o patches gobernados sin mutar el sitio publico por accidente. Un agente puede orquestar tambien research, redaccion, media, metadata, revision y publicacion, pero la transicion a `publish` es una operacion separada: exige autorizacion humana explicita, snapshot, rollback y verificacion live.

Desde TASK-1161, Public Site tambien tiene una lectura gobernada del rail objetivo Astro/Vercel. Ese reader no reemplaza WordPress live: permite ver desde Greenhouse el binding `efeoncepro/efeonce-web` ↔ Vercel, el estado live de deploy y la matriz de ownership de rutas antes de cualquier comando de deploy/cutover.

La postura actual es conservadora:

- Greenhouse observa, planifica, valida y prepara drafts privados.
- WordPress/Kinsta sirven el sitio publico.
- Astro/Vercel es el rail frontend objetivo y se observa read-only desde Greenhouse.
- GitHub/runtime repo gobierna codigo.
- Content Factory nunca publica como efecto de `ideate`, `author`, `validate` o `run --send`.
- La publicacion puede ejecutarla un agente por un write path WordPress sancionado solo despues de aprobacion humana explicita y con rollback fail-closed.

## Evidencia revisada

Codigo y scripts:

- APIs `src/app/api/admin/public-site/**`.
- Librerias `src/lib/public-site/**`.
- Scripts `pnpm public-website:discover`, `bridge-inspect`, `content-factory:*`, `diff-runtime`, `deploy-dry-run`, `runtime-status`, `wpcli`.
- Documentos `docs/operations/public-site-*` y docs public-site existentes.

DB agregada:

- No hay schema `greenhouse_public_site` en la DB auditada.
- Public Site opera principalmente por archivos, manifests, reports versionados y APIs externas.
- Knowledge tiene 37 documentos y 425 chunks; puede ingerir manuales Public Site.

## Mapa funcional

| Capa | Estado actual | Que hace |
|---|---|---|
| Discovery | scripts read-only | Inventaria WordPress, theme, plugins, posts/pages |
| Runtime binding | docs/operations + repo runtime | Declara repo y baseline live |
| Astro binding reader | `GET /api/admin/public-site/binding` | Observa repo `efeonce-web`, Vercel deployments y route ownership sin writes |
| Content Factory | planners/validators | Genera planes y drafts, no publica por defecto |
| Orquestacion editorial agentic | agente + skills + artefactos | Conecta research, voz, Gutenberg, media, SEO/E-E-A-T y QA sin quitar autoridad al autor humano |
| Publication gate | WordPress REST/WP-CLI sancionado | Transicion separada `private → publish`, con snapshot, autorizacion, readback y rollback |
| Bridge plugin | foundation draft-only | Health/readiness y writes limitados cuando este habilitado |
| Kinsta/GitOps | target | Deploy/rollback futuro gobernado |

## Flujo seguro

1. Definir intencion, audiencia, ownership editorial, voz y frontera producto/contenido.
2. Investigar SERP, fuentes, claims, permisos de casos y canonical sin inventar evidencia.
3. Construir o revisar una `GutenbergArticleSpec` y resolver media real.
4. Ejecutar Content Factory en `dry-run`; corregir todo finding antes de escribir.
5. Crear o actualizar el post como `private`, con autor humano, manifest idempotente y snapshot.
6. Completar categoria, excerpt, metadata Yoast, featured/OG y entidad de autor.
7. Hacer readback autenticado y revision editorial/SEO/visual antes de publicar.
8. Obtener autorizacion humana explicita para la version y URL concretas.
9. Tomar snapshot pre-publicacion y ejecutar la transicion separada a `publish` por un write path sancionado.
10. Si falla cualquier check central, revertir a `private` y conservar evidencia del fallo.
11. Verificar como anonimo: `200`, canonical, robots, schema, Open Graph, links, media, TOC y render desktop/mobile.
12. Cerrar skills, docs, changelog, contexto y handoff con el estado runtime real.

## Que hace automatico Greenhouse

- Lee WordPress/REST/WP-CLI cuando hay credenciales.
- Genera manifests, fingerprints y patch plans.
- Valida Gutenberg blocks y operaciones permitidas.
- Distingue draft/private/published.
- Evita mutar published source por defecto.
- Conserva la publicacion como una operacion posterior, auditable y reversible; nunca la infiere de una spec valida.

## Que hace el operador

- Decide objetivo editorial.
- Revisa plan y evidencia.
- Aprueba la version final y la transicion a publico con una instruccion explicita.
- Verifica layout/cache/SEO/HubSpot despues de cambios.
- Conserva la decision sobre tesis, claims, fuentes, limites y criterio creativo aunque el agente ejecute la operacion.

## Fronteras importantes

- `efeonce-web` no es source of truth del WordPress live actual.
- `efeonce-web` si es el rail frontend objetivo Astro/Vercel; observarlo no autoriza deploy, rollback ni cutover.
- No editar Elementor/Ohio por HTML crudo sin ownership.
- No publicar ni limpiar cache como parte de un plan read-only.
- No interpretar `validation=pass`, `--send`, un post privado o una aprobacion editorial parcial como permiso de publicacion.
- No tratar drafts como contenido publicado.
- No exponer secrets o application passwords en docs/prompts.
- No documentar hosts, llaves, tokens, passwords, JWTs ni material de autenticacion observado durante la operacion.

## Preguntas que Nexa debe responder

- Como inspecciono un post de WordPress?
- Como preparo un draft sin tocar el publicado?
- Que diferencia hay entre refresh plan, patch plan y draft clone?
- Que comandos son read-only?
- Como veo el estado Astro/Vercel sin abrir GitHub/Vercel?
- Que confirmacion necesita un agente antes de publicar?
- Que checks provocan rollback a privado?
- Que evidencia necesito antes de tocar el sitio publico?

## Documentacion relacionada

- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`
