# Firmas digitalizadas de representantes legales

TASK-863 V1.3 — firmas del representante legal del empleador, embedded como Image
sobre la línea de firma "Representante empleador" del PDF de finiquito.

## Convención de filename

`{RUT_sin_puntos_ni_espacios}.png`

Ejemplo Efeonce Group SpA, RUT `77.357.182-1`:
```
src/assets/signatures/77357182-1.png
```

## Formato

- PNG transparente (fondo sin fill)
- Aspect ratio ~5:2 (e.g. 600×240 px)
- Trazo oscuro (#1A1A2E o similar)
- Max 200 KB

## Resolución

El render del PDF resuelve el path automáticamente desde `snapshot.employer.taxId`:
- Si el archivo existe → embed sobre la línea de firma del empleador
- Si NO existe → línea queda vacía para firma manual post-impresión

## Path traversal protection

`resolveEmployerSignaturePath` en `src/lib/payroll/final-settlement/document-pdf.tsx`
sanitiza el path: rechaza `..`, paths absolutos, y solo permite `.png/.jpg/.jpeg`.

## V1.4 follow-up

Migrar lookup a FK asset privado en `greenhouse_core.organizations.legal_representative_signature_asset_id`
con bucket `greenhouse-private-assets-{env}/signatures/`, audit log, rotation, retention
class `legal_signature`. Por ahora, V1.3 usa filesystem hardcoded para no requerir DDL.
