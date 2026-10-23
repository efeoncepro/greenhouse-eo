<?php
/**
 * SEO and social for /partnership/ (248003, rediseño 2026-10-23). Input: the 1200×630 PNG composed from
 * partners-source/og/og.html. Sets the meta description and the OG/Twitter descriptions to the new copy, replaces the OG
 * and Twitter title (it was the internal page name «Landing Aliados») and imports the image as a NEW attachment (never
 * overwrite in place: networks cache by URL). The Yoast SEO title is not touched. Snapshots every field into option
 * `_gh_partners_seo_before_<UTC>` ({ key: { exists, value } }) before writing. Rollback: restore each field from the
 * option (delete the ones with exists=false), rebuild the Yoast indexable and purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <png>.' ); }
$id = 248003;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'partnership' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$desc  = 'Te asesoramos, implementamos y creamos soluciones sobre HubSpot, Salesforce, Google Cloud, Microsoft, AWS, OpenAI y más. La licencia es solo el comienzo.';
$title = 'Partners: hagamos que tus plataformas trabajen juntas | Efeonce';
$keys  = array( '_yoast_wpseo_metadesc', '_yoast_wpseo_opengraph-description', '_yoast_wpseo_twitter-description', '_yoast_wpseo_opengraph-title', '_yoast_wpseo_twitter-title', '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id' );
$snapshot = array();
foreach ( $keys as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$thumbnail = (int) get_post_meta( $id, '_thumbnail_id', true );
$name      = '_gh_partners_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-partners-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-partners-hagamos-que-trabajen-juntas-og.png', 'tmp_name' => $temp ), $id, 'Partners: hagamos que trabajen juntas — Efeonce' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Vista cenital de una mesa con nueve dispositivos conectados por cables de luz a un solo centro, junto al titular «Ya tienes las mejores plataformas. Hagamos que trabajen juntas.»' );
$url  = wp_get_attachment_url( $attachment );
$meta = array(
	'_yoast_wpseo_metadesc' => $desc, '_yoast_wpseo_opengraph-description' => $desc, '_yoast_wpseo_twitter-description' => $desc,
	'_yoast_wpseo_opengraph-title' => $title, '_yoast_wpseo_twitter-title' => $title,
	'_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment,
	'_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment,
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
if ( (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image changed. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name, 'before' => $snapshot ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
