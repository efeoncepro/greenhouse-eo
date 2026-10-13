# Calibración de voz del Prospecting Agent — 2026-10-07

Owner: Julio Reyes / Commercial. Estado: configuración guardada y persistencia verificada; versión vigente de 7.969 caracteres; QA del último
borrador pendiente. No se enviaron correos ni se inició comunicación.

## Alcance y fuentes

El operador pidió leer cinco a diez correos y ajustar el agente para conectar con más empatía. Se eligieron
ocho mensajes propios de Outlook, del 2026-09-29 al 2026-10-07, cubriendo prospección, seguimiento,
coordinación y respuesta breve; se excluyó un duplicado. Se contrastó con la voz personal canónica.
No se adjunta el corpus privado ni capturas de destinatarios al repo.

Identidad verificada: Julio Reyes; portal Efeonce Group 48713323; Starter Play 101042425.
La configuración se operó en la UI autenticada, Comunicaciones → Instrucciones avanzadas.
[Manual](../../manual-de-uso/hubspot/ajustar-voz-prospecting-agent.md) y
[ADR](../../architecture/HUBSPOT_PROSPECTING_AGENT_VOICE_DECISION_V1.md).

## Evolución observada

| Versión | Caracteres | Cambio / evidencia |
| --- | ---: | --- |
| Inicial | 0 | Campo vacío: la frase de ejemplo era placeholder. Límite de la UI: 10.000. |
| Voz | 5.222 | Contexto, empatía concreta, ritmo, seguimientos y veracidad; guardado y recarga. |
| CTA | 5.757 | Enlace configurado obligatorio en primer correo y seguimientos, respuesta alternativa. |
| Naturalidad | 7.300 | Seguridad sin dudas acumuladas, lenguaje cotidiano y apertura pertinente. |
| Foco | 7.550 | Investigar para encontrar motivo, sin recitar cargo/empresa; una situación y una capacidad. |
| Web institucional | 7.969 | Primera mención de Efeonce enlazada a efeoncepro.com; agenda preservada. |

El límite temporalmente interpretado como 1.000 fue corregido por el operador a 10.000; la versión abreviada
de 978 caracteres se canceló, no quedó aplicada.

Cada versión aplicada pasó por Guardar → Revisar cambios → Aprobar 1 cambio y lectura tras recargar.
El [snapshot de foco, previo al enlace web](../../operations/hubspot-prospecting-agent/julio-reyes-starter-play-2026-10-07.txt)
fue comparado íntegramente con el valor vivo: 7.550 caracteres, coincidencia exacta y sin cambios pendientes.
Ambos snapshots conservan el texto sin salto de línea adicional; el conteo no es tamaño en bytes.

## CTA y borradores

El operador reportó pérdida del enlace tras la primera redacción. Se verificó que Directrices conservaba
«Enlace predeterminando del remitente a la reunión» y «1 enlace». Se corrigió la ambigüedad del prompt,
sin cambiar ese ajuste. La influencia causal de la frase anterior no fue aislada técnicamente.

Dos capturas de borradores aportadas por el operador mostraron nuevamente «elegir un horario aquí».
La revisión editorial detectó dudas excesivas, párrafos densos, repetición del perfil y acumulación de
capacidades. Es evidencia de borradores intermedios, no de una generación posterior a la versión de 7.550.

No se investigaron de forma independiente los hechos empresariales usados por esos borradores.
La afirmación sobre experiencia con empresas tecnológicas B2B requiere sustento comercial; «15 minutos»
requiere concordancia con la agenda real. La presencia del enlace no verifica destino ni duración.

## Configuración preservada y límites

Se conservaron Voz de marca, Español - Chile, el enlace del remitente, revisión humana y los ajustes
observados de hasta cinco correos, dos días mínimos, treinta días de ventana y días laborables de
9:00 a 17:00 UTC-04:00. Registrar esa visualización no valida el huso horario para otras fechas.
No se cambió audiencia, autonomía ni enrollment, ni se pulsó Iniciar comunicación.

## Pendientes y siguiente verificación

Julio / operador comercial debe revisar un borrador generado después del último ajuste y los seguimientos,
comprobar destino y duración del CTA y validar los hechos/claims usados antes de autorizar un envío.
El siguiente agente puede preparar esa revisión dentro del alcance pedido; no interpretar este documento
como autorización permanente para comunicaciones externas.

Veredicto: PASS para persistencia del prompt; INCOMPLETO para QA de generación final y seguimiento.
Entrega o resultados comerciales: no evaluados. Esta documentación no cambia nuevamente el play.

## Cierre documental

Riesgo bajo: documentación y skills existentes, sin código, API ni integración nueva. Verificaciones:
snapshot idéntico al archivo de la sesión; enlaces relativos añadidos resolubles; tres pares de skills
Codex/Claude idénticos; gate global de mirrors y diff sin errores. Changelog rotado preservando la entrada
histórica íntegra; Handoff compactado con enlaces al canon. Context check estricto: cero avisos/errores.

El closure check acotado al índice deja dos avisos heurísticos sobre project_context y registro de skills.
Se revisaron: no se crea una skill ni cambia el router global; las referencias se añaden a skills ya
registradas, changelog y Handoff. project_context, AGENTS y CLAUDE no requieren duplicar este procedimiento.
El detector QA de integración se activa por las rutas HubSpot; no aplica pruebas de backend, Vercel o Teams
a este cambio documental. Veredicto del paquete documental: PASS; los pendientes de contenido live anteriores
siguen abiertos y no bloquean documentar fielmente su estado.

## Delta posterior: enlace institucional — 2026-10-07

El operador autorizó incorporar https://efeoncepro.com/ en la primera mención de Efeonce del primer
correo, como respaldo dentro de la capacidad pertinente; conservar agenda y respuesta por correo,
sin añadir una invitación a visitar la web ni explicar que falta el brochure. Se añadió al punto 4
sobre la capacidad de Efeonce, conservando el resto del texto: 7.550 → 7.969 caracteres.

Guardar → Revisar cambios → Aprobar 1 cambio → recarga y reapertura del campo: coincidencia exacta de
7.969 caracteres, sin cambios pendientes. El enlace de reunión configurado y revisión humana siguen
presentes. [Snapshot vigente](../../operations/hubspot-prospecting-agent/julio-reyes-starter-play-2026-10-07-enlace-web.txt).
La versión anterior y su evidencia se conservan como historia. No se generó ni envió un nuevo correo;
la inclusión efectiva de ambos enlaces sigue pendiente de QA del siguiente borrador.

Cierre de este delta: manual, ADR/índice, handoff/changelog y skills de HubSpot/copywriting espejadas
actualizados. Snapshot vigente de 7.969 caracteres idéntico al readback de la sesión; el snapshot anterior
se preserva sin cambios. SHA-256 del vigente: 89c52096369b61eb29aa9e22a351ea51ee2d8780bbe6c4a6a26ace80b7b8143a.
