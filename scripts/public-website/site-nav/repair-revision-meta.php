<?php
/**
 * One-off repair (TASK-2042, 2026-10-23): numbers native revisions of the navigation document that a plugin bug left
 * without metadata (fixed in class-eosn-store.php the same day). Writes only revision metadata, never content.
 * Input JSON: [{"postId": 252027, "revision": 2, "message": "…"}]. Refuses unless the revision post belongs to the
 * navigation post and its content says that revision number. Hash and author are derived, not supplied.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$rows = json_decode( file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $rows ) ) { WP_CLI::error( 'Unreadable input.' ); }
$current = EOSN_Store::current( EOSN_Store::default_site() );
foreach ( $rows as $row ) {
	$post = get_post( (int) $row['postId'] );
	if ( ! $post || 'revision' !== $post->post_type || (int) $post->post_parent !== (int) $current['post_id'] ) { WP_CLI::error( 'Not a revision of the navigation post: ' . $row['postId'] ); }
	$doc = json_decode( $post->post_content );
	if ( ! $doc || (int) ( $doc->revision ?? 0 ) !== (int) $row['revision'] ) { WP_CLI::error( 'Content does not say revision ' . $row['revision'] . ': ' . $row['postId'] ); }
	if ( get_metadata( 'post', $post->ID, '_eosn_revision', true ) ) { WP_CLI::warning( 'Already numbered: ' . $post->ID ); continue; }
	update_metadata( 'post', $post->ID, '_eosn_revision', (int) $row['revision'] );
	update_metadata( 'post', $post->ID, '_eosn_hash', EOSN_Store::hash( $doc ) );
	update_metadata( 'post', $post->ID, '_eosn_message', sanitize_text_field( $row['message'] ) );
	update_metadata( 'post', $post->ID, '_eosn_author', 12 );
	WP_CLI::log( 'numbered ' . $post->ID . ' as revision ' . $row['revision'] );
}
echo wp_json_encode( array_map( fn( $r ) => $r['revision'] . ' ' . $r['message'], EOSN_Store::revisions( EOSN_Store::default_site() ) ), JSON_UNESCAPED_UNICODE ) . PHP_EOL;
