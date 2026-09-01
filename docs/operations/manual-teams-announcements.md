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

## Límite de `@todos` en chats grupales

`EO Team` es un `chat_group`. TeamBot no puede generar una mención colectiva `@todos` / `@everyone` en esta superficie; Microsoft solo admite menciones a usuarios explícitos. No agregues `<at>todos</at>`, no uses el `recipientChatId` como `mentioned.id` y no interpretes un HTTP 2xx del Connector como confirmación de una mención.

El fallo observado el 2026-08-24 es el comportamiento esperado del payload no soportado: Teams creó una burbuja separada con `todos` en texto plano y publicó la Adaptive Card, pero no mostró arroba ni notificó a todas las personas. La burbuja apareció porque `activity.text` viajó junto con la tarjeta.

Para menciones válidas, incluye el nombre visible en el título o cuerpo y pasa una opción `--mention "Texto visible|entraObjectIdOrUpn|Nombre de perfil"` por persona. Si no se dispone de identidades verificadas, envía la tarjeta sin prometer notificación colectiva. No pruebes variantes en el chat público para descubrir capacidades.

Fuente: [Microsoft Teams — channel and group chat conversations](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations).

## Formato del body file

- Separar párrafos con una línea en blanco.
- El helper normaliza saltos de línea internos a una sola línea por párrafo.
- El CTA es opcional. Si se envía `--cta-url`, debe ser `https`.

## Ritual mensual — Performance Report EO Team

El **Performance Report mensual del Team Efeonce** se anuncia en el chat grupal `EO Team` desde **Nexa** el **primer día de cada mes**. Si ese día cae en día inhábil, se envía el **primer día hábil siguiente**. Antes de redactar o enviar, el operador debe entregar el **link del informe de Notion**; no inferir ni buscar "el último" reporte sin confirmación humana.

Checklist mensual:

1. Pedir al operador el link del informe de Notion del mes cerrado.
2. Leer el informe completo en modo solo lectura.
3. Redactar el mensaje con voz Nexa: consultora experta, empática, directa, con dato primero y siguiente acción clara.
4. Incluir el scorecard de cada integrante relevante con los KPIs personales realmente disponibles (**On-Time**, volumen, FTR o RpA según su alcance); si se pide arrobar, resolver cada identidad con Microsoft Graph y usar `--mention`.
5. Usar el link de Notion como CTA `Abrir informe`; no pegar URLs largas dentro del cuerpo si el CTA basta.
6. Ejecutar `pnpm teams:announce ... --dry-run`, revisar destino, menciones, CTA y fingerprint.
7. Enviar solo con aprobación del operador y el mismo payload usando `--yes`.

Estructura canónica del mensaje:

```text
Hola equipo. Soy Nexa. Ya está listo el **Performance Report de <Mes AAAA>**. La lectura corta: **<mejora o tesis principal>**, pero <alerta operativa principal>.

📊 **Datos del mes:** <total tareas>; **<On-Time global> On-Time global** (<delta vs mes anterior>); **<vencidas> vencidas**; **FTR global <FTR>**. <cliente/espacio destacado> cerró en **<On-Time> On-Time**.

👥 **Scorecard de agencia:** <Nombre> — **On-Time <x>%**, RpA <x.xx>; <Nombre> — **On-Time <x>%**, RpA <x.xx>; ...

⚠️ **El matiz:** <la interpretación que evita que el promedio engañe>. Foco/riesgo por espacio, cliente o tipo de trabajo con datos.

🔎 **La alerta operativa:** <causa raíz o tensión de capacidad/desempeño, escrita con empatía y sin exposición innecesaria>. Lo urgente es **<palancas concretas>**.

🎯 **Para <mes siguiente>:** <3-5 acciones claras o metas del próximo mes>.
```

Reglas de redacción:

- Máximo **6 párrafos**, porque `pnpm teams:announce` limita el card a 6 bloques de texto.
- Usar emojis como marcadores semánticos ligeros (`📊`, `👥`, `⚠️`, `🔎`, `🎯`), no como decoración.
- Usar **negritas** para el título del reporte, KPIs, tesis, alertas y metas.
- Mantener un tono honesto y empático: nombrar riesgos y responsabilidades operativas sin convertir el reporte en exposición personal.
- No completar una métrica ausente: usar RpA/FTR sólo cuando el informe la entregue con una base comparable. Si el dato existe sólo por espacio o sobre una muestra parcial, decirlo.
- No inferir capacidad personal desde volumen o un umbral histórico. **Más tareas no equivale por sí solo a sobrecarga**; esa lectura requiere contexto operativo confirmado por el responsable.
- Si un nombre aparece más de una vez y se pasa como `--mention`, el helper convertirá todas las apariciones en `<at>...</at>`; evitar menciones duplicadas usando el nombre solo en el scorecard cuando sea posible.

