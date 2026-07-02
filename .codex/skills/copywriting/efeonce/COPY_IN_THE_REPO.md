# Dónde vive el copy en el repo (craftear → tokenizar)

> El craft de las palabras es de esta skill; su **ubicación en runtime** la gobierna la skill de
> UX-writing + `src/lib/copy/`. Patrón: **craftea aquí → tokeniza/ubica allá.** No hardcodees
> strings sueltos.

## SSOT de microcopy — `src/lib/copy/`

- **`index.ts`** — API pública (`getMicrocopy()`), `types.ts`.
- **`dictionaries/es-CL/` y `dictionaries/en-US/`** — microcopy funcional compartido, locale-aware,
  por namespace: `actions`, `states`, `loading`, `empty`, `errors`, `feedback`, `months`, `aria`,
  `time`, `emails`, `notFound`, `notAuthorized`, `comingSoon`, `underMaintenance`.
- **Domain copy files** (`src/lib/copy/<domain>.ts`): `agency.ts`, `finance.ts`, `payroll.ts`,
  `pricing.ts`, `nexa.ts`, `growth.ts`, `client-portal.ts`, etc. — copy reutilizable por dominio.
- Doc funcional: `docs/documentation/plataforma/microcopy-shared-dictionary.md`.

**Regla (CLAUDE.md):** antes de escribir un string visible, revisar si ya existe en `src/lib/copy/`;
el copy nuevo se extrae ahí, no se hardcodea en JSX. La **decisión de tokenización/ubicación** es de
`greenhouse-ux-writing`; esta skill aporta el **wording con voz**.

## Naming de producto — `src/config/greenhouse-nomenclature.ts`

- SSOT de nomenclatura de producto + navegación (Pulse, Spaces, Ciclos, "Mi Greenhouse", labels
  institucionales, subtítulos). Distinto de `src/lib/copy/` (microcopy) — el **naming de producto**
  vive aquí. Si crafteas un nombre de sección/feature, va acá (no inventar labels sueltos).

## Copy de email — `src/emails/**` + `src/lib/email/`

- **`src/emails/`** — componentes React Email; el copy de cada email se autora inline en su
  template (`MagicLinkEmail.tsx`, `InvitationEmail.tsx`, `AiVisibilityGraderReportEmail.tsx`,
  `WeeklyExecutiveDigestEmail.tsx`, etc.).
- **`src/lib/email/template-copy.ts`** — helper **selector** de locale (es-CL vs legacy en-US), no
  un store de copy. Microcopy de email compartido: `dictionaries/<locale>/emails.ts`.
- La **infra de plantillas/entrega** es de **`greenhouse-email`**; esta skill craftea el **copy**.

## Marca — `src/config/efeonce-brand.ts`

- SSOT de datos de marca + slogan **"Empower your Growth"**. **NUNCA** hardcodear el slogan/datos de
  marca en una pieza — importar del SSOT. Detalle de voz en `EFEONCE_VOICE_SYSTEM.md`.

## Flujo canónico (craft → runtime)

```
1. Craftea el copy con voz (esta skill) — headline, label, email, tagline…
2. Valida convención/tono es-CL con greenhouse-ux-writing
3. Ubícalo:
   - microcopy funcional  → src/lib/copy/dictionaries/<locale>/<namespace>.ts
   - copy de dominio       → src/lib/copy/<domain>.ts
   - naming de producto    → src/config/greenhouse-nomenclature.ts
   - copy de email         → src/emails/<Template>.tsx (infra: greenhouse-email)
4. Nunca dejar el string hardcodeado suelto en JSX.
```

## Reglas duras

- **NUNCA** hardcodear copy visible en componentes: va a `src/lib/copy/` (governance: UX-writing).
- **NUNCA** hardcodear el slogan/datos de marca: importar de `efeonce-brand.ts`.
- **NUNCA** inventar un label de producto fuera de `greenhouse-nomenclature.ts`.
- El **craft** (que la palabra sea buena) es de aquí; la **ubicación/tokenización/a11y** de UX-writing.
