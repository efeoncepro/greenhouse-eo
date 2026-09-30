# TASK-1948 — Verificación de keywords relevantes por URL

Fecha: 2026-09-30. Runtime: CLI local `pnpm dataforseo` 1.1.0. Alcance: tooling de operador;
no cambia runtime de Vercel/Cloud Run, schema, flags, MCP ni schedulers.

## Resultado

Implementados `site-keywords` y `quick keywords-for-site` para dominio, subdominio o URL con tipo declarado.
La consulta conserva la relevancia del proveedor y sus métricas Ads; no emite posiciones SEO, scores ni
promesas de conversión. JSON conserva sujeto, mercado, source, fecha, raw tasks, cobertura y costo;
CSV conserva keywords, categorías, series y task ID y se usa con el JSON compañero.

La implementación reutiliza transporte, entitlement SEO, spend recorder y checkpoint existentes.
Durante la implementación no se ejecutó un POST facturable; las pruebas reales posteriores se registran abajo.
La capacidad local no requiere deploy. Cierre en el checkout compartido; sin push ni deploy.

**Estado vigente después de la prueba corregida:** integración real de Berel MX verificada con 20 filas en
dos páginas, JSON/CSV coincidentes y resume sin recompra. Costo mexicano USD 0,0284 reconciliado. Las
sugerencias contienen ruido editorial; no se ha medido impacto con GSC ni publicación. El país de la primera
captura se corrigió a México para el pedido del cliente; ese antecedente CL no fundamenta decisiones de Berel MX.
El [recibo durable de evidencia](evidence/task-1948/mexico-live-summary.json) conserva resultados, timestamps,
task IDs, readback de gasto y hashes de los originales, sin credenciales ni tokens de paginación.

## Evidencia del proveedor

