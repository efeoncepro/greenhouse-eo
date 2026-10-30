<?php
/**
 * TASK-2049 — the Ohio portfolio category archives (/portfolio-category/<term>/, with pagination and feeds) go to the
 * new index /portafolio/ with one Yoast 301 regex redirect: the Ohio categories do not map one-to-one to the portfolio's
 * service lines, so no guessed filter. `dryRun` by default: lists the terms, the redirects that already start there
 * and what it would create. Refuses if the new pages are not on or another redirect already claims those origins.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/redirect-portfolio-categories.php --input-file <json> --wp-user 12
 *
 * Rollback: delete the redirect with origin `^/?portfolio-category(/.*)?$` (printed on apply).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in      = json_decode( (string) file_get_contents( $args[0] ), true );
$dry_run = ! is_array( $in ) || ! array_key_exists( 'dryRun', $in ) || false !== $in['dryRun'];
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
if ( ! class_exists( 'EOP_Render' ) || '1' !== (string) get_option( EOP_Render::OPTION, '0' ) ) { WP_CLI::error( 'The new portfolio pages are not on; nothing written.' ); }

// Yoast matches the regex against the whole request URI, leading slash included (redirect-handler.php,
// get_request_uri): an origin starting `^portfolio-category` never matches. The first try (2026-10-30) did exactly that;
// it is listed in `$superseded` and replaced.
$origin     = '^/?portfolio-category(/.*)?$';
$superseded = array( '^portfolio-category(/.*)?$' );
$target = EOP_Store::base();
$terms  = get_terms( array( 'taxonomy' => 'ohio_portfolio_category', 'hide_empty' => false, 'fields' => 'id=>slug' ) );
$terms  = is_wp_error( $terms ) ? array() : array_values( $terms );

$regex   = new WPSEO_Redirect_Manager( 'regex' );
$plain   = new WPSEO_Redirect_Manager( 'plain' );
$present = null;
$claims  = array();
$stale = array();
foreach ( $regex->get_all_redirects() as $r ) {
	if ( in_array( $r->get_origin(), $superseded, true ) ) {
		$stale[] = $r;
		continue;
	}
	if ( $r->get_origin() === $origin ) {
		$present = $r;
	} elseif ( false !== strpos( $r->get_origin(), 'portfolio-category' ) ) {
		$claims[] = array( 'origin' => $r->get_origin(), 'target' => $r->get_target(), 'type' => (int) $r->get_type(), 'format' => 'regex' );
	}
}
foreach ( $plain->get_all_redirects() as $r ) {
	if ( 0 === strpos( ltrim( $r->get_origin(), '/' ), 'portfolio-category' ) ) {
		$claims[] = array( 'origin' => $r->get_origin(), 'target' => $r->get_target(), 'type' => (int) $r->get_type(), 'format' => 'plain' );
	}
}
// A plain redirect wins over the regex for its exact URL; one that already goes to the portfolio is harmless.
$conflicts = array_values( array_filter( $claims, fn( $c ) => trim( $c['target'], '/' ) !== $target ) );
$state     = $present ? ( trim( $present->get_target(), '/' ) === $target && 301 === (int) $present->get_type() ? 'exists' : 'conflict' ) : 'create';

$plan = array( 'dryRun' => $dry_run, 'superseded' => array_map( fn( $r ) => $r->get_origin(), $stale ), 'terms' => $terms, 'origin' => $origin, 'target' => $target, 'regex' => $state, 'otherRedirects' => $claims, 'conflicts' => $conflicts );
if ( 'conflict' === $state || $conflicts ) { WP_CLI::error( 'Another redirect already claims these origins; nothing written: ' . wp_json_encode( $plan, JSON_UNESCAPED_SLASHES ) ); }
if ( $dry_run || 'exists' === $state ) {
	echo wp_json_encode( $plan, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
	return;
}
if ( $stale && ! $regex->delete_redirects( $stale ) ) { WP_CLI::error( 'Could not remove the superseded regex redirect; nothing else changed.' ); }
if ( ! $regex->create_redirect( new WPSEO_Redirect( $origin, $target, 301, 'regex' ) ) ) { WP_CLI::error( 'Redirect creation failed; nothing else changed.' ); }
$created = null;
foreach ( ( new WPSEO_Redirect_Manager( 'regex' ) )->get_all_redirects() as $r ) {
	if ( $r->get_origin() === $origin ) { $created = $r; }
}
if ( ! $created || 301 !== (int) $created->get_type() ) { WP_CLI::error( 'Redirect readback failed. Delete origin ' . $origin . ' by hand if it exists.' ); }
$plan['regex']    = 'created';
$plan['rollback'] = 'Delete the regex redirect with origin ' . $origin;
echo wp_json_encode( $plan, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
