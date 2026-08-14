# Preparar grounded queries AEO desde candidatos SEO

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-14 por Claude (TASK-1666)
> **Ultima actualizacion:** 2026-08-14 por Claude (TASK-1666)
> **Documentacion tecnica:** [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7
> **Documentacion funcional:** [`modulo-seo-search-visibility-360.md`](../../documentation/growth/modulo-seo-search-visibility-360.md)

## Para que sirve

Convierte hasta 20 candidatos de una corrida de keyword discovery en un **borrador** de grounded
queries del motor AEO: preguntas naturales que un usuario le haría a ChatGPT/Gemini/Perplexity,
redactadas usando las keywords como TEMA (nunca copiadas 1:1) y la identidad de marca ya
autorizada del perfil. **Un borrador no mide nada**: requiere revisión y aprobación AEO.

## Antes de empezar

- La org necesita: assignment `seo_v2` vigente, una corrida de discovery con candidatos, y un
  **grader profile AEO** con categoría y modelo de negocio resueltos (sin ellos: `invalid_context`).
- Capabilities: `growth.seo.observation.read` **y** `growth.ai_visibility.prompt_set.manage`
  (dos planos; ver candidatos no autoriza a crear prompts).
- Flags: `GROWTH_SEO_ENABLED` + `GROWTH_AI_VISIBILITY_GRADER_ENABLED` (gate). Con
  `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED` OFF el draft sale **baseline** con aviso — no
  es específico de las keywords hasta regenerarlo con la autoría activa.

## Paso a paso

1. **Crear el draft** (una autoría LLM como máximo; repetir la misma selección = mismo draft,
   USD 0):

```bash
curl -s -X POST https://<host>/api/admin/growth/seo/grounded-queries \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":"org-...","profileId":"gp-...","seoTargetId":"seot-...","discoveryRunId":"seokdr-...","candidateIds":["seokdc-...","seokdc-..."]}'
```

   La respuesta trae `draft` (setId/version/`status: draft`), `groundingMode`
   (`grounded_llm` | `baseline_fallback`), `sourceRefs` opacas y `fallbackNotice` cuando aplica —
   **ese aviso siempre se muestra**.

2. **Revisar**: `GET .../grounded-queries?organizationId=...&profileId=...&setId=...` devuelve las
   preguntas con sus tags y `groundingRef` por prompt. Evaluar naturalidad, no-leading (las de
   descubrimiento jamás nombran la marca) y que la keyword sea tema, no texto.
3. **Aprobar** (fuera de este puente): `approveGraderPromptSet` — el command AEO existente, con
   revisión humana. Sólo entonces el set queda `active` y el próximo run del grader lo usa.
4. Por MCP: `get_seo_grounded_query_draft` (lectura) y `prepare_seo_grounded_queries` (write bajo
   `efeonce.mcp.seo.write`; con la identidad máquina compartida responde `aeo_forbidden`
   fail-closed hasta TASK-1631).

## Que NO hacer

- **NUNCA** presentar un draft `baseline_fallback` como grounded en las keywords.
- **NUNCA** aprobar sin leer las preguntas: el draft es una propuesta, la eval humana es el gate.
- **NUNCA** re-seleccionar un candidato `dismissed` sin registrar antes la acción
  `selected_for_grounded_query` (el bridge lo rechaza con `invalid_context`).

## Problemas comunes

- `grounded_query_disabled`: falta `GROWTH_SEO_ENABLED` o `GROWTH_AI_VISIBILITY_GRADER_ENABLED`.
- `invalid_context`: al perfil AEO le falta categoría o modelo de negocio (resolverlos primero) o
  un candidato está en estado no permitido.
- `profile_not_found` / `candidate_not_found`: ID ajeno o inexistente (anti-oracle: no distingue).
- Verificación local: `pnpm pg:connect` +
  `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1666-grounded-query-bridge.ts`
  (13 checks sin costo; `--author` agrega la autoría LLM real, centavos, sólo con autorización).

## Referencias tecnicas

- Bridge/reader: `src/lib/growth/seo/grounded-query-{bridge,reader}.ts`
- Authoring AEO extendido: `src/lib/growth/ai-visibility/prompt-packs/authoring/*` (cerebro
  grounded `aeo-author.seo-grounded.v1`; el base `aeo-author.v1` quedó intacto)
- Lanes: `src/app/api/admin/growth/seo/grounded-queries/route.ts` ·
  `src/app/api/platform/ecosystem/growth/seo/grounded-queries/route.ts` · MCP
  `src/mcp/greenhouse/{server,tools,http-client}.ts`
