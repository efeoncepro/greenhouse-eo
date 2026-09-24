# Prueba local SKY — dirección visual

> Actualización 2026-09-24: punch-v3 aprobado por el operador; ver `approval-punch-v3.json`. Este documento conserva el proceso de diseño/auditoría. El plan futuro vigente vive en `PLAN-VIDEO-AUDIO-V10.md` de CMP-003 en OneDrive (CDR-008). Película completa y audio aún pendientes.


Formato 1080×1920,24fps,30s. Sin inferencia ni llamadas de pago. SOLO texto y firma determinísticos sobre transparencia. El video de fondo sigue siendo generativo.

## Identidad

Paleta tomada del kit: azul Efeonce #022A4E, morado SKY #701C74, lima SKY #26DE00, blanco #FFFFFF, tinta #2F2B3D. Bricolage Grotesque para títulos; Poppins para interfaz. Fotografías/flight del proyecto existente. No degradados decorativos arbitrarios: luz motivada por cielo y cita.

## Principio visual

La cámara pertenece al video generativo. El overlay anima objetos de texto con profundidad, máscaras y trayectorias, y llega a una lectura estable. No anima el fondo ni reconstruye la película. Texto literal y tipografía real.

## Firma

Logos Efeonce/SKY desde SVG de kit. URL Bubble canónico `kit/refs/url-lum.svg`, idéntico al asset del catálogo de AXIS, como imagen íntegra; no redibujar su contorno ni recomponer sus letras. Gris original, fusión Luminosidad y opacidad 0,72 sobre el fondo. Exportar separado del texto para conservar el modo de composición. No aplicar clases SVG globales entre marcas.

## Evitar

No narración, restos de voz aceptados por ASR ni suppressions sobre frases. No atempo por escenas. No freeze al entrar avión. No cambios de eje/velocidad del avión. No rectángulo CSS como URL Bubble. No revelar toda una cartela y llamarlo tipografía cinética. No presentar un prototipo como master aprobado.

## Iteración de impacto solicitada por el operador

- «Un año creando»: barrido oblicuo de izquierda a centro; «con SKY»: entrada grande desde profundidad y asentamiento corto.
- «+»: trayectoria independiente con giro de 270°, arco y pequeño rebote al llegar; el número entra después con golpe de escala; «piezas» cruza desde el lateral opuesto.
- Intro y «su agencia»: dirección lateral alternada. «SEO/AEO»: mayor entrada desde profundidad, acento principal de la cartela.
- «Gracias»: crece desde profundidad lejana hasta plano de lectura; cierre gráfico estable.
- Entradas principales de 6–8 fotogramas, asentamiento amortiguado; ecos de letras y desenfoque solo durante desplazamiento. Relieve y barrido de luz dentro de los glifos. Nada de sacudir el cielo ni añadir narración.
- Salidas de texto aceleradas de unos 4 fotogramas. El hold preserva lectura completa y detiene el efecto antes de la siguiente acción.
- Esta dirección sigue pendiente de evaluación perceptual del operador y de integración con cielo animado y música; no se declara aprobada por pasar pruebas técnicas.

## Dirección vigente — v3: progresión y continuidad

Esta revisión reemplaza la coreografía de la prueba punch-v2, preservada en `versions/punch-v2/` y en su MP4.

1. «Un año creando» conserva barrido lateral; «con SKY» emerge hacia arriba con un giro corto de profundidad. El primer mensaje establece energía sin agotar el impacto máximo.
2. La cartela sale hacia la izquierda y el «+» entra desde la derecha, siguiendo esa misma dirección. Su llegada en 2,78 s activa el despliegue horizontal de «2.000»; al asentarse la cifra aparece «piezas». La relación es causal y la cifra conserva su tamaño durante la lectura.
3. «+2.000 piezas» asciende al salir; la introducción de agencia asciende desde abajo. La dirección continúa entre composiciones y se evita una pausa de pantalla vacía.
4. «SEO/AEO» recibe el único golpe grande desde primer plano. El resto ya está colocado, estableciendo jerarquía.
5. «Gracias» empieza en 8,19 s, se asienta en 8,61 s y permanece hasta la salida de 10,03 s. Movimiento corto, sin rotación ni rebote; la energía resuelve en agradecimiento.
6. Relieve reducido a dos bordes finos; sombra más suave. Letras blancas estables; barrido luminoso de 0,25 s únicamente al llegar. Se elimina el acabado metálico fijo.
7. Firma y URL Bubble mantienen su tratamiento: gris fuente, Luminosidad 72%, capa separada. Cielo definitivo animado y generativo. La muestra usa una imagen de referencia temporal y no tiene sonido.
