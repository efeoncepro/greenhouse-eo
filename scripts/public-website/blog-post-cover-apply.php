<?php
/**
 * Sets a reviewed cover as the featured image and the Yoast social image of one published blog post, nothing else.
 *
 * Guards: the image sha256 equals the meta file, the post is published, its slug matches, and its current featured
 * image and Open Graph image ids are the expected ones (so a cover changed by someone else is never overwritten).
 * Before writing, the five image metas are saved in a server option (_gh_cover_refresh_<id>_<UTC>) for rollback.
 * The X image is only set when the post already has its own; otherwise X keeps using the Open Graph image.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-post-cover-apply.php \
 *     --input-file <cover.jpg> --input-file <meta.json> --wp-user 12
 *
 * meta.json: { "mode": "dry-run" | "apply", "postId": 244765, "slug": "…", "expectedThumb": 252065,
 *   "expectedOg": 252065, "filename": "….jpg", "title": "…", "alt": "…", "caption": "", "sha256": "…" }
 * Without "mode" it is a dry run. Manual: docs/manual-de-uso/creative/producir-portada-de-articulo-del-blog.md
 * Rollback: put the ids and URLs of the printed snapshot back in the five metas, rebuild the Yoast indexable, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
[ $img, $metaf ] = [ $args[0] ?? '', $args[1] ?? '' ];
if ( ! is_readable( $img ) || ! is_readable( $metaf ) ) { WP_CLI::error( 'Expected the cover image followed by its meta file.' ); }
$m     = json_decode( (string) file_get_contents( $metaf ), true );
$apply = 'apply' === ( $m['mode'] ?? 'dry-run' );
$id    = (int) ( $m['postId'] ?? 0 );
foreach ( [ 'slug', 'expectedThumb', 'expectedOg', 'filename', 'title', 'alt', 'sha256' ] as $k ) {
	if ( empty( $m[ $k ] ) ) { WP_CLI::error( "Meta file is missing \"$k\"." ); }
}
if ( hash_file( 'sha256', $img ) !== $m['sha256'] ) { WP_CLI::error( 'Image integrity failed: the file is not the reviewed one.' ); }
[ $w, $h ] = getimagesize( $img ) ?: [ 0, 0 ];
$p     = get_post( $id );
$guard = [
	'published'    => $p && 'post' === $p->post_type && 'publish' === $p->post_status,
	'slug'         => $p && $p->post_name === $m['slug'],
	'thumb'        => (int) get_post_thumbnail_id( $id ) === (int) $m['expectedThumb'],
	'og'           => (int) get_post_meta( $id, '_yoast_wpseo_opengraph-image-id', true ) === (int) $m['expectedOg'],
	'ratio_1_9'    => $h > 0 && abs( $w / $h - 1200 / 630 ) < 0.01,
	'min_1200_630' => $w >= 1200 && $h >= 630,
];
$keys = [ '_thumbnail_id', '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id', '_yoast_wpseo_twitter-image', '_yoast_wpseo_twitter-image-id' ];
$snap = [];
foreach ( $keys as $k ) { $snap[ $k ] = metadata_exists( 'post', $id, $k ) ? get_post_meta( $id, $k, true ) : null; }
if ( ! $apply ) {
	echo wp_json_encode( [ 'mode' => 'dry-run', 'postId' => $id, 'size' => [ $w, $h ], 'guards' => $guard, 'ok' => ! in_array( false, $guard, true ), 'current' => $snap ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
	return;
}
if ( in_array( false, $guard, true ) ) { WP_CLI::error( 'Guard failed, nothing written: ' . wp_json_encode( $guard ) ); }
$opt = '_gh_cover_refresh_' . $id . '_' . gmdate( 'Ymd_His' );
if ( ! add_option( $opt, [ 'postId' => $id, 'meta' => $snap ], '', false ) ) { WP_CLI::error( 'Snapshot failed, nothing written.' ); }
$tmp = wp_tempnam( $m['filename'] );
copy( $img, $tmp );
$att = media_handle_sideload( [ 'name' => $m['filename'], 'tmp_name' => $tmp ], $id, $m['title'], [ 'post_author' => 1, 'post_excerpt' => $m['caption'] ?? '', 'post_content' => '' ] );
if ( is_wp_error( $att ) ) { @unlink( $tmp ); WP_CLI::error( 'Upload failed: ' . $att->get_error_message() . " Snapshot: $opt" ); }
update_post_meta( $att, '_wp_attachment_image_alt', $m['alt'] );
wp_update_post( [ 'ID' => $att, 'post_author' => 1 ] );
$url = wp_get_attachment_url( $att );
set_post_thumbnail( $id, $att );
update_post_meta( $id, '_yoast_wpseo_opengraph-image', $url );
update_post_meta( $id, '_yoast_wpseo_opengraph-image-id', (string) $att );
if ( null !== $snap['_yoast_wpseo_twitter-image'] ) {
	update_post_meta( $id, '_yoast_wpseo_twitter-image', $url );
	update_post_meta( $id, '_yoast_wpseo_twitter-image-id', (string) $att );
}
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
$md = wp_get_attachment_metadata( $att );
WP_CLI::runcommand( 'cache flush', [ 'return' => true ] );
WP_CLI::runcommand( 'kinsta cache purge --all', [ 'return' => true, 'exit_error' => false ] );
echo wp_json_encode( [
	'mode'           => 'apply',
	'status'         => (int) get_post_thumbnail_id( $id ) === $att ? 'saved' : 'readback_mismatch',
	'postId'         => $id,
	'attachment'     => $att,
	'url'            => $url,
	'size'           => [ $md['width'] ?? null, $md['height'] ?? null ],
	'alt'            => get_post_meta( $att, '_wp_attachment_image_alt', true ),
	'snapshotOption' => $opt,
	'previous'       => $snap,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ) . PHP_EOL;
