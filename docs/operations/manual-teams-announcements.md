# Runbook — Manual Teams Announcements

Canal canónico para anuncios manuales enviados por el Greenhouse TeamBot, sin depender del conector personal de Teams del operador.

## Objetivo

- Reutilizar un destino manual registrado en código.
- Validar el mensaje antes de enviarlo.
- Mantener audit trail en `greenhouse_sync.source_sync_runs`.
- Evitar envíos accidentales con `dry-run` y confirmación explícita.

## Destino inicial

- `eo-team` → chat grupal `EO Team`

## Ubicar `EO - Team`

El destino no se busca por texto libre al momento de enviar. El chat grupal de EO está registrado en código como destino estable:

- `destinationKey`: `eo-team`
- Label visible: `EO Team`
- Tipo: `recipientKind='chat_group'`
- Canal/audit code: `manual-eo-team-announcement`
- Registry canónico: `src/config/manual-teams-announcements.ts`
- Test de contrato: `src/lib/communications/manual-teams-announcements.test.ts`

Esto significa que `EO - Team` no debe tratarse como un canal Teams con `teamId`/`channelId`. Es un chat grupal existente y el dispatcher publica usando Bot Framework Connector en:

```text
POST {serviceUrl}/v3/conversations/{recipientChatId}/activities
```

Para confirmar el destino antes de enviar:

```bash
rg -n "'eo-team'|manual-eo-team-announcement|recipientChatId" src/config src/lib docs/operations
pnpm teams:announce --help
```

Validación runtime observada el 2026-06-08, sin enviar mensaje:

- existe cache en `greenhouse_core.teams_bot_conversation_references` para `reference_key='chat:<recipientChatId>'`;
- `service_url='https://smba.trafficmanager.net/teams'`;
- `failure_count=0`;
- último éxito del chat: `2026-06-01T12:25:40.831Z`;
- audit trail reciente: `sync_run_id='teams-manual-*'`, `status='succeeded'`, `surface=chat_group`, `triggered_by=codex`.

Si hace falta revalidar la cache, usar solo consultas read-only. No hacer un envío de prueba real para "descubrir" el chat si el registry ya tiene el `recipientChatId`.

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
- El CTA es opcional. Si se envía `--cta-url`, debe ser `https`.

## Menciones reales en Adaptive Cards

Para arrobar de verdad dentro del card, usar `--mention` con este formato:

```bash
--mention "Texto visible|entraObjectIdOrUpn|Nombre de perfil"
```

Ejemplo verificado en Teams el 2026-06-08:

```bash
pnpm teams:announce \
  --destination eo-team \
  --title "Bienvenida al equipo, Maria Fernanda 🌱" \
  --body-file ./tmp/maria-fernanda-welcome.md \
  --mention "Maria Fernanda|6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c|Maria Fernanda Gonzalez" \
  --triggered-by codex \
  --dry-run
```

Reglas importantes:

- El `Texto visible` debe aparecer exactamente en el título o en algún párrafo del body file. El helper lo reemplaza por `<at>Texto visible</at>`.
- El `id` debe ser Microsoft Entra Object ID o UPN (`mfgonzalez@efeoncepro.com` también sirve). Para Adaptive Cards **no usar** `29:<aadObjectId>`: ese patrón renderizó como texto plano en prueba real.
- La mención vive dentro de `card.msteams.entities`; el dispatcher Bot Framework manda solo attachments, sin `activity.text`, para evitar que Teams muestre una burbuja duplicada arriba del card.
- Si la persona no pertenece al chat/equipo destino, Teams puede degradar la mención a texto plano. Validar en 1:1 o con Graph membership antes de usar un grupo público.

Payload canónico dentro del card:

```json
{
  "type": "AdaptiveCard",
  "version": "1.0",
  "body": [
    {
      "type": "TextBlock",
      "text": "Hola <at>Maria Fernanda</at>"
    }
  ],
  "msteams": {
    "entities": [
      {
        "type": "mention",
        "text": "<at>Maria Fernanda</at>",
        "mentioned": {
          "id": "6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c",
          "name": "Maria Fernanda Gonzalez"
        }
      }
    ]
  }
}
```

## Guardrails

- `--dry-run` muestra el payload normalizado y el `fingerprint` del anuncio.
- Un envío real exige `--yes`.
- El destino se resuelve desde `src/config/manual-teams-announcements.ts`, no desde texto libre.
- El helper usa el TeamBot Greenhouse y el secret `greenhouse-teams-bot-client-credentials`.
