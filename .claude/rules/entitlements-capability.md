---
paths:
  - "src/config/entitlements-catalog.ts"
  - "src/lib/entitlements/**"
---

# Entitlements / capabilities / ROLE_CODES — invariantes (auto-load por path)

Cargá **`docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` → §"Capability grant coverage + ROLE_CODES"** + `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

Reglas duras: al seedear una capability nueva, **SIEMPRE** granteala en `src/lib/entitlements/runtime.ts` a ≥1 rol REAL (de `src/config/role-codes.ts`) en el MISMO PR (guard `capability-grant-coverage.test.ts` rompe el build). **NUNCA** citar un rol fantasma (`DEVOPS_OPERATOR`/`HR_ADMIN`/`commercial_admin`/`operations` no existen → colapsan a `EFEONCE_ADMIN`/`HR_MANAGER`). **NUNCA** branchear `roleCodes.includes(...)` inline (usar `can()`).
