# Íconos SKY · selección exacta y biblioteca del Lab

## Alcance y fuentes

La colección vive en Workbench, bajo `brands/sky-airline/icon-library/`. No pertenece
al host Efeonce ni se comparte con otras marcas. Su estado es
`imported-source-candidate`, `productionAdmitted: false`: se puede consultar y
seleccionar para revisión; no amplía los recursos que aceptan los jobs productivos.
No reemplazar automáticamente el avión de «vuela desde» ni otros elementos de
las 126 adaptaciones ya admitidas. Ver [componentes](components.md) para esas escenas.

Dentro del checkout Workbench, cargar según la operación:

| Operación | Fuente activa |
| --- | --- |
| Usar la colección y comprender límites | `docs/manual/sky-icon-library.md`, `brands/sky-airline/icon-library/README.md` |
| Fuente exacta y recibos | `manifest.json`, `snapshot.json`, `comparison.json` en `brands/sky-airline/icon-library/` |
| Seleccionar componente | `components.json`, `components.mjs`, `components.d.mts` en esa carpeta; `tools/marca-iconos.mjs` |
| Presentar en el Lab | `apps/brand-reference/icon-projection.mjs`, `src/lib/icon-library.ts`, `src/components/IconLibrary.astro`, `src/scripts/icon-library.ts`, `src/pages/iconos.astro` |
| Mantener admisión productiva | `docs/architecture/workbench-resource-revisions.md`, `workbench-sky-modular-components.md` |
| Verificar la entrega local | `docs/ui/reviews/workbench-sky-icons-2026-10-01.md`, `docs/operations/HARNESS_STATUS.md` |

Los paths `src/` de la fila Lab son relativos a `apps/brand-reference/`. Leer rama,
HEAD y status antes de modificar; el estado de esta referencia no certifica un
nuevo merge ni un despliegue. No ejecutar CLIs Greenhouse para operar la colección.

## Identidad y representación

