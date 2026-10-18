<?php
/**
 * Yoast metadata + social image for /servicios/agencia-de-medios/ (page 251981). Native Yoast fields only; Yoast stays the
 * owner of WebPage/WebSite/Organization (the page adds Service + FAQPage from the FAQ widget). Values come from the
 * Semrush research of 2026-10-16 (focus keyphrase «agencia de medios»). Input: the 1200×630 PNG composed from
 * medios-source/og/og.html. The image is imported as a new attachment and also set as the featured image.
 * Rollback: restore every field from the snapshot option printed below (delete the ones that did not exist), purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the PNG input.' ); }
$id = 251981;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-de-medios' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$social      = 'Agencia de medios conectada a tus ventas';
$social_desc = 'Un solo plan y una sola compra para search, social, video, TV conectada, audio, DOOH y retail media, medidos contra tus ventas y tu CRM.';
$meta = array(
	'_yoast_wpseo_title'                 => 'Agencia de medios: planificación y compra | Efeonce',
	'_yoast_wpseo_metadesc'              => 'Planificamos, compramos y medimos tus medios pagados: search, social, video, TV conectada, audio, DOOH y retail media, conectados a tus ventas y tu CRM.',
	'_yoast_wpseo_focuskw'               => 'agencia de medios',
	'_yoast_wpseo_keywordsynonyms'       => wp_json_encode( array( 'agencias de medios, agencia de medios digitales, central de medios, media agency' ), JSON_UNESCAPED_UNICODE ),
	'_yoast_wpseo_opengraph-title'       => $social . ' | Efeonce',
	'_yoast_wpseo_opengraph-description' => $social_desc,
	'_yoast_wpseo_twitter-title'         => $social,
	'_yoast_wpseo_twitter-description'   => 'Planificación, compra y medición de medios pagados en una sola operación, conectada a tu CRM.',
);
$image_keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id', '_thumbnail_id' );
$snapshot = array();
foreach ( array_merge( array_keys( $meta ), $image_keys ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_medios_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-agencia-de-medios-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-agencia-de-medios-og.png', 'tmp_name' => $temp ), $id, 'Agencia de Medios Efeonce: ¿Dónde invierto? Donde rinde.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Isabella, de Efeonce, sostiene una esfera de luz de la que salen líneas hacia muchas pantallas; titular: ¿Dónde invierto? Donde rinde.' );
$url = wp_get_attachment_url( $attachment );
$meta += array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment, '_thumbnail_id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_and_og_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
