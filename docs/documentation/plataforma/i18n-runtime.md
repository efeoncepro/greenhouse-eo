# Runtime i18n de Greenhouse

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Task:** TASK-430
> **Arquitectura relacionada:** [GREENHOUSE_I18N_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md)
> **Manual relacionado:** [Verificar idioma del portal](../../manual-de-uso/plataforma/i18n-runtime.md)

## Para que sirve

Greenhouse ya tiene runtime i18n sobre Next.js App Router con `next-intl`. Esto habilita que el portal resuelva un locale por request y renderice el shell y microcopy shared en `es-CL` o `en-US` sin cambiar las URLs privadas.

La activacion no traduce todo el producto de golpe. Deja la base segura para que los rollouts por superficie conecten textos especificos de modulo, emails y preferencias persistidas sin reescribir rutas ni helpers.

## Que cambio

- `next-intl` esta instalado.
- El App Router usa `NextIntlClientProvider` desde `src/components/Providers.tsx`.
- `src/app/layout.tsx` ya no usa `lang='en'` fijo; usa el locale efectivo.
- `src/i18n/request.ts` carga el locale y messages compartidos por request.
- `src/i18n/resolve-locale.ts` resuelve locale con:
  1. cookie `gh_locale`
  2. `Accept-Language`
  3. fallback `es-CL`
- `src/lib/copy/dictionaries/en-US/*` contiene traducciones reales para CTAs, estados, loading, empty states, meses, aria labels, errores, feedback y tiempo relativo.
- `src/config/greenhouse-navigation-copy.ts` entrega labels del shell en `es-CL`/`en-US`.

## Que no cambio

- Las rutas privadas no tienen prefijo de idioma.
- `/api/*`, NextAuth callbacks y `scripts/staging-request.mjs` siguen sin prefijo.
- `src/lib/format/` sigue siendo la capa de formato para valores.
- La persistencia de idioma por usuario/tenant queda para TASK-431.
- Los emails y background jobs no dependen del provider App Router.

## Reglas para nuevas superficies

- Usa `next-intl` para componentes App Router que ya viven bajo provider.
- Usa `getMicrocopy(locale)` cuando la superficie consume la capa shared existente.
- No pases el dictionary completo como messages al cliente: `emails` y parte de `time` contienen funciones.
- No agregues `middleware.ts` para el portal privado.
- No conviertas idioma en permiso: no toca `routeGroups`, `views`, `entitlements` ni startup policy.

## Relacion con TASK-431

Hasta TASK-431, el idioma se puede forzar por cookie o header. Cuando TASK-431 cierre, la jerarquia completa sera:

1. preferencia del usuario
2. default del tenant/account
3. cookie/manual override
4. `Accept-Language`
5. `es-CL`