Fuente indicada por el operador: [Librería iconos Sky](https://www.figma.com/design/Q4sFFczZT3uCjZrKVZT71D/?node-id=83-520).
File key `Q4sFFczZT3uCjZrKVZT71D`, página `83:520`, versión fijada
`2404746798886737517`; documento REST con SHA-256
`fd0284073cc368454c93c09063e754c78e2f40dabdcfb2a6a872cfab581d2a86`.
Esta fuente difiere del archivo Brandlift de los KV. Coincidencia de nombre, hex
o figura no prueba que dos tokens/bindings sean el mismo recurso.

La importación tiene 101 familias, 1.919 variantes, 294 originales y nueve
alternativas de trabajo: 2.222 SVG. Cada familia posee 19 combinaciones nativas:

| `kind` | Tamaños de canvas disponibles, en px |
| --- | --- |
| `filled` | 12, 14, 16, 18, 24, 32, 48 |
| `outline` | 12, 14, 16, 18, 24, 32, 48, 64 |
| `duotone` | 64, 72, 80, 88 |

No crear Duotone 24 a partir de Duotone 64 ni recolorear Outline para inventar
Filled. Los tamaños conservan ajustes propios; no deduplicar por parecido.
Hay familias homónimas, por ejemplo Cobre M y Cobre H. Usar `componentId`,
`sourceFamilyId` y `sourceNodeId`; nunca elegir la primera coincidencia por nombre.
Los 303 originales/alternativas permanecen en el manifest y archivo del Lab:
compartir nombre con una familia no les atribuye equivalencia.

Figma exportó 1.200 SVG directos y luego respondió HTTP 429 con `Retry-After`
399768 segundos. No se reintentó la API ni se cambió credencial para eludirlo.
El GET inicial contenía los trazados completos: los 1.022 restantes se proyectaron
sin red desde esa fuente. `representation` distingue `figma-svg-export` de
`figma-rest-path-projection`; conservarlo en toda selección/derivación.

La comparación técnica usa los 1.200 controles directos a escala 4, RGBA
premultiplicado y umbral por ícono ≤0,5 en escala 0–255. Pasó: media 0,001995 y
peor media 0,090575. Los otros 1.022 carecen de control SVG directo. Ese resultado
no certifica todas las proyecciones por comparación independiente, derechos,
aceptación visual ni admisión a campañas. Los SVG directos se conservan intactos.

El índice compacto registra hashes por SVG y recibos de bindings; el manifest
completo permanece en canon privado, ligado por `source.fullMetadataSha256`.
No ampliar gates para subir metadata enorme ni borrar recibos. JSON crudo,
exports parciales, comparación completa y canon histórico permanecen fuera de Git.

## Operación de agentes

Desde Workbench:

```bash
pnpm marca:iconos sky
pnpm marca:iconos sky sky-icon-family-2084-708 outline 24
pnpm marca:iconos sky sky-icon-family-2084-708 duotone 64
```

La CLI consulta, sin invocar IA ni generar piezas. La selección devuelve metadata,
SHA y `svgBytes`; el SVG íntegro se obtiene mediante el API local o descarga del Lab.
Ejemplo desde la raíz de Workbench:

```js
import { selectSkyIcon } from './brands/sky-airline/icon-library/components.mjs';
const icon = selectSkyIcon({
  brandId: 'sky-airline',
  componentId: 'sky-icon-family-2084-708', // Avión despegando
  kind: 'outline',
  size: 24,
});
// icon.svg, icon.sha256, icon.sourceNodeId, icon.representation
// icon.recipe.id === 'sky.icon.native-variant.v1'
// icon.productionAdmitted === false
```

`listSkyIconComponents({ brandId: 'sky-airline' })` enumera familias propias.
`selectSkyIcon` exige esos cuatro campos exactos: otra marca, campos extra,
colores libres, IDs por nombre/ruta, combos ausentes o bytes alterados fallan
cerrado. No inferir defaults. El lector verifica snapshot, hashes del índice y
catálogo, comparación, fuente y vector. `readSkyIconSources` es el lector de
build display-only que verifica todos los SVG; tampoco admite recursos.

## Operación humana y del Lab

Abrir Recursos → **Explorar íconos**, o **Íconos** en el sidebar; ruta `/iconos/`.
El host mantiene Efeonce (Bricolage/Poppins/tokens de interfaz); los SVG conservan
su geometría y color SKY. No usar los íconos SKY como primitives del host ni
cambiar artwork para resolver padding o tamaño de una tarjeta.

Buscar nombre/ID sin exigir tildes; seleccionar `kind` y canvas nativo con el
`FilterSelect` compartido del Lab v6. Se muestran 24 componentes iniciales,
**Mostrar más** agrega 24 y **Restablecer** vuelve a Outline /24 y query vacía.
Cada entidad ofrece descarga SVG, Figma, todas las variantes, procedencia y
selector copiable. Originales/alternativas y procedencia usan disclosures planos.
Si una combinación no existe, mostrar vacío: la sugerencia requiere pulsación
explícita, nunca sustituye silenciosamente. Sin JS permanecen visibles las 101
familias y sus 19 descargas mediante HTML; búsqueda, paginación y copia dependen
de la mejora cliente. Portapapeles denegado conserva selector visible para copia manual.

El builder valida identidad antes de copiar los 2.222 vectores y catálogo JSON
a `icons/sky-airline/`. Schema, paths propios, cobertura y hashes impiden mezcla;
una marca distinta no hereda la colección SKY. La página ausente para otra marca
ofrece estado propio vacío. No llevar canon privado, credenciales, fonts Metric
ni raw metadata al navegador. Build nuevo → snapshot por digest; no editar el site histórico.

## Incorporar un ícono a un KV productivo

Esta parte sigue pendiente para la biblioteca nueva. El maintainer debe:

1. Definir el papel semántico y seleccionar fuente, variante exacta y SHA.
2. Revisar geometría/color y escala en el contexto real del formato, incluida
   procedencia REST y los controles disponibles; no confundir canvas con tamaño de tinta.
3. Admitir recurso y placement en una revisión propia del pack/receta, mediante
   el proceso de revisiones y autoridad existente; preservar IDs/hashes/ownership.
4. Producir otra corrida y revisar PNG/QA/comparación y aprobación comercial.

No insertar SVG libre, path o URL en un job para saltar esa admisión; no ampliar
el activador de fuentes licenciadas, que tiene otro contrato. Consultar/descargar
no es crear un run, validar contraste, admitir al pack ni publicar GitHub Packages.

## Verificación y mantenimiento

Checks locales sin red, secretos ni proveedores, desde Workbench:

```bash
python3 brands/sky-airline/test/icon-library-test.py
node --test brands/sky-airline/test/icon-components.test.mjs
pnpm lab:typecheck
pnpm lab:check
pnpm lab:test
node gates/run-all.mjs
git diff --check
```

Los tests de componentes verifican combos exactos, homónimos, aislamiento y bytes
alterados. Los del Lab verifican cobertura, catálogo/SHA, filtro y rechazo de
identidad/path/coverage mezclados. Inspeccionar también desktop/móvil, teclado,
reset, vacío, descargas byte-idénticas y HTML sin JS; los tests no aprueban diseño.
Actualizar el manual/QA/status Workbench y [continuidad](state-continuity.md).
La reimportación o comparación nueva es mantenimiento autorizado: seguir el
manual Workbench, token en memoria/stdin y directorio privado nuevo; nunca token
en argumentos/logs/entorno ni reintentos para eludir cuotas. Una importación
parcial no se publica como completa. No sobrescribir canon ni candidatos previos.

## Corte local — 2026-10-01

Página revisada localmente sobre integración de PR17: snapshot
`97833101dac0cd43824982f2ffea9605dc01d12e78282f4ebc7955a462b0bfe2`,
2.537 archivos, cinco WOFF2 host OFL y cero fuentes licenciadas cliente. QA
Workbench registra TS7/Astro (51 archivos), 20 tests Lab, tres de componentes,
cuatro Python y cuatro gates PASS; desktop/móvil, descarga exacta y fallback
sin JS. Preview fechado `http://127.0.0.1:49732/iconos/` no es URL permanente.
Código/docs Workbench commiteados localmente en `af6f5e273249f8902c9bae8fb0334667b3cc23dc`
(rama `codex/workbench-docs-consolidation`). No acredita push, CI remoto,
merge, Vercel, dominio institucional ni admisión productiva. El despliegue v6
anterior documentado en [Lab](lab.md) no contiene por inferencia esta extensión.
