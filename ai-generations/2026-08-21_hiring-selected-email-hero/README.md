# Ilustración de correo para persona seleccionada

Asset de producto para `hiring_decision_selected`. La imagen acompaña un momento de reconocimiento; nunca porta la
decisión, representa a la persona ni comunica incorporación. Diseño y Talent gobiernan la selección visual.

## Iteración

- **V1 rechazada:** aro, esfera y flecha 3D se leían como performance/tecnología. Score: `28/50`; ver
  [`audit-v1-rejected.md`](audit-v1-rejected.md).
- **V2 explorada:** bouquet de papel, puerta/capítulo abierto y celebración editorial.
- **V2 rechazada:** el bouquet mejoró la calidez, pero resultó genérico y sin ajuste suficiente a Efeonce; ver
  [`audit-v2-rejected.md`](audit-v2-rejected.md).
- **V3 seleccionada:** composición determinística con el isotipo orbital oficial intacto, las bandas angulares de
  Wave y acentos de la paleta institucional. Se usa a `360×180`, como firma secundaria; el título sigue siendo el foco.
- Puerta rechazada por sugerir onboarding o transición ya consumada. Celebración rechazada por seguir abstracta.

## Contrato de entrega

- Formato: PNG sRGB con transparencia nativa.
- Producción: V1/V2 mediante `pnpm ai:image` con `gpt-image-2`; V3 mediante composición SVG + Sharp para preservar
  con exactitud la identidad oficial.
- Accesibilidad: `alt=""`; ninguna información indispensable vive en la imagen.
- Restricciones: sin texto generado, personas, caras, manos, carta oferta, contrato o incorporación. El isotipo
  oficial se reutiliza sin reinterpretación.

## Entregables

- V1 rechazada: `source/hiring-selected-email-hero-master-v1.png` + `rejected/hiring-selected-email-hero-v1.png`.
- V2 rechazada: `source/hiring-selected-email-illustration-master-v2.png` (`1536×1024`) y delivery preservado bajo
  `rejected/` como evidencia.
- V3 fuente: `source/hiring-selected-email-illustration-v3.svg` + `public/branding/SVG/isotipo-full-efeonce.svg`.
- Delivery: `../../public/images/generated/hiring-selected-email-illustration-v3.png` (`960×480`, 25.228 bytes).
- URL: `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/emails/hiring-selected-email-illustration-v3.png`.
- SHA-256: `a88408e636adf915b8d9fdb024e42ba89bb6eb826b2216cbd839a722c598cdc0`.

## Estado

V3 seleccionada, optimizada, subida e integrada localmente sólo en la variante seleccionada. Rollout pendiente.
