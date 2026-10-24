# Lanzar un evento o webinar

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-10-24 por Claude (sesión «Portada del blog v3»)
> **Ultima actualizacion:** 2026-10-24 por Claude (sesión = webinar de Teams, conector de HubSpot caído, diseño futuro)
> **Documentacion tecnica:** [BLOG_HOME_RUNTIME_V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) ·
> [Contrato de Growth Forms](../../architecture/growth-public-forms-runtime-contract.md) ·
> [RESEARCH-013](../../research/RESEARCH-013-events-webinars-hubspot-teams.md) (decisiones y backlog)

> **Estado (2026-10-24): no lances eventos reales todavía.** El pendiente completo está en un solo lugar: el
> [backlog de RESEARCH-013](../../research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos).
> Los eventos reales se lanzan recién después del release que lo cierre y de una prueba de punta a punta.

## Estado actual

### Qué funciona hoy

- **El lanzador** publica el formulario de reserva, el destino en HubSpot, el evento en WordPress y la sección de
  `/blog/` (ver «Paso a paso»).
- **Reservas:** funcionan y llegan a HubSpot (probado con el evento de prueba `prueba-e2e-eventos-2026-10-24`).
  Greenhouse lleva el **cupo** y la **lista de espera**.
- **HubSpot:** cada reserva es sólo un envío al formulario «Reserva de eventos | Blog Efeonce» con la propiedad
  «Último Evento Reservado» (se sobrescribe en cada reserva). No viaja si quedó confirmada o en lista de espera ni se
  usa el objeto **Eventos de marketing** de HubSpot.

### Qué falta

- **Correos:** hoy **no salen en producción**. El defecto (el correo exigía un estado de la reserva que ya había
  cambiado) está corregido en el código local, **sin release**.
- **Píldora:** el autocompletado y el «¡Listo!» centrado están corregidos en local, **sin release**.
- **El diseño final no está construido:** inscribir a cada persona confirmada en el webinar de Teams con su enlace
  personal, leer la asistencia, escribir el Evento de marketing en HubSpot, el enlace «ya no puedo ir» y el paso
  automático desde la lista de espera (ver «Cómo se verá cuando esté terminado»).
- **Decisiones abiertas:** quién manda la confirmación con el enlace (Greenhouse o Teams), si la píldora pide nombre y
  apellido (Teams los exige para inscribir; hoy sólo pide correo), cómo se cancela en Teams y el diseño final de los
  correos.
- Todo sale en **un solo release**, cuando el operador lo decida.

### La sesión es un webinar de Teams

La sesión se hace como **seminario web (webinar) de la app Eventos de Teams**, no como una reunión normal. El webinar
trae sus propios roles (presentadores y asistentes sin micrófono ni cámara), preguntas y respuestas, página del evento,
correos e informe de asistencia.

El tenant de Efeonce es Microsoft 365 **Business**: inscripción básica, hasta 1.000 asistentes, **sin lista de espera ni
aprobación en Teams**. Por eso el cupo y la lista de espera los lleva Greenhouse.

Cómo se crea hoy:

1. En Teams, abre **Eventos** → **Crear evento** → **Seminario web**.
2. Completa los datos del webinar y **publícalo**.
3. Si es una prueba, ponle el prefijo `prueba-` al nombre y ocúltalo de la app Eventos para que no lo vea nadie más.

Con el flujo de hoy, el lanzador pide un enlace fijo de la sala (`joinUrl`), el mismo para todas las personas. En el
diseño final recibirá el id del webinar y cada persona tendrá su propio enlace.

**Webinars de prueba por cancelar o despublicar** (pendiente del operador): «La IA no conoce tu negocio» (24-oct) y
«La IA y la busqueda» (26-oct).

### El conector de Teams en HubSpot no funciona

- La app «Microsoft Teams (Nivel de administrador)» está conectada en HubSpot desde el 2026-08-06, con la
  sincronización de webinars activada. Aun así **HubSpot no lee ningún webinar de Teams**: los dos webinars nuevos no
  aparecen, «Sincronizar ahora» no crea nada y Eventos de marketing sigue en 0.
- Del lado de Microsoft está todo en orden: permisos con consentimiento de administrador, política de acceso de Teams
  asignada también al organizador (2026-10-24 14:09) e inicios de sesión de la app sin error. No lo resolvió.
- Hay un caso abierto con el soporte de HubSpot: **ticket #50018204746**, derivado a un agente humano.
- Mientras siga roto, el diseño final hace que Greenhouse escriba el Evento de marketing por la API. Si el soporte lo
  arregla, el conector toma ese evento y Greenhouse deja de escribirlo: **una sola fuente por evento**, para no duplicar.

