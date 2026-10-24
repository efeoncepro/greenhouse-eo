<?php
/**
 * Local side of `pnpm public-website:site-nav` (TASK-2042): validates or renders a document with the EO Navegación
 * plugin's own PHP classes (byte-identical to AXIS, see tests/eo-site-nav-*.test.php in the runtime repo), without
 * WordPress. The server validates again when the document is applied.
 *
 *   php local.php validate <document.json>
 *   php local.php render <document.json> <options.json>
 */
define( 'ABSPATH', __DIR__ );
$runtime = getenv( 'PUBLIC_SITE_RUNTIME_ROOT' ) ?: '/Users/jreye/Documents/efeonce-public-site-runtime';
$dir     = $runtime . '/wp-content/plugins/eo-site-nav/';
require $dir . 'includes/class-eosn-validator.php';
require $dir . 'includes/class-eosn-render.php';
[ , $mode, $file ] = $argv + array( null, null, null );
$json = ( $file && is_readable( $file ) ) ? file_get_contents( $file ) : '';
if ( 'validate' === $mode ) {
	echo json_encode( EOSN_Validator::from_plugin_dir( $dir )->issues_for_json( $json ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . "\n";
	exit;
}
if ( 'render' === $mode ) {
	$options = json_decode( file_get_contents( $argv[3] ), true );
	echo EOSN_Render::html( json_decode( $json ), $options );
	exit;
}
if ( 'glyphs' === $mode ) {
	echo json_encode( array_keys( EOSN_Render::data()['glyphs'] ) ) . "\n";
	exit;
}
fwrite( STDERR, "Usage: php local.php validate|render|glyphs <document.json> [options.json]\n" );
exit( 2 );
