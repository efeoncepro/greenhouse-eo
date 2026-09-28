# DataForSEO CLI — validación productiva transversal del 2026-09-28

## Resumen ejecutivo

Esta auditoría consolida las pruebas pagadas ejecutadas durante la validación de `pnpm dataforseo` sobre tres
tipos de trabajo: observación competitiva de marcas, exploración de categorías de servicios y research editorial
gobernado. La batería recorrió retail, servicios SEO y servicios creativos para comprobar que el contrato no está
acoplado a una industria.

Los resultados verificaron el transporte, la normalización multisuperficie, la comparación desktop/mobile, los
checkpoints, la aprobación humana de finalistas y la contención progresiva de costo. También expusieron defectos
reales que se corrigieron y volvieron a probar: batch inválido en Organic Live Advanced, semántica incorrecta de
frescura AI, pérdida de seeds sin volumen, parseo incompleto de PAA, stdout excesivo y cierre del pool PostgreSQL.

La suma conocida de las corridas documentadas aquí fue **USD 0,25402**. Incluye pruebas fallidas y repeticiones de
regresión; no es una proyección de costo productivo ni incluye los canaries de AI Optimization documentados por
separado.

## Naturaleza y límites de la evidencia

- **OBSERVADO:** una respuesta de DataForSEO fechada, limitada por mercado, idioma, dispositivo, depth y superficie.
- **ESTIMADO:** volumen, CPC, dificultad e intención calculados por el proveedor; no son medición de primera parte.
- **INFERIDO:** oportunidad editorial derivada de las observaciones; requiere validar oferta, cobertura, GSC y
  canibalización antes de producir contenido.
- `rank_group` es posición dentro del bloque orgánico; `rank_absolute` incluye otros bloques de la SERP.
- `not_observed_in_captured_organic` no significa ausencia en Google ni autoriza inferir la posición siguiente.
- Mención textual, enlace directo, cita formal de AI Overview y Shopping son señales distintas.
- Los artefactos raw se escribieron en `/tmp` durante la sesión y eran deliberadamente efímeros. Ya no están
  disponibles. Este documento conserva task IDs, costos, resultados normalizados y decisiones; futuras pruebas
  que deban auditarse fuera de la sesión deben escribir su `--out`, `--csv` y `--checkpoint` en una ubicación
  persistente gobernada.

## Matriz de ejecución

| Prueba | Superficie | Evidencia principal | Costo real |
| --- | --- | --- | ---: |
| Falabella · `iphone 18 pro max` | Google CL, desktop, Live Advanced | task `09281129-1987-0139-0000-e6c0ebe8ceb2`, `20000` | USD 0,002 |
| Paris/Cencosud · misma consulta | Google CL, desktop, Live Advanced | task `09281134-1987-0139-0000-1f9bbed510af`, `20000` | USD 0,002 |
| Primer `serp-compare` compartido | Google CL, desktop | task `09281144-1987-0139-0000-483a6615ee43`, `20000` | USD 0,002 |
| Regresión desktop/mobile que expuso defectos | Google CL, desktop/mobile | tasks `09281148-…3a4ed15da042` y `09281148-…0a1b5d5d8390`, `20000` | USD 0,007 |
| Smoke final corregido desktop/mobile | Google CL, desktop/mobile | tasks `09281157-…77d35f5a773f` y `09281157-…91c4b65ee202`, `20000` | USD 0,0055 |
| `agencia seo en chile` | Google CL, desktop/mobile | tasks `09281201-…5da44c452e4b` y `09281202-…9870262dc75c`, `20000` | USD 0,007 |
| `agencia creativa en chile` | Google CL, desktop/mobile | tasks `09281210-…83f277b5d6ad` y `09281210-…4e0ed14decc9`, `20000` | USD 0,007 |
| Research editorial · servicios creativos | Labs + SERP Standard + competitors | run `e2689fbf-9946-4954-b705-16a888495218` | USD 0,22152 |

Los IDs abreviados de la tabla se desarrollan en las secciones siguientes.

## 1. Falabella y Paris: lectura de una misma consulta

### Falabella

La primera captura de `iphone 18 pro max`, Chile (`location_code=2152`), español y desktop terminó a las
11:29 UTC con task `09281129-1987-0139-0000-e6c0ebe8ceb2`, estado `20000` y costo USD 0,002.

