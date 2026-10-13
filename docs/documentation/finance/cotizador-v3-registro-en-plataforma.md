# Cotizador V3 — registro de cotizaciones en la plataforma

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.1
> **Creado:** 2026-10-12 por Claude (TASK-2025)
> **Última actualización:** 2026-10-12 por Claude
> **Documentación técnica:** [modelo de datos](../../architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md) ·
> [decisión](../../architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md)

**Estado:** la base del registro existe en la plataforma desde el 2026-10-12, con el catálogo vigente copiado. Todavía
no hay cotizaciones registradas, y ninguna pantalla ni API la usa: eso llega con las siguientes etapas del programa.

## Qué es

Hasta ahora una cotización de V3 era un archivo en una máquina. El registro es el lugar de la plataforma donde una
cotización pasa a tener número, versiones, estado y responsables. No cambia cómo se calcula: el motor es el mismo
que usa la línea de comandos.

## Cómo vive una cotización

| Estado | Qué significa |
| --- | --- |
| Borrador | Se creó con su primera versión. No tiene número. Se puede cambiar la destinataria y el documento. |
| Emitida | Se le envió al cliente una versión concreta, con su documento y una fecha de vigencia. Recibe su número. |
| En revisión | Se abrió para preparar una versión nueva o corregir el documento. El cliente sigue teniendo la última emitida. |
| Aceptada | El cliente aceptó lo último que se emitió. |
| Rechazada | El cliente rechazó lo último que se emitió. |
| Retirada | Se dio de baja. Es el único estado del que no se vuelve. |

- **Vencida** no es un estado que se guarde. Una cotización emitida o en revisión se muestra como vencida cuando pasó
  su fecha de vigencia. Para renovarla se vuelve a emitir con una fecha nueva; conserva su número.
- Una cotización vencida se puede aceptar igual. Queda registrado que la aceptación fue fuera de vigencia y por
  cuántos días.
- Una cotización aceptada o rechazada no queda cerrada: se puede abrir una versión nueva. También es la forma de
  corregir una respuesta mal registrada.
- Para retirar una cotización aceptada o rechazada, primero se abre una revisión.

## Versiones

Cada versión es el cálculo congelado tal como salió del motor. Nunca se modifica: corregir es agregar la versión
siguiente. El mismo cálculo no puede estar en dos cotizaciones vivas a la vez.

## El número

- Se asigna la primera vez que la cotización se emite. Un borrador no tiene número.
- La primera cotización real es `EO-QTE-15001`; las siguientes son correlativas, sin saltos.
- No cambia nunca: emitir una versión nueva o renovar la vigencia conserva el mismo número.
- Las cotizaciones de prueba tienen su propia numeración (`EO-QTE-T-1`…) y no consumen números reales.

## Quién puede hacer qué

| Acción | Quién |
| --- | --- |
| Ver el catálogo, simular, crear y editar cotizaciones | administración de Efeonce, cuentas, finanzas (administración y análisis) |
| Emitir y retirar | administración de Efeonce, cuentas, administración de finanzas, y un agente |
| Registrar que el cliente aceptó o rechazó | quien puede editar cotizaciones, y un agente |
| Guardar una versión nueva del catálogo | administración de Efeonce y de finanzas |
| Activar un catálogo | administración de Efeonce y de finanzas, **siempre una persona** |
| Aprobar una excepción bajo el piso de margen | administración de Efeonce, **siempre una persona** |

Un agente puede llevar una cotización por todos sus estados sin que una persona apruebe cada paso. Lo único que no
puede hacer es aprobar una excepción bajo el piso ni activar un catálogo.

## Bajo el piso de margen

El motor marca cuándo alguna línea de una cotización queda bajo su margen mínimo. Una versión así no se puede emitir
sin que una persona apruebe la excepción, la emita quien la emita. La aprobación vale para esa versión: una versión
nueva necesita la suya. Se puede revocar mientras la versión no se haya emitido.

## A quién va dirigida

Toda cotización es de Efeonce. La destinataria es una organización cliente o potencial cliente. Es opcional en un
borrador y obligatoria para emitir; después de la primera emisión no se cambia. Ser la destinataria no da acceso a
nada en la plataforma.

## El catálogo

El catálogo, la política de recursos y el catálogo de créditos se guardan una vez por versión, y un puntero dice
cuáles rigen. Por ahora el repositorio sigue siendo la fuente: la plataforma guarda una copia exacta. Guardar una
versión nueva nunca la activa; activar es un acto aparte.

## Lo que todavía no existe

Pantallas, APIs y herramientas para agentes sobre el registro; el envío al cliente y el registro de que lo vio;
ganada y perdida, y su salida a HubSpot; que el documento imprima la fecha de vigencia registrada.

> Detalle técnico: [modelo de datos](../../architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md). Código en
> `src/lib/commercial/quoter/`.
