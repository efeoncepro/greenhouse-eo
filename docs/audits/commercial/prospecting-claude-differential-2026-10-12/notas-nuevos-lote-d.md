# Notas — nuevos, lote D

Base común a los cuatro casos: `.claude/skills/efeonce-b2b-prospecting/SKILL.md` y `casos/lote-d.md`.
Los módulos se leyeron una vez en la sesión; abajo se atribuyen al caso que los necesitó.
No se abrió `evals/`, `.codex/`, `docs/audits/` ni otros archivos de `prospecting-diff/` (sólo se listaron los nombres de `nuevos/` y `notas/` para comprobar que las carpetas existían).

## 1. Archivos abiertos por caso

### P42 (registro de contactos en Lácteos Pradera)
- `efeonce-b2b-prospecting/references/crm-and-commercial-handoff.md`
- `efeonce-b2b-prospecting/references/contact-quality-and-enrichment.md`
- `efeonce-b2b-prospecting/references/buying-group-and-access.md`
- `efeonce-b2b-prospecting/references/signal-to-action.md`
- `efeonce-b2b-prospecting/templates/action-pack.md`
- `efeonce-b2b-prospecting/templates/signal-action.md`
- `hubspot-as-a-service/references/prospecting-segmentation.md`
- `hubspot-as-a-service/references/property-inventory.md`

### P44 (Renata, sin correo vigente)
- `efeonce-b2b-prospecting/references/motions-and-relationship.md`
- `efeonce-b2b-prospecting/references/buying-group-and-access.md`
- `efeonce-b2b-prospecting/references/message-and-contextual-proof.md`
- `efeonce-b2b-prospecting/references/signal-to-action.md`
- `efeonce-b2b-prospecting/references/contact-quality-and-enrichment.md`
- `efeonce-b2b-prospecting/references/claude-session-tools.md`
- `efeonce-b2b-prospecting/templates/signal-action.md`

### P46 (¿Vidrios Ámbar está para aprobación?)
- `efeonce-b2b-prospecting/references/buying-group-and-access.md` (tabla de suficiencia por siguiente paso)
- `efeonce-b2b-prospecting/references/account-cadence.md` (fila «primera aproximación fría»)
- `efeonce-b2b-prospecting/references/message-and-contextual-proof.md`
- `efeonce-b2b-prospecting/references/deliverability-operations.md` (párrafo del primer mensaje individual)

### P48 (tres respuestas: Tilo, Yunque, Ñire)
- `efeonce-b2b-prospecting/references/response-handling.md`
- `efeonce-b2b-prospecting/references/deliverability-operations.md`
- `efeonce-b2b-prospecting/references/account-cadence.md`
- `efeonce-b2b-prospecting/references/motions-and-relationship.md`
- `efeonce-b2b-prospecting/templates/response-triage.md`
- `efeonce-b2b-prospecting/templates/delivery-readiness.md`

No abiertos aunque el recorrido los enlaza: `abm-and-abs`, `account-research-and-signals`, `capacity-and-economics`, `discovery-and-proof`, `situation-entry-playbooks`, `experiments-and-learning`, `sources`, el adapter `account-based-prospecting`, los dos ADR de `docs/architecture/`, el manual de carriles de HubSpot, la política de Outlook y las skills hermanas (Customer Model, Commercial, Copywriting, HubSpot). Ningún caso los necesitó para decidir.

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

1. **Alcance de «registrar contactos» cuando el pedido nombra la señal (P42).**
   `references/crm-and-commercial-handoff.md`: «Autorizar «registrar contactos» cubre crear el Contact y asociarlo a una Company que ya existe. Company nueva, nota de Company, Lead o Deal son escrituras aparte: listarlas en el changeset y pedir su confirmación en esa misma entrega».
   El pedido decía además «deja todo cargado, incluida la señal de la autora». La regla no dice si una mención expresa de la señal en el mismo pedido ya autoriza la nota de Company o si sigue siendo «escritura aparte». Tomé la lectura conservadora (pedir un solo sí para Company + nota), pero la otra lectura es defendible.

2. **«Sin retener el changeset de los contactos» cuando la Company no existe (P42).**
   Misma frase: «sin retener por ello el changeset de los contactos elegibles». En cambio `hubspot-as-a-service/references/prospecting-segmentation.md` pide «Create/reuse eligible contacts within the authorized scope, with the correct Primary Company» y advierte que la automatización por dominio puede «generate an empty company». No queda dicho si «no retener» es sólo entregar el changeset o también ejecutar los contactos antes de que exista la Company. Entregué el changeset completo y recomendé el orden Company → Contact → nota.

