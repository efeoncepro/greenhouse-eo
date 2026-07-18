# Editorial Cover Key Visual Operating Model V1

> **Estado:** metodología aceptada; piloto publicado y verificado; dirección visual transversal en validación.
> **Fecha:** 2026-07-18.
> **Ámbito:** portada/featured, hero, Open Graph, Twitter/social card y recortes de archivo editorial.
> **No gobierna:** infografías de cuerpo, capturas probatorias, charts ni assets UI productivos.

## 1. Propósito

Una portada editorial Efeonce no es una imagen temática ni un relleno visual. Es un **key visual** que comprime
la tesis del artículo en una relación visible, detiene el scroll, conserva verdad editorial y deriva a todas sus
superficies sin perder significado.

Este operating model nació del piloto `WAG-V01`, *El fin de la web solo para humanos*. El piloto produjo quince
candidatos y expuso fallos que una revisión estética simple no detecta: agente abstracto ilegible, paleta premium
pero ajena a marca, interfaz SaaS genérica, falta de punch, modelo no verificable, bisagra con lectura de libro,
gesto culturalmente ambiguo y una mano que parecía señalar pero anatómicamente proyectaba el meñique.

La metodología se puede repetir desde ahora. El skin del piloto no se convierte todavía en look obligatorio del
blog: requiere al menos dos portadas adicionales, con tesis y medios distintos, antes de promover invariantes
visuales de serie.

## 2. Principios duros

1. **Tesis antes que tema.** “IA + web” describe objetos; “una interfaz media entre intención humana y acción
   agéntica” define una relación visual evaluable.
2. **Tres segundos antes que sofisticación.** Si una entidad necesita caption para identificarse, falla la portada.
3. **Un protagonista.** Toda portada declara un nivel 1; el resto construye tensión o contexto.
4. **Metáfora con límites.** Declarar qué comunica y qué no prueba. Una imagen conceptual no es evidencia.
5. **Marca como sistema.** Paleta, materialidad, ritmo y crop hacen el trabajo antes que el logo.
6. **Provenance demostrada.** No inferir provider/model por apariencia. Registrar la respuesta real del runtime.
7. **Un cambio por ronda.** Concepto, identidad, composición, material, color o fondo se corrigen por separado.
8. **Blockers vencen al score.** Anatomía, gesto cultural, derechos, verdad, provenance exigida o producto falso
   invalidan una pieza aunque alcance una puntuación estética alta.
9. **El crop es parte de la idea.** Featured, OG y card se prueban antes de integrar.
10. **Versionar, no sobrescribir.** Cada cambio visual, crop o tratamiento crea una versión durable.

## 3. Frontera con otros sistemas

- `content-marketing-studio` gobierna función narrativa, concept IDs, manifest, metadata, placement e integración.
- `design-studio` gobierna concepto, sistema visual, key visual, punch y auditoría.
- `greenhouse-ai-image-generator` opera el provider/model y valida el asset raster.
- `efeonce-public-site-wordpress` gobierna snapshot, upload, readback, integración privada y QA pública.
- `EDITORIAL_INFOGRAPHIC_OPERATING_MODEL_V1.md` gobierna infografías de cuerpo, SVG, footer y descripción larga.

Hero/featured no hereda la regla `footer_only` de las infografías. Declara su propia política de firma. El master
no debe llevar logo generado; si un canal necesita firma, se compone después con el activo oficial.

## 4. Artefactos mínimos

Cada run vive en `ai-generations/YYYY-MM-DD_<slug>/` o una subcarpeta versionada y contiene:

```text
brief.md
visual-system.md
methodology.md                 # cuando el piloto produce aprendizaje reusable
manifest.json
prompts/
candidates/
reviews/scorecard.md
proofs/
exports/
README.md
```

El manifest registra candidatos rechazados y superseded; no sólo el ganador. Debe incluir prompt/ref, provider,
model, quality, dimensiones, hash, estado, blocker, master, derivados, metadata, rights y estado CMS.

