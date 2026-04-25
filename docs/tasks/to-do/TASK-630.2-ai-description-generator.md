# TASK-630.2 — AI-assisted Description Generator (boton "Generar con AI")

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto` (acelera populate del catalogo)
- Effort: `Medio` (~1.5 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque B)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `ai`
- Blocked by: `TASK-630, TASK-620.1, TASK-620.2`
- Branch: `task/TASK-630.2-ai-description-generator`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Boton "Generar con AI" embebido en `<GreenhouseRichTextEditor>` (toolbar extension) que toma contexto del producto/servicio actual (nombre, codigo, business_line, sellable_roles asociados, tools, artifacts) y genera una descripcion rich HTML editable usando `@google/genai` (ya en repo). Output respeta el whitelist HTML del sanitizer.

## Why This Task Exists

Marketing tiene 74+ productos en catalogo sin descripcion enriquecida. Pedirle que escriba 74 descripciones a mano es invitable a que nunca pase. AI-assisted permite que en 5 minutos tengan un primer draft editable para los 74 — luego refinan con TipTap los que importan mas.

Adicionalmente, los nuevos catalogos (sellable_tools en TASK-620.1, sellable_artifacts en TASK-620.2) van a nacer vacios. AI-generated baseline acelera populate.

## Goal

- Boton "Generar con AI" en toolbar `extended` del `<GreenhouseRichTextEditor>`
- Endpoint `POST /api/ai-tools/generate-description` que recibe context + tipo de entidad (product / service / tool / artifact)
- Prompt template per-tipo que produce descripcion comercial 2-4 parrafos en español con bold/italic/lists
- Output validado por sanitizer + truncated a `characterLimit` del editor
- Tracking de uso: `ai_credit_consumption` + audit log
- Soft rate limit: 5 generations/min per user (anti-abuse)
- Reduced motion: si `prefers-reduced-motion`, no animar el typing effect

## Architecture Alignment

- `docs/architecture/GREENHOUSE_AI_PLATFORM_V1.md` (si existe; si no, crear referencia ligera)
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8
- `src/lib/ai/google-genai.ts` — cliente ya productivo

Reglas obligatorias:

- output AI siempre pasa por `sanitizeProductDescriptionHtml` antes de mostrar al editor
- prompt con instrucciones explicitas de estilo (no generico, no marketing-speak vacio, especifico al business_line)
- temperature moderada (0.5-0.7) para creatividad sin alucinaciones
- max_output_tokens limited (~600 tokens = ~400 palabras max)
- AI credit consumption: 1 credit por generation, registrado en `greenhouse_ai.ai_credit_consumption`
- error states: si AI falla, mostrar toast + dejar editor inalterable

## Dependencies & Impact

### Depends on

- `TASK-630` (componente editor base)
- `TASK-620.1` (sellable_tools — para context lookup en tools)
- `TASK-620.2` (sellable_artifacts — para context lookup en artifacts)
- `@google/genai` (instalado, productivo)
- `greenhouse_ai.ai_credit_consumption` (existe via TASK-AI credits anterior)

### Blocks / Impacts

- Quality del catalogo de productos / tools / artifacts (acelera populate ~10x vs manual)
- Calidad visual del PDF de quotes
- Future: TASK-609 AI quote draft assistant reusa la misma infra de prompt + sanitization

### Files owned

- `src/components/greenhouse/editors/GreenhouseRichTextToolbar.tsx` (modificado: agregar boton AI en variant 'extended')
- `src/components/greenhouse/editors/AiDescriptionGeneratorButton.tsx` (nuevo)
- `src/app/api/ai-tools/generate-description/route.ts` (nuevo)
- `src/lib/ai/prompts/description-generator.ts` (nuevo prompt templates)
- `src/lib/ai/credit-consumption-tracker.ts` (extender si existe)

## Scope

### Slice 1 — Endpoint backend (0.5 dia)

`src/app/api/ai-tools/generate-description/route.ts`:

```typescript
interface GenerateDescriptionBody {
  entityType: 'product' | 'service_module' | 'sellable_role' | 'sellable_tool' | 'sellable_artifact'
  entityId: string                    // para fetch de context server-side
  tone?: 'commercial' | 'technical' | 'concise'   // default 'commercial'
  language?: 'es' | 'en'              // default 'es'
  maxParagraphs?: 2 | 3 | 4           // default 3
  includeBenefits?: boolean           // default true (agrega "Beneficios:" como h3 + bullet list)
  customInstructions?: string         // opcional, anidos del usuario
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()
  if (!tenant) return errorResponse

