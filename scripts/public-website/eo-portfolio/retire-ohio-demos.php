<?php
/**
 * TASK-2046 Slice 2 — retire the Ohio demo entries of `ohio_portfolio` (PDR-028 §6).
 * Input JSON (the versioned allowlist plus a flag):
 *   {"dryRun": true, "real": [{"id","slug","modified"}…15], "demo": [{"id","slug","modified"}…44]}
 * For each demo ID: a 410 redirect for /project/<slug>/ through Yoast Premium (the site's only redirect owner) and the
 * post moved to draft (never deleted). For every ohio_portfolio post (59): comments and pings closed.
 * Refuses, writing nothing, when: Yoast's API or the 410 type is missing; the allowlist does not cover exactly the live
 * ohio_portfolio posts; a listed post changed since the snapshot (post_modified or slug differ); a real entry is not
 * published; a demo origin already has a redirect other than this script's own 410.
 * Idempotent: a demo already in draft or an origin already 410 is reported as done, not repeated.
 * Rollback: republish the demo IDs listed in `applied.drafted`, delete the redirects in `applied.redirects` with
 * WPSEO_Redirect_Manager::delete_redirects, and restore comment/ping status from the snapshot.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/retire-ohio-demos.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( file_get_contents( $args[0] ), true );
if ( ! is_array( $in ) || empty( $in['real'] ) || empty( $in['demo'] ) ) { WP_CLI::error( 'Input must carry the real and demo allowlists.' ); }
$dry_run = ! array_key_exists( 'dryRun', $in ) || false !== $in['dryRun'];

if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) || ! class_exists( 'WPSEO_Redirect_Types' ) ) {
	WP_CLI::error( 'Yoast Premium redirect API not available.' );
}
if ( ! array_key_exists( 410, ( new WPSEO_Redirect_Types() )->get() ) ) { WP_CLI::error( 'Yoast does not offer the 410 type.' ); }

// 1. The allowlist must describe exactly the live posts, unchanged since the snapshot.
$live = get_posts( array( 'post_type' => 'ohio_portfolio', 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'suppress_filters' => true ) );
$listed = array_merge( wp_list_pluck( $in['real'], 'id' ), wp_list_pluck( $in['demo'], 'id' ) );
sort( $live );
sort( $listed );
if ( $live !== array_map( 'intval', $listed ) ) {
	WP_CLI::error( 'Allowlist does not match the live ohio_portfolio posts: missing ' . wp_json_encode( array_values( array_diff( $live, $listed ) ) ) . ', extra ' . wp_json_encode( array_values( array_diff( $listed, $live ) ) ) );
}
if ( count( array_intersect( wp_list_pluck( $in['real'], 'id' ), wp_list_pluck( $in['demo'], 'id' ) ) ) > 0 ) { WP_CLI::error( 'An ID is listed as both real and demo.' ); }

$drift = array();
foreach ( array( 'real' => $in['real'], 'demo' => $in['demo'] ) as $kind => $entries ) {
	foreach ( $entries as $entry ) {
		$post = get_post( (int) $entry['id'] );
		$already_drafted = 'demo' === $kind && 'draft' === $post->post_status;
		if ( $post->post_name !== $entry['slug'] ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'slug', 'live' => $post->post_name ); }
		if ( ! $already_drafted && $post->post_modified !== $entry['modified'] ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'modified', 'live' => $post->post_modified ); }
		if ( 'real' === $kind && 'publish' !== $post->post_status ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'real-not-published', 'live' => $post->post_status ); }
	}
}
if ( $drift ) { WP_CLI::error( 'State changed since the snapshot; nothing written: ' . wp_json_encode( $drift ) ); }

// 2. Plan.
$manager  = new WPSEO_Redirect_Manager();
$find     = function ( $origin ) use ( $manager ) {
	foreach ( array( $origin, '/' . $origin, $origin . '/', '/' . $origin . '/' ) as $variant ) {
		$found = $manager->get_redirect( $variant );
		if ( $found ) { return $found; }
	}
	return null;
};
$plan     = array();
$conflict = array();
foreach ( $in['demo'] as $entry ) {
	$post     = get_post( (int) $entry['id'] );
	$origin   = 'project/' . $post->post_name;
	$existing = $find( $origin );
	$has_410  = $existing && 410 === (int) $existing->get_type();
	if ( $existing && ! $has_410 ) {
		$conflict[] = array( 'id' => $post->ID, 'origin' => $origin, 'existingType' => (int) $existing->get_type(), 'existingTarget' => $existing->get_target() );
	}
	$plan[] = array(
		'id'          => $post->ID,
		'slug'        => $post->post_name,
		'origin'      => $origin,
		'statusNow'   => $post->post_status,
		'redirect410' => $has_410 ? 'exists' : 'create',
		'draft'       => 'draft' === $post->post_status ? 'done' : 'move',
	);
}
if ( $conflict ) { WP_CLI::error( 'Demo origins already redirect elsewhere; nothing written: ' . wp_json_encode( $conflict ) ); }

$close = array();
foreach ( $live as $id ) {
	$post = get_post( $id );
	if ( 'closed' !== $post->comment_status || 'closed' !== $post->ping_status ) {
		$close[] = array( 'id' => $id, 'comment' => $post->comment_status, 'ping' => $post->ping_status );
	}
}

$summary = array(
	'dryRun'          => $dry_run,
	'demo'            => count( $plan ),
	'redirectsCreate' => count( array_filter( $plan, function ( $p ) { return 'create' === $p['redirect410']; } ) ),
	'draftsMove'      => count( array_filter( $plan, function ( $p ) { return 'move' === $p['draft']; } ) ),
	'commentsClose'   => count( $close ),
	'realUntouchedStatus' => count( $in['real'] ),
);

if ( $dry_run ) {
	echo wp_json_encode( array( 'summary' => $summary, 'plan' => $plan, 'closeComments' => $close ), JSON_UNESCAPED_SLASHES ) . PHP_EOL;
	return;
}

// 3. Apply: redirect first (the URL answers 410 the moment the post leaves publish), then draft, then comments.
$applied = array( 'redirects' => array(), 'drafted' => array(), 'commentsClosed' => array() );
foreach ( $plan as $item ) {
	if ( 'create' === $item['redirect410'] ) {
		if ( ! $manager->create_redirect( new WPSEO_Redirect( $item['origin'], '', 410, 'plain' ) ) ) {
			WP_CLI::error( 'Redirect creation failed at ' . $item['origin'] . '; applied so far: ' . wp_json_encode( $applied ) );
		}
		$stored = $find( $item['origin'] );
		if ( ! $stored || 410 !== (int) $stored->get_type() ) {
			WP_CLI::error( 'Redirect readback failed at ' . $item['origin'] . '; applied so far: ' . wp_json_encode( $applied ) );
		}
		$applied['redirects'][] = $item['origin'];
	}
	if ( 'move' === $item['draft'] ) {
		$result = wp_update_post( array( 'ID' => $item['id'], 'post_status' => 'draft' ), true );
		if ( is_wp_error( $result ) || 'draft' !== get_post_status( $item['id'] ) ) {
			WP_CLI::error( 'Draft failed at ' . $item['id'] . '; applied so far: ' . wp_json_encode( $applied ) );
		}
		$applied['drafted'][] = $item['id'];
	}
}
foreach ( $close as $item ) {
	$result = wp_update_post( array( 'ID' => $item['id'], 'comment_status' => 'closed', 'ping_status' => 'closed' ), true );
	if ( is_wp_error( $result ) ) { WP_CLI::error( 'Closing comments failed at ' . $item['id'] . '; applied so far: ' . wp_json_encode( $applied ) ); }
	$applied['commentsClosed'][] = $item['id'];
}

// 4. Readback: real entries still published, demos in draft.
$check = array();
foreach ( $in['real'] as $entry ) {
	if ( 'publish' !== get_post_status( (int) $entry['id'] ) ) { $check[] = array( 'id' => $entry['id'], 'expected' => 'publish' ); }
}
foreach ( $in['demo'] as $entry ) {
	if ( 'draft' !== get_post_status( (int) $entry['id'] ) ) { $check[] = array( 'id' => $entry['id'], 'expected' => 'draft' ); }
}
if ( function_exists( 'wp_cache_flush' ) ) { wp_cache_flush(); }
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( 'efeoncepro.com', 0 ) : 'unavailable';
echo wp_json_encode( array( 'summary' => $summary, 'applied' => $applied, 'readbackFailures' => $check, 'purge' => $purge ), JSON_UNESCAPED_SLASHES ) . PHP_EOL;
if ( $check ) { WP_CLI::error( 'Readback failed; see readbackFailures and roll back from the snapshot.' ); }