## 5. Gate 0 — contrato editorial

Antes de generar:

- título, tesis, audiencia, propósito y estado del artículo;
- placement real del tema/CMS: featured, hero visible, body, OG, Twitter y cards;
- comprensión que debe ocurrir en tres segundos;
- `notFunction`: producto, prueba, estándar, cliente o resultado que no representa;
- formatos y crops reales;
- política de marca, firma, derechos, disclosure y modelo requerido.

Si el comportamiento de featured en el template no está verificado, queda como supuesto bloqueante para
integración, no para exploración.

## 6. Gate 1 — visual job map

Por concept ID declarar:

| Campo | Contrato |
|---|---|
| `conceptId` | ID estable del slot, no del archivo. |
| `function` | Relación que debe entenderse sin copy. |
| `notFunction` | Lecturas/claims que debe excluir. |
| `successSignal` | Qué se reconoce en 1–3 segundos. |
| `discardRule` | Fallo que obliga a rechazar. |
| `placement` | Featured/body/OG/card por separado. |
| `cropContract` | Ratios y elementos que deben sobrevivir. |

## 7. Gate 2 — metáfora y referencia cultural

Una referencia cultural se descompone en:

- **estructura transferible:** tensión, ritmo, intervalo, dirección, jerarquía;
- **skin no transferible:** personajes, paleta, obra, textura, iconografía, teología o trade dress;
- **riesgo semántico:** qué equivalencia involuntaria podría construir;
- **distancia suficiente:** no usar la obra fuente como reference image si el concepto puede describirse.

En `WAG-V01` se conservó el casi-contacto; se excluyeron fresco, figuras, creación divina y equivalencia IA=Dios.

## 8. Gate 3 — sistema visual de la pieza

Definir antes de prompts:

- tesis visual en una frase;
- protagonista y tensión secundaria;
- motivo recurrente;
- medio y materialidad;
- composición, safe area y crop;
- paleta por función, no por disponibilidad;
- textura, luz y nivel de realismo;
- firma y activos oficiales;
- invariantes, flexibles y prohibiciones;
- alcance de cada regla: asset, artículo, territorio o marca.

No universalizar una solución local. Una portada puede usar blanco, degradado, fotografía o interfaz si la tesis
lo exige; la siguiente puede necesitar collage, papel, objeto, paisaje o abstracción.

## 9. Gate 4 — divergencia controlada

Producir al menos tres direcciones que cambien una decisión estructural:

- composición frontal, diagonal u oblicua;
- metáfora física, editorial o arquitectónica;
- nivel de literalidad;
- medio/materialidad.

Tres colores de la misma imagen no cuentan como divergencia. Cada candidato conserva prompt, hash y motivo de
rechazo. La primera pasada juzga concepto/thumbnail; la segunda, integridad a resolución original.

## 10. Gate 5 — selección de modelo y provenance

Si el modelo exacto no importa, puede usarse el generador integrado. Si el usuario o contrato exige un modelo,
usar una ruta que devuelva su identidad.

Para GPT Image 2 en este repo:

```bash
pnpm ai:image \
  --prompt-file <prompt.txt> \
  --model gpt-image-2 \
  --quality high \
  --size 2048x1152 \
  --out <candidate.png> \
  --timeout 280000
```

El cierre debe conservar la salida `gpt-image-2 · 2048x1152` o equivalente. Si el runtime conversacional no
expone `model_id`, registrar `null/unknown`; nunca completar el campo por intuición.

## 11. Gate 6 — referencias con roles explícitos

Cuando se usan varias imágenes, cada una declara un rol:

- `STRUCTURE`: composición, crop y jerarquía;
- `IMPACT`: escala, contraste, energía o color;
- `ANATOMY`: pose y topología corporal;
- `MATERIAL`: textura/acabado;
- `IDENTITY`: sujeto que no debe derivar;
- `ANTI-REFERENCE`: rasgo que se excluye; no tiene peso negativo nativo.

