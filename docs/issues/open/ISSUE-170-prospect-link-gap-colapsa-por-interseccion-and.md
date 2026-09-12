# ISSUE-170 — El link gap del diagnóstico de prospecto puede colapsar por intersección AND

## Ambiente

Runtime del carril de prospección (`src/lib/growth/seo/prospect/`), fuente
`backlinks_domain_intersection`. Familia `backlinks` del allowlist, llamada live vía
`postDataForSeoTask`. Afecta a cualquier diagnóstico de prospecto con **2 o más**
competidores en `linkGapTargets`.

## Detectado

2026-09-11, durante la revisión competitiva de las «AI Skills» de DataForSEO
([RESEARCH-011](../research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md)).
No lo destapó una medición de nuestro runtime: lo destapó una **regla explícita en la
skill `competitor-backlink-gap` del proveedor** —*"call once per competitor — do NOT pass
all competitors in one `targets` array"*— que contradecía cómo llamamos nosotros.

## Síntoma

`collect.ts` arma `targets` con **hasta 5 competidores a la vez**
(`PROSPECT_LINK_GAP_MAX_TARGETS = 5`) en una sola llamada a
`/v3/backlinks/domain_intersection/live`, sin declarar `intersection_mode`.

La documentación oficial del endpoint confirma que el default es `all` y que, con varios
targets, devuelve los dominios que enlazan a **todos los targets a la vez**. Si eso aplica
como está documentado, el link gap de un prospecto con 5 competidores sólo lista los
dominios que enlazan a **los cinco simultáneamente** — un conjunto mucho más chico que la
unión, y a menudo vacío.

**El modo de falla es silencioso:** la llamada responde `20000`, el costo se cobra, el
fact se persiste y el diagnóstico reporta "pocas o ninguna oportunidad de link gap" sin
error ni warning. Un resultado pobre es indistinguible de un prospecto con perfil de
enlaces sano.

## Causa raíz (hipótesis, NO verificada contra respuesta real)

`intersection_mode` no se declara, así que aplica el default `all`. La documentación es
ambigua en su propia glosa (`all` = *"results are derived from all backlinks"*, `partial`
= *"intersecting backlinks only"*), lo que **no coincide** con la lectura operativa
—"devuelve dominios que enlazan a todos tus targets"— del mismo documento. Esa ambigüedad
es justamente la razón por la que esto se registra como issue con experimento pendiente y
no como bug confirmado.

## Impacto

- **Comercial:** el link gap es un argumento de venta del diagnóstico de prospecto. Un
  conjunto colapsado subrepresenta la oportunidad del prospecto y debilita la propuesta.
- **Económico:** se paga una llamada live cuyo resultado puede no significar lo que el
  consumer cree.
- **Alcance:** cualquier diagnóstico con ≥2 competidores. Con 1 competidor no hay
  ambigüedad posible y el resultado es correcto.

## Verificación pendiente (experimento definido, barato)

Dos llamadas sobre el mismo sujeto, comparando conteos:

1. `targets: { "1": comp1 }`, `exclude_targets: [cliente]` → `n1`.
2. `targets: { "1": comp1, "2": comp2 }`, `exclude_targets: [cliente]` → `n12`.

Si `n12 ≈ min(n1, n2)` o mucho menor que `n1`, la semántica es AND y el defecto es real.
Si `n12 ≈ n1 + n2 − solapamiento`, es unión y no hay defecto. Repetir con
`intersection_mode: 'partial'` para saber si el parámetro cambia algo.

Costo estimado: 3–4 requests live de la familia `backlinks`
(~USD 0,024/request + filas). **Debe correr por el transporte canónico con
`enforceSeoRunEntitlement` y quedar en el ledger** — no como script suelto.

Evidencia gratis complementaria: revisar en PG cuántas filas devolvió
`backlinks_domain_intersection` en los diagnósticos ya pagados (p. ej. el de SKY). Un 0
persistente con competidores declarados es señal fuerte.

## Solución propuesta

Si el experimento confirma AND: una llamada **por competidor** y unión en el cliente,
como hace el proveedor en su propia skill. Eso multiplica el costo del link gap por el
número de competidores (hoy 1 llamada, pasaría a hasta 5), así que el forecast
`forecastProspectDiagnosticCostUsd()` debe actualizarse en el mismo cambio y el tope de
`PROSPECT_LINK_GAP_MAX_TARGETS` revisarse contra el presupuesto del carril.

Alternativa más barata a evaluar con la medición en mano: mantener una sola llamada y
declarar `intersection_mode: 'partial'` si resulta que ése es el comportamiento de unión.

## Relacionado

- [RESEARCH-011](../research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md)
- `.claude/skills/dataforseo-operator/references/03-backlinks.md` §7 gotcha 12
- `src/lib/growth/seo/prospect/collect.ts` · `src/lib/growth/seo/prospect/contracts.ts`
