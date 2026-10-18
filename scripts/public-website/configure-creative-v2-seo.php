<?php
/**
 * Repositions /agencia-creativa-v2/ (page 251279) on «producción creativa a escala» so it complements /agencia-creativa/
 * instead of competing for «agencia creativa». Yoast fields + a new 1200×630 social image (source
 * creativa-source/og/og-v2.html). `_thumbnail_id` is not touched. Guarded by previous values; snapshot printed below.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the PNG input.' ); }
$id = 251279;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-creativa-v2' ) { WP_CLI::error( 'Page identity drift.' ); }
if ( (string) get_post_meta( $id, '_yoast_wpseo_title', true ) !== 'Agencia creativa para equipos de marketing | Efeonce' || (string) get_post_meta( $id, '_yoast_wpseo_opengraph-image-id', true ) !== '249740' ) {
	WP_CLI::error( 'Unexpected current SEO values. Inspect before retry.' );
}
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$text = array(
	'_yoast_wpseo_title'                 => 'Producción creativa a escala para tu equipo | Efeonce',
	'_yoast_wpseo_metadesc'              => 'Concepto, contenido y producción audiovisual operados como un sistema medible: más piezas y formatos con el mismo estándar, y todo a la vista.',
	'_yoast_wpseo_opengraph-title'       => 'Creatividad a escala que puedes ver operar',
	'_yoast_wpseo_opengraph-description' => 'Una idea, todos los formatos, la misma marca: producción creativa operada como un sistema medible para equipos de marketing.',
	'_yoast_wpseo_twitter-title'         => 'Creatividad a escala que puedes ver operar',
	'_yoast_wpseo_twitter-description'   => 'Una idea, todos los formatos, la misma marca: producción creativa operada como un sistema medible para equipos de marketing.',
	'_yoast_wpseo_focuskw'               => 'producción creativa',
);
$image_keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id' );
$snapshot = array();
foreach ( array_merge( array_keys( $text ), $image_keys ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$thumb = (string) get_post_meta( $id, '_thumbnail_id', true );
$name  = '_gh_creative_v2_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-produccion-creativa-a-escala-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-produccion-creativa-a-escala-og.png', 'tmp_name' => $temp ), $id, 'Producción creativa a escala Efeonce: una idea, todos los formatos.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'La pieza «Sabe a verano» de BRÍO, una marca ficticia, en formatos 9:16, 4:5, 1:1 y 1,91:1; titular: Creatividad a escala.' );
$url  = wp_get_attachment_url( $attachment );
$meta = $text + array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== $thumb ) { WP_CLI::error( 'Featured image drift. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'v2_seo_updated', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
