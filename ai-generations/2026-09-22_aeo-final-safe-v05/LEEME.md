# SEO+AEO · v05 · Finales por placement

**16 finales creativos: cuatro conceptos ×4:5/1:1/9:16/16:9.** Promoción autorizada por el operador tras corregir safe zones. No publicados ni pautados. Se preserva el histórico de Pilotos.

## Qué cambió

Los titulares9:16 de v04 empezaban al6,5% y su firma estaba al93,5%: chocaban con la interfaz fullscreen. En v05 el texto empieza al16,5%. Se editaron las cuatro fotos desde sus referencias4:5 para subir la escena y el lecho físico; la firma queda al63–63,3%, completa antes del65%. No hay scrim ni banda gráfica: el primer plano pertenece a la toma. La composición adapta escala y eje por escena, no traslada el bloque ciegamente. Los otros12 exports se conservan byte por byte.

El perfil conservador9:16 reserva16%arriba,35%abajo,8%izquierda y12%derecha. Protege texto, CTA, descriptor, cursor y firma. Los bordes de monitores/proyección pueden continuar fuera; la fuente seleccionada, la comparación de representaciones, Nexa, manos y gesto siguen reconocibles dentro. No hay captura live de Ads Manager: `out/qa-safe` es una máscara geométrica local y se identifica como tal.

## Contenido para continuar entre Claude y Codex

- `piezas.json`: copy literal, tamaños, familias, jerarquía, colores, CTA, eje horizontal, altura de firma y perfil seguro por imagen.
- `CONCEPTOS-Y-EMBUDO.md/.json`: territorio, idea, palanca, audiencia, estado de entrada, fase principal/secundaria, progreso esperado, hipótesis, CTA/destino y KPI. TOFU/MOFU/BOFU son uso propuesto, sin resultados medidos.
- `MATRIZ-FINALES.json`: estado, ratio, export, tamaño, hashes, perfil, QA, concepto/fase, prompts y limitaciones.
- `brief/`: fichas y prompts exactos compilados mediante `construirPrompt` de `scripts/foto/build-prompt.mjs`. Motor integrado image_gen, edición con referencia visible. Cadena y hashes en `PROVENANCE.json`; referencias necesarias en `plates/`, `referencias/` y origen-v04.
- `origen-v04/` y `origen-prompts-y-conceptos/`: antecedentes de las doce fotos conservadas y de las referencias4:5, incluidos conceptos y correcciones anteriores. Las carpetas de piloto retienen intentos descartados; no se promocionan como exports finales.
- `componer-cta.mjs`: extensión del compositor canónico y rendererAXIS. `firma-placement.mjs`: adaptación mínima del compositor de firma oficial, con altura por plan y aborto si contraste<4,5. `firmar.mjs`: firma, previews y contactos. `validar.mjs`: contraste mínimo; `validar-safe-zones.mjs`: envolvente gráfica completa y firma contra zona segura, máscaras de QA separadas.
- `dependencias.json` y snapshot: hashes del código/fonts requeridos. Fuentes licenciadas se consumen desde repo. `textos-alternativos.json`: textos para la superficie que los permita.

## Reproducir sin generar de nuevo

Desde la carpeta `02. Editables` del paquete Finales:

```sh
node recomponer.cjs --out /ruta/nueva --repo /Users/jreye/Documents/greenhouse-eo
```

El destino debe ser nuevo. Comprueba dependencias, compone16PNG, firma con el perfil de cada pieza y ejecuta contraste/safe zones. Los SVG de texto son paths: cambiar copy enJSON y regenerar. No cambiar sólo el PNG. Si cambia copy, posición, estilo, tinta, fuente o plate, ejecutar otra vez todo el QA.

Secuencia directa desde el repo (plan con rutas de plates válidas):

```sh
node ai-generations/2026-09-22_aeo-final-safe-v05/componer-cta.mjs <piezas.json>
node ai-generations/2026-09-22_aeo-final-safe-v05/firmar.mjs <piezas.json>
node ai-generations/2026-09-22_aeo-final-safe-v05/validar.mjs <piezas.json>
node ai-generations/2026-09-22_aeo-final-safe-v05/validar-safe-zones.mjs <piezas.json>
```

La firma se ejecuta una vez por render sin firma: recomponer primero, no firmar dos veces. Para regenerar una fotografía, cargar su ficha y referencia exacta, compilar con `pnpm foto:prompt <ficha.json>`, usar el prompt completo en un motor de edición con la referencia adjunta e inspeccionar manos, pantallas, identidad, lecho y safe areas. La IA no garantiza reproducción pixel a pixel; el compositor sobre plates archivados sí.

## QA y límites

`out/accesibilidad-cta.json`: CTA/descriptor≥4,5:1, contorno/controles≥3:1, contraste mínimo sin rescatar fallos mediante p98. `out/safe-zones.json`: bounds de toda la capa gráfica y firma,16/16. `out/qa-firma.txt`: SVGoficial20%lado corto y contraste real. `out/contacto-916-safe.png`: revisión de exclusión local. Revisión visual: 4verticales recompuestos y sus previews, comparados con referencia;12 restantes idénticos a v04. `REPRODUCCION-VERIFICADA.json`: resultado de la reconstrucción archivada.

Los límites del arnés fotográfico genérico de v04 permanecen en `origen-v04/LEEME.md`; no se promueve el catálogo fotográfico global1:1 ni se afirma que todos los fondos sirvan para cualquier texto. El QA valida estas composiciones específicas. Antes de tráfico: seleccionar placement/URL, revisar preview real y recortes/overlays (incluidos captions/disclaimers), validar tracking, derechos y configuración. No se inventó URL ni se subió a plataforma. LinkedIn9:16 sería fuente para video, no un PNGVideoAd terminado. El archivo16:9 es maestro horizontal; no se anuncia como1.91:1.
