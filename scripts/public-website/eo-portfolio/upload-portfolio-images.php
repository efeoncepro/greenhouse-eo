<?php
/**
 * TASK-2049 — uploads new portfolio images from local files into the Media Library, so a portfolio document can
 * reference them by `mediaId` (images must come from the library: real dimensions, srcset, alt). Videos never come
 * here: they go to the public AXIS bucket. Idempotent: an attachment remembers its source in `_eop_source`
 * (`<source>/<file>`) and is reused. Only JPEG, PNG and WebP.
 * Input: a manifest { "source": "onedrive-sky", "files": [ { "file", "alt", "title" } ] } and every image after it.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/upload-portfolio-images.php \
 *     --input-file manifest.json --input-file a.jpg --input-file b.jpg --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) < 2 ) { WP_CLI::error( 'Expected the manifest and at least one image.' ); }
$in = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $in ) || ! preg_match( '/^[a-z0-9-]{3,40}$/', (string) ( $in['source'] ?? '' ) ) || empty( $in['files'] ) ) { WP_CLI::error( 'Manifest must name a source and its files.' ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

// The uploaded paths, by file name: the wrapper copies each input to /tmp/greenhouse-wpcli-<hash>-<index>-<name>.
$paths = array();
foreach ( array_slice( $args, 1 ) as $path ) {
	$paths[ preg_replace( '/^greenhouse-wpcli-[a-f0-9]+-\d+-/', '', basename( $path ) ) ] = $path;
}
$out = array();
foreach ( $in['files'] as $row ) {
	$file = basename( (string) $row['file'] );
	if ( ! preg_match( '/^[a-z0-9._-]+\.(webp|png|jpe?g)$/i', $file ) || empty( $paths[ $file ] ) || ! is_readable( $paths[ $file ] ) ) { WP_CLI::error( 'Not an uploaded image: ' . $file ); }
	$source = $in['source'] . '/' . $file;
	$found  = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_eop_source', 'meta_value' => $source, 'fields' => 'ids', 'posts_per_page' => 1 ) );
	if ( $found ) {
		$id    = (int) $found[0];
		$state = 'reused';
	} else {
		$tmp = wp_tempnam( $file );
		copy( $paths[ $file ], $tmp );
		$id = media_handle_sideload( array( 'name' => $file, 'tmp_name' => $tmp ), 0, sanitize_text_field( (string) $row['title'] ) );
		if ( is_wp_error( $id ) ) { @unlink( $tmp ); WP_CLI::error( $file . ': ' . $id->get_error_message() . ' — uploaded so far: ' . wp_json_encode( $out ) ); }
		update_post_meta( $id, '_eop_source', $source );
		$state = 'created';
	}
	update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( (string) $row['alt'] ) );
	$meta         = wp_get_attachment_metadata( $id );
	$out[ $file ] = array( 'id' => $id, 'state' => $state, 'width' => (int) ( $meta['width'] ?? 0 ), 'height' => (int) ( $meta['height'] ?? 0 ), 'url' => wp_get_attachment_url( $id ) );
}
WP_CLI::line( wp_json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
