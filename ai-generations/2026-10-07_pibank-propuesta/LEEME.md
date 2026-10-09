# Pibank · Propuesta técnica SEO/AEO 2027 — carpeta de producción

Producción de la propuesta técnica para Pibank (Banco Pichincha Perú). Vigente: **v13 del 2026-10-09**, 49 láminas (lámina 36 «Stack de herramientas», receta content-stack, intent `pibank-stack-v13-document.json`)
16:9, línea Engine. La v13 responde los tres vacíos del correo de Jesús del 08-10: equipo híbrido (lámina 32: SEO, contenido y diseño en Perú; dirección de cuenta en Chile, compuesta con `pnpm brand:compose` desde `pibank-equipo-v13-document.json` y empalmada sobre la lámina aprobada con `equipo-v13/splice.mjs` para conservar logo y órbita Engine), leads (lámina 26: unas 1.500 solicitudes iniciadas con una tasa de prueba de 50 % hacia la apertura, rango 1.300 a 1.900; supuestos en la 45 y glosario en la 46) y la experiencia en banca en Perú, que se responde en el correo y no en el deck (banca en Chile + equipo local + la muestra X-Ray). Además: lámina 42 «US$4.500 al mes, más los módulos que construyen el plan» (valor de la base mensual + módulos con precio que se suman al plan, de la oferta híbrida §7) y lámina 43 nueva «Cómo empezar» (primer semestre M1–M6 US$42.500 con revisión en M3 y decisión en M6, luego trimestres US$19.100 / 17.600; compromiso inicial de 6 meses —tres meses se descartó por irresponsable: el programa no se ejecuta en un trimestre—, renovación trimestral con aviso de 30 días, base sin recargo — decisión del operador 09-10). La oferta económica `oferta-hibrida/OFERTA-PARA-PIBANK.md` §8 todavía dice «durante doce meses»: alinearla. La v12 sumó la lámina 20, «Muestra X-Ray» (mockup dibujado; la clave y el QR se leen de `09-XRay-Pibank/`, fuera de git); v10, v11 y v12 se conservan (`build-tecnica-v12.py`). Aprobada por el CEO para presentar y como **estilo alternativo canónico** para propuestas técnicas SEO/AEO
(los brochures siguen con las recetas de La órbita).

- Canvas Design (privado): https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica».
- PDF vigente: `out/Pibank-Propuesta-tecnica-SEO-AEO-2027-v13.pdf` (copia en OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/`, junto a la v10, la v11 y la v12). `render-pdf.mjs` copia los enlaces externos de cada lámina como zonas clicables.
- Método y reglas: `.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md`.
- Intents del compositor: `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/`.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `build-tecnica.py` | Generador de las láminas `Tec-NN.dc.html` y del índice del canvas. Versiones anteriores: `build-tecnica-v3/v4/v4-papel/v6/v7/v10.py`. |
| `axis-assets.mjs` → `axis-assets.json` | Navegación de capítulo, medida e íconos Trazo desde AXIS. |
| `paint-selection.mjs` | Pinta la selección colaborativa canónica sobre el elemento marcado con `data-gl-sel`. |
| `borrar-seleccion.mjs`, `quitar-seleccion-portada.mjs` | Quitan la selección que algunas recetas pintan siempre (portada, equipo, clientes). |
| `logo-en-centro.mjs` | Reemplaza la palabra «Pibank» por el logo en una lámina compuesta. |
| `teal2engine.cjs` | Lleva el turquesa de una imagen al acento Engine (láminas importadas, E-E-A-T, reporte). Revisar fotos al 100 %. |
| `render-pdf.mjs` | Renderiza las láminas con las imágenes locales y arma el PDF 16:9. |
| `fichas/`, `prompts/` | Foto de cierre BR3f (portal Engine), aprobada el 09-10. BR3e descartada. |
| `equipo/por-asignar.png` | Ficha neutra para un rol por asignar en `content-team` (exige cinco fichas). Fuera de git. |
| `logos-terceros/FUENTES.md` | Procedencia de los logos de bancos peruanos. |

Las imágenes (plates, composiciones, íconos 3D del ciclo, PDF) quedan fuera de git.

## Regenerar

```bash
python3 ai-generations/2026-10-07_pibank-propuesta/build-tecnica.py <carpeta project del canvas>
node ai-generations/2026-10-07_pibank-propuesta/paint-selection.mjs <carpeta project del canvas>
```

Después se publica la carpeta al canvas. Para el PDF, se bajan los `/_blob/<id>` del canvas (Artifact read con `path`
de a uno) y se corre `render-pdf.mjs <project> <carpeta de blobs> <salida.pdf>` desde la raíz del repo.

## Pendiente antes de enviar (OK del CEO)

1. ~~Si aplica `pnpm tender:canonical-gate`~~: no aplica (09-10). El gate evalúa sólo `docs/commercial/tenders/<slug>/`
   y esta propuesta es un prospecto (`docs/commercial/prospects/`), no una licitación formal.
2. ~~Foto de cierre BR3f por aprobar~~: aprobada por el CEO el 09-10 porque lleva el logo completo en la espalda. BR3e
   queda descartada (sólo emblema, ilegible); no se usa en ninguna versión.
3. ~~Definición de «inicio de solicitud»~~: resuelto el 09-10 en el glosario (lámina 46, «Solicitud iniciada»; evento a
   acordar con Analítica de Pibank en M1, sin tasa asignada). La lámina 29 es una receta de cinco tarjetas y no cambia.

Resuelto el 08-10: casos internacionales validados por Julio; equipo con nombres confirmados y diseño visual por
asignar; Insights y modo presentación operando.
