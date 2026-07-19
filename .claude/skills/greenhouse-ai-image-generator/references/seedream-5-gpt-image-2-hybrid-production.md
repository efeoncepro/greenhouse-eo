# Seedream 5 + GPT Image 2 — producción híbrida de campañas

> Cuando el still continúe a Gemini Omni o la campaña incluya print/OOH y modos branded/brand-light/neutral/
> client-brand, cargar además `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`. Este archivo
> gobierna el tramo still; el documento operativo gobierna la bifurcación still→motion y el release multi-canal.

> **As-of:** 2026-07-18. Las capacidades, schemas y precios son volátiles: verificar las páginas oficiales antes de presupuestar o convertir límites en contrato.

## Propósito

Usar este documento cuando una campaña combine Seedream 5 Lite/Pro en fal.ai con GPT Image 2. La unidad de producción es un **linaje de assets con relevos**, no un torneo entre modelos.

## Router por operación

| Operación | Primera opción | Motivo observado |
|---|---|---|
| Abrir 8–16 territorios | Seedream 5 Lite | Divergencia material económica y paralelizable |
| Elevar color, material, luz o atmósfera | Seedream 5 Pro | Mayor riqueza expresiva en el laboratorio 2026-07-18 |
| Fusión multirreferencia orientada a material | Seedream 5 Pro | Retuvo mejor carácter e impacto |
| Organizar una fusión o imponer safe zones | GPT Image 2 | Mayor cumplimiento de layout a primer intento |
| Derivar 1:1, 4:5, 9:16, 16:9 y 3:1 | GPT Image 2 | Mejor recomposición de formatos extremos observada |
| Cambio regional exploratorio sin máscara | Seedream 5 Pro Edit | Buena localidad semántica sin preparar matte |
| Proteger rostro, producto o packaging | GPT Image 2 Edit + máscara alfa | Menor deriva medida fuera de la región |
| Mockup con headline | Cualquiera, concept-only | Ambos acertaron una frase española en el benchmark |
| Copy, logo, CTA, precio o legal de release | Composición determinística | Exactitud, accesibilidad y localización |

El router es un default informado, no una ley. Revisar cada salida contra el brief.

## Contratos confirmados

### Seedream 5 Lite en fal.ai

Endpoints:

- `bytedance/seedream/v5/lite/text-to-image`
- `bytedance/seedream/v5/lite/edit`

Hechos operativos:

- `prompt` requerido; `image_size` acepta preset o `{ width, height }`.
- Edit acepta hasta 10 `image_urls`; al excederlas conserva las últimas diez.
- Devuelve raster `images[]` y `seed`.
- Precio publicado: USD 0,035 por imagen.
- Existe drift entre la ficha comercial y el schema sobre la resolución máxima. Tratar el límite como volátil y ejecutar contract test.
- El laboratorio verificó `1792×2240`.
- El endpoint observado devuelve seed pero no documenta un seed de entrada: no prometer reproducción determinística.

Fuentes:

- https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image/api
- https://fal.ai/models/bytedance/seedream/v5/lite/edit/api

### Seedream 5 Pro en fal.ai

Endpoints:

- `bytedance/seedream/v5/pro/text-to-image`
- `bytedance/seedream/v5/pro/edit`

Hechos operativos:

- Área documentada entre el equivalente a `1024×1024` y `2048×2048`; relaciones entre `1:16` y `16:1`.
- `output_format`: `jpeg | png`; default `jpeg`.
- Edit acepta hasta 10 referencias.
- Primera referencia sin recargo; referencias adicionales: USD 0,0045 cada una.
- Precio publicado: USD 0,0675 por output hasta el área de `1536×1536`; USD 0,135 hasta `2048×2048`.
- Pro Edit entiende regiones/elementos por lenguaje, pero el API público no expone máscara, caja, polígono, layers editables ni salida PSD/SVG.
- «Región/capa» significa comprensión semántica de un raster; no significa entregable por capas.

Fuentes:

- https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image
- https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api
- https://fal.ai/models/bytedance/seedream/v5/pro/edit
- https://fal.ai/models/bytedance/seedream/v5/pro/edit/api

### Transferencia de archivos a fal

