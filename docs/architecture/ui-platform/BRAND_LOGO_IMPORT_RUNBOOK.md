# Brand Logo Import Runbook

> **Status:** vigente desde 2026-06-19
> **Audience:** Codex, Claude y agentes que importen logos desde AXIS Figma
> **Primitive owner:** `GreenhouseBrandLogoMark`
> **Contrato base:** [BRAND_LOGO_VARIATIONS.md](./BRAND_LOGO_VARIATIONS.md)
> **Lab/GVC:** `/design-system/brand-logos` · `design-system-brand-logos`

Este runbook documenta lo aprendido al portar los logos Gemini, Adobe, Adobe Express, Firefly, Photoshop, Premiere, Illustrator, After Effects, Envato y Shutterstock desde AXIS Figma. Su objetivo es que una sesión nueva no tenga que redescubrir por qué ciertos logos se pixelan, se cortan, pierden color o terminan como texto local.

## Principio

Los logos de marca son assets de terceros, no componentes tipográficos del portal. La primitive Greenhouse solo gobierna `kind`, `variant`, tamaño, a11y y placement; la identidad visual vive dentro del asset.

Reglas duras:

- No recrear wordmarks con `Typography`, MUI, CSS, fuentes locales ni texto runtime.
- No reemplazar degradados de marca por `linearGradient` manual salvo que Figma entregue ese gradiente como vector simple y se haya validado visualmente.
- No crear componentes paralelos por familia. Agregar `kind` al controller y usar `GreenhouseBrandLogoMark`.
- No mezclar `kind` funcionales: un isotipo suelto, un badge con fondo y un lockup son assets separados aunque compartan marca.
- No asumir que "SVG" significa "todo es vector puro": Figma puede exportar un SVG con un `<image data:image/png;base64,...>` recortado por máscara. Si conserva fidelidad visual y nitidez a los tamaños de uso, es aceptable como SVG asset local.

## Flujo Para Traer Un Logo

1. Abrir el nodo Figma y capturar intención visual: familia, nodo AXIS, nombres de variantes, fondos, lockups y tamaños.
2. Definir los `kind` semánticos antes de tocar JSX. Ejemplo: `expressIsotype`, `expressOnBlack`, `expressFullColorOnBlack`, `expressOnNeutral`, `expressLogotype`.
3. Guardar assets bajo `public/images/logos/axis/` con nombres estables kebab-case.
4. Registrar cada kind en `src/components/greenhouse/primitives/greenhouse-brand-logo-controller.ts`:
   - `family`
   - `variant` (`isotype | contained | lockup`)
   - `ariaLabel`
   - `assetSrc`
   - `assetAspectRatio` cuando el lockup no sea cuadrado
   - `tone` solo como metadata de marca, no como color UI semántico
5. Actualizar el lab en `BrandLogoLabView.tsx`:
   - lista de specimens de la familia
   - hero si aplica
   - `Size contract`
   - marker `data-capture="brand-logo-<family>-kind-matrix"`
6. Actualizar tests focales de `GreenhouseBrandLogoMark`:
   - resolver de `kind`
   - `kind -> variant`
   - `img src`
   - ausencia de texto local del wordmark
   - asset file cuando exista una corrección sensible
7. Bump de `AXIS_BRAND_LOGO_ASSET_VERSION` cuando cambie un asset ya servido. Sin esto el browser puede mostrar un SVG anterior.
8. Documentar la familia en `BRAND_LOGO_VARIATIONS.md`.
9. Verificar con GVC y mirar el frame de la familia, no solo confiar en tests.

## Política De Assets

Preferencias, en orden:

1. SVG local completo desde Figma cuando el subnodo trae la marca completa.
2. SVG local compuesto desde sub-vectores Figma cuando el lockup no llega como raíz única, pero sus piezas sí son fieles.
3. SVG local con textura embebida (`<image data:image/png;base64,...>`) y máscara vectorial cuando Figma exporta el cromatismo como textura.
4. PNG solo cuando el MCP/export no entrega un SVG único fiel para el lockup completo.

Normalización recomendada:

- Mantener `viewBox` holgado para que no se corten letras o badges.
- Usar `preserveAspectRatio="xMidYMid meet"`.
- Evitar `overflow` visual no intencional. Si un SVG contiene fondo + marca, el asset debe incluir ambos, no depender de CSS externo.
- Para badges circulares, el círculo y el símbolo deben vivir en el mismo asset si esa es la variante Figma.
- Para lockups, preservar el asset completo. No reescribir el wordmark con una fuente similar.

## Casos Que Ya Fallaron

### Gemini

Problema observado: el wordmark se veía con tipografía incorrecta, gris oscuro y la última `i` cortada/delgada.

Solución:

