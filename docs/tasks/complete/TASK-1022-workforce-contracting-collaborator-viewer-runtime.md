# TASK-1022 — Workforce Contracting Studio: Collaborator Viewer runtime (`/my/offers` + `/my/contracts`)

## Status

- Lifecycle: `complete`
- Branch: `develop` (operador: "mantente en develop", 2026-06-05)
- Priority: `P1`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §8 "Collaborator Viewer", §12.4)
- Created: 2026-06-05

## Progress (2026-06-05, en `develop` sin branch)

- **Slice 0 — Governance + flag ✅** (`423f5d4db`): viewCode `mi_ficha.mis_contratos` (migración `20260605171657576` aplicada+verificada, grant `collaborator`) + TS `VIEW_REGISTRY` catalog; flag de sesión `hasWorkforceContractingDocument` (helper EXISTS `active-document-flag.ts` + auth.ts JWT/session + next-auth types + get-tenant-context, mirror TASK-796) gatea los 2 ítems de nav en "Mi Ficha" (ambos bloques internos); copy `GH_MY_NAV` es/en.
- **Slice 1 — UI ✅** (`3689a8497`): `MyContractingDocumentsView` compartida (parametrizada por tipo) consumiendo `getOwnContractingSummary` server-side (anti-IDOR por `tenant.identityProfileId`). Estado honesto agrupado (preparando/pendiente firma/firmado/cerrada) + badge bilingüe ES+EN + nota read-only + acciones firma/descarga `locked` ("Disponible pronto", EPIC-001). 12-state (empty por tipo). 2 server pages gated por viewCode (fallback `routeGroups.my`).
- **GVC ✅** (`eafe19b05`): scenario + capturas de `/my/contracts` y `/my/offers` → enterprise, empty states honestos, **0 violaciones axe**. Test pin `mi_ficha` 13→14.
- **Gates**: tsc 0 · eslint 0 · `pnpm test` 6060 passed · `pnpm build` ✓.
- **Fuera de scope**: PDF/firma/descarga real = EPIC-001 (TASK-1023/1024). Refinamiento futuro: filtrar drafts internos pre-envío del viewer del colaborador (V1 muestra todos sus casos propios con status honesto).

## Why

El colaborador debe ver su(s) carta(s) oferta / contrato(s) con **estado honesto, bilingüe y sin edición legal**. La foundation (TASK-1019) ya entregó el reader self-scoped `getOwnContractingSummary(identityProfileId)` (anti-IDOR) + las rutas API `/api/my/contracts` y `/api/my/offers`. Esta task crea las superficies runtime. **No depende de EPIC-001** — "abrir link de firma" y "descargar PDF firmado" se renderizan como `locked` hasta TASK-1023/1024.

## Scope

- Rutas runtime `/my/offers` + `/my/contracts` (server pages: `requireMyTenantContext` / scope `own` + `tenant.identityProfileId`) consumiendo `getOwnContractingSummary`.
- Vista simple por documento: estado (`signatureReadinessStatus` + `nextActionCode` mapeados a copy honesta), toggle/compare ES↔EN cuando exista contenido (TASK-1023), badge "ES+EN", `missing-action` states. **Nunca** texto legal editable.
- Acciones futuras como `locked`: "Abrir firma" (TASK-1024), "Descargar PDF firmado" (TASK-1023/1024).
- Nav dinámico: el ítem aparece solo si el colaborador tiene al menos un caso (mirror del patrón `hasActiveContractorEngagement`, TASK-796/727), o bajo "Mi Ficha".
- 12-state coverage (state-design) + microcopy es-CL en `GH_WORKFORCE_CONTRACTING`.
- Loop GVC obligatorio + skills product-design.

## Dependencies & Impact

- **Depende de:** TASK-1019 (reader `getOwnContractingSummary` + rutas `/api/my/*`) ✅. NO depende de EPIC-001.
- **Impacta a:** TASK-1024 (firma) desbloquea "Abrir firma"; TASK-1023 (PDF) desbloquea descarga + compare ES↔EN del cuerpo.
- **Archivos owned:** `src/app/(dashboard)/my/offers/page.tsx`, `src/app/(dashboard)/my/contracts/page.tsx`, `src/views/greenhouse/my/workforce-contracting/*`, nav dinámico.

## Out of Scope

- Render del cuerpo legal / firma / descarga real (TASK-1023/1024).

## Acceptance

- `/my/offers` y `/my/contracts` runtime, self-scoped (anti-IDOR verificado: usuario A no ve casos de B), estado honesto + bilingüe.
- Acciones de firma/descarga visibles como `locked` con copy clara.
- GVC paridad verificada; `pnpm test`/`build`/tsc/lint verdes.
