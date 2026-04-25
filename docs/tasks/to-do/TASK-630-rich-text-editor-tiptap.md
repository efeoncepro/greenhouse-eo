# TASK-630 — Rich Text Editor TipTap (componente reusable GreenhouseRichTextEditor)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque B)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-630-rich-text-editor-tiptap`
- Legacy ID: `RESEARCH-005 D4 v1.3`
- GitHub Issue: `none`

## Summary

Construir componente `<GreenhouseRichTextEditor>` reusable usando TipTap (ya instalado en repo, sin uso) y reemplazar el textarea pelado actual del admin product-catalog. Habilita poblar `description_rich_html` correctamente sin pedirle al operador que escriba HTML manualmente.

## Why This Task Exists

Hoy `src/views/greenhouse/admin/product-catalog/ProductCatalogDetailView.tsx:356-365` tiene un `<TextField multiline rows={4}>` para `descriptionRichHtml` con un helper text que dice "Whitelist server-side: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href>, <br>". Esto es **inviable operacionalmente**: nadie va a escribir HTML a mano. Resultado: los 74 productos del catalogo tienen el campo vacio.

TipTap esta instalado en `package.json` (versiones 3.14.0 de core/react/starter-kit + 8 extensions) pero no se usa en ningun lado del codigo. Esta task es el primer uso productivo.

El componente debe ser reusable porque al menos 6 surfaces lo van a necesitar:

- product_catalog descriptions (este caso)
- service_modules descriptions (TASK-620.3)
- quote line items custom description (TASK-620.4 y 620.5)
- MSA clauses templates
- quote terms override
- notes/comentarios en multiples vistas

## Goal

- Componente `<GreenhouseRichTextEditor>` en `src/components/greenhouse/editors/`
- Toolbar configurable con: bold, italic, underline, lists (bullet + ordered), link insert/edit, headings (h2, h3), undo/redo
- Output HTML compatible con `sanitizeProductDescriptionHtml` whitelist actual + extension a `<h2>, <h3>` (validar)
- Integrado en `ProductCatalogDetailView.tsx` reemplazando el textarea
- Reduced motion support (sin animaciones de cursor cuando `prefers-reduced-motion`)
- Accessibility: ARIA labels en toolbar buttons, keyboard shortcuts estandar (Ctrl+B, Ctrl+I, etc.)
- Empty state placeholder configurable

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patron de wrappers Greenhouse sobre librerias
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Decision 4 v1.3 (TipTap elegido)
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (este bloque B)

Reglas obligatorias:

- output HTML pasa por `sanitizeProductDescriptionHtml` server-side antes de persistir
- TipTap configurado para emitir solo elementos del whitelist (no `<u>`, `<s>`, `<code>`, `<blockquote>` por ahora)
- componente respeta el theme tokens Greenhouse (DM Sans, colores semaforo)
- usa Vuexy `Card` outlined como container

## Dependencies & Impact

### Depends on

- `@tiptap/*` packages (ya instalados version 3.14.0)
- `sanitizeProductDescriptionHtml` (ya existe, TASK-603)

### Blocks / Impacts

- `TASK-630.1` (backfill productos legacy)
- `TASK-630.2` (AI description generator)
- `TASK-620.3` (service composer usa el mismo editor para descripcion del module)
- `TASK-620.4` y `TASK-620.5` (quote builder usa para line item custom descriptions)

### Files owned

- `src/components/greenhouse/editors/GreenhouseRichTextEditor.tsx` (nuevo)
- `src/components/greenhouse/editors/GreenhouseRichTextToolbar.tsx` (nuevo)
- `src/components/greenhouse/editors/__tests__/GreenhouseRichTextEditor.test.tsx` (nuevo)
- `src/views/greenhouse/admin/product-catalog/ProductCatalogDetailView.tsx` (modificado: reemplaza el TextField)
- `src/lib/sanitize/product-description-html.ts` (ajustar whitelist si requiere `<h2>, <h3>`)

## Current Repo State

### Already exists

- TipTap instalado: core, react, starter-kit, color, list, list-item, placeholder, text-align, text-style, underline, pm
- sanitizer server-side (`sanitizeProductDescriptionHtml`)
- Vuexy theme tokens via `theme.palette.*`
- ProductCatalogDetailView con TextField actual

### Gap

- Cero uso productivo de TipTap en el repo
- No existe wrapper Greenhouse del editor
- Operadores no pueden poblar descriptions rich HTML

## Scope

### Slice 1 — Componente base (1 dia)

`src/components/greenhouse/editors/GreenhouseRichTextEditor.tsx`:

```typescript
interface GreenhouseRichTextEditorProps {
  value: string                       // HTML inicial
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number                  // default 120px
  maxHeight?: number                  // default 400px
  toolbar?: 'minimal' | 'standard' | 'extended'   // default 'standard'
  disabled?: boolean
  ariaLabel?: string
  characterLimit?: number             // soft warning, no hard block
}
```

Configuracion TipTap restringida al whitelist:

