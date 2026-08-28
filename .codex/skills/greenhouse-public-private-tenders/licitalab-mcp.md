# LicitaLAB MCP — conexión y operación read-only

Contrato operativo para usar el MCP oficial de LicitaLAB desde Codex o Claude. LicitaLAB cubre **licitaciones
públicas solamente**: este companion no aplica a RFP/RFQ privados. Documenta la superficie observada en runtime;
no sustituye las bases oficiales, el criterio de admisibilidad ni el lifecycle canónico
`public_opportunity → deal → quote → SOW → delivery`.

## Frontera pública obligatoria

- Toda oportunidad recuperada desde LicitaLAB es `public_opportunity`; si se promueve a `Proposal`, usa
  `origin='public_tender'`.
- El organismo comprador, código, país, tipo y documentos conservan lineage hacia la fuente pública oficial.
- “Cotización”, Compra Ágil, Convenio Marco, trato directo u otra modalidad expuesta no significan `private_rfp`.
- Wherex y las plataformas corporativas privadas son carriles separados; sus oportunidades nunca se buscan ni se
  completan con LicitaLAB.
- El MCP es read-only y tampoco prueba por sí solo que las bases oficiales estén vigentes o completas: aplica los
  estados RAG y contrasta la evidencia load-bearing.

## Estado verificado

Readback realizado el **2026-08-28**:

- servidor: `LicitaLab AI Tools` `1.0.0`;
- endpoint Streamable HTTP: `https://aiagents.licitalab.cl/api/mcp/licitalab-mcp-server/mcp`;
- autenticación: OAuth del proveedor;
- inventario: 5 tools, 0 resources y 0 resource templates;
- todas las tools declaran `readOnlyHint: true` y `destructiveHint: false`;
- canary ejecutado: `searchSupportTool` respondió `isError: false` con `structuredContent`.

El inventario runtime prevalece sobre páginas comerciales, capturas o esta fecha. Antes de una operación real,
relee `tools/list` o el inventario MCP visible en la sesión; una conexión configurada u OAuth exitoso no prueban
por sí solos que una tool determinada siga expuesta.

## Conexión

### Codex

```bash
codex mcp add licitalab --url https://aiagents.licitalab.cl/api/mcp/licitalab-mcp-server/mcp
codex mcp get licitalab
codex mcp list
```

El alta detecta OAuth y abre el flujo del proveedor. Nunca copies al chat URLs de autorización, códigos, tokens,
cookies ni credenciales. `codex mcp get/list` confirma configuración y auth; para probar capacidad real, exige
además un `tools/list` y un canary read-only. Si la sesión se abrió antes de instalar el MCP y no ve las tools,
abre una sesión nueva después de completar OAuth.

### Claude

Agrega un custom connector con el mismo endpoint, completa el OAuth de LicitaLAB y abre un chat nuevo. No escribas
usuario o clave en archivos del repo ni en comandos versionables. La sesión del sitio `app.licitalab.cl` y el OAuth
del MCP son autoridades distintas: que Chrome esté autenticado no prueba que el MCP lo esté, ni al revés.

## Inventario live observado

