<?php
/**
 * Yoast metadata, indexing and social image for /agenda/ (251583, rediseño 2026-10-20). Operator decision 2026-10-20:
 * the page becomes indexable (noindex/nofollow removed) and stays out of the menus. Native Yoast fields only; Yoast keeps
 * WebPage/WebSite/Organization. Inputs: the 1200×630 PNG composed from agenda-source/og/og.html. The image is imported as a
 * new attachment (never overwrite in place) and also set as the featured image (Yoast primaryImageOfPage).
 * Rollback: restore every field from the snapshot option printed below (delete the ones that did not exist), purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <png>.' ); }
$id = 251583;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agenda' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$meta = array(
	'_yoast_wpseo_title'                 => 'Agenda tu diagnóstico de marketing | Efeonce',
	'_yoast_wpseo_metadesc'              => 'Agenda una reunión de 30 minutos por Microsoft Teams para mirar tu crecimiento con datos: qué funciona, qué no se mide y por dónde empezar.',
	'_yoast_wpseo_focuskw'               => 'diagnóstico de marketing',
	'_yoast_wpseo_opengraph-title'       => '¿Por dónde empiezo? Por aquí. | Efeonce',
	'_yoast_wpseo_opengraph-description' => 'Agenda 30 minutos con Efeonce por Microsoft Teams y mira tu crecimiento con datos: qué funciona, qué no se mide y por dónde empezar.',
	'_yoast_wpseo_twitter-title'         => '¿Por dónde empiezo? Por aquí.',
	'_yoast_wpseo_twitter-description'   => 'Una reunión de 30 minutos para ordenar tu crecimiento con datos. Elige día y hora en tu zona horaria.',
);
$remove     = array( '_yoast_wpseo_meta-robots-noindex', '_yoast_wpseo_meta-robots-nofollow' );
$image_keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id', '_thumbnail_id' );
$snapshot   = array();
foreach ( array_merge( array_keys( $meta ), $remove, $image_keys ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_agenda_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-agenda-diagnostico-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-agenda-diagnostico-og.png', 'tmp_name' => $temp ), $id, 'Agenda tu diagnóstico con Efeonce: ¿Por dónde empiezo? Por aquí.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Nexa, asistente de IA de Efeonce, en una órbita de retrato junto al titular «¿Por dónde empiezo? Por aquí.» y el texto: 30 minutos por Microsoft Teams para mirar tu crecimiento con datos.' );
$url  = wp_get_attachment_url( $attachment );
$meta += array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment, '_thumbnail_id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $remove as $key ) { delete_post_meta( $id, $key ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
foreach ( $remove as $key ) { if ( metadata_exists( 'post', $id, $key ) ) { WP_CLI::error( 'Robots meta still present: ' . $key . '. Snapshot: ' . $name ); } }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_indexable_og_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
