# Pibank · Intents del compositor de la propuesta técnica 2027

> **Estado:** v10 del 2026-10-07, OK del CEO para presentar. **No se ha enviado.** Hay cuatro puntos pendientes antes de enviar (ver al final).
> **Registro de la sesión:** [auditoría del 2026-10-07](../../../../../audits/commercial/2026-10-07-pibank-propuesta-tecnica-v10.md)
> **Método y reglas del estilo:** [`propuesta-tecnica-seo-sin-presentador.md`](../../../../../../.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md) (skill `deck-studio`)
> **Carpeta de producción:** [`ai-generations/2026-10-07_pibank-propuesta/`](../../../../../../ai-generations/2026-10-07_pibank-propuesta/LEEME.md)

## Qué es esta carpeta

Aquí están los intents JSON del compositor (`pnpm brand:compose`) que producen las láminas compuestas de la propuesta técnica SEO/AEO 2027 para Pibank, la marca digital de Banco Pichincha Perú. Es una licitación muy importante.

Esta carpeta guarda solo los intents. El generador, los scripts y las imágenes están en la carpeta de producción. Las imágenes y el PDF no se versionan en git.

## Estado v10

| Pieza | Dónde |
|---|---|
| Canvas Design (privado) | https://claude.ai/artifact/XpdEeKjFLWrCikqBEvnSfw, página «tecnica», versión 60 |
| Formato | 44 láminas 16:9, línea Engine `#0375db` |
| PDF final | `ai-generations/2026-10-07_pibank-propuesta/out/Pibank-Propuesta-tecnica-SEO-AEO-2027.pdf` (10,8 MB) |
| Copia | OneDrive `Alineación/4. Comercial/Licitaciones/Banco Pichincha/` (carpeta creada el 2026-10-07) |

No se movió nada a `01-Para-enviar` del caso (`~/Documents/Banco Pichincha Peru — Prospect Case/`).

El CEO aprobó este estilo como **alternativa canónica para propuestas técnicas SEO/AEO**. Los brochures y las propuestas de práctica siguen usando las recetas de La órbita.

## Estructura por capítulos

| Capítulo | Contenido |
|---|---|
| 1 · ¿Dónde está Pibank hoy en la búsqueda? | Cadena búsqueda→cuenta (Aparecer → Ser elegido → Convencer → Abrir y fondear, cada eslabón con su métrica), búsqueda real (0 de 301 resultados en 17 búsquedas, Google Perú 06-10-2026), demanda por grupos (18.300 productos rivales…) y diagnóstico técnico. |
| 2 · ¿Cómo se vuelve Pibank la respuesta? | Cinco frentes por eslabón, arquitectura, código, SEO técnico, contenido, herramientas, qué dice la IA, panel AEO (72/144 observaciones), E-E-A-T en banca (nueva), comunidad y PR, SEM y ciclo. |
| 3 · ¿Cómo sabremos que funciona? (en visibilidad y en cuentas) | Calendario; lo que veremos moverse, en orden (nueva); la meta del banco (15.200 cuentas con fondos, embudo de 1.169.231 visitas con tasas de prueba de 2 % y 65 %); convertir lo que ya llega (130→225 por 10.000 visitas; dos entregables del mes 1, incluido el escenario desde el lanzamiento que pidió Jesús); medición de negocio; métricas SEO/AEO («¿Cómo se mide la visibilidad? Cinco métricas») y reporte mensual con Insights. |
| 4 · ¿Quién lo hace y por qué nosotros? | Equipo («Expertos por área»), responsabilidades, tu día a día, a la vista, por qué Efeonce, clientes, casos BICECORP, Banco BICE y Berel, y cinco países. |
| 5 · ¿Cuánto cuesta y cómo seguimos? | Inversión de US$79.200 en ruta gradual (base de US$4.500/mes; integral de US$89.200), costo por cuenta (US$317/158/79/40 para 250/500/1.000/2.000 cuentas; escenarios aritméticos, sin prometer volumen) y siguiente paso. |
| Anexos y cierre | Supuestos y fuentes (incluye «Qué no se garantiza»), glosario y cierre. |

## Cómo se construye

Hay tres tipos de lámina:

1. **Láminas HTML con tokens.** Las arma `build-tecnica.py` con helpers propios: `page`, `eyebrow` (con el anillo de La órbita), `headline` (con la esfera), `means` (franja «Qué significa para Pibank»), `obj` y `halo_platform`. Los íconos Trazo y la navegación de capítulo vienen de AXIS (`axis-assets.mjs` → `axis-assets.json`).
2. **Láminas del compositor.** Se generan con `pnpm brand:compose` desde los intents de esta carpeta y entran al canvas como imagen subida (`/_blob/<id>`).
3. **Láminas importadas** del deck SEO/AEO aprobado (`ai-generations/2026-09-29_deck-seo-aeo-documentos/out/slides/completo/`): 19 «Todo junto» (tu día a día), 20 «A la vista», 25 BICECORP, 26 Banco BICE, 28 Cinco países y 29 Berel. Se llevaron a un solo acento con `teal2engine.cjs`, que corre los tonos turquesa (155–192°) a 208°. En los casos, la esfera y el anillo estaban en turquesa.

### Regenerar

Desde la raíz del repo:

```bash
python3 ai-generations/2026-10-07_pibank-propuesta/build-tecnica.py <carpeta project del canvas>
node ai-generations/2026-10-07_pibank-propuesta/paint-selection.mjs <carpeta project del canvas>
```

Después se publica la carpeta al canvas. Respaldos del generador: `build-tecnica-v3.py`, `-v4.py`, `-v4-papel.py`, `-v6.py` y `-v7.py`.

