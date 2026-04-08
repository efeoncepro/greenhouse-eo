# ISSUE-030 — CI: test stale de OrganizationPeopleTab bloquea PRs no relacionados

## Ambiente

GitHub Actions CI (`Lint, test and build`) sobre `preview + main`

## Detectado

2026-04-08, durante revisión de PRs abiertos `#41` y `#42` en GitHub.

## Síntoma

PRs funcionalmente no relacionados quedaban bloqueados por el mismo check rojo en GitHub Actions.

- `#41` (`fix: route PDF/XML downloads through server proxy to avoid Nubox 401`)
- `#42` (`docs: create TASK-284 shareholder current account (CCA)`)

Ambos fallaban en el mismo test:

- `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx`

El error observable en CI era:

```text
AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times
```

Luego, al alinear la expectativa de requests, apareció un segundo falso negativo:

```text
Found multiple elements with the text: 1.0
```

## Causa raíz

`OrganizationPeopleTab` evolucionó para cargar dos fuentes al montar:

- `/api/organizations/[id]/memberships`
- `/api/organization/[id]/360?facets=team`

El test seguía modelando una versión anterior del componente:

- esperaba un solo `fetch()`
- asumía que `1.0` sólo se renderizaba una vez

Con la incorporación de KPIs de la faceta `team`, `1.0` pasó a aparecer tanto en el KPI `FTE total` como en la fila de la tabla.

## Impacto

- **Proceso**: PRs ajenos al tab de organizaciones quedaban bloqueados por un falso negativo de baseline.
- **Señal de CI degradada**: un PR de solo documentación (`#42`) aparecía roto aunque no tocara runtime.
- **Costo operativo**: se perdía tiempo investigando cambios equivocados cuando la rotura real estaba en la suite compartida.

## Solución

Se actualizó `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx` para reflejar el comportamiento vigente del componente:

- mockear dos respuestas (`memberships` + `360?facets=team`)
- validar ambos endpoints esperados
- validar la presencia del KPI `FTE total`
- aceptar que `1.0` aparece dos veces (`KPI + tabla`)

El fix se publicó como:

- PR `#43` — `fix: align organization people tab test with 360 fetches`

## Verificación

Validación local ejecutada sobre el fix:

- `pnpm exec vitest run src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx` — OK
- `pnpm test` — OK
- `pnpm lint` — OK
- `pnpm build` — OK

Verificación operativa adicional:

- PR `#43` cerró la rotura de baseline de CI
- después de actualizar ramas, `#41` y `#42` pudieron cerrarse sin quedar bloqueados por ese test stale

Nota:

- El failure de `Vercel` preview observado en `#41`, `#42` y `#43` quedó fuera del alcance de este issue porque no estaba resuelto al cierre y no provenía del diff de esos PRs.

## Estado

resolved

## Relacionado

- `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx`
- PR `#41`
- PR `#42`
- PR `#43`
- `Handoff.md`
