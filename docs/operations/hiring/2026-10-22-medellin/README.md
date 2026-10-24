# Vacantes Medellín 2027 — creación en Hiring y enlaces en LinkedIn

Estado: **tres vacantes publicadas y verificadas; ambos LinkedIn editados y releídos de forma independiente. Instagram sin cambios por corrección posterior de Julio.**

## Autorización y condiciones

Julio pidió crear las tres vacantes bien estructuradas y ajustar las publicaciones. Confirmó Semi-senior para los tres cargos y la contratación internacional habitual de Efeonce para Colombia. La búsqueda es real, anticipada para el proyecto previsto para 2027; no declara adjudicación ni incorporación inmediata. La fecha de inicio depende de la activación del proyecto y del acuerdo final. Un cupo por cargo. Responsable de la búsqueda: Julio; coordinación operativa y reporting por rol descritos a partir de las bases. Cliente anonimizado.

Se aplicaron `greenhouse-talent-people-operator`, sus referencias de runtime, inbound recruiting y beneficios, receta de oferta v2, Operating Code y `social-media-studio`. Evidencia de base y cinco comparables leídos durante esta misma sesión: [fundamento del anuncio](../../../commercial/tenders/gana-loti-agencia-digital-2027-1552/research/LINKEDIN-TALENTO-FUNDAMENTO-2026-10-22.md).

## Vacantes publicadas

| Cargo | Demanda | Vacante | Página pública | Postulación |
| --- | --- | --- | --- | --- |
| Trafficker Digital / Especialista en Performance | EO-TDM-0682 | EO-OPN-0678 | [Ver ficha](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0678) | [Postular](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0678/apply) |
| Content Creator — Contenido Social y Audiovisual | EO-TDM-0683 | EO-OPN-0679 | [Ver ficha](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0679) | [Postular](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0679/apply) |
| Especialista en Email Marketing y SMS | EO-TDM-0684 | EO-OPN-0680 | [Ver ficha](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0680) | [Postular](https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0680/apply) |

Cada ficha tiene promesa y misión del rol, cuatro resultados observables, seis responsabilidades, esenciales separados de deseables y aprendizajes, evidencia existente y anonimizable, modelo de colaboración, reporting, español operativo y horario de Colombia. Modalidad híbrida: dos días en instalaciones del cliente en Medellín y tres remotos; dedicación completa. Email/SMS incluye sábados hasta mediodía dentro de la jornada semanal. Content Creator mantiene la administración operativa de Marketing Digital del cliente con respaldo de Efeonce; no se le atribuye toda la producción gráfica ni se mezcla el cargo con director de arte.

La vía de vinculación internacional con pago directo de Efeonce aparece explícita; no se inventa contrato laboral colombiano ni EOR. Beneficios derivados del contenido central vigente, con calificador de país/modalidad; sin copiar la lista a cada ficha, publicar el monto de equipamiento ni afirmar automatización del portal Leave. Compensación sin banda monetaria aprobada: conversación transparente durante el proceso, sin rango inventado. Cuatro etapas de selección basadas en experiencia y muestra existente, sin trabajo especulativo gratuito ni asignación automática de assessments. Compromiso de definición/actualización de tres a cuatro semanas según el canon; no es fecha de ingreso al proyecto.

## Ejecución y verificación

Carril operativo canónico `pnpm hiring:publish-vacancy`: tres `dryRun` válidos, seguidos por tres `publish` secuenciales con claves de idempotencia estables. Compone `createTalentDemand -> createHiringOpening -> updateHiringOpening -> publishOpening`. Credenciales y conectividad verificadas con `pg:doctor`. CLI sobre el checkout local, cuyas fuentes Hiring no tenían cambios, contra la base compartida productiva. No hubo SQL de escritura, migración, deploy ni cambio de flags.

Se listaron cuatro openings reales previos y no existían los nuevos cargos híbridos de Medellín. Cada brief tiene sourceReference propia para deduplicar, y no sustituye los cargos remotos previos. Lectura independiente por readers canónicos confirmó tres `active/published/public_listed`, v2, un cupo, owner Julio, nivel Semi-senior y ubicación CO/Medellín. Las seis URLs de detalle/apply devolvieron HTTP 200; las páginas de detalle contienen JobPosting y no contienen el cliente. No se creó una postulación QA ni se simuló un candidato.

[Briefs](briefs/) · [Manifiesto de IDs y URLs](manifest.json) · [Lectura canónica](canonical-readback.json) · [HTTP](http-verification.json) · [Registro completo](operation-record.json).

## Publicaciones ajustadas

- [LinkedIn de Julio](https://www.linkedin.com/feed/update/urn:li:share:7519092415484469248/): CTA por mensaje privado sustituido por los tres enlaces y el nivel Semi-senior. Conservadas la imagen y la mención/colaboración Efeonce agregadas manualmente antes de esta edición.
- [LinkedIn de Efeonce](https://www.linkedin.com/feed/update/urn:li:share:7519092409843052544/): mismo cambio, conservando imagen y demás contenido. Tras recargar, los tres enlaces aparecieron guardados. Los tres acortadores de LinkedIn se abrieron y mostraron como destinos exactos EO-OPN-0678, EO-OPN-0679 y EO-OPN-0680.
- Instagram: sin cambio guardado. Se encontró el acceso correcto en Meta Business Suite, portfolio Efeonce Media, pero Julio retiró esa parte del alcance antes de editar/guardar. Se cerró ese editor.

Edición nativa de publicaciones existentes, sin duplicar posts ni alterar la cola Metricool. Las pruebas de inserción del editor se deshicieron antes de guardar y el resultado final fue releído tras recargar. No se enviaron mensajes, invitaciones, comentarios, correos, ni hubo nuevas escrituras CRM o gasto publicitario.

Captura de comprobación conservada fuera del repo por incluir el perfil del operador: `/Users/jreye/.codex/agent-data/hubspot-saas-prospecting/reports/2026-10-22-reditos-digital-2027/hiring/linkedin-empresa-enlaces.jpg` (0600, carpeta0700).

## Separación de fuentes ratificada por Julio

El 2026-10-22T17:48:59.157148-03:00, Julio indicó que una licitación anterior de este comprador se perdió y no debe guiar la nueva. El RFP actual GRD-1552 es la fuente de los tres roles, dedicación y modalidad. La estructura editorial y beneficios provienen del canon de Talento y el nivel/ruta contractual de su confirmación expresa. No se usó la propuesta perdida como plantilla. No se atribuye esa pérdida a Programática: Julio no identificó el expediente anterior en esta corrección. Sin cambios adicionales en vacantes o publicaciones.
