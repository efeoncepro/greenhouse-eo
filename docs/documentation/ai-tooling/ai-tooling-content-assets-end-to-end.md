# AI Tooling, Content y Assets end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** AI Tooling / Content / Asset Generation
> **Rutas principales:** `/admin/ai-tools`, `/api/admin/ai-tools/*`, `/api/ai-tools/*`, `/api/internal/generate-image`, `/api/internal/generate-animation`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`, `docs/documentation/ai-tooling/generador-visual-assets.md`, `docs/documentation/public-site/public-site-content-factory-end-to-end.md`

## Estado de verificacion

Documento reconciliado el 2026-06-15 contra codigo, arquitectura, schema/migrations y DB viva con datos agregados sin PII. La conexion Postgres respondio desde `greenhouse_app` con usuario runtime `greenhouse_app` a las 2026-06-15 10:50 UTC. Evidencia revisada: `src/lib/ai-tools/**`, `src/lib/ai/image-generator.ts`, `src/lib/ai/openai-image.ts`, rutas admin/API de AI Tools, scripts `scripts/ai/**`, `scripts/setup-postgres-ai-tooling.sql` y docs Public Site Content Factory.

Snapshot DB agregado del ambiente consultado:

- `greenhouse_ai.tool_catalog`: 34 herramientas activas distribuidas en `ai_suite`, `analytics`, `collaboration`, `creative_production`, `crm`, `gen_audio`, `gen_text`, `gen_video`, `gen_visual` e `infrastructure`.
- `greenhouse_ai.member_tool_licenses`: 0 filas por estado en este ambiente.
- `greenhouse_ai.credit_wallets`: 0 wallets en este ambiente.
- `greenhouse_ai.credit_ledger`: 0 movimientos en este ambiente.

Interpretacion: el catalogo AI Tools esta operativo; wallets/licencias/ledger no muestran uso cargado en este ambiente al momento de la consulta.

## Que es

AI Tooling tiene dos carriles que no deben mezclarse:

- **AI Tools Catalog / Credits:** inventario gobernado de herramientas IA usadas por clientes, miembros o servicios, con proveedores, licencias, wallets y ledger de creditos.
- **Content & Asset Generation:** tooling interno para generar assets visuales, animaciones o planes de contenido bajo guardrails. Incluye el generador visual y se relaciona con Public Site Content Factory, pero no publica por si solo.

## Entidades principales

### AI Tools Catalog

- **Provider:** proveedor de herramienta o capacidad IA.
- **Tool catalog:** `greenhouse_ai.tool_catalog`, catalogo de herramientas, SKU, categoria, business lines, costo y metadata.
- **Member tool license:** licencia asignada a miembro/herramienta.
- **Credit wallet:** `greenhouse_ai.credit_wallets`, bolsa de creditos por cliente/herramienta/periodo.
- **Credit ledger:** `greenhouse_ai.credit_ledger`, movimientos append-only de recarga, consumo, ajuste o reversal.
- **Supplier / FX:** cuando aplica, costos se conectan con proveedores y tipos de cambio para economics/finance.

### Content y assets

- **Generated image:** archivo estatico generado por provider configurado, guardado en `public/images/generated`.
- **Generated animation:** SVG/CSS/asset animado generado y guardado en `public/animations/generated`.
- **Prompt/brief:** instruccion operativa para generar asset; debe evitar secretos, datos personales y claims no aprobados.
- **Public Site plan:** refresh/patch/draft plan para WordPress, siempre draft/read-only segun su propio contrato.

## Que hace automatico Greenhouse

- Lista catalogo de herramientas desde Postgres o BigQuery segun store configurado.
- Crea/actualiza herramientas desde APIs admin protegidas.
- Lista licencias, wallets y ledger con joins a provider/tool/client/member.
- Consume creditos registrando ledger y actualizando wallet de forma gobernada.
- Recarga o ajusta creditos con metadata.
- En asset generator, llama Google Imagen 4 por defecto u OpenAI Image si se opta explicitamente.
- Genera animaciones con Gemini/SVG cuando se usa el helper correspondiente.
- Guarda assets como archivos estaticos versionables, no como hot output invisible.
- Deshabilita endpoints internos de generacion en production salvo `ENABLE_ASSET_GENERATOR=true`.

## Que hace el operador

- Administra tools, SKUs, categorias, business lines y estado activo desde `/admin/ai-tools`.
- Revisa licencias y wallets antes de asumir que una herramienta esta disponible para un miembro/cliente.
- Usa ledger para explicar consumos; no corrige saldos editando wallet sin ledger.
- Genera assets solo para uso interno/aprobado, revisando resultado antes de integrarlo.
- Para Public Site, prepara planes/drafts segun Content Factory; no publica desde AI Tooling.
- No expone prompts con secretos, datos personales, tokens ni informacion sensible de clientes.

## Flujo: registrar herramienta IA

1. Operador abre Admin AI Tools.
2. Define provider, tool SKU, categoria, nombre, business lines, tags y pricing metadata.
3. Greenhouse crea o actualiza `tool_catalog`.
4. Si se asigna a miembros, crea licencias en el store correspondiente.
5. Si requiere creditos, crea wallet por cliente/herramienta/periodo.
6. Todo consumo posterior debe ir por ledger.

## Flujo: consumir creditos

1. Un servicio o accion gobernada solicita consumir creditos de una wallet.
2. Greenhouse valida wallet activa, saldo y herramienta.
3. Inserta movimiento en `credit_ledger`.
4. Actualiza saldo disponible.
5. Si no hay saldo o wallet esta bloqueada, no debe inventar credito ni saltarse ledger.

## Flujo: generar imagen o animacion

1. Operador prepara brief/prompt sin secretos ni datos sensibles.
2. Endpoint o script verifica flag y entorno.
3. Helper selecciona provider configurado.
4. Se genera asset.
5. Se guarda archivo en carpeta estatica gobernada.
6. Operador revisa calidad, derechos, marca y uso.
7. Solo despues se referencia desde UI/docs/content.

## Relacion con Public Site Content Factory

Content Factory puede inspeccionar posts, generar refresh plans, patch plans y draft clones. AI Tooling puede ayudar a producir texto o assets, pero no cambia el contrato:

- No publicar automaticamente.
- No mutar el post publicado.
- No saltarse fingerprint/path checks.
- No ejecutar cache clear/backups/writes productivos sin ventana aprobada.

## Fronteras importantes

- Tool catalog no es el catalogo comercial de productos.
- Wallet no es factura ni cuenta bancaria.
- Ledger de creditos no es P&L legal.
- Asset generator interno no es feature cliente self-service.
- Generar asset no significa que esta aprobado para marca.
- Generar plan de contenido no significa publicarlo.

## Preguntas que Nexa debe responder bien

- "Como registro una herramienta IA?"
- "Que diferencia hay entre tool catalog, license, wallet y ledger?"
- "Como se consumen creditos?"
- "Puedo corregir saldo editando la wallet?"
- "Como genero una imagen interna?"
- "El generador de assets funciona en produccion?"
- "AI Tooling puede publicar en WordPress?"
- "Content Factory y asset generator son lo mismo?"

## Referencias de codigo y DB

- `src/lib/ai-tools/service.ts`
- `src/lib/ai-tools/postgres-store.ts`
- `src/lib/ai-tools/schema.ts`
- `src/app/api/admin/ai-tools/catalog/route.ts`
- `src/app/api/admin/ai-tools/**`
- `src/app/api/ai-tools/**`
- `src/lib/ai/image-generator.ts`
- `src/lib/ai/openai-image.ts`
- `scripts/ai/generate-image.ts`
- `scripts/setup-postgres-ai-tooling.sql`
- Tablas: `greenhouse_ai.tool_catalog`, `greenhouse_ai.member_tool_licenses`, `greenhouse_ai.credit_wallets`, `greenhouse_ai.credit_ledger`
