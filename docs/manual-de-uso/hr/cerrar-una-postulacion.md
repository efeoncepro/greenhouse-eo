# Cerrar una Postulación — Declarar el Desenlace y su Causa

> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.0
> **Creado:** 2026-08-22 por Claude (TASK-1765)
> **Ultima actualizacion:** 2026-08-22 por Claude (TASK-1765)
> **Documentacion funcional:** [Desenlace de una postulación](../../documentation/hr/desenlace-de-una-postulacion.md)

## Para qué sirve

Para terminar el proceso de una persona candidata dejando registrado **cómo terminó**, de modo que el
Banco de Talento, el embudo de equidad, el correo que recibe y el reloj de borrado de sus documentos
se comporten como corresponde.

## Antes de empezar

- Necesitas el permiso `hiring.application.decide`. Mover tarjetas entre columnas usa otro permiso
  (`hiring.application.write`) y **no** alcanza para cerrar.
- Ten decidido el desenlace **y**, si es «Sin selección», su causa. El sistema no te deja avanzar sin
  ella.
- Ten a mano la razón en tus palabras: son mínimo 8 caracteres y queda en el historial permanente.

## Paso a paso

1. Abre la postulación (Application 360) o el Hiring Desk.
2. Elige el desenlace. Si es **Selección** o **Reserva**, el sistema además te pide el destino
   (contratación interna, staff augmentation, etc.).
3. Si elegiste **Sin selección**, elige la causa: el cupo lo tomó otra persona · se cerró la
   búsqueda · se canceló el proceso.
4. Escribe la razón. Es tuya y es defendible: el scorecard es un insumo, nunca decide por ti.
5. Confirma.

Al confirmar, y **en una sola operación**, el sistema deja la postulación cerrada con su desenlace,
agrega una entrada permanente al historial, avisa a los procesos que dependen de la decisión y —si
ese desenlace tiene correo— lo despacha.

## Qué significan las señales que puedes ver

| Lo que ves | Qué pasó | Qué hacer |
|---|---|---|
| «Cerrar una postulación exige declarar el desenlace…» | Intentaste cerrar arrastrando la tarjeta a «Cerrado» | Usa la decisión formal, no el arrastre |
| «Indica por qué esta persona no quedó…» | Elegiste «Sin selección» sin causa | Elige una de las tres causas |
| «La causa sólo corresponde cuando la persona llegó al final y no quedó» | Pusiste causa en un desenlace que no la admite | Quita la causa, o cambia el desenlace a «Sin selección» |
| «La postulación ya tiene decisión formal…» | Alguien ya la cerró | Revisa el historial: la decisión vigente está ahí |
| «La clave de idempotencia ya fue usada con otra decisión» | Se reintentó una confirmación cambiando algo | **No reintentes a ciegas.** Abre la postulación y mira su estado real antes de volver a enviar |

## Qué NO hacer

- **No cierres arrastrando la tarjeta a «Cerrado».** No funciona, y es a propósito: ese camino no
  registraba la decisión, no mandaba el correo y **congelaba el borrado de los documentos de esa
  persona en todas sus postulaciones**.
- **No uses «Descarte» cuando no hubo un juicio sobre la persona.** Si el cupo lo tomó otra, si se
  cerró la búsqueda o si se canceló el proceso, el desenlace es **Sin selección** con su causa.
  «Descarte» la saca del Banco de Talento y distorsiona el análisis de equidad de su cohorte.
- **No registres como «Retiro» a alguien que simplemente dejó de responder.** Retiro es cuando la
  persona lo dijo. Silencio es **Sin respuesta**, que no le atribuye nada y no le manda correo.
- **No uses un cierre para pausar.** Para pausar, deja la tarjeta en la columna «Decisión».
- **No reintentes una confirmación que no sabes si pasó.** Lee el estado primero.

## Problemas comunes

**Cerré con el desenlace equivocado.** Se corrige con una decisión nueva: el historial es
append-only y conserva la anterior enlazada, así que queda la trazabilidad completa. No se borra ni
se edita la entrada vieja.

**Cerré a alguien y no le llegó correo.** Es esperable en dos casos: **Sin respuesta** no manda
correo nunca (por diseño), y **Sin selección** todavía no tiene su tipo de correo propio — lo entrega
`TASK-1762`. Mientras tanto no manda nada, que es preferible a mandarle un correo de rechazo a
alguien que nadie rechazó.

**Necesito archivar registros de prueba.** Archivar no es cerrar, y no toca el desenlace de nadie —
son ejes independientes a propósito. Pero **hoy no hay forma de archivar desde el portal**: el comando ya
existe y falta el botón (`TASK-1748`). Si tienes acceso a consola, el procedimiento gobernado está en
[Operar la procedencia de datos de Hiring](operar-procedencia-de-datos-hiring.md); si no, pídeselo a
plataforma. En ningún caso cierres
un registro de prueba con un desenlace inventado para «sacarlo de en medio»: ensucia el embudo de
equidad y las métricas de la vacante. Déjalo donde está y pídele a plataforma que lo archive.

## Referencias técnicas

- ADR del vocabulario: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- Command: `src/lib/hiring/decide.ts` · `POST /api/hiring/applications/[id]/decide`
- Señal de salud: `hiring.application.closed_without_outcome` en `/admin/operations`
