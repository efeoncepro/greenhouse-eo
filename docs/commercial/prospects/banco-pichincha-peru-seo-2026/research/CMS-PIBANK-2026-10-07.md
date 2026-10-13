# Pibank Perú · CMS del sitio público

Verificado el **07-10-2026**, America/Santiago. Evidencia de lectura pública, sin acceso administrativo.

**Conclusión: WordPress en `pibank.pe`, con un tema llamado `pibank` y señales de Yoast SEO.**

Se leyeron la [portada](https://pibank.pe/) y [Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/), ambas HTTP200. El HTML referencia `/wp-content/themes/pibank/`, recursos `wp-content`/`wp-includes`, `/wp-json/` y comentarios de Yoast SEO. [Registro de señales](CMS-PIBANK-2026-10-07.json).

El enlace de apertura lleva a `registro.pibank.pe`. Esta comprobación identifica sólo el CMS del sitio comercial; no identifica la tecnología del registro/app ni demuestra permiso de administración, continuidad de eventos o acceso a datos bancarios. La versión exacta de WordPress no se infiere desde estas señales.

Para la propuesta: implementación en WordPress donde el banco autorice acceso; especificación y QA conjunta con su proveedor cuando el acceso no corresponda a Efeonce. El registro conserva su validación y operación bancaria separadas.
