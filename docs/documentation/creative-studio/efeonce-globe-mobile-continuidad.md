# Efeonce Globe — continuidad móvil

> **Tipo:** documentación funcional de producto
> **Estado:** dirección propuesta; validación pendiente
> **Runtime:** no existe todavía una app nativa ni un rollout móvil independiente. Globe permanece internal-only/internal_smoke y los externos siguen gated por TASK-1480.

## Propósito

Globe debe liberar al creativo de la ingeniería también entre contextos: una idea puede aparecer lejos del escritorio, un job puede terminar mientras la persona está en movimiento y una decisión puede necesitar sólo un minuto. Continuidad móvil significa que el contexto viaja con el trabajo, no que el Producer desktop se reduzca hasta caber en una pantalla pequeña.

La decisión canónica es [ADR-018 — continuidad móvil y aplicación companion](../../architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md). Este documento explica qué significa para producto, diseño y operación sin afirmar que una capacidad futura ya está disponible.

## Modelo mental

| Superficie | Pregunta que responde | Ejemplos |
| --- | --- | --- |
| **Móvil / companion** | “¿Qué puedo capturar, entender o decidir ahora?” | intención, referencia, inbox, estado de job, revisión acotada, comentario, handoff |
| **Desktop / web** | “¿Cómo desarrollo la pieza con profundidad?” | composer, comparación, refine, storyboard, configuración, operaciones y delivery |
| **Globe cloud** | “¿Qué es verdad y qué está autorizado?” | identidad, entitlements, policy, estimate, credits, run, asset, rights, provenance y lineage |

El móvil es una ventana al mismo sistema. No crea una copia del proyecto ni una autoridad económica propia.

## Recorrido de continuidad

1. **Captura:** la persona registra intención, referencia o nota como draft, incluso si la red no es estable.
2. **Contextualización:** el draft se vincula a workspace/project/session sólo cuando existe una relación canónica y autorizada.
3. **Ejecución:** una acción de generación o refine sigue el flujo existente de estimate → policy → reserve/hold → run → settle; el móvil no lo salta.
4. **Observación:** el estado asíncrono se lee desde el reader canónico. Una notificación sólo enlaza al estado; no ejecuta por sí misma.
5. **Decisión:** review, comentario, aprobación o handoff se habilitan según role, entitlement y policy del workspace.
6. **Continuación:** desktop abre el mismo project/session/asset/lineage, con el estado y la evidencia que dejó el móvil.
7. **Memoria:** el resultado queda en la jerarquía normal de Globe y puede volver a encontrarse desde feed, viewer, library o review según la superficie autorizada.

## Qué debe resolver la primera experiencia móvil

- Deep links estables a project, session, candidate, asset, review y run.
- Inbox de estados relevantes, con agrupación y silencio configurables.
- Captura de texto, referencia y eventualmente voz, siempre como input gobernado.
- Drafts locales con sync idempotente y estado visible cuando falta conexión.
- Review compacta: ver evidencia, comparar una selección pequeña, comentar y pasar la decisión siguiente.
- Handoff explícito a desktop, no una pantalla móvil que pretenda reemplazar el composer.
- Estados de acceso claros: workspace incorrecto, sesión expirada, role revocado, asset no autorizado y run inexistente deben fallar cerrados.

## Qué no debe resolver todavía

- Edición profunda, multi-panel, batch operations o comparación extensa.
- Generación offline, gasto, promoción, publicación o mutaciones de derechos offline.
- Provider selection interna, house, costo de vendor, margen o credenciales.
- Un backend, feed, viewer, library, ledger de notificaciones o sistema de créditos específico para móvil.
- Compras o top-ups de créditos dentro de una futura app sin ADR legal/comercial.

## Roles y momentos de uso

- **Director/a creativo/a:** captura una referencia y deja una intención para que el equipo la explore; decide entre candidatos desde una revisión breve.
- **Producer / operador/a:** recibe un job listo, confirma contexto, vuelve al desktop para composición y ejecuta sólo con la policy y el estimate vigentes.
- **Revisor/a o cliente autorizado:** consulta evidencia y deja feedback acotado; nunca obtiene un bypass por estar en móvil.
- **Equipo de delivery:** abre el lineage y el estado de aprobación; delivery sigue gobernado por los mismos gates, no por la app.

## Qué existe hoy y qué es futuro

| Capacidad | Estado actual | Evidencia / siguiente gate |
| --- | --- | --- |
| Payload web React + Vite | En migración según ADR-014; no equivale a una app nativa | Validar continuidad sobre la superficie web antes de abrir una task móvil |
| Responsive a 390 px | Existe como validación de UI | Instrumentar journeys, no sólo snapshots |
| Jobs, assets, rights, provenance, credits y lineage server-side | Existe como arquitectura y runtime interno | Reusar readers/commands; no crear proyecciones móviles |
| Deep links contextuales | Dirección de diseño; no hay contrato móvil aprobado | Definir identidad canónica y revocación en una task |
| Draft/offline sync | No implementado como capacidad de Globe | Diseñar sólo para captura; nunca para spend |
| Push/background upload/cámara/voz | No implementado como superficie móvil | Requiere evidencia y ADRs de identity/media/privacy/notifications |
| App Store/Play Store | No aprobado | Sólo después de Phase 0/1 y gates enterprise |

## Señales que justifican invertir

La inversión móvil debe seguir datos de continuidad, no una comparación superficial con competidores. Las señales principales son:

- una tasa repetida de capturas o revisiones desde móvil;
- abandono móvil que desaparece al introducir draft, deep link o inbox;
- reducción medible del tiempo entre resultado listo y decisión;
- handoffs móvil → desktop que conservan session/asset/lineage sin reconstrucción;
- demanda explícita de cámara, voz, share sheet, background upload o push en un flujo real;
- necesidades de clientes enterprise de MDM/DLP que mobile web no puede cumplir;
- costo de soporte y seguridad inferior al valor de la continuidad recuperada.

## Guardrails de producto

1. La app futura nunca es una fuente de verdad adicional.
2. El cliente no decide acceso, precio, derechos ni estado terminal.
3. Un deep link no ejecuta una operación sensible por abrirse.
4. Un draft local no es un asset autorizado ni una reserva de créditos.
5. Toda notificación deriva de un evento/reader canónico y se puede reconciliar.
6. Todo cambio de contexto conserva workspace y revocación; los errores no hacen fallback permisivo.
7. El diseño móvil se valida en 390 px, teclado, reduced motion, lector de pantalla y red intermitente, además de desktop.

## Referencias

- [ADR-018 — continuidad móvil y aplicación companion](../../architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md)
- [ADR-014 — client application](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)
- [Creative Loop / Producer experience logic](../../tasks/to-do/TASK-1523-globe-creative-suite-experience-logic.md)
- [Creative Studio business model](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Globe runtime handoff](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
