# Home — FAQ y Agenda · 2026-08-31

## Decisión y alcance

Aplicado y verificado en https://efeoncepro.com/, post `251731`, por instrucción del operador.
Se conservan seis FAQ: resuelven dudas de contratación y colaboración sin repetir el posicionamiento.
No se promete mejora SEO ni se agrega FAQPage. Copywriting orientado a claridad, objeciones y
expectativas verificables; target medianas y grandes confirmado por el operador.

Preguntas: tipo de empresa, equipo interno, necesidad concreta, seguimiento, herramientas existentes
y primeros pasos. La respuesta sobre proyectos se apoya en el portfolio comercial vigente
(`docs/commercial/SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`: RevOps/HubSpot y web por proyecto).
Se preserva la aclaración de cifras ilustrativas dentro de la respuesta de seguimiento.

FAQ: «Antes de trabajar juntos.» y «Cómo encajamos con tu equipo, tus herramientas y tus prioridades.»
Contacto: «Hablemos de tu caso.» / «Cuéntanos qué necesitas y revisemos cómo podemos ayudarte.»
Agenda: «¿Qué necesita lograr tu marketing?»; la reunión de 30 minutos aborda objetivos, necesidades
del equipo y próximos pasos, sin prometer un diagnóstico completo ni un plan a medida durante la llamada.
Botones, ancla `#agenda`, agenda externa y correo intactos.

## Guardas y recuperación

Sólo 33 asignaciones de texto nativo en dos widgets: 15 campos raíz y 18 campos de las seis filas FAQ
(pregunta, respuesta, rótulo editorial). IDs, orden, layouts, iconos y URLs preservados.
Sin cambios de schema, template, CSS, JS ni número de controles: 17 widgets, cero HTML,
408 controles raíz y seis repeaters.

- Hash anterior: `df8b731b81c0495dfddac27e2b02c68faac3c47ff238fbb53b8be34bceeddb4f`.
- Hash nuevo: `7f709e28d551a737b6510e1929a3d45ee6bfccb4a6b5d01ffba6cf774b1210d6`.
- Snapshot: `_gh_home_faq_agenda_copy_20260831_204441`.
- Widgets: `0d2c364` / `9536605`.

Guardas de front ID, publish, ownership marker, hash completo, permisos y tipos de controles. Save
canónico `Document::save(elements, settings)`, readback completo y verificación de textos. Yoast,
thumbnail, template, opciones de portada y siete páginas de referencia sin cambios. Purga Elementor/Kinsta.
Para restauración autorizada: comparar drift y recuperar sólo ambos widgets desde snapshot usando
Document::save; no sobrescribir trabajo posterior ni tocar metadatos SEO. Purgar y verificar frontend.

## Evidencia y límites

- Contrato nativo vivo PASS, `failures=[]`; 33 textos coinciden exactamente con plan y readback.
- Navegador real 1280/390: FAQ y Agenda legibles, documento `scrollWidth === clientWidth`.
- Acordeones abiertos y cambio exclusivo a otra pregunta verificados; respuesta visible y completa
  en móvil. Destinos de contacto comprobados por DOM, sin enviar formularios, correo ni reservar reuniones.
- Capturas `.captures/home-faq-agenda-20260831/`; plan/scripts/readbacks en `tmp/home-faq-agenda-20260831/`.
- Editor autenticado save/reopen no probado. Afirmaciones de otras secciones no auditadas aquí.
- Sin commit, push ni cambios a WIP ajeno. Documentación limitada al contrato dueño, manual,
  referencia espejada y este registro; no se modifican root Handoff/changelog por revisión de copy.
