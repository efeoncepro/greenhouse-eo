# Runbook — Manual Teams Announcements

Canal canónico para anuncios manuales enviados por el Greenhouse TeamBot, sin depender del conector personal de Teams del operador.

## Objetivo

- Reutilizar un destino manual registrado en código.
- Validar el mensaje antes de enviarlo.
- Mantener audit trail en `greenhouse_sync.source_sync_runs`.
- Evitar envíos accidentales con `dry-run` y confirmación explícita.

## Destino inicial

- `eo-team` → chat grupal `EO Team`

## Comando

```bash
pnpm teams:announce \
  --destination eo-team \
  --title "📊 Performance Report de abril 2026" \
  --body-file ./tmp/april-performance-message.md \
  --cta-url "https://www.notion.so/efeonce/Performance-Report-Abril-2026-f28a9a7395bc40f3bca9c65de6fda236?source=copy_link" \
  --cta-label "Abrir informe" \
  --triggered-by codex \
  --dry-run
```

Para enviar de verdad:

```bash
pnpm teams:announce \
  --destination eo-team \
  --title "📊 Performance Report de abril 2026" \
  --body-file ./tmp/april-performance-message.md \
  --cta-url "https://www.notion.so/efeonce/Performance-Report-Abril-2026-f28a9a7395bc40f3bca9c65de6fda236?source=copy_link" \
  --cta-label "Abrir informe" \
  --triggered-by codex \
  --yes
```

## Formato del body file

- Separar párrafos con una línea en blanco.
- El helper normaliza saltos de línea internos a una sola línea por párrafo.
- El CTA debe ser `https`.

## Guardrails

- `--dry-run` muestra el payload normalizado y el `fingerprint` del anuncio.
- Un envío real exige `--yes`.
- El destino se resuelve desde `src/config/manual-teams-announcements.ts`, no desde texto libre.
- El helper usa el TeamBot Greenhouse y el secret `greenhouse-teams-bot-client-credentials`.
