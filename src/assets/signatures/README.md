# Firmas digitalizadas de representantes legales

TASK-863 V1.4 — recurso **canónico reutilizable** para firmas digitales de
representantes legales de organizaciones. Se consume desde cualquier flow del
repo que renderice documentos formales firmados por el representante legal
(finiquitos, contratos, adenda, cartas formales, etc.).

## Helper canónico

```typescript
import {
  buildSignatureFilenameForTaxId,
  resolveLegalRepresentativeSignaturePath,
  getLegalRepresentativeSignatureAbsolutePath
} from '@/lib/legal-signatures'

// Path filename canónico por RUT
const filename = buildSignatureFilenameForTaxId('77.357.182-1')
// → "77357182-1.png"

// Absolute path con verificación de existencia + path-safe
const abs = getLegalRepresentativeSignatureAbsolutePath('77.357.182-1')
// → "/Users/.../src/assets/signatures/77357182-1.png" | null
```

## Convención de filename

`{taxId_sin_puntos_ni_espacios}.{png|jpg|jpeg}`

Ejemplos:

| Organización | RUT | Filename |
|---|---|---|
| Efeonce Group SpA | 77.357.182-1 | `77357182-1.png` |
| (futura SpA) | 76.000.000-K | `76000000-K.png` |

## Formato del archivo

- PNG transparente (fondo sin fill) — recomendado
- Aspect ratio ~5:2 sugerido (e.g. 1718×734 px funciona perfecto)
- Trazo oscuro (#1A1A2E o cercano)
- Max ~200 KB

## Seguridad

`resolveLegalRepresentativeSignaturePath` aplica path-safe checks:

- Rechaza `..` (path traversal)
- Rechaza paths absolutos (`/etc/...`)
- Solo permite extensiones `.png/.jpg/.jpeg`
- Solo permite caracteres `[a-zA-Z0-9._\-/]`
- Verifica `existsSync` antes de retornar el path

Si cualquier check falla → retorna `null` (graceful fallback; el render deja la
línea vacía para firma manual).

## Tests

`pnpm test src/lib/legal-signatures` (path traversal, invalid extensions,
file-not-found graceful, RUT cleaning).

## V2 follow-up

Migrar lookup a FK asset privado canónico:

- Nueva columna `greenhouse_core.organizations.legal_representative_signature_asset_id`
- Bucket `greenhouse-private-assets-{env}/signatures/`
- Retention class `legal_signature`
- Audit log + rotation + revocación
- UI admin para subir / reemplazar
- Asset privado canónico (mismo patrón que `final_settlement_document`)

Por ahora V1.4 usa filesystem hardcoded para no requerir DDL — suficiente para
1 representante legal por organización (caso Efeonce hoy).
