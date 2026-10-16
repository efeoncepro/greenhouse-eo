<?php
/**
 * Yoast metadata + social image for /servicios-contratar-hubspot/ (page 244079) after the v2 redesign. Native Yoast fields
 * only; Yoast stays the owner of WebPage/WebSite/Organization (the page adds Service + FAQPage from the FAQ widget).
 * Values from the Semrush research of 2026-10-16 (CL/MX/CO): «implementación hubspot» has no measurable demand; demand
 * sits on «hubspot crm», «que es hubspot» and «partner hubspot». Input: the 1200×630 PNG from hubspot-v2-source/og/og.html,
 * imported as a new attachment and set as OG/Twitter image and featured image.
 * Rollback: restore every field from the snapshot option printed below (delete the ones that did not exist), purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the PNG input.' ); }
$id = 244079;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'servicios-contratar-hubspot' ) { WP_CLI::error( 'Page identity drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }
$social      = 'Partner HubSpot: CRM y agentes de IA que conocen tu negocio';
$social_desc = 'Implementamos y operamos HubSpot para generar demanda, cerrar negocios, superar las expectativas de tus clientes y acelerar el crecimiento.';
$meta = array(
	'_yoast_wpseo_title'                 => 'Partner HubSpot: implementación de CRM y agentes de IA | Efeonce',
	'_yoast_wpseo_metadesc'              => 'Somos Partner Gold de HubSpot. Implementamos y operamos tu CRM y sus agentes de IA para generar demanda, cerrar negocios y cuidar a tus clientes.',
	'_yoast_wpseo_focuskw'               => 'partner hubspot',
	'_yoast_wpseo_keywordsynonyms'       => wp_json_encode( array( 'hubspot crm, implementación de hubspot, agencia hubspot, consultor hubspot, qué es hubspot' ), JSON_UNESCAPED_UNICODE ),
	'_yoast_wpseo_opengraph-title'       => $social . ' | Efeonce',
	'_yoast_wpseo_opengraph-description' => $social_desc,
	'_yoast_wpseo_twitter-title'         => $social,
	'_yoast_wpseo_twitter-description'   => 'Implementación y operación de HubSpot, la Agentic Customer Platform, con un Partner Gold.',
);
$image_keys = array( '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id', '_thumbnail_id' );
$snapshot = array();
foreach ( array_merge( array_keys( $meta ), $image_keys ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_hubspot_v2_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-partner-hubspot-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-partner-hubspot-og.png', 'tmp_name' => $temp ), $id, 'Partner HubSpot Efeonce: ¿Mi IA conoce mi negocio? Ahora sí.' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Una líder de RevOps de Efeonce dirige un haz de luz que conecta a los agentes de IA; titular: ¿Mi IA conoce mi negocio? Ahora sí.' );
$url = wp_get_attachment_url( $attachment );
$meta += array( '_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment, '_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment, '_thumbnail_id' => (string) $attachment );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_and_og_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
