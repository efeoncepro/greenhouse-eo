<?php
/**
 * Sets the blog surface of the «Growth CTA» block (efeonce-editorial-blocks ≥ 0.7.0): option `eo_growth_cta_blog`
 * with the WordPress surface, its embed key, the CTA slugs the surface allows and the Growth Form surface. Read from a
 * JSON input file so the key never appears in a command line or in the output. The file is
 * `.auth/blog-growth-cta-surface.json`, written by Greenhouse `scripts/growth/publish-blog-aeo-assessment-cta.ts`;
 * re-running that script rotates the key, and this one must follow or the block prints nothing.
 * Input: {"surface": "csur-…", "key": "…", "ctas": ["blog-aeo-assessment"], "formSurface": "fhsf-…"}
 * or {"clear": true} to remove it (every Growth CTA block then prints nothing). Purges the caches.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/set-blog-growth-cta.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$input = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $input ) ) { WP_CLI::error( 'Unreadable input.' ); }
if ( ! class_exists( 'EO_Growth_Cta' ) ) { WP_CLI::error( 'efeonce-editorial-blocks 0.7.0 (EO_Growth_Cta) is not loaded.' ); }
$before = get_option( EO_Growth_Cta::OPTION, array() );
$before = is_array( $before ) && ! empty( $before['surface'] );
if ( ! empty( $input['clear'] ) ) {
	delete_option( EO_Growth_Cta::OPTION );
	$ctas = array();
} else {
	$ctas  = isset( $input['ctas'] ) && is_array( $input['ctas'] ) ? array_values( array_map( 'strval', $input['ctas'] ) ) : array();
	$value = array(
		'surface'     => (string) ( $input['surface'] ?? '' ),
		'key'         => (string) ( $input['key'] ?? '' ),
		'ctas'        => $ctas,
		'formSurface' => (string) ( $input['formSurface'] ?? '' ),
	);
	$valid = array() !== $ctas;
	foreach ( $ctas as $slug ) {
		$valid = $valid && null !== EO_Growth_Cta::resolve( $slug, $value );
	}
	if ( ! $valid ) {
		WP_CLI::error( 'The surface values are not valid (csur-… surface, key, at least one CTA slug); nothing was written.' );
	}
	update_option( EO_Growth_Cta::OPTION, $value, true );
}
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true, 'exit_error' => false ) );
$now = get_option( EO_Growth_Cta::OPTION, array() );
echo wp_json_encode(
	array(
		'status'      => 'blog_growth_cta_set',
		'before'      => $before,
		'set'         => is_array( $now ) && ! empty( $now['surface'] ),
		'surface'     => is_array( $now ) ? ( $now['surface'] ?? null ) : null,
		'ctas'        => is_array( $now ) ? ( $now['ctas'] ?? array() ) : array(),
		'formSurface' => is_array( $now ) ? ( $now['formSurface'] ?? null ) : null,
	)
) . PHP_EOL;
