# Operar AI Tooling, Content y Assets

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** AI Tooling / Content / Asset Generation
> **Rutas:** `/admin/ai-tools`, `/api/admin/ai-tools/*`, `/api/internal/generate-image`, `/api/internal/generate-animation`
> **Documentacion relacionada:** `docs/documentation/ai-tooling/ai-tooling-content-assets-end-to-end.md`, `docs/documentation/ai-tooling/generador-visual-assets.md`, `docs/manual-de-uso/public-site/operar-public-site-content-factory.md`

## Para que sirve

Este manual explica como operar el catalogo de herramientas IA, licencias, creditos y generacion interna de assets. Tambien aclara la frontera con Content Factory/Public Site para no confundir generar contenido con publicar.

## Antes de empezar

Necesitas acceso admin a AI Tools. Para generar assets en production, confirma que el flag `ENABLE_ASSET_GENERATOR=true` este permitido por una ventana aprobada. No uses prompts con secretos, datos personales o informacion sensible de clientes.

## Registrar una herramienta IA

1. Abre `/admin/ai-tools`.
2. Entra al catalogo.
3. Crea herramienta con provider, SKU, nombre, categoria y business lines.
4. Define tags, pricing metadata y estado activo.
5. Guarda.
6. Verifica que aparece en catalogo y APIs admin.
7. Si aplica, asigna licencias a miembros o configura wallet de creditos.

## Revisar licencias

1. Busca miembro o herramienta.
2. Revisa estado de licencia.
3. Confirma vigencia y provider.
4. Si falta licencia, creala por flujo admin, no por SQL.
5. Si la herramienta no debe seguir disponible, desactiva o revoca segun contrato.

## Revisar o recargar creditos

1. Busca wallet por cliente/herramienta.
2. Revisa saldo, periodo y estado.
3. Abre ledger para entender movimientos.
4. Para recargar, usa accion gobernada que registre ledger.
5. Para corregir, registra ajuste/reversal, no edites saldo directo.

## Consumir creditos

1. Confirma wallet activa.
2. Confirma saldo suficiente.
3. Ejecuta accion que consume creditos.
4. Verifica ledger.
5. Si falla por saldo, no fuerces consumo sin recarga/aprobacion.

## Generar una imagen interna

1. Prepara brief con objetivo, formato y restricciones de marca.
2. Verifica que el entorno permite generacion.
3. Ejecuta endpoint/script aprobado.
4. Revisa archivo generado en `public/images/generated`.
5. Valida calidad visual, derechos, marca y sensibilidad.
6. Solo despues referencia el asset en UI, docs o content.

## Generar animacion

1. Prepara brief de animacion.
2. Ejecuta helper aprobado.
3. Revisa salida en `public/animations/generated`.
4. Verifica accesibilidad, reduced motion y peso.
5. No integres animacion sin QA visual.

## Usar AI Tooling con Public Site Content Factory

1. Usa AI Tooling para preparar assets o borradores.
2. Usa Content Factory para inspeccionar post, refresh plan, patch plan o draft clone.
3. Verifica fingerprints/path checks.
4. Mantiene writes draft-only/read-only segun el estado del Public Site.
5. No publiques desde AI Tooling.

## Problemas comunes

### El endpoint de generacion no responde en production

Verifica `ENABLE_ASSET_GENERATOR`. Por defecto, production no debe permitir generacion interna sin flag.

### El saldo de wallet no cuadra

Revisa `credit_ledger`. No edites wallet directamente.

### Una herramienta aparece en catalogo pero no para un miembro

Puede faltar licencia, business line o asignacion. Catalogo activo no equivale a disponibilidad individual.

### El asset generado se ve bien pero no esta listo para usar

Debe pasar revision de marca, contenido, derechos y QA del surface donde se usara.

## Que no hacer

- No publicar WordPress desde AI Tooling.
- No editar saldos sin ledger.
- No exponer prompts con secretos.
- No convertir asset generator en feature cliente sin spec.
- No asumir que creditos IA son pagos o facturas.

## Referencias tecnicas

- `src/lib/ai-tools/service.ts`
- `src/lib/ai-tools/postgres-store.ts`
- `src/lib/ai/image-generator.ts`
- `src/lib/ai/openai-image.ts`
- `scripts/setup-postgres-ai-tooling.sql`
- `greenhouse_ai.tool_catalog`
- `greenhouse_ai.credit_wallets`
- `greenhouse_ai.credit_ledger`