  await rateLimit({ key: `ai-gen:${tenant.userId}`, limit: 5, windowSeconds: 60 })

  const body = await request.json() as GenerateDescriptionBody

  // 1. Fetch context segun entityType
  const context = await fetchEntityContext(body.entityType, body.entityId)

  // 2. Build prompt
  const prompt = buildPromptForEntity(body.entityType, context, body)

  // 3. Call Gemini
  const response = await genai.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 600,
      responseMimeType: 'text/plain'
    }
  })

  const rawHtml = response.text

  // 4. Sanitize
  const sanitized = await sanitizeProductDescriptionHtml(rawHtml)

  // 5. Track consumption
  await trackAiCredit({
    userId: tenant.userId,
    feature: 'description_generator',
    tokens: response.usage.totalTokens,
    cost_estimate_usd: response.usage.totalTokens * 0.0000001
  })

  // 6. Audit
  await recordAudit({
    actorUserId: tenant.userId,
    action: 'ai_description_generated',
    entityType: body.entityType,
    entityId: body.entityId,
    details: { tokens: response.usage.totalTokens, tone: body.tone }
  })

  return NextResponse.json({
    html: sanitized,
    tokensUsed: response.usage.totalTokens,
    creditsConsumed: 1
  })
}
```

### Slice 2 — Prompt templates (0.25 dia)

`src/lib/ai/prompts/description-generator.ts`:

```typescript
export const buildPromptForEntity = (
  entityType: EntityType,
  context: EntityContext,
  options: GenerateOptions
): string => {
  const baseInstructions = `
Genera una descripcion comercial en HTML para el siguiente ${entityTypeLabel(entityType)}.

Restricciones HTML estrictas:
- Solo usar: <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <h2>, <h3>, <a href="...">, <br>
- NO usar: <div>, <span>, <img>, <table>, <code>, <blockquote>, <hr>
- Maximo ${options.maxParagraphs ?? 3} parrafos
- Idioma: ${options.language === 'en' ? 'Ingles profesional' : 'Español neutro LATAM'}
- Tono: ${toneInstructions(options.tone)}

Estructura requerida:
1. Parrafo de apertura: que es y para quien
2. Parrafo de valor: que problema resuelve / que beneficio aporta
${options.includeBenefits ? '3. Seccion "<h3>Beneficios principales</h3>" + lista de 3-5 bullets concretos' : ''}

Evita:
- Lenguaje generico ("la mejor solucion del mercado", "innovador y disruptivo")
- Promesas sin sustento ("ROI garantizado", "resultados inmediatos")
- Jerga marketing-speak vacia
`

  const contextBlock = renderContextForEntity(entityType, context)

  return `${baseInstructions}\n\n=== CONTEXTO DEL ${entityTypeLabel(entityType).toUpperCase()} ===\n${contextBlock}\n\n${options.customInstructions || ''}\n\nGenera la descripcion HTML ahora:`
}
```

Context per entity type:

| Entity | Context fields incluidos en prompt |
|---|---|
| `product` | product_name, product_code, business_line, category, related sellable_roles/tools, target_audience |
| `service_module` | service_sku, name, business_line, tier, role recipe (roles + hours), tool recipe, artifact list, default_duration_months, commercial_model |
| `sellable_role` | role_sku, name, category, tier, seniority_level, typical_outputs |
| `sellable_tool` | tool_sku, vendor (Adobe/Microsoft/HubSpot/...), partner_program, tier, license_type, capability_tags |
| `sellable_artifact` | artifact_sku, name, category, deliverable_format, typical_outputs |

### Slice 3 — UI button + flow (0.5 dia)

`src/components/greenhouse/editors/AiDescriptionGeneratorButton.tsx`:

- Boton `<CustomIconButton>` con icon tabler `sparkles`
- onClick → abre `<Dialog>` con opciones:
  - Tono (commercial / technical / concise)
  - Idioma (es / en)
  - Max parrafos (2 / 3 / 4)
  - Incluir beneficios (toggle)
  - Instrucciones custom (textfield optional)
- Boton "Generar" disabled mientras `loading`
- Mostrar spinner + "Generando descripcion con AI..." (2-5 segundos tipico)
- Onsuccess: reemplazar contenido del editor con HTML generado (con confirm si editor ya tiene contenido > 50 chars)
- Onerror: toast con mensaje + log a Sentry

Integration en `GreenhouseRichTextToolbar.tsx`:

```tsx
{variant === 'extended' && entityType && entityId && (
  <AiDescriptionGeneratorButton
    editor={editor}
    entityType={entityType}
    entityId={entityId}
    onGenerated={(html) => editor.commands.setContent(html)}
  />
)}
```

`<GreenhouseRichTextEditor>` recibe props opcionales `entityType` + `entityId` para que el AI button sepa que contexto pedir. Sin estos props el boton no se renderiza.

### Slice 4 — Rate limit + tests (0.25 dia)

`src/lib/ai/rate-limit.ts` (si no existe):

- Usa Postgres como backing store: tabla `greenhouse_ai.rate_limits` con `(key, window_start, count)`
- O reusa redis-like via Cloud SQL si esta disponible

Tests:

- Endpoint: input valido → returns sanitized HTML
- Endpoint: input con HTML peligroso en customInstructions → sanitized
- Endpoint: rate limit exceeded → 429
- Component: button click → opens dialog → submit → updates editor
- Component: error state → toast + editor unchanged

## Out of Scope

- Streaming de tokens (typing effect) — mostrar respuesta completa de una vez en v1
- Multi-language simultaneo (es+en) — usuario regenera con otro idioma
- Vector embedding del catalogo para "AI sugiera tools relacionados" — feature avanzada futura
- Batch generation (regenerar 74 productos de un click) — manual selection en v1
- AI-suggested constraint rules (TASK-620.3) — separate task

## Acceptance Criteria

- [ ] endpoint funcional con rate limit + sanitization + audit + credit tracking
- [ ] boton AI visible solo en toolbar `extended` y solo si entityType+entityId provided
- [ ] dialog de opciones con 5 controles (tono, idioma, parrafos, beneficios, custom)
- [ ] HTML generado pasa sanitizer sin perder contenido legitimo
- [ ] HTML respeta whitelist (no `<div>`, no `<img>`)
- [ ] AI credit consumption registrado por generation
- [ ] rate limit 5/min/user enforced
- [ ] tests passing
- [ ] Sentry capture de errores

## Verification

- Generar descripcion en dev para 3 productos diferentes (cada uno con context distinto: agency, design, dev)
- Verificar HTML output renderiza correctamente en TipTap + en PDF preview
- Verificar audit log entry y credit consumption row creados
- Test rate limit: 6 requests en 1 min → 6to falla 429

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con screenshots del flujo
- [ ] `docs/architecture/GREENHOUSE_AI_PLATFORM_V1.md` actualizado (o creado) con seccion "Description Generator"
- [ ] `docs/documentation/admin-center/catalogo-productos-fullsync.md` actualizado con feature AI
