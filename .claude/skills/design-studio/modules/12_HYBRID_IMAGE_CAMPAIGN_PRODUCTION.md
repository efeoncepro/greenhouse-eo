# 12 · Hybrid Campaign Production — still, motion, digital y offline

> **Cárgalo cuando** una campaña use más de un modelo, especialmente Seedream 5 Lite/Pro + GPT Image 2 +
> Gemini Omni Flash, o cuando el pedido sea producir muchas piezas digitales, motion, print u OOH sin perder
> identidad y estándar visual. Capacidades y precios: **as-of 2026-07-18; reverificar**. Contrato canónico:
> `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`.

## Tesis

No elegir un modelo para toda la campaña. Elegir una **secuencia de manos por operación**:

```text
brand/channel contract → diverge → develop → anchor → organize → extend → animate → compose/post → prepress → release
```

El valor acumulado sólo sobrevive si cada relevo transporta un anchor, locks, un delta y criterios de aceptación. Una imagen sin contrato es una referencia ambigua.

## Topología estrella: el anchor es el centro

La campaña no es una cadena de archivos sino una **estrella gobernada**:

```text
                              1:1 digital
                                  ▲
                                  │
print proof ◀── approved anchor ──┼──▶ 4:5 / 9:16 / 16:9 / 3:1
                                  │
                                  ▼
                     clean motion plates → 15/10/6
                                  │
                                  └──▶ OOH proof
```

- Cada derivado directo declara el mismo `anchor_id` y `derivation_parent: anchor`.
- Una rama puede tener correcciones locales seriales, pero no contagia sus errores a las demás. Si una corrección
  cambia identidad, hook, paleta o geometría nuclear, una persona la promueve explícitamente a `anchor_revision`
  y los derivados afectados se recalculan desde ese nuevo centro.
- No usar `ratio-a → ratio-b → ratio-c`, ni motion frame → still master, como teléfono roto.
- `parent_asset` conserva lineage técnico; `anchor_id` conserva la decisión creativa. No son lo mismo.

## Router

| Etapa | Mano preferida | Responsabilidad |
|---|---|---|
| Diverge | Seedream 5 Lite | 8–16 territorios baratos; variar un eje por ruta |
| Develop | Seedream 5 Pro | Material, luz, color, atmósfera y fusión expresiva |
| Anchor | Humano + rúbrica KV | Aprobar identidad, hook, jerarquía y thumbnail |
| Organize | GPT Image 2 | Estructura, safe zones y disciplina compositiva |
| Extend | GPT Image 2 | Recomponer ratios desde el mismo anchor |
| Repair | Pro semántico o GPT + máscara | Art direction regional o cirugía protegida |
| Animate | Gemini Omni Flash vía Vertex (canary) | Convertir un clean plate en video corto y editarlo por conversación |
| Compose | Diseño determinístico | Tipo, marca, CTA, precio, legal y locale |
| Prepress | Humano + vendor spec | ICC, bleed, trim, sustrato y lectura OOH |
| Release | Humano + QA | Validar destino, provenance, peso, motion y sistema |

El router es un default del benchmark, no un ranking eterno. La operación manda; la campaña puede volver de GPT a Pro y regresar a GPT.

Cuando el problema central sea control compositivo y acabado de un set estático, cargar además
`13_LAYOUT_DESIGN_AND_FINISHING.md`. El flujo especializado inserta
`layout contract → clean ratio plate → finish → composición determinística → mastering` después del anchor.

## Dos ejes obligatorios

- `channelMode`: `digital-static | digital-motion | print | ooh`.
- `brandMode`: `branded | brand-light | editorial-neutral | client-brand`.

`offline` describe el canal; `off-branding` describe presencia de marca. No son sinónimos. Un plate neutral
no hereda automáticamente AXIS/Efeonce, pero conserva brief, rights y provenance. Una pieza de cliente usa sólo
su brand book. Logo, CTA, legal, captions y end card se añaden determinísticamente después de la generación.

## Gemini Omni Flash: relevo still → motion

- Es video, no otro generador de stills. Se consume **directo en Google Cloud/Vertex**, nunca mediante Fal.
  Modelo: `gemini-omni-flash-preview`, `global`.
