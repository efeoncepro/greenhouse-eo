<?php
/**
 * Guarded rotation of the Contacto Open Graph image to a NEW attachment (new URL, so CDN and social
 * caches cannot serve the previous image). Source: the plugin asset, which must match the expected hash.
 * Rollback: restore the meta stored in the printed snapshot option; the previous attachment is untouched.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$id = 20729;
$contract = 'contacto-og.v2';
$expected_sha256 = 'c0c382256f1030f0b9af38e08647f60fbb9c1adfc6936b431f3f111f99550ecf';
if ( ! current_user_can( 'edit_post', $id ) || 'publish' !== get_post_status( $id ) || 'contacto' !== get_post_field( 'post_name', $id ) ) {
	WP_CLI::error( 'Contacto identity or capability check failed.' );
}

$asset = WP_PLUGIN_DIR . '/eo-elementor-widgets/assets/img/contact/contacto-og-1200x630.png';
if ( ! is_readable( $asset ) || array( 1200, 630 ) !== array_slice( (array) getimagesize( $asset ), 0, 2 ) ) {
	WP_CLI::error( 'Expected 1200x630 Contacto social image is unavailable.' );
}
if ( ! hash_equals( $expected_sha256, hash_file( 'sha256', $asset ) ) ) {
	WP_CLI::error( 'Live Contacto OG asset is not the approved version.' );
}

$meta_keys = array(
	'_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id',
	'_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id',
);
$before = array();
foreach ( $meta_keys as $key ) { $before[ $key ] = get_post_meta( $id, $key, true ); }

$snapshot = '_gh_contacto_before_og_rotation_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'meta' => $before ), '', false ) ) {
	WP_CLI::error( 'OG snapshot failed.' );
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$existing = get_posts( array(
	'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => 1,
	'meta_key' => '_eo_contact_og_contract', 'meta_value' => $contract,
) );
if ( $existing ) {
	$attachment = (int) $existing[0]->ID;
} else {
	$temp = wp_tempnam( 'contacto-og-1200x630-v2.png' );
	if ( ! copy( $asset, $temp ) ) { WP_CLI::error( 'Unable to stage social image. Snapshot: ' . $snapshot ); }
	$attachment = media_handle_sideload(
		array( 'name' => 'efeonce-contacto-og-1200x630-v2.png', 'tmp_name' => $temp ),
		$id,
		'Contacto Efeonce: conversemos'
	);
	if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed. Snapshot: ' . $snapshot ); }
	update_post_meta( $attachment, '_eo_contact_og_contract', $contract );
}
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Nexa acompaña la página de contacto de Efeonce.' );

$file = get_attached_file( $attachment );
if ( ! $file || ! hash_equals( $expected_sha256, hash_file( 'sha256', $file ) ) ) {
	WP_CLI::error( 'Imported attachment does not match the approved image. Snapshot: ' . $snapshot );
}

$image_url = set_url_scheme( wp_get_attachment_url( $attachment ), 'https' );
$meta = array(
	'_yoast_wpseo_opengraph-image' => $image_url,
	'_yoast_wpseo_opengraph-image-id' => (string) $attachment,
	'_yoast_wpseo_twitter-image' => $image_url,
	'_yoast_wpseo_twitter-image-id' => (string) $attachment,
);
// _thumbnail_id stays untouched: the page keeps no featured image on purpose (Ohio would render it).
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }

if ( function_exists( 'YoastSEO' ) && class_exists( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' ) ) {
	YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' );
}
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== (string) $value ) { WP_CLI::error( 'Metadata readback failed: ' . $key . '. Snapshot: ' . $snapshot ); }
}

clean_post_cache( $id );
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array(
	'status' => 'contacto_og_rotated',
	'postId' => $id,
	'snapshot' => $snapshot,
	'previous' => $before,
	'attachmentId' => $attachment,
	'image' => $image_url,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
