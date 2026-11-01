<?php
/**
 * TASK-2046 Slice 3 — remove the Ohio demo leftovers from the 15 real `ohio_portfolio` entries (PDR-028 §6).
 * Input JSON (built from a fresh inventory, after Slice 2):
 *   {"dryRun": true, "real": [{"id","slug","modified"}…15], "demoIds": [44 ids], "demoSlugs": [44 slugs],
 *    "clearProjectLink": [ids whose project_link is the Envato affiliate]}
 * Three operations:
 *   1. Elementor document emptied through Elementor's own save, only when every text and URL it holds also appears
 *      in some demo document (the guard proves it is demo boilerplate, not Efeonce work). The project gallery lives in
 *      Ohio's `project_content` meta and is not touched.
 *   2. `project_link` emptied where it points to the Envato affiliate (Ohio hides «Open Project» when it is empty).
 *   3. `_wp_old_slug` rows whose value is a retired demo slug deleted, so WordPress stops redirecting those URLs to
 *      another entry before Yoast answers 410.
 * Refuses, writing nothing, when Elementor is missing, a real entry changed since the inventory or is not published, a
 * demo is not in draft, a document holds content not found in the demo corpus, or a listed project_link is not Envato.
 * Rollback: restore `_elementor_data`, `post_content` and `project_link` per ID from the inventory snapshot (or the
 * WordPress revision Elementor creates), and re-add the old-slug rows listed in `applied.oldSlugsDeleted`.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/clean-ohio-real-entries.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( file_get_contents( $args[0] ), true );
if ( ! is_array( $in ) || empty( $in['real'] ) || empty( $in['demoIds'] ) || empty( $in['demoSlugs'] ) ) { WP_CLI::error( 'Input must carry real, demoIds and demoSlugs.' ); }
$dry_run = ! array_key_exists( 'dryRun', $in ) || false !== $in['dryRun'];
$clear_link = array_map( 'intval', $in['clearProjectLink'] ?? array() );
if ( ! class_exists( '\Elementor\Plugin' ) ) { WP_CLI::error( 'Elementor not available.' ); }
global $wpdb;

$fingerprints = array( '1.envato.market', 'ohio.clbthemes.com', 'stage.clbthemes.com', 'colabrio.ams3.cdn.digitaloceanspaces.com', 'Got a project?' );
$rows_of = function ( $id, $key ) { return get_post_meta( $id, $key, false ); };
// Every non-empty string leaf of every element's settings: text, HTML, URLs and presentational values alike.
$atoms = function ( $json ) {
	$out  = array();
	$walk = function ( $node ) use ( &$walk, &$out ) {
		if ( is_array( $node ) ) { foreach ( $node as $value ) { $walk( $value ); } return; }
		if ( is_string( $node ) && '' !== trim( $node ) ) { $out[ trim( $node ) ] = true; }
	};
	$elements_walk = function ( $elements ) use ( &$elements_walk, $walk ) {
		foreach ( (array) $elements as $element ) {
			$walk( $element['settings'] ?? array() );
			$elements_walk( $element['elements'] ?? array() );
		}
	};
	$elements_walk( json_decode( (string) $json, true ) );
	return $out;
};

// 1. State must match the inventory.
$drift = array();
foreach ( $in['real'] as $entry ) {
	$post = get_post( (int) $entry['id'] );
	if ( ! $post || 'ohio_portfolio' !== $post->post_type ) { $drift[] = array( 'id' => $entry['id'], 'reason' => 'missing' ); continue; }
	if ( $post->post_name !== $entry['slug'] ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'slug', 'live' => $post->post_name ); }
	if ( $post->post_modified !== $entry['modified'] ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'modified', 'live' => $post->post_modified ); }
	if ( 'publish' !== $post->post_status ) { $drift[] = array( 'id' => $post->ID, 'reason' => 'real-not-published', 'live' => $post->post_status ); }
}
foreach ( $in['demoIds'] as $id ) {
	if ( 'draft' !== get_post_status( (int) $id ) ) { $drift[] = array( 'id' => $id, 'reason' => 'demo-not-draft', 'live' => get_post_status( (int) $id ) ); }
}
if ( $drift ) { WP_CLI::error( 'State changed since the inventory; nothing written: ' . wp_json_encode( $drift ) ); }

// 2. Demo corpus and per-entry plan.
// Ohio's project CTA template («Got a project? / Let's Collaborate / Get a Quote») reached the real entries in a
// variant none of the 44 demos keeps verbatim (straight apostrophe, the theme's placeholder icon). These exact three
// strings, seen in the 2026-10-29 dryRun, count as demo; anything else outside the corpus still aborts.
$corpus = array(
	'Got a project?'    => true,
	"Let's Collaborate" => true,
	'https://ohio.clbthemes.com/demoportfolio/wp-content/uploads/2020/08/placeholder.png' => true,
);
foreach ( $in['demoIds'] as $id ) {
	foreach ( $rows_of( (int) $id, '_elementor_data' ) as $row ) { $corpus += $atoms( $row ); }
}
$plan      = array();
$uncovered = array();
foreach ( $in['real'] as $entry ) {
	$id   = (int) $entry['id'];
	$rows = $rows_of( $id, '_elementor_data' );
	$own  = array();
	foreach ( $rows as $row ) { $own += $atoms( $row ); }
	$missing = array_keys( array_diff_key( $own, $corpus ) );
	if ( $missing ) { $uncovered[] = array( 'id' => $id, 'slug' => $entry['slug'], 'notInDemoCorpus' => array_map( function ( $s ) { return mb_substr( (string) $s, 0, 160 ); }, $missing ) ); }
	$links = $rows_of( $id, 'project_link' );
	$plan[] = array(
		'id'            => $id,
		'slug'          => $entry['slug'],
		'elementorRows' => count( $rows ),
		'atoms'         => count( $own ),
		'emptyDocument' => array() !== array_filter( $rows, function ( $r ) { return '[]' !== $r; } ) ? 'empty' : 'done',
		'clearLink'     => in_array( $id, $clear_link, true ) ? 'clear' : 'keep',
		'projectLink'   => array_values( array_unique( $links ) ),
	);
}
if ( $uncovered ) { WP_CLI::error( 'Some documents hold content not found in any demo; nothing written: ' . wp_json_encode( $uncovered, JSON_UNESCAPED_UNICODE ) ); }
foreach ( $clear_link as $id ) {
	$links = $rows_of( $id, 'project_link' );
	if ( ! $links || array_filter( $links, function ( $l ) { return false === strpos( (string) $l, '1.envato.market' ); } ) ) {
		WP_CLI::error( 'project_link of ' . $id . ' is not the Envato affiliate; nothing written: ' . wp_json_encode( $links ) );
	}
}
$placeholders = implode( ',', array_fill( 0, count( $in['demoSlugs'] ), '%s' ) );
$old_slugs    = $wpdb->get_results( $wpdb->prepare(
	"SELECT pm.meta_id, pm.post_id, pm.meta_value FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id
	 WHERE pm.meta_key = '_wp_old_slug' AND p.post_type = 'ohio_portfolio' AND pm.meta_value IN ($placeholders) ORDER BY pm.meta_id",
	$in['demoSlugs']
), ARRAY_A );

$summary = array(
	'dryRun'          => $dry_run,
	'real'            => count( $plan ),
	'documentsEmpty'  => count( array_filter( $plan, function ( $p ) { return 'empty' === $p['emptyDocument']; } ) ),
	'linksClear'      => count( $clear_link ),
	'oldSlugsDelete'  => count( $old_slugs ),
	'demoCorpusAtoms' => count( $corpus ),
);
if ( $dry_run ) {
	echo wp_json_encode( array( 'summary' => $summary, 'plan' => $plan, 'oldSlugs' => $old_slugs ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
	return;
}

// 3. Apply.
$applied = array( 'documentsEmptied' => array(), 'postContentCleared' => array(), 'linksCleared' => array(), 'oldSlugsDeleted' => array() );
foreach ( $plan as $item ) {
	if ( 'empty' !== $item['emptyDocument'] ) { continue; }
	$document = \Elementor\Plugin::$instance->documents->get( $item['id'], false );
	if ( ! $document || ! $document->save( array( 'elements' => array() ) ) ) {
		WP_CLI::error( 'Elementor save failed at ' . $item['id'] . '; applied so far: ' . wp_json_encode( $applied ) );
	}
	$rows = $rows_of( $item['id'], '_elementor_data' );
	if ( array_filter( $rows, function ( $r ) { return '[]' !== $r; } ) ) {
		WP_CLI::error( 'Elementor rows not all empty at ' . $item['id'] . '; applied so far: ' . wp_json_encode( $applied ) );
	}
	$applied['documentsEmptied'][] = $item['id'];
	// The rendered copy of the old document may survive in post_content; it was demo HTML only (guard above).
	$content = get_post_field( 'post_content', $item['id'] );
	foreach ( $fingerprints as $needle ) {
		if ( false !== strpos( $content, $needle ) ) {
			$result = wp_update_post( array( 'ID' => $item['id'], 'post_content' => '' ), true );
			if ( is_wp_error( $result ) ) { WP_CLI::error( 'post_content clear failed at ' . $item['id'] . '; applied so far: ' . wp_json_encode( $applied ) ); }
			$applied['postContentCleared'][] = $item['id'];
			break;
		}
	}
}
foreach ( $clear_link as $id ) {
	update_post_meta( $id, 'project_link', '' );
	if ( array_filter( $rows_of( $id, 'project_link' ), function ( $l ) { return '' !== $l; } ) ) {
		WP_CLI::error( 'project_link readback failed at ' . $id . '; applied so far: ' . wp_json_encode( $applied ) );
	}
	$applied['linksCleared'][] = $id;
}
foreach ( $old_slugs as $row ) {
	if ( ! delete_metadata_by_mid( 'post', (int) $row['meta_id'] ) ) {
		WP_CLI::error( 'Old slug delete failed at meta ' . $row['meta_id'] . '; applied so far: ' . wp_json_encode( $applied ) );
	}
	clean_post_cache( (int) $row['post_id'] );
	$applied['oldSlugsDeleted'][] = $row;
}

// 4. Readback: reals still published, no fingerprint left in Elementor data, post_content or project_link.
$check = array();
foreach ( $plan as $item ) {
	if ( 'publish' !== get_post_status( $item['id'] ) ) { $check[] = array( 'id' => $item['id'], 'reason' => 'not-published' ); }
	$haystack = get_post_field( 'post_content', $item['id'] ) . wp_json_encode( $rows_of( $item['id'], '_elementor_data' ) ) . wp_json_encode( $rows_of( $item['id'], 'project_link' ) );
	foreach ( $fingerprints as $needle ) {
		if ( false !== strpos( $haystack, $needle ) ) { $check[] = array( 'id' => $item['id'], 'reason' => 'fingerprint', 'needle' => $needle ); }
	}
}
$left = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_wp_old_slug' AND p.post_type = 'ohio_portfolio' AND pm.meta_value IN ($placeholders)", $in['demoSlugs'] ) );
if ( $left > 0 ) { $check[] = array( 'reason' => 'old-slugs-left', 'count' => $left ); }
if ( function_exists( 'wp_cache_flush' ) ) { wp_cache_flush(); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( 'efeoncepro.com', 0 ) : 'unavailable';
echo wp_json_encode( array( 'summary' => $summary, 'applied' => $applied, 'readbackFailures' => $check, 'purge' => $purge ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
if ( $check ) { WP_CLI::error( 'Readback failed; see readbackFailures and roll back from the snapshot.' ); }