```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      bold: { HTMLAttributes: { class: 'gh-strong' } },
      italic: { HTMLAttributes: { class: 'gh-em' } },
      bulletList: {},
      orderedList: {},
      listItem: {},
      paragraph: {},
      hardBreak: {},
      // EXPLICITLY OFF: code, codeBlock, blockquote, horizontalRule, strike
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      strike: false
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      protocols: ['http', 'https', 'mailto']
    }),
    Placeholder.configure({ placeholder })
  ],
  content: value,
  onUpdate: ({ editor }) => onChange(editor.getHTML()),
  editorProps: {
    attributes: {
      'aria-label': ariaLabel || 'Editor de texto enriquecido',
      class: 'gh-rich-text-content'
    }
  }
})
```

Layout:

- `<Card variant='outlined'>`
  - `<GreenhouseRichTextToolbar editor={editor} variant={toolbar} />`
  - `<EditorContent editor={editor} />` con styled-component aplicando DM Sans + line-height + min/maxHeight

### Slice 2 — Toolbar (0.5 dia)

`src/components/greenhouse/editors/GreenhouseRichTextToolbar.tsx`:

3 variantes:

| Variante | Botones |
|---|---|
| `minimal` | bold, italic, link |
| `standard` (default) | + lists (bullet/ordered), undo/redo |
| `extended` | + headings (h2/h3), text-align (left/center/right) |

Cada boton:

- `<CustomIconButton variant='tonal' size='small'>` con tabler icon
- ARIA label en español
- `aria-pressed` cuando estado activo
- Keyboard shortcut hint en tooltip (Ctrl+B, Ctrl+I, etc.)
- Touch target >= 24x24px

Link button abre dialog modal (no inline) para insertar URL + texto opcional.

### Slice 3 — Whitelist sanitizer extension (0.25 dia)

Verificar si `sanitizeProductDescriptionHtml` actualmente acepta `<h2>` y `<h3>`. Si no, agregarlos al whitelist con tests:

```typescript
// src/lib/sanitize/product-description-html.ts
const ALLOWED_TAGS = [
  'p', 'strong', 'em', 'u', 'a', 'br',
  'ul', 'ol', 'li',
  'h2', 'h3'   // NEW v1.8 (TASK-630)
]

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel']
}
```

Tests adicionales:

- Input con `<h2>` → preservado
- Input con `<h1>, <h4-6>` → stripped (por ahora solo h2/h3)
- Input con `<u>` → preservado
- Input con `<code>, <blockquote>` → stripped (no en whitelist)

### Slice 4 — Integracion en ProductCatalogDetailView (0.25 dia)

Reemplazar lineas 356-365 de `ProductCatalogDetailView.tsx`:

```tsx
// ANTES:
<TextField
  label='Descripción HTML (rich)'
  value={form.descriptionRichHtml}
  onChange={e => setField('descriptionRichHtml', e.target.value)}
  multiline rows={4}
  helperText='Whitelist server-side: ...'
/>

// DESPUES:
<Box>
  <Typography variant='body2' color='text.secondary' mb={1}>
    Descripción enriquecida (lo que ve el cliente en propuestas)
  </Typography>
  <GreenhouseRichTextEditor
    value={form.descriptionRichHtml}
    onChange={(html) => setField('descriptionRichHtml', html)}
    placeholder='Describe el producto: alcance, valor diferencial, qué incluye...'
    toolbar='standard'
    minHeight={150}
    ariaLabel='Descripción del producto'
    characterLimit={2000}
  />
</Box>
```

## Out of Scope

- Tablas, imagenes inline, video embeds (overkill para descriptions de producto)
- Mentions / slash commands (requiere TASK-609 AI integration primero)
- Collaborative editing (Yjs) — futuro si dos usuarios editan el mismo producto simultaneamente
- Markdown export — HTML es el output canonico

## Acceptance Criteria

- [ ] componente `<GreenhouseRichTextEditor>` exportado y testeado
- [ ] toolbar con 3 variantes funcional (minimal, standard, extended)
- [ ] output HTML pasa el sanitizer sin perder contenido legitimo
- [ ] integrado en ProductCatalogDetailView reemplazando textarea
- [ ] keyboard shortcuts funcionan (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Shift+L para link)
- [ ] ARIA labels en español, screen reader announces toolbar buttons
- [ ] reduced motion respeta `prefers-reduced-motion`
- [ ] tests unitarios cover: render, type bold, insert link, change list type, sanitize roundtrip
- [ ] zero new dependencies (todo TipTap ya instalado)

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm lint` clean
- `pnpm test` clean (tests nuevos passing)
- `pnpm build` clean
- Manual QA en `/admin/product-catalog/[id]`:
  - Crear descripcion con bold + italic + lista + link
  - Save + reload → contenido persistido correcto
  - Verificar HTML en BD pasa sanitizer
  - PDF de quote rendera la descripcion (TASK-629 ya cierra el render)

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con screenshot del editor
- [ ] `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` actualizado seccion "Editors" con `<GreenhouseRichTextEditor>`
- [ ] Storybook entry o pagina demo en `/admin/dev/components` si existe sandbox