- Usar URL alojada o storage de fal para inputs locales.
- Un data URI grande de una imagen GPT falló con `fetch failed` en el recorrido real; no usarlo como ruta primaria aunque el schema lo admita.
- Preferir el upload temporal de fal CDN: iniciar en
  `https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3`, enviar
  `X-Fal-Object-Lifecycle` con `expiration_duration_seconds`, hacer PUT al `upload_url` y pasar el
  `file_url` HTTPS al modelo. No persistir esa URL de input en el manifest.
- Una URL firmada temporal de GCS es alternativa válida si la identidad firmante tiene
  `iam.serviceAccounts.signBlob`; si falla, borrar el objeto exacto y no ampliar IAM ni volverlo público por conveniencia.
- No volver público permanentemente un bucket u objeto sólo para alimentar el modelo.
- Usar `src/lib/ai/fal.ts`; respetar los `status_url` y `response_url` devueltos por la cola. Nunca reconstruir polling URLs desde un slug con subruta.

### GPT Image 2

Modelo y APIs:

- Modelo: `gpt-image-2`; snapshot publicado `gpt-image-2-2026-04-21`.
- Image API: `/v1/images/generations` y `/v1/images/edits`.
- Responses API: herramienta `image_generation` para recorridos conversacionales/multiturno.

Hechos operativos:

- `quality`: `low | medium | high | auto`.
- Ambos ejes deben ser múltiplos de 16; lado máximo 3840; ratio máximo 3:1; área entre 655.360 y 8.294.400 píxeles.
- Outputs sobre 3.686.400 píxeles se documentan como experimentales.
- Formatos: PNG, JPEG y WebP. GPT Image 2 no entrega transparencia.
- Todas las referencias se procesan a alta fidelidad; no enviar `input_fidelity` para este modelo.
- Edit soporta máscara alfa: misma dimensión/formato que la primera imagen y menos de 50 MB. Con múltiples referencias, la máscara aplica a la primera.
- La máscara es guidance generativa, no un hard matte pixel-perfect.

Fuentes:

- https://developers.openai.com/api/docs/models/gpt-image-2
- https://developers.openai.com/api/docs/guides/image-generation
- https://openai.com/api/pricing/

## Flujo canónico

```text
diverge → develop → anchor → organize → extend → repair → compose → release
```

1. **Diverge:** producir rutas baratas e independientes; variar un eje por ruta.
2. **Develop:** elevar 2–3 seleccionadas con Pro; no llevar todo a alta.
3. **Anchor:** aprobación humana de identidad, silueta, jerarquía y thumbnail.
4. **Organize:** usar GPT si el hallazgo expresivo necesita arquitectura o safe zones.
5. **Extend:** derivar cada ratio desde el anchor, no desde otro derivado.
6. **Repair:** Pro semántico para art direction regional; GPT + máscara para protección operativa.
7. **Compose:** aplicar tipo, logo, CTA y legales determinísticamente.
8. **Release:** validar formato, safe zones, color, peso, provenance y destino.

### Topología estrella y revisión del anchor

El `anchor_id` aprobado es el centro de una estrella: 1:1, 4:5, 9:16, 16:9, 3:1, clean motion
plates, print proofs y OOH proofs salen directamente de él. `parent_asset` registra la dependencia
técnica, pero no convierte automáticamente una corrección local en nueva verdad creativa.

- Declarar `topology.kind: star`, `anchor_revision` y `derivation_parent` en cada manifest/handoff.
- Una rama puede encadenar reparaciones locales hasta pasar su gate; las otras ramas no parten de ella.
- Si una reparación cambia identidad, hook, paleta o geometría nuclear, el owner debe promoverla de forma
  explícita a una nueva `anchor_revision` y regenerar sólo los derivados afectados.
- Nunca derivar todos los ratios desde el último archivo disponible ni usar un frame de motion como master still.

### Seedream Lite → Seedream Pro → GPT

Usar cuando la campaña nace de material, atmósfera o gesto visual:

1. Lite abre medios/cámaras.
2. Pro desarrolla la selección.
3. Aprobar un anchor.
4. GPT recompone y sistematiza.
5. GPT deriva ratios desde el mismo anchor.
6. GPT + máscara repara áreas protegidas.
7. Composición determinística libera masters.

