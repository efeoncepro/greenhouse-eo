# TASK-568 — Typography in Delivery Surfaces: Email Stack + PDF Font Registration

## Delta 2026-05-11 — Slice 2 + Slice 3 PDF cerrados ad-hoc · scope restante = solo emails

Durante el setup de TASK-862 (mockup de finiquito renuncia V1) se detectó que el pivot Geist del 2026-05-01 nunca llegó al runtime PDF: `register-fonts.ts` aún registraba `'DM Sans'` y `src/assets/fonts/` carecía de los TTF de Geist. Eso bloqueaba la migración del PDF de finiquito (8 callsites `fontFamily: 'DM Sans*'` en `document-pdf.tsx`). Para destrabar TASK-862 se cerraron **Slice 2 + Slice 3 de esta task** live el 2026-05-11:

- **Slice 2 (PDF font registration)** ✅ — `src/lib/finance/pdf/register-fonts.ts` extendido con 3 nuevos `tryRegister('Geist', ...)`, `tryRegister('Geist Medium', ...)`, `tryRegister('Geist Bold', ...)`. Comentario header actualizado con rationale (DESIGN.md líneas 380+384), source (Google Fonts via gwfh helper), licencia (SIL OFL 1.1) y plan de remoción de DM Sans (cuando TASK-862 Slice D migre el último consumer, remover los 3 `tryRegister('DM Sans*', ...)` + borrar `src/assets/fonts/DMSans-*.ttf`). DM Sans dejado registrado temporalmente para no romper PDFs que aún lo referencian. Validado live con smoke render (3 weights → 10,918 bytes, sin fallback a Helvetica).
- **Slice 3 (Asset provisioning, ahora Geist)** ✅ — Geist Sans Regular (400) / Medium (500) / Bold (700) descargados desde Google Fonts vía gwfh helper (`https://gwfh.mranftl.com/api/fonts/geist?subsets=latin&variants=regular,500,700&formats=ttf`), copiados a `src/assets/fonts/Geist-Regular.ttf` (30,264 bytes), `Geist-Medium.ttf` (30,296 bytes), `Geist-Bold.ttf` (30,256 bytes). SHA256 prefixes: `4aa4920f...`, `355224d7...`, `def4840c...`. SemiBold (600) y ExtraBold (800) NO se descargaron — solo 3 weights son las que `register-fonts.ts` registra y se usan en práctica; si emerge necesidad de SemiBold/ExtraBold para algún PDF futuro, agregar siguiendo el mismo patrón.

**Scope restante de TASK-568** (lo que aún falta):

- **Slice 1 — Emails**: `src/emails/constants.ts:18` aún tiene `body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"`. URL Google Fonts en email templates aún apunta a DM Sans. 9+ archivos `src/emails/*.tsx` consumen `EMAIL_FONTS.body` → cuando se migre el constante, propaga automáticamente. Slice más chico que antes porque la decisión de tokens + assets ya está cerrada.
- **Slice 4 — PDF tokens**: revisar si `src/lib/finance/pdf/tokens.ts` existe y modela `body*` sobre DM Sans (Acceptance Criteria línea 119); si existe, migrar a Geist.
- **Slice 5 — Asset hygiene**: documentación de procedencia/licencia (ya hecha en el header de `register-fonts.ts` post-Slice 2). Verificar que no quedan referencias huérfanas a TTF de DM Sans que ningún consumer use.

**Causa raíz documentada**: el codemod de TASK-567 (regex AST sobre `Property{key:fontFamily, value:literal}`) era JSX-scoped y no scaneó archivos PDF (`*-pdf.tsx`) ni emails — por eso `'DM Sans'` literal quedó vivo en `document-pdf.tsx` (8 callsites), `register-fonts.ts` (3 registers) y `src/emails/constants.ts` (1 stack). La ESLint rule `greenhouse/no-hardcoded-fontfamily` en modo `warn` no bloqueó nada porque los warnings se mezclaron con la baseline de 311. TASK-568 quedó zombie 10 días después del pivot porque ningún consumer rendereó PDF/email post-Geist hasta hoy.

**Próximos pasos canónicos**: cerrar Slice 1 + Slice 4 en una sesión (~30 min), validar emails preview, mover task a `complete/`. Si TASK-862 Slice D se mergea ANTES de cerrar TASK-568, agregar al closing protocol de TASK-568 también la remoción de DM Sans de `register-fonts.ts` + delete de `src/assets/fonts/DMSans-*.ttf` (ya documentado como plan de remoción en el header del archivo).

