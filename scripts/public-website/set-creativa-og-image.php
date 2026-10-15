<?php
/**
 * Imports the Agencia Creativa social image (1200×630, composed from creativa-source/og/og.html) and sets it as the
 * Yoast Open Graph and Twitter image of page 249582. `_thumbnail_id` (249672) is not touched.
 * Rollback: restore the four fields from the snapshot option printed below, rebuild the indexable, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the PNG input.' ); }
$id = 249582;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-creativa' ) { WP_CLI::error( 'Page identity drift.' ); }
if ( (string) get_post_meta( $id, '_yoast_wpseo_opengraph-image-id', true ) !== '249740' ) { WP_CLI::error( 'Unexpected current OG image. Inspect before retry.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id' );
$snapshot = array();
foreach ( $keys as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_creativa_og_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-agencia-creativa-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-agencia-creativa-og.png', 'tmp_name' => $temp ), $id, 'Agencia Creativa Efeonce: ¿Mi equipo da para más? Mucho más.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Una directora creativa de Efeonce mueve una órbita de pantallas con piezas de campaña; titular: ¿Mi equipo da para más? Mucho más.' );
$url  = wp_get_attachment_url( $attachment );
$meta = array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== '249672' ) { WP_CLI::error( 'Featured image drift. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'og_image_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
