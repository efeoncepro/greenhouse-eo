# TASK-568 — Typography in Delivery Surfaces: Email Stack + PDF Font Registration

## Delta 2026-05-01 (tarde) — pivot a Geist

Tras cerrar TASK-566 con Inter y validar visualmente, el usuario decidió pivotar a **Geist Sans** como product UI base. Esta task pasa a converger emails y PDFs al contrato `Poppins + Geist`, no `Poppins + Inter`. Cambios concretos sobre el cuerpo:

- Donde dice "Inter" como destino, leer "Geist Sans"
- `src/assets/fonts/**` debe incorporar el set local de Geist (`Geist-Regular.ttf`, `Geist-Medium.ttf`, `Geist-SemiBold.ttf`, `Geist-Bold.ttf`, `Geist-ExtraBold.ttf`). Asset disponible en npm `geist` (SIL OFL 1.1) y en el repo `vercel/geist-font`
- `register-fonts.ts` registra cada peso como su propia familia (`'Geist'` 400, `'Geist Medium'` 500, `'Geist SemiBold'` 600, `'Geist Bold'` 700, `'Geist ExtraBold'` 800) siguiendo el patrón actual de DM Sans
- `tokens.ts` reemplaza `body: 'DM Sans'` por `body: 'Geist'`, etc.
- Emails: `src/emails/constants.ts` cambia el fallback stack a `'Geist', -apple-system, BlinkMacSystemFont, sans-serif` y la URL Google Fonts importada queda `family=Geist:wght@400;500;600;700;800`
- Geist Mono **NO** se introduce; mono variants quedan sobre Geist Sans + `tabular-nums`

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `none` (TASK-566 completada — desbloqueada 2026-05-05)
- Branch: `task/TASK-568-typography-email-pdf`

## Summary

Llevar la nueva política `Poppins + Inter` a las surfaces que no heredan el theme del portal: emails y PDFs. La task debe reutilizar el runtime real del repo, especialmente `src/emails/**`, `src/lib/finance/pdf/register-fonts.ts` y `src/lib/finance/pdf/tokens.ts`.

## Why This Task Exists

El draft anterior asumía `Geist` y proponía helpers nuevos, pero el repo ya tiene una base concreta para PDFs y assets locales. Esta task existe para:

- eliminar `DM Sans` de emails y PDFs
- evitar abrir una segunda infraestructura paralela de registro de fuentes
- converger el output externo al mismo contrato `Poppins + Inter`

## Goal

- Emails usan stack `Inter + Poppins`
- PDFs registran pesos locales de Inter y Poppins
- `DM Sans` desaparece de `src/emails/**` y `src/lib/finance/pdf/**`
- No se introduce una fuente mono separada salvo hallazgo técnico fuerte
- Los assets nuevos quedan trazables, mínimos y reproducibles para runtime serverless
- En emails, `Poppins` se conserva para headings display; `Inter` queda como base para body, metadata y lectura larga

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md`

## Files Owned

- `src/emails/**`
- `src/lib/finance/pdf/register-fonts.ts`
- `src/lib/finance/pdf/tokens.ts`
- `src/assets/fonts/**`
- cualquier generator PDF que consuma esos tokens

## Current Repo State

- `src/emails/**` existe y usa stacks propios
- `src/lib/finance/pdf/register-fonts.ts` ya registra familias locales `DM Sans` y `Poppins`
- `src/lib/finance/pdf/tokens.ts` todavía modela `PdfFonts.body*` sobre DM Sans
- `src/assets/fonts/**` hoy solo contiene TTF de `DM Sans` y `Poppins`; **no existe todavía el set local de Inter**

## Scope

### Slice 1 — Emails

- actualizar stacks a Inter para body/metadata
- mantener Poppins solo para headings display cuando aplique
- remover menciones directas a DM Sans
- validar fallback razonable en clientes que ignoren custom fonts
- evitar llevar `Poppins` a párrafos largos, tablas o bloques densos de lectura operativa

### Slice 2 — PDF font registration

- reutilizar `src/lib/finance/pdf/register-fonts.ts`
- sustituir el set `DM Sans` por `Inter`
- revisar si el patrón actual “una familia por peso” sigue siendo el más conveniente; si sí, mantenerlo y solo cambiar assets/nombres

### Slice 3 — Inter asset provisioning

- incorporar los archivos locales de `Inter` necesarios para PDF en `src/assets/fonts/**`
- dejar trazable la procedencia/formato de esos assets para no depender de URLs remotas volátiles
- mantener el set mínimo de pesos realmente usados por `src/lib/finance/pdf/tokens.ts`
- documentar naming convention de archivos para que futuros cambios no reintroduzcan assets ambiguos

### Slice 4 — PDF tokens

- `src/lib/finance/pdf/tokens.ts` debe converger a:
  - `heading*` → Poppins
  - `body*` → Inter
- IDs, códigos y montos deben priorizar:
  - Inter
- `tabular-nums`
  - ajustes de weight/spacing
- no introducir una fuente mono nueva por defecto

### Slice 5 — Asset hygiene

- verificar qué archivos reales existen en `src/assets/fonts/**`
- documentar explícitamente el set nuevo de Inter que se agregó o, si ya quedó resuelto por otra task, el set efectivo reutilizado
- no depender de URLs remotas si ya existe una estrategia local
- dejar nota explícita si algún runtime PDF sigue dependiendo de fallback Helvetica por error controlado

## Out of Scope

- no tocar `mergedTheme.ts`
- no tocar ESLint rule
- no tocar Figma o skills

## Acceptance Criteria

- [ ] `src/lib/finance/pdf/register-fonts.ts` deja de registrar `DM Sans`
- [ ] `src/lib/finance/pdf/tokens.ts` deja de modelar body sobre DM Sans
- [ ] `src/assets/fonts/**` contiene el set mínimo requerido de `Inter` para PDF o la task deja documentado por qué no fue necesario agregar archivos nuevos
- [ ] emails dejan de referenciar DM Sans
- [ ] PDFs y emails convergen a `Poppins + Inter`
- [ ] no aparece una tercera familia nueva salvo justificación documentada
- [ ] La procedencia/licencia o fuente operativa de los archivos `Inter` queda documentada en la task o doc relacionada
- [ ] Existe fallback claro si una familia PDF no registra: no rompe render y queda detectable en validación manual
- [ ] Los emails usan `Poppins` en headings display y `Inter` en body/metadata; no quedan párrafos largos o tablas operativas renderizados en `Poppins`

## Verification

- preview de emails
- render manual de quote PDF / payroll PDF
- `pnpm build`
- revisar al menos un email en Gmail/Outlook o equivalente con fallback realista
- abrir un PDF generado y verificar que headings/body/montos no colapsan a pesos erráticos

## Open Questions

- Si algún PDF necesita una diferencia más marcada para IDs o montos, primero probar `Inter + tabular-nums`; solo después evaluar una tercera familia como excepción del programa.
