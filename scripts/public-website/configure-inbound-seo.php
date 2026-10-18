<?php
/**
 * Yoast metadata + social image for /agencia-inbound-marketing/ (rediseño 2026-10-18). Native Yoast fields only; Yoast stays the
 * owner of WebPage/WebSite/Organization (the page adds Service + FAQPage from the FAQ widget). Focus keyphrase «agencia de inbound marketing» (the page's head term; «loop marketing» as synonym). Inputs: the page id and
 * the 1200×630 PNG composed from inbound-source/og/og.html. The image is imported as a new attachment and also set as the featured image.
 * Rollback: restore every field from the snapshot option printed below (delete the ones that did not exist), purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected: <page id> <png>.' ); }
$id = (int) ( is_numeric( $args[0] ) ? $args[0] : trim( (string) file_get_contents( $args[0] ) ) );
$args = array( $args[1] );
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-inbound-marketing' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$social      = '¿Qué viene después del inbound? El loop';
$social_desc = 'Estrategia, contenido, búsqueda, medios y datos funcionando como un solo ciclo: definir, adaptar, amplificar y optimizar. Diagnóstico sin costo.';
$meta = array(
	'_yoast_wpseo_title'                 => 'Agencia de inbound marketing y Loop Marketing | Efeonce',
	'_yoast_wpseo_metadesc'              => 'Agencia de inbound marketing que opera el ciclo completo: estrategia, contenido, SEO y AEO, medios y datos conectados. Diagnóstico sin costo.',
	'_yoast_wpseo_focuskw'               => 'agencia de inbound marketing',
	'_yoast_wpseo_keywordsynonyms'       => wp_json_encode( array( 'agencia inbound marketing, inbound marketing, loop marketing, agencia de marketing digital, marketing de contenidos' ), JSON_UNESCAPED_UNICODE ),
	'_yoast_wpseo_opengraph-title'       => $social . ' | Efeonce',
	'_yoast_wpseo_opengraph-description' => $social_desc,
	'_yoast_wpseo_twitter-title'         => $social,
	'_yoast_wpseo_twitter-description'   => 'Del embudo roto al ciclo que aprende: estrategia, contenido, búsqueda, medios y datos en un solo sistema.',
);
$image_keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id', '_thumbnail_id' );
$snapshot = array();
foreach ( array_merge( array_keys( $meta ), $image_keys ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_inbound_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-inbound-marketing-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-inbound-marketing-og.png', 'tmp_name' => $temp ), $id, 'Inbound marketing Efeonce: ¿Qué viene después del inbound? El loop.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Un estratega de Efeonce, de espaldas con la bomber de la marca, observa a un Spark leer una web proyectada; titular: ¿Qué viene después del inbound? El loop.' );
$url = wp_get_attachment_url( $attachment );
$meta += array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment, '_thumbnail_id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_and_og_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
