<?php
/**
 * Backfill of the «Formato» taxonomy (`eo_format`) over the published posts (TASK-2050 Slice 2, PDR-029 §1.1 and §7).
 *
 * Runs through remote WP-CLI with one JSON options file (and, for `restore`, the ledger of an apply):
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-v3/backfill-format.php \
 *     --input-file scripts/public-website/blog-v3/backfill/dry-run.json > tmp/blog-v3-format-dry-run.json
 *
 * Modes (`mode` in the options file):
 * - `dry-run`  (default) read-only: every published post with its categories, current formats and the proposed one,
 *              plus `proposal_sha256` (hash of the id → format list). Writes nothing.
 * - `apply`    writes ONE batch (`batch`, default 10) of the posts whose format must change, only if
 *              `expect_sha256` equals the current proposal (what the operator reviewed is what gets written). Prints the
 *              ledger of the batch (before/after per post); save it under scripts/public-website/blog-v3/ledger/.
 *              Re-run for the next batch until `remaining` is 0. Idempotent: a post that already has exactly its
 *              format is never touched, and the terms are created only when their slug is missing.
 * - `restore`  second input = a ledger: puts back each post's `before` formats if it still has the `after` ones.
 *
 * Proposal per post: `overrides` (slug → format) of the options file, else its single current format, else the rule
 * of EO_Format_Taxonomy::infer() (the plugin must be installed: its classes are the single source of the rule).
 *
 * @package greenhouse-eo
 */

if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) {
	exit;
}
if ( ! class_exists( 'EO_Format_Taxonomy' ) || ! taxonomy_exists( 'eo_format' ) ) {
	WP_CLI::error( 'eo_format is not registered: deploy efeonce-editorial-blocks 0.2.0 (TASK-2050) first.' );
}
$opts = isset( $args[0] ) && is_readable( $args[0] ) ? json_decode( (string) file_get_contents( $args[0] ), true ) : array();
if ( ! is_array( $opts ) ) {
	WP_CLI::error( 'Options file is not valid JSON.' );
}
$mode      = (string) ( $opts['mode'] ?? 'dry-run' );
$batch     = max( 1, min( 50, (int) ( $opts['batch'] ?? 10 ) ) );
$overrides = is_array( $opts['overrides'] ?? null ) ? $opts['overrides'] : array();
$valid     = array_keys( EO_Format_Taxonomy::TERMS );
foreach ( $overrides as $slug => $format ) {
	if ( ! in_array( $format, $valid, true ) ) {
		WP_CLI::error( 'Override with an unknown format: ' . $slug . ' → ' . $format );
	}
}
$out = static function ( array $data ) {
	echo wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
};
$formats_of = static function ( int $id ): array {
	$t = wp_get_object_terms( $id, 'eo_format', array( 'fields' => 'slugs' ) );

	return is_wp_error( $t ) ? array() : array_values( $t );
};

if ( 'restore' === $mode ) {
	$ledger = isset( $args[1] ) && is_readable( $args[1] ) ? json_decode( (string) file_get_contents( $args[1] ), true ) : null;
	if ( ! is_array( $ledger ) || 'eo-format-backfill-ledger.v1' !== ( $ledger['contract'] ?? '' ) ) {
		WP_CLI::error( 'Pass the ledger of an apply as the second input.' );
	}
	$done = array();
	foreach ( (array) $ledger['entries'] as $e ) {
		$id  = (int) $e['id'];
		$now = $formats_of( $id );
		sort( $now );
		$after = (array) $e['after'];
		sort( $after );
		if ( $now !== $after ) {
			$done[] = array( 'id' => $id, 'skipped' => 'changed since the apply', 'now' => $now );
			continue;
		}
		wp_set_object_terms( $id, array_values( (array) $e['before'] ), 'eo_format', false );
		$done[] = array( 'id' => $id, 'slug' => $e['slug'], 'before' => $e['after'], 'after' => $formats_of( $id ) );
	}
	$out( array( 'contract' => 'eo-format-backfill-ledger.v1', 'mode' => 'restore', 'at' => gmdate( 'c' ), 'of' => $ledger['at'] ?? null, 'entries' => $done ) );

	return;
}

