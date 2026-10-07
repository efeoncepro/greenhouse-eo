# Nexa cine · Nano Banana 2.1 · 2026-10-06

Pedido del operador: probar el registro cinematográfico Efeonce con Nexa y Nano Banana 2.1, esfuerzo máximo.
Selección: `plates/NB21-NEXA-CINE-v2.png`, PNG nativo 5504 × 3072. Modelo confirmado
`gemini-nano-banana-2.1`, Google directo global, solicitud 4K, 16:9, thinking high, ocho referencias.
Estado: prueba interna `proof-only`; revisión APROBABLE, aceptación del operador pendiente. Sin publicación.

## Dirección y fuentes

Partida: receta NX7d aprobada, vista en AXIS junto a NX5b; se abrieron también las hojas aprobadas
julio-nexa-firmadas y set-curado-12, y las ocho referencias individuales del catálogo.
Nexa despliega su squad: núcleo azul/blanco visible, traje biónico por catálogo, contacto del Spark
con el hombro, tres planos y cinco agentes con tareas. Identidad frontal v2 primero, convicción después;
traje, macro de marca, lentes y dos Sparks del paquete oficial. Prompt construido por `pnpm foto:prompt`.
Cine-reviewer revisó antes y después. No se enviaron los plates aprobados como ancla de rostro.

Las tres imágenes de identidad superaban juntas el límite inline. Se crearon copias JPEG98 4:4:4
sin cambiar dimensiones, recortar ni retocar; las restantes conservaron sus bytes originales.
El [informe de evidencia](../../docs/audits/ai-tooling/2026-10-06-nexa-cine-nano-banana-2-1-vs-sunburst.md)
preserva fuentes, orden, dimensiones y hashes de entrada/transporte. Las copias locales de transporte son
privadas; la compresión JPEG es con pérdida, aunque conserva la geometría.

## Iteración y verificación

- V1: rostro, marca y traje sostenidos; Sparks lejanos demasiado nítidos y total no comprobable.
  Cine PASS (70,93 % sombra); lecho 2,27:1, insuficiente. Conservada como descarte.
- V2: nueva generación con mismas referencias y ficha corregida, sin editar V1. Cinco Sparks
  visibles, tres pequeños y desenfocados. Cara y emblema vistos en recortes a escala real.
  Cine PASS (67,11 % sombra); columna 0,46, lecho 5,32:1; cuatro de cuatro reservas medidas PASS.
  Veredicto cine-reviewer: APROBABLE. Reflejos en lentes, con ambas pupilas legibles.

No se aplicaron recorte, upscale, grade ni retoque al PNG. El ratio nativo es aproximado a 16:9.
La marca incrustada en el traje se contrastó con el macro; no se añadió otra firma encima.

Dos llamadas de generación. Componente visual nominal: USD 0,1512 sumado; entradas y razonamiento
adicionales, sin conciliación de factura. Cada sidecar conserva configuración y uso; `evidence.json`
registra hashes, dimensiones, modelo y latencia. No hubo cambio del CLI ni del default OpenAI.

## Comparación con Sunburst

Se inspeccionó la V2 frente al NX7d aprobado de `gpt-image-2.5-sunburst` (1792 × 1024). Para el cine de
Efeonce se prefirió NX7d por gesto, fenómeno de luz e integración de los Sparks; Nano sostuvo kits e identidad,
dio más resolución nativa y un lecho mejor medido. Es una lectura de estos dos plates: **no un A/B controlado**,
porque cambiaron prompt, referencias y expresión. No se infiere ventaja general, de latencia o coste.

El informe registra la comparación y sus límites; PASS técnico no sustituye la aprobación del operador.
Los plates Nano siguen como evidencia local: no se han registrado como receta aprobada ni se ha verificado
un archivo remoto de esta carpeta. Si falta una ruta, usar `ai-gen:where` y `ai-gen:pull`, sin regenerar.
