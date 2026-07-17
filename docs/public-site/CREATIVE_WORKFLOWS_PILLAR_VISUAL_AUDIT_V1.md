# Creative Workflows Pillar: auditoría visual V1

> **Fecha:** 2026-07-15.
> **Veredicto:** `PASS VISUAL / PASS MEDIA / PASS SPEC / PASS WORDPRESS / PASS LIVE RENDER`.
> **Sistema:** [Visual System V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md).
> **Spec integrada:** [GutenbergArticleSpec V5](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json).
> **Manifest:** `ai-generations/2026-07-15_creative-workflows-pillar/manifest.json`.

## 1. Alcance

Esta auditoría verifica las cuatro imágenes conceptuales originales y los dos diagramas explicativos V5:

- explican una idea específica del artículo;
- comparten un sistema visual reconocible;
- no simulan evidencia científica, producto real ni casos de clientes;
- las imágenes GPT son legibles sin texto interno y los diagramas usan tipografía determinista;
- cumplen integridad básica de anatomía, objetos, logos y artefactos;
- tienen derivados web, metadata accesible e IDs reales de WordPress;
- se integran en bloques Gutenberg soportados por Content Factory.

El cierre live verificó el tema Ohio en desktop `1440×1000` y mobile `390×844`. El post `251363` está publicado,
responde `200`, no presenta overflow horizontal y carga las cinco imágenes de cuerpo sin errores. El veredicto
actual corresponde a los diagramas V3; el `PASS` previo de V2 fue invalidado por la revisión humana descrita en
la sección 4.

## 2. Sistema evaluado

El concepto `La señal seleccionada` usa cuatro invariantes: campo cobalto, diagonal lima, círculo coral y figura
de alto contraste. El motivo no pretende funcionar como identidad de campaña; sirve para seguir una decisión a
través de abundancia, estructura, producción y aprendizaje.

La dirección de arte combina fotografía documental y collage editorial táctil. Se excluyeron los códigos
visuales que suelen volver genérica la representación de IA: robots, cerebros luminosos, código flotante,
dashboards ficticios, neón y metáforas industriales de sustitución humana.

## 3. Matriz de auditoría

| Asset | Concepto | Composición | Continuidad | Integridad | Uso editorial | Veredicto |
|---|---|---|---|---|---|---|
| `CW-V01` Hero | La tensión abundancia/decisión se entiende de inmediato | La pieza elegida domina el centro y sobrevive al crop OG | Sistema cobalto/lima/coral claro | Manos plausibles; sin texto ni logos | Abre el problema sin ilustrar literalmente el título | `PASS` |
| `CW-V02` Interfaz | Se distinguen oficio visible y receta conservada | La capa creativa mantiene prioridad sobre la estructural | La señal conecta ambas capas | Sin UI falsa, nodos técnicos ni tipografía defectuosa | Aclara la frontera persona/sistema | `PASS` |
| `CW-V03` Dos velocidades | Divergencia, decisión y convergencia se leen sin labels | Tres zonas claras con decisión humana como bisagra | La señal se ramifica y luego ordena | Mano plausible; formatos nativamente recompuestos | Explica un mecanismo, no una secuencia automática | `PASS` |
| `CW-V04` Seis momentos | Los seis estados son distinguibles | Grilla 2×3 estable y legible a ancho de artículo | La misma campaña persiste desde selección a entrega | Sin palabras deformadas, marcas ni capturas falsas | Da memoria visual al caso conductor | `PASS` |
| `CW-V05` Frontera | Sistema, IA y autoridad humana se distinguen | Tres zonas alineadas; progresión debajo del copy y esquina inferior derecha prescindible | Conserva cobalto/lima/coral | Labels, listas y puntuación deterministas sin cruces | Resume la regla de delegación y escalamiento | `PASS V3` |
| `CW-V06` Autonomía | Managed, co-operated y client-operated se leen como progresión | Tres alturas, ordinales completos y roles Builder/Runner fuera del overlay Ohio | Conserva el hilo de evidencia sin atravesar copy | Labels deterministas, completos y sin UI ficticia | Conecta servicio gestionado y operación por cliente | `PASS V3` |

## 4. Selección y archivos

No fue necesaria una segunda generación: los cuatro primeros candidatos pasaron los cinco gates. Cada master se
revisó a resolución original y cada WebP se volvió a inspeccionar después de la conversión.

| ID | Master | Derivado usado | Dimensiones | Peso |
|---|---|---|---:|---:|
| `CW-V01` | `creative-workflows-hero-master-v1.png` | `creative-workflows-hero-featured-1440-v1.webp` | `1440×757` | `104662 B` |
| `CW-V01-OG` | mismo master | `creative-workflows-hero-og-1200x630-v1.webp` | `1200×630` | `82216 B` |
| `CW-V01-SOCIAL` | mismo master | `creative-workflows-hero-featured-1440-v1.jpg` | `1440×757` | `185911 B` |
| `CW-V02` | `creative-workflows-interface-master-v1.png` | `creative-workflows-interface-web-1440-v1.webp` | `1440×960` | `167700 B` |
| `CW-V03` | `creative-workflows-two-speeds-master-v1.png` | `creative-workflows-two-speeds-web-1440-v1.webp` | `1440×960` | `81336 B` |
| `CW-V04` | `creative-workflows-six-moments-master-v1.png` | `creative-workflows-six-moments-web-1440-v1.webp` | `1440×960` | `164628 B` |
| `CW-V05` | `creative-workflows-decision-boundary-master-v3.png` | `creative-workflows-decision-boundary-web-1440-v3.webp` | `1440×960` | `75474 B` |
| `CW-V06` | `creative-workflows-autonomy-ladder-master-v3.png` | `creative-workflows-autonomy-ladder-web-1440-v3.webp` | `1440×960` | `68120 B` |

