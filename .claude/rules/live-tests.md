---
paths:
  - "src/**/*.live.test.ts"
  - "scripts/test-live.mjs"
  - "vitest.config.ts"
---

# Live tests (`*.live.test.ts`) — invariantes (auto-load por path)

Antes de escribir o correr uno, carga **`docs/architecture/agent-invariants/LIVE_TESTS_AGENT_INVARIANTS.md`**.

El hecho raíz del que se derivan todas las reglas: estos tests **escriben sobre la ÚNICA instancia Cloud SQL
que comparten dev, staging y producción**. No hay base efímera.

**Correrlos: `pnpm test:live`. NUNCA `set -a; source .env.local`** — ese `source` exporta ~85 variables al
proceso y tumba tests unitarios de otros dominios que afirman DEFAULTS (secrets, cloud/billing,
cloud/postgres, emails). `test:live` pasa sólo acceso a base y rechaza cualquier `*_ENABLED`.

**Corren serializados** entre sí (proyecto `live` en `vitest.config.ts`, `fileParallelism: false`). NUNCA
declares `include` en la raíz de ese config (el mismo archivo correría en los dos proyectos) ni redeclares
`setupFiles` dentro de un proyecto (`extends: true` ya lo hereda; duplicarlo revienta MSW).

**El sujeto de prueba se DERIVA de un `scope`** (`resolveLiveTestCandidateFixture` /
`resolveLiveTestCandidateFixtures`, `src/lib/hiring/live-test-identity.ts`). **NUNCA** lo tomes de un pool
compartido con `ORDER BY … LIMIT n` —varios archivos toman los mismos y se pisan— ni de «el primer perfil
activo», que registró a una persona real como candidata (`ISSUE-159`).

**Dos modos de falla que engañan:** un test sin credenciales **se salta y `skipped` se ve igual que verde**
—lee `passed`, nunca la ausencia de rojo—; y con el Cloud SQL Proxy caído los **tests PASAN y la suite igual
sale ROJA**, porque quien no conecta es el teardown.

Antes de atribuir un rojo a tu cambio, **córrelo aislado**: de 8 fallos observados en una sesión, la mayoría
eran contención o el propio harness.
