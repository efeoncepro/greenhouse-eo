# ARMOR EPPS — negocio en HubSpot

> **Tipo:** registro interno del expediente · **Portal:** Efeonce `48713323`

## Alta del negocio — 28/10/2026

Autorizado por Julio en el chat: «Sí, crea el negocio […] y haz el readback». Antes de crearlo se verificó que no
existía ningún negocio de ARMOR o Indecaucho: 0 asociados a las Companies 59393386572 y 60018354510, al Contact
255985568411, y 0 con «armor» en el nombre.

| Campo | Valor leído después del alta |
| --- | --- |
| Deal | **66992325527**, `ARMOR | EC | Piloto de Performance | 2026-10` |
| Pipeline / etapa | `default` / `qualifiedtobuy` (Calificado para comprar) |
| Monto | Vacío (el precio no está aprobado) |
| Fecha de cierre | 2026-11-04: referencia de la revisión con la gerencia, no un cierre pactado |
| Propietario | Julio Reyes (75788512) |
| Company | 59393386572 (Indecaucho, `indecaucho.com`), etiqueta **Primary** |
| Contact | 255985568411 |
| Meeting | 119610757452 (reunión del 27/10), asociación en ambos sentidos |

El readback de las asociaciones se hizo con la HubSpot Agent CLI (`associations list --from deals:66992325527`). El
índice de búsqueda tardó en reflejar el negocio filtrando por Company y Contact.

## Pendiente

- El duplicado de la empresa, 60018354510 (`indecaucho.ec`), y el del contacto, 257975486849, siguen sin fusionar y
  sin el negocio.
- Monto y etapa se actualizan cuando el precio se apruebe y la propuesta se presente.
