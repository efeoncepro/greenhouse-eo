# Fuentes, vigencia y apoyos

Baseline consultado **2026-10-11** en la [investigación aprobada](../../../../docs/audits/commercial/2026-10-11-prospecting-skill-discovery.md).
No prueba resultados de Efeonce. Releer fuentes técnicas antes de un uso nuevo si costo/estado/endpoint cambió;
fuentes de mercado cuando se proponga una técnica o benchmark distinto. Mantener fecha de campo separada
de publicación y consulta; contenidos observacionales no prueban causalidad.

| Fuente primaria | Uso y límite |
| --- | --- |
| [6sense Buyer Experience 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/) | Preferencias antes del contacto; autorreporte de compras grandes, sin muestra LATAM descrita |
| [Gartner 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience) | Relevancia y fit; comunicado, no benchmark de correo Efeonce |
| [Gartner 2026](https://www.gartner.com/en/newsroom/press-releases/2026-05-20-gartner-survey-finds-sixty-nine-percent-of-b-two-b-buyers-turn-to-sales-reps-to-validate-ai-generated-insights) | Dudas y validación humana junto a IA; no automatizar afirmaciones comerciales |
| [McKinsey 2026](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-surprising-economics-of-B2B-growth-the-new-survival-threshold-and-what-it-takes-to-thrive) | Continuidad entre canales de compra; no receta de contactos por cadencia |
| [Gong CTA](https://www.gong.io/blog/this-surprising-cold-email-cta-will-help-you-book-a-lot-more-meetings) | Interés frío vs compromiso activo; estudio original 2020, página actualizada 2026, observacional |
| [Edelman/LinkedIn PDF 2025](https://www.edelman.com/sites/g/files/aatuss191/files/2025-07/2025%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report_FINAL.pdf) | Contenido y decisores ocultos; PDF describe muestra US, percepción no conversión |
| [SPIN](https://www.huthwaiteinternational.com/spin-methodology) / [SPICED](https://winningbydesign.com/spiced-framework/) | Preguntas/lentes de discovery, no superlativos como prueba comparativa |
| [Apollo People Search](https://docs.apollo.io/reference/people-api-search), [pricing](https://docs.apollo.io/docs/api-pricing), [waterfall](https://docs.apollo.io/docs/enrich-phone-and-email-using-data-waterfall) | Contrato/costo por endpoint/plan, no permiso ni resultado async |
| [Apollo Email Status](https://knowledge.apollo.io/hc/en-us/articles/4423314404621-Email-Status-Overview) | Estado de calidad técnica; no identidad/empleo/consentimiento |
| [HubSpot dedupe](https://knowledge.hubspot.com/records/deduplication-of-records), [asociación automática](https://knowledge.hubspot.com/object-settings/automatically-create-and-associate-companies-with-contacts) | Riesgos API/dominio/Primary, configuración real se verifica aparte |
| [Apollo rulesets](https://knowledge.apollo.io/hc/en-us/articles/4409396858509-Manage-Sequence-Rulesets), [HubSpot unenrollment](https://knowledge.hubspot.com/sequences/unenroll-from-sequence) | Paradas/OOO dependen de provider/settings; no suponer supresión común |
| [Apollo tracking](https://knowledge.apollo.io/hc/en-us/articles/34263074322701-Email-Tracking-Overview), [Apple Mail Privacy](https://www.apple.com/cl/legal/privacy/data/es-419/mail-privacy-protection/) | Opens/clicks limitados por automatismos; no intención |
| [Gmail](https://support.google.com/mail/answer/81126?hl=en), [Yahoo](https://senders.yahooinc.com/best-practices/), [Microsoft](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) | Alcance consumer/bulk específico, no configuración efectiva del rail Efeonce |

## Resolver dependencias por capacidad

Sales Intelligence para datos externos, CRM para verdad interna, hilos para contexto, Knowledge para canon.
No instalar otro provider si uno disponible satisface los campos del pedido. Si falta una categoría, buscar
capability real antes de declarar ausencia; usar evidencia equivalente proporcionada con límite de cobertura.
En un trabajo de implementación/evaluación de skill, los docs/fixtures bastan: no consultar CRM/APIs para
reproducir escenarios ficticios ni consumir créditos como prueba.

`research-benchmark-operator` conserva método. `deep-research` no estaba disponible en el preflight: el modo
degradado aprobado usa búsquedas/lecturas directas y síntesis fechada, delegación sólo autorizada, sin afirmar
que ejecutó esa harness. Un trabajo que la exige específicamente se reporta con dependencia pendiente.
Sales opcional se resuelve mediante catálogo/índice instalado del plugin, no una ruta cache universal. Leer
workflow y reglas del provider en cada fase. Esta skill funciona con sus owners locales cuando falta Sales.
