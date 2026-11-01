<?php
/**
 * Local half of `pnpm public-website:portfolio`: the plugin's own validator and public projection, without WordPress.
 * Reads the plugin from the runtime repo (PUBLIC_SITE_RUNTIME_ROOT), so what passes here is what the site accepts.
 *
 *   php scripts/public-website/portfolio/local.php validate <document.json> [publish]
 *   php scripts/public-website/portfolio/local.php project <document.json>
 */
define( 'ABSPATH', __DIR__ );
$runtime = getenv( 'PUBLIC_SITE_RUNTIME_ROOT' ) ?: '/Users/jreye/Documents/efeonce-public-site-runtime';
$dir     = rtrim( $runtime, '/' ) . '/wp-content/plugins/eo-portfolio/';
if ( ! is_file( $dir . 'includes/class-eop-validator.php' ) ) {
	fwrite( STDERR, "eo-portfolio not found in $dir\n" );
	exit( 2 );
}
require $dir . 'includes/class-eop-validator.php';
require $dir . 'includes/class-eop-projection.php';

$mode = $argv[1] ?? '';
$file = $argv[2] ?? '';
$json = is_readable( $file ) ? file_get_contents( $file ) : '';
$validator = EOP_Validator::from_plugin_dir( $dir );

if ( 'validate' === $mode ) {
	$issues  = $validator->issues_for_json( $json );
	$publish = ! $issues && 'publish' === ( $argv[3] ?? '' ) ? $validator->publish_issues( json_decode( $json ) ) : array();
	echo json_encode( array( 'valid' => ! $issues, 'issues' => $issues, 'publishIssues' => $publish ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . "\n";
	exit( $issues ? 1 : 0 );
}
if ( 'project' === $mode ) {
	$issues = $validator->issues_for_json( $json );
	if ( $issues ) {
		echo json_encode( array( 'valid' => false, 'issues' => $issues ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . "\n";
		exit( 1 );
	}
	$doc = json_decode( $json );
	echo json_encode( array( 'scope' => EOP_Projection::scope( $doc ), 'summary' => EOP_Projection::summary( $doc ), 'entry' => EOP_Projection::entry( $doc ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . "\n";
	exit( 0 );
}
fwrite( STDERR, "Usage: local.php validate|project <document.json> [publish]\n" );
exit( 2 );