- Falabella apareció como orgánico `rank_group=3`, `rank_absolute=4`.
- La URL observada fue `https://www.falabella.com/falabella-cl/collection/iphone-18`.
- Entel y Apple aparecieron antes en el bloque orgánico.
- Falabella tuvo enlace directo dentro del AI Overview, pero no una entrada formal en `references[]`.
- Shopping mostró iPhone 18 Pro Max 256 GB a CLP 1.699.990 y en stock.

### Paris/Cencosud

La captura independiente posterior usó task `09281134-1987-0139-0000-1f9bbed510af`, estado `20000` y costo
USD 0,002.

- Paris no fue observado entre los ocho resultados orgánicos capturados. No se infirió una posición 9.
- Falabella cambió a orgánico `rank_group=4`, `rank_absolute=6`, una muestra de la volatilidad entre snapshots.
- Paris apareció como enlace directo en el AI Overview cacheado y como resultado Shopping.
- La URL comercial observada fue
  `https://www.paris.cl/605594999.html?utm_source=google&utm_medium=organic&utm_campaign=organicshopping`.
- La oferta observada estaba en stock a CLP 1.699.990 y la SERP incluyó la related search
  `iPhone 18 Pro Max Paris`.
- La señal no era `ai_overview_reference`; el bloque devolvió `asynchronous_ai_overview=false`.

Estas dos capturas demostraron por qué un informe no debe colapsar posición orgánica, presencia comercial y
presencia AI en una única noción de “posicionamiento”.

## 2. `serp-compare`: implementación, defecto y regresión

El primer smoke del comparador transversal reutilizó una sola captura para dos entidades. La task
`09281144-1987-0139-0000-483a6615ee43` terminó `20000` por USD 0,002:

- Falabella: orgánico `rank_group=3`, `rank_absolute=5`.
- Paris: `not_observed_in_captured_organic`.
- Ambas entidades: mención textual en el AI Overview, sin enlace ni cita atribuible en esa captura.

La repetición desktop/mobile expuso que Organic Live Advanced sólo acepta una task por request. El intento
combinado produjo un `40000` para mobile. Al serializar query/dispositivo, las tasks
`09281148-1987-0139-0000-3a4ed15da042` y `09281148-1987-0139-0000-0a1b5d5d8390` terminaron `20000`, con costo
total USD 0,007. Ninguna marca apareció dentro de 16 orgánicos desktop ni 15 mobile; ambas fueron mencionadas
en AI Overview sin enlace atribuible y ambas aparecieron en Shopping a CLP 1.699.990.

La misma prueba encontró un segundo defecto: aunque se solicitaba carga AI asíncrona, el proveedor devolvía
`asynchronous_ai_overview=false` y la CLI rotulaba la intención del request como frescura del resultado.

Después de las correcciones, el smoke final ejecutó dos requests secuenciales:

- desktop `09281157-1987-0139-0000-77d35f5a773f`;
- mobile `09281157-1987-0139-0000-91c4b65ee202`.

Ambas tasks terminaron `20000`. El costo real fue USD 0,0055 frente a una estimación conservadora de USD 0,016
y la matriz produjo cuatro filas normalizadas. Paris apareció enlazada/mencionada en AI Overview y en Shopping;
Falabella apareció en Shopping sin enlace AI. Ninguna fue observada en el bloque orgánico final capturado. Ambos
AI Overviews quedaron correctamente clasificados como `cached_provider_result`.

## 3. Categoría `agencia seo en chile`

La prueba usó Google Chile, español, depth 20, desktop y mobile, con carga de AI Overview. Las tasks
`09281201-1987-0139-0000-5da44c452e4b` y `09281202-1987-0139-0000-9870262dc75c` terminaron `20000`, a
USD 0,0035 cada una.

| Posición | Desktop | Mobile |
| ---: | --- | --- |
| 1 | exequielaraya.cl | exequielaraya.cl |
| 2 | postedin.com | nexbu.com |
| 3 | nexbu.com | postedin.com |
| 4 | mmglatam.com | seoaustral.com |
| 5 | seoaustral.com | agenciaseochile.cl |
| 6 | marketing4ecommerce.cl | marketing4ecommerce.cl |
| 7 | smtpchile.cl | mmglatam.com |
| 8 | agenciaseology.com | smtpchile.cl |
| 9 | cleverdigital.cl | agenciaseology.com |
| 10 | agenciaseochile.com | cleverdigital.cl |