- Contrato verificado: preview, 720p, máximo 10 s, 16:9/9:16, reference-to-video, edición y audio nativo.
  Es `canary`: no puede ser la única ruta de una entrega con SLA.
- Entregar un plate sin logo/copy, declarar `FIRST_FRAME`/referencia, cámara, acción, audio, locks y una sola
  transformación. En edición usar un delta simple + `Keep everything else the same`.
- Auditar primer/medio/último frame, anatomía temporal, clones, flicker, texto accidental, audio, poster frame
  y final abrupto. Copy, marca, captions, legal y loudness se cierran fuera del modelo.
- No diseñar alrededor de extensión/interpolación, múltiples videos o audio de referencia sin probar el
  endpoint exacto: el contrato oficial actual documenta limitaciones.
- La duración mínima usada para probar endpoint/codec/identidad se etiqueta `technical-probe` y queda fuera
  del release. Una campaña profesional entrega una familia temporal —master + cutdown por ratio, end card,
  poster y QA—; nunca promociona un smoke test de 3 s a pieza final.

## Rutas productivas still

### Seedream Lite → Seedream Pro → GPT

Usar cuando el hallazgo depende de riqueza visual:

1. Abrir territorios con Lite.
2. Desarrollar 2–3 con Pro.
3. Aprobar un anchor humano.
4. Entregarlo a GPT para organizar y recomponer formatos.
5. Usar máscara GPT si rostro, producto o packaging deben protegerse.
6. Componer copy y marca fuera del raster.

### GPT → Seedream Pro (→ GPT sólo si hace falta)

Usar cuando geometría o safe zones son el punto de partida:

1. Crear con GPT un plate estructural.
2. Pasarlo a Pro como `STRUCTURE`; sumar `MATERIAL`/`IMPACT` sólo si ayuda.
3. Aprobar la identidad híbrida.
4. Si Pro conserva estructura, safe zones y anatomía, puede cerrar como nuevo anchor híbrido; no añadir un pase
   GPT por ritual.
5. Volver a GPT sólo si Pro rompe crop, escala, geometría, identidad o espacio de copy.
6. Derivar todos los formatos desde el híbrido aprobado, en topología estrella.

## Familia still + motion + offline

| Salida | Parte generativa | Cierre determinístico | Gate específico |
|---|---|---|---|
| Digital static | plate directo por ratio desde el anchor | copy, logo, CTA, legal, resize/compresión | safe zone, peso, crop real, thumbnail |
| Motion 15/10/6 | clean shot 5–10 s desde plate aprobado | montaje, format wall, captions, end card, audio/post | identidad temporal, arco por duración, loudness, poster |
| Print | proof de alta resolución desde el anchor | tamaño físico, bleed, trim, 300 ppi, perfil del vendor | ICC/sustrato o etiqueta `proof-only` |
| OOH | fragmento semántico dominante del anchor | headline mínimo, firma, URL y archivo vendor | lectura a distancia/3 s, escala y contraste |

No miniaturizar el feed ad para print u OOH. El canal cambia jerarquía, densidad y entrega; no sólo píxeles.

## Router motion: Omni, Seedance 2.0 o post

- **Gemini Omni:** primera mano cuando un clean plate puede reinterpretarse en una microescena, se quiere un
  loop conversacional o una transformación localizada que realmente requiere píxeles nuevos. Su audio nativo
  es scratch hasta pasar escucha y mezcla.
- **Seedance 2.0 image/reference-to-video:** fallback para **una toma nueva**, un ángulo/acción inexistente o
  continuidad adicional donde set, sujeto, objeto y dirección del anchor deben mantenerse reconocibles.
- **Post determinístico:** timing, trim, orden de beats, freeze, crop, safe zones, copy/logo, captions, grade,
  foley, música, loudness y defectos editoriales. Seedance no es un reparador de edición.
- Si el defecto es anatomía/actuación/continuidad física que no existe en ningún frame, no se tapa con retime ni
  con un “edit” cosmético: se reabre `shot-production` y se produce una toma integral nueva con Omni, Seedance,
  filmación o 3D según el contrato de fidelidad.

