> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-26 por Claude
> **Ultima actualizacion:** 2026-06-26 por Claude
> **Documentacion tecnica:** [TASK-1255](../../tasks/in-progress/TASK-1255-growth-forms-pii-hardening-ley-21719.md) · [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md)

# Postura PII de los Formularios Públicos (Ley 21.719)

## Qué hace

Los formularios públicos de Growth capturan datos personales de los leads: correo, teléfono y, en algunos casos, **cédula/RUT**. La Ley 21.719 (protección de datos de Chile) exige tratar esos datos con cuidado: minimizar quién los ve, no enviarlos donde no corresponde, y dejar rastro de cada acceso.

Greenhouse aplica una postura **proporcional al dato** (no todo se protege igual):

| Dato | Cómo se guarda | En el panel admin | Llega a HubSpot |
|---|---|---|---|
| **Cédula / RUT** | **Cifrada** (AES-256-GCM), fuera del bloque de datos en claro | Enmascarada (`xx.xxx.678-K`); el valor completo requiere *revelar* | **No** (nunca sale del portal) |
| **Correo** | En claro (HubSpot lo necesita para crear el contacto) | Enmascarado (`j***@empresa.cl`); el completo requiere *revelar* | **Sí** |
| **Teléfono** | En claro | Enmascarado; el completo requiere *revelar* | **Sí** (si el admin lo mapea) |
| Empresa, nombre, mensaje | En claro | Visible | Sí (si el admin lo mapea) |

> Detalle técnico: el cifrado de la cédula es application-layer con una llave gobernada en GCP Secret Manager; el RUT se mueve a la columna `encrypted_fields_json` para que el envío a destinos externos no lo vea. Ver `src/lib/growth/forms/pii/`.

## Por qué la cédula es distinta

La cédula es el dato más sensible y **no hace falta** que viaje a HubSpot (HubSpot necesita el correo, no el RUT). Por eso se cifra y se queda en Greenhouse. El correo, en cambio, sí debe fluir al CRM para crear y contactar al lead, así que se mantiene en claro — pero enmascarado en el panel para que no quede a la vista de cualquiera.

## Revelar un dato (ver el valor completo)

Cuando un operador necesita el valor completo de un dato enmascarado (por ejemplo, el correo real para contactar al lead), usa la acción **Revelar**. Esa acción:

1. Requiere un **permiso específico** (`growth.forms.lead_pii.reveal`) — más restringido que solo ver la lista de leads. Hoy lo tienen administradores internos y operaciones, no los roles comerciales.
2. Exige escribir una **razón** (mínimo 10 caracteres) — queda registrada.
3. Deja una **fila de auditoría que no se puede borrar** (quién, cuándo, qué campo, con qué razón). Nunca se guarda el valor revelado, solo el hecho de que se reveló.

> Detalle técnico: el reveal corre en `revealSubmissionPiiField` (`src/lib/growth/forms/pii/reveal.ts`); el rastro vive en `greenhouse_growth.lead_pii_reveal_audit` (append-only, con trigger que bloquea modificar o borrar).

## Señal de alerta

Una señal de confiabilidad vigila los reveals: `growth.forms.pii_reveal_without_reason`. En estado sano es **0**. Si aparece un reveal sin razón válida, significa que alguien saltó el control (por ejemplo, un acceso directo a la base de datos) y hay que investigar.

## Retención (pendiente)

La política de **retención y purga** (borrar leads pasada la ventana legal) está diseñada pero **pendiente de activar**: espera la definición legal de la ventana (default propuesto: 24 meses). Mientras tanto, los leads se conservan y la purga no corre.

> Detalle técnico: Slice 4 de TASK-1255, diferido. Flag `GROWTH_FORMS_RETENTION_PURGE_ENABLED` (default OFF, aún no declarado).
