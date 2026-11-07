# Vimeo — evidencia del parser real

Verificación del 2026-11-05. Resultado: **39 comprobaciones PASS** usando `WP_HTML_Tag_Processor` de WordPress en Kinsta, con la clase candidata evaluada bajo el nombre aislado `EO_Editorial_Vimeo_Candidate`. No se llamó `init`, no se registró el filtro, no se renderizó `the_content` y no se instaló el archivo del plugin en esta prueba.

Datos y hashes exactos: [vimeo-native-parser-qa.json](./vimeo-native-parser-qa.json).

Ejecutado desde `/Users/jreye/Documents/greenhouse-eo`:

```sh
pnpm -s public-website:wpcli -- --eval-file /tmp/glitch26-test-vimeo-candidate.php --input-file /Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/editorial/class-eo-editorial-styles.php --input-file /Users/jreye/Documents/efeonce-public-site-runtime/tests/eo-editorial-vimeo.test.php --wp-user 12
```

Salida observada, exit 0:

```text
eo-editorial-vimeo: 39 checks passed (real WP_HTML_Tag_Processor)
{
    "candidate_sha256": "ce3318605f86c259cd056a056b6342596c2f9354b43e6859794c3d17b124f21f",
    "test_sha256": "1577ea8c2d87811a667333cae52a26e4fd75ae4de0b8d21e015b1e095fb7c292",
    "parser": "WP_HTML_Tag_Processor",
    "parser_file": "/www/efeoncegroup_752/public/wp-includes/html-api/class-wp-html-tag-processor.php",
    "installed": false,
    "filters_registered": false
}
```

El runner temporal lee los dos inputs, sustituye únicamente la declaración de clase por el nombre candidato, evalúa esa definición sin inicializarla, define `EO_EDITORIAL_VIMEO_TEST_CLASS` y carga el test. No escribe posts, opciones, archivos del plugin ni cachés de oEmbed.

Comprobaciones locales complementarias, desde el repo runtime:

```sh
php -l wp-content/plugins/efeonce-editorial-blocks/includes/editorial/class-eo-editorial-styles.php
php tests/eo-editorial-styles.test.php
git diff --check -- wp-content/plugins/efeonce-editorial-blocks/includes/editorial/class-eo-editorial-styles.php tests/eo-editorial-styles.test.php
```

Resultados: sintaxis válida, 36 comprobaciones del harness local PASS y diff sin errores de whitespace. El harness local omite los tests opcionales del parser cuando no existe `WP_CORE_DIR`; la ejecución remota anterior cubre el parser real. Esta evidencia no sustituye la medición responsive del navegador ni acredita despliegue.
