<?php
/**
 * Social image and title for /about-us-efeonce/ (249770, rediseño 2026-10-23). Input: the 1200×630 PNG composed from
 * nosotros-source/og/og.html. The image is imported as a NEW attachment (never overwrite in place: networks cache by URL)
 * and set as the OG and Twitter image; OG/Twitter titles drop the internal page name «About us (Boceto)». The featured
 * image (249769) is not touched. Rollback: restore every field from the snapshot option printed below (delete the ones
 * with exists=false), rebuild the Yoast indexable, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <png>.' ); }
$id = 249770;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'about-us-efeonce' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$title = 'Nosotros: lo construimos contigo | Efeonce';
$keys  = array( '_yoast_wpseo_opengraph-title', '_yoast_wpseo_twitter-title', '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id' );
$snapshot = array();
foreach ( $keys as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$thumbnail = (int) get_post_meta( $id, '_thumbnail_id', true );
$name      = '_gh_nosotros_og_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-nosotros-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-nosotros-lo-construimos-contigo-og.png', 'tmp_name' => $temp ), $id, 'Nosotros: lo construimos contigo — Efeonce' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Recepción de Efeonce en larga exposición, con el logo en el muro y personas que pasan como estelas, junto al titular «No te entregamos crecimiento. Lo construimos contigo.»' );
$url  = wp_get_attachment_url( $attachment );
$meta = array( '_yoast_wpseo_opengraph-title' => $title, '_yoast_wpseo_twitter-title' => $title, '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
if ( (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image changed. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'og_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name, 'before' => $snapshot ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
