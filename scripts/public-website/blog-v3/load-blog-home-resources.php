<?php
/**
 * TASK-2050 — Loads the resources the blog home slider and rail invite to (PDR-029 §4), approved by the operator on
 * 2026-10-24 («Vamos sí, es necesario»). LIVE WRITE: creates or updates two `eo_resource` posts and imports their
 * images from the canvas copies that eo-blog-home already ships (new attachments; never overwrites media).
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/load-blog-home-resources.php --wp-user 12
 *
 * Idempotent by `_eo_res_kind` + URL: a second run updates the same posts and reuses the imported images.
 * No newsletter resource: Glitch has no subscription page yet, so the slider's Glitch slot takes the latest edition or
 * Flash (as in the canvas); the subscription itself arrives with the inline form (TASK-2053/2054).
 * Rollback: `wp post delete <id> --force` for each printed resource id (and the printed attachment ids).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EO_Resource_Registry' ) || ! post_type_exists( 'eo_resource' ) ) { WP_CLI::error( 'eo_resource is not registered (efeonce-editorial-blocks 0.2.0).' ); }

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$img_dir = WP_PLUGIN_DIR . '/eo-blog-home/assets/img/';
$today   = gmdate( 'Y-m-d' );

/** Imports one canvas image once (tracked by `_eo_canvas_asset`), returns the attachment id. */
$import = static function ( string $file, string $name, string $alt ) use ( $img_dir ): int {
	$found = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_eo_canvas_asset', 'meta_value' => $file ) );
	if ( $found ) {
		return (int) $found[0];
	}
	if ( ! is_readable( $img_dir . $file ) ) { WP_CLI::error( 'Missing canvas image ' . $file ); }
	$tmp = wp_tempnam( $name );
	copy( $img_dir . $file, $tmp );
	$id = media_handle_sideload( array( 'name' => $name, 'tmp_name' => $tmp ), 0, $alt );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Import failed for ' . $file . ': ' . $id->get_error_message() ); }
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	update_post_meta( $id, '_eo_canvas_asset', $file );

	return (int) $id;
};

$resources = array(
	array(
		'title' => 'Web agéntica: tu sitio, listo para la IA',
		'meta'  => array(
			'kind'       => 'guia',
			'url'        => 'https://think.efeoncepro.com/web-agentica',
			'territory'  => 'aeo',
			'brand'      => '',
			'hero_light' => 'Web agéntica:',
			'hero_bold'  => 'tu sitio, listo para la IA',
			'dek'        => 'La guía para que tu web se pueda leer, usar y recomendar por un agente de IA.',
			'meta'       => 'Guía en PDF',
		),
		'image' => array( 'f1872cd1d2334e4e068af43417c8e7da.webp', 'blog-guia-web-agentica.webp', 'Un libro abierto del que sale la interfaz de un sitio web, tocada por una mano: la guía Web agéntica de Efeonce.' ),
		'cover' => array( '63ee6a642d507c74c0ab82f6bc49a131.webp', 'blog-guia-web-agentica-portada.webp', 'Portada de la guía Web agéntica: tu sitio, listo para la IA.' ),
	),
	array(
		'title' => 'Efeonce AEO Assessment',
		'meta'  => array(
			'kind'       => 'diagnostico',
			'url'        => 'https://efeoncepro.com/aeo-2/',
			'territory'  => 'aeo',
			'brand'      => 'Efeonce | AEO',
			'hero_light' => '¿Te ve',
			'hero_bold'  => 'la IA?',
			'dek'        => 'Mide cómo aparece tu marca en ChatGPT, Gemini y Perplexity con el Efeonce AEO Assessment.',
			'meta'       => 'Efeonce AEO Assessment',
		),
		'image' => array( 'e18bd95fe68de6304a5e2a68e812ad76.webp', 'blog-diagnostico-aeo.webp', 'Una lupa sobre una superficie azul iluminada: el diagnóstico Efeonce AEO Assessment.' ),
		'cover' => null,
	),
);

$out = array();
foreach ( $resources as $r ) {
	$existing = get_posts( array( 'post_type' => 'eo_resource', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'meta_query' => array( array( 'key' => '_eo_res_kind', 'value' => $r['meta']['kind'] ), array( 'key' => '_eo_res_url', 'value' => $r['meta']['url'] ) ) ) );
	$id       = $existing ? (int) $existing[0] : wp_insert_post( array( 'post_type' => 'eo_resource', 'post_status' => 'publish', 'post_title' => $r['title'], 'post_author' => 12 ), true );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Resource creation failed: ' . $id->get_error_message() ); }
	wp_update_post( array( 'ID' => $id, 'post_title' => $r['title'], 'post_status' => 'publish' ) );
	foreach ( $r['meta'] as $k => $v ) {
		update_post_meta( $id, '_eo_res_' . $k, $v );
	}
	$image = $import( ...$r['image'] );
	$cover = $r['cover'] ? $import( ...$r['cover'] ) : 0;
	update_post_meta( $id, '_eo_res_image', $image );
	update_post_meta( $id, '_eo_res_cover', $cover );
	update_post_meta( $id, '_eo_res_order', 0 );
	update_post_meta( $id, '_eo_res_placements', array( 'hero', 'rail' ) );
	update_post_meta( $id, '_eo_res_reviewed_at', $today );

	$rec = EO_Resource_Registry::record( $id, time() );
	if ( ! EO_Resource_Registry::showable( $rec ) ) { WP_CLI::error( 'Readback: resource ' . $id . ' is not showable.' ); }
	$out[] = array( 'id' => $id, 'kind' => $rec['kind'], 'url' => $rec['url'], 'image' => $image, 'cover' => $cover, 'placements' => $rec['placements'], 'reviewed_at' => $rec['reviewed_at'] );
}

echo wp_json_encode( array( 'status' => 'blog_home_resources_loaded', 'resources' => $out ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
