# Runbook — Auto-ingest de Knowledge por webhook Notion (TASK-1094)

> Mantiene el corpus de conocimiento (`greenhouse_knowledge`) al día automáticamente cuando se publica/edita/borra un artículo en una Wiki/página declarada del teamspace Notion de conocimiento. Webhook-driven (NO cron).

## Qué hace

Cuando alguien cambia un artículo en Notion, la integración "Greenhouse KNOW" dispara un webhook → Greenhouse re-fetchea esa página y la re-ingiere (idempotente) o la deprecia (si se borró). Nexa responde con lo nuevo en segundos. El at-most-once de los webhooks se cubre con una señal de dead-letter + el comando `reconcile` on-demand.

## Activación (one-time, operador)

El código está mergeado con el flag **OFF** (cero efecto). Para activarlo:

### 0. Pre-requisito: el endpoint debe estar desplegado

El handler `/api/webhooks/notion-knowledge` debe estar **en vivo** para que Notion pueda alcanzarlo durante el handshake. Es decir: pushear `develop` (staging) o release a `main` (prod) **antes** de crear la suscripción en Notion. El handshake de verificación se ACK-ea aunque el flag esté OFF y el secret no exista todavía.

### 1. Crear la suscripción en Notion (genera el secret)

En la integración **"Greenhouse KNOW"** (Notion → Settings → Connections → Develop/manage integrations → la integración → Webhooks → Create subscription):
- **URL**: el endpoint desplegado, `https://<host>/api/webhooks/notion-knowledge`
  - staging: `https://dev-greenhouse.efeoncepro.com/api/webhooks/notion-knowledge`
  - producción: `https://greenhouse.efeoncepro.com/api/webhooks/notion-knowledge`
- **Eventos**: `page.created`, `page.content_updated`, `page.properties_updated`, `page.deleted` (opcional `page.undeleted`, `page.moved`).
- Notion envía un `verification_token` al endpoint → el handler lo ACK-ea (200). Notion muestra ese **verification token** en el dashboard → **copiarlo**. **ESE token ES el signing secret** (no se genera uno aleatorio).

### 2. Guardar el verification_token como secret HMAC

```bash
# TOKEN = el verification_token que Notion mostró en el paso 1
printf %s "$TOKEN" | gcloud secrets create greenhouse-notion-knowledge-webhook-signing-secret --data-file=- --replication-policy=automatic --project=efeonce-group
# (si ya existe: ... | gcloud secrets versions add greenhouse-notion-knowledge-webhook-signing-secret --data-file=-)
```

Setear el ref (Vercel staging+prod + ops-worker):
```bash
printf %s "greenhouse-notion-knowledge-webhook-signing-secret" | vercel env add NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF production --force --scope efeonce-7670142f
```
(idem el target del entorno donde apuntás el webhook; + setear en el ops-worker `deploy.sh`).

> El signing secret (verification_token de Notion) es **distinto** del token de la integración (`notion-integration-token-greenhouse-knowledge`). No reusar.

### 3. Token de knowledge en el ops-worker

El consumer re-ingiere desde el ops-worker, que necesita `NOTION_KNOWLEDGE_TOKEN_SECRET_REF=notion-integration-token-greenhouse-knowledge` en su entorno Cloud Run. Verificar/agregar en `services/ops-worker/deploy.sh`.

### 4. Flip del flag

```bash
printf %s "true" | vercel env add NOTION_KNOWLEDGE_WEBHOOK_ENABLED production --force --scope efeonce-7670142f
```
Redeploy Vercel + ops-worker para tomar el env var.

### 5. Smoke de verificación

1. Editar un artículo de una Wiki declarada en Notion → en ~1 min, verificar nueva versión del doc (el consumer corre en el cron `ops-reactive-*`).
2. Borrar el artículo de prueba → verificar `publication_status='deprecated'`.
3. `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/reconcile.ts` (dry-run) → `huérfanos: 0`.
4. `/admin/operations` → señal `knowledge.notion.ingest_dead_letter` en `ok` (0).

## Operación diaria

**Nada manual.** Escribís en Notion como siempre; el corpus se mantiene solo. Solo se incluyen las Wikis/páginas declaradas en `src/lib/knowledge/notion/notion-corpus.ts` (lo demás se ignora).

### Agregar una Wiki/página nueva al corpus

Es un cambio de código (declarativo): agregar la entrada a `NOTION_KNOWLEDGE_CORPUS` + compartir la página con "Greenhouse KNOW" en Notion + correr la ingesta inicial (`scripts/knowledge/ingest.ts --source=notion --only=<wiki> --apply`). A partir de ahí el webhook la mantiene al día.

## Reconcile (red de seguridad)

Los webhooks de Notion son **at-most-once** (raramente se pierde un evento). El `reconcile` recupera lo perdido:

```bash
# Dry-run: muestra qué re-ingeriría + qué huérfanos depreciaría
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/reconcile.ts

# Apply: re-ingiere faltantes + deprecia huérfanos (páginas borradas cuyo webhook se perdió)
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/reconcile.ts --apply
```

Correrlo cuando la señal `knowledge.notion.ingest_dead_letter` alerte, o periódicamente (ej. semanal) como higiene.

## Troubleshooting

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| Señal `knowledge.notion.ingest_dead_letter` > 0 | Token de knowledge no provisionado en el ops-worker, Notion API caída, o schema drift | Verificar `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` en el ops-worker; ver `last_error` en `greenhouse_sync.outbox_reactive_log WHERE handler LIKE 'knowledge_notion_ingest%'`; reprocesar |
| Un artículo editado no aparece actualizado | Webhook perdido (at-most-once) o flag OFF | Correr `reconcile --apply`; verificar `NOTION_KNOWLEDGE_WEBHOOK_ENABLED=true` |
| Un artículo borrado sigue en Nexa | `page.deleted` perdido | Correr `reconcile --apply` (deprecia huérfanos) |
| Webhook devuelve 401 | Secret HMAC no configurado o incorrecto | Verificar `NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF` apunta al token que Notion mostró en el handshake |
| Cambios en una Wiki NO declarada se ignoran | Comportamiento esperado (gate de gobernanza) | Si debe entrar, agregarla al corpus (ver arriba) |

## Rollback

Flip `NOTION_KNOWLEDGE_WEBHOOK_ENABLED=false` + redeploy → el handler ACK-ea y dropea (cero re-ingest). El corpus queda en su último estado bueno; la ingesta vuelve a ser manual vía el CLI.

## Referencias

- Spec: `docs/tasks/complete/TASK-1094-notion-knowledge-webhook-auto-ingest.md`
- Arquitectura: `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (auto-ingest)
- Patrón webhook: `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` + TASK-912
- Conector base: TASK-1088
