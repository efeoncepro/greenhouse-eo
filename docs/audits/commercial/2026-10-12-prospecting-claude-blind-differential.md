# Prospección B2B — diferencial ciego bajo Claude y correcciones

Fecha: 2026-10-12. Mandato del operador: medir la skill `efeonce-b2b-prospecting` bajo Claude («lánzalo») y,
con el veredicto, «corrige todo lo que corresponda y robustece la skill», usando subagentes, y commit al final.
Alcance: bundle Codex/Claude de la skill, sus evals y la [decisión](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).
Sin runtime, schema, créditos, CRM, envíos ni cambios en `hubspot-as-a-service`.

## Qué se midió

Hasta esta fecha la skill sólo se había probado con los evaluadores del harness donde nació; las auditorías
previas registran 12 y 19 casos, nunca una corrida completa ni una bajo Claude. El diferencial compara dos
brazos sobre los mismos 10 escenarios sintéticos (P01, P03, P07, P09, P13, P18, P20, P28, P34, P39):

- **Con skill:** el agente lee `SKILL.md` y los módulos que éste enruta, sin abrir `evals/` ni `docs/audits/`.
- **Sin skill:** el agente responde sólo con el pedido y los hechos, sin abrir archivos del repositorio.

Las respuestas se mezclan con orden aleatorio por caso y dos calificadores independientes, que no conocen
el brazo, las puntúan contra la rúbrica: veredicto, fallo crítico, utilidad (1–5), exceso de cautela (0–3),
ruido (0–3) y preferencia. Todo offline: ningún proveedor, CRM ni envío.

## Resultados

Veinte calificaciones por brazo en cada ronda.

| Medida | Ronda 1, con skill (v5) | Ronda 1, sin skill | Ronda 2, con skill corregida | Ronda 2, sin skill |
| --- | --- | --- | --- | --- |
| Aprobadas | 20 | 18 | 20 | 16 (2 parciales) |
| Fallos críticos | 0 | 2 | 0 | 2 |
| Utilidad | 4,45 | 4,60 | 4,90 | 4,45 |
| Exceso de cautela | 0,20 | 0,30 | 0,05 | 0,30 |
| Ruido | 1,55 | 0,10 | 0,60 | 0,80 |
| Preferida | 7 | 8 (5 empates) | 13 | 1 (6 empates) |
| Palabras en los 10 casos | 9.061 | 5.213 | 4.800 | 5.213 |

Lectura:

- **La skill protege.** El único fallo crítico es del brazo sin skill y lo vieron los cuatro calificadores:
  en P01 deja «listo para cargar» al autor de la necesidad como registro sin correo.
- **El defecto de la v5 era ruido, no cautela.** Sus respuestas salían 74 % más largas, abrían carriles que el
  pedido no planteaba y, cuando ambos brazos decidían igual, el calificador prefería la corta. La hipótesis
  previa de exceso de cautela no se confirmó (0,20 contra 0,30).
- **La corrección bajó el ruido sin perder aprobados.** La versión corregida queda 8 % por debajo del brazo
  sin skill en extensión y pasa a ser la preferida.

Los ocho escenarios nuevos (P41–P48), respondidos con la skill corregida y calificados por un tercer
evaluador con mandato adversarial: 7 aprobados, 1 parcial (P46), ningún fallo crítico. El parcial venía de
un criterio de rúbrica limítrofe, ya ajustado (ver abajo).

## Qué se corrigió

1. **Proporcionalidad en `SKILL.md`.** Sección nueva «Responde lo pedido, en su tamaño» con un ejemplo que no
   pertenece al banco de evaluación; la lista de entrega completa pasa a aplicar sólo a dossier o handoff, y
   el plan de captura CRM sólo cuando el pedido es preparar o ejecutar un registro.
2. **Veinte ambigüedades resueltas (D1–D20).** Los agentes que aplicaron la v5 anotaron 28 instrucciones
   ambiguas con archivo y frase. Se resolvieron como [decisiones](prospecting-claude-differential-2026-10-12/decisiones.md)
   y se escribieron en 15 módulos y plantillas. Regla común: ninguna concede un permiso nuevo; ante dos
   lecturas se tomó la que no amplía la autoridad del agente.
3. **Módulo `references/claude-session-tools.md`.** Qué tools de Apollo gastan créditos según sus propias
   descripciones leídas ese día, el carril de HubSpot y Outlook por referencia a sus dueños, y el radar
   personal ausente fuera de Codex. La harness `deep-research` pasa a comprobarse por sesión.
4. **Evals versión 6**, luego 7 al sumar P49. 48 escenarios (40 intactos + P41–P48) y una comprobación transversal de
   proporcionalidad; la extensión deja de contar como mérito.