### PDF

1. Bajar los blobs del canvas con Artifact `read` y `path=<id>`, **de a uno**. Con `paths` en lote falla.
2. Renderizar (Playwright + pdf-lib; reemplaza cada `/_blob/<id>` por el archivo local):

```bash
node ai-generations/2026-10-07_pibank-propuesta/render-pdf.mjs <project> <carpeta de blobs> <salida.pdf>
```

## Archivos de esta carpeta y qué produce cada uno

Verificado con `ls` el 2026-10-07. Las recetas se leen dentro de cada archivo.

| Archivo | Recetas que contiene | Uso en la v10 |
|---|---|---|
| `pibank-tecnica-composer-document.json` | `cover-proposal` (orbit), `section-classic`, `method-surround-cycle`, `content-measure-formulas` (fórmulas de negocio), `content-team`, `decision-risk`, `close-proposal` | Portada, ciclo, fórmulas de negocio, equipo y cierre. La lámina de riesgos (`decision-risk`) se retiró por decisión del operador. |
| `pibank-v7-document.json` | `content-team`, `content-measure-formulas`, `decision-difference`, `content-clients` | Equipo, fórmulas, diferencia y clientes. |
| `pibank-v9-document.json` | `method-eeat`, `content-day` (live-results) | E-E-A-T en banca y reporte mensual con Insights. |
| `pibank-metricas-document.json` | `content-measure-formulas` (cinco métricas SEO/AEO), `content-day` (live-results) | Métricas SEO/AEO y reporte; por fecha de archivo, anterior a `pibank-metricas-seo-v8` y `pibank-v9`. |
| `pibank-metricas-seo-v8-document.json` | `content-measure-formulas` (Clics no-marca, Primera página, Presencia en IA, Exactitud en IA, Share of voice) | «¿Cómo se mide la visibilidad? Cinco métricas». |
| `pibank-fotos-document.json` | `section-split`, `proposal-cinematic` (layout service) ×3 | Láminas con foto de servicio. |
| `pibank-propuesta-document.json` | `cover-proposal`, `decision-ai-market`, `decision-ai-answer`, `content-bullets`, `decision-traffic-to-revenue`, `section-split`, `proposal-service` y otras | Versión anterior de la propuesta. No figura en el pipeline de la v10. |
| `plan.json` | Plan de láminas (`recipeId` + propósito) de esa versión anterior | No figura en el pipeline de la v10. |
| `pibank-riesgo-intent.json` | `decision-risk` | Lámina de riesgos retirada. No está en la v10. |
| `pibank-tecnica-marco-document.json` | `cover-proposal`, `close-proposal` | Marco de portada y cierre. No figura en el pipeline de la v10. |

### Láminas compuestas de la v10

- **Portada:** `cover-proposal`.
- **Ciclo:** `method-surround-cycle`. Los íconos 3D se generaron con GPT Image 2.5 Sunburst a pedido del operador. **No son canon Plastilina.**
- **Fórmulas:** `content-measure-formulas`, una de negocio y otra de SEO/AEO.
- **Equipo:** `content-team`.
- **Diferencia:** `decision-difference`.
- **Clientes:** `content-clients`.
- **E-E-A-T en banca:** `method-eeat`.
- **Reporte:** `content-day` con layout live-results. El lockup de Insights se superpone después.
- **Cierre:** `close-proposal` con la foto BR3f (portal Engine, espalda de chaqueta con logo + «Empower your Growth»).

### Ajustes después de componer

- `cover-proposal`, `content-team` y `content-clients` siempre pintan una selección colaborativa. `selection:false` no la apaga, `null` rompe y `"none"` es inválido. Por ahora se borra después con `borrar-seleccion.mjs` y `quitar-seleccion-portada.mjs`. Queda pendiente corregirlo en la receta.
- `method-eeat` y `content-day` pintan realces en el turquesa de la tinta de anillo, aunque la línea sea Engine. Se corrige con `teal2engine.cjs`.
- `productMark` (el lockup de submarca) no es un campo del intent. Se superpone después: Insights en (140, 44), con 40 de alto.
- En `content-measure-formulas`, la tarjeta no crece con el texto. Una fórmula de tres líneas deja «Dueño · Efeonce» fuera de la tarjeta, así que las fórmulas van en dos líneas y se revisan al 100 %. El límite de unos 15 caracteres de la respuesta existe porque a 150 px el texto se desborda.

## Decisiones del operador (CEO)

- El margen, los costos internos, las horas y los salarios nunca van en material de cliente.
- El relato es equilibrado: SEO y AEO valen por sí mismos y además conectan con el negocio. No se centra solo en cuentas.
- Se quitó el rango 39–195. Era una sensibilidad parcial y Codex advirtió que no se titule como captación nueva.
- Sin copy adulador (se rechazó «proponemos que nos mida con esta vara»), sin cursores ni selecciones absurdas y sin una lámina de riesgos que responde objeciones que nadie planteó.
- Para el ciclo prefirió íconos 3D nuevos premium (Sunburst).

## Pendiente antes de enviar (OK del CEO)

1. Cifras y logos de BICECORP, Banco BICE y Berel en esta licitación. La decisión de usarlos «tal cual» en el deck SEO no se extiende a esta licitación, y los logos dependen de TASK-1937.
2. Confirmar si el correo de Insights y el modo presentación que muestran «Tu día a día», «A la vista» y el reporte están operando.
3. Confirmar si aplica el gate `pnpm tender:canonical-gate`.
4. Melkin está como quinto integrante del equipo de forma provisional, y la foto de cierre BR3f está por aprobar.