No pedir “combina estas imágenes”. El prompt lista qué se conserva, qué se ignora y qué referencia gana si hay
conflicto. Una referencia anatómica se recorta para reducir contaminación de estilo/contexto.

## 12. Gate 7 — iteración single-change

Una edición rigurosa contiene:

1. `LOCKED`: elementos, geometría, color y crop que no cambian;
2. `CHANGE ONLY`: una variable y delta medible;
3. `CULTURAL/EDITORIAL SAFETY`: lecturas que no pueden aparecer;
4. `NO OTHER EDITS`: frontera explícita.

Si cambia concepto o verdad, regenerar. Si cambia material, fondo o crop, editar. No encadenar infinitamente
candidatos; volver siempre al mejor master estructural disponible.

## 13. Gate 8 — punch editorial

Punch es lectura y energía a thumbnail, no oscuridad ni saturación indiscriminada. Se controla con:

- escala del protagonista;
- proximidad/tensión;
- diagonal o flujo direccional;
- contraste de luminosidad y temperatura;
- profundidad de color;
- una forma reconocible;
- un único acento semántico.

Prueba: reducir a `160px` de ancho. Si sólo sobreviven color y ruido, falta concepto. Si sobrevive la relación
principal, el visual tiene punch.

Evitar como sustitutos: negro por defecto, neon, glow, partículas, lens flare, bokeh, chrome excesivo, manos
gigantes sin propósito o interfaz llena de widgets.

## 14. Gate 9 — fondos y degradados

Un fondo premium construye profundidad y separación; no agrega otra ilustración.

Para un gradiente direccional:

1. asignar temperatura/luminosidad a cada actor;
2. ubicar el valor más claro detrás del foco o borde que necesita separación;
3. mantener el extremo oscuro cromático, nunca casi negro si la marca no usa negro;
4. evitar stops visibles, triángulos, wedges, rayos, halo radial, vignette o bandas;
5. añadir micrograno sutil para reducir banding, sin humo, nube o mottling;
6. verificar contraste del sujeto oscuro sobre el tramo medio, no sólo sobre el extremo claro.

Paleta aprobada en el piloto, de alcance `asset/article`:

`blanco cálido → off-white frío → azul hielo → azul activo Efeonce → navy Efeonce`.

No convertirla en default del blog hasta terminar los pilotos adicionales.

## 15. Gate 10 — interfaz conceptual, no SaaS genérico

Si la tesis exige interfaz:

- mostrar una relación/mecanismo, no una colección de cards;
- evitar checklist, dashboard, charts, miniwidgets y botones genéricos;
- no simular producto real;
- usar geometría exacta sólo si se compone determinísticamente;
- mantener texto fuera del raster;
- preferir una idea física: cutaway, capas registradas, frontera, evidencia o cambio de lectura.

En el piloto, la solución fue una misma web en dos planos registrados: superficie humana y blueprint agéntico,
unidos por cinco estados de autoridad. No se convierte en plantilla universal.

## 16. Gate 11 — anatomía, gesto y seguridad cultural

Una silueta plausible puede ser anatómicamente falsa. Para manos:

1. identificar palma/dorso;
2. ubicar pulgar y lado radial;
3. ubicar lado cubital/meñique;
4. seguir cada dedo desde base/metacarpo a la punta;
5. comprobar que el índice nace junto al pulgar;
6. revisar a original y thumbnail;
7. revisar lecturas por mercado: dedo medio, meñique, arma, cuernos, V u otros gestos;
8. no reflejar horizontalmente una mano aprobada sin repetir todo el gate.

Si falla, rechazar aunque el score sea alto. Crear una referencia anatómica correcta, recortada y con rol
`ANATOMY`; no intentar resolver con caption ni insistir sólo con texto.

## 17. Gate 12 — auditoría, crops y delivery

### Scorecard 0–50

