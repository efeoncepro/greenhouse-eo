<?php
/**
 * Instala el mu-plugin `efeonce-redirect-query-passthrough.php` (redirects Yoast con query string). Fuente versionada:
 * efeonce-public-site-runtime/wp-content/mu-plugins/. Diagnóstico y propuesta:
 * docs/public-site/YOAST_REDIRECT_QUERY_STRING_DIAGNOSIS_V1.md.
 *
 * Uso (sólo con autorización del operador):
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/install-redirect-query-passthrough.php \
 *     --input-file ../efeonce-public-site-runtime/wp-content/mu-plugins/efeonce-redirect-query-passthrough.php --wp-user 12
 * Rollback (< 1 min): borrar wp-content/mu-plugins/efeonce-redirect-query-passthrough.php y purgar; o definir
 * EFEONCE_REDIRECT_QUERY_PASSTHROUGH_DISABLED en wp-config.php.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the mu-plugin input.' ); }
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! is_array( get_option( 'wpseo-premium-redirects-export-plain' ) ) ) { WP_CLI::error( 'Yoast Premium plain redirects not found.' ); }
$target  = WPMU_PLUGIN_DIR . '/efeonce-redirect-query-passthrough.php';
$content = (string) file_get_contents( $args[0] );
if ( false === strpos( $content, 'function efeonce_rqp_resolve' ) ) { WP_CLI::error( 'Unexpected mu-plugin input.' ); }
if ( file_exists( $target ) && ! hash_equals( hash( 'sha256', $content ), hash_file( 'sha256', $target ) ) ) { WP_CLI::error( 'A different mu-plugin already exists at the target.' ); }
if ( ! wp_mkdir_p( WPMU_PLUGIN_DIR ) || false === file_put_contents( $target, $content ) ) { WP_CLI::error( 'mu-plugin write failed.' ); }
if ( ! hash_equals( hash( 'sha256', $content ), hash_file( 'sha256', $target ) ) ) { WP_CLI::error( 'Readback hash mismatch.' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'installed', 'muPlugin' => $target, 'sha256' => hash( 'sha256', $content ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