Después de aprobar un clean shot de 5–10 s, construir una **familia editorial 15/10/6** desde ese mismo shot:
15 s = arco completo; 10 s = argumento condensado; 6 s = hook + prueba + resolución. No son trims ciegos.
Copy, logo y end card provienen de stills/assets oficiales; el audio se reedita y se vuelve a medir por duración.
Receta: `../../motion-design-studio/workflows/single-shot-to-deterministic-campaign-hero.md`.

## Contrato de relevo

```yaml
anchor_id: campaign-kv-v1
parent_asset: path-or-url
source_model: exact-model-id
source_request_id: "..."
stage: develop | organize | extend | repair | finish
topology:
  kind: star
  anchor_revision: 1
  derivation_parent: anchor
target_executor:
  model: exact-target-model-id
  endpoint: exact-target-endpoint
  stage: organize | extend | repair | finish
reference_roles:
  - index: 1
    role: IDENTITY
  - index: 2
    role: STRUCTURE
conflict_precedence: IDENTITY > MATERIAL; STRUCTURE > crop
locks:
  - approved identity and anatomy
  - palette and lighting logic
  - recurring campaign hook
delta: one principal change
safe_zones: explicit percentages and edge clearance
forbidden: text, logo, watermark, extra anatomy
output: size, ratio, format and quality
acceptance: anatomy + safe zone + thumbnail + destination crop
approval:
  anchor_owner: named-role
  release_approver: named-role
```

Reglas duras:

- Un pase = un delta principal.
- Restatar todos los locks; el modelo siguiente no conoce decisiones previas.
- Todos los derivados vuelven al anchor; evitar `v1 → v2 → v3` como teléfono roto.
- Una corrección local sólo se vuelve centro si el owner promueve una nueva `anchor_revision`.
- Asignar roles `STRUCTURE`, `IDENTITY`, `MATERIAL`, `IMPACT`, `ANATOMY`, `PALETTE`, `OFFICIAL_ASSET` o `ANTI-REFERENCE`.
- Declarar precedencia. No pedir genéricamente «combina» o «mejora».
- Registrar parent, modelo, endpoint, request ID, prompt, referencias ordenadas, máscara, tamaño, calidad, costo y latencia.
- Copiar `templates/model-handoff-contract.yaml` para cada relevo; no improvisar un schema distinto
  por modelo. Declarar quién puede aprobar o reabrir el anchor.

## Anchor gate

No escalar hasta que una persona apruebe:

- tesis visual y hook reconocible;
- identidad/silueta;
- jerarquía y copy field;
- paleta/atmósfera;
- lectura a 320 px;
- anatomía, producto o packaging;
- riesgo semántico de la metáfora.

Un anchor es una decisión; no simplemente el output con más detalle.

## Edición y formatos

- Usar Seedream Pro semantic edit para material, color y atmósfera sin preparar máscara. «Región» no equivale a layer editable ni preservación pixel-perfect.
- La edición por «regiones/capas» de Pro es lenguaje sobre un raster plano: nombrar región, delta y locks. No
  existe entrega de capas, máscara pública, PSD/SVG ni posibilidad de ocultar/reordenar layers después.
- Usar GPT Image 2 con máscara alfa cuando la deriva fuera de región tenga costo operativo. La máscara sigue siendo guidance, no hard matte.
- Recomponer cada ratio; no estirar ni recortar mecánicamente.
- Declarar posición del sujeto, features obligatorias visibles, margen a borde y porcentaje de copy-safe.
- Para formatos ultrabajos, diseñar un fragmento semántico del KV en vez de miniaturizar el master completo.
- GPT Image 2 sólo llega a 3:1. Banners más extremos se resuelven como composición externa por
  slot; registrar working raster, release size, resize, sharpening/compresión y peso final.
- Tratar texto generado como concept-only; release tipográfico y logos son determinísticos.
- Componer el release con la herramienta autoritativa del proyecto (Figma/Adobe/código/Sharp) y
  declararla en el manifest; no existe hoy un compositor universal de campañas en este repo.

## Gasto y paralelización