3. **`service_fit` de un adyacente (P42).**
   `property-inventory.md`: «No dejar vacío un dato pertinente ya confirmado por limitarse al mínimo técnico de alta» junto a «Fit no es interés» y, en `prospecting-segmentation.md`, «Report blanks explicitly; do not fill cargo, country or service fit merely to make the table complete». No hay criterio para decidir si el fit de la cuenta (deducido de la señal de otra persona) se copia al Contact de un colega de otra función. Completé `creative` en Marketing y dejé Trade pendiente; es criterio propio.

4. **El diccionario remite a una carpeta que no se podía abrir.**
   `property-inventory.md`: «cargar el manual por objeto y fase y sólo las filas necesarias del inventario fechado (`docs/audits/commercial/hubspot-properties-2026-10-11/README.md`)». Con `docs/audits/` vetado, los nombres de campo del changeset salen sólo de la tabla resumen «Familias de captura», y los enums (`industry`) quedaron como pendientes de lectura en vivo. Lo mismo con el sustento de `buying-group-and-access.md` («investigación de cobertura» en `docs/audits/`).

5. **Fecha de revisión de una ausencia (P48).**
   `references/response-handling.md`: «Revisión interna desde el primer día hábil posterior al retorno declarado». Con «retorno declarado el viernes 16/10» admite dos lecturas: el propio 16 (día en que vuelve) o el lunes 19 (primer hábil después). Tomé el 19; `motions-and-relationship.md` repite la frase sin resolverlo.

6. **Aclaración al comprador: dos reglas vecinas (P48, Tilo).**
   `response-handling.md`, fila de restricción de alcance: «Por defecto, sin seguimiento ni mensaje de aclaración a quien la escribió: acusar recibo es decisión de Commercial». `account-cadence.md`: «Mantener HOLD del alcance potencialmente afectado —pedirle una aclaración al comprador lo decide Commercial—». Una dice «sin aclaración por defecto» y la otra deja la aclaración a Commercial; cuál aplica depende de si «por este tema» se considera explícito o ambiguo, y no hay criterio para eso. Lo traté como explícito (no pedir aclaración; el acuse lo decide Commercial).

7. **Alcance de la pausa tras un 5.7.1 (P48, Ñire).**
   `deliverability-operations.md`: «Pausar tramo afectado —al menos los envíos a esa dirección por ese canal—». «Al menos» no dice cuándo ampliar al resto del dominio destino o del rail. Me quedé en la dirección y pedí revisar si hubo otros rechazos (fila «Varios destinatarios fallan en mismo rail/ventana»).

8. **Piso de 2–3 adicionales frente a «responde lo pedido» (P44).**
   `SKILL.md`: «busca 2–3 contactos adicionales relevantes, incluso si el objetivo tiene correo» frente a «Abre un carril que el pedido no planteó (...) sólo si bloquea el siguiente paso; si no, a lo sumo queda como un pendiente nombrado». Sin créditos, sin web y sin personas en los hechos, el piso no se puede ejecutar; no queda claro si declarar la brecha es obligatorio o sobra. Lo dejé como una línea de pendiente.

9. **Cuánto de la preparación de envío mencionar en una consulta de estado (P46).**
   `deliverability-operations.md`: «Un único primer mensaje individual exige atribución y empleo vigentes, supresión u opt-out efectivos consultados, autorización de envío, firma y CCO». `SKILL.md`, en el ejemplo: «Sobran ahí (...) la revisión de entregabilidad, salvo que alguno impida ese envío». La supresión «consultada» no consta en los hechos, así que en rigor es una brecha previa al envío, pero el pedido era sólo de estado. La reduje a «el envío sale sólo con tu instrucción expresa».

10. **Clasificar la señal y la relación (P44).**
    `signal-to-action.md`: «revisa sus proveedores de contenido» no encaja limpio ni en «Búsqueda explícita de proveedor» ni en «Iniciativa estratégica o transformación»; la traté como declaración con hipótesis, no como demanda abierta. `motions-and-relationship.md` no ubica un vínculo de trabajo de 2023 sin contacto reciente entre «Tibio», «Cálido» y «Reactivación»; usé tibio.

11. **Comentario público o mensaje directo (P44).**
    `buying-group-and-access.md`, ruta 5: «respuesta a una publicación pública o a alguien que conoce». No orienta cuál preferir cuando se dan las dos condiciones. Elegí mensaje directo y dejé el comentario como alternativa.

12. **Párrafo ajeno al módulo.**
    `message-and-contextual-proof.md`, «Identidad de la oferta»: el bloque sobre logos en «navegación, dashboards (...) recibos/comprobantes, reportes, finiquitos» es regla de marca de la app, no de un mensaje de prospección; lo único aplicable es la frase siguiente («Presentar Efeonce como relación comercial»).
