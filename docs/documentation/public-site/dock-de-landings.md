# Dock de las landings — Barra inferior de efeoncepro.com

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [Navegación global del sitio público §Dock inferior de las landings](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#dock-inferior-de-las-landings-task-2043)

## Qué es

Es la barra de vidrio que aparece abajo mientras alguien lee una landing de `efeoncepro.com` (activa en las siete
landings desde el 23 de octubre de 2026), con el siguiente paso de
esa landing: agendar una reunión o ir al formulario. Antes cada landing tenía su propia barra, con siete estilos
distintos; ahora todas usan la misma, del mismo vidrio que el menú de arriba.

> Detalle técnico: el componente vive en AXIS (`efeonce.landing-dock`) y en WordPress lo pinta el plugin
> `eo-landing-dock`. Ver la arquitectura enlazada arriba.

## Qué ve el visitante

- **Al llegar**, sobre el hero, no hay barra: el hero ya tiene sus botones.
- **Al leer**, la barra sube desde abajo. En escritorio queda centrada, a veces con una frase y uno o dos botones; en
  el teléfono ocupa el ancho, sólo con los botones.
- **El color del vidrio** cambia según lo que hay detrás: claro sobre secciones claras, oscuro sobre secciones oscuras
  y fotos.
- **El botón principal** lleva el color de la línea de servicio de la landing (por ejemplo naranja en Brand, rosado en
  HubSpot, azul en SEO). En el inicio, que no es de una línea, es blanco o navy como el botón del menú.
- **Se aparta** cuando llega el formulario o el cierre de la página, cuando se abre el menú y cuando el aviso de
  cookies ocupa su lugar. En SEO, Performance e Influencers, una vez que se llega al destino de su botón, no vuelve
  hasta el final de la página.
- **Agendar** abre el agendador de reuniones dentro de la misma página.

## Qué landing tiene qué

| Landing | Dónde se ve | Botones |
|---|---|---|
| Redes Sociales | Escritorio | «Reunión» (agenda) y «Auditoría» |
| Influencers | Escritorio y teléfono | «Agenda una reunión» y «Cuéntanos tu campaña» (en el teléfono, sólo «Agenda una reunión») |
| Inicio | Teléfono | «Agenda una reunión» |
| SEO | Teléfono | «Diagnostica tu visibilidad» |
| Inbound | Teléfono | «Agenda una reunión» y «Diagnóstico» |
| Servicios HubSpot | Teléfono | «Agendar reunión» e «Ir al formulario» |
| Performance | Teléfono | «Agenda un diagnóstico» |

Los textos son los que cada landing ya tenía. Cada landing conserva dónde tenía su barra (decisión del operador, 23 de
octubre de 2026).

## Reglas

- Una sola barra por página: cuando la nueva está encendida, la antigua de esa landing no aparece.
- Cada landing se enciende y se apaga por separado, y apagarla devuelve su barra antigua.
- Las reuniones agendadas desde la barra se miden aparte como `landing_dock`.

> Detalle técnico: cómo se enciende, revisa y apaga, en el
> [manual de operación](../../manual-de-uso/public-site/operar-dock-de-landings.md).
