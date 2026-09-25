# Efeonce Marketing Studio — Gestión de campañas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-09-25 por Claude
> **Documentacion tecnica:** [Arquitectura de Marketing Studio](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) · [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)

## Qué es

Marketing Studio (`studio.efeonce.org`) es el lugar donde vive cada campaña de Efeonce: sus conceptos, piezas,
copys, anuncios configurados, plan de medios y calendario. Reemplaza al Campaign Manager en HTML que vivía en
OneDrive y agrega lo que ese archivo no podía dar: una base de datos, acceso remoto y una API.

Es un producto separado de Greenhouse y de Globe. Globe produce piezas; Studio organiza la campaña que las usa.

## Qué muestra

| Pantalla | Para qué sirve |
|---|---|
| **Hoy** | Las decisiones que frenan la pauta: presupuesto sin aprobar, posts con fecha pasada que siguen «pendientes», pauta bloqueada, campañas sin piezas. También las próximas publicaciones y el inventario. |
| **Campañas** | Todas las campañas con su portada real y los tres estados: creatividad, autorización de medios y lanzamiento. |
| **Espacio de campaña** | Piezas por concepto y formato (los huecos son formatos que no se produjeron), una vista de cómo se vería la pieza en el feed con su copy real, los anuncios configurados y la URL con UTM. Pestañas de copys, anuncios, medios y calendario. |
| **Calendario** | Vuelos de pauta y publicaciones orgánicas de todas las campañas, mes a mes. |
| **Piezas** | Todas las piezas de todas las campañas. |
| **Medios** | El plan de medios: presupuesto propuesto, aprobado y gasto real, siempre por separado. |
| **Búsqueda (⌘K)** | Encuentra campañas, piezas y frases de copy. |

Tiene modo claro y oscuro: el botón de sol/luna arriba a la derecha lo cambia y la preferencia se recuerda.

> Detalle técnico: pantallas y tema en la sección 8 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

## Reglas que la plataforma respeta

- **Tres estados, nunca un «aprobado» genérico.** Una campaña puede tener la creatividad aprobada y la pauta bloqueada al mismo tiempo, y Studio lo muestra así.
- **Propuesto no es gasto.** Un presupuesto propuesto nunca aparece como gasto; si no hay datos de gasto, dice «Sin datos de gasto».
- **Programado no es publicado.** Un post cuya fecha ya pasó, con estado «pendiente», queda marcado para verificarlo en Metricool; Studio no asume que salió.
- **El copy es literal.** Se muestra exactamente como se aprobó.
- **Lo que falta, se dice.** Un dato sin fuente aparece como ausente, no como cero.

## Acceso

Por ahora Studio se puede ver sin iniciar sesión y es solo de lectura: nadie puede cambiar datos desde la web.
Los buscadores no lo indexan. El inicio de sesión con la cuenta Efeonce (`auth.efeonce.org`) llega en una
etapa posterior del programa (EPIC-049).

## De dónde salen los datos

Hoy los datos se importan desde el Campaign Manager de OneDrive y del registro de campañas del repo. Las
imágenes que ves son versiones livianas generadas a partir de los originales, que siguen en OneDrive. Mientras
no exista la edición en Studio, OneDrive sigue siendo la fuente y Studio se actualiza reimportando.

> Detalle técnico: import y renditions en las secciones 7 y 7.1 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).
