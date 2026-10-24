<?php
/**
 * TASK-2050 — Slider art for a post (`_eo_hero_image`, PDR-029 §2) from the canvas images eo-blog-home ships.
 * Input file: JSON {"slug": "<post slug>", "asset": "<canvas file>", "alt": "<alt text>"}. Imports the image once
 * (tracked by `_eo_canvas_asset`), sets the meta and prints the previous value (rollback: set it back).
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/set-hero-art.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$in = isset( $args[0] ) ? json_decode( (string) file_get_contents( $args[0] ), true ) : null;
if ( ! is_array( $in ) || empty( $in['slug'] ) || empty( $in['asset'] ) || ! preg_match( '/^[0-9a-f]{32}\.(webp|png|svg)$/', $in['asset'] ) ) { WP_CLI::error( 'Expected {slug, asset, alt}.' ); }
$post = get_page_by_path( $in['slug'], OBJECT, 'post' );
if ( ! $post ) { WP_CLI::error( 'Post not found: ' . $in['slug'] ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$found = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_eo_canvas_asset', 'meta_value' => $in['asset'] ) );
if ( $found ) {
	$att = (int) $found[0];
} else {
	$src = WP_PLUGIN_DIR . '/eo-blog-home/assets/img/' . $in['asset'];
	if ( ! is_readable( $src ) ) { WP_CLI::error( 'Missing canvas image ' . $in['asset'] ); }
	$tmp = wp_tempnam( $in['asset'] );
	copy( $src, $tmp );
	$att = media_handle_sideload( array( 'name' => 'blog-slider-' . $in['slug'] . '.' . pathinfo( $in['asset'], PATHINFO_EXTENSION ), 'tmp_name' => $tmp ), $post->ID, (string) ( $in['alt'] ?? '' ) );
	if ( is_wp_error( $att ) ) { WP_CLI::error( $att->get_error_message() ); }
	update_post_meta( $att, '_wp_attachment_image_alt', (string) ( $in['alt'] ?? '' ) );
	update_post_meta( $att, '_eo_canvas_asset', $in['asset'] );
}
$before = get_post_meta( $post->ID, '_eo_hero_image', true );
update_post_meta( $post->ID, '_eo_hero_image', (int) $att );
echo wp_json_encode( array( 'post' => $post->ID, 'hero_image' => (int) $att, 'before' => $before ) ) . PHP_EOL;
