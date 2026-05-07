# Plan — TASK-430 Dictionary Foundation Activation

## Discovery Summary

- `TASK-428` ya eligio `next-intl`; `TASK-430` implementa runtime, no vuelve a decidir libreria.
- El portal privado conserva URLs sin locale prefix. No se crea `middleware.ts`; cualquier routing/proxy futuro debe componerse dentro de `src/proxy.ts`.
- `src/lib/copy` ya es la primitive canonica de microcopy con `SUPPORTED_LOCALES = ['es-CL', 'en-US']` y default `es-CL`.
- `src/lib/copy` no puede serializarse completo como `next-intl` messages porque `time` y `emails` contienen funciones. La integracion usara un subset shared serializable y conservara `getMicrocopy(locale)` como API canonica.
- `src/lib/format` sigue gobernando fechas, moneda, numeros, porcentajes y pluralizacion visible.
- No hay persistencia DB de locale aun; `greenhouse_core.client_users.locale` es legacy short-locale y pertenece a la normalizacion de `TASK-431`.

## Access Model

- `routeGroups`: sin cambios.
- `views` / `authorizedViews`: sin cambios.
- `entitlements`: sin cambios.
- `startup policy`: sin cambios.
- Decision: locale es estado de presentacion, no autorizacion ni navegacion.

## Skills

- `greenhouse-agent`: App Router/Vuexy/Greenhouse shell y copy contract.
- `vercel:nextjs`: `next-intl` App Router, provider, request config, `next.config.ts`.
- `greenhouse-ux-content-accessibility`: traduccion minima `en-US` de CTAs, estados, loading, empty, aria y errores shared.

## Subagent Strategy

`sequential`.

La task esta acoplada en provider/layout/copy/config y el usuario aprobo ejecucion directa. No se usan subagentes.

## Execution Order

1. Baseline: `pnpm lint` y `pnpm exec tsc --noEmit --pretty false`.
2. Instalar `next-intl` y componer plugin con Sentry en `next.config.ts`.
3. Crear runtime i18n:
   - locale resolver por `gh_locale`, `Accept-Language`, fallback `es-CL`
   - `src/i18n/request.ts`
   - messages shared serializables
   - type augmentation de `next-intl`
4. Integrar provider en `src/components/Providers.tsx` y corregir `src/app/layout.tsx` para `lang` efectivo.
5. Traducir `en-US` shared namespaces minimos sin tocar emails profundos.
6. Tests focales: resolver, messages, microcopy parity y proxy no-regression.
7. Docs vivas: arquitectura/UI platform, documentacion/manual, changelog, project context, task lifecycle/handoff.
8. Full verification: `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, `pnpm test`, `pnpm build`, `pnpm pg:doctor`, y staging/manual si hay deployment listo.

## Files To Create

- `src/i18n/*`
- `src/global.d.ts` o archivo equivalente para `next-intl` augmentation si el patron local lo requiere.
- `src/lib/copy/dictionaries/en-US/*.ts`
- tests focales de i18n/copy.

## Files To Modify

- `package.json`, `pnpm-lock.yaml` — dependencia `next-intl`.
- `next.config.ts` — plugin `next-intl` compuesto con Sentry.
- `src/app/layout.tsx` — `lang` efectivo.
- `src/components/Providers.tsx` — `NextIntlClientProvider`.
- `src/lib/copy/dictionaries/en-US/index.ts` — deja de reexportar `esCL` como stub.
- Docs vivas e indices de task.

## Files To Delete

- Ninguno esperado.

## Risk Flags

- Root provider afecta todo el portal; mantener cambios conservadores.
- Messages client-side deben ser serializables; no pasar funciones del dictionary completo.
- No leer ni mutar DB para locale en esta task.
- No introducir locale prefixes ni romper `/api/*`/auth/staging automation.

## Open Questions

- Ninguna bloqueante. Todas las preguntas de spec quedan resueltas por `GREENHOUSE_I18N_ARCHITECTURE_V1.md` y el audit aprobado por el usuario el 2026-05-06.
