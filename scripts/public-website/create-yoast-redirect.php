<?php
/**
 * Governed 301 through Yoast SEO Premium (the site's only redirect owner; never write its option by hand).
 * Input JSON: {"origin": "/old-path/", "target": "/new-path/", "noindexPostId": 123, "dryRun": true}.
 * Refuses when Yoast's API is missing, the origin already redirects, the origin equals the target, or the target is not
 * a published page or post. `noindexPostId` (optional) marks the redirected page noindex so Yoast drops it from the
 * sitemap; its previous value is printed for rollback. Reads the redirect back; live HTTP evidence is still required.
 * Rollback: `$manager->delete_redirects( array( $redirect ) )` for this origin, and restore the printed noindex value.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/create-yoast-redirect.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( file_get_contents( $args[0] ), true );
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
$norm   = function ( $p ) { return '/' . trim( (string) $p, '/' ) . '/'; };
$origin = $norm( $in['origin'] ?? '' );
$target = $norm( $in['target'] ?? '' );
if ( '//' === $origin || '//' === $target || $origin === $target ) { WP_CLI::error( 'Origin and target must be different site paths.' ); }
$target_id = url_to_postid( home_url( $target ) );
if ( ! $target_id || 'publish' !== get_post_status( $target_id ) ) { WP_CLI::error( 'Target is not a published page or post: ' . $target ); }
$manager = new WPSEO_Redirect_Manager();
foreach ( array( $origin, rtrim( $origin, '/' ), ltrim( $origin, '/' ), trim( $origin, '/' ) ) as $variant ) {
	if ( $manager->get_redirect( $variant ) ) { WP_CLI::error( 'Origin already redirects: ' . $variant ); }
}
$noindex_id = absint( $in['noindexPostId'] ?? 0 );
$previous   = $noindex_id ? get_post_meta( $noindex_id, '_yoast_wpseo_meta-robots-noindex', true ) : null;
if ( ! empty( $in['dryRun'] ) ) {
	echo wp_json_encode( array( 'dryRun' => true, 'origin' => $origin, 'target' => $target, 'targetId' => $target_id, 'noindexPostId' => $noindex_id, 'noindexBefore' => $previous ) ) . PHP_EOL;
	return;
}
if ( ! $manager->create_redirect( new WPSEO_Redirect( trim( $origin, '/' ), $target, 301, 'plain' ) ) ) { WP_CLI::error( 'Redirect creation failed.' ); }
$stored = $manager->get_redirect( trim( $origin, '/' ) );
$ok     = $stored instanceof WPSEO_Redirect && trim( $stored->get_target(), '/' ) === trim( $target, '/' ) && 301 === (int) $stored->get_type();
if ( ! $ok ) { WP_CLI::error( 'Readback does not match; inspect Yoast redirects for ' . $origin ); }
if ( $noindex_id ) { update_post_meta( $noindex_id, '_yoast_wpseo_meta-robots-noindex', '1' ); }
if ( function_exists( 'wp_cache_flush' ) ) { wp_cache_flush(); }
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( 'efeoncepro.com', 0 ) : 'unavailable';
echo wp_json_encode( array( 'status' => 'redirect_created', 'origin' => $origin, 'target' => $target, 'type' => 301, 'noindexPostId' => $noindex_id, 'noindexBefore' => $previous, 'purge' => $purge ) ) . PHP_EOL;
