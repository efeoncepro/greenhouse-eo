# Operar el top-N del SERP y el descubrimiento de competidores (TASK-1699)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-28 por Claude (TASK-1699)
> **Ultima actualizacion:** 2026-08-28 por Claude
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §3 y §4.2

## Para qué sirve

El rank capture diario ya compra el SERP completo hasta la posición 20 de cada keyword
seguida — y hasta hoy se quedaba con **una** fila (la nuestra) y descartaba ~19. Esta
capacidad persiste **todas** las filas del SERP ya pagado (**costo marginal cero**: cero
llamadas nuevas) y con esa serie responde dos cosas:

1. **Quién ocupa cada ranura del SERP de tus keywords, día a día** (dominio, URL, tipo de
   bloque: orgánico, AI Overview, PAA, video, local pack…).
2. **Qué dominios compiten de verdad por tu intención**: candidatos a competidor por
   recurrencia medida (aparece en ≥3 keywords y ≥5 días en la ventana de 30), con evidencia.

⚠️ **Por qué no puede esperar**: el SERP de ayer NO se recompra. Cada día con la escritura
apagada pierde ~620 observaciones de mercado para siempre. Y ⚠️ **no se le muestra al
cliente**: es comparativa competitiva (auditoría §7) — uso interno de Efeonce.

## Antes de empezar

- Módulo SEO activo (`GROWTH_SEO_ENABLED=true`) y org con assignment `seo_v2`.
- **Estado de rollout vigente (2026-08-28, tarde):** flag `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED`
  **ON y VIVO en el worker** (revisión activa `ops-worker-00610-kc8`, deployada desde develop el
  mismo día). **El día 1 de la serie es el 2026-08-29** (cron 05:00 CLT); el top-N del 28 y
  anteriores no existe y no se recompra — estructural. Lectura: staging Vercel ON (custom env
  `staging`); Production se prende con el release en curso.
- Un dominio en el top-N es una **observación**; "X es competidor" es una **declaración
  humana** (TASK-1662). El descubrimiento propone, nunca declara.

## Paso a paso

### 1. Leer la serie del top-N

```bash
curl -s "$BASE/api/admin/growth/seo/serp-top-results?seoTargetId=seot-…&keyword=pintura&limit=100"
```

Cada fila es una ranura fechada (`rankAbsolute` — la clave; `rankGroup` es la posición
dentro de su bloque y se repite entre bloques), con su `itemType`, dominio, URL y título.
`hasMore=true` declara que el límite cortó. También: tool MCP `get_seo_serp_top_results`
y lane ecosystem `serp-top-results` (sólo bindings internal).

### 2. Descubrir candidatos a competidor

```bash
curl -s "$BASE/api/admin/growth/seo/competitor-candidates?seoTargetId=seot-…"
```

Devuelve dominios que superan los umbrales (30 días / 3 keywords / 5 días — constantes
versionadas, ajustables por query param) con `keywordsCount`, `daysCount`,
`medianPosition`, `bestPosition`, `alreadyDeclared` y un **`proposalRef` sugerido**.
Lista vacía con la serie joven (<5 días de captura) es lo esperado, no un error.

### 3. Confirmar (decisión humana) — el loop propose → confirm → execute

Revisar los candidatos con criterio de negocio (V1 **no filtra** plataformas como
marketplaces/Wikipedia/YouTube a propósito: se muestran con su evidencia). Para declarar:

```bash
curl -s -X POST "$BASE/api/admin/growth/seo/competitors/declare" \
  -H 'Content-Type: application/json' \
  -d '{"seoTargetId": "seot-…", "domains": ["competidor.cl"], "proposalRef": "<el proposalRef del candidato, verbatim>"}'
```

Declarar es un **compromiso de gasto** (la cobertura del gap de TASK-1662 paga por cada
competidor vigente por ciclo). Un agente jamás declara por su cuenta.

### Secuencia de encendido (rollout) — pasos 1–2 COMPLETADOS el 2026-08-28

1. ✅ Deploy del ops-worker (llegó con el push a develop; deploy.sh declara el flag ON).
2. ✅ Verificado en la revisión ACTIVA (`ops-worker-00610-kc8`): `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=true`.
3. Dejar correr el cron `ops-seo-rank-capture` (05:00 CLT). Verificar: ~20 filas por
   keyword del día; exactamente una `is_own_domain=true` donde rankeamos (su `rankGroup`
   coincide con `seo_rank_snapshots.position`); 🔴 **`provider_cost` del día IDÉNTICO al
   baseline previo** — la prueba de que el costo marginal es cero.
4. Re-correr el cron el mismo día = no-op (cero filas nuevas).
5. Agregar la env var en Vercel (lectura) y verificar lane + tool MCP.
6. Señal `seo.serp_top_results.coverage` en verde en `/admin/operations`.
7. **A los ≥5 días**: revisar los candidatos de Berel con el operador ANTES de declarar.

## Qué significan los estados

| Estado | Significado |
|---|---|
| Serie sin días viejos | Estructural: la serie sólo existe desde el flip — no hay backfill posible. |
| `hasMore = true` | El límite cortó; acotar con keyword/from/to. |
| Candidatos vacíos (serie joven) | Faltan días de captura (umbral mínimo 5) — hecho, no error. |
| señal `coverage` en `warning`/`error` | Día(s) con snapshot de rank y SIN top-N: flag apagado en el worker, parser degradado o respuesta anómala. **Esos días se pierden para siempre.** |

## Qué no hacer

- **No mostrar el top-N ni los candidatos al cliente** (§7). Uso interno.
- **No declarar competidores desde un agente sin confirmación humana.**
- **No revertir la migración con datos**: la serie no se recompra — el rollback correcto es
  flag OFF (la captura de rank no se afecta).
- **No usar `rankGroup` como clave** de nada: se repite entre bloques. La ranura es
  `rankAbsolute`.
- **No agregar llamadas al proveedor** "aprovechando" esta capacidad: el contrato es costo
  marginal CERO (test de no-regresión sobre `buildSerpTask` lo rompe).

## Problemas comunes

- **Señal en `error` ("la persistencia murió")** → revisar el flag en la revisión activa
  del worker (`--set-env-vars` destructivo pudo borrarlo) — cada día así es pérdida
  irrecuperable.
- **Un candidato obviamente irrelevante (marketplace/Wikipedia)** → es el diseño V1:
  ignorarlo al confirmar; el filtro de plataformas es decisión informada de la 2.ª
  iteración.
- **La query de recurrencia se pone lenta** → disparador declarado de la política de
  retención (5M filas o 500 ms): archivar a BigQuery, nunca borrar.

## Referencias técnicas

- Parser/writer: `src/lib/growth/seo/serp-top-results.ts` · descubrimiento:
  `src/lib/growth/seo/competitor-discovery.ts` · cableado: `rank-capture.ts`
- Sanity live: `scripts/growth/_sanity-serp-top-results.ts` (9 checks, rollback sin residuo)
- Spec: `docs/tasks/in-progress/TASK-1699-growth-seo-persist-serp-top-n-already-paid.md`
