# Proposal Studio — el motor de composición (Artifact Composer)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) (ADR) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md) · [TASK-1393](../../tasks/complete/TASK-1393-artifact-composer-extraction-catalogs-brand-pack.md)

## Qué es el motor

El **Artifact Composer** es la pieza que convierte **contenido** en **un artefacto visual**
(hoy: un PDF de N láminas). Recibe qué dice cada lámina, elige la plantilla, la llena, valida que todo
cumpla las reglas y produce el archivo.

Lo importante es lo que **no** es: **el motor no sabe qué es una licitación**. No conoce propuestas,
ni clientes, ni deadlines, ni márgenes. Solo conoce plantillas y contenidos.

## Por qué es "domain-free" (y por qué eso importa)

Cuando se descubrió que el motor era genérico, ya vivía dentro de la carpeta de licitaciones. Estaba
ahí **por accidente histórico**, no porque lo necesitara.

En ese mismo momento apareció un segundo uso real: **carruseles de Instagram**. Necesitan exactamente
lo mismo (plantillas + contenidos + render determinista). Y ese es el instante exacto en que un motor
compartido **se bifurca en dos motores que divergen**: alguien lo copia, lo adapta, y desde ese día
cada bug hay que arreglarlo dos veces — o peor, se arregla una sola.

La decisión fue extraerlo antes de que eso pasara:

```
        Artifact Composer  (UN motor, sin dominio)
                 │
        ┌────────┴──────────────┐
        ▼                       ▼
  catalogs/deck-axis      catalogs/social-carousel
  16:9 · 1920×1080        4:5 · 1080×1350
  → PDF de N páginas      → set de PNG
        ▲                       ▲
  consumer: Proposal      consumer: Social (growth)
   (comercial)                 (marketing)
```

**El test de que la decisión está bien tomada:** agregar el carrusel **no debe tocar una sola línea
del motor**. Si te obliga a tocarlo, el motor está mal — y se arregla **una vez**, no dos.

> **Detalle técnico:** el motor está en `src/lib/artifact-composer/**`, con frontera mecánica (un test
> de allowlist + una regla de lint impiden que importe nada de un dominio). Hoy el único catálogo
> construido es `deck-axis`. Contrato en el
> [ADR §1](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md).

---

## Qué es un catálogo (spoiler: es DATO, no código)

Un **catálogo** es una superficie visual completa, empaquetada como datos:

| Parte del catálogo | Qué contiene |
|---|---|
| **Plantillas** | Los archivos de cada tipo de lámina (portada, agenda, cronograma, equipo, económica…) |
| **Registro** | Qué tipo de contenido va con qué plantilla (1 a 1) |
| **Contratos de slots** | Qué campos acepta cada plantilla y con qué límites |
| **Resolvers** | Cómo se traduce un valor con significado ("visibilidad alta") a una decisión visual (qué ícono, qué tono, qué largo de barra) |
| **Validadores semánticos** | Reglas propias de esa superficie (por ejemplo: una cifra necesita fuente) |
| **Molde** | El lienzo, las regiones, la safe-area, el chrome, la tipografía — compilado **una vez** |
| **Destino de salida** | `pdf-merged` o `png-set` |

El catálogo `deck-axis` tiene **29 plantillas**. Es un **catálogo cerrado**: si un contenido no calza
en ninguna, eso **no** significa "improvisa un layout" — significa que **falta una plantilla**, y eso
se decide en el catálogo, no en la lámina.

**Por qué cerrado:** una propuesta la lee un comité **que compara**. Un deck que cambia de lenguaje
visual cada tres láminas se lee como un collage y **resta**. Si cualquier autor (o agente) pudiera
apilar piezas y armar un layout nuevo, el freehand vuelve por la puerta de atrás.

> **Detalle técnico:** `src/lib/artifact-composer/catalogs/deck-axis/` (29 plantillas + `registry.json`
> + `resolvers.ts` + `semantic-validators.ts` + `deck-mold.css`). El contrato del catálogo está en
> `src/lib/artifact-composer/catalog.ts`.

---

## El brand pack — la marca es un INPUT, no una constante

**El hallazgo que forzó esto:** las 25 plantillas hardcodeaban **262 literales de color** (51 distintos),
con la paleta **re-declarada en cada archivo**. Eso empezó como deuda de marca. Con un segundo catálogo
se convierte en un multiplicador de desviación. Y con la capacidad naciendo **para venderse como
servicio**, se convierte en **un bloqueador del modelo de negocio**.

