# Contextual Visual Slot Contract V1

> **Estado:** Proposed — contrato de autoría y assets; no habilita generación runtime ni cambia el renderer F1.
>
> **Dueño:** Tender Proposal Studio / Deck Composer
>
> **Relacionado:** [Tender Deck Composer](../GREENHOUSE_TENDER_DECK_COMPOSER_V1.md) · [Tender Proposal Studio](../GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · `src/lib/commercial/tenders/deck/contracts.ts`

## Propósito

Una imagen contextual no es un `imageUrl` decorativo. Es un **slot semántico** que nace de una lámina concreta y declara qué debe explicar visualmente, qué espacio puede ocupar y qué evidencia nunca puede simular. El resultado aprobado se adjunta como un `assetId` inmutable; el renderer sólo compone esa referencia.

Así se responde a la intención de la lámina —no sólo a su título— sin convertir el deck en una secuencia de imágenes genéricas ni perder la propiedad vigente: mismos slots + misma plantilla = mismo PDF.

## Frontera inviolable

```text
SlideSpec + contrato de plantilla
  -> deriveContextualVisualBrief                 (propuesta estructurada, fuera del renderer)
  -> humano confirma el encargo visual
  -> generación/curaduría canónica + revisión
  -> asset aprobado, versionado y con provenance
  -> DeckPlan.contextualVisual.assetId
  -> renderer determinista -> PDF
```

- El selector, `slot-fill`, `render` y ensamblado **nunca** llaman a un modelo, red o reloj.
- No existe una URL arbitraria como entrada del deck. Un render recibe un `assetId` aprobado y resuelto por el asset store.
- La generación usa sólo el camino canónico (`generateImage()` / `pnpm ai:image`, actualmente GPT Image) y queda fuera de banda o como command async gobernado; nunca se ejecuta al abrir, previsualizar o exportar una lámina.
- Si no hay asset aprobado, el slot degrada de forma honesta a la composición sin imagen. No se inserta un stock fallback ni se reusa una imagen de otra lámina en silencio.

## Contrato del slot

El futuro `contextualVisual` se declara **por plantilla** sólo donde exista una abertura real de composición (`data-slot='contextualVisual'`). Es opcional hasta que cada template materialice markup, safe area y prueba geométrica; no se agrega un slot virtual que el HTML no pueda llenar.

```ts
type ContextualVisualSlot = {
  kind: 'contextual-visual'
  required: false
  sourcePolicy:
    | 'generated-contextual-allowed'
    | 'illustrative-human-allowed'
    | 'real-evidence-only'
    | 'real-team-only'
  visualRole:
    | 'explain-method'
    | 'make-opportunity-tangible'
    | 'frame-human-impact'
    | 'create-paced-transition'
  aperture: {
    aspectRatio: '16:9' | '4:5' | '1:1' | 'template-defined'
    fit: 'cover' | 'contain'
    subjectPlacement: 'left' | 'center' | 'right' | 'template-defined'
    copySafeZone: 'left' | 'center' | 'right' | 'none'
    crop: 'fixed' | 'template-defined'
  }
  generationIntent: {
    briefId: string
    subject: string
    actionOrRelationship: string
    environment: string
    semanticAnchors: string[]
    prohibited: string[]
  }
  asset: {
    assetId: string
    version: number
    status: 'approved'
  } | null
}
```

`generationIntent` es una especificación para producir/revisar el asset; **no** es un prompt libre pegado por el renderer. El prompt versionado puede derivarse del brief confirmado, pero no sustituye sus campos semánticos ni su provenance.

## Cómo se deriva un encargo desde la lámina

`deriveContextualVisualBrief` recibe un `SlideSpec` ya seleccionado y el contrato de su template. Debe usar el contexto completo que la lámina ya aprobó:

| Fuente del slide | Qué aporta al brief |
|---|---|
| `contentType` + `template` | rol visual permitido y apertura/safe area de composición |
| título, eyebrow y cuerpo | idea central que la imagen debe volver tangible |
| claims, `evidenceRef` y audiencia | límites de veracidad y si se admite imagen generada |
| template contract | encuadre, lado del sujeto, crop y zona reservada para copy |
| tender/client context aprobado | industria, buyer y escenario relevante; nunca logos o hechos no acreditados |

La propuesta debe contestar: **qué relación hace visible la imagen, qué parte del mensaje queda textual y dónde queda espacio negativo para ella**. Un título aislado no basta para generar un visual de calidad.

Ejemplo conceptual para una lámina `StatSplit` sobre visibilidad en motores de respuesta: sujeto `ecosistema de señales conectadas`, acción `se organiza desde múltiples fuentes hacia una respuesta clara`, entorno `abstracción editorial azul/violeta/teal`, composición `objeto a la izquierda; safe zone de copy a la derecha`; no una interfaz falsa ni métricas dibujadas.

## Políticas de origen y honestidad

| `sourcePolicy` | Permitido | Prohibido |
|---|---|---|
| `generated-contextual-allowed` | objeto, escena conceptual o ilustración sin pretensión de prueba | logos, texto legible, cifras, dashboard/UI falsos, testimonio o resultado presentado como real |
| `illustrative-human-allowed` | persona claramente ilustrativa cuando el mensaje trata una situación humana general | retratarla como cliente, miembro del squad, comprador o caso real; usarla como evidencia |
| `real-evidence-only` | caso acreditado, resultado, cliente, documento, captura o gráfico con fuente verificable | imágenes generadas que aparenten demostrar el caso o un resultado |
| `real-team-only` | foto auténtica y aprobada del equipo para una identidad específica | rostros generados, retoque generativo que altere la identidad, stock presentado como squad |

Todo asset generado lleva `source=generated`, provider/model, `briefId`, versión/hash del prompt, fecha, autor de aprobación y clasificación `illustrative`. Cuando pudiera confundirse con un hecho o persona reales, esa condición se hace visible en la lámina o se elige otra pieza.

## Flujo gobernado y API parity

La capacidad futura tiene los mismos consumers —UI, Nexa/MCP y API— sobre las mismas primitives:

1. `proposeContextualVisualBrief(slideId)` produce el brief estructurado, sin crear gasto ni asset.
2. Una persona confirma, ajusta o descarta el brief. `discard` mantiene la lámina sin visual.
3. `executeContextualVisualGeneration(briefId)` reserva/aplica el generador canónico de forma asíncrona y crea un candidato con lineage.
4. `approveContextualVisualAsset(candidateId)` fija `assetId + version` en el slot; sólo esta transición permite el render con imagen.
5. `renderDeck(plan)` consume exclusivamente el `assetId` fijado y registra el hash del plan + versión de plantilla.

Cada command es idempotente y auditable. Generar o aprobar un asset no cambia claims, métricas ni `evidenceRef` de la lámina. La revisión humana de imagen es un gate separado de la revisión editorial del deck.

## Reglas de composición y calidad

- La plantilla decide el aperture; el generador respeta la composición, no al revés.
- La imagen aporta evidencia visual, explicación o pausa narrativa. Si no cumple una de esas funciones, el slot queda vacío.
- No se incrusta copy, números, marcas de cliente, gráficos ni UI dentro de una imagen generada. Esos elementos siguen siendo HTML/slots verificables.
- Un visual generado nunca reemplaza `sourceNote`, `evidenceRef` ni una foto real requerida.
- Antes de adjuntarlo, se revisa en la lámina real a 1920×1080: crop, safe area, contraste, foco, coherencia con el set y ausencia de texto/deformaciones. El renderer conserva además su validación de geometría.
- `PersonaAsset`, `EvidenceAsset` y `ContextualVisual` son tipos distintos. No se permite la sustitución implícita entre ellos.

## Implementación incremental

1. Elegir y materializar aperturas en los templates que realmente ganen con una imagen contextual (piloto: `StatSplit`, `HumanImpactFull`, `CaseStudySplit` y `EvidenceStoryGrid`). Cada una necesita markup, contrato de slot, safe area y pruebas de geometría.
2. Añadir los tipos browser-safe, reader/commands y lineage en el dominio `src/lib/commercial/tenders/**`, como adapter del asset store canónico; no crear un cliente de imágenes ni un storage paralelo.
3. Conectar la generación sólo mediante el command async gobernado y el generador canónico. La exportación de PDF permanece sin red.
4. Validar assets y composition en previews reales antes de ampliar el catálogo; los casos acreditados y el equipo sólo aceptan material real.

No se implementa ese runtime con este documento. La siguiente task debe decidir persistencia, autorización, coste/reserva, retención y el adapter hacia la plataforma hermana Efeonce Creative Studio antes de habilitar el paso 2.
