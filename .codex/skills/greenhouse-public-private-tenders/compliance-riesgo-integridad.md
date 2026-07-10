# Compliance, Riesgo e Integridad

El filtro que decide si **siquiera puedes** ofertar (y si debes). Este companion es el **checklist accionable** de admisibilidad + los riesgos que hunden un bid. La base legal de las inhabilidades está en `chile-publico-marco-legal.md`; acá está la lista para correr.

> **Regla #1 del bid:** admisibilidad **antes** que fit. Un score de fit 90 con una inhabilidad activa o una garantía imposible de emitir a tiempo es **NO-BID inmediato**. El error que más deja a Efeonce fuera no es el precio: es un anexo, una declaración jurada, o una garantía mal constituida.

## Checklist de admisibilidad (Chile público) — correr ANTES de trabajar la oferta

### Inhabilidades del oferente (art. 4 Ley 19.886)
- [ ] Sin condena por **prácticas antisindicales / infracción a derechos fundamentales del trabajador** en los últimos 2 años.
- [ ] Sin **deudas laborales o previsionales** pendientes con trabajadores.
- [ ] Sin **conflicto de interés**: ningún socio/administrador es funcionario directivo del organismo comprador ni tiene el parentesco/relación societaria prohibida.
- [ ] Persona jurídica **sin condena vigente bajo Ley 20.393** (responsabilidad penal); socios/administradores sin condenas inhabilitantes.
- [ ] No estar en registro de inhabilitados / boletín de condenas.

### Estado y capacidad formal
- [ ] Inscrito y **hábil en ChileProveedores** (al menos al momento de contratar; idealmente ya).
- [ ] **Poderes del representante legal** vigentes y suficientes.
- [ ] Personería/constitución al día.

### Requisitos excluyentes de las bases (≠ criterios que puntúan)
- [ ] Identifiqué en las bases **qué es excluyente vs qué puntúa** (confundirlos es fatal).
- [ ] Cumplo cada **requisito de admisibilidad técnica** (experiencia mínima, certificaciones, perfiles obligatorios) o sé que no y descarto.
- [ ] **Garantía de seriedad**: puedo emitirla con el **monto, tipo y vigencia** exactos, **a tiempo** (antes del cierre).
- [ ] **Formato de oferta económica** correcto (planilla/estructura exigida).
- [ ] **Anexos y declaraciones juradas** completos, firmados y vigentes.
- [ ] Re-verifiqué contra la **última respuesta del foro** (puede haber cambiado un requisito).

Si algún ítem de "Inhabilidades" o "Requisitos excluyentes" falla y no es subsanable a tiempo → **NO-BID**.

## Integridad y probidad (reforzado por Ley 21.634)

- **Conflicto de interés:** declara y evita cualquier vínculo con el comprador. Si existe, no ofertes o gestiona la inhabilidad — no lo escondas.
- **Prevención de cohecho / soborno:** cero pagos, regalos o gestiones indebidas para influir en la adjudicación. Aplica Ley 20.393 (responsabilidad penal de la empresa) y modelo de prevención de delitos.
- **Colusión:** no coordinar ofertas ni precios con competidores (ilícito grave — libre competencia).
- **Uso del foro, no canales privados:** cualquier gestión de aclaración fuera del canal oficial rompe la igualdad y puede viciar el proceso.
- **Veracidad de las declaraciones:** una declaración jurada falsa (experiencia inflada, inhabilidad ocultada) es causal de exclusión y responsabilidad.

## Riesgos que hunden un bid ya adjudicado (evaluar antes del GO)

| Riesgo | Qué mirar | Mitigación |
|---|---|---|
| **Penalidades / multas** | Las bases/contrato definen multas por atraso o incumplimiento (a veces % diario en UTM) | Modelar el costo de multa en el pricing; asegurar delivery readiness |
| **Scope creep** | Alcance ambiguo en bases técnicas | Cerrar por foro; acotar entregables en la oferta |
| **Subcontratación** | ¿Las bases permiten subcontratar? ¿Con qué límites y responsabilidad? | Verificar antes de comprometer un delivery que depende de terceros |
| **Propiedad intelectual** | En creativo/audiovisual/software: ¿el comprador exige cesión total de PI? | Leer la cláusula de PI; costear la cesión; negociar en privado |
| **Confidencialidad / datos** | Manejo de datos del comprador/ciudadanos | Cumplir data protection; separar data del cliente de notas internas |
| **Garantía de fiel cumplimiento** | Monto/vigencia que inmoviliza capital durante todo el contrato | Costear en el bid; elegir instrumento que no ahogue caja |
| **Continuidad / capacidad** | ¿Puedes sostener el servicio todo el plazo? | Delivery readiness (capacidad, `greenhouse-talent-people-operator`) |
| **Reputacional** | Sector sensible (minería/comunidades, salud, gobierno) | Evaluar fit reputacional en el gate estratégico |

## Compliance específico de flujos asistidos (human-in-control)

Si la skill/agente asiste el descubrimiento o la preparación:

- **No enviar ofertas** ni firmar sin **confirmación humana explícita**.
- **No almacenar credenciales ni cookies** de los portales (Mercado Público u otros).
- **Confirmar términos de uso vigentes** del portal antes de automatizar cualquier lectura; una extensión browser-mediated debe estar permitida.
- **Separar** datos públicos externos de notas internas, pricing y estrategia (dos planos distintos).
- **Evidencia auditable**: guardar el paquete preparado y el comprobante de presentación externo.
- **Retención**: definir política de retención para documentos públicos e internos.

## Privado: el compliance cambia de forma

En privado no hay art. 4, pero hay:
- **Precalificación / due diligence del cliente** (Achilles/SICEP/portal propio; ver `privado-plataformas-sectores.md`).
- **NDA** — la confidencialidad es contractual y estricta.
- **Requisitos de seguridad de la información / ESG / diversidad de proveedores** según el comprador.
- **Cláusulas MSA** (límites de responsabilidad, PI, data protection) — negociables pero load-bearing.

## Regla de cierre del companion

Este checklist es la **primera puerta** del gate bid/no-bid (`bid-lifecycle-go-no-go.md`). Si no pasa, no importa nada más. Y para cualquier duda legal real (interpretación de una causal, una impugnación, una cláusula de PI): **la skill orienta y cita; el dictamen lo da un abogado humano.**

## Hand-off

- Base legal de las inhabilidades/recursos → `chile-publico-marco-legal.md`.
- Gate bid/no-bid → `bid-lifecycle-go-no-go.md`.
- Precalificación privada → `privado-plataformas-sectores.md`.
- Dudas legales de fondo → **abogado humano** (la skill no dictamina).