**Qué no hacer con el conector:**

- **No desinstales la app de Teams en HubSpot.** Es la única forma de reautorizarla, y no se hace por iniciativa propia.
- **Reconéctala sólo si el soporte lo recomienda**, en horario tranquilo y después de capturar (pantallazos) toda su
  configuración.

> Detalle: [anexo C — diagnóstico del conector](../../research/RESEARCH-013-annexes/C-teams-hubspot-sync-diagnosis.md).

## Cómo se verá cuando esté terminado (futuro)

> **Nada de esto está construido todavía.** Es el diseño acordado; el detalle está en el
> [anexo D](../../research/RESEARCH-013-annexes/D-greenhouse-owned-events-discovery.md) y el avance en el
> [backlog](../../research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos).

1. **Creas y publicas el webinar en Teams**, como hoy.
2. **Lanzas el evento con el lanzador**, que recibe el id del webinar (ya no un enlace) y comprueba que esté publicado,
   con la fecha correcta y sin aprobación manual.
3. **Greenhouse crea el Evento de marketing en HubSpot** (mientras el conector siga caído).
4. **Alguien reserva en `/blog/`.** Si hay cupo, Greenhouse lo **inscribe en el webinar** y la persona recibe su
   **enlace personal**. Si el cupo está lleno, queda en lista de espera: no se inscribe en Teams ni aparece en HubSpot.
5. **Si alguien avisa «ya no puedo ir»** desde su correo, se libera el cupo; la primera persona de la espera queda
   confirmada, se inscribe en el webinar y recibe un correo «ya tienes cupo».
6. **Al terminar la sesión**, Greenhouse lee el informe de asistencia del webinar y marca quién asistió (con hora de
   entrada y salida). En HubSpot cada persona queda como inscrita, cancelada o asistente del evento.

Costo nuevo: ninguno (Teams, Microsoft Graph y la API de HubSpot ya están incluidos).

## Para qué sirve

Publicar un evento o webinar de Efeonce con reserva real en un solo paso, sin desarrollar nada. Un comando deja:

- el **formulario de reserva** publicado en Greenhouse (píldora en línea, cupo y lista de espera);
- el **destino en HubSpot**: cada reserva crea o actualiza el contacto con la propiedad «Último Evento Reservado»;
- el **evento en WordPress** (`/eventos/<slug>/`), con su arte clave, `.ics` y marcado `Event`, conectado al formulario;
- la **sección «Eventos y webinars» de `/blog/`** con la reserva real (aparece sola y sale sola al terminar);
- los **correos**: confirmación con el enlace privado de la sala y el evento adjunto (`.ics`), aviso de lista de
  espera si el cupo está lleno, y recordatorio antes del inicio.

> El diseño de los correos es **provisional** (2026-10-24): funcionan y llevan la marca, pero falta su diseño final.

## Antes de empezar

- El visto bueno del operador: lanzar publica en el sitio y escribe en HubSpot.
- `pnpm public-website:ssh-check` en verde y credenciales locales de Greenhouse (`.env.local`).
- Los datos del evento: título, bajada, descripción, fecha y hora, duración, modalidad (en línea, presencial o
  híbrido), speakers, **tres** aprendizajes, agenda, cupo (opcional), **enlace privado de la sala** (el del webinar
  de Teams, ver «La sesión es un webinar de Teams») y **arte clave** (imagen; obligatoria para el bloque grande de la portada).

## Paso a paso

1. **Copia el brief de ejemplo** y complétalo:

   ```bash
   cp scripts/growth/events/examples/webinar.example.json tmp/mi-evento.json
   ```

   | Campo | Qué poner |
   |---|---|
   | `slug` | Identificador corto y estable (`webinar-aeo-chatgpt-2026-11-12`). Es la URL `/eventos/<slug>/`. |
   | `startUtc` | Inicio en **UTC** (`2026-11-12T13:00:00Z` = 10:00 de Chile en verano). |
   | `timezone` | Zona con la que se lee la hora (`America/Santiago`). |
   | `joinUrl` | Enlace privado de la sala. **Sólo viaja en los correos**: nunca llega a la página, al navegador ni a WordPress. |
   | `capacity` | Cupo (opcional). Lleno → lista de espera (`overCapacity: "waitlist"`) o rechazo (`"reject"`). |
   | `reminderMinutesBefore` | Cuánto antes sale el recordatorio (por defecto 120). |
   | `keyArt` / `keyArtAlt` | Ruta local de la imagen y su texto alternativo. |
   | `speakers` | `{ "user_id": 1 }` para alguien con usuario en WordPress, o `{ "name": "…" }`, con `role` y `org`. |