- `geminiIsotype` es el isotipo cromático solo.
- `geminiLogotype` es otro asset: incluye isotipo + wordmark.
- El wordmark se sirve como SVG local, negro real, con viewBox holgado.
- No usar texto local `Gemini`, ni `fontWeight`, ni `theme.typography` para el lockup.

### Adobe

Problema observado: `adobeOnRed` llegó como círculo rojo sin la A blanca.

Solución:

- El asset `adobe-on-red` debe contener el badge completo de Figma: fondo rojo + A blanca.
- No pintar el círculo en CSS y montar otro símbolo encima salvo que se valide como asset final único.

### Adobe Express

Problemas observados:

- Reemplazar el degradado por `linearGradient` manual cambió los colores de marca.
- El intento `expressFullColorOnBlack` quedó como círculo negro vacío.
- `file://` puede mostrar imagen rota para SVGs con imágenes embebidas aunque Next/static lo renderice bien.

Solución:

- `expressIsotype`, `expressOnNeutral` y el icono del `expressLogotype` conservan la textura cromática exportada desde Figma y recortada por máscara.
- `expressOnBlack` es A blanca sobre círculo negro.
- `expressFullColorOnBlack` es un kind separado: A cromática completa dentro del círculo negro.
- Para `expressFullColorOnBlack`, no anidar un SVG completo como `<image href="data:image/svg+xml;base64,...">`; Chrome lo puede tratar como subimagen no renderizable cuando el asset se usa dentro de `<img>`.
- Componer el badge con círculo negro + el mismo cuerpo del SVG cromático base (`expressIsotype`) dentro de un `<g transform="...">`, con `clipPath` id único.
- Probar assets con servidor HTTP o Next/static, no solo con `file://`.

### Firefly, Photoshop, Illustrator y After Effects

Problema observado: varios compactos se veían pixelados, cortados o como arcos parciales porque el asset/fondo no coincidía con el viewBox visible.

Solución:

- Normalizar cada SVG con `viewBox` y `preserveAspectRatio="xMidYMid meet"`.
- No aumentar el tamaño visual con CSS si el asset quedó con contenido fuera del viewport.
- Si el lockup llega como raster porque Figma no entrega raíz SVG única, mantenerlo como PNG solo para lockup; los compactos deben ser SVG cuando estén disponibles.

### Premiere y Envato

Problema observado: los lockups podían tentarse a reconstruir con texto local.

Solución:

- Componer lockups desde sub-vectores Figma cuando no llega un SVG raíz único.
- El wordmark pertenece al asset, no al runtime.

### Shutterstock

Resultado observado: el nodo `12274:62` sí entrega SVG fiel para sus cinco variantes, incluido el logotipo completo.

Solución:

- Exportar `shutterstockIsotype`, `shutterstockOnNeutral`, `shutterstockOnRed`, `shutterstockOnPink` y `shutterstockLogotype` como SVG locales.
- Mantener el wordmark `shutterstock` como asset vectorial; no reconstruirlo con texto local.
- Si el MCP devuelve el SVG pero copiarlo a mano sería frágil, usar la Figma REST API con el token del secret `greenhouse-figma-api-token` para exportar `format=svg` por node id y descargar los assets sin imprimir el token.

## Pruebas Visuales Que Sí Sirven

La evidencia principal es GVC:

```bash
pnpm fe:capture design-system-brand-logos --env=local --hold=1200
```

Mirar los frames:

- `brand-logo-<family>-kind-matrix`
- `brand-logo-hero`
- `brand-logo-size-contract`

Para depurar un asset aislado que contiene `<image data:image/...>`, servir `public/` por HTTP:

```bash
python3 -m http.server 8123 -d public
```

Y abrir/capturar:

```text
http://127.0.0.1:8123/images/logos/axis/<asset>.svg
```

No usar `file://` como verdad para SVGs con imágenes embebidas: puede mostrar imagen rota aunque el asset funcione servido por HTTP.

## Checklist De Cierre

Antes de decir que un logo quedó listo:

- El kind existe en `GreenhouseBrandLogoKind`.
- El controller resuelve `kind -> variant` correctamente.
- El lab muestra la familia en desktop y mobile.
- El asset se sirve por `<img>`.
- No hay texto local para wordmarks.
- El asset no se corta en `small | medium | large`.
- La familia nueva está en `BRAND_LOGO_VARIATIONS.md`.
- Si el asset cambió, `AXIS_BRAND_LOGO_ASSET_VERSION` cambió.
- `pnpm exec vitest run src/components/greenhouse/primitives/__tests__/GreenhouseBrandLogoMark.test.tsx` pasa.
- ESLint focal de primitive/controller/lab/scenario pasa.
- `pnpm exec tsc --noEmit --pretty false` pasa.
- `pnpm design:lint` pasa.
- GVC `design-system-brand-logos` pasa y el frame de la familia fue mirado.
