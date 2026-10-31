<?php
/**
 * TASK-2049 Slice 4 — moves the 15 real Ohio entries to the new portfolio: a 301 by Yoast from each /project/<slug>/
 * to its /portafolio/<new>/, every existing redirect that ends in one of those origins rechained to the new target
 * (no double hop), then the Ohio entry to draft (never deleted). `dryRun` by default.
 * Refuses before writing when: the new pages are not on (`eo_portfolio_enabled` = '1'), a target is not a published
 * project, an Ohio entry is not published at the path the map says, or an origin already redirects somewhere else.
 * Input: redirects.json from build-migration-documents.cjs plus `"dryRun": false` to apply.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/cutover-ohio-to-portfolio.php --input-file <json> --wp-user 12
 *
 * Rollback (printed on apply): delete the created redirects, put the rechained ones back to their old target, and
 * publish the drafted entries again.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( file_get_contents( $args[0] ), true );
if ( ! is_array( $in ) || ( $in['schema'] ?? '' ) !== 'eo-portfolio-redirects.v1' || empty( $in['redirects'] ) ) { WP_CLI::error( 'Input must be an eo-portfolio-redirects.v1 document.' ); }
$dry_run = ! array_key_exists( 'dryRun', $in ) || false !== $in['dryRun'];
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
if ( ! class_exists( 'EOP_Store' ) || ! class_exists( 'EOP_Render' ) ) { WP_CLI::error( 'eo-portfolio 0.4+ is not active.' ); }
$pages_on = '1' === (string) get_option( EOP_Render::OPTION, '0' );
if ( ! $pages_on && ! $dry_run ) { WP_CLI::error( 'The new portfolio pages are not on (eo_portfolio_enabled must be 1); nothing written.' ); }

$norm    = fn( $path ) => trim( (string) $path, '/' );
$manager = new WPSEO_Redirect_Manager();
$find    = function ( $origin ) use ( $manager ) {
	foreach ( array( $origin, '/' . $origin, $origin . '/', '/' . $origin . '/' ) as $variant ) {
		$found = $manager->get_redirect( $variant );
		if ( $found ) { return $found; }
	}
	return null;
};

// 1. Plan, with every guard checked before any write.
$plan  = array();
$fails = array();
$kept  = array();
$by_origin = array();
foreach ( $in['redirects'] as $row ) {
	$post   = get_post( (int) $row['id'] );
	$origin = $norm( $row['from'] );
	$target = $norm( $row['to'] );
	if ( ! $post || 'ohio_portfolio' !== $post->post_type ) { $fails[] = array( 'id' => $row['id'], 'reason' => 'not-an-ohio-entry' ); continue; }
	if ( $norm( wp_make_link_relative( get_permalink( $post ) ) ) !== $origin && 'draft' !== $post->post_status ) { $fails[] = array( 'id' => $post->ID, 'reason' => 'path-changed', 'live' => get_permalink( $post ) ); }
	$slug = basename( $target );
	if ( ! EOP_Store::served( $slug ) && ! ( $dry_run && EOP_Store::post_for( $slug ) ) ) { $fails[] = array( 'id' => $post->ID, 'reason' => 'target-not-published', 'target' => $target ); }
	$existing = $find( $origin );
	$state    = 'create';
	if ( $existing ) {
		$state = $norm( $existing->get_target() ) === $target && 301 === (int) $existing->get_type() ? 'exists' : 'conflict';
		if ( 'conflict' === $state ) { $fails[] = array( 'id' => $post->ID, 'reason' => 'origin-redirects-elsewhere', 'origin' => $origin, 'existingTarget' => $existing->get_target(), 'existingType' => (int) $existing->get_type() ); }
	}
	$plan[] = array( 'id' => $post->ID, 'origin' => $origin, 'target' => $target, 'redirect' => $state, 'draft' => 'draft' === $post->post_status ? 'done' : 'move' );
	$by_origin[ $origin ] = $target;
	// Old slugs of the entry (`_wp_old_slug`): WordPress only follows them to a published post, so once the entry is a
	// draft they need their own 301 to the new page.
	foreach ( array_unique( (array) get_post_meta( $post->ID, '_wp_old_slug' ) ) as $old ) {
		$old_origin = 'project/' . $old;
		if ( $old_origin === $origin || isset( $by_origin[ $old_origin ] ) ) { continue; }
		$existing = $find( $old_origin );
		if ( $existing && ( 301 !== (int) $existing->get_type() || $norm( $existing->get_target() ) !== $origin ) ) {
			// Old slugs shared by several entries (Ohio demo templates): the existing Yoast redirect already decided where
			// it goes, and the rechain below moves it to that project's new page.
			$kept[] = array( 'id' => $post->ID, 'origin' => $old_origin, 'existingTarget' => $existing->get_target() );
			continue;
		}
		if ( ! $existing ) { // An existing 301 to the entry's current path is rechained below instead.
			$plan[] = array( 'id' => $post->ID, 'origin' => $old_origin, 'target' => $target, 'redirect' => 'create', 'draft' => 'old-slug' );
			$by_origin[ $old_origin ] = $target;
		}
	}
}
if ( $fails ) { WP_CLI::error( 'Guards failed; nothing written: ' . wp_json_encode( $fails, JSON_UNESCAPED_SLASHES ) ); }

// Redirects that end in one of the origins (old slugs of the real entries) jump straight to the new page.
$rechain = array();
foreach ( $manager->get_all_redirects() as $redirect ) {
	$to = $norm( $redirect->get_target() );
	if ( isset( $by_origin[ $to ] ) && ! isset( $by_origin[ $norm( $redirect->get_origin() ) ] ) ) {
		$rechain[] = array( 'origin' => $redirect->get_origin(), 'type' => (int) $redirect->get_type(), 'format' => $redirect->get_format(), 'from' => $redirect->get_target(), 'to' => $by_origin[ $to ] );
	}
}

$summary = array(
	'dryRun'          => $dry_run,
	'pagesOn'         => $pages_on,
	'targetsPublished' => count( array_filter( $in['redirects'], fn( $r ) => (bool) EOP_Store::served( basename( trim( $r['to'], '/' ) ) ) ) ),
	'entries'         => count( $plan ),
	'redirectsCreate' => count( array_filter( $plan, fn( $p ) => 'create' === $p['redirect'] ) ),
	'redirectsRechain' => count( $rechain ),
	'draftsMove'      => count( array_filter( $plan, fn( $p ) => 'move' === $p['draft'] ) ),
);
if ( $dry_run ) {
	echo wp_json_encode( array( 'summary' => $summary, 'plan' => $plan, 'rechain' => $rechain, 'keptOldSlugs' => $kept ), JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
	return;
}

// 2. Apply: the 301 first (the URL keeps answering while the entry leaves publish), then the rechains, then drafts.
$applied = array( 'created' => array(), 'rechained' => array(), 'drafted' => array() );
$abort   = fn( $what ) => WP_CLI::error( $what . '; applied so far (rollback input): ' . wp_json_encode( $applied, JSON_UNESCAPED_SLASHES ) );
foreach ( $plan as $item ) {
	if ( 'create' === $item['redirect'] ) {
		if ( ! $manager->create_redirect( new WPSEO_Redirect( $item['origin'], $item['target'], 301, 'plain' ) ) ) { $abort( 'Redirect creation failed at ' . $item['origin'] ); }
		$stored = $find( $item['origin'] );
		if ( ! $stored || 301 !== (int) $stored->get_type() || $norm( $stored->get_target() ) !== $item['target'] ) { $abort( 'Redirect readback failed at ' . $item['origin'] ); }
		$applied['created'][] = $item['origin'];
	}
}
foreach ( $rechain as $item ) {
	$old = new WPSEO_Redirect( $item['origin'], $item['from'], $item['type'], $item['format'] );
	$new = new WPSEO_Redirect( $item['origin'], $item['to'], $item['type'], $item['format'] );
	if ( ! $manager->update_redirect( $old, $new ) ) { $abort( 'Rechain failed at ' . $item['origin'] ); }
	$applied['rechained'][] = $item;
}
foreach ( $plan as $item ) {
	if ( 'move' === $item['draft'] ) {
		$result = wp_update_post( array( 'ID' => $item['id'], 'post_status' => 'draft' ), true );
		if ( is_wp_error( $result ) || 'draft' !== get_post_status( $item['id'] ) ) { $abort( 'Draft failed at ' . $item['id'] ); }
		$applied['drafted'][] = $item['id'];
	}
}
echo wp_json_encode( array( 'summary' => $summary, 'applied' => $applied ), JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