// Proposal over every published post, oldest first (stable order for the batches).
$posts = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => array( 'date' => 'ASC', 'ID' => 'ASC' ), 'suppress_filters' => true ) );
$rows  = array();
foreach ( $posts as $p ) {
	$cats    = wp_get_post_categories( $p->ID, array( 'fields' => 'slugs' ) );
	$cats    = is_array( $cats ) ? $cats : array();
	$current = $formats_of( (int) $p->ID );
	$title   = html_entity_decode( get_the_title( $p ), ENT_QUOTES, 'UTF-8' );
	if ( isset( $overrides[ $p->post_name ] ) ) {
		$proposed = (string) $overrides[ $p->post_name ];
		$source   = 'override';
	} elseif ( 1 === count( $current ) && in_array( $current[0], $valid, true ) ) {
		$proposed = $current[0];
		$source   = 'current';
	} else {
		$proposed = EO_Format_Taxonomy::infer( $title, (string) $p->post_name, $cats );
		$source   = 'rule';
	}
	$rows[] = array(
		'id'       => (int) $p->ID,
		'slug'     => (string) $p->post_name,
		'title'    => $title,
		'date'     => (string) $p->post_date,
		'cats'     => $cats,
		'current'  => $current,
		'proposed' => $proposed,
		'source'   => $source,
		'action'   => $current === array( $proposed ) ? 'keep' : 'set',
	);
}
$proposal_sha = hash( 'sha256', wp_json_encode( array_map( static fn( $r ) => array( $r['id'], $r['proposed'] ), $rows ) ) );
$pending      = array_values( array_filter( $rows, static fn( $r ) => 'set' === $r['action'] ) );
$summary      = array_count_values( array_column( $rows, 'proposed' ) );

if ( 'dry-run' === $mode ) {
	$out(
		array(
			'contract'        => 'eo-format-backfill-proposal.v1',
			'mode'            => 'dry-run',
			'at'              => gmdate( 'c' ),
			'posts'           => count( $rows ),
			'to_set'          => count( $pending ),
			'summary'         => $summary,
			'proposal_sha256' => $proposal_sha,
			'rows'            => $rows,
		)
	);

	return;
}

if ( 'apply' !== $mode ) {
	WP_CLI::error( 'Unknown mode: ' . $mode );
}
if ( ! hash_equals( (string) ( $opts['expect_sha256'] ?? '' ), $proposal_sha ) ) {
	WP_CLI::error( 'The proposal changed since the reviewed dry-run (expect_sha256 ≠ ' . $proposal_sha . '). Run the dry-run again and review it.' );
}
// Terms by slug, created only when missing (idempotent).
foreach ( EO_Format_Taxonomy::TERMS as $slug => $def ) {
	if ( ! get_term_by( 'slug', $slug, 'eo_format' ) ) {
		$made = wp_insert_term( $def['name'], 'eo_format', array( 'slug' => $slug ) );
		if ( is_wp_error( $made ) ) {
			WP_CLI::error( 'Cannot create the term ' . $slug . ': ' . $made->get_error_message() );
		}
		update_term_meta( (int) $made['term_id'], 'eo_format_icon', $def['icon'] );
	}
}
$entries = array();
foreach ( array_slice( $pending, 0, $batch ) as $r ) {
	$set = wp_set_object_terms( $r['id'], array( $r['proposed'] ), 'eo_format', false );
	if ( is_wp_error( $set ) ) {
		WP_CLI::warning( 'Post ' . $r['id'] . ': ' . $set->get_error_message() );
		continue;
	}
	$entries[] = array( 'id' => $r['id'], 'slug' => $r['slug'], 'title' => $r['title'], 'before' => $r['current'], 'after' => $formats_of( $r['id'] ), 'source' => $r['source'] );
}
$out(
	array(
		'contract'        => 'eo-format-backfill-ledger.v1',
		'mode'            => 'apply',
		'at'              => gmdate( 'c' ),
		'proposal_sha256' => $proposal_sha,
		'batch'           => $batch,
		'applied'         => count( $entries ),
		'remaining'       => count( $pending ) - count( $entries ),
		'entries'         => $entries,
	)
);
