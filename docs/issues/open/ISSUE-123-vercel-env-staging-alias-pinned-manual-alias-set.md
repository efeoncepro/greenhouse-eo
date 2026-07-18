# ISSUE-123 — Alias `env-staging` de Vercel fijado a un deployment viejo por `vercel alias set` manual (bug class recurrente)

- **Estado:** open (tooling resiliente SHIPPED + des-pin ejecutado + **re-atado automático VERIFICADO ciclo 1**; falta 1 ciclo más para cierre)
- **Detectado:** 2026-07-18 (3ª recurrencia; 1ª 2026-07-17, 2ª 2026-07-18 AM)
- **Ambiente:** Vercel staging (custom environment `staging` del proyecto `greenhouse-eo`)
- **Dominio:** infra/tooling de agentes (staging access)
- **Relacionado:** `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` · TASK-1431 (sesión donde se diagnosticó la causa raíz)

## Síntoma

El alias canónico de agentes `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` sirve un
deployment VIEJO aunque existan deployments staging `READY` más recientes. El custom domain
`dev-greenhouse.efeoncepro.com` sí se mueve al deploy nuevo. Efecto: cualquier agente/script que
valide staging por el alias (staging-request, GVC, smokes) **prueba código viejo sin saberlo** —
falsos negativos del tipo "el cambio no está desplegado" (visto en vivo 2026-07-18: el alias servía
el bundle CTA `1.0.0` de la mañana mientras el deploy vigente tenía `1.2.0`).

## Cronología (por Handoff)

| Fecha | Evento |
| --- | --- |
| 2026-07-17 | 1ª vez: alias pegado a un deploy 2h viejo (sesión TASK-1276). "Fix": `vercel alias set` manual. |
| 2026-07-18 AM | 2ª vez (sesión rollout CTA producción). "Fix": otro `vercel alias set`. Nota: "si recurre, candidato a task de guard". |
| 2026-07-18 PM | 3ª vez (sesión TASK-1431): alias pegado EXACTAMENTE al deployment que la sesión AM fijó a mano. Causa raíz identificada. |

## Causa raíz

El alias `<proyecto>-env-<environment>` lo gestiona Vercel automáticamente (se mueve con cada
deployment Ready del custom environment). **Un `vercel alias set` manual lo convierte en asignación
manual y lo FIJA al deployment indicado** — deja de moverse solo. El "fix" manual de la 1ª
recurrencia creó el bug permanente: cada deploy posterior deja el alias atrás, alguien lo re-apunta
a mano, y el ciclo se refuerza. (La causa de la 1ª pegada original — glitch puntual de Vercel o un
`alias set` previo no registrado — es secundaria: desde el primer set manual el pin es determinista.)

Evidencia 2026-07-18 PM: deployments staging `READY` nuevos (`dpl_9CZKQXC…` 13:33, `dpl_GoK4Tz…`
14:01) con el alias sirviendo el deployment de la mañana; `vercel inspect` del deploy nuevo muestra
solo `dev-greenhouse.efeoncepro.com` como alias; API v6 confirma los deploys nuevos `READY` con
`customEnvironment.slug='staging'`.

## Impacto

- Validaciones de agentes contra staging por el alias = **código viejo silencioso** (riesgo de
  cierres con evidencia falsa).
- GVC además fallaba con redirect a `/login` al cambiar de base URL (storageState con cookies del
  host viejo).
- Sin impacto a usuarios: `dev-greenhouse.efeoncepro.com` (humanos) y producción no se afectan.

## Solución

### Capa 1 — tooling resiliente (SHIPPED 2026-07-18, defensa de raíz para agentes)

Los agentes ya **no dependen de la frescura del alias**:

- `scripts/lib/vercel-staging-access.mjs`: `resolveLatestStagingDeploymentUrl()` resuelve el último
  deployment staging `READY` vía Vercel API (filtro real: `customEnvironment.slug==='staging'` —
  los custom envs llegan con `target: null`). `resolveStagingAccess()` lo usa por default; el alias
  queda SOLO como fallback con warning ruidoso. Picker puro unit-testeado
  (`scripts/lib/vercel-staging-access.test.ts`).
- `pnpm staging:url` (`scripts/staging-url.mjs`): imprime la URL vigente para componer:
  `STAGING_URL=$(pnpm --silent staging:url) pnpm fe:capture <scenario> --env=staging`.
- `pnpm staging:request` auto-resuelve (verificado E2E: auth agente + 200 contra el deployment
  vigente sin `STAGING_URL`).
- GVC `scripts/frontend/lib/env.ts`: acepta `STAGING_URL` + storageState POR HOST (las cookies no
  cruzan subdominios `.vercel.app`; reusar el state del alias contra otra URL redirigía a `/login`).

### Capa 2 — des-pin del alias (PENDIENTE, requiere permisos del operador)

Restaurar la gestión automática eliminando la asignación manual (los agentes tienen bloqueada la
mutación de aliases por el permission classifier — 2 intentos denegados 2026-07-18):

```bash
vercel alias rm greenhouse-eo-env-staging-efeonce-7670142f.vercel.app --scope efeonce-7670142f
# luego un deploy staging cualquiera (push a develop) y verificar que el alias se re-ata solo:
curl -sI "https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app/growth-cta/BUILDINFO.json" \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET"
# el BUILDINFO debe corresponder al deploy nuevo (2026-07-18: bytes=38098 = bundle 1.2.0)
```

Si tras el `rm` + deploy el alias NO se re-crea solo, escalar a Vercel support (el environment URL
es system-managed); mientras tanto la Capa 1 mantiene a los agentes en el deployment correcto.

### Regla operativa (anti-recurrencia)

**NUNCA** volver a "arreglar" el alias con `vercel alias set` — cada set refuerza el pin. El camino
es `alias rm` (des-pin) o tooling por deployment vigente (`staging:url`).

## Verificación de cierre

- [x] `vercel alias rm` ejecutado 2026-07-18 PM con autorización explícita del operador (el classifier
      bloquea la mutación a agentes; la autorización en sesión la destrabó).
- [x] **Ciclo 1 VERIFICADO** (2026-07-18 ~14:40): tras el `rm` el alias quedó 404 (suelto); al quedar
      Ready el deploy `greenhouse-52ktlj8ze` (push `e6c29d70a`), Vercel re-ató el alias
      automáticamente — pasó de 404 a servir el bundle vigente (`BUILDINFO bytes=38098`) sin ningún
      `alias set`. Mientras el deploy compilaba, el resolver siguió eligiendo el último READY
      (resiliencia diseñada, observada en vivo).
- [ ] Ciclo 2: el próximo deploy staging mueve el alias solo (sin intervención manual).
- [x] `pnpm staging:request` (E2E: resolver + auth agente + 200) y `pnpm staging:url` resuelven el
      deployment vigente; GVC compuesto (`STAGING_URL=$(pnpm --silent staging:url)`) capturó OK con
      storageState por host.
