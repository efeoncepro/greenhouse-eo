<?php
/**
 * TASK-2049 — when a portfolio entry leaves the site, its URL must not end in a 404: this sends it (301, Yoast Premium)
 * to the entry that now holds the work, and points every redirect that ended in the retired URL straight to that
 * entry, so no chain is left (the Ohio cutover made such redirects). Refuses if the retired entry is still published
 * or the target is not. Dry run by default; `"apply": true` writes, then reads every redirect back.
 * Input: { "from": "sky-airline-fiestas-patrias-peru", "to": "sky-airline-un-ano-de-campanas", "apply": false }
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/redirect-retired-entry.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
if ( ! class_exists( 'EOP_Store' ) ) { WP_CLI::error( 'eo-portfolio is not active.' ); }
$in    = json_decode( (string) file_get_contents( $args[0] ), true );
$slug  = fn( $s ) => preg_match( '/^[a-z0-9]+(-[a-z0-9]+)*$/', (string) $s ) ? (string) $s : null;
$from  = $slug( $in['from'] ?? '' );
$to    = $slug( $in['to'] ?? '' );
$apply = ! empty( $in['apply'] );
if ( ! $from || ! $to || $from === $to ) { WP_CLI::error( 'Input needs two different entry slugs: from and to.' ); }
if ( EOP_Store::served( $from ) ) { WP_CLI::error( $from . ' is still published: unpublish it first.' ); }
if ( ! EOP_Store::served( $to ) ) { WP_CLI::error( $to . ' is not published.' ); }

$norm    = fn( $path ) => trim( wp_make_link_relative( (string) $path ), '/' );
$base    = trim( EOP_Store::base(), '/' );
$origin  = $base . '/' . $from;
$target  = $base . '/' . $to;
$manager = new WPSEO_Redirect_Manager();
$find    = function ( $path ) use ( $manager ) {
	foreach ( array( $path, '/' . $path, $path . '/', '/' . $path . '/' ) as $variant ) {
		$found = $manager->get_redirect( $variant );
		if ( $found ) { return $found; }
	}
	return null;
};

// 1. Plan: the retired URL itself, then every redirect that ended in it.
$plan     = array();
$existing = $find( $origin );
if ( $existing && ( $norm( $existing->get_target() ) !== $target || 301 !== (int) $existing->get_type() ) ) {
	WP_CLI::error( $origin . ' already redirects elsewhere: ' . $existing->get_target() );
}
$plan[] = array( 'origin' => $origin, 'target' => $target, 'action' => $existing ? 'exists' : 'create' );
foreach ( $manager->get_all_redirects() as $redirect ) {
	if ( $norm( $redirect->get_target() ) === $origin && $norm( $redirect->get_origin() ) !== $origin ) {
		$plan[] = array( 'origin' => $norm( $redirect->get_origin() ), 'target' => $target, 'action' => 'retarget', 'was' => $redirect->get_target(), 'type' => (int) $redirect->get_type(), 'format' => $redirect->get_format() );
	}
}
if ( ! $apply ) {
	WP_CLI::line( wp_json_encode( array( 'dryRun' => true, 'plan' => $plan ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
	return;
}

// 2. Write, then read every redirect back.
foreach ( $plan as $item ) {
	if ( 'create' === $item['action'] ) {
		if ( ! $manager->create_redirect( new WPSEO_Redirect( $item['origin'], $item['target'], 301, 'plain' ) ) ) { WP_CLI::error( 'Redirect creation failed at ' . $item['origin'] ); }
	} elseif ( 'retarget' === $item['action'] ) {
		$old = new WPSEO_Redirect( $item['origin'], $item['was'], $item['type'], $item['format'] );
		$new = new WPSEO_Redirect( $item['origin'], $item['target'], $item['type'], $item['format'] );
		if ( ! $manager->update_redirect( $old, $new ) ) { WP_CLI::error( 'Redirect update failed at ' . $item['origin'] ); }
	}
	$stored = $find( $item['origin'] );
	if ( ! $stored || $norm( $stored->get_target() ) !== $item['target'] ) { WP_CLI::error( 'Redirect readback failed at ' . $item['origin'] ); }
}
WP_CLI::line( wp_json_encode( array( 'applied' => true, 'plan' => $plan ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) );
