# BytePlus directo: producción propia y biblioteca de retratos

Este carril permite al operador de Efeonce producir imagen, capas, video y audio directamente con BytePlus
mediante comandos locales. Mantiene referencias, decisiones, resultados y consumo por solicitud. La cuenta
operativa es **3004839361**, con Google SSO **jreyes@efeoncepro.com**, región Johor y proyecto `default`.
La cuenta histórica `3003660328` es independiente, se utilizó por error y está excluida de la operación.

La CLI local se usa para producción propia. Su acceso no habilita una integración en Studio, MCP o Globe;
Globe conserva su estado de hibernación. [OmniHuman / Vision AI](omnihuman.md) es otra superficie y su acceso
se verifica por separado.

## Qué habilita cada aprobación

| Estado | Qué permite | Qué falta comprobar |
|---|---|---|
| Modelo activado y clave válida | Solicitar operaciones autorizadas del modelo en esa cuenta | Derechos de inputs y calidad útil por operación |
| KYC empresarial aprobado | Acreditar la identidad de la empresa en la cuenta | Carta y activación de Advanced Creation Rights |
| Carta aceptada y Entry activo | Usar la biblioteca privada dentro de su cupo | Carga, estado de cada asset y prueba real de inferencia |
| Retrato `Active` | Preparar una solicitud con su ID de la misma cuenta | Que la operación termine correctamente y conserve identidad |
| Video generado | Evaluar un candidato | Revisión creativa, derechos y autorización de entrega/publicación |

**Corte verificado 2026-10-17:** KYC aprobado, carta aceptada por instrucción expresa de Julio y Entry activo,
`Billing mode Free`. La biblioteca correcta aún tiene **0/50 archivos y 0/50 grupos usados**. La carga de Antonio
quedó detenida por el acceso local a archivos de Chrome; no se creó grupo ni se ejecutaron nuevas pruebas.
El [ledger por cuenta](../../operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md) conserva
el estado vigente, los cambios de autorización y la evidencia fechada; consultar allí antes de continuar.

## Biblioteca y costos

Los retratos virtuales representan personajes propios con evidencia de creación y derechos. Los retratos de
personas reales requieren su autorización y verificación correspondientes. KYC y Entry no reemplazan esos permisos.
La carta exige conservar fuentes, intervenciones creativas, prompts y registros que sustenten el personaje.

Entry tiene un cupo compartido de **50 archivos y 50 grupos**, entre retratos virtuales y reales. Un grupo reúne
las vistas de un personaje; dos imágenes consumen dos archivos. El borrado no recupera el cupo. Los 12 archivos y
seis grupos históricos de la cuenta equivocada no son los assets de producción ni sus IDs pueden reutilizarse.

Entry gratuito habilita esa biblioteca. La generación de video mantiene su tarifa propia: estimación, consumo
registrado y factura son estados distintos. Durante estas pruebas se conserva Entry gratuito; no hay autorización
para comprar recursos, cambiar el plan o modificar credenciales.

## Continuidad del lote autorizado

El alcance pendiente es sólo el paquete aprobado de doce PNG, dos por personaje. Primero se carga Antonio,
se espera `Active` en ambas imágenes y se verifica el cupo. Luego se prueban borradores de 4 segundos a 480p:
como referencias de rostro/cuerpo y como primer cuadro sólo de rostro. La activación del plan aún no prueba
ninguna de esas dos operaciones. Sólo después de una referencia exitosa se continúa con Nexa, Hum, Isabella,
Karo y Sophia, en ese orden. Cada resultado, incluso un error, queda registrado en el ledger.

El operador decide alcance, hechos declarados, firma y gasto. Un agente puede preparar o ejecutar actos cuando
estén autorizados; una pausa expresa sigue vigente hasta que el operador la cambie. La orden posterior «Firmala»
autorizó esta carta después de la pausa inicial. No constituye permiso general para aceptar otros acuerdos.
Los códigos de verificación y claves no se conservan en la documentación.

Pasos, comandos, permisos y recuperación: [manual de BytePlus directo](../../manual-de-uso/creative-studio/byteplus-directo.md).
Cliente, contrato de runtime y límites de integración: [decisión técnica](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md).