Hashes SHA-256, rutas de origen y pesos de master viven en el manifest de la corrida.

## 5. WordPress Media Library

Los cuatro derivados editoriales y el JPEG social fueron subidos con autor `1`, slug estable, título, ALT,
caption y descripción. Los URLs respondieron `HTTP 200`, el MIME esperado y el largo de contenido correcto.

| ID | Media ID | URL | Uso |
|---|---:|---|---|
| `CW-V01-WEB` | `251365` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-hero-featured-1440-v1.webp` | fuente web / fallback |
| `CW-V01-SOCIAL` | `251370` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-hero-featured-1440-v1.jpg` | featured + Open Graph + schema |
| `CW-V02` | `251366` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-interface-web-1440-v1.webp` | cuerpo V4 |
| `CW-V03` | `251367` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-two-speeds-web-1440-v1.webp` | cuerpo V4 |
| `CW-V04` | `251368` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-six-moments-web-1440-v1.webp` | cuerpo V4 |
| `CW-V05` | `251393` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-decision-boundary-web-1440-v3.webp` | cuerpo V5 + enlace a media |
| `CW-V06` | `251392` | `https://efeoncepro.com/wp-content/uploads/2026/07/creative-workflows-autonomy-ladder-web-1440-v3.webp` | cuerpo V5 + enlace a media |

Los attachments V1 `251386–251387` y V2 `251389–251390` permanecen como candidatos superseded y no están
referenciados por el post. No se borran como parte normal del rollback.

## 6. Accesibilidad editorial

Los ALT describen la relación visual necesaria para comprender el argumento, no la dirección de arte ni la
presencia de colores. Evitan comenzar con “imagen de” y no duplican captions.

- Hero: `Mesa de trabajo creativa con múltiples variaciones visuales alrededor de una dirección seleccionada.`
- Interfaz: `Capas de un proceso creativo: referencias y decisiones visibles sobre un sistema ordenado que conserva versiones.`
- Dos velocidades: `Exploración divergente que converge en una decisión humana y luego se transforma en formatos repetibles.`
- Seis momentos: `Seis momentos de una campaña, desde el brief y la exploración hasta la revisión, entrega y aprendizaje.`
- Frontera: `Tres niveles de decisión: el sistema ejecuta, la IA amplía y una persona decide a medida que aumentan la ambigüedad y el impacto.`
- Autonomía: `Tres grados de autonomía: gestionado, co-operado y operado por cliente, con más autonomía a medida que se acumula evidencia.`

## 7. Validación Gutenberg

Comando ejecutado:

```bash
pnpm public-website:content-factory:author -- \
  --file docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json \
  --out tmp/creative-workflows-v5-authored-draft.json
```

Resultado:

- `stage=dry`;
- `validation.status=pass`;
- `blockCount=114`;
- `hasMedia=true`;
- cinco bloques de cuerpo `core/image` y un `core/table`;
- los diagramas `251393` y `251392` usan `linkDestination=media` para lectura completa en mobile;
- seis captions visibles, incluidos tres captions añadidos a los assets existentes;
- `core/image` aparece en `observedBlocks`;
- TOC y jerarquía de 21 headings conservados;
- cero findings;
- no se llamó `--send` y WordPress no recibió una escritura de post.

## 8. Riesgos y límites

- Son imágenes conceptuales generadas con IA. No deben atribuirse a un cliente ni presentarse como captura de
  Creative Studio, experimento neurocientífico ni evidencia visual de la campaña SKY.
- La continuidad entre las cuatro piezas depende principalmente del sistema cromático y geométrico; no de una
  persona idéntica. Esto es aceptable para una serie editorial, pero no para un caso narrativo de personaje.
- El tema Ohio no muestra el featured dentro del cuerpo del single post; lo usa correctamente como featured/OG.
- El widget flotante Next Post ocupa la esquina inferior derecha en desktop. Los diagramas V3 reservan esa zona;
  futuros assets deben auditar el chrome real del tema y también el raster original al `100%`.
- El `PASS` de V2 fue un falso positivo: la frontera tenía una línea sobre copy/listas, una tarjeta sobre el cierre
  y una colisión de puntuación; autonomía ocultaba el ordinal `01` y recortaba un label vertical. Un chequeo de
  safe area no sustituye la inspección semántica de todos los labels, conectores, divisores y signos.
- El texto dentro de los diagramas horizontales es una síntesis en mobile; ALT, caption y enlace al WebP completo
  evitan depender de labels diminutos.
- El derivado OG WebP `1200×630` permanece local como alternativa. WordPress/Yoast usa el JPEG `1440×757`
  `251370`; si una plataforma concreta recorta mal, se deberá evaluar el derivado dedicado.

## 9. Cierre live

El arte, la integración WordPress, Open Graph y el render público están cerrados:

1. publicación autorizada y aplicada el 2026-07-15;
2. desktop y mobile revisados visualmente, sin overflow ni imágenes rotas;
3. cinco imágenes, seis captions, tabla nativa y enlaces a los dos diagramas verificados;
4. TOC con 21 enlaces internos y destinos válidos;
5. featured/OG JPEG `1440×757` responde `200` y Yoast emite `summary_large_image`;
6. canonical WordPress único; rutas equivalentes en Think responden `404`.

El detalle del write y su readback vive en
[E-E-A-T Audit V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md). Estado correcto:
`published; live render verified`.
