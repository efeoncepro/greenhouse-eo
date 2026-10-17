<?php
/**
 * Aplana cadenas de redirects plain de Yoast: cada origen 301 cuyo destino es a su vez un origen 301 pasa a apuntar
 * directo al destino final. Sin argumentos = dry-run (sólo imprime el plan). Con `apply` escribe, guarda snapshot y
 * permite rollback restaurando sólo los destinos que cambió. Diagnóstico: docs/public-site/YOAST_REDIRECT_QUERY_STRING_DIAGNOSIS_V1.md.
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/flatten-yoast-redirect-chains.php --wp-user 12
 *   Aplicar (sólo con autorización del operador): agregar `--input-file <archivo con el texto apply>`;
 *   el wrapper sólo pasa archivos al eval-file.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) ) { WP_CLI::error( 'Yoast Premium missing.' ); }
$apply   = in_array( 'apply', $args ?? array(), true ) || ( isset( $args[0] ) && is_file( $args[0] ) && 'apply' === trim( (string) file_get_contents( $args[0] ) ) );
$manager = new WPSEO_Redirect_Manager();
$map     = array();
foreach ( $manager->get_all_redirects() as $r ) {
	if ( 'plain' === $r->get_format() ) { $map[ trim( $r->get_origin(), '/' ) ] = $r; }
}
$plan = array();
foreach ( $map as $origin => $r ) {
	if ( 301 !== (int) $r->get_type() ) { continue; }
	$seen = array( $origin => true ); $final = trim( $r->get_target(), '/' ); $hops = 1;
	while ( isset( $map[ $final ] ) && 301 === (int) $map[ $final ]->get_type() ) {
		if ( isset( $seen[ $final ] ) ) { WP_CLI::error( "Loop detected at $origin." ); }
		$seen[ $final ] = true; $final = trim( $map[ $final ]->get_target(), '/' ); $hops++;
	}
	if ( $hops > 1 ) { $plan[ $origin ] = array( 'from' => $r->get_target(), 'to' => $final, 'hops' => $hops ); }
}
if ( ! $apply ) { echo wp_json_encode( array( 'mode' => 'dry-run', 'chains' => $plan ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL; return; }
$name = '_gh_yoast_chain_flatten_before_' . gmdate( 'Ymd\THis\Z' );
if ( ! add_option( $name, $plan, '', 'no' ) ) { WP_CLI::error( 'Snapshot failed.' ); }
foreach ( $plan as $origin => $p ) {
	$current = $manager->get_redirect( $origin );
	if ( ! $current || trim( $current->get_target(), '/' ) !== trim( $p['from'], '/' ) ) { WP_CLI::error( "Precondition changed for $origin. Snapshot: $name" ); }
	if ( ! $manager->update_redirect( $current, new WPSEO_Redirect( $origin, $p['to'], 301, 'plain' ) ) ) { WP_CLI::error( "Update failed for $origin. Snapshot: $name" ); }
}
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'mode' => 'applied', 'snapshot' => $name, 'flattened' => count( $plan ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
