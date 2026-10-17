<?php
/**
 * Repairs the Yoast primary image of published landings after an API save or a CLI indexable rebuild left the
 * schema with a plugin image over http:// (CLI has no HTTPS context, so plugins_url() is http).
 * Input (file): { "pages": [ { "id": 244079, "slug": "servicios-contratar-hubspot", "thumbnailId": 251991 },
 *                            { "id": 20729, "slug": "contacto", "thumbnailId": null } ] }
 * thumbnailId sets the featured image (must be an attachment; use the page's OG image); null keeps the page without one
 * and only rebuilds the indexable over HTTPS. Stores the previous thumbnails in a snapshot option. Purges Kinsta.
 * Rollback: set_post_thumbnail / delete_post_thumbnail from the snapshot, then rebuild the indexable.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <pages.json>.' ); }
$input = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $input['pages'] ?? null ) || ! $input['pages'] ) { WP_CLI::error( 'No pages.' ); }

$snapshot = array();
foreach ( $input['pages'] as $page ) {
	$id = (int) ( $page['id'] ?? 0 );
	if ( get_post_type( $id ) !== 'page' || get_post_field( 'post_name', $id ) !== (string) ( $page['slug'] ?? '' ) || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Identity drift: ' . $id ); }
	$thumb = $page['thumbnailId'] ?? null;
	if ( null !== $thumb && get_post_type( (int) $thumb ) !== 'attachment' ) { WP_CLI::error( 'Not an attachment: ' . $thumb ); }
	$snapshot[ $id ] = (int) get_post_thumbnail_id( $id );
}
$name = '_gh_primary_image_repair_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

$_SERVER['HTTPS'] = 'on';
$report = array();
foreach ( $input['pages'] as $page ) {
	$id    = (int) $page['id'];
	$thumb = isset( $page['thumbnailId'] ) ? (int) $page['thumbnailId'] : 0;
	$data  = hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) );
	if ( $thumb ) { set_post_thumbnail( $id, $thumb ); }
	clean_post_cache( $id );
	YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' );
	if ( $thumb && (int) get_post_thumbnail_id( $id ) !== $thumb ) { WP_CLI::error( 'Thumbnail readback failed: ' . $id . '. Snapshot: ' . $name ); }
	if ( hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ) !== $data ) { WP_CLI::error( 'Body changed unexpectedly: ' . $id ); }
	$report[ $id ] = array( 'thumbnailBefore' => $snapshot[ $id ], 'thumbnailAfter' => (int) get_post_thumbnail_id( $id ) );
}
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'repaired', 'pages' => $report, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
