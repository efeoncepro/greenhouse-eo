# 07 · IP de Contenido Generado por IA

> **⚠️ No es asesoría legal y es ZONA EN EVOLUCIÓN.** El derecho de IP sobre output de IA está **en formación** (jurisprudencia y guías cambiando en 2024-2026). Orienta el riesgo; valida con abogado de PI. Para una agencia que produce con IA a escala, esto es riesgo de primer orden.

Efeonce genera imagen/video/audio/texto con IA (ver `greenhouse-ai-image-generator`, media/Content Factory). Cada pieza IA trae **tres preguntas de IP** distintas.

## Las 3 preguntas de IP de una pieza IA

1. **¿Se puede ser dueño del output?** (copyrightability)
2. **¿Me deja el proveedor usarlo comercialmente y ceder derechos?** (términos del proveedor)
3. **¿El output infringe derechos de terceros?** (training data / likeness / similitud)

## 1. Copyrightability — ¿hay copyright sobre el output IA?

- **EEUU (US Copyright Office, postura 2023-2025):** el material **puramente generado por IA sin autoría humana suficiente no es registrable** (requiere autoría humana). La **selección, arreglo y edición humana** puede tener copyright sobre esa contribución, no sobre el output crudo.
- **Implicación agencia:** un entregable **100% IA sin intervención humana significativa puede NO tener copyright** → no puedes garantizarle al cliente propiedad exclusiva de algo que quizá **nadie** posee. La **curaduría/edición humana** (que ya es tu barra de calidad — ver content studio) también fortalece la posición de IP.
- **LATAM:** el criterio de "autor = persona humana" es fuerte en civil law; el output puramente automático difícilmente califica como obra con autor. Verifica por país.

## 2. Términos del proveedor — ¿te dejan usarlo y cederlo?

Cada generador tiene **sus términos**, y **no son iguales**:

- Revisa, por proveedor (OpenAI, Adobe Firefly, Google, Midjourney, Higgsfield, Magnific, fal.ai, etc.): ¿te asigna la propiedad/derechos de uso del output? ¿permite **uso comercial**? ¿en qué plan (free vs pago cambia derechos)? ¿puedes **sublicenciar/ceder** al cliente?
- **Indemnidad del proveedor:** algunos (p. ej. Adobe Firefly, ciertos planes enterprise) **ofrecen indemnización** por reclamos de IP sobre el output (entrenado con datos licenciados). Otros **no**. Esto cambia el riesgo dramáticamente — prioriza proveedores con indemnidad para trabajo de cliente sensible.
- **Regla:** no puedes ceder al cliente más derechos de los que el proveedor te dio. Alinea el contrato con el cliente (`05`, `06`) con lo que el proveedor permite.

## 3. Infracción de terceros — training data, likeness, similitud

- **Training data:** litigios abiertos sobre si entrenar con obras protegidas infringe. Un output que **reproduce** de forma reconocible una obra/estilo protegido puede ser problemático. Riesgo mayor con prompts que nombran artistas/marcas vivas ("al estilo de [artista]", "como [personaje de Disney]").
- **Likeness / derechos de imagen y voz:** generar la cara o voz de una persona real (deepfake, clonación de voz) sin autorización viola derechos de imagen/publicidad — y hay leyes nuevas (varios estados US, propuestas LATAM) contra deepfakes y clonación de voz. **Requiere release** (`06`).
- **Marcas y personajes:** no generar logos/personajes protegidos para uso comercial.

## Reglas duras para producción IA en la agencia

1. **Curaduría humana siempre** (fortalece copyright + calidad). Nada de output crudo entregado (alinea con content studio `07` y ai-image-generator).
2. **Proveedor con derechos de uso comercial + (idealmente) indemnidad** para trabajo de cliente.
3. **No cedas más de lo que el proveedor te dio.** Ajusta la cláusula de IP del contrato a la realidad del proveedor.
4. **Prohíbe prompts que copien artistas/marcas/personajes vivos** para uso comercial.
5. **Likeness/voz de persona real → release** (`06`); cuidado con leyes anti-deepfake.
6. **Disclosure al cliente** cuando un entregable es (parcial/totalmente) generado por IA, y disclosure al público cuando la regulación/plataforma lo exija (`08`).
7. **No metas datos personales/confidenciales del cliente** en herramientas IA sin gobernanza (privacidad `01`-`04` + `greenhouse-secret-hygiene`).
8. **Studio Credits no son una licencia de IP.** La wallet mide consumo generativo; copyright, cesión, exclusividad, stock, música, likeness y voz se documentan y valorizan por separado.
9. **Versiona la evidencia del proveedor.** Conserva proveedor/modelo, plan y versión de términos aplicables, provenance, intervención humana, prompts/inputs permitidos y releases. Un cambio de proveedor o términos puede cambiar el riesgo aunque la tarifa en créditos no cambie.

## En el contrato con el cliente

- Sé **honesto sobre lo que puedes garantizar**: si un entregable es IA-generado, quizá no puedas prometer copyright exclusivo. Ajusta warranties (`05`) — no garantices una propiedad que la ley no reconoce.
- **Indemnidad:** define quién asume el riesgo de un reclamo de IP sobre el output IA (idealmente respaldado por la indemnidad del proveedor).

## Checklist

- [ ] Proveedor revisado: uso comercial + cesión + (idealmente) indemnidad.
- [ ] Curaduría/edición humana significativa (copyright + calidad).
- [ ] Sin prompts que copien artistas/marcas/personajes protegidos.
- [ ] Likeness/voz real → release; sin deepfakes no autorizados.
- [ ] Warranties/indemnidad del contrato ajustadas a la realidad IA (`05`).
- [ ] Disclosure al cliente (y al público si aplica) (`08`).
- [ ] Sin PII/confidencial en herramientas IA sin gobernanza.
- [ ] Studio Credits separados de licencias, releases y pass-throughs; provenance y términos del proveedor versionados.

## Hand-off

- IP general / cesión / releases → `06`; contrato → `05`.
- Publicidad/disclosure IA al público → `08`.
- Producción/dirección de arte IA → `greenhouse-ai-image-generator` + media + `content-marketing-studio` (módulo IA).
- Privacidad de datos en prompts → `01`-`04` + `greenhouse-secret-hygiene`.
- **Validación legal** → abogado de PI (zona en evolución — reverifica).