- Paralelizar sólo ramas independientes: rutas Lite o ratios derivados del mismo anchor.
- Ejecutar en serie los relevos dependientes.
- Medir costo por candidato aprobado y first-pass compliance, no sólo precio por imagen.
- Lite/low abre; medium prueba sistema; high cierra un anchor ya elegido.
- Si una iteración no mejora el scorecard o el próximo delta es determinístico, detener el loop.
- Nunca enviar el anuncio final compuesto a un modelo para “pulirlo”: el finish generativo recibe sólo el
  clean plate y copy/logo/legal permanecen bajo el compositor autoritativo.
- Para lotes: aprobar primero un mensaje en todos los formatos; luego revisar 100% del lote en
  contact sheet/thumbnail y ejecutar auditoría full-size al menos sobre un representante de cada
  mensaje y cada formato. Los checks técnicos de dimensiones, peso y naming son 100%.

## Benchmark de referencia

Laboratorio `hummingbird-high-frequency`, as-of 2026-07-18:

- Lite: cuatro 1792×2240 en 34,98–45,12 s cada una.
- Pro: ediciones 4:5 en 105,87–115,73 s.
- Pro 3:1: dos pases y 232,27 s hasta cumplir crop.
- GPT medium: 33,97–57,60 s; 3:1 correcto en un pase (~34 s).
- GPT + máscara produjo 32,6% menos deriva pixel-level protegida que el edit semántico Pro evaluado con la misma región.
- Ambos acertaron una frase española en un intento; no extrapolar a legales o localización masiva.
- Flujo GPT→Pro: anchor GPT high (~70 s) + finish Pro (128,86 s) conservó cuatro fases y safe
  zone con correlación de bordes 0,9212 y elevó croma medio 12,1%.
- Flujo Pro→GPT: Pro creó el look en 121,39 s; GPT high necesitó gates sucesivos porque el
  primer pase clonó cuerpos y otro sobrecorrigió escala. El final 3:1 llegó a 4,67/5 con 48%
  copy-safe. El routing correcto no sustituye la revisión entre pases.

Son datos de routing, no SLA ni ranking universal. Detalle técnico y fuentes en `../../greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md`.

## Anti-patrones

- torneo modelo contra modelo;
- prompt ómnibus;
- fusión sin roles;
- chaining sin anchor;
- Pro en todo por llamarse Pro;
- confundir semántica regional con capas;
- tratar máscara como frontera matemática;
- generar cada formato por crop;
- texto/logo/legal horneado en el release;
- auditar sólo full-size;
- inferir provenance por apariencia;
- optimizar métricas de píxel ignorando arte y significado.
- describir «fases temporales» sin fijar un solo cuerpo: repetir exclusivamente alas desde un
  hombro común y bloquear cabeza, torso y cola a una sola instancia;
- pedir cambios de escala aproximados sin cota: preferir límites duros (`no más de 5%`) y
  márgenes mínimos verificables.

## Gate de cierre

- [ ] El delta es el cambio dominante y los locks sobrevivieron.
- [ ] Identidad, anatomía/producto y hook coinciden con el anchor.
- [ ] Safe zone y features obligatorias pasan en el ratio real.
- [ ] Thumbnail y crop de destino conservan la tesis.
- [ ] No hay texto accidental, fake logo ni watermark.
- [ ] Manifest registra linaje, costo y latencia.
- [ ] Tipo, marca y legales de release son determinísticos.
- [ ] Cada asset declara `channelMode` y `brandMode`; off-branding no contamina cliente/Efeonce.
- [ ] Motion pasa identidad temporal, audio y poster; offline declara ICC/vendor spec o `proof-only`.
- [ ] El master y al menos dos derivados pasan la rúbrica KV.
- [ ] El lote declara owner de anchor, aprobación de arte, aprobación de release y autoridad de reapertura.
- [ ] La topología es estrella; cada derivado declara `anchor_id`, `anchor_revision` y parent técnico.
- [ ] La familia motion 15/10/6 nace del clean shot aprobado; audio/post y end cards se cierran por duración.
- [ ] Seedance sólo abrió una toma/acción/continuidad nueva; ningún defecto editorial se “reparó” regenerando.