## Delta 2026-05-01 (tarde) — pivot a Geist

Tras cerrar TASK-566 con Inter y validar visualmente, el usuario decidió pivotar a **Geist Sans** como product UI base. Esta task pasa a converger emails y PDFs al contrato `Poppins + Geist`, no `Poppins + Inter`. Cambios concretos sobre el cuerpo:

- Donde dice "Inter" como destino, leer "Geist Sans"
- `src/assets/fonts/**` debe incorporar el set local de Geist (`Geist-Regular.ttf`, `Geist-Medium.ttf`, `Geist-SemiBold.ttf`, `Geist-Bold.ttf`, `Geist-ExtraBold.ttf`). Asset disponible en npm `geist` (SIL OFL 1.1) y en el repo `vercel/geist-font`
- `register-fonts.ts` registra cada peso como su propia familia (`'Geist'` 400, `'Geist Medium'` 500, `'Geist SemiBold'` 600, `'Geist Bold'` 700, `'Geist ExtraBold'` 800) siguiendo el patrón actual de DM Sans
- `tokens.ts` reemplaza `body: 'DM Sans'` por `body: 'Geist'`, etc.
- Emails: `src/emails/constants.ts` cambia el fallback stack a `'Geist', -apple-system, BlinkMacSystemFont, sans-serif` y la URL Google Fonts importada queda `family=Geist:wght@400;500;600;700;800`
- Geist Mono **NO** se introduce; mono variants quedan sobre Geist Sans + `tabular-nums`

## Status

- Lifecycle: `to-do` _(2 de 5 slices cerrados ad-hoc el 2026-05-11 — ver Delta arriba)_
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo` (~30 min — solo Slice 1 emails + Slice 4 tokens restantes; scope original era ~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Parcial — PDF font registration + asset provisioning cerrados; emails + tokens pendientes`
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

- [ ] `src/lib/finance/pdf/register-fonts.ts` deja de registrar `DM Sans` _(parcial — Geist ya registrada el 2026-05-11; remoción final de DM Sans pendiente hasta que TASK-862 Slice D migre el último consumer)_
- [ ] `src/lib/finance/pdf/tokens.ts` deja de modelar body sobre DM Sans _(pendiente Slice 4 — pendiente verificar si el archivo existe y qué consumers tiene)_
- [x] **`src/assets/fonts/**` contiene el set mínimo requerido de Geist para PDF** ✅ — cerrado 2026-05-11: `Geist-Regular.ttf` (30,264 b), `Geist-Medium.ttf` (30,296 b), `Geist-Bold.ttf` (30,256 b) descargados desde Google Fonts vía gwfh helper
- [ ] emails dejan de referenciar DM Sans _(pendiente Slice 1 — `src/emails/constants.ts:18` aún apunta a DM Sans)_
- [ ] PDFs y emails convergen a `Poppins + Geist` _(PDFs ya tienen Geist disponible; falta que callsites migren; emails pendientes)_
- [x] **no aparece una tercera familia nueva salvo justificación documentada** ✅ — Geist + Poppins + (transicional DM Sans) son las únicas 3 registradas
- [x] **La procedencia/licencia o fuente operativa de los archivos `Geist` queda documentada en la task o doc relacionada** ✅ — `register-fonts.ts` header documenta Google Fonts via gwfh + SIL OFL 1.1; este Delta documenta SHA256 prefixes
- [x] **Existe fallback claro si una familia PDF no registra: no rompe render y queda detectable en validación manual** ✅ — `tryRegister` swallows individual failures con `console.warn`; React-PDF cae a Helvetica para familias no registradas (comportamiento intencional documentado en header del archivo)
- [ ] Los emails usan `Poppins` en headings display y `Geist` en body/metadata; no quedan párrafos largos o tablas operativas renderizados en `Poppins` _(pendiente Slice 1)_

## Verification

- preview de emails
- render manual de quote PDF / payroll PDF
- `pnpm build`
- revisar al menos un email en Gmail/Outlook o equivalente con fallback realista
- abrir un PDF generado y verificar que headings/body/montos no colapsan a pesos erráticos

## Open Questions

- Si algún PDF necesita una diferencia más marcada para IDs o montos, primero probar `Inter + tabular-nums`; solo después evaluar una tercera familia como excepción del programa.