Después de la segunda ronda, y por tanto **sin volver a medir**, se aplicaron seis aclaraciones de una
frase que salieron de las notas de esa ronda (fecha de revisión de una ausencia, alcance de la parada ante
un rebote, Company de existencia desconocida, borrador con contexto no leído, pedir un borrador no declara
excepción de ICP, cuándo aplica el plan de captura CRM) y dos arreglos al banco: P43 delataba su respuesta
en los hechos y P46 penalizaba descartar un distractor en una línea.

## Decisiones revisadas por el operador

Las tres que tocaban autoridad o canal se le presentaron el mismo día y quedaron así:

- **D2, aprobada:** bajo HOLD la investigación offline ya autorizada puede seguir sólo como cobertura lista,
  sin créditos ni escrituras nuevas, y no habilita contacto.
- **D3, modificada por el operador:** autorizar «registrar contactos» cubre también crear la Company cuando
  no existe y la entidad está verificada. La nota de Company entra sólo si el pedido la nombra; si no, se
  propone y se confirma en la misma entrega. Lead y Deal siguen siendo siempre escrituras aparte. La lectura
  inicial del agente exigía confirmar Company y nota por separado; el archivo de [decisiones](prospecting-claude-differential-2026-10-12/decisiones.md)
  conserva esa versión como evidencia y anota el cambio.
- **D6, aprobada sin cambios:** un mensaje manual que el operador envía desde su propio perfil es una ruta
  que se puede proponer; la skill prepara el borrador y no lo envía.

El cambio de D3 se midió con una corrida de P42 y del caso nuevo P49 (pedido que no nombra la nota), leída
por el agente principal; los evals pasan a versión 7 con 49 escenarios.

## Límites

- Una sola corrida por brazo y caso; con 10 casos, una diferencia de uno o dos no es señal.
- Los calificadores son el mismo modelo que responde. En la ronda 1 la extensión delataba el brazo, así que
  el ciego fue imperfecto.
- Las puntuaciones absolutas no son comparables entre rondas: las respuestas sin skill son las mismas en
  ambas y aun así su ruido pasó de 0,10 a 0,80 y P07 de aprobado a parcial. Vale la comparación dentro de
  cada ronda.
- Los 10 casos originales inspiraron las correcciones; no son un conjunto reservado. P41–P48 sí se
  respondieron sin haberlos visto, pero se escribieron a partir de las mismas decisiones que miden.
- No se verificó si el brazo sin skill heredó las instrucciones generales del repositorio.
- Nada de esto prueba eficacia comercial ni comportamiento live de Apollo, HubSpot u Outlook.
- Dos módulos remiten a `docs/audits/**` para el diccionario de propiedades; en la prueba esa carpeta estaba
  vedada, de modo que los nombres de campo de los changesets no se contrastaron contra el inventario.

## Pendientes fuera de alcance

- Resueltos el mismo día con aprobación del operador y escritos en `hubspot-as-a-service`, su manual y la
  [decisión CRM](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md): la
  fecha de investigación es la de verificación, el encaje de un adyacente sale de su propia función y un
  Lead exige una interacción real. La automatización que creó 2.222 de los 2.251 Leads se apagó en el portal
  ese día con confirmación del operador. Queda abierto ampliar el enum de encaje, depurar los Leads ya
  creados y decidir la etapa predeterminada de un contacto nuevo, hoy `Sales Qualified Lead`.
- `references/message-and-contextual-proof.md`, «Identidad de la oferta»: dos agentes señalaron que el
  bloque sobre logos en superficies de la app no ayuda a redactar un mensaje de prospección.
- El comportamiento de reinscripción en secuencias aparece afirmado en respuestas sin que los hechos lo den;
  conviene que el módulo lo marque como dato a verificar por carril.

## Costo y evidencia

Diecisiete subagentes y unos 2,8 millones de tokens acumulados: cuatro de respuesta y dos calificadores en
la ronda 1, tres de edición, cuatro de respuesta y tres calificadores en la ronda 2.

Evidencia preservada en [`prospecting-claude-differential-2026-10-12/`](prospecting-claude-differential-2026-10-12/decisiones.md):
las decisiones, las cinco calificaciones en JSON con sus claves de desciego y las notas de ambigüedad de
cada agente. Las 38 respuestas no se versionaron. La dirección de registro CCO citada en dos archivos se
reemplazó por un marcador.

## Verificación

- `pnpm skills:mirrors`: espejo Codex/Claude byte-identical tras sincronizar.
- Enlaces locales del bundle: 146, ninguno roto.
- `evals/scenarios.json`: versión 7, 49 IDs únicos; el diff contra la v5 sólo cambia la línea de versión y
  agrega casos.
