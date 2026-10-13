# Pibank · Propuesta técnica SEO/AEO 2027 v10

07-10-2026 · El CEO la aprobó para presentar. No se ha enviado ni se movió a `01-Para-enviar`.

## Resultado vigente

- **Canvas Design (privado):** https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica». En esta sesión pasó de la **versión 47 a la 60**. Tiene **44 láminas** 16:9 en línea Engine `#0375db`.
- **PDF:** `ai-generations/2026-10-07_pibank-propuesta/out/Pibank-Propuesta-tecnica-SEO-AEO-2027.pdf` (10,8 MB). Hay una copia en OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`, carpeta creada el 2026-10-07.
- **Estilo:** el CEO lo aprobó como **alternativa canónica para propuestas técnicas SEO/AEO**. Los brochures y las propuestas de práctica siguen con las recetas de La órbita.
- **Intents, pipeline y estructura:** [README de `deck-propuesta/`](../../commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/README.md).
- **Método reutilizable:** [`propuesta-tecnica-seo-sin-presentador.md`](../../../.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md) (skill `deck-studio`).

## Cambios principales

- **Relato equilibrado SEO/AEO.** SEO y AEO valen por sí mismos y además conectan con el negocio. El relato ya no se centra solo en cuentas: el capítulo 3 pasa a «¿Cómo sabremos que funciona? (en visibilidad y en cuentas)».
- **Cadena búsqueda→cuenta.** Abre el capítulo 1 con cuatro eslabones: Aparecer → Ser elegido → Convencer → Abrir y fondear. Cada eslabón tiene su métrica, y el capítulo 2 ordena los cinco frentes según esos eslabones.
- **E-E-A-T en banca.** Lámina nueva en el capítulo 2, compuesta con `method-eeat`.
- **Lo que veremos moverse, en orden.** Lámina nueva en el capítulo 3.
- **Costo por cuenta.** US$317/158/79/40 para 250/500/1.000/2.000 cuentas, sobre la inversión de US$79.200 en ruta gradual. Se presentan como escenarios aritméticos, sin prometer volumen.
- **Láminas importadas en Engine.** Seis láminas del deck SEO/AEO aprobado (Todo junto, A la vista, BICECORP, Banco BICE, Cinco países y Berel) se llevaron a un solo acento con `teal2engine.cjs`, que corre los tonos turquesa 155–192° a 208°. El mismo script corrigió los realces turquesa de `method-eeat` y `content-day`.
- **Retiro del rango 39–195.** Era una sensibilidad parcial. Codex advirtió que no debe titularse como captación nueva.
- **Ciclo con íconos 3D nuevos.** Se generaron con GPT Image 2.5 Sunburst a pedido del operador. No son canon Plastilina.
- **Se retiró:** el copy adulador («proponemos que nos mida con esta vara»), los cursores y las selecciones sin sentido, y la lámina de riesgos que respondía objeciones que nadie planteó.

## Verificación

- Se renderizaron las 44 láminas y se revisó una hoja de contacto con todas.
- Lámina 26: desborde corregido.
- El PDF se armó con `render-pdf.mjs` (Playwright + pdf-lib), reemplazando cada `/_blob/<id>` por su archivo local. Los blobs se bajaron de a uno con Artifact `read` y `path`; con `paths` en lote falla.
- La selección colaborativa que `cover-proposal`, `content-team` y `content-clients` pintan siempre se borró después con `borrar-seleccion.mjs` y `quitar-seleccion-portada.mjs`. Queda pendiente corregirlo en la receta.

## Lecciones técnicas

- En `content-measure-formulas`, la tarjeta no crece con el texto. Una fórmula de tres líneas deja «Dueño · Efeonce» fuera de la tarjeta. Mantener las fórmulas en dos líneas y revisar al 100 %. El límite de unos 15 caracteres de la respuesta existe porque a 150 px el texto se desborda.
- `productMark` no es un campo del intent. El lockup de Insights se superpone después, en (140, 44) con 40 de alto.

## Pendiente: OK del CEO antes de enviar

1. Cifras y logos de BICECORP, Banco BICE y Berel en esta licitación. La decisión de usarlos «tal cual» en el deck SEO no se extiende aquí, y los logos dependen de TASK-1937.
2. Confirmar si el correo de Insights y el modo presentación que muestran «Tu día a día», «A la vista» y el reporte están operando.
3. Confirmar si aplica `pnpm tender:canonical-gate`.
4. Melkin está como quinto integrante de forma provisional, y la foto de cierre BR3f está por aprobar.

Esta sesión no hizo commit, push, envío ni publicación.
