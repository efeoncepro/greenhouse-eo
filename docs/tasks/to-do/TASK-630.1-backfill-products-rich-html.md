# TASK-630.1 — Backfill productos legacy con descripcion plana envuelta en `<p>`

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo` (~0.25 dias)
- Type: `operational`
- Epic: `none`
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-630`
- Branch: `task/TASK-630.1-backfill-products-rich-html`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Backfill operativo: para los 74 productos legacy del catalogo que tienen `description` plano pero `description_rich_html=NULL`, generar el rich HTML como `<p>{description}</p>` baseline para que el PDF renderice algo mientras marketing edita las descripciones reales con TipTap.

## Why This Task Exists

TASK-629 (PDF enterprise) y TASK-630 (TipTap editor) habilitan el flujo end-to-end de rich descriptions. Pero los 74 productos del catalogo tienen `description_rich_html=NULL` y van a verse vacios en el PDF hasta que marketing edite cada uno manualmente. Eso puede tardar semanas.

Solucion intermedia: envolver el `description` plano existente en un `<p>` y persistirlo como `description_rich_html`. El PDF renderiza algo legible inmediatamente, y marketing puede ir editando con TipTap sin presion.

## Goal

- Script idempotente que detecta productos con `description IS NOT NULL AND description_rich_html IS NULL`
- Para cada uno: `UPDATE product_catalog SET description_rich_html = '<p>' || description || '</p>'`
- Pasa por sanitizer para escapar HTML chars en el `description` original (`<` `>` `&`)
- Audit log de cuantos productos fueron updated
- Re-ejecutable sin side effects (no sobrescribe rich HTML ya editado)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (Bloque B)

Reglas obligatorias:

- script idempotente (re-run no duplica ni sobrescribe)
- escapar caracteres HTML del description original antes de envolver
- log a `audit_events` con quien ejecuto + cuantos productos
- emit outbox event `commercial.product.description_rich_html_backfilled` para que sync HubSpot propague

## Dependencies & Impact

### Depends on

- `TASK-630` (componente editor + sanitizer extended)
- `sanitizeProductDescriptionHtml` (existe)
- 74 productos en `greenhouse_commercial.product_catalog`

### Blocks / Impacts

- Calidad visual del PDF de quotes (mientras marketing no edite, este baseline hace que el PDF se vea decente)
- Sync outbound a HubSpot (los 74 productos van a actualizar `hs_rich_text_description` automaticamente)

### Files owned

- `scripts/backfill-product-descriptions-rich-html.ts` (nuevo)
- `package.json` (agregar npm script `pnpm backfill:product-descriptions`)

## Scope

### Slice 1 — Script (0.2 dia)

```typescript
// scripts/backfill-product-descriptions-rich-html.ts
import { runFinanceQuery } from '@/lib/finance/shared'
import { sanitizeProductDescriptionHtml } from '@/lib/sanitize/product-description-html'
import { recordAudit } from '@/lib/commercial/governance/audit-log'

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const backfillProductDescriptions = async (options: { dryRun?: boolean; actorUserId: string }) => {
  const candidates = await runFinanceQuery<{ product_id: string; description: string }>(`
    SELECT product_id, description
      FROM greenhouse_commercial.product_catalog
     WHERE description IS NOT NULL
       AND description != ''
       AND (description_rich_html IS NULL OR description_rich_html = '')
  `)

  console.log(`Found ${candidates.length} products to backfill`)

  if (options.dryRun) {
    console.log('DRY RUN — no changes applied')
    return { matched: candidates.length, updated: 0 }
  }

  let updated = 0
  for (const product of candidates) {
    const escaped = escapeHtml(product.description.trim())
    const wrapped = `<p>${escaped}</p>`
    const sanitized = await sanitizeProductDescriptionHtml(wrapped)

    await runFinanceQuery(`
      UPDATE greenhouse_commercial.product_catalog
         SET description_rich_html = $1,
             updated_at = now(),
             updated_by = $2
       WHERE product_id = $3
         AND (description_rich_html IS NULL OR description_rich_html = '')
    `, [sanitized, options.actorUserId, product.product_id])

    updated++
  }

  await recordAudit({
    actorUserId: options.actorUserId,
    action: 'product_description_backfilled',
    entityType: 'product_catalog_bulk',
    entityId: 'bulk_operation',
    details: { matched: candidates.length, updated, source: 'TASK-630.1' }
  })

  console.log(`Updated ${updated} products with baseline rich HTML`)
  return { matched: candidates.length, updated }
}

// CLI entrypoint
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run')
  const actorUserId = process.env.BACKFILL_ACTOR_USER_ID || 'system:backfill'
  backfillProductDescriptions({ dryRun, actorUserId })
    .then(result => {
      console.log('Result:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('Backfill failed:', err)
      process.exit(1)
    })
}
```

### Slice 2 — npm script + ejecucion (0.05 dia)

```json
// package.json
"scripts": {
  "backfill:product-descriptions": "tsx scripts/backfill-product-descriptions-rich-html.ts",
  "backfill:product-descriptions:dry-run": "tsx scripts/backfill-product-descriptions-rich-html.ts --dry-run"
}
```

Ejecucion:

```bash
# 1. Dry run en dev
pnpm backfill:product-descriptions:dry-run

# 2. Aplicar en dev
BACKFILL_ACTOR_USER_ID=user-julio-reyes pnpm backfill:product-descriptions

# 3. Verificar visualmente algunos productos en /admin/product-catalog
# 4. Aplicar en staging via Cloud SQL Connector

# 5. Aplicar en prod (despues de QA staging)
```

## Out of Scope

- Mejorar manualmente el contenido — eso lo hace marketing usando TipTap (TASK-630)
- AI-generated descriptions — TASK-630.2 cubre eso despues
- Backfill a sub-categorias (sellable_roles, sellable_tools, sellable_artifacts) — son tablas nuevas, no necesitan backfill

## Acceptance Criteria

- [ ] script ejecutado en dev exitosamente
- [ ] verificacion visual: 5 productos random muestran rich HTML correcto en /admin
- [ ] PDF de quote test renderea las descripciones (no vacio)
- [ ] re-ejecucion del script no sobrescribe ni duplica
- [ ] audit_events log entry visible con count de productos actualizados
- [ ] sync outbound a HubSpot sandbox propaga `hs_rich_text_description` correctamente
- [ ] aplicado en staging + prod despues de QA dev

## Verification

- `pnpm backfill:product-descriptions:dry-run` muestra count correcto
- `pnpm backfill:product-descriptions` updatea sin errores
- `SELECT count(*) FROM product_catalog WHERE description_rich_html IS NOT NULL` aumenta por el numero esperado
- HubSpot portal muestra `hs_rich_text_description` poblado en los productos sincronizados

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con counts por env
- [ ] `docs/operations/runbooks/` agregar entry "Backfill product descriptions" para futuros casos
