# Usar microcopy shared

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-06
> **Modulo:** Plataforma
> **Ruta en portal:** Transversal
> **Documentacion relacionada:** [Microcopy shared y dictionary-ready](../../documentation/plataforma/microcopy-shared-dictionary.md)
> **Arquitectura relacionada:** [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md#delta-2026-05-02--copy-system-contract-task-265)

## Para que sirve

Esta guia explica como agregar o reutilizar textos cortos compartidos sin reintroducir hardcodes. Aplica a botones, estados, mensajes vacios, labels accesibles, meses y microcopy funcional repetido en varias vistas.

Tambien aplica al copy institucional de emails. En ese caso la regla principal es no mezclar textos reutilizables con tokens de personalizacion: el dictionary puede guardar labels, headings, CTAs y disclaimers; los nombres, montos, periodos, fechas, links y adjuntos siguen viniendo del runtime del email.

## Antes de empezar

- Revisa si el texto ya existe en `getMicrocopy()`.
- Decide si es nomenclatura de producto, microcopy shared o copy de dominio.
- Mantiene `es-CL` como default hasta que el runtime i18n active locales reales.
- Si el texto sera visible para usuarios, privilegia claridad antes que tono decorativo.

## Paso a paso

1. Importa el dictionary:

```ts
import { getMicrocopy } from '@/lib/copy'
```

2. Lee el namespace que necesitas:

```tsx
const t = getMicrocopy()

<Button>{t.actions.save}</Button>
<Button variant='outlined'>{t.actions.cancel}</Button>
```

3. Para estados comunes, usa `states`:

```tsx
<Chip label={t.states.pending} />
```

4. Para accesibilidad, usa `aria`:

```tsx
<IconButton aria-label={t.aria.closeDialog}>
  <i className='tabler-x' />
</IconButton>
```

5. Para meses, usa el array canonico:

```ts
const monthLabel = t.months.short[monthIndex]
```

6. Si necesitas un status map, usa `buildStatusMap`:

```ts
import { buildStatusMap, getMicrocopy } from '@/lib/copy'

const t = getMicrocopy()

const labels = buildStatusMap({
  pending: t.states.pending,
  approved: t.states.approved
})
```

7. Para copy de emails, lee el subnamespace correspondiente y deja los valores dinamicos fuera:

```tsx
const t = getMicrocopy().emails.payroll.receipt

<Text>
  {t.greetingPrefix}{firstName}{t.greetingPeriodPrefix}
  <strong>{monthName} {periodYear}</strong>
  {t.greetingSuffix}
</Text>
```

Ese patron preserva la capa de personalizacion de React Email: `firstName`, `monthName`, `periodYear`, montos, URLs y adjuntos no se guardan como texto fijo dentro del dictionary.

8. En emails de Nexa Insights, migra solo el marco estructural:

```tsx
const t = getMicrocopy().emails.weeklyExecutiveDigest

<Heading>{t.heading}</Heading>
<Text>{renderNarrative(insight.narrative)}</Text>
```

Las narrativas, titulares, root causes, espacios y links de Nexa son contenido materializado. Deben seguir llegando desde `src/lib/nexa/digest` o el caller, no desde `src/lib/copy`.

9. En emails con datos operativos o sensibles, migra solo labels y frases reutilizables:

```tsx
const t = getMicrocopy().emails.beneficiaryPaymentProfileChanged

{summaryRow(t.accountLabel, accountNumberMasked ?? t.maskedFallback, true)}
```

`accountNumberMasked`, montos, breakdowns de nomina, proveedor, banco, motivo, fechas, adjuntos y links deben seguir viniendo del runtime/caller. El dictionary no guarda datos de negocio ni valores sensibles.

## Donde poner un texto nuevo

| Caso | Donde vive |
| --- | --- |
| Nombre de una capacidad Greenhouse | `src/config/greenhouse-nomenclature.ts` |
| CTA base, estado, loading, empty, aria o mes reutilizable | `src/lib/copy/dictionaries/es-CL/` |
| Heading, label, CTA o disclaimer reusable de email | `src/lib/copy/dictionaries/es-CL/emails.ts` |
| Copy unico de una pantalla o regla de negocio | Cerca del modulo |

## Que no hacer

- No escribir `<Button>Guardar</Button>` si existe `t.actions.save`.
- No crear `const MONTHS = [...]` local.
- No duplicar `Pendiente`, `Aprobado`, `Rechazado` en mapas locales si existen en `states`.
- No agregar un namespace shared para una sola pantalla.
- No meter nombres, montos, periodos, links, motivos o adjuntos de emails dentro del dictionary.
- No mover narrativas generadas/materializadas de Nexa Insights al dictionary.
- No importar `src/lib/copy` con `server-only`; debe funcionar en cliente y servidor.
- No usar `eslint-disable` para evitar migrar un string shared.

## Problemas comunes

| Problema | Causa probable | Que hacer |
| --- | --- | --- |
| ESLint advierte `no-untokenized-copy` | Hay copy shared hardcodeado | Migrar a `getMicrocopy()` o justificar que es domain-specific. |
| No encuentro una key | Puede ser copy de dominio o falta una shared key real | Si se reusa en varias surfaces, agregar key con paridad de locales. |
| Un snapshot de email cambia al migrar copy | Se mezclo un token dinamico dentro de una funcion/string de dictionary | Separar copy estatico y token runtime; no actualizar snapshot salvo cambio intencional. |
| El texto es de producto | No debe vivir en `src/lib/copy` | Usar `greenhouse-nomenclature.ts`. |
| El texto necesita traduccion real | TASK-407 no traduce | Mantener key dictionary-ready y esperar runtime i18n de TASK-430. |

## Referencias tecnicas

- `src/lib/copy/`
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs`
- [TASK-407](../../tasks/complete/TASK-407-copy-migration-shared-shell-components.md)
