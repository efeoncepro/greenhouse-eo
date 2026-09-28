# DataForSEO CLI — uso diario

> Alcance: herramienta local de operador/agentes. No despliega ni cambia flags.
> Catálogo verificado el 2026-09-28: 545 endpoints oficiales; 320 pertenecen a las seis familias ejecutables.

`pnpm dataforseo` es la entrada gobernada para research ad hoc. Usa el mismo transporte, allowlist, breaker,
entitlement y ledger que los consumers productivos; no es un SDK alternativo. La fuente rápida de sintaxis es:

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
enriquece hasta 700 candidatas y la SERP orgánica valida sólo las finalistas.

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeonce.org \
  --limit 50 \
  --candidate-limit 500 \
  --serp-limit 10 \
  --dry-run
```

El preview muestra el plan y una estimación conservadora agregada. Para ejecutar y guardar ambos formatos:

```bash
pnpm dataforseo -- research \
  --keyword "seo con ia,visibilidad en chatgpt" \
  --market CL \
  --target efeonce.org \
  --org <uuid> \
  --max-usd <techo-mayor-o-igual-a-la-estimacion> \
  --yes \
  --out /tmp/keyword-research.json \
  --csv /tmp/keyword-research.csv
```

La salida deduplica por keyword normalizada, conserva procedencia y distingue volumen ausente, `null` y cero.
Ordena primero las filas con volumen observado, sin fabricar un score de oportunidad. El JSON conserva las
respuestas por paso para revisar SERP, PAA y competidores; el CSV entrega la tabla de keywords enriquecida.

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

- `--max-usd` compara una estimación antes de la llamada. No es un hard cap transaccional de DataForSEO.
- `research` es una corrida local secuencial: no tiene checkpoint, caché, reanudación ni paginación automática.
  Un fallo tardío exige revisar los artefactos antes de repetir para no recomprar pasos.
- El CSV de `research` es una tabla de keywords. SERP, PAA, AI Overview y competidores permanecen en las respuestas
  crudas del JSON; el operador debe interpretarlos y conservar su fecha/procedencia.
- La selección de finalistas SERP prioriza volumen observado; no sustituye relevancia, intención, cobertura propia
  ni prioridad de negocio. `keyword_difficulty` tampoco equivale a una dificultad editorial total.
- El research orgánico compuesto usa SERP live. Para lotes de baja urgencia, descubre y usa el lifecycle
  task-based standard mediante `run` + `task wait` para reducir costo.
- La CLI cataloga endpoints fuera del allowlist, pero no puede ejecutar Keywords Data, Trends, Content Analysis,
  Business Data u otras familias sin una ampliación gobernada.
- `ai_optimization` está integrado en código y catálogo. La migración
  `20260928095506879_task-1651-ai-optimization-family.sql` sigue sin aplicarse en staging y producción al
  2026-09-28. Los GET gratuitos y previews están disponibles; no declares operativo el POST pagado AI hasta aplicar
  la migración y verificar CHECK, entitlement y fila de gasto en el ledger.
- No existe captura recurrente AI, snapshot, reader, MCP ni cron por el solo hecho de que la CLI pueda ejecutar una
  ruta. Esos consumers pertenecen al rollout de `TASK-1651-B`.