El local pack observado incluyó Posicionamiento Web SEO Chile (4,8/129), SEO Austral (4,9/29) y Agencia SEO
Maad Chile (4,9/27). Ningún dispositivo devolvió AI Overview. Las PAA capturadas preguntaron por la mejor agencia,
cuánto cobra un SEO, cuánto cuesta contratar SEO y qué es una agencia SEO.

Corrección de evidencia: el reporte conversacional inicial buscó `efeonce.org`, pero el dominio público canónico
es `efeoncepro.com`. Además, esta corrida rápida no recibió una entidad/target canónico. Por eso **no demuestra
ausencia ni cobertura orgánica de Efeonce**; sólo conserva el top observado y sus features. Una medición de
cobertura propia debe repetirse con `efeoncepro.com` declarado.

## 4. Categoría `agencia creativa en chile`

Las tasks desktop `09281210-1987-0139-0000-83f277b5d6ad` y mobile
`09281210-1987-0139-0000-4e0ed14decc9` terminaron `20000`, a USD 0,0035 cada una.

- Top 5 desktop: ranking de agencias en Instagram, Cámara de Empresas Creativas, Nexbu, Agencia Raya y Relevant.
- Top 5 mobile: Fuego Creativo, Behance/Hey Diseño, Galio Estudio, Instagram/Blup y Buena Vibra.
- Desktop también mostró Inédita #6, Müller y Pérez #7 y MILA #8.
- Local pack en ambos dispositivos: Alma Creativa, Publicidad Creativa Chile y Dalú Agencia Creativa.
- Desktop devolvió un AI Overview cacheado con referencias a Agencia Raya, Müller y Pérez, Apolo y Cámara de
  Empresas Creativas; mobile no devolvió AI Overview.
- Las PAA cubrieron mejores agencias creativas, definición de agencia, mejores agencias de branding, precio de
  una agencia de branding y agencias de marketing reconocidas.

Aplica la misma corrección de identidad de la prueba anterior: no se entregó `efeoncepro.com` como target y el
reporte inicial revisó el dominio equivocado. Esta corrida no se usa para afirmar cobertura propia.

## 5. Flujo productivo para decidir qué redactar sobre servicios creativos

El research partió de cinco seeds: `servicios creativos`, `agencia creativa`, `branding para empresas`,
`producción de contenido` y `diseño de marca`; mercado CL/es; target `efeoncepro.com`; 100 candidatas y cinco
finalistas. El dry-run estimó USD 0,2394.

La primera fase quedó en `awaiting_finalist_approval` con:

- run ID `e2689fbf-9946-4954-b705-16a888495218`;
- digest `e04b36bea028c4abc66d461bf7e1e4d625ab18af978a951378cca77bed1e368d`;
- 100 candidatas;
- costo observado al checkpoint: USD 0,17724.

El operador aprobó las cinco seeds como finalistas, declarando intención, categoría, prioridad de negocio y
cobertura. SERP Standard se envió una sola vez; tras seguir pendiente a los 120 segundos, se reanudó desde el
mismo checkpoint sin volver a comprar discovery ni reenviar tasks. El costo final fue USD 0,22152.

Tasks SERP finales:

- `09281216-1987-0066-0000-e0c33c735def`
- `09281216-1987-0066-0000-931f0f457eb0`
- `09281216-1987-0066-0000-0732c95934fe`
- `09281216-1987-0066-0000-8d07793c332b`
- `09281216-1987-0066-0000-72b0249a1e17`

La task de competidores fue `09281218-1987-0386-0000-525b2c8f0f30`.

| Keyword | Volumen estimado | CPC estimado | KD | Intención relevante |
| --- | ---: | ---: | ---: | --- |
| agencia creativa | 140 | 2,31 | 1 | proveedor: navegacional; operador: comercial |
| diseño de marca | 110 | 1,94 | 0 | informativa |
| branding para empresas | 10 | 5,20 | — | comercial |
| servicios creativos | 10 | sin dato | — | comercial |
| producción de contenido | `missing` | sin dato | — | declarada por el operador |

No se observó una URL propia de `efeoncepro.com` en el bloque orgánico capturado de ninguna finalista. Cada
consulta quedó con cuatro PAA después de corregir el parser. Hubo AI Overview para `agencia creativa`,
`branding para empresas`, `servicios creativos` y `producción de contenido`; no para `diseño de marca`.

