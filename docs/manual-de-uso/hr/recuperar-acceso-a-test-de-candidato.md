# Recuperar acceso al test de un candidato

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Última actualización:** 2026-08-19 por Codex (TASK-1745, TASK-1746, ISSUE-160)
> **Estado operativo:** procedimiento preparado para rollout; la acción y su UI todavía no están habilitadas
> en producción. Hasta el corte formal, sigue la sección “Qué hacer hoy”.

## Cuándo usar este procedimiento

Úsalo cuando el candidato informa que no recibió el correo, perdió el mensaje o necesita otro acceso al mismo
assessment. No lo uses para cambiar la prueba, otorgar tiempo adicional ni reabrir una evaluación terminada.

## Qué significa “Enviado”

`sent` significa que Resend aceptó el despacho. No confirma llegada al buzón. Sólo un evento firmado
`delivered` confirma entrega técnica; `opened` y `clicked` son señales de interacción. El lifecycle de Resend
y su reconciliación todavía tienen rollout pendiente, por lo que hoy no debes presentar “Enviado” como prueba
de que el candidato recibió el mensaje.

## Qué hacer hoy, antes del rollout

1. Confirma que abriste la postulación y el assessment correctos; no operes desde la vacante como si fuera la
   instancia del candidato.
2. Verifica el correo registrado, el estado del assessment, el kill-switch del tipo
   `hiring_assessment_assigned` y el delivery/reactive log disponibles.
3. No canceles, no reasignes y no crees otra evaluación para obtener otro link.
4. No busques ni copies tokens desde SQL, logs, auditoría o payloads de outbox.
5. Explica al candidato que el equipo está verificando el acceso. Puedes confirmar por un canal alternativo
   previamente verificado que el caso está en revisión, pero no improvises una URL.
6. Escala el caso a People/Operations para recuperación controlada y conserva assessment ID, application ID,
   estado y delivery ID; nunca incluyas el token.

La ausencia de una acción de reenvío hoy es una limitación operativa conocida, no una autorización para usar
el sender genérico ni reconstruir el link.

## Procedimiento después del rollout

### 1. Confirma elegibilidad

| Estado | Acción |
|---|---|
| `assigned` o `sent`, sin inicio | Se puede recuperar |
| `in_progress`, plazo de respuestas vigente | Se puede recuperar; el reloj original continúa |
| `expired`, nunca iniciado y acceso vencido comprobado | Se puede recuperar con la razón exacta |
| `submitted`, `scored`, `cancelled` o plazo total vencido | No recuperar |
| Postulación retirada, rechazada o terminal | No recuperar |

### 2. Elige un solo canal

- **Reenviar por email:** úsalo cuando el correo sea correcto y no exista bloqueo del proveedor. La nueva
  vigencia para iniciar es de 14 días.
- **Generar enlace seguro:** úsalo cuando el email esté bloqueado o la persona pida un canal alternativo.
  Verifica primero identidad y destinatario. El enlace dura 24 horas para iniciar y se muestra una sola vez.

`bounced`, `complained` o `suppressed` bloquean email, pero no el enlace seguro. No uses email sólo para
“probar de nuevo” frente a uno de esos estados.

### 3. Registra el motivo y confirma

Elige una razón estructurada; no escribas diagnósticos, datos de salud ni contacto en texto libre. La acción
requiere una capability distinta por canal:

- `hiring.assessment.recover_access_email`
- `hiring.assessment.reveal_access_link`

Revisa assessment, postulación, canal y efecto antes de confirmar. La recuperación rota el acceso del mismo
assessment e invalida el anterior; no cambia etapa, puntaje ni respuestas.

### 4. Interpreta el resultado

- `sent` o aceptación equivalente: el proveedor aceptó el despacho, no confirma entrega.
- `delivered`: evento posterior del proveedor confirmó entrega técnica.
- `unknown`: pudo existir aceptación sin cierre local; no repitas a ciegas.
- cooldown o rate limit: espera el plazo indicado. El límite es 60 segundos entre acciones y tres rotaciones
  exitosas en 24 horas, sumando email y enlace seguro.
- provider block: cambia a enlace seguro si corresponde y puedes verificar al destinatario.
- replay: devuelve el recibo previo; nunca vuelve a mostrar el enlace.

## Compartir el enlace seguro

1. Confirma que estás hablando con la persona correcta por un canal verificado.
2. Copia el link en la primera respuesta exitosa; no recargues ni repitas la acción esperando volver a verlo.
3. Envíalo sólo a ese candidato. No lo pegues en tickets, notas, Teams, logs ni auditoría.
4. Indica que el nuevo acceso invalida cualquier enlace anterior y que el reloj no se reinicia si el test ya
   comenzó.

“Una sola vez” se refiere a la revelación al operador. El candidato puede recargar, guardar y enviar mientras
su sesión y plazos sigan vigentes.

## Tiempos que debes explicar

- Antes de iniciar: 14 días para email o 24 horas para enlace seguro.
- Después de iniciar: tiempo efectivo desde `started_at`, incluidas accommodations.
- Tras vencer respuestas: 30 minutos de gracia para enviar lo ya guardado; no admite respuestas nuevas.
- Sin límite declarado: ventana operativa de 24 horas desde el inicio.

Recuperar acceso nunca agrega tiempo. Si corresponde una accommodation, usa su flujo gobernado antes de
explicar el plazo final.

## Referencias

- Funcional: [Entrega y recuperación de acceso a tests](../../documentation/hr/entrega-y-recuperacion-de-acceso-a-tests.md)
- Emails: [Operar los Emails del Ciclo de Hiring](operar-emails-ciclo-hiring.md)
- Assessments: [Operar la Asignación de Tests por Etapa](operar-asignacion-de-tests.md)
