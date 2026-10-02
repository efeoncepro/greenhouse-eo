# Componentes autónomos y tokens de propiedades SKY

Fuente activa: checkout de **Creative Workbench**, no motores/CLIs de Greenhouse.
Canon: `docs/architecture/workbench-sky-autonomous-components.md`,
`docs/manual/autonomous-components.md` y `docs/documentation/autonomous-components.md` allí.
Leerlos antes de modificar el contrato. La skill aplica igualmente a Codex y Claude.

## Contrato ejecutable

`brands/sky-airline/components/autonomous-scene.mjs` compila una representación modular desde
bytes de template/catálogo sellados y una escena efectiva derivada por reparaciones admitidas.
Cada nodo tiene una instancia única con placement, padre, hijos ordenados, clip/mask/filter/blend
deps, definición por SHA y slots. Definiciones referencian tokens tipados y assets; la receta
reconstruye exactamente el árbol. Las recetas semánticas tienen nombre, familia, variante,
miembros y campos; sus miembros pueden solaparse. No concatenar fragmentos de zonas.

Propiedades como color, transform, bounds, size, radii, paints, visibilidad, efectos y tipografía
se deduplican por valor **exacto y tipado**. Provenance conserva nodo/propiedad/template. Copy,
glyph outlines, trazados e imagen/descriptores son assets, no tokens de estilo. No redondear
floats, adivinar fuentes ni tratar un cuadrado plenamente redondeado como círculo sintético.

`figma-property-bindings.mjs` sólo reconoce ID propio/propiedad/valor original exactos. Inventario:
108 tokens; 20 usados directamente en las fuentes; 4.996 fills/strokes originales con evidencia
admitida. Las reparaciones que cambian un valor retiran ese binding. Variables externas, typo/
spacing/radii sin evidencia y pinturas discrepantes 4471/4495 permanecen explícitas; nunca
resolver por hex, email, semejanza visual o alias semántico inventado.

## Operación del agente

1. Declarar SKY, pack exacto y pieza propia. `marca:recetas sky` devuelve composiciones nombradas
   con varias adaptaciones. No usar recursos host Efeonce dentro de la pieza.
2. `marca:componentes sky <formato>` consulta nombres, instancias, familias/recetas, slots y deps.
   Con ID completo adicional resuelve definición, tokens y assets de ese elemento.
3. `marca:descomponer sky <formato> --out <directorio absoluto nuevo>` guarda snapshot privado
   y manifest. No Git/npm. Padre existente, fuera de checkout/canon/cache; permisos 700/600.
   Export necesita Python3 con openat; inspección sólo Node. Writer fijo sellado, sin shell ni
   código desde jobs; preflight antes de crear directorio. No sobrescribir salida parcial.
4. `marca:recomponer sky <formato> --snapshot <library.json absoluto> --out <nuevo>` compara
   snapshot completo con compilación fresca. No acepta JSON editado, fuente vieja ni otro runtime.
   Una copia con SHA recalculado no se auto-admite.
5. `marca:extraer sky <formato> <ID> --mode with-dependencies --out <nuevo>` conserva viewport
   nativo, transforms, clips y masks. Máscaras, Multiply y efectos con fondo exigen in-context.
   La vista contextual conserva toda la pieza y registra selección. SVG derivado no es input
   libre de geometría para otro job.
6. Para contenido/campaña **nuevos**, usar planes de `marca:recetas`/`marca:adaptaciones`, declarar
   todos los campos y foto propia explícita, y `marca:disenar`/`marca:lote`. Snapshots/previews
   históricos no equivalen a producir una campaña. Otra estructura requiere receta de maintainer.

## Producción y verificación

`render-design.mjs` prepara recetas admitidas → compila/recompone escena modular → aplica copy
y foto propios → renderiza → mide. Plan y QA exponen `modularity`, source/recipe/SHA, conteos,
coverage y roundtripExact. Todos los módulos nuevos están en el digest del adapter; batch sella
su cierre transitivo. Cambiar engine implica nuevo UUID/preparación; outputs viejos inmutables.

La biblioteca serializable está definida **antes** de copy/foto. Buffers/typed arrays de imágenes
posteriores se rechazan con mensaje explícito: no reclamar descomposición post-foto binaria.
La producción sí aplica fotos nuevas después de reconstruir, con slot/provenance/brand guards.

Pruebas: 126 efectivos/11.096 capas/1.196 campos/24 masks/445 ocultos, serialización exacta;
referencias Figma independientes; tamper, marca/versión/canvas/capas/sellos; extracción con clips
y máscara OUTLINE/Multiply. Prueba pública debe hacer exactamente SKIP en casos licenciados,
nunca return temprano. Revisar PNG final: logo, contorno continuo, círculos, CTA, textos y legal.

Paquete local candidato `sky-creative-contracts@0.2.0`: exports components/property-tokens/
property-bindings, dependencias tokens/assets 0.1.0 y contrato legacy 0.1.0 conservado. No alterar
pack/catálogo/bundle/font/photo por ese versionado ni afirmar publicación porque pasa build.
Consultar `state-continuity.md` y HARNESS_STATUS; rollout, commits y previews son estados separados.

## Reproducibilidad de bindings

`node tools/sky-property-bindings-reproduce.mjs --rest-source <source.json REST absoluto> --out <directorio absoluto nuevo>`
reconstruye el inventario desde las fuentes selladas. Exige IDs/cadena de padres/valores
originales, cobertura 126/11.096/4.996 y checksum `baf03760c92d7d938c3f443c4edf2336c405b593a1f4daba0766b7f5116631db`.
Verifica byte a byte los tres módulos vigentes antes de escribir candidatos con el writer
privado. No activa ni usa proveedores. Otra fuente exige revisión y admisión versionada;
no relajar el sello para que un Figma nuevo pase como la fuente anterior.
