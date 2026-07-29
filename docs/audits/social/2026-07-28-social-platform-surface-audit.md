# Auditoría de superficies sociales para piezas visuales de reportes

**Fecha:** 2026-07-28

**Alcance:** Instagram, LinkedIn y YouTube; post visual de Brand Visibility / reporte SKY.
**Resultado:** el archivo 1080 × 1350 no es un asset universal.

## Conclusión

Las plataformas no publican un mapa único de píxeles que describa todos sus overlays, recortes y
jerarquías. Por eso, la producción debe separar **formato**, **superficie** y **evidencia**:

- el master 4:5 puede servir para Instagram feed y LinkedIn como imagen nativa;
- Instagram requiere revisar feed, vista individual y preview del perfil;
- LinkedIn requiere separar imagen nativa de preview de enlace;
- YouTube requiere un derivado 16:9 para thumbnails, 1:1 para Community y 9:16 para Shorts/video vertical.

La zona protegida es una regla operativa de diseño, no una especificación oficial de las plataformas.

## Evidencia por plataforma

| Plataforma / superficie | Contrato oficial relevante | Riesgo de UI o jerarquía | Decisión de producción |
| --- | --- | --- | --- |
| Instagram feed / post | Instagram admite imágenes entre 1.91:1 y 3:4, hasta 1080 px de ancho. | Cabecera, acciones, caption y contexto de cuenta cambian la atención; el grid puede usar un preview distinto. No hay safe zone pixelada oficial para posts estáticos. | Mantener 1080 × 1350 como master, proteger el centro y probar feed, vista individual y perfil. Preparar 1080 × 1440 si el perfil es prioritario. |
| LinkedIn imagen nativa | Las publicaciones orgánicas admiten hasta 4:5; una imagen más vertical se centra y recorta. | Avatar, nombre, texto, menú y acciones rodean la imagen; desktop reduce su tamaño aparente. La primera imagen domina en publicaciones múltiples. | Usar 1080 × 1350 como derivado propio, con primera lámina autónoma y evidencia legible sin caption. |
| LinkedIn preview de enlace | El enlace se presenta como preview horizontal y no equivale a una imagen nativa 4:5. | El recorte y la jerarquía los controla la tarjeta de enlace, no el layout 4:5. | Crear un derivado horizontal cercano a 1.91:1; no reutilizar el post 4:5. |
| YouTube thumbnail de video | YouTube recomienda 16:9; para videos verticales puede sustituir la miniatura personalizada por una automática 4:5 en Home, Explore y Subscriptions. | Home, suscripciones, watch page y dispositivos no muestran necesariamente la misma miniatura ni el mismo tamaño. | Crear thumbnail 16:9 independiente; revisar Home, Subscriptions y Watch. Para vertical, tratar el frame como otro asset. |
| YouTube Community image post | YouTube sugiere 1:1 para posts de imagen porque se muestran en el feed; la imagen completa se ve al expandir. Los posts pueden aparecer en Home, canal, Subscriptions y, en algunos casos, Shorts feed. | Feed y expansión tienen jerarquías distintas; el primer frame debe ser autónomo. | Crear 1080 × 1080; reducir la evidencia a un hallazgo legible y probar la shelf de Posts. |
| YouTube Shorts / video vertical | La interfaz vertical superpone controles, metadata y acciones; la distribución exacta depende de la superficie y dispositivo. | Las zonas inferiores y laterales son vulnerables a controles. | Crear 1080 × 1920 específico, sin datos críticos en bordes inferiores, laterales ni zonas de CTA. |

## Regla operativa de safe zone

Para el master 1080 × 1350:

- proteger aproximadamente los 944 px centrales de ancho;
- tratar los 68 px laterales como margen no crítico por el riesgo de preview 4:5 → 3:4;
- mantener logo, score, headline y dato principal dentro del centro;
- evitar información load-bearing en las esquinas y en el tercio inferior;
- mantener suficiente aire superior para que la marca no compita con la cabecera de cuenta.

Los 68 px por lado son una inferencia prudencial de producción, no un número garantizado por Instagram.
Validar siempre con capturas reales de las superficies objetivo.

## Cambios requeridos al sistema

1. Cambiar el entregable de “un post” a una **familia de derivados por plataforma**.
2. Añadir una matriz de QA de superficies a cada brief y a cada handoff.
3. Diseñar la evidencia principal dentro de una región central sobreviviente a recortes 4:5, 3:4 y 1:1.
4. Hacer que la primera imagen de cualquier carrusel o secuencia sea autónoma.
5. Prohibir reutilizar el 4:5 como thumbnail de YouTube o como preview de enlace de LinkedIn.
6. Validar jerarquía en feed, vista individual, perfil, Home, Subscriptions, Watch y expansión de Community.
7. No declarar una pieza “aprobada” solo por verla a tamaño completo en un lienzo aislado.

## Fuentes oficiales

- [Instagram: resolución y proporciones de fotos](https://www.facebook.com/help/instagram/1631821640426723?locale=en_GB)
- [LinkedIn: compartir fotos](https://www.linkedin.com/help/linkedin/answer/a527229)
- [LinkedIn: compartir artículos o enlaces](https://www.linkedin.com/help/linkedin/answer/a525301/sharing-articles-or-links?lang=en)
- [YouTube: miniaturas personalizadas](https://support.google.com/youtube/answer/72431?hl=en)
- [YouTube: tipos y distribución de posts](https://support.google.com/youtube/answer/9409631?hl=en)
- [YouTube: crear un post de imagen](https://support.google.com/youtube/answer/7124474)
- [YouTube: recomendaciones para miniaturas](https://support.google.com/youtube/answer/12340300?hl=en)

## Fuentes secundarias usadas solo para identificar riesgo

- [PostPlanify: cambios del grid de Instagram](https://postplanify.com/blog/instagram-grid-layout-guide)
- [Cropix: recorte 4:5 en el perfil de Instagram](https://cropix.app/blog/why-instagram-crops-4-5-posts-profile-grid-2026)

Estas fuentes no sustituyen los contratos oficiales y no deben convertirse en invariantes de píxeles.
