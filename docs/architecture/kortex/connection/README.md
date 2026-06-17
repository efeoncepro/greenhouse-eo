# Kortex Connection

Esta capa documenta como Greenhouse identifica, observa y alcanza Kortex como sister platform.

## Documentos

- [`greenhouse-kortex-connection.md`](greenhouse-kortex-connection.md)

## Source of truth

- Reader Greenhouse: `GET /api/admin/kortex/control-plane`
- Reader GitHub repo: `GET /api/admin/kortex/github-control-plane`
- Binding: `greenhouse_core.sister_platform_bindings`
- Command adapter: `POST /api/admin/kortex/commands`
- GitHub command adapter: `POST /api/admin/kortex/github-commands`
- Kortex runtime API: Cloud Run control-plane y, cuando aplique, superficies Vercel propias de Kortex fuera del scope de este adapter.