### GPT → Seedream Pro (→ GPT opcional)

Usar cuando geometría, producto o safe zones mandan desde el inicio:

1. GPT crea un plate estructural.
2. Pro recibe ese plate como `STRUCTURE` y otra referencia como `MATERIAL`/`IMPACT` si aplica.
3. Aprobar la identidad híbrida.
4. Si Pro conserva estructura, anatomía y safe zone, aprobar ese finish como anchor híbrido sin un pase
   adicional por rutina.
5. Volver a GPT sólo si Pro rompe crop, geometría, identidad o safe zone.
6. Componer texto y marca fuera del raster generativo y derivar formatos en topología estrella.

## Contrato de relevo

Transportar imagen **más estado explícito**:

```yaml
anchor_id: campaign-kv-v1
parent_asset: path-or-url
source_model: bytedance/seedream/v5/pro/edit
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
  - subject identity and anatomy
  - approved palette and lighting logic
  - recurring campaign hook
delta: recompose to 3:1 with complete subject and 45% left copy field
safe_zones: left 45%; 6% edge clearance
forbidden: text, logo, extra anatomy, watermark
output: 3072x1024 png
acceptance: anatomy + safe zone + 320px thumbnail
approval:
  anchor_owner: named-role
  release_approver: named-role
```

Reglas:

- Un pase debe tener un delta principal.
- Restatar locks en cada salto.
- Usar el mismo anchor para todos los derivados.
- No encadenar derivados como teléfono roto.
- Una corrección local no cambia el anchor sin aprobación y nueva `anchor_revision`.
- Asignar roles `STRUCTURE`, `IDENTITY`, `MATERIAL`, `IMPACT`, `ANATOMY`, `PALETTE`, `OFFICIAL_ASSET` o `ANTI-REFERENCE`.
- Declarar precedencia cuando dos referencias entren en conflicto.
- Registrar modelo, endpoint, request ID, prompt, referencias ordenadas, máscara, tamaño, calidad, latencia, tokens/costo, parent y pricing as-of.
- Usar `design-studio/templates/model-handoff-contract.yaml` como schema reusable y declarar
  target executor, owner del anchor y autoridad de release/reapertura.

## Edición y localidad

### Seedream Pro semantic region

- Nombrar objeto/región y atributo que cambia.
- Escribir `LOCK EVERYTHING ELSE` y enumerar identidad, crop, luz, fondo y safe zones.
- Usar para color, material y atmósfera.
- Comparar fuera de región; no asumir layer ni preservación bit-perfect.
- «Regiones/capas» describe comprensión semántica sobre un único raster aplanado. Pro no devuelve
  masks, layer IDs, PSD/SVG ni controles posteriores para ocultar, reordenar o editar capas por separado.

### GPT Image 2 mask

- Crear PNG con alpha real: transparente = editable; opaco = protegido.
- Verificar canal alfa, dimensiones y formato antes del request.
- Describir semánticamente la región además de suministrar la máscara.
- Medir/revisar deriva fuera de región.

Benchmark 2026-07-18 sobre la misma fuente/región:

| Método | MAE normalizado protegido | MAE editable |
|---|---:|---:|
| Seedream Pro semántico, sin máscara | 0,0458 | 0,1445 |
| GPT Image 2, máscara alfa | **0,0308** | 0,1376 |

GPT mostró 32,6% menos deriva pixel-level protegida. La revisión visual sigue siendo obligatoria.

## Formatos y texto

- Recomponer cada ratio desde el anchor; nunca estirar ni depender de crop mecánico.
- Declarar posición, features obligatorias visibles, margen, porcentaje de copy field y máximo/mínimo de elementos repetidos.
- Revisar a 320 px, con crop/plataforma real.
- GPT Image 2 llega hasta 3:1; formatos más extremos requieren composición deliberada externa.
- Texto generado sirve para concept review. Copy, logo, legal, precio y localización final se componen de manera determinística.
- Si se prueba texto: literal entre comillas, una aparición, acentos/puntuación explícitos y `no other words`.

## Salidas de campaña y frontera de esta referencia

