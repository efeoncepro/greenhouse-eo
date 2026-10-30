# Portafolio de proyectos — Sitio público

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-29 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)

## Qué es

El portafolio de [efeoncepro.com](https://efeoncepro.com/portafolio/) muestra proyectos de Efeonce con su contexto:
para quién se hizo, qué tenía que resolver, la idea, cómo se ejecutó y qué pasó, con las piezas en su formato real
(imagen o video, vertical, cuadrado o apaisado). Lo administra el plugin «EO Portfolio», que reemplaza al portafolio
del tema Ohio.

## Cómo se guarda un proyecto

- Cada proyecto es una ficha con campos fijos. El sistema la revisa antes de guardarla: si falta algo obligatorio, no
  se guarda nada y dice qué falta.
- Cada cambio queda en el historial con quién lo hizo, cuándo y por qué. Se puede volver a una versión anterior sin
  borrar la historia.
- Si dos personas editan a la vez, la segunda recibe un aviso en vez de pisar el trabajo de la primera.

## La aprobación del cliente

- Un proyecto **no se publica sin la aprobación del cliente**: dónde quedó registrada, la fecha y qué cubre.
- La aprobación decide qué se ve:

| La aprobación cubre | Se ve |
|---|---|
| `logo` | el logo del cliente |
| `pieces` | las piezas (imágenes y videos) y la imagen principal |
| `metrics` | las cifras de resultados |
| `testimonial` | el testimonio |
| `creators` | los videos de creadores (además de `pieces`) |

- Lo que la aprobación no cubre no aparece, aunque esté cargado.
- Un video de creador necesita dos permisos: el del cliente sobre la campaña y el del creador sobre su imagen. Por eso
  pide `creators` además de `pieces`, y cada video guarda dónde quedó la autorización del creador (eso nunca se
  publica).

## Tipos de proyecto y de pieza

- Cada proyecto dice qué es: una campaña, un sitio web, una parte de un sitio, videos de creadores, un sistema u otro.
  Eso decide cómo se arma su página.
- Cada pieza dice qué es: una pieza de campaña, un sitio en pantalla (escritorio, teléfono o tableta, a veces la
  página completa), una parte de una página (con su nombre y dónde está), un video de creador (con su cuenta y
  plataforma), una pieza en su lugar, un diagrama o una respuesta de IA.
- Los proyectos anteriores, sin tipo, siguen siendo campañas.
- Cada publicación registra quién la hizo y con qué aprobación. Ese registro no es público.

## Las cifras

- Toda cifra lleva su fuente. Un porcentaje con fuente es lo único que activa la órbita de medida en el diseño.

## Quién puede hacer qué

| Acción | Quién |
|---|---|
| Crear y editar proyectos | Administradores y quien tenga el permiso de gestionar el portafolio |
| Publicar y despublicar | Administradores y quien tenga el permiso de publicar el portafolio |
| Ver proyectos publicados | Cualquier visitante, y otros sitios por la lectura pública en JSON |

## Estado actual

- Desde el 2026-10-30, `efeoncepro.com/portafolio/` es el portafolio nuevo: una portada con los 15 proyectos que ya
  estaban publicados en el sitio y una página por proyecto en `/portafolio/<proyecto>/`.
- Las direcciones viejas (`/project/<proyecto>/`) llevan directo a la página nueva de cada proyecto.
- Las cifras de la portada (piezas, campañas y marcas) son las de toda la agencia y se cambian sin tocar los proyectos.
- Falta: mostrar videos con reproducción (hoy ningún proyecto trae uno) y retirar las categorías viejas del portafolio
  de Ohio.

> Detalle técnico: [arquitectura](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md) ·
> [manual](../../manual-de-uso/public-site/operar-portafolio.md) ·
> [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md)