| Tool                           | Input mínimo    | Qué entrega                                                                                                                                          |
| ------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findOpportunityTool`          | `code`          | Oportunidad por código: cabecera, tipo, comprador, fechas, ítems, ofertas, ganadores y notas. Admite `country` (`CL`, `PE`, `CO`), `type` y `buyer`. |
| `providerReportTool`           | `taxNumber`     | Reporte por RUT/RUC/NIT: participaciones, adjudicaciones, win rate, montos, evolución mensual, compradores, rubros, competidores y detalle paginado. |
| `listOpportunityDocumentsTool` | `code`          | Documentos disponibles: nombre, tamaño, extensión, última modificación y soporte para extracción.                                                    |
| `getOpportunityDocumentTool`   | `code`, `query` | Búsqueda semántica RAG en bases/anexos, con fragmento, archivo, página y score.                                                                      |
| `searchSupportTool`            | `question`      | Respuesta desde la base de ayuda de LicitaLAB; filtro opcional `chile` o `peru`.                                                                     |

### Filtros relevantes de proveedor

- Períodos **rodantes**, no años calendario: 10 días, 1, 3, 6 o 12 meses.
- Tipos por país: Chile incluye licitaciones, Compra Ágil, Convenio Marco, cotizaciones, grandes compras, trato
  directo y consulta al mercado; Perú usa licitaciones/compra menor; Colombia expone licitaciones.
- Modos: todas, adjudicadas, no adjudicadas, ofertadas o registradas; `registered` no aplica a Chile/Colombia.
- `include: ["recent_awarded_items"]` agrega ítems adjudicados y precio unitario.
- `include: ["lost_items_pricing"]` compara precio propio con el ganador y calcula el gap.
- El detalle pagina con `cursor`; `limit` acepta hasta 50 y `orderBy: "amount"` resuelve preguntas superlativas.

## Recetas canónicas

### 1. Analizar una oportunidad por código

1. Ejecuta `findOpportunityTool` con el código y el país cuando sea necesario.
2. Si devuelve `multiple_matches`, conserva el orden de `candidates`, muéstralos y pide elegir. Nunca selecciones
   uno por parecido; repite con el `type` exacto o filtra por `buyer`.
3. Ejecuta `listOpportunityDocumentsTool` antes de afirmar qué bases/anexos existen.
4. Consulta `getOpportunityDocumentTool` con preguntas acotadas: requisitos excluyentes, fechas, garantías,
   criterios, entregables, experiencia, formatos y anexos.
5. Construye la matriz de cumplimiento con archivo/página. La ficha o el título sirven para discovery; el fit real
   exige leer la evidencia documental.

### 2. Analizar empresa propia o competidor

1. Confirma RUT/RUC/NIT, país y ventana rodante.
2. Usa `providerReportTool`; no escribas SQL paralelo contra providers/workspaces.
3. Para desempeño, informa participaciones, adjudicaciones, win rate, montos y evolución.
4. Para estrategia, cruza compradores, rubros y competidores.
5. Para precio, pide `lost_items_pricing`; un gap observado orienta, pero no prueba por sí solo por qué se perdió.
6. Para historial extenso, pagina con el cursor devuelto; no presentes la primera página como universo completo.

### 3. Resolver dudas de uso

Usa `searchSupportTool` para operación de LicitaLAB. Separa siempre la respuesta de soporte del inventario callable:
una página puede describir “oportunidades monitoreadas” aunque la sesión no exponga una tool para listarlas.

## Estados del RAG documental

| `status`      | Conducta obligatoria                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `ok`          | Responde con los chunks y cita archivo/página.                                          |
| `partial`     | Responde con lo disponible, declara `pending_documents` y ofrece reintentar.            |
| `indexing`    | No inventes contenido; informa que el indexado comenzó y reintenta en 30–60 s.          |
| `empty`       | Informa que no hay documentos legibles.                                                 |
| `unsupported` | Informa que el país/tipo no soporta esa lectura.                                        |
| `error`       | Conserva el fallo como fallo técnico y reintenta; no lo conviertas en “sin resultados”. |

Nunca afirmes haber leído bases cuando el estado no sea `ok` ni `partial`.

## Límites observados y guardrails

- Es una superficie **read-only de contratación pública**: no guarda, etiqueta, cotiza, postula, acepta órdenes,
  envía ofertas ni modifica LicitaLAB o el portal público de origen.
- El inventario observado no incluye discovery general por keyword, región, categoría o fecha; la búsqueda de
  oportunidad requiere `code`.
- No hay tool callable para listar “Mis negocios” o todas las oportunidades monitoreadas.
- No hay tool de descarga binaria: se listan archivos y se consulta texto vía RAG.
- Cobertura desigual por país/tipo debe representarse como `unsupported`, no como ausencia legítima de datos.
- Una respuesta de soporte, un título o un resumen RAG no reemplazan las bases oficiales ni validación legal humana.
- Nunca declares GO sin admisibilidad y margen sobre loaded cost, aunque el fit y el win rate sean altos.
- Presentar/postular sigue bajo confirmación humana explícita.

## Canary mínimo

Después de conectar o renovar OAuth:

1. Confirma `enabled` + OAuth sin imprimir valores sensibles.
2. Lee `tools/list` y verifica nombres/schemas, no solo el conteo.
3. Ejecuta `searchSupportTool` con una pregunta inocua.
4. Exige respuesta estructurada y `isError: false`.
5. Para un canary de negocio, usa un código elegido por el operador y ejecuta solo la cadena read-only
   `find → list documents → query documents`.

## Prompts de arranque

- “Busca la oportunidad `<código>` en Chile y dame comprador, estado, fechas, ítems y adjudicatarios.”
- “Lista las bases y anexos de `<código>`; todavía no los analices.”
- “En las bases de `<código>`, identifica requisitos excluyentes y cita archivo y página.”
- “Analiza el RUT `<RUT>` en los últimos 12 meses: desempeño, compradores, rubros y competidores.”
- “Compara los ítems que perdió `<RUT>` por precio, pero separa correlación de causalidad.”

## Fuentes

- Autoridad primaria de capacidad: `tools/list` y los schemas devueltos por el servidor MCP autenticado.
- Instalación oficial: `https://help.licitalab.cl/es-cl/articles/3-como-instalar-el-mcp-de-licitalab-en-claude-o-chatgpt`.
- La base de soporte consultada por `searchSupportTool` es evidencia de ayuda, no inventario ejecutable.

## Hand-off

- Discovery público general autenticado → `licitalab-radar-playwright.md`; el runner entrega códigos y esta
  toolchain hidrata evidencia documental. Para discovery privado usa su fuente/companion específico.
- Decisión bid/no-bid y admisibilidad → `bid-lifecycle-go-no-go.md` + `compliance-riesgo-integridad.md`.
- Matriz técnica/económica → `propuesta-tecnica-economica.md`.
- Pricing/margen/garantías → `pricing-garantias-finance.md` + `greenhouse-finance-accounting-operator`.
- Pipeline/deal → `hubspot-greenhouse-bridge`; el MCP de LicitaLAB nunca crea una identidad comercial paralela.