- brand-fit;
- claridad de concepto;
- jerarquía;
- color;
- tipografía/legibilidad;
- composición;
- reproducibilidad cross-format;
- accesibilidad/contraste;
- originalidad;
- craft.

Umbral: `42/50`; objetivo premium: `46/50`. Blockers duros invalidan sin importar total.

### Formatos mínimos

- master PNG sRGB, sin recomprimir;
- featured WebP `1600×900` o resolución aprobada por el runtime;
- OG JPEG `1440×756` o `1200×630`;
- card/crop `1:1` cuando el archivo/índice lo use;
- proof `160px` para punch;
- hashes, dimensiones, MIME y bytes reales.

Los derivados nacen del master seleccionado. No encadenar compresiones. No sobrescribir URLs/archivos
versionados. Validar anatomía y significado nuevamente después de cada crop.

## 18. Metadata y verdad

- ALT describe la relación necesaria, no la estética.
- Caption aporta consecuencia editorial.
- Description registra concept ID, provider/model, provenance, licencia y límites.
- Disclosure aclara cuando la pieza es conceptual.
- No describir UI conceptual como captura, producto o evidencia.

## 19. Integración CMS

Producción visual termina en `*_ready`, no en `integrated`:

1. snapshot antes de write;
2. upload de derivados aprobados;
3. readback de attachment ID, URL, MIME, dimensiones, peso y metadata;
4. mapeo featured/OG/card por separado;
5. QA privada desktop/mobile;
6. publicación sólo con autorización humana explícita;
7. verificación pública, social card y rollback.

## 20. Dirección candidata del blog

### Invariantes candidatas

- tesis visual, no ilustración temática;
- un foco fuerte y una tensión legible;
- aire editorial;
- tecnología como relación/contrato/consecuencia;
- materialidad táctil y bordes precisos;
- marca reconocible sin logo dominante;
- punch comprobado a thumbnail;
- crop/provenance/cultural safety como parte del diseño.

### Variables que deben seguir libres

- manos, robots, interfaces y gesto renacentista;
- fondo blanco o degradado azul;
- fotografía/3D;
- naranja como acento;
- composición diagonal;
- dos planos o cutaway.

Una familia premium se reconoce por criterio y craft, no por repetir el mismo objeto.

## 21. Definition of Done

- [ ] Job map, brief y `notFunction` cerrados antes de generar.
- [ ] Sistema visual declara alcance, invariantes y prohibiciones.
- [ ] Hay divergencia estructural real.
- [ ] Prompts y referencias tienen roles y lineage.
- [ ] Provider/model exigido está demostrado.
- [ ] Selección pasó thumbnail y original.
- [ ] Anatomía, gesto y seguridad cultural pasaron topología, no sólo silueta.
- [ ] No hay producto/evidencia/cliente/logos/texto fabricados.
- [ ] Score `>=42`, objetivo premium `>=46`, sin blocker duro.
- [ ] Featured, OG y card derivan del master y tienen hashes/dimensiones/bytes.
- [ ] ALT, caption, description y disclosure están listos.
- [ ] Estado distingue producción, integración y publicación.
- [ ] CMS upload/readback/QA se completan antes de declarar integración.

## 22. Piloto de referencia

`ai-generations/2026-07-18_web-agentica-pillar/cover-creation-of-adam-v1/`

La selección `WAG-V01-C15` fue producida por el CLI canónico con `gpt-image-2`, `quality high`, `2048×1152`.
El run conserva todos los candidatos y blockers que originaron este operating model. Su estado operativo final
es `published; live_verified` en
`https://efeoncepro.com/aeo/web-agentica-agentes-ia/`, con featured WebP `1600×900` en Media ID `251553` y
OG/Twitter JPEG `1440×756` en Media ID `251554`. El featured también alimenta card/archivo; el theme del single
no lo imprime como hero visible, por lo que no se duplicó en el body. Este readback reemplaza el estado histórico
`featured_ready; og_ready; card_ready; cms_not_integrated` sin reescribir el lineage de producción.
