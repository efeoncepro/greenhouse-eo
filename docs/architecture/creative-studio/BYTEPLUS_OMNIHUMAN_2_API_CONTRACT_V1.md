# BytePlus OmniHuman 2.0 — contrato externo y frontera de integración

- Estado: investigación verificada al **2026-10-15**, sin implementación Vision AI.
- Dueño: AI Creative Operations.
- Decisión relacionada: [BytePlus directo](EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md).
- Evidencia: [auditoría API y cuenta](../../audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md).
- Operación y ejemplos: [manual API](../../manual-de-uso/creative-studio/omnihuman-2-api.md).
- Uso y aceptación: [documentación funcional](../../documentation/creative-studio/omnihuman.md).

## Identidad y autoridades

OmniHuman 2.0 pertenece a **Vision AI**, con `req_key=realman_avatar_picture_omni20_cv`.
No comparte el contrato HTTP de ModelArk/Seedance, Seed Speech ni Gemini Omni. El audio ya debe existir;
el modelo anima una imagen con esa interpretación y un prompt opcional.

| Evidencia | Qué permite afirmar |
|---|---|
| API pública del fabricante | Contrato documentado de envío, consulta y cancelación; audio de 4–300 s |
| Consola autenticada Efeonce, 15/10 | Modelo `Disabled`, botón `Enable model`, US$0,07/s antes de impuestos, concurrencia 1; ficha UI con límite de audio 120 s |
| Código local revisado | `byteplus.ts` y `ai:byteplus` sólo transportan ModelArk/Seed Speech; OmniHuman no está conectado |
| Prueba de inferencia de la cuenta | Pendiente; ni las credenciales existentes ni el partnership sustituyen esa evidencia |

La diferencia 120/300 s se conserva por superficie. Cinco minutos es capacidad **publicada de API**,
sin prueba real en esta cuenta. No ampliar claims de calidad, derechos o disponibilidad por un anuncio.

## Dos transportes de autenticación

| Transporte | Endpoint | Operaciones |
|---|---|---|
| AK/SK, firma HMAC-SHA256 V4; servicio `cv`, región `ap-singapore-1` | `https://cv.byteplusapi.com/`, query `Version=2024-06-06` | `CVSync2AsyncSubmitTask`, `CVSync2AsyncGetResult`, `CVCancelTask` |
| API Key de IAM, Bearer | `https://openapi.cv.bytepluses.com` | `/api/common/v3/submit_task_v2`, `/api/common/v3/get_result_v2`, `/api/common/v3/cancel_task` |

No intercambiar credenciales/hosts ni inferir permiso Vision AI desde `BYTEPLUS_API_KEY`. Política IAM,
credencial dedicada y almacenamiento seguro quedan para la implementación; no se crearon en esta investigación.
Detalle primario: [API 2.0](https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman-2-0-video-generation)
y [API Key](https://docs.byteplus.com/en/docs/byteplus-vision/api-key-usage-instructions).

## Condiciones para un futuro consumidor

- Mantener este carril separado del catálogo ejecutable hasta implementar y verificar su transporte.
- Validar entradas contra el contrato 2.0 del manual; no heredar máscaras, stitching, parámetros o parser 1.5.
- Guardar `task_id` y recibo no secreto antes de consultar. Comprobar `code == 10000` antes de leer `data`;
  `done` por sí solo no certifica éxito. No repetir automáticamente el POST tras respuesta ambigua.
- Consultar con espera acotada; cancelar sólo `in_queue`. Timeout local no demuestra cancelación o costo cero.
- Ingerir el resultado a almacenamiento privado: URL de salida válida una hora; tareas expiran a las doce horas.
  Verificar bytes, duración, resolución, audio y aceptación humana antes de declarar entrega.
- Preservar `enable_watermark: true` por defecto. Consentimiento de imagen/voz y términos Vision AI se verifican
  específicamente; no trasladar indemnidad, residencia o retención de ModelArk por analogía.
- No crear ruta, binding, promoción Globe, oferta comercial o tool MCP como efecto de esta documentación.

## Salida de investigación y siguiente paso

La investigación y el routing de agentes quedan documentados. AI Creative Operations debe preparar una unidad
de implementación si el operador pide conectarlo: activación, credencial de mínimo privilegio, consumidor,
recuperación, presupuesto, canario corto y validación posterior de duración larga. Activación, gasto y derechos
de entrega siguen siendo decisiones verificables separadas. Esta ficha no acepta una arquitectura runtime nueva.
