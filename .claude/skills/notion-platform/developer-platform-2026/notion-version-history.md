# Notion-Version history canonical

> **Header obligatorio**: `Notion-Version: <date>` en todo request
> **Current canonical recommended**: `2026-03-11`
> **Source**: https://developers.notion.com/page/changelog
> **Last verified**: 2026-05-17

## 1. Cómo funciona el versioning

Notion usa **date-based API versioning**. Cada nueva versión:
- Es opt-in (debes bumpear el header explícito)
- Puede traer breaking changes
- Versions anteriores siguen funcionando indefinidamente (no hard deprecation announced)
- Mismo endpoint puede comportarse distinto bajo distintas versions

## 2. Versions canonical disponibles (al 2026-05-17)

| Version | Released | Status | Breaking changes principales |
|---|---|---|---|
| **2026-03-11** | Mar 11, 2026 | **Current recommended** | `after` → `position` (block append); `archived` → `in_trash` (todas requests/responses); `transcription` → `meeting_notes` block type |
| 2025-09-03 | Sep 3, 2025 | Vigente | Split databases ↔ data sources; new `/v1/data_sources/.../query`; new webhook events `data_source.*`; new view events |
| 2022-06-28 | Jun 28, 2022 | Legacy, sin breaking change posterior reciente | (baseline pre-2025) |

## 3. Bump 2025-09-03 → 2026-03-11 (BREAKING)

### Cambios canonical
1. **`after` parameter → `position` object** en Append block children
   ```jsonc
   // Antes
   { "after": "<block_id>" }

   // Ahora
   { "position": { "after": "<block_id>" } }
   ```

2. **`archived` field → `in_trash` field** (todas request + response shapes)
   ```jsonc
   // Antes
   "archived": true

   // Ahora
   "in_trash": true
   ```
   ⚠️ Notion sigue aceptando `archived` por backward compat parcial, pero canonical es `in_trash`.

3. **`transcription` block type → `meeting_notes`**
   - Renamed completamente
   - `meeting_notes` ahora es la canonical name del block tipo AI meeting notes

### Migration path
> "Most integrations need find-and-replace only."

Pero verifica también:
- Filters en queries que filtraban por `archived` → cambiar a `in_trash`
- Webhook handlers que parseaban `archived` field → handle ambos
- Block creation code que usaba `after` → wrap en `position` object

Reference: https://developers.notion.com/guides/get-started/upgrade-guide-2026-03-11

## 4. Bump 2022-06-28 → 2025-09-03

### Cambios canonical
- Data sources / databases split (ver `data-sources-vs-databases.md`)
- New endpoints `/v1/data_sources/...`
- Webhook events `data_source.*`
- View events `view.created/updated/deleted`

### Quién aún corre 2022-06-28
Cualquier consumer que no haya sido tocado desde antes de Sep 2025. Para Greenhouse:
- `notion-bq-sync` legacy probablemente **necesita audit** — puede estar en 2022-06-28
- Audit pendiente como parte de TASK-879 follow-ups

## 5. Cuándo bumpear `Notion-Version`

### Bumpear cuando
- Necesitas feature nuevo solo disponible en version más reciente (ej. `position` parameter en bulk append)
- Notion declara end-of-life de version anterior (no anunciado al 2026-05-17 para ninguna)
- Quieres usar endpoint canonical (`data_sources` vs `databases`)

### NO bumpear cuando
- Versión actual funciona y consumer es legacy productivo crítico
- No has correrlo tests anti-regresión
- Está en path bonus payroll y no tienes shadow mode setup

## 6. Pattern canonical para bumps en Greenhouse

```typescript
// Single source of truth — NO inline en cada call site
// src/lib/notion-client/version.ts
export const NOTION_VERSION_CANONICAL = '2026-03-11' as const

// src/lib/notion-client/client.ts
const headers = {
  'Authorization': `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION_CANONICAL,
  'Content-Type': 'application/json'
}
```

Cuando bumpees:
1. Update constant en `src/lib/notion-client/version.ts`
2. Run tests anti-regresión
3. Shadow mode 7+ días si consumer es crítico
4. Document bump en `Handoff.md` + commit message

## 7. Versions futuras (especulativo)

Notion ships ~mensual desde 2026. Posibles bumps:
- Bulk PATCH endpoint formal (si emerge — TASK-901 lo necesita)
- New aggregation modes for queries
- Cross-data-source joins (?)
- Schema-level events más granulares

Cuando detectes una version nueva en changelog:
1. Lee diff vs current canonical
2. Update este archivo con entry nueva
3. Actualiza SKILL.md §0 si el bump es recomendado

## 8. Hard rules canonical

- **NUNCA** request sin `Notion-Version` header — 400 garantizado
- **SIEMPRE** una sola constante canonical (`NOTION_VERSION_CANONICAL`) — NO inline strings
- **NUNCA** bumpees `Notion-Version` en path crítico sin shadow mode
- **SIEMPRE** documenta bump en `Handoff.md` + actualizar SKILL.md §0
- **NUNCA** asumes que tu consumer corre la version más reciente — verifica con `grep` o lint

## 9. Cross-refs

- `api-reference/endpoints-canonical.md` — endpoints por version
- `developer-platform-2026/data-sources-vs-databases.md` — 2025-09-03 split detail
- `reference/changelog-notion-api.md` — diff completo por release
- CLAUDE.md (Greenhouse) § "Notion sync canónico" — current state legacy services