2. **Revisa el plan** (no escribe nada):

   ```bash
   pnpm events:launch -- --brief tmp/mi-evento.json
   ```

   Comprueba que el formulario compila «sin enlace privado en el contrato público» y lo que haría en cada capa.

3. **Lanza** (con el visto bueno):

   ```bash
   pnpm events:launch -- --brief tmp/mi-evento.json --apply
   ```

   Al final verifica el contrato público, la página del evento con `Event` y purga `/blog/`.

4. **Mira la portada en vivo**:

   ```bash
   pnpm public-website:blog-home verify --browser
   ```

   La sección «Eventos y webinars» muestra el evento con su cuenta regresiva y el botón «Reservar mi lugar».

5. **Haz una reserva de verdad** desde `/blog/` con un correo propio. Llega la confirmación con el enlace y el `.ics`.
   La verificación anti-bot (Turnstile) bloquea a los navegadores automatizados: esta prueba la hace una persona.

## Cambiar, mover o cancelar

- **Cambiar datos** (hora, enlace, cupo): edita el brief y vuelve a lanzar con `--apply`. Publica una versión nueva
  del formulario y depreca la anterior; WordPress actualiza el mismo evento. Las reservas ya hechas conservan su
  versión: si cambió la hora o el enlace, avisa a los inscritos por otra vía.
- **Cancelar**: `pnpm public-website:blog-home retire event <id> --apply` (sale de la portada).
- **Ver el estado**: `pnpm public-website:blog-home status` (eventos, estado `upcoming`/`live`/`ended`).

## Qué significan los estados

| Señal | Significado |
|---|---|
| `registrationStatus: confirmed` | Lugar reservado: recibe confirmación con enlace, `.ics` y recordatorio. |
| `registrationStatus: waitlisted` | Cupo lleno: recibe el aviso de lista de espera, sin enlace ni recordatorio. |
| Evento `ended` | Ya pasó inicio + duración: sale solo de la portada. |
| Sin `form_key` en el evento | La portada no muestra reserva (sólo calendario y página del evento). |

## Qué no hacer

- No pegar el enlace privado en la descripción, la bajada ni ningún campo de WordPress: va sólo en `joinUrl`.
- No crear el evento a mano en WordPress sin formulario: la portada no mostraría reserva.
- No apagar `GROWTH_EVENT_EMAILS_ENABLED` con eventos abiertos: las reservas quedarían sin confirmación.
- No usar `--skip-wordpress` salvo en pruebas (`slug` con prefijo `prueba-`).

## Problemas comunes

| Problema | Causa | Qué hacer |
|---|---|---|
| No llega la confirmación | Hasta el release de la corrección (2026-10-24), el correo se salta porque la reserva ya pasó a `delivered` cuando HubSpot respondió primero. Después: flag apagado en el `ops-worker` o el consumer aún no corre (cada 5 min) | Confirma que el release con la corrección llegó al `ops-worker`; luego revisa el flag en la revisión activa y `greenhouse_notifications.email_deliveries` (`source_event_id = event_reg_<submissionId>`). |
| La portada no muestra el evento | Sin arte clave, inicio ya pasado o caché | Revisa con `blog-home status` y purga con `blog-home purge --apply`. |
| La píldora no carga en la portada | La superficie no permite el slug | El lanzador lo agrega (`allowFormSlugOnSurface`); relanza. |
| `El enlace privado se filtraría…` | Un dato del brief repite el enlace | Quita el enlace de todo campo que no sea `joinUrl`. |

## Referencias técnicas

- Lanzador: `scripts/growth/events/launch-event.ts` · ejemplo `scripts/growth/events/examples/webinar.example.json`.
- Correos: `src/lib/growth/forms/event-emails.ts`, `event-ics.ts`, plantilla `src/emails/EventRegistrationEmail.tsx`
  (provisional), consumer `growth_event_registration_email_from_submission`, ruta `/growth/events/reminders` del
  `ops-worker` y job `ops-growth-event-reminders` (cada 15 min). Flag `GROWTH_EVENT_EMAILS_ENABLED`.
- HubSpot: propiedad `ef_event_key` («Último Evento Reservado») y formulario «Reserva de eventos | Blog Efeonce».
- Portada: reserva real por `form_key` del evento, superficie `fhsf-efeonce-blog-events`.