### Legibilidad visual del card en Teams

Lección del envío real de junio 2026: Teams renderizó correctamente el card, las negritas, el CTA y las menciones, pero el mensaje quedó **demasiado denso**. `pnpm teams:announce` convierte cada párrafo del body file en un `TextBlock`; si cada bloque contiene varias métricas separadas por punto y coma, Teams lo muestra como una pared de texto.

Para próximos envíos, la prioridad visual es **aire + escaneo**, no meter más información en menos líneas.

Reglas de legibilidad:

- No usar párrafos con cadenas largas de KPIs separados por `;`. Preferir una tesis corta + 2-4 métricas máximas por bloque.
- No poner el scorecard completo en una sola frase larga. Si hay 3+ personas, usar una estructura tipo tabla/lista visual.
- Mantener cada bloque idealmente bajo **220 caracteres**; bloques de más de **350 caracteres** deben dividirse o moverse al informe.
- Evitar repetir el mismo emoji si ya está en el título del card; usar uno por sección, no uno por métrica.
- Usar negritas para guiar la vista, pero no en cada número: si todo está en bold, nada destaca.
- El primer bloque debe ser corto: saludo + tesis. No mezclar saludo, tesis y contexto largo.
- El CTA `Abrir informe` debe cargar el detalle; el card sólo debe llevar la lectura ejecutiva.

Shape visual recomendado para el anuncio grupal:

```text
Hola equipo. Soy Nexa.
Ya está listo el **Performance Report de <Mes AAAA>**.

📊 **Resumen**
**On-Time global:** <x>% (<delta>)
**Vencidas:** <n> vs <n anterior>
**FTR:** <x>%

👥 **Scorecard**
<Nombre>: **OT <x>%** · RpA <x.xx>
<Nombre>: **OT <x>%** · RpA <x.xx>
<Nombre>: **OT <x>%** · RpA <x.xx>

⚠️ **Lectura clave**
<1-2 frases con el matiz que evita que el promedio engañe.>

🔎 **Alerta operativa**
<1-2 frases sobre causa raíz/capacidad, sin exposición innecesaria.>

🎯 **Para <mes siguiente>**
<3 acciones separadas por coma o bullets reales si el card builder lo soporta.>
```

Nota técnica: el helper actual (`pnpm teams:announce`) no preserva saltos de línea internos del body file; los normaliza a una sola línea por párrafo. Antes del próximo Performance Report, si se necesita scorecard con varias personas, preferir **extender el helper gobernado** para soportar `FactSet`/`Container`/bloques estructurados en Adaptive Cards, en vez de mandar un scorecard largo como texto inline. No usar payloads Bot Framework crudos como camino normal.

### Follow-up individual mensual

Después del anuncio grupal del Performance Report, Nexa envía un **mensaje individual 1:1** a cada integrante evaluado en el scorecard de agencia con la misma frecuencia: **primer día de cada mes** o **primer día hábil siguiente** si cae inhábil. Este follow-up se envía solo después de leer el informe y con aprobación del operador.

El objetivo del 1:1 no es repetir el reporte completo: es entregar una lectura personal accionable, equilibrando **insights positivos** y **oportunidades de mejora**.

Estructura canónica del mensaje individual:

```text
📊 **Lectura de <mes> — <Nombre>**

Hola <Nombre>. Soy Nexa.

<Lectura positiva con KPIs personales: On-Time, volumen, FTR y RpA cuando existan.>

✨ <Insight positivo principal: espacio/cliente/tipo de trabajo donde destacó o contribución al resultado del mes.>

🎯 <Oportunidad de mejora concreta: timing, priorización, escalamiento, carga, foco o sistema de trabajo. Siempre con dato y siguiente acción clara.>

<Cierre breve, humano y proporcional al caso.>
```

Reglas para los 1:1:

