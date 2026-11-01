<?php
/**
 * TASK-2049 — brings pieces the site already serves from a plugin's assets into the Media Library, so a portfolio
 * document can reference them by `mediaId` (images must come from the library: real dimensions, srcset, alt).
 * Idempotent: an attachment remembers its source in `_eop_source` and is reused. Only files under the allowed asset
 * directory; nothing is downloaded from outside the server.
 * Input: { "dir": "wp-content/plugins/eo-elementor-widgets/assets/img/creativa", "files": [ { "file", "alt", "title" } ] }
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/import-portfolio-media.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( (string) file_get_contents( $args[0] ), true );
$allowed_dirs = array( 'wp-content/plugins/eo-elementor-widgets/assets/img/creativa' );
if ( ! is_array( $in ) || ! in_array( $in['dir'] ?? '', $allowed_dirs, true ) || empty( $in['files'] ) ) { WP_CLI::error( 'Input must name an allowed asset dir and files.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$base = trailingslashit( ABSPATH . $in['dir'] );
$out  = array();
foreach ( $in['files'] as $row ) {
	$file = basename( (string) $row['file'] );
	$path = $base . $file;
	if ( ! preg_match( '/^[a-z0-9._-]+\.(webp|png|jpe?g)$/i', $file ) || ! is_readable( $path ) ) { WP_CLI::error( 'Not an allowed image on the server: ' . $file ); }
	$found = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_eop_source', 'meta_value' => $in['dir'] . '/' . $file, 'fields' => 'ids', 'posts_per_page' => 1 ) );
	if ( $found ) {
		$id    = (int) $found[0];
		$state = 'reused';
	} else {
		$tmp = wp_tempnam( $file );
		copy( $path, $tmp );
		$id = media_handle_sideload( array( 'name' => $file, 'tmp_name' => $tmp ), 0, sanitize_text_field( (string) $row['title'] ) );
		if ( is_wp_error( $id ) ) { @unlink( $tmp ); WP_CLI::error( $file . ': ' . $id->get_error_message() . ' — imported so far: ' . wp_json_encode( $out ) ); }
		update_post_meta( $id, '_eop_source', $in['dir'] . '/' . $file );
		$state = 'created';
	}
	update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( (string) $row['alt'] ) );
	$meta = wp_get_attachment_metadata( $id );
	$out[ $file ] = array( 'id' => $id, 'state' => $state, 'width' => (int) ( $meta['width'] ?? 0 ), 'height' => (int) ( $meta['height'] ?? 0 ), 'url' => wp_get_attachment_url( $id ) );
}
echo wp_json_encode( $out, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
