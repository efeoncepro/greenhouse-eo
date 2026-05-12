# Greenhouse Legal Signatures Platform V1

> **Tipo:** Spec arquitectónica canónica
> **Status:** Accepted
> **Versión:** 1.0
> **Creado:** 2026-05-11 por Claude (TASK-863 V1.4 + V1.5)
> **Domain:** Identity / Documents / Legal artifacts
> **Spec relacionada:** [GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC](GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md), [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1](GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

## 1. Contexto

Greenhouse renderiza documentos legales firmados por el **representante legal** de una organización (empleador). En V1.3 cada flow embebía firmas digitalizadas de forma ad-hoc, sin path-safe protection ni reutilización. V1.4 extrajo el patrón a un módulo canónico compartido (`src/lib/legal-signatures`) consumible por cualquier flow legal del repo: finiquitos, contratos de trabajo, addenda, cartas formales, certificados de servicio, acuerdos de modificación contractual, etc.

## 2. Decisión

Las firmas digitalizadas de representantes legales viven como **archivos PNG transparentes** en `src/assets/signatures/{tax_id_sin_puntos}.png`, resueltos a través del **helper canónico `@/lib/legal-signatures`**. Cualquier flow del repo que renderice documentos firmados consume este helper — NUNCA reimplementa el resolver inline.

Patrón forward-compatible: V2 (TBD) migrará el almacenamiento a asset privado canónico (`greenhouse_core.assets` con `retention_class = 'legal_signature'` + FK desde `greenhouse_core.organizations.legal_representative_signature_asset_id`), preservando la signature pública del helper.

## 3. Convención de filename

`src/assets/signatures/{taxId_normalizado}.{png|jpg|jpeg}`

`taxId_normalizado` = `taxId` con puntos y espacios removidos (guion preservado).

| Organización | RUT | Filename canónico |
|---|---|---|
| Efeonce Group SpA | 77.357.182-1 | `77357182-1.png` |
| Futuro cliente SpA | 76.000.000-K | `76000000-K.png` |

Permitidos aliases human-friendly coexistiendo (`Firma-Julio.png`), pero el helper resuelve solo el filename canónico derivado del taxId.

## 4. API pública

`src/lib/legal-signatures/index.ts` exporta:

```typescript
export const LEGAL_SIGNATURE_BASE_DIR = 'src/assets/signatures'

// Normaliza RUT chileno → filename canónico. Null si input vacío.
buildSignatureFilenameForTaxId(taxId: string | null | undefined): string | null

// Path-safe resolver con file existence check. Retorna absolute path
// o null. Rechaza `..`, paths absolutos, extensiones distintas a
// png/jpg/jpeg, y caracteres fuera de [a-zA-Z0-9._\-/].
resolveLegalRepresentativeSignaturePath(
  relativePath: string | null | undefined
): string | null

// Combinación de alto nivel: taxId → absolute path | null.
getLegalRepresentativeSignatureAbsolutePath(
  taxId: string | null | undefined
): string | null
```

## 5. Path-safe protection

`resolveLegalRepresentativeSignaturePath` aplica 4 checks defensivos:

1. **Empty/null** → retorna `null` (graceful fallback)
2. **Path traversal** (`..` en cualquier posición) → retorna `null`
3. **Path absoluto** (empieza con `/`) → retorna `null`
4. **Extensión** debe matchear `^[a-zA-Z0-9._\-/]+\.(png|jpg|jpeg)$` → caso contrario `null`
5. **File existence** vía `existsSync` síncrono → si NO existe retorna `null`

Si cualquier check falla, el consumer del helper renderiza la **línea de firma vacía** (graceful fallback enterprise) para que pueda firmarse físicamente post-impresión.

## 6. Consumers actuales

| Consumer | Surface | Cuándo embebe |
|---|---|---|
| `src/lib/payroll/final-settlement/document-pdf.tsx` | PDF finiquito (TASK-862) | Render del bloque firma del representante empleador; cualquier `documentStatus` |

## 7. Reglas duras canónicas

- **NUNCA** reimplementar el resolver inline en otro flow. Consumir `@/lib/legal-signatures`.
- **NUNCA** componer paths absolutos hardcoded en código. Siempre vía `buildSignatureFilenameForTaxId(taxId)` + `resolveLegalRepresentativeSignaturePath`.
- **NUNCA** confiar en path strings provenientes de usuario (UI, API body, URL params) sin pasarlos por el resolver — el resolver enforce path-safe checks.
- **NUNCA** embeber firmas digitalizadas de personas naturales (trabajadores) usando este helper. Es exclusivo del **representante legal** del **empleador**. Las firmas de trabajadores son siempre físicas presenciales (art. 177 CT exige ministro de fe).
- **SIEMPRE** dejar graceful fallback en el render si el path resuelve a `null` (línea vacía para firma manual).
- **SIEMPRE** preservar PNG transparente con aspect ratio ~2.2-2.4:1 (recomendado 1718×734 o similar).

## 8. Tests anti-regresión

`src/lib/legal-signatures/index.test.ts` cubre 11 escenarios:

- RUT cleaning canónico
- Empty/null inputs
- Path traversal blocked
- Absolute paths blocked
- Invalid extensions blocked (`.svg`, `.exe`, sin extension)
- Special chars blocked
- Non-existent file → null
- Real file → absolute path resolution

## 9. Forward-compatibility V2 path

V2 sustituirá el filesystem store por asset privado canónico en `greenhouse_core.assets`:

- Nueva columna: `greenhouse_core.organizations.legal_representative_signature_asset_id` (FK)
- Nuevo bucket prefix: `greenhouse-private-assets-{env}/signatures/`
- Nueva retention class: `legal_signature`
- UI admin para upload + rotation + revocación
- Audit log per access
- Mismo signature público del helper (`getLegalRepresentativeSignatureAbsolutePath`) — backwards-compatible

## 10. Microcopy es-CL canónico

Cuando un flow necesite mencionar la firma del representante legal en UI/copy, usar etiquetas consistentes:

- **Es-CL formal-legal** (PDF + documentos): "Representante empleador" (formato `Trabajador(a)` con paréntesis, NO `Trabajador/a` con slash).
- **Es-CL operativo** (admin UI futura): "Firma del representante legal", "Subir nueva firma", "Rotar firma".

## 11. Referencias

- TASK-863: cierre del finiquito V1 con UI prerequisitos + helper canónico de firmas.
- ADR en [DECISIONS_INDEX.md](DECISIONS_INDEX.md): "Legal Signatures viven como recurso canónico reutilizable, NO ad-hoc por flow".
- Source: `src/lib/legal-signatures/index.ts`, tests `src/lib/legal-signatures/index.test.ts`, README `src/assets/signatures/README.md`.
