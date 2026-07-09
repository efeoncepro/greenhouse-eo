# Operar Careers públicas

## Antes de empezar

Confirma:

- existe un opening publicado por el flujo de Hiring/ATS;
- `HIRING_PUBLIC_APPLICATIONS_ENABLED` está en el estado esperado del ambiente;
- Turnstile y consentimiento están aprobados para el ambiente objetivo;
- la ruta pública que vas a probar corresponde al ambiente correcto.

## Verificar rutas

1. Abre `/public/careers`.
2. Confirma que la página carga marca Efeonce, hero, filtros, proceso y vacantes.
3. Abre una vacante desde el card.
4. Confirma que `/public/careers/[publicId]` muestra detalle, competencias,
   proceso y CTA de postulación.
5. Abre `/public/careers/[publicId]/apply`.
6. Confirma que el formulario muestra el contrato `application` y el slug
   `efeonce-careers-application`.

## Verificar formulario

1. Intenta enviar vacío.
2. Deben aparecer errores inline y un resumen accesible.
3. Completa nombre, apellido, email y consentimiento.
4. Sube un CV PDF de prueba si aplica. El límite visible es 10 MB y no deben
   aceptarse DOC, DOCX ni ZIP.
5. Completa portafolio/LinkedIn solo con URLs `https://` si aplica.
6. Envía.
7. La respuesta visible debe ser genérica, tanto para envío aceptado como para
   dedupe seguro.

No pedir documentos de identidad ni datos personales sensibles en el apply
público. TASK-1362 queda para document capture completo, scan/quarantine y
otros documentos de candidato.

## Captura visual

Usa GVC para evidencia visual:

```bash
pnpm fe:capture --route=/public/careers --env=local --hold=1500
pnpm fe:capture --route=/public/careers/<publicId> --env=local --hold=1500
pnpm fe:capture --route=/public/careers/<publicId>/apply --env=local --hold=1500
```

Además, validar mobile 390 con Playwright o escenario GVC dedicado:

- consola sin errores;
- `scrollWidth == clientWidth`;
- campos y botones sin overlap;
- copy legible;
- reduced-motion sin animaciones decorativas obligatorias.

## Cutover

Antes de indexar o anunciar la ruta:

1. Verificar apply end-to-end en staging con una vacante real.
2. Confirmar que `POST /api/public/hiring/applications` crea o dedupea la
   postulación sin revelar estado interno.
3. Confirmar Turnstile/secret/site key en el ambiente.
4. Confirmar consentimiento y política legal vigentes.
5. Pasar GVC desktop/mobile y revisar frames.
6. Activar indexación solo cuando el CTA de postulación esté operativo.

## Rollback

La UI es additive. Para rollback de código, revertir las rutas
`src/app/public/careers/**`, los componentes `src/components/greenhouse/careers/**`
y el namespace copy `careers`.

Para desactivar recepción pública sin revertir UI, mantener
`HIRING_PUBLIC_APPLICATIONS_ENABLED` apagado y conservar `noindex`.