> **La regla que lo cambia todo: la marca es un INPUT del motor, no una constante.**
> AXIS es **el brand pack de Efeonce**, no *el* brand pack.

Un **brand pack** declara:

- **Colores**: primitivas + roles semánticos + opacidades.
- **Tipografía**: las fuentes (con sus derechos de incrustación declarados) + los roles de texto.
- **Pares de contraste** que el pack **promete cumplir**.

Y se **compila** de forma determinista a variables de CSS: mismo pack → mismo resultado, byte a byte.
Sin reloj, sin red, sin Figma en tiempo de render.

**El guard de contraste (y su matiz):** apenas la marca es un input, un cliente puede traer una paleta
que produzca texto por debajo del mínimo legible (WCAG AA). El compilador **evalúa los pares
declarados y falla al compilar, no en la lámina**. Con un alcance deliberado:

- para el pack por defecto (`axis`, afinado a mano) el guard es **advisory**: un refactor no arregla
  una decisión de marca — **la revela**;
- para un pack de cliente el guard es **bloqueante**.

**Por qué esto es la costura ASaaS:** el día que un cliente Globe componga sus propias propuestas, lo
único que cambia es **su brand pack y su catálogo**. Nada del motor. Si AXIS quedaba horneado, servir a
un cliente significaba **reescribir**.

> **Detalle técnico:** contrato en `src/lib/artifact-composer/brand-pack.ts`; el pack de Efeonce en
> `brand-packs/axis/`, compilado con `pnpm composer:brand-pack`. El CSS compilado se commitea y un test
> verifica que esté sincronizado — el renderer nunca depende de Figma en vivo.
> ⚠️ Pendiente declarado: **71 altas de color** en el pack siguen marcadas como *propuestas* a la espera
> de validación en el Figma `Sistema Axis - PPT`.

---

## El selector determinista — el autor declara intención, nunca plantilla

El autor (persona o agente) escribe **qué dice** la lámina: un tipo de contenido (`contentType`) y sus
campos. **Nunca** escribe qué plantilla usar.

El **selector** del catálogo hace el mapeo (un tipo de contenido → una plantilla). Si un plan viejo
trae una plantilla escrita a mano y **contradice** al selector, el sistema **aborta**
(`TemplateAuthorityError`).

**Por qué:** elegir una plantilla semánticamente incorrecta (aunque sus campos pasen la validación de
forma) deja de ser **expresable**. Es la diferencia entre poner un linter encima de un error y hacer
que el error **no se pueda escribir**.

> Hacer que un estado ilegal sea **irrepresentable** es estrictamente mejor que ponerle un guard
> encima.

Y hay una consecuencia de rigor: **el motor canonicaliza el contenido antes de resolver**. Dos entradas
equivalentes (mismos datos, distinto orden) producen **el mismo manifiesto** y por lo tanto **el mismo
hash**. Sin eso, el drift check daría falso positivo para siempre.

> **Detalle técnico:** `resolvePlan` en `src/lib/artifact-composer/catalog.ts`; los dos tipos de plan
> (`CompositionPlanInput` autorable vs `ResolvedCompositionManifest` resuelto) en `plan.ts`.

---

## El manifiesto resuelto — lo único que se renderiza

La salida de la composición **no es un PDF**: es un **manifiesto resuelto**, un archivo de datos que
contiene:

| Contenido del manifiesto | Para qué sirve |
|---|---|
| El contenido **canonicalizado** | Que dos entradas equivalentes produzcan el mismo artefacto |
| La **plantilla que el catálogo eligió** por lámina | Que la elección quede sellada, no re-decidida después |
| El **hash del catálogo y de los contratos** | Detectar si el catálogo cambió |
| El **hash del brand pack** | Detectar si la marca cambió |
| Los **checksums de las fuentes** | Detectar si la tipografía cambió |
| El **resultado de los validadores** semánticos | Que un manifiesto con un validador en falla no se pueda encolar |

**Por qué existe:** permite **explicar y repetir** exactamente el mismo artefacto sin consultar el
reloj, ni Figma, ni la red, ni la base de datos. Es lo que hace que el PDF sea un **derivado**
auditable y no una fuente de verdad opaca.

Y es **lo único que llega al render productivo**. El manifiesto se hashea con serialización canónica
(claves ordenadas, en profundidad) porque viaja por la base de datos y PostgreSQL **reordena las
claves** de un JSONB.

> **Detalle técnico:** `ResolvedCompositionManifest` en `src/lib/artifact-composer/plan.ts`; el hash en
> `src/lib/commercial/tenders/proposals/render-jobs.ts` (`hashResolvedManifest`). Se emite junto al PDF
> como `<artifactId>.manifest.json`.

