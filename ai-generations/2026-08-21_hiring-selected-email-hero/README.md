# Ilustración de correo para persona seleccionada

Asset de producto para `hiring_decision_selected`. La imagen acompaña un momento de reconocimiento; nunca porta la
decisión, representa a la persona ni comunica incorporación. Diseño y Talent gobiernan la selección visual.

## Iteración

- **V1 rechazada:** aro, esfera y flecha 3D se leían como performance/tecnología. Score: `28/50`; ver
  [`audit-v1-rejected.md`](audit-v1-rejected.md).
- **V2 explorada:** bouquet de papel, puerta/capítulo abierto y celebración editorial.
- **V2 rechazada:** el bouquet mejoró la calidez, pero resultó genérico y sin ajuste suficiente a Efeonce; ver
  [`audit-v2-rejected.md`](audit-v2-rejected.md).
- **V3 rechazada:** la composición con isotipo y bandas Wave se reconocía como Efeonce, pero seguía siendo demasiado
  abstracta para este mensaje; ver [`audit-v3-rejected.md`](audit-v3-rejected.md).
- **V4 seleccionada:** icono 3D mate de un sobre abierto con tarjeta, check de confirmación y un único destello
  naranja. El objeto conecta de inmediato con el correo y la decisión positiva sin representar contrato u onboarding.
- Puerta rechazada por sugerir onboarding o transición ya consumada. Celebración rechazada por seguir abstracta.

## Contrato de entrega

- Formato: PNG sRGB con transparencia nativa.
- Producción: V1/V2 mediante `pnpm ai:image` con `gpt-image-2`; V3 mediante composición SVG + Sharp; V4 mediante el
  generador integrado de Codex —modelo no expuesto por la herramienta— y optimización PNG determinística con Sharp.
- Accesibilidad: `alt=""`; ninguna información indispensable vive en la imagen.
- Restricciones: sin texto generado, personas, caras, manos, carta oferta, contrato o incorporación.

## Entregables

- V1 rechazada: `source/hiring-selected-email-hero-master-v1.png` + `rejected/hiring-selected-email-hero-v1.png`.
- V2 rechazada: `source/hiring-selected-email-illustration-master-v2.png` (`1536×1024`) y delivery preservado bajo
  `rejected/` como evidencia.
- V3 rechazada: `source/hiring-selected-email-illustration-v3.svg` y
  `../../public/images/generated/hiring-selected-email-illustration-v3.png`, preservada como evidencia histórica.
- V4 master: `source/hiring-selected-email-mail-icon-master-v4.png` (`1536×1024`).
- Delivery: `../../public/images/generated/hiring-selected-email-mail-icon-v4.png` (`960×480`, 63.972 bytes).
- URL: `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/emails/hiring-selected-email-mail-icon-v4.png`.
- SHA-256: `d47f257373b19720fb67bfa60ab7d1879d98a9ee8d4c4b4f60d2ff93adbf39b5`.

## Estado

V4 seleccionada, optimizada, subida e integrada localmente sólo en la variante seleccionada. Rollout pendiente.
