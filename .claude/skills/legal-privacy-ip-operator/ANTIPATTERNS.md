# Antipatrones — legal-privacy-ip-operator

Lo que NO se hace. En legal, un antipatrón puede costar una multa, un juicio o la pérdida de la propiedad de un entregable.

## Postura (los más graves)

- **Presentar orientación como opinión legal vinculante.** Esta skill orienta y cita; **no dictamina**. Todo cierra con "valida con abogado habilitado". (Regla #0.)
- **Citar norma sin año ni verificar vigencia.** El derecho cambia (Chile 21.719 vigente 1-dic-2026; México nueva LFPDPPP 2025 + INAI disuelto; Perú nuevo reglamento 2025; US APRA murió). Nada de memoria sin verificar.
- **Exportar el derecho de un país a otro.** Un MSA gringo copiado a Chile puede tener cláusulas nulas; un banner GDPR no basta para US ni al revés. Identifica **ley aplicable + foro** siempre.
- **Opinar sobre lo laboral.** Empleo/finiquito/relación laboral es **payroll** (`greenhouse-payroll-auditor`). Fuera de esta skill.

## Privacidad

- **Asumir que el consentimiento es la única base.** Hay otras (contrato, interés legítimo, ley) — y en US el modelo es opt-out, no opt-in.
- **Un solo banner de cookies para todo el mundo.** El estándar cambia por jurisdicción (opt-in UE / opt-out+GPC US / informar LATAM). Usa CMP geo-consciente (`09`).
- **Tratar datos de un cliente sin DPA.** Efeonce como processor necesita contrato de encargo con el cliente y con sus sub-processors (`04`).
- **Ignorar transferencias internacionales.** HubSpot/Google/nubes en US = transferencia; necesita mecanismo + declaración (`04`).
- **Privacy policy decorativa.** Copiar una que no refleje tu tratamiento real — la FTC (US) y la transparencia (LATAM) la hacen exigible.
- **Meter PII/confidencial real en ejemplos o en herramientas IA sin gobernanza.**
- **Citar al INAI (México) como autoridad vigente** — fue disuelto (2025); ahora es la Secretaría Anticorrupción y Buen Gobierno.

## Contratos

- **Firmar cesión total de IP sin reservar tus assets reusables** (frameworks, código, herramientas). Cedes tu capital.
- **Contrato sin cap de responsabilidad** ni exclusión de daños indirectos → exposición ilimitada.
- **Garantizar resultados de negocio** (KPIs) en warranties. Garantiza originalidad/no-infracción, no resultados.
- **Indemnidad unilateral y sin tope.** Que sea recíproca y acotada.
- **Traducir un contrato en vez de redactarlo para la ley aplicable.**
- **Olvidar la cadena de IP con freelancers/vendors** → no puedes ceder lo que no te cedieron.

## IP y derechos de uso

- **Aplicar "work made for hire" gringo en LATAM** y asumir que transfiere todo. Los **derechos morales son irrenunciables** en civil law; estructura cesión de patrimoniales explícita (`06`).
- **Usar stock/música/fuentes/fotos sin verificar la licencia** (scope/territorio/plazo/medios/exclusividad). Un input no licenciado contamina el output.
- **Producción con personas/lugares sin releases** (model/property/talent/imagen).
- **Entregar contenido IA prometiendo copyright exclusivo** cuando quizá no exista (output puramente IA puede no ser registrable). Ajusta warranties (`07`).
- **Prompts que copian artistas/marcas/personajes vivos** para uso comercial; deepfakes/voz sin autorización.
- **No pactar el derecho de portafolio** y luego publicar el caso.

## Publicidad y digital

- **Claims sin sustanciación** (evidencia previa a publicar). Guarda la prueba.
- **Influencer sin disclosure** de la relación material (#ad). Riesgo marca + agencia (FTC/CONAR/INDECOPI/PROFECO).
- **SMS marketing sin consentimiento previo (TCPA)** — clase de demanda cara.
- **Dark patterns** en banners/formularios/bajas (aceptar destacado, rechazar oculto, casillas pre-marcadas, baja laberíntica).
- **Reimplementar el runtime** (firma, tags, publicación) en vez de usar la skill dueña (ZapSign adapter, gtm-ga4, growth-forms, public-site).