---

## Los destinos de salida (`outputTarget`)

El destino es una propiedad **del catálogo**, no del motor:

| Destino | Estado | Para qué |
|---|---|---|
| `pdf-merged` | ✅ implementado | El deck: N láminas fusionadas en un PDF |
| `png-set` | ✅ implementado | Un set de imágenes (una por pieza) |
| `pptx-native` | ⛔ declarado, no implementado | PowerPoint editable |
| `adobe-express-rest` | ⛔ declarado, no implementado | Adobe Express editable |

**La regla dura:** un destino declarado pero no implementado **aborta** con un error explícito
(`UnimplementedOutputTargetError`). **Nunca** degrada en silencio a PDF.

**Por qué importa:** una degradación silenciosa es exactamente el fallo que nadie revisa. Si alguien
pide un PPTX editable y recibe un PDF plano "porque el PPTX no estaba listo", se entera cuando ya lo
envió.

> **Detalle técnico:** `IMPLEMENTED_OUTPUT_TARGETS` en `src/lib/artifact-composer/catalog.ts`.

---

## Por qué el render es hermético

El render abre un navegador Chromium, pinta cada lámina, la captura y fusiona el PDF. Tres reglas lo
hacen **determinista**:

1. **Sin red.** El render **bloquea todo tráfico HTTP/HTTPS**. Si una plantilla intentara pedir una
   fuente a Google Fonts, no la obtendría.
2. **Fuentes locales.** La tipografía viene **dentro del catálogo** (el font pack del brand pack, con
   sus checksums). Por eso bloquear la red es posible sin romper la marca.
3. **Fail-closed ante una fuente que no carga.** Si una fuente declarada no carga, el render **aborta**
   — no degrada a la fuente del sistema. Un deck fuera de marca **no sale**.

Y el arranque del navegador es **uniforme**: mismos flags siempre, nunca condicionados al ambiente.
Un launch que cambia según dónde corre es exactamente el no-determinismo que el motor existe para
eliminar. (El flag `--no-sandbox` —necesario porque el worker corre como root dentro del contenedor—
es aislamiento de proceso, no rasterización: **el gate visual a 0 píxeles lo prueba**.)

**El gate visual:** el catálogo tiene un **baseline de 40 frames** commiteado. Cualquier cambio al
dominio debe pasar `pnpm composer:visual-gate` **a cero píxeles de diferencia**. Rebasar el baseline
solo se permite **declarándolo** en `BASELINE_DELTAS.md`.

> Los tests verdes **no** son el gate de un deck. Cuatro pasos numerados todos como "01", los párrafos
> aplanados y la firma sin fundido **pasaban los 92 tests**. Por eso el gate estético es **mecánico y
> comparado contra un baseline**, no una intención.

**Y una regla que parece de plomería pero es de fondo:** un **catálogo es dato portable, o no es un
catálogo**. Ninguna plantilla puede referenciar una ruta absoluta, un `file://` ni un archivo fuera de
su propio árbol. Se aprendió mal: dos plantillas viajaron a la nube con la ruta del Mac del autor
horneada adentro. En local resolvían siempre; en el contenedor, nunca.

> **Detalle técnico:** `launchComposerBrowser`, el bloqueo de red y el fail-closed de fuentes en
> `src/lib/artifact-composer/render.ts`; el gate visual en `scripts/artifact-composer/visual-gate.ts`;
> la portabilidad, en `catalog-portability.test.ts`. Origen de la lección:
> [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md).

---

## Cómo se extiende el motor (las costuras que sí existen)

| Quieres… | La costura correcta | Lo que **NO** se hace |
|---|---|---|
| Un **formato nuevo** (carrusel, one-pager) | Un **catálogo nuevo** (plantillas + registro + resolvers + molde + destino) | Copiar el motor; meter un `if` por formato |
| Un **destino de salida nuevo** | Implementarlo en el registro de destinos | Degradar en silencio a PDF |
| Una **plantilla nueva** en el deck | El protocolo del catálogo (plantilla + contrato de slots + entrada en el registro + baseline declarado) | Editar el baseline a mano |
| **Otra marca** (cliente ASaaS) | Un **brand pack nuevo** | Poner colores o fuentes literales en las plantillas |
| **Otro detector de QA** | Agregarlo a los gates de calidad y calibrarlo contra el baseline | Un warning que nadie lee |

> **Detalle técnico:** el mapa completo de costuras (con las contrapartidas) está en la skill
> `.claude/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md` y en el
> [ADR — Roadmap por slices](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md).
