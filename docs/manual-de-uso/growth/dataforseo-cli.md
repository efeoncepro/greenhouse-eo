# DataForSEO CLI — uso diario

> Alcance: herramienta local de operador/agentes. No despliega ni cambia flags.
> Catálogo verificado el 2026-09-28: 545 endpoints oficiales; 320 pertenecen a las seis familias ejecutables.

`pnpm dataforseo` es la entrada gobernada para research ad hoc. Usa el mismo transporte, allowlist, breaker,
entitlement y ledger que los consumers productivos; no es un SDK alternativo. La fuente rápida de sintaxis es:

Comportamiento funcional: [`dataforseo-research-cli.md`](../../documentation/growth/dataforseo-research-cli.md).
Contrato técnico: [`GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md).

```bash
pnpm dataforseo -- help
```

## Antes de empezar

- Configura `DATAFORSEO_API_LOGIN` y `DATAFORSEO_API_PASSWORD_SECRET_REF`; la contraseña se resuelve por la ruta
  gobernada y nunca se pone en argumentos, payloads, archivos de salida ni capturas.
- Define el objetivo, mercado y lente antes de comprar. GSC es medición de primera parte; DataForSEO es una
  estimación de mercado. No se promedian ni se presentan como equivalentes.
- Para una llamada pagada, empieza siempre con `--dry-run`. Revisa endpoint, mercado, cantidad de tasks,
  estimación y `consumer` antes de confirmar.
- Usa una organización real con `--org <uuid>` cuando corresponda. La CLI nunca la infiere ni la fabrica.

El flujo recomendado es `catalog search` → `catalog describe` → `quick|run --dry-run` → revisión humana →
`--yes --max-usd`. Si el endpoint es asíncrono, conserva el ID y termina con `task wait`.

## Descubrir antes de ejecutar

```bash
pnpm dataforseo -- catalog info
pnpm dataforseo -- catalog search "google organic live advanced"
pnpm dataforseo -- catalog describe /v3/serp/google/organic/live/advanced
pnpm dataforseo -- catalog list --family ai_optimization --status executable
```

`catalog_only` no significa que el proveedor carezca de la ruta. Significa que Greenhouse la conoce pero no la
autoriza todavía; `describe` muestra la razón y el proceso de habilitación. Nunca se elude con `curl` o un SDK.

Actualizar y comprobar el snapshot:

```bash
pnpm dataforseo:catalog:sync
pnpm dataforseo:catalog:check
```

La fuente es `https://docs.dataforseo.com/v3/`: portada concreta + REST WordPress oficial, con digest, ID y fecha
de modificación. DataForSEO no publica un OpenAPI oficial equivalente; el snapshot no se presenta como uno.

## Consultas rápidas

Preview Perú, sin costo:

```bash
pnpm dataforseo -- quick ai-mode \
  --keyword "cuentas para empresas" \
  --market PE \
  --locale es-PE \
  --dry-run
```

El payload debe mostrar `location_code: 2604`, `language_code: es` y `device: desktop`. La etiqueta `Perú` sirve
para UX/prompt; nunca sustituye al identificador del proveedor.

Ejecución de una consulta rutinaria con techo:

```bash
pnpm dataforseo -- quick ai-mode \
  --keyword "cuentas para empresas" \
  --market PE \
  --locale es-PE \
  --max-usd 0.01 \
  --yes \
  --out /tmp/dataforseo-ai-mode.json
```

Otros presets:

```bash
pnpm dataforseo -- quick organic --keyword "pintura para exteriores" --market MX --locale es-MX --dry-run
pnpm dataforseo -- quick keyword-overview --keyword "uno,dos" --market CL --org <uuid> --dry-run
pnpm dataforseo -- quick ranked-keywords --target ejemplo.com --market US --locale en-US --org <uuid> --dry-run
pnpm dataforseo -- quick competitors --target ejemplo.com --market PE --org <uuid> --dry-run
pnpm dataforseo -- quick backlinks --target ejemplo.com --org <uuid> --dry-run
pnpm dataforseo -- quick onpage-instant --target https://example.com --org <uuid> --dry-run
pnpm dataforseo -- quick onpage-audit --target example.com --org <uuid> --max-crawl-pages 100 --dry-run
```

Los presets sin estimador oficial verificable exigen `--estimated-usd` y `--max-usd` al ejecutar. El preview no
los exige y siempre muestra `estimateStatus: unavailable` cuando corresponde; nunca imprime un costo inventado.

### Elegir el carril correcto

| Necesidad                                                | Entrada recomendada                           | Familia / observación                                                |
| -------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Ver posición y features de una búsqueda                  | `quick organic`                               | SERP live; para lotes recurrentes prefiere task-based mediante `run` |
| Observar Google AI Mode y sus referencias                | `quick ai-mode`                               | SERP con `consumer=aeo`                                              |
| Volumen, intent y dificultad                             | `quick keyword-overview`                      | Labs; DataForSEO es lente estimada                                   |
| Keywords de un dominio / competidores                    | `quick ranked-keywords` / `quick competitors` | Labs                                                                 |
| Perfil agregado de enlaces                               | `quick backlinks`                             | Backlinks; usa `run` para referring domains, anchors o link gap      |
| Diagnóstico inmediato de una URL                         | `quick onpage-instant`                        | OnPage live                                                          |
| Crawl técnico completo                                   | `quick onpage-audit` + `task wait`            | OnPage asíncrono; JS/browser multiplican costo                       |
| Tecnologías o WHOIS                                      | `run` después de `catalog search`             | Domain Analytics; no tiene preset dedicado                           |
| Respuestas/citas de ChatGPT, Claude, Gemini o Perplexity | presets `*-response`                          | AI Optimization; modelo vivo obligatorio                             |
| Superficie real de ChatGPT/Gemini                        | presets `*-scraper`                           | AI Optimization Scraper                                              |
| Demanda proxy para preguntas AI                          | `quick ai-keyword-volume`                     | Estimación derivada; no es frecuencia observada en LLMs              |
| Menciones longitudinales                                 | `quick llm-mentions`                          | Cobertura depende de plataforma y mercado                            |

`quick` sólo cubre operaciones frecuentes. Para cualquier otra ruta autorizada usa `catalog describe` y `run`;
no conviertas la ausencia de preset en permiso para usar `curl`.

### Keyword research compuesto

`research` encadena descubrimiento, enriquecimiento y validación sin bajar todo el universo a SERP. Por defecto
usa Suggestions + Related; agrega Keywords for Site y Competitors cuando recibe `--target`. `keyword_overview`
enriquece hasta 700 candidatas y SERP Standard valida sólo las finalistas aprobadas. Live y AI Overview son
opt-in.

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeonce.org \
  --limit 50 \
  --candidate-limit 500 \
  --serp-limit 10 \
  --serp-mode standard \
  --page-size 100 \
  --max-pages 2 \
  --dry-run
```

El preview muestra el plan, el modo SERP, el checkpoint editorial y una estimación conservadora. La ejecución
exige un checkpoint persistente, porque un POST aceptado nunca se vuelve a enviar automáticamente:

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeonce.org \
  --org <uuid> \
  --max-usd 0.25 \
  --checkpoint /tmp/keyword-research.checkpoint.json \
  --yes \
  --out /tmp/keyword-candidates.json \
  --csv /tmp/keyword-candidates.csv
```

La primera pasada se detiene antes de SERP con `outcome: awaiting_finalist_approval`. Revisa el CSV y crea un
archivo JSON como éste:

```json
[
  {
    "keyword": "agencia seo con ia",
    "intent": "commercial",
    "category": "seo-aeo",
    "businessPriority": 5,
    "existingCoverage": "gap",
    "approved": true
  }
]
```

Reanuda sin recomprar Suggestions, Related ni Overview:

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeonce.org \
  --org <uuid> \
  --max-usd 0.25 \
  --resume /tmp/keyword-research.checkpoint.json \
  --finalists-file /tmp/finalistas.json \
  --yes \
  --out /tmp/keyword-research.json \
  --csv /tmp/keyword-research.csv
```

`--approve-ranked-finalists` permite aprobar explícitamente el ranking automático, pero no es implícito en
`--yes`. La tupla de selección prioriza aprobación, intención, categoría, prioridad de negocio y brecha de
cobertura; el volumen sólo desempata después. `--cache-max-age-hours` controla la frescura de métricas reutilizadas.

El CSV final es una matriz auditable: métricas, intención, gobernanza, URLs propias/competidoras, dominios,
features, PAA, presencia/citas de AI Overview y evidencia con endpoint/task/fecha. El JSON conserva además las
respuestas crudas. Missing, `null`, cero, no solicitado, sin datos y error no se colapsan.

Para recuperar una task Standard pendiente, repite el mismo comando con `--resume`; el task ID se guarda justo
después de `task_post`. No vuelvas a ejecutar con un checkpoint nuevo. Usa `--serp-mode live` sólo cuando la
latencia lo justifique y `--load-ai-overview` sólo si el objetivo requiere ese bloque y el preview muestra el
multiplicador.

`--include-ideas` añade `keyword_ideas`, pero sólo debe usarse con seeds de una categoría homogénea: una entidad
dominante puede arrastrar una categoría válida pero ajena. Los límites son muestra y control de costo, nunca una
afirmación de exhaustividad.

### Research en superficies AI

Primero consulta los modelos vivos; el nombre no se hardcodea porque el catálogo rota:

```bash
pnpm dataforseo -- run /v3/ai_optimization/chat_gpt/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/claude/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/gemini/llm_responses/models --yes
pnpm dataforseo -- run /v3/ai_optimization/perplexity/llm_responses/models --yes
```

Los cuatro GET son gratuitos y no requieren `--org`. Presets de las cuatro capacidades principales:

```bash
pnpm dataforseo -- quick chatgpt-response --prompt "¿Qué marcas recomiendas?" --model <modelo-vivo> --web-search --market CL --dry-run
pnpm dataforseo -- quick gemini-scraper --keyword "mejores agencias digitales" --market MX --dry-run
pnpm dataforseo -- quick ai-keyword-volume --keyword "seo con ia,visibilidad en chatgpt" --market CL --dry-run
pnpm dataforseo -- quick llm-mentions --target ejemplo.com --platform google --market CL --dry-run
```

También existen `claude-response`, `gemini-response`, `perplexity-response` y `chatgpt-scraper`. Las 53 rutas
AI Optimization son accesibles por `run`, incluidos `task_post`, `tasks_ready` y `task_get`. Para ejecutar un
POST real agrega `--org`, `--estimated-usd`, `--max-usd` y `--yes`; el preview no necesita una organización.
`--max-usd` valida la estimación antes de llamar, pero DataForSEO no ofrece un hard cap por request.

`llm_responses` exige `max_output_tokens`. `llm_mentions` exige `platform=chat_gpt|google`: mezclar ambas
plataformas produce escalas y coberturas incomparables. ChatGPT Mentions sólo admite US/en; Google usa el mercado
declarado. AI Keyword Data es un proxy estadístico derivado de búsquedas, no demanda observada dentro de un LLM.

Para una comparación multi-modelo, conserva una fila por plataforma/modelo/mercado/fecha y separa citas observadas
de preguntas propuestas. No mezcles una respuesta de API con la interfaz de consumidor: `llm_responses` y
`llm_scraper` observan superficies distintas. Los `fan_out_queries` y `brand_entities` del proveedor son evidencia
para análisis de entidades; no son un score propio de Greenhouse.

`ai-research` automatiza ese panel sin mezclar las superficies. Copia
[`dataforseo-ai-research-panel.example.json`](dataforseo-ai-research-panel.example.json), consulta los `/models`
gratuitos y reemplaza cada modelo antes del preview. Cada lane declara su estimación por task porque el pricing
depende del endpoint y modelo.

```bash
pnpm dataforseo -- ai-research \
  --panel /tmp/panel-ai.json \
  --dry-run

pnpm dataforseo -- ai-research \
  --panel /tmp/panel-ai.json \
  --org <uuid> \
  --max-usd 0.25 \
  --checkpoint /tmp/panel-ai.checkpoint.json \
  --yes \
  --out /tmp/panel-ai.json.out \
  --csv /tmp/panel-ai.csv
```

El resultado separa `result.api` de `result.consumer` y normaliza query, plataforma, modelo, mercado, respuesta,
citas, `fanOutQueries`, `brandEntities`, menciones, task IDs, costo y procedencia. `--resume` reutiliza únicamente
requests con el mismo digest de panel, organización y TTL. Este comando es research local, no el pipeline
recurrente de TASK-1651-B.

## Endpoint genérico

```bash
pnpm dataforseo -- run post:serp.google.organic.live.advanced \
  --file /tmp/tasks.json \
  --dry-run

printf '[{"keyword":"efeonce","location_code":2152,"language_code":"es"}]' | \
  pnpm dataforseo -- run /v3/serp/google/organic/live/advanced --stdin --dry-run
```

El input puede ser objeto o arreglo. `--out` crea un archivo nuevo y falla si ya existe para no sobrescribir
evidencia. La salida JSON conserva fecha, superficie, endpoint, organización si existe, task IDs/status, costo,
latencia y respuesta.

Flags comunes:

| Flag                  | Efecto                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| `--dry-run`           | Genera preview sin llamar al proveedor                                                 |
| `--yes`               | Confirma ejecución; sin este flag una operación pagada sigue en preview                |
| `--org <uuid>`        | Atribuye gasto y habilita entitlement; obligatorio para POST no-SERP y para `research` |
| `--consumer seo\|aeo` | Clasifica el gasto; los presets eligen el valor coherente, `run` permite declararlo    |
| `--estimated-usd <n>` | Estimación explícita cuando no existe calculador verificable                           |
| `--max-usd <n>`       | Ceiling de preflight; no limita el cargo dentro del proveedor                          |
| `--timeout-ms <n>`    | Timeout de transporte                                                                  |
| `--out <ruta>`        | Escribe el artefacto JSON con creación exclusiva                                       |

Antes de un `run`, comprueba los campos obligatorios con `catalog describe`. La validación local comprueba forma
básica, requireds y batch limit; el proveedor sigue siendo la autoridad sobre enums, condiciones y formas anidadas.

## Tasks asíncronas

1. Ejecuta `task_post` una sola vez y conserva el ID.
2. Consulta `tasks_ready` o el `task_get` descrito en el catálogo.
3. Para polling acotado:

```bash
pnpm dataforseo -- task wait <id-del-endpoint-task-get> \
  --task-id <uuid-provider> \
  --timeout-ms 120000 \
  --poll-ms 5000
```

El polling sólo hace GET. Nunca repite `task_post`. Códigos `20100`, `40601` y `40602` son `pending`; `20000`
es éxito; `>=40000` distinto de los pendientes es error de task. HTTP 200 por sí solo no prueba éxito.

## Exit codes

| Código | Significado                                        |
| -----: | -------------------------------------------------- |
|      0 | éxito o preview válido                             |
|      2 | uso/payload/validación inválida                    |
|      3 | bloqueado por allowlist, entitlement o presupuesto |
|      4 | error de task del proveedor                        |
|      5 | error HTTP/transporte                              |
|      6 | task exitosa sin datos                             |
|      7 | task pendiente                                     |

## Cobertura

| Plano                       |                       Cobertura 2026-09-28 |
| --------------------------- | -----------------------------------------: |
| Inventario oficial          |                              545 endpoints |
| SERP ejecutable             |                                        160 |
| Labs ejecutable             |                                         45 |
| Backlinks ejecutable        |                                         22 |
| OnPage ejecutable           |                                         28 |
| Domain Analytics ejecutable |                                         12 |
| AI Optimization ejecutable  |                                         53 |
| Otras familias              | catalogadas; ejecución bloqueada con razón |

La cifra cambia cuando cambia la documentación. Ejecuta `catalog:sync`, revisa el diff y no conviertas un cambio
de catálogo en ampliación de autorización.

## Limitaciones y estado operativo

- `--max-usd` frena cada siguiente request contra costo real acumulado + estimación incremental. Sigue sin ser un
  hard cap transaccional dentro de DataForSEO: una respuesta individual puede costar más de lo estimado.
- Checkpoints y cache son locales. Debes protegerlos como evidencia operativa y conservar el mismo archivo para
  reanudar; cambiar plan, panel u organización falla cerrado.
- La paginación está acotada por `--max-pages`; una muestra sigue sin demostrar exhaustividad.
- El ranking de finalistas es una ayuda determinista, no una decisión editorial ni un score de oportunidad.
- Standard reduce costo de lotes, pero puede quedar pending y requerir `--resume`.
- La CLI cataloga endpoints fuera del allowlist, pero no puede ejecutar Keywords Data, Trends, Content Analysis,
  Business Data u otras familias sin una ampliación gobernada.
- `ai_optimization` está integrado y el CHECK quedó aplicado y validado el 2026-09-28. Un canary API con techo
  USD 0,012 costó USD 0,0101 y dejó una llamada `consumer=aeo`, `cost_basis=invoiced` en el ledger. Repetirlo con
  `--resume` reutilizó el checkpoint sin costo incremental. Esta evidencia no certifica cada modelo ni la consumer
  surface: usa preview, consulta `/models` y mantén un techo explícito para cada nueva combinación.
- No existe captura recurrente AI, snapshot, reader, MCP ni cron por el solo hecho de que la CLI pueda ejecutar una
  ruta. Esos consumers pertenecen al rollout de `TASK-1651-B`.