- [Anuncio oficial](https://dataforseo.com/update/keywords-for-site-in-dataforseo-labs-api-now-supports-pages),
  publicado 2026-09-29: dominio, subdominio y página.
- [Contrato Keywords for Site](https://docs.dataforseo.com/v3/dataforseo_labs-google-keywords_for_site-live/):
  URL exige `https://` o `www.`; sin prefijo puede devolver el dominio completo.
- [Pricing Google Labs](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api): base
  USD 0,012/request + USD 0,00012/ítem; se fija `include_clickstream_data:false` para esta estimación.
- [Competitors Domain](https://docs.dataforseo.com/v3/dataforseo_labs-google-competitors_domain-live/):
  una URL no convierte su resultado en competencia por página. El nuevo flujo no compra ese endpoint.

No se encontró contrato sobre redirecciones, canonicalización, equivalencia de query/path o slash final.
El builder conserva la URL declarada y no certifica esas equivalencias. Scope reportado se distingue de
scope no reportado. Los hosts envían `include_subdomains:false` para no solicitar expansión adicional.

## Verificación local

| Verificación | Evidencia |
| --- | --- |
| Tests focales | 96 tests, 9 archivos: CLI, catálogo generator, presets, sujeto/relevancia, research existente, checkpoint, versión y transporte GET/POST |
| Integración del nuevo comando | 23 tests con proveedor/entitlement simulados y filesystem real temporal; cero acceso al proveedor/base |
| Regresión falsificada | Restituir temporalmente el parser anterior hace fallar el test de URL inline: `?a=b&c=d` se trunca a `?a`; fuente restaurada byte-for-byte |
| ESLint | Paths propios CLI, helper, preset, checkpoint y tests sin hallazgos |
| Typecheck | Config heredada de `tsconfig.json`, excluyendo únicamente `ai-generations` ajeno, exit 0 |
| Typecheck global | Bloqueado por 17 diagnósticos en `ai-generations/2026-09-30_deck-hubspot-piloto/v3/`; no se modificaron esos archivos |
| SemVer | Minor 1.1.0, 8 releases; nuevo helper dentro de `governedPaths`; `dataforseo:version:check` verde |
| Entry point real | Dry-run URL MX, dominio CL y subdominio PE, todos exit 0 y CLI 1.1.0; no factura |
| Revisión independiente | Tres subagentes: contrato primario, CLI/normalización y documentación; revisión adversarial adicional de gasto, alcance y resume |
| Gates focales | Skills espejo, task lint, SemVer y cierre documental sin warnings; QA gates advisory sobre paths propios |
| Contexto final | `docs:context-check:strict` verde, 0 errores/warnings; TASK-1948 en complete con aceptación y registro sincronizados |

El test de versión ahora valida SemVer y coherencia con la última release del registro, en lugar de
fijar para siempre `1.0.0`; los 96 tests fueron reejecutados después del bump a 1.1.0.
Se rotó una entrada antigua del changelog mediante el comando canónico y se preservó íntegramente el
detalle DataForSEO del 28/09 en el archivo mensual de Handoff con hash de integridad, dejando un pointer activo.

Comando de tests:

```bash
pnpm exec vitest run scripts/dataforseo/__tests__ \
  src/lib/ai/__tests__/dataforseo-site-keywords.test.ts \
  src/lib/ai/__tests__/dataforseo-cli-presets.test.ts \
  src/lib/ai/__tests__/dataforseo-keyword-research.test.ts \
  src/lib/ai/__tests__/dataforseo-research-checkpoint.test.ts \
  src/lib/ai/__tests__/dataforseo-cli-version.test.ts \
  src/lib/ai/__tests__/dataforseo-request.test.ts
```

Dry-run URL con query preservada:

```bash
pnpm dataforseo -- site-keywords --target-kind url \
  '--target=https://example.com/Articulo/?a=b&c=d' \
  --market MX --locale es-MX --limit 10 --max-pages 2 --dry-run
```

## Casos cubiertos y correcciones de revisión

- URLs sin prefijo, fragments, credenciales, puertos, wildcards, hosts codificados y parser repairs se rechazan.
- `missing`, `null`, cero e `invalid` no se confunden; categorías, tendencia y fecha sobreviven normalización.
- Tasks fallidas nunca producen keywords. Mismatch de target o múltiples result blocks conservan raw y omiten filas.
- Páginas siguientes usan sólo `limit` y `offset_token`; vacío, agotamiento, límite o token repetido paran la compra.
- Vacío contradictorio con `total_count` declara cobertura incompleta, nunca exhaustividad falsa.
- Techo progresivo y entitlement se evalúan antes de cada POST; `--estimated-usd` no reduce la base conservadora.
- Resume fresco cuesta cero; otra org/URL/plan se rechaza.
- Una respuesta terminal fallida, HTTP fallido o costo desconocido bloquea el checkpoint entero antes de
  recomprar incluso páginas anteriores expiradas. Se conserva `httpOk`, costo conocido/desconocido y raw.
- Costo desconocido no se convierte en cero: el recibo entrega `actualCostUsd:null` y requiere reconciliación.
- Un pending Live inesperado conserva estado/código al reanudar, sin resubmit.
- Archivos de salida se crean en modo exclusivo; con `--out`/`--csv`, stdout es un recibo compacto.
- CSV protege cadenas que podrían interpretarse como fórmulas en una planilla.

## Límites y siguiente uso

El techo de la CLI no es un hard cap dentro de DataForSEO. Los resultados son una muestra de una base
precomputada, no prueba de rankings, conversión ni cobertura exhaustiva de una URL. El TTL sólo aplica a
resultados exitosos reutilizables; la evidencia terminal no habilita reintentos silenciosos.

La prueba MX valida uso real del localizador de tiendas y revela sugerencias útiles junto a ruido. Para medir
impacto editorial, seleccionar candidatas para una URL concreta y contrastar con sus consultas GSC antes de
decidir una optimización; la prueba no autorizó publicación ni seguimiento recurrente. El typecheck global
requiere que el owner del deck ajeno resuelva sus diagnósticos.

## Antecedente CL — sustituido por la corrección a México

Después del cierre de implementación, el operador pidió probar la CLI buscando «mejor pinturería de Chile»
para Berel. Se mantuvo Chile como comparación explícita; PostgreSQL confirmó target Berel MX activo y CL
pausado. No se modificaron esos targets. La ausencia de gasto indicada arriba corresponde al cierre original.

- SERP Google Live Advanced, CL/es/desktop/depth 10: HTTP 200, task `20000`, USD 0,002.
  Primer resultado orgánico: video Easy Chile/Facebook; nota Publimetro Comercial 21/01/2022 en tercer lugar.
  Esto prueba visibilidad para esa captura, no calidad objetiva ni un ranking permanente.
- Keywords for Site URL `https://berel.com/ubica-tienda`, CL, limit 10/max-pages 2:
  HTTP 200/task `20000`, scope `matched`, 0 keywords, `no_data`, USD 0,012; sin segunda página innecesaria.
- URL específica de la nota Publimetro sobre Easy: HTTP 200/task `20000`, scope `matched`,
  0 keywords, `no_data`, USD 0,012. Sin inventar keywords o confundir falta de datos con fallo de transporte.
- Resume Berel: mismo task ID `09301324-1987-0398-0000-6f28a2703a74`, `reused:true`, incremental USD 0.
- Readback independiente del ledger: SERP 31 calls/USD 0,114 → 32/USD 0,116;
  Labs sin fila → 2 calls/USD 0,024. Total reconciliado USD 0,026, debajo del techo global USD 0,03.

Artefactos JSON/CSV/checkpoints y reporte fuera del repo:
`/Users/jreye/.codex/visualizations/2026/09/30/01a0f23e-8a14-7391-aa48-8c541482d8b7/dataforseo-berel/`.
Esta captura CL verifica transporte URL y resume de respuesta vacía. Al cierre de ese antecedente todavía
no había evidencia con filas reales; la prueba MX posterior cubre esa limitación. Sin commit/push/deploy.

## Corrección de mercado del operador — Berel México

El operador aclaró que la búsqueda debía ser mexicana y pidió repetirla. Esta prueba usa MX (`2484`)/es,
separada de la captura chilena; no se modifica ni reactiva ningún target.

- Consulta `mejor pinturería de México`, Google Organic Live Advanced / desktop / depth 10:
  HTTP 200/task `20000`, USD 0,002. Primeros orgánicos: blog PAQSA sobre PROFECO y estudio de PROFECO.
  `berel.com` ausente entre ocho orgánicos recibidos; `berelmexico.com` es otro hostname, sin atribución de propiedad.
- URL `https://berel.com/ubica-tienda`, MX, 10 filas/página y 2 páginas: ambas HTTP 200/task `20000`,
  scope `matched`, 20 filas JSON/CSV, USD 0,0264; muestra truncada (`hasMore:true`, `exhausted:false`).
- Candidatas: `pinturas berel cerca de mi` 33.100, `pinturas cerca de mi` 60.500,
  `pinturas berel los mochis` 140 y `pinturas berel más cercana` 40 búsquedas/mes estimadas MX.
  Son métricas Ads; no rankings ni visitas. Llegó ruido ajeno (hoteles, bancos, otras tiendas), requiere revisión.
  El `total_count` bruto 1.452.960 no se interpreta como keywords exclusivas ni demanda de Berel.
- Resume: mismos dos task IDs y mismas 20 keywords, ambas páginas reutilizadas, incremental USD 0.
- Readback ledger SEO/invoiced: Labs 2/USD 0,024 → 4/USD 0,0504; SERP 32/USD 0,116 → 33/USD 0,118.
  Repetición mexicana reconciliada: **USD 0,0284**, debajo del techo de USD 0,03.

Reporte `prueba-mexico.md`, JSON/CSV/checkpoint y resume en la carpeta de artefactos anterior. Queda probada
la paginación live con filas reales y su reutilización sin recompra. La calidad requiere selección editorial;
no se compraron páginas adicionales por el total_count. Sin commit/push/deploy.

## Propagación documental después de la prueba real

El operador pidió una revisión con subagentes y actualización de los dueños documentales. Tres agentes
verificaron los originales y dividieron ownership entre contrato/uso, skills y registros de cierre; root
revisó sus deltas, conservó el recibo durable y sincronizó auditoría, Handoff y changelog.

- Técnica: [ADR operador](../../architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md) e índice de decisiones.
- Funcional: [CLI de research](../../documentation/growth/dataforseo-research-cli.md).
- Operación: [manual CLI](../../manual-de-uso/growth/dataforseo-cli.md), con preview Berel MX reproducible.
- Oficio: `dataforseo-operator` (Labs §2.1a y pointer desde minería editorial), `seo-aeo`
  (módulo Content) y `berel-content-production` (módulo Planeación), espejos Codex/Claude.
- Continuidad: TASK-1948/plan, README/registro, EPIC-022, Handoff y changelog distinguen cierre original,
  prueba mexicana posterior y antecedente CL. Las cifras completas permanecen en esta auditoría/recibo.

`AGENTS.md`, `CLAUDE.md` y `project_context.md` ya enrutan esas skills y el ADR/CLI; no se amplió el router.
No cambió código, schema, permisos, captura productiva ni contrato MCP, por lo que no se modificaron manuales
servidos por MCP ni se creó release SemVer vacía. La comprobación preserva la versión 1.1.0/digest.
Gates proporcionales: mirrors, task lint, SemVer, links locales, integridad del recibo, diff check y closure
focal sin hallazgos; context strict se ejecuta al final de todas las ediciones. No se repitieron compras.
