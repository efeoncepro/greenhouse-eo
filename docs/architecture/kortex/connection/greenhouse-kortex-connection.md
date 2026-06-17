# Greenhouse -> Kortex Connection

## Resumen

Greenhouse quedo conectado a Kortex como plataforma hermana mediante un binding gobernado y un reader de control-plane. Greenhouse no lee la base de datos de Kortex ni escribe HubSpot directo; observa y ejecuta a traves de APIs gobernadas.

## Ruta logica

```text
Greenhouse admin/API
  -> binding preflight
  -> Kortex control-plane reader o command adapter
  -> Kortex runtime
  -> HubSpot portal conectado
```

## Binding vigente

- Public ID: `EO-SPB-0002`
- Sister platform: `kortex`
- External scope type: `portal`
- External Kortex portal id: `9b0a6e91-0e08-4642-bc42-54a4b5c83ad8`
- HubSpot portal id: `48713323`
- Scope Greenhouse: `internal`
- Status: `active`

## Reader disponible

`GET /api/admin/kortex/control-plane?hubspot_portal_id=48713323`

Devuelve:

- repo Kortex (`efeoncepro/kortex`);
- OpenAPI runtime;
- binding Greenhouse;
- portal/context Kortex;
- latest audit;
- degradaciones honestas si endpoints opcionales devuelven 401/400.

Smoke del 2026-06-17:

- HTTP `200`
- binding `EO-SPB-0002`
- latest audit visible
- confidence `medium` por endpoints opcionales no autenticados.

## Command adapter disponible

`POST /api/admin/kortex/commands`

Requiere:

- sesion interna admin;
- `Idempotency-Key`;
- binding activo o portal allowlisted;
- flags segun tier.

## Sistemas externos

Kortex no es solo Cloud Run. La ruta usada por el command adapter en esta sesion apunta al control-plane en Cloud Run:

`https://kortex-control-plane-758246035804.us-central1.run.app`

Si una capacidad Kortex futura vive en Vercel u otra superficie, debe modelarse como endpoint/capability explicito en esta capa antes de exponerla desde Greenhouse. No asumir que "Kortex = Cloud Run" para toda la plataforma.