La salida permite priorizar una arquitectura, no redactar automáticamente por volumen:

1. landing de agencia o servicios creativos para la intención de proveedor;
2. página de branding para empresas;
3. guía informativa de diseño de marca;
4. página o guía de producción de contenido;
5. contenidos de apoyo sobre selección, proceso y precio derivados de PAA.

Antes de producir, se debe contrastar cobertura real del sitio, oferta vigente, GSC y canibalización.

## 6. Defectos encontrados, corrección y revalidación

| Defecto observado | Corrección | Evidencia posterior |
| --- | --- | --- |
| Organic Live Advanced rechazó el batch multidispositivo | un request por query/dispositivo, agregado posterior | smoke final: dos tasks `20000`, cuatro filas |
| La intención async se confundía con frescura AI | `aiOverviewAsyncRequested` conserva request; `aiFreshness` deriva de la respuesta | ambos resultados `cached_provider_result` cuando el proveedor devolvió `false` |
| Tasks fallidas podían parecer ausencia | sólo tasks `20000` producen filas normalizadas | el raw conserva el error sin falsas filas |
| Seeds manuales sin volumen podían caer fuera de `candidateLimit` | las seeds declaradas sobreviven al ranking de candidatas | cinco seeds llegaron al checkpoint y matriz final |
| PAA anidada no se reconocía; un arreglo amplio incluía títulos de respuestas | parser restringido a `people_also_ask_element` y tipos exactos | cuatro preguntas por finalista sin títulos expandidos |
| `--out` emitía cerca de 1,8 MB también por stdout | recibo compacto cuando existe `--out` o `--csv` | raw sólo en artefacto; terminal legible |
| La CLI retenía abierto el pool PostgreSQL | cierre explícito al finalizar | proceso termina después de escribir salida |
| El cierre usó inicialmente un `source` no permitido | llamada canónica `closeGreenhousePostgres()` | `pnpm typecheck` en cero errores |

Commits de la secuencia:

- `09d1b61793b9961e73405d47dc500f01d7c486b1` — comparador SERP transversal.
- `0be2cd2e3` — serialización y semántica de regresión del comparador.
- `59d3d4bf0` — endurecimiento del flujo editorial, PAA, seeds, stdout y cierre.
- `12e92ac75` — motivo canónico de cierre PostgreSQL y typecheck recuperado.

La verificación final registrada incluyó ESLint en `scripts/dataforseo` y `src/lib/ai` sin errores, 77 tests en
15 archivos, skills espejo idénticas y `pnpm typecheck` con exit 0.

## 7. Qué quedó demostrado

- La CLI sirve para comparar entidades en cualquier sector; retail sólo fue el primer smoke.
- Un único SERP por query/dispositivo se reutiliza para todas las entidades, sin multiplicar costo por marca.
- Desktop y mobile pueden producir competidores, local packs y superficies AI diferentes.
- La ausencia dentro del depth capturado se reporta como límite de muestra, no como posición ni ausencia total.
- El flujo editorial conserva decisión humana, costo progresivo, checkpoints y reanudación sin recompra.
- Volumen `missing` se conserva como dato faltante; nunca se transforma en cero.
- DataForSEO aporta observación y estimación. GSC sigue siendo la fuente de primera parte para rendimiento propio.

## Reproducción segura

Para repetir una comparación, crea un panel con query, mercado, dispositivos y entidades canónicas; previsualiza
y luego ejecuta con un techo explícito:

```bash
pnpm dataforseo -- serp-compare --panel panel.json --dry-run
pnpm dataforseo -- serp-compare --panel panel.json --yes --max-usd 0.02 \
  --out evidence/serp-compare-YYYY-MM-DD.json \
  --csv evidence/serp-compare-YYYY-MM-DD.csv
```

Para investigación editorial, conserva tanto checkpoint como finalistas y salida persistente:

```bash
pnpm dataforseo -- research \
  --keyword "servicios creativos,agencia creativa,branding para empresas,producción de contenido,diseño de marca" \
  --market CL --locale es-CL --target efeoncepro.com \
  --serp-mode standard --checkpoint evidence/research.checkpoint.json \
  --dry-run
```

La sintaxis completa y los guardrails viven en el
[manual de uso](../../manual-de-uso/growth/dataforseo-cli.md); el contrato en el
[ADR de la CLI](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md).
