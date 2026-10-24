# Lanzar un evento o webinar

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-10-24 por Claude (sesión «Portada del blog v3»)
> **Ultima actualizacion:** 2026-10-24 por Claude (estado tras la prueba de punta a punta)
> **Documentacion tecnica:** [BLOG_HOME_RUNTIME_V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) ·
> [Contrato de Growth Forms](../../architecture/growth-public-forms-runtime-contract.md)

> **Estado (2026-10-24): no lances eventos reales todavía.**
>
> - **Reservas:** funcionan y llegan a HubSpot (probado con el evento de prueba `prueba-e2e-eventos-2026-10-24`).
> - **Correos:** hoy **no salen en producción**. La prueba destapó un defecto (el correo exigía un estado de la reserva
>   que ya había cambiado); está corregido en el código, pero falta un release para que llegue al `ops-worker`.
> - **HubSpot:** hoy cada reserva es sólo un envío al formulario «Reserva de eventos | Blog Efeonce» con la propiedad
>   «Último Evento Reservado» (se sobrescribe en cada reserva). No viaja si quedó confirmada o en lista de espera ni se
>   usa el objeto **Eventos de marketing** de HubSpot.
> - **En diseño:** la integración evento ↔ HubSpot (objeto Eventos de marketing) ↔ posible webinar de Teams, en la
>   investigación RESEARCH-013 (`docs/research/RESEARCH-013-annexes/`). Se define antes del próximo release.

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
  híbrido), speakers, **tres** aprendizajes, agenda, cupo (opcional), **enlace privado de la sala** (Zoom, Meet,
  Teams…) y **arte clave** (imagen; obligatoria para el bloque grande de la portada).

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
