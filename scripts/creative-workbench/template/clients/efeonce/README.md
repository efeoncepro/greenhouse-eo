# Efeonce — brand pack

Nuestra propia marca. Es el cliente con el sistema más codificado del workbench: la línea gráfica, la
fotografía de marca y los tokens viven como código y como documentos gestionados.

## Qué está codificado

| Tema | Dónde | Skill |
|---|---|---|
| Línea gráfica «La órbita» (órbita, lente, foco, voz con esfera, firma) | `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` | `efeonce-graphic-line` |
| Tokens y contratos visuales AXIS (color, tipografía, espaciado) | paquetes `@efeoncepro/axis-*` | `axis-design-system` |
| Fotografía de marca (equipo, oficina, Nexa, merch, logo 3D) | `docs/operations/brand-photography/README.md` + `pnpm foto:*` | `design-studio` |
| Selección de assets de marca en piezas generadas | `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` | `efeonce-brand-studio` |
| Piezas publicitarias con texto | `docs/operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md` | `efeonce-advertising-creative` |
| Piezas sociales | `docs/operations/SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md` | `social-media-studio` |

## Reglas que más se rompen

- **Firma:** logo Efeonce centrado. La burbuja con la URL va sólo si el logo ya está en la imagen.
- El logo es siempre el **SVG oficial compuesto después**, nunca generado por el modelo: 20 % del lado
  corto y contraste ≥ 4,5:1 medido.
- El plate fotográfico nace **sin logo ni texto**. Si la toma llevará texto, reserva el espacio desde
  la ficha (`docs/operations/brand-photography/`).
- Ropa, lanyard, merch, logo 3D, isotipo y mascotas: lo sensible se compone y el modelo sólo pone
  material y luz. Un modelo no sostiene una marca.
- La órbita no reemplaza la composición fotográfica: primero la foto tiene que funcionar sola.
- En las piezas de Efeonce, el copy va en español neutro y tuteo, sin voseo.

## Referencias

`pnpm assets:pull` baja las referencias aprobadas (identidades del equipo, Nexa, kits de vestuario,
poses de mascotas) que usa `pnpm foto:*`. Contienen fotos de personas del equipo: no salen del
workbench ni se usan fuera de piezas de Efeonce.
