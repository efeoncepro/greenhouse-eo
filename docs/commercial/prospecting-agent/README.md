# Radar comercial Efeonce

Brochures: [aprobados para uso comercial íntegro, sin revalidar ni recortar](../../operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md), ratificado por Julio el 17-10-2026. Usar el documento existente de HubSpot; la copia Aloja de 38 láminas no está aprobada.

Nombres de Deal/Lead: [convención vigente Efeonce](../../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

Owner: Commercial / Julio Reyes. Contrato aprobado el 13-10-2026.
[Registro de corridas](REGISTRO.md) · [Decisión de método](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## Operación vigente

La automatización `prospecci-n-hubspot-reporte-diario` se convirtió de heartbeat a cron en el mismo ID,
verificado en la configuración local el 13-10-2026. Cada ejecución abre una tarea nueva en el proyecto
`greenhouse-eo` y entrega su reporte, incluso con cero hallazgos. Diario a las **09:00 America/Santiago**.
La próxima ejecución efectiva todavía no se ha observado; la configuración sí está guardada y activa.
No crear una tarea adicional dentro de la corrida ni duplicar el scheduler.

Cobertura: Chile, Perú, Colombia y México × SEO/AEO, web, creatividad/contenidos, CRM/HubSpot y medios
(planning/buying, paid digital, programmatic y DOOH). Veinte combinaciones; consultas y bloqueos explícitos.
ICP: empresas de 50+ personas verificadas, prioridad 201+, o filial con grupo mediano/grande y pertenencia
acreditados; separar escala local y global. Excepciones previas de una cuenta no cambian el ICP.

**Nuevas convocatorias para postular: publicadas dentro de la misma semana calendario de Santiago,
desde el lunes 00:00 hasta la corrida, y abiertas con evidencia.** Primera pasada: últimas 48 horas dentro
de esa semana; al menos 70% del esfuerzo de descubrimiento en la semana. Una fecha de rastreo o un filtro
no verifica publicación. Fecha relativa imprecisa queda sin confirmar. No rellenar resultados con históricos.
Procesos anteriores conocidos y todavía abiertos mantienen seguimiento separado. Señales de dos meses
sirven para credenciales y consideración futura, no para recomendar postulación. Recuperación de procesos
vencidos requiere instrucción concreta vigente; no inferir selección o adjudicación.

### Primera entrada y alertas tempranas — ajuste documental 15/10

Aplicar la [guía compartida](../tenders/RADAR_EARLY_ENTRY_GUIDE.md) en próximas investigaciones: separar
descubrimiento amplio y vigilancia de conocidos; público/privado independientes en Chile, Colombia,
México y Perú, nonprofit aparte, cinco líneas conservadas. LATAM primero y Palm Desert condicionado.
Avisar al operador señales tempranas documentadas con acción útil sin esperar el RFP completo ni
certificar elegibilidad. Priorizar interés, credenciales, inscripción y visita además del cierre final.

La pasada de 48 horas/semana se complementa con **solape mínimo de 72 horas desde el último corte
exitoso**, incluso al cruzar lunes; ampliar ante indexación tardía acreditada o interrupción y declarar
ventana real. No reclasificar publicaciones anteriores como nuevas de la semana. Prechequear identidad
canónica y URL contra bloqueos; ante falla, conservar marcadores de éxito/cobertura/IDs vistos y registrar
el intento fallido, sin rutas equivalentes. Cobertura bloqueada no equivale a cero demanda.

Por señal: publicación, disponibilidad pública, primera detección, validación, primer aviso y margen
útil a la primera puerta, con fuente/precisión/zona y desconocidos. Alta CRM no sustituye detección.
Menos de cinco días hábiles muestra **detección tardía**; no inventar calendario ni causa del retraso.
[Socopur](../tenders/socopur-agencia-marketing-digital-2027/README.md) quedó cerrado para ingreso tardío
por respuesta de Katherine del 15/10 16:54:36 UTC; su histórico no es una recuperación todavía pendiente.

Este ajuste no revalida ni cambia las automatizaciones citadas arriba, su frecuencia/suscripción o permisos.
La cronología provisional del radar horario desde el 10/10 pertenece al análisis de Socopur, no acredita
la ejecución de este cron diario. **Corrección directa de Julio, 15/10/2026 17:51 UTC:** Socopur se detectó
el 06/10/2026, sin hora/zona acreditadas, un día calendario después del cierre de interés del 05/10;
no son 24 horas exactas. El radar horario y el alta CRM del 10/10 son posteriores y no explican la detección
tardía del día 6. Publicación, disponibilidad/indexación inicial, primer aviso exacto y causa sin acreditar.
La skill personal `hubspot-saas-prospecting` y sus playbooks viven fuera
de este proyecto. La revisión ampliada confirmó que el SKILL.md ya carga el núcleo actualizado con
precedencia y quedó intacto. Los dos playbooks de acción/frescura se actualizaron mediante aprobación
puntual de escritura para esos archivos; sin cambiar permisos persistentes ni instalar copias.
[Rutas, diff y verificación de la aplicación](../../audits/commercial/2026-10-15-socopur-radar-docs-skills.md#aplicación-puntual-de-las-dos-referencias-personales).
Ante divergencia de su guía de frescura, este ajuste explicita el solape/primera puerta para el trabajo en
este repo; no afirmar que se propagó al scheduler o a otro host. Eficacia y adopción requieren evidencia
de futuras corridas; la guía no garantiza exhaustividad ni avisos en tiempo real.

## Registro por corrida

1. Leer este registro, skills y el historial privado antes de buscar; los chats nuevos no tienen toda la conversación.
2. Crear `runs/YYYY-MM-DD-HHMM.md` y `queries/YYYY-MM-DD-HHMM.json`, hora Santiago, con sufijo si existe.
3. Guardar las consultas reales, país/línea, filtros/ventana, fuente y fecha de lectura, resultados/descartes,
   bloqueos, acciones, IDs estables y cambios/aprobaciones/CRM. Si falta el dato no reconstruirlo como observado.
4. Actualizar REGISTRO.md con enlaces, totales únicos y resultado. Nunca sobrescribir una corrida previa.
5. No guardar PII, correos individuales, teléfonos, credenciales, URLs firmadas o raw de Apollo en el repo.
   Redactar PII de consultas con marca explícita. Evidencia completa y cambios CRM quedan privados.
6. No hacer commit/push por el mandato diario. Preservar trabajo ajeno. El repo conserva trazabilidad saneada,
   no una segunda base de contactos ni una copia completa del historial privado.

Datos e IDs: `/Users/jreye/.codex/agent-data/hubspot-saas-prospecting/opportunities.json`.
Skill personal: `/Users/jreye/.codex/skills/hubspot-saas-prospecting/SKILL.md` y sus tres playbooks de
servicios, acción y frescura. Método reusable: `.codex/skills/efeonce-b2b-prospecting/`.
Si falta acceso a esos archivos, registrar el bloqueo; no recrear registros ni presumir aprobaciones.

## Autoridad y verificación

Investigación no autoriza CRM, créditos, Deals, notas ni envíos. Reutilizar aprobaciones válidas por lote y
alcance; registrar decisión en privado para continuidad. Contactos nuevos requieren correo laboral individual
verificado; comprobar Primary Company y altas automáticas después de crear. No marcar interés HubSpot por
necesidades de otras líneas. Las etiquetas locales no son enums CRM. Cada corrida muestra acciones,
evidencia, huecos, cobertura y changeset para aprobación si procede; cero resultados también se reporta.
No scraping LinkedIn, contacto automatizado, formularios, secuencias ni consumo recurrente de créditos.
