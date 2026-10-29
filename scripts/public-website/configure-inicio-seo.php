<?php
/**
 * SEO and social metadata of the Home (251731, rediseño 2026-10-28 «La órbita × Pingback»). Input: the 1200×630 PNG
 * composed from inicio-source/og/og.html. The image is imported as a NEW attachment (never overwrite in place: networks
 * cache by URL) and becomes the OG image, the Twitter image and the featured image (Yoast primaryImageOfPage); the
 * previous one (248149, 2025 brand art, WebP 2000×960) stays in the library. Meta description and social titles and
 * descriptions follow the copy now on the page; the SEO title keeps its approved value.
 * Rollback: restore every field from the snapshot option printed below (delete the ones with exists=false, put
 * `post_featured_image` back in _elementor_page_settings), rebuild the Yoast indexable, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <png>.' ); }
$id = 251731;
if ( (int) get_option( 'page_on_front' ) !== $id || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Front page drift.' ); }
$size = getimagesize( $args[0] );
if ( ! $size || 1200 !== $size[0] || 630 !== $size[1] || 'image/png' !== $size['mime'] ) { WP_CLI::error( 'Expected a 1200×630 PNG.' ); }

$desc_meta   = 'Un solo equipo de marketing y tecnología: estrategia, creatividad, web, SEO y AEO, medios y CRM. Con agentes de IA y tu operación a la vista en Greenhouse.';
$social      = '¿Qué necesita tu marketing? | Efeonce';
$desc_social = 'Crecer, destacar, aparecer, rendir y vender: cinco especialidades de marketing y tecnología en un solo equipo, con tu operación a la vista en Greenhouse.';
$alt         = 'Una estratega de marketing (personaje del elenco de marca), dentro de una órbita, muestra una tableta con métricas. A los lados, «¿Qué necesita tu marketing? Crecer.» y «Destacar. Aparecer. Rendir. Vender.», con el logo de Efeonce abajo.';

$keys = array( '_yoast_wpseo_metadesc', '_yoast_wpseo_opengraph-title', '_yoast_wpseo_opengraph-description', '_yoast_wpseo_twitter-title', '_yoast_wpseo_twitter-description', '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id', '_thumbnail_id' );
$snapshot = array();
foreach ( $keys as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$page_settings = get_post_meta( $id, '_elementor_page_settings', true );
$snapshot['_elementor_page_settings.post_featured_image'] = is_array( $page_settings ) && isset( $page_settings['post_featured_image'] ) ? array( 'exists' => true, 'value' => $page_settings['post_featured_image'] ) : array( 'exists' => false );
$title_before = get_post_meta( $id, '_yoast_wpseo_title', true );
$name = '_gh_home_orbita_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'efeonce-home-og.png' );
copy( $args[0], $temp );
$attachment = media_handle_sideload( array( 'name' => 'efeonce-home-que-necesita-tu-marketing-og.png', 'tmp_name' => $temp ), $id, '¿Qué necesita tu marketing? — Efeonce' );
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed: ' . $attachment->get_error_message() . '. Snapshot: ' . $name ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', $alt );
$url = wp_get_attachment_url( $attachment );

$meta = array(
	'_yoast_wpseo_metadesc' => $desc_meta,
	'_yoast_wpseo_opengraph-title' => $social, '_yoast_wpseo_opengraph-description' => $desc_social,
	'_yoast_wpseo_twitter-title' => $social, '_yoast_wpseo_twitter-description' => $desc_social,
	'_yoast_wpseo_opengraph-image' => $url, '_yoast_wpseo_opengraph-image-id' => (string) $attachment,
	'_yoast_wpseo_twitter-image' => $url, '_yoast_wpseo_twitter-image-id' => (string) $attachment,
	'_thumbnail_id' => (string) $attachment,
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, wp_slash( $value ) ); }
// Elementor mirrors the featured image in its page settings and writes it back on the next editor save.
if ( is_array( $page_settings ) ) {
	$page_settings['post_featured_image'] = array( 'id' => $attachment, 'url' => $url );
	update_post_meta( $id, '_elementor_page_settings', wp_slash( $page_settings ) );
}
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); } }
if ( get_post_meta( $id, '_yoast_wpseo_title', true ) !== $title_before ) { WP_CLI::error( 'SEO title changed. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_set', 'attachmentId' => $attachment, 'url' => $url, 'snapshot' => $name, 'before' => $snapshot ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
