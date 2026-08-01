# Discovery interno — Polpaico LIC-6533

> Audiencia: interna. No enviar al comprador. Fecha: 2026-07-31.

## 1. Hechos confirmados

| Tema | Evidencia | Lectura operativa |
|---|---|---|
| Proceso | RFP v3.0 consolidada, julio 2026 | Proceso de cotización aprobado por Polpaico; no es una exploración RFI. |
| Comprador | RFP + invitación Wherex | Grupo Polpaico BSA / Polpaico Soluciones S.A. |
| Plataforma | RFP §§1, 3, 6 | Salesforce Service Cloud ya operativo; Email-to-Case es el canal actual. |
| Servicio | RFP §§1, 4, 9 | Implementación y configuración de Agentforce para Post Venta, privilegiando capacidades nativas. |
| Human-in-the-loop | RFP §§4, 5 y Anexo A | La IA sugiere; el ejecutivo CSC valida, corrige, gestiona y cierra. No hay cierre automático ni envío automático. |
| Entregables | RFP §9 y Anexo C | Diseño, implementación, pruebas/UAT, go-live, reversa, hypercare, capacitación y documentación. |
| Roles | RFP §11 | Arquitecto Salesforce, consultor Agentforce, consultor Service Cloud y PM obligatorios; especialista IA deseable. |
| Evaluación | RFP §13 | 80% no económico; la experiencia, equipo y método son decisivos. |
| Pago | RFP Anexo D | Factura a 60 días desde emisión. |
| Cierre | Wherex/Outlook | LIC-6533; 24/08/2026 16:00 Chile. |

## 2. Alcance funcional confirmado

- Analizar correos, casos y adjuntos.
- Identificar información relevante y faltante.
- Sugerir tipo, categoría, subcategoría, línea de negocio, prioridad y criticidad.
- Generar resumen ejecutivo, contexto, riesgos, acciones sugeridas y pendientes.
- Proponer respuestas preliminares basadas en el caso y fuentes autorizadas.
- Exponer métricas de procesamiento, clasificación, derivación manual, precisión, uso, productividad y adopción.
- Permitir administración funcional y técnica por Polpaico y evolución a nuevos casos de uso.

## 3. Desafío comercial real

El comprador necesita una primera implementación que sea útil en la operación del CSC, pero que no cree una caja negra ni una dependencia permanente del proveedor. La propuesta debe vender reducción de fricción y control: clasificación asistida, resumen consistente, preparación de respuesta, observabilidad y transferencia de conocimiento dentro del modelo de permisos existente.

La conversión esperada no es un lead web. Es la adjudicación de una implementación acotada y gobernada, con una ruta de expansión a otros casos de uso de IA sobre Salesforce.

## 4. Señales explícitas e implícitas

### Explícitas

- Prefieren configuración estándar y minimización de desarrollo personalizado.
- Consideran seguridad, auditoría, permisos y no almacenamiento externo como condiciones mínimas.
- Quieren administrar y evolucionar la solución sin dependencia permanente.
- Exigen certificaciones y experiencia verificable, no solo una demo.

### Implícitas / hipótesis

- **H1 — comprador TI + negocio:** el sponsor es CSC y el responsable técnico es BP TI; habrá que satisfacer velocidad operacional y arquitectura/gobierno.
- **H2 — aversión a riesgo:** human-in-the-loop, reversa, hypercare y trazabilidad son mecanismos de decisión, no anexos.
- **H3 — primera ola:** el alcance funciona como foundation use case; un diseño extensible puede diferenciar, pero no debe inflar el primer release.
- **H4 — posible presión económica:** la evaluación asigna 20% al precio y exige separar licencias/Flex Credits; la transparencia de TCO puede proteger frente a una oferta artificialmente baja.

Las hipótesis no deben aparecer como hechos client-facing sin validación.

## 5. Información que falta / preguntas críticas

1. Volumen de casos, correos y adjuntos; distribución por línea de negocio y complejidad.
2. Edición, versión, licencias y límites vigentes de Salesforce Service Cloud y Agentforce.
3. Disponibilidad real de Agentforce, Flex Credits, Data Cloud/Data 360 o servicios relacionados; quién los contrata.
4. Taxonomía actual de categorías, subcategorías, líneas de negocio, prioridades y criticidades.
5. Estado, volumen y calidad de Salesforce Knowledge; idiomas y documentos autorizados.
6. Integraciones, objetos, flows, Apex/LWC, permisos, sandboxes, DevOps y restricciones de despliegue.
7. Criterios de precisión, aceptación UAT, métricas base y target operacional.
8. Horario de soporte requerido, severidades, SLA y duración exacta de la garantía/hypercare.
9. Duración contractual, fecha objetivo de go-live y ventanas de cambio.
10. Formato de carga económica en Wherex, validez exigida, garantías, multas, retenciones y condiciones contractuales adicionales.
11. Requisitos de residencia, tratamiento de datos, DPA, subcontratación y auditoría de proveedores.
12. Lista real de oferentes, incumbente Salesforce y reglas de interacción/shortlist.

## 6. Admisibilidad y bid/no-bid preliminar

**Resultado:** `HOLD — no autorizar cotización todavía`.

Razón: el encaje de problema es alto, pero no existe en este discovery evidencia suficiente de que Efeonce pueda presentar los roles certificados obligatorios, referencias Agentforce/Service Cloud comprobables, capacidad de delivery Salesforce y economics sobre loaded cost. La decisión puede pasar a `GO` cuando esos puntos tengan owner y evidencia.

## 7. Competidores plausibles y diferenciación

La lista siguiente es un mapa de mercado, no evidencia de participantes reales en LIC-6533: Entel Digital, Digital eXp, GoCode, Southcross, CoIT/ColibriIT, Freeway y grandes integradores Salesforce. Confirmar participantes solo mediante Wherex o comunicación autorizada.

La diferenciación defendible para Efeonce no debe ser “IA innovadora”. Debe ser una propuesta de implementación segura y operable: arquitectura nativa, matriz C/CF/D/T/NC honesta, human-in-the-loop, trazabilidad, gobierno funcional, transferencia real, plan de reversa, métricas de adopción y separación transparente entre servicios profesionales, licencias y Flex Credits. Esto exige un partner Salesforce/consultores certificados reales o un modelo de colaboración formal, nunca credenciales prestadas o claims no verificables.

## 8. Decisión de formato

El RFP pide una propuesta; no exige explícitamente un deck. Recomendación provisional: primero construir la oferta técnica y económica auditables. Solo crear deck técnico/económico separado si Wherex permite adjuntarlos sin reemplazar anexos obligatorios y si el deck ayuda a un comité mixto a leer arquitectura, método, riesgo y TCO. No se debe producir un deck cosmético antes de resolver capacidad, certificaciones y precio.
