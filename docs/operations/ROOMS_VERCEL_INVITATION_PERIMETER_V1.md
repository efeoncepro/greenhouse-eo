# Rooms — perímetro de invitaciones en Vercel

Fecha: 2026-10-25. Owner: Rooms, TASK-2066/2068. Estado: propuesta preparada; reglas NO activadas.
Complementa el ADR Rooms y la evidencia `docs/audits/rooms/2026-10-25-invitation-token-hardening.md`.

## Evidencia actual

- Proyecto `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo`, team `team_gmNiF4YCHmc1wqsHUTCvqjmN`, slug `efeonce-7670142f`.
- API autenticada de Vercel confirma plan Pro. API de configuración activa del firewall responde 404
  `Config not found`; esto no demuestra que falte protección DDoS de plataforma.
- El conector MCP no resuelve este proyecto con su cuenta actual. Lecturas anteriores se hicieron con CLI
  autenticada y salida filtrada, sin imprimir credenciales. No se creó configuración ni se cambió el plan.
- Rate limiting nativo está disponible en Pro; no requiere pentest contratado ni otro proveedor.
  Tiene precio por uso, referencia publicada USD 0.50 por millón de requests permitidos, dependiente
  de región. Revisar Spend Management y condiciones efectivas antes de habilitar; no asumir costo cero.
- La lectura `billing.controls` sólo expuso controles de Analytics; no acredita límite global de gasto
  del firewall. El presupuesto global sigue pendiente de readback específico; no cambiarlo en silencio.

Diff preparado: [`rooms-vercel-invitation-rules.proposed.json`](rooms-vercel-invitation-rules.proposed.json).
Cuatro reglas validadas localmente contra el schema PUT de `https://vercel.com/openapi.json` (conversión
semántica nullable de OpenAPI para AJV). El schema PATCH rules.insert publicado limita la acción a
deny/challenge/log y no describe rate_limit; no inventar un payload PATCH compatible. PUT sí declara
rateLimit, pero reemplaza configuración: usarlo sólo tras readback/diff seguro y sin perder reglas ajenas,
o usar el editor nativo. El JSON propuesto no es una publicación ni una llamada API ejecutada.

## Reglas propuestas para el piloto

Ventana fija de 60 segundos, clave IP nativa de Vercel y acción HTTP 429. Valores iniciales de piloto,
no umbrales de capacidad ya medidos. Paths exactos y método restringido; las cuatro reglas son disjuntas.

| Nombre | Método y path | Requests/IP/minuto |
| --- | --- | ---: |
| rooms-invitation-write | POST `/api/invitations/start`, `/verify`, `/resend`, `/logout` bajo el mismo prefijo | 120 |
| rooms-invitation-read | GET `/api/invitations/session`, `/api/invitations/transaction` | 240 |
| rooms-login | GET `/login` | 30 |
| rooms-invitation-authority | POST `/api/internal/auth/invitation-authority/resolve` | 240 |

Sin challenge en S2S, sin bloqueo permanente y sin excepción basada en cabeceras aportadas por el cliente.
No registrar Authorization, Cookie, códigos ni cuerpos; no enviar secretos a analítica. El rate del
dominio conserva sus límites por invitación/realm/acción y el issuer sus presupuestos OTP independientes.

## Activación y verificación coordinadas

1. Confirmar proyecto, plan, Spend Management, configuración y versión vigentes inmediatamente antes
   del cambio. Obtener schema oficial REST y preparar diff exacto. Si existe configuración nueva, conservarla.
2. Crear sólo reglas propias y guardar IDs/versión para reversión. No sobrescribir toda la configuración
   si aparecieron reglas de otros owners. No activar rulesets de pago adicionales por inferencia.
3. Mantener emisión OFF mientras se prueba 429, recuperación tras ventana y ausencia de challenge en S2S.
   Variar X-Forwarded-For no debe eludir la cuota de la IP efectiva. Verificar otra IP independiente y
   tráfico legítimo tras NAT; registrar límites no verificables en vez de afirmar cobertura.
4. Verificar también no-store/no-referrer, fragmento retirado y CSP en UI; alinear sender/tracking OFF con
   issuer. Root Auth coordina el único correo a `jreyes@efeoncepro.com` autorizado por el operador.
5. Habilitar sólo piloto controlado una vez que issuer/Rooms hayan pasado sus gates. Registrar por separado
   aceptación del proveedor, recepción del correo y acceso efectivo. No amplía clientes ni migra Greenhouse.

Rollback: deshabilitar emisión y retirar/restaurar sólo IDs/versión de estas reglas; no desactivar globalmente
el firewall ni tocar otros proyectos. La revocación y lectura de gestión deben seguir disponibles.

Fuentes oficiales verificadas:
[rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting),
[uso y precios](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing),
[API](https://vercel.com/docs/vercel-firewall/firewall-api),
[configuración](https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration).