- Enviar por TeamBot como **Adaptive Card 1:1** (`recipient_kind='chat_1on1'`), no al chat grupal.
- Usar Microsoft Entra Object ID crudo como `recipient_user_id`; **no usar** prefijo `29:`.
- Mantener el CTA `Abrir informe` apuntando al mismo link de Notion del reporte mensual.
- Hacer `dry-run` antes del envío real y auditar cada entrega en `greenhouse_sync.source_sync_runs`.
- No usar menciones dentro del 1:1: ya es un mensaje directo.
- Usar emojis con moderación (`📊`, `✨`, `🎯`, `⚠️` cuando aplique) y **negritas** para KPIs, fortalezas y oportunidades.
- La crítica debe ser operativa, no personal: separar calidad, plazos, capacidad y sistema de trabajo.
- Contextualizar dependencias anteriores: si un atraso nace en editorial, aprobación o insumos, distinguir el tiempo heredado del tiempo de ejecución de la persona.
- Tratar muestras pequeñas de onboarding como línea base, no como tendencia estable ni evaluación definitiva.
- No llamar a alguien "sobrecargado" sólo por el conteo de tareas. Si el operador corrige esa interpretación, conservar las cifras y mover la oportunidad a la señal verificable correspondiente (por ejemplo FTR, cierre o coordinación).
- Para casos sensibles, nombrar el problema con honestidad y empatía; evitar exposición innecesaria y cerrar con una acción concreta.

### Evidencia operativa — agosto 2026

El 2026-09-01 se ejecutó el ciclo completo de agosto: anuncio grupal en `EO Team` y cuatro lecturas 1:1 para Daniela, Andrés, Melkin y Valentina. El grupo usó seis bloques, CTA al mismo informe y cuatro menciones explícitas; el readback de Teams devolvió las cuatro como `aadUser`. Después, cada 1:1 revalidó `accountEnabled=true`, confirmó ausencia de duplicado, hizo dry-run y registró un outcome `succeeded` independiente.

Aprendizajes verificables:

- La cuenta canónica observada de Valentina es `valentina.hoyos@efeonce.org`; `valenta.hoyos@efeonce.org` no resolvió en Entra. No depender del alias escrito: resolver y enviar con el Object ID activo.
- `get_chat_members` puede quedar incompleto o desfasado respecto del render de una mención. Usarlo como preflight, pero verificar el mensaje publicado: `mentions[].mentioned_user_identity_type='aadUser'` es evidencia más directa de que Teams reconoció la identidad.
- Un `succeeded` 1:1 prueba aceptación del transporte y auditoría, no lectura. No reportar `delivered` o leído sin una señal distinta.
- La evidencia exacta de esta corrida vive en [`2026-09-01-performance-report-teambot.md`](../audits/communications/2026-09-01-performance-report-teambot.md); los IDs históricos no se convierten en roster permanente.

### Mensajes individuales HR/People fuera de pagos

`pnpm teams:announce` solo resuelve destinos grupales/canales registrados; no es un CLI genérico para DMs. El CLI de pagos 1:1 tampoco debe reutilizarse para aniversarios, vacaciones u otras comunicaciones HR.

Mientras no exista un CLI gobernado para mensajes individuales genéricos, un envío manual aprobado puede usar un script temporal y acotado que llame al dispatcher canónico `sendViaBotFramework`. Ese puente debe cumplir todo lo siguiente:

- aprobar el texto completo antes del envío;
- resolver nuevamente la identidad en Microsoft Entra y exigir `accountEnabled=true`;
- usar `recipient_kind='chat_1on1'` y Microsoft Entra Object ID crudo;
- enviar una Adaptive Card sin mención y sin `activity.text`;
- preservar cada párrafo como `TextBlock` separado para mantener legibilidad;
- exigir `--dry-run` o `--yes`, nunca ambos, y bloquear el envío real sin `--yes`;
- usar `sourceObjectId` determinístico, revisar duplicados y registrar inicio/resultado en `greenhouse_sync.source_sync_runs`;
- usar los helpers canónicos de transporte y auditoría, nunca HTTP Bot Framework crudo ni el conector personal de Teams.

Para comunicaciones HR, verifica antes las afirmaciones de fechas, saldos y política contra sus fuentes dueñas. Un resultado `succeeded` prueba aceptación por el transporte y auditoría, no lectura ni renderizado confirmado. Si el mensaje será recurrente, debe converger a Notification Hub con `dynamic_user`, no permanecer como script temporal.

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
