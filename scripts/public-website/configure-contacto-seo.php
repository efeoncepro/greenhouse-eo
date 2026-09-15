<?php
/** Guarded SEO/AEO configuration for the governed Contacto page. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$id = 20729;
if ( ! current_user_can( 'edit_post', $id ) || 'publish' !== get_post_status( $id ) || 'contacto' !== get_post_field( 'post_name', $id ) ) {
	WP_CLI::error( 'Contacto identity or capability check failed.' );
}

$asset = WP_PLUGIN_DIR . '/eo-elementor-widgets/assets/img/contact/contacto-og-1200x630.png';
if ( ! is_readable( $asset ) || array( 1200, 630 ) !== array_slice( (array) getimagesize( $asset ), 0, 2 ) ) {
	WP_CLI::error( 'Expected 1200x630 Contacto social image is unavailable.' );
}

$meta_keys = array(
	'_eo_contact_seo_enabled', '_yoast_wpseo_title', '_yoast_wpseo_metadesc',
	'_yoast_wpseo_opengraph-title', '_yoast_wpseo_opengraph-description',
	'_yoast_wpseo_twitter-title', '_yoast_wpseo_twitter-description',
	'_yoast_wpseo_canonical', '_yoast_wpseo_meta-robots-noindex',
	'_yoast_wpseo_meta-robots-nofollow', '_yoast_wpseo_bctitle',
	'_yoast_wpseo_focuskw', '_yoast_wpseo_opengraph-image',
	'_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image',
	'_yoast_wpseo_twitter-image-id', '_thumbnail_id',
);
$before = array();
foreach ( $meta_keys as $key ) { $before[ $key ] = get_post_meta( $id, $key, true ); }

$home = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $key ) {
	$shell[ $key ] = get_option( $key );
}

$snapshot = '_gh_contacto_before_seo_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'post' => get_post( $id, ARRAY_A ), 'meta' => $before ), '', false ) ) {
	WP_CLI::error( 'SEO snapshot failed.' );
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$attachment = 0;
$existing = get_posts( array(
	'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => 1,
	'meta_key' => '_eo_contact_og_contract', 'meta_value' => 'contacto-og.v1',
) );
if ( $existing ) {
	$attachment = (int) $existing[0]->ID;
} else {
	$temp = wp_tempnam( 'contacto-og-1200x630.png' );
	if ( ! copy( $asset, $temp ) ) { WP_CLI::error( 'Unable to stage social image. Snapshot: ' . $snapshot ); }
	$attachment = media_handle_sideload(
		array( 'name' => 'efeonce-contacto-og-1200x630.png', 'tmp_name' => $temp ),
		$id,
		'Contacto Efeonce: conversemos'
	);
	if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed. Snapshot: ' . $snapshot ); }
	update_post_meta( $attachment, '_eo_contact_og_contract', 'contacto-og.v1' );
}

update_post_meta( $attachment, '_wp_attachment_image_alt', 'Nexa acompaña la página de contacto de Efeonce.' );
$image_url = set_url_scheme( wp_get_attachment_url( $attachment ), 'https' );
$title = 'Contacto Efeonce | Escríbenos o agenda una reunión';
$description = 'Contacta a Efeonce para conversar sobre proyectos, soporte, alianzas o prensa. Escríbenos, llama a nuestra casa matriz en Santiago o agenda una reunión.';
$social_title = 'Conversemos | Contacto Efeonce';
$social_description = 'Cuéntanos qué necesitas. Dirigiremos tu mensaje al equipo adecuado o puedes agendar una reunión.';
$meta = array(
	'_eo_contact_seo_enabled' => '1',
	'_yoast_wpseo_title' => $title,
	'_yoast_wpseo_metadesc' => $description,
	'_yoast_wpseo_opengraph-title' => $social_title,
	'_yoast_wpseo_opengraph-description' => $social_description,
	'_yoast_wpseo_twitter-title' => $social_title,
	'_yoast_wpseo_twitter-description' => $social_description,
	'_yoast_wpseo_canonical' => 'https://efeoncepro.com/contacto/',
	'_yoast_wpseo_meta-robots-noindex' => '2',
	'_yoast_wpseo_meta-robots-nofollow' => '',
	'_yoast_wpseo_bctitle' => 'Contacto',
	'_yoast_wpseo_focuskw' => 'contacto Efeonce',
	'_yoast_wpseo_opengraph-image' => $image_url,
	'_yoast_wpseo_opengraph-image-id' => (string) $attachment,
	'_yoast_wpseo_twitter-image' => $image_url,
	'_yoast_wpseo_twitter-image-id' => (string) $attachment,
	'_thumbnail_id' => (string) $attachment,
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }

if ( function_exists( 'YoastSEO' ) && class_exists( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' ) ) {
	YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' );
}

foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== (string) $value ) { WP_CLI::error( 'Metadata readback failed: ' . $key ); }
}
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) {
	WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot );
}
foreach ( $shell as $key => $value ) {
	if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); }
}

clean_post_cache( $id );
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array(
	'status' => 'contacto_seo_configured',
	'postId' => $id,
	'snapshot' => $snapshot,
	'attachmentId' => $attachment,
	'image' => $image_url,
	'globalChromePreserved' => true,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
