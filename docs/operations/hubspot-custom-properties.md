# HubSpot Custom Properties Operating Model

> Fuente canónica para el provisioning declarativo de custom properties HubSpot desde `greenhouse-eo`.

## Resumen

Greenhouse ya no debe manejar custom properties HubSpot con scripts aislados por task. El contrato canónico ahora es:

- un manifiesto versionado en [`src/lib/hubspot/custom-properties.ts`](/Users/jreye/Documents/greenhouse-eo/src/lib/hubspot/custom-properties.ts)
- un reconcile idempotente en [`scripts/ensure-hubspot-custom-properties.ts`](/Users/jreye/Documents/greenhouse-eo/scripts/ensure-hubspot-custom-properties.ts)
- wrappers por objeto para compatibilidad operativa

Objetos soportados hoy:

- `companies`
- `contacts`
- `deals`
- `products`
- `services`

Nota: `contacts` ya está soportado por el engine, pero hoy no tiene properties canónicas definidas. El manifiesto se mantiene vacío a propósito para no inventar campos sin contrato documental.

## Comandos

Comando genérico:

```bash
pnpm hubspot:properties
```

Wrappers por objeto:

```bash
pnpm hubspot:company-properties
pnpm hubspot:contact-properties
pnpm hubspot:deal-properties
pnpm hubspot:product-properties
pnpm hubspot:service-properties
```

Dry-run live contra HubSpot:

```bash
HUBSPOT_ACCESS_TOKEN=... pnpm hubspot:properties -- --object companies,deals,products,services
```

Apply real e idempotente:

```bash
HUBSPOT_ACCESS_TOKEN=... pnpm hubspot:properties -- --object companies,deals,products,services --apply
```

## Reglas

- `name` técnico mantiene convención estable (`gh_*`, `ef_*`).
- `label` visible debe quedar en lenguaje natural.
- El reconcile hace `create` si falta, `update` si hay drift y `exists` si ya está alineado.
- El group se resuelve por objeto usando candidatos conocidos del portal antes de crear uno nuevo.
- No se deben inventar properties para un objeto si no existe contrato documental en arquitectura/tasks.
- Cuando una task/documento hable de “read-only”, tratarlo hoy como regla operativa del portal. La API de HubSpot no está reflejando `readOnlyValue=true` en estos objetos, así que el manifiesto converge contra el estado verificable live.

## Objetos y suites actuales

- `companies`: lifecycle/commercial party outbound (`gh_commercial_party_id`, `gh_last_quote_at`, `gh_last_contract_at`, `gh_active_contracts_count`, `gh_last_write_at`, `gh_mrr_tier`)
- `deals`: origin marker de Quote Builder (`gh_deal_origin`)
- `products`: product catalog sync (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`)
- `services`: service bridge (`ef_*`)
- `contacts`: reservado, sin suite activa todavía

## Verificación mínima

Después de cada apply:

1. Revisar el plan resultante (`create/update/exists`) por objeto.
2. Validar en HubSpot UI labels, tipo, options y group.
3. Si aplica, correr el smoke del flujo consumidor en Greenhouse.

## Relación con runbooks específicos

- Products: [`docs/operations/hubspot-custom-properties-products.md`](/Users/jreye/Documents/greenhouse-eo/docs/operations/hubspot-custom-properties-products.md)
- Party lifecycle / deals / services: referenciar este documento como baseline operativo.