| Destino | Qué deriva desde el anchor | Qué nunca debe hornearse en el raster generativo |
|---|---|---|
| Digital static | plate directo por ratio, con safe zone | copy, logo, CTA, precio, legal y locale |
| Digital motion | clean plate 9:16/16:9 para un shot aprobado | captions, end card, loudness y mezcla final |
| Print | proof visual de alta resolución | bleed/trim/ICC no confirmado por vendor |
| OOH | fragmento semántico dominante, no un feed ad miniaturizado | headline/firma/URL finales |

Cuando el clean shot continúe a la familia 15/10/6, delegar el montaje y router Omni/Seedance a
`../../motion-design-studio/workflows/single-shot-to-deterministic-campaign-hero.md`. Seedance 2.0 se reserva
para una toma, acción, ángulo o continuidad nuevos que deban conservar el mundo; timing, crop, texto/logo,
grade, foley, mezcla y otros defectos editoriales pertenecen a post determinístico.

## Benchmark observado

Resultados del laboratorio `hummingbird-high-frequency`:

- Lite, cuatro outputs 1792×2240: 34,98–45,12 s; lote publicado estimado USD 0,14.
- Pro, ediciones 4:5: 105,87–115,73 s.
- Pro, banner 3:1: 110,39 s primer pase con crop incorrecto + 121,88 s corrección; 232,27 s total.
- GPT medium: 33,97–57,60 s por job; seis jobs registrados ~USD 0,3892 con tarifa estándar publicada.
- GPT resolvió el 3:1 equivalente en un pase (~34 s).
- Ambos escribieron una vez `Alta frecuencia. Alto estándar.` correctamente; no generalizar ese éxito a legales o sistemas tipográficos.
- Flujo GPT→Seedream Pro: anchor GPT high (~70 s) y finish Pro (128,86 s); correlación de
  bordes 0,9212, cuatro fases/safe zone preservadas y croma medio +12,1%.
- Flujo Seedream Pro→GPT: Pro creó el look source en 121,39 s. GPT high requirió cuatro pases
  registrados: el primero clonó cuerpos, el segundo corrigió anatomía, el tercero redujo escala
  demasiado y el cuarto cerró 3:1 a 4,67/5 con 48% copy-safe.

Usar estos datos para routing y presupuesto exploratorio, no como SLA.

## Anti-patrones

1. Convertir el ejercicio en torneo uno contra uno.
2. Cambiar anatomía, crop, material, texto y luz en un mismo pase.
3. Pedir «combina estas imágenes» sin roles ni precedencia.
4. Anclar cada derivado a la última generación.
5. Confundir edición semántica con PSD/layers.
6. Confiar en máscara como frontera matemática.
7. Derivar por crop ciego.
8. Usar Pro para territorios que aún serán descartados.
9. Generar todas las rutas en high/4K.
10. Hornear copy, logo o legales en el raster final.
11. Usar data URI grande como puente fal principal.
12. Inferir modelo por apariencia en vez de response/manifest.
13. Auditar sólo full-size y no thumbnail.
14. Optimizar sólo MAE y olvidar arte, jerarquía o identidad.
15. Describir fases temporales sin declarar que sólo se repiten alas desde un hombro común; fijar
    cabeza, torso y cola a exactamente una instancia.
16. Usar porcentajes aproximados para escala; preferir cotas duras y márgenes mínimos.
17. Construir una cadena de ratios o promover una reparación local a anchor sin aprobación.
18. Enviar un defecto de edición a Seedance: sólo usarlo si de verdad falta una toma/acción/continuidad.

## Gate de aceptación

No avanzar una pieza híbrida si falla cualquiera de estos puntos:

- identidad contra anchor;
- delta solicitado como cambio dominante;
- anatomía/producto/packaging preservados;
- safe zone y features obligatorias cumplidas;
- ausencia de texto accidental, fake logos y watermarks;
- metáfora legible a thumbnail;
- manifest con parent/model/endpoint/referencias;
- costo y latencia registrados para requests API;
- separación entre visual generativo y tipo/marca/legal determinísticos;
- topología estrella y `anchor_revision` explícitas;
- print/OOH en estado `proof-only` hasta disponer de vendor spec/ICC;
- si hay motion, familia 15/10/6 desde clean shot aprobado con audio/post por duración.
