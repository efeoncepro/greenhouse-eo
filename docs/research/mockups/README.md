# Mockups — RESEARCH-005 PDF redesign

Artefactos visuales de iteracion para [RESEARCH-005 v1.4](../RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md). NO son codigo de produccion — son mockups HTML/CSS para validar look-and-feel ANTES de codear en `@react-pdf/renderer`.

## Como abrirlos

```bash
# Desde la raiz del repo
open docs/research/mockups/quote-pdf-cover-mockup.html
```

O drag-and-drop el `.html` a tu browser.

## Indice

| Archivo | Iteracion | Estado | Notas |
|---|---|---|---|
| `quote-pdf-cover-mockup.html` | v1 | En revision | Cover de la cotizacion (pagina 1 de 7) — establece el sistema de tokens visuales para todo el PDF |

## Sistema de tokens documentado en el mockup

Cada mockup contiene un bloque `:root { --pdf-* }` con los tokens propuestos para `PdfTokens.ts`. Cuando se apruebe el look, esos tokens migran a TypeScript:

```text
:root vars del HTML  →  PdfTokens.ts (consumido por StyleSheet.create del @react-pdf/renderer)
```

## Workflow de iteracion

1. Abrir mockup en browser
2. Comentar lo que cambia (color, spacing, jerarquia, contenido)
3. Editar el HTML/CSS directamente — iterar rapido sin build
4. Cuando el look este aprobado, congelar los tokens y empezar implementacion React-PDF
5. El mockup HTML se conserva como referencia visual de la decision

## Limitaciones del mockup vs PDF real

- Browser usa `pt` como CSS unit — `@react-pdf/renderer` interpreta `pt` igual, pero el rendering exact puede diferir 1-2pt en algunos elementos
- Web fonts (Google Fonts) cargan en browser — en PDF requeriran `Font.register()` con archivos .ttf locales
- SVG inline funciona en browser; en `@react-pdf/renderer` requiere `<Svg>` component limitado o fallback PNG
- Box-shadow del browser NO se renderiza en PDF (solo es chrome del mockup)
