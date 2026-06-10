# Nexa — icon system v1

Signature mark de Nexa AI. Cuando aparece, el usuario sabe que ese espacio tiene a Nexa
para consultar. Construido sobre tokens AXIS.

## Regla de oro
**El arco y la chispa siempre van juntos. La chispa nunca aparece sola.**
Aislada, la estrella de 4 puntas lee como el destello de Gemini — y Nexa corre sobre
Gemini, así que parecería el mark del proveedor, no de Nexa. La unidad mínima del sistema
es el mark completo.

## Anatomía
- **Arco (sonrisa):** calidez + curva de crecimiento. Color: Electric Teal.
- **Chispa:** señal "aquí hay AI". Solo existe acompañando al arco.

## Tokens
| Elemento            | Token AXIS        | Hex       |
|---------------------|-------------------|-----------|
| Arco                | Electric Teal     | `#00D4AA` |
| Chispa              | Core Blue         | `#0375DB` |
| Badge (fondo)       | Midnight Navy     | `#022A4E` |
| Chispa sobre badge  | White             | `#FFFFFF` |
| Mono                | `currentColor`    | hereda    |

## Archivos
| Archivo                | Uso                                                       |
|------------------------|-----------------------------------------------------------|
| `nexa-mark.svg`        | Mark a dos tintas. Inline en UI, headers, splash.         |
| `nexa-mark-mono.svg`   | Una tinta (hereda color del contexto). Inline en UI.      |
| `nexa-badge.svg`       | Contenedor squircle. App-launcher, avatar, entry point.   |

## Tamaños y clear space
- Mark inline: 20 / 24 / 32 px. El badge para 40+ px.
- **Piso del mark: ~20 px.** Debajo de eso la chispa se vuelve mancha; en espacios muy
  chicos usar el `nexa-badge` (contenedor relleno que mantiene presencia).
- Clear space mínimo alrededor del mark: la altura de la chispa.

## Reglas
- La chispa nunca va sola — siempre con el arco (ver regla de oro).
- Teal es el color firma de Nexa.
- Mono va con `currentColor` para adaptarse a light/dark y al color del contenedor.
- No rellenar el arco (es trazo, no figura).
- No usar la estrella de 4 puntas suelta como sustituto del mark.
- No mezclar con la ráfaga de otros productos del ecosistema; este mark es solo de Nexa.

## Pendiente para AXIS
- Optical-centering fino del lockup en Figma (la geometría v1 carga ligeramente a la derecha
  por la chispa).
- Definir variante "expandida" mark + wordmark "Nexa" si se requiere para marketing.
- Registrar en `DESIGN.md` como token de marca de la capa de inteligencia.
