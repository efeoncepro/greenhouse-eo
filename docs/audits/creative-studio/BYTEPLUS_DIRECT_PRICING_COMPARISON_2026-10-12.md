# Seedance 2.5: costo directo frente a Fal e Higgsfield API

Fecha de consulta: 2026-10-12. Alcance: **APIs**, una generación de 30 segundos, 16:9, sin video de entrada.
BytePlus usa la tarifa observada en la cuenta Johor; Fal la tarifa publicada del endpoint estándar (no US);
Higgsfield la fórmula devuelta por `/estimate/bytedance/seedance-2.5/text-to-video` con HTTP 200.
No se generó contenido durante esta cotización. El conector MCP y su saldo de créditos quedan fuera.

| Resolución y dimensiones nominales | Tokens nominales | BytePlus, tarifa de cuenta | Fal API | Higgsfield API, antes de descuento |
|---|---:|---:|---:|---:|
| 720p · 1280×720 | 648000 | US$6.9336 | US$13.8672 | US$13.8672 |
| 1080p · 1920×1080 | 1458000 | **US$17.0586** | **US$34.1172** | **US$34.1172** |

Fórmula: `ceil(ancho × alto × segundos × 24 / 1024)` tokens. Tarifa USD por millón:
BytePlus 10.7 a 480p/720p, 11.7 a 1080p; Fal/Higgsfield 21.4 a 480p/720p, 23.4 a 1080p.
Para estos mismos tokens, BytePlus es 50 % menor que Fal y que la tarifa base de Higgsfield. **No prueba**
50 % frente al precio final de Higgsfield si esa cuenta tiene un descuento: su respuesta sólo devolvió
`pricing_description`, con `usd`, `discountPercentage` y `discountUsd` nulos. Nulo no significa descuento 0 %.

Estas cifras son estimaciones por una salida nominal, no factura. Dimensiones, duración facturable y uso
real pueden variar. Se conserva el recibo por solicitud; con video de referencia cambian tarifa y tokens
facturables/minimos, por lo que esta tabla no se extrapola a edición/extensión o referencias de video.
El Savings Plan de US$30 es saldo/compromiso previo del operador y no se descuenta otra vez de la tarifa.

## Divergencias del estimador local observadas

- El estimador Fal actual usa el precio genérico 0.0214/1000 para 1080p y devuelve US$31.20: **subestima**
  la tarifa publicada de ese escalón (0.0234/1000). Para 1080p usar esta fórmula verificada, no ese resultado.
- El snapshot del CLI Higgsfield t2v permite 480p/720p, pero `/estimate` aceptó 1080p con HTTP 200.
  Es un desfase del snapshot; no se actualizó ni se generó un job en esta revisión.
- Esta auditoría documenta las diferencias y el cálculo correcto; no cambia guardrails ni promueve rutas Globe.

## Fuentes

- [Fal Seedance 2.5 t2v: tarifa y fórmula](https://fal.ai/models/bytedance/seedance-2.5/text-to-video).
- [BytePlus ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/model-pricing), junto con las tarifas
  efectivas de cuenta en `src/lib/ai/byteplus-catalog.ts` y la [auditoría de conexión](BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md).
- Higgsfield: respuesta live de su endpoint de estimate, sin generación ni datos privados. Declaró:
  `0.0214 USD/1000 video tokens at 480p or 720p; 0.0234 at 1080p; rates before applicable customer discount`.
  [Separación oficial de facturación API/MCP](https://higgsfield.ai/blog/automate-ai-video-n8n-make).
