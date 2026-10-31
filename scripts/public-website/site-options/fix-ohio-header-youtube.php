<?php
/**
 * Point the Ohio header «YouTube» social icon to Efeonce's channel (it linked to the theme vendor, Colabrio).
 * Storage: ACF option repeater `global_header_menu_social_links`, row 3 (`options_global_header_menu_social_links_2_*`).
 * Refuses, writing nothing, unless that row is `youtube` and still points to facebook.com/colabrio (or already to the
 * target, then it reports done). Channel per the brand SSOT `src/config/efeonce-brand.ts`.
 * Rollback: set `options_global_header_menu_social_links_2_url` back to the `before` value in the output.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/site-options/fix-ohio-header-youtube.php --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$target  = 'https://www.youtube.com/@efeoncepro';
$network = get_option( 'options_global_header_menu_social_links_2_social_network' );
$before  = get_option( 'options_global_header_menu_social_links_2_url' );
if ( 'youtube' !== $network ) { WP_CLI::error( 'Row 3 is not the YouTube network: ' . wp_json_encode( $network ) ); }
if ( $target === $before ) { echo wp_json_encode( array( 'status' => 'done', 'url' => $before ), JSON_UNESCAPED_SLASHES ) . PHP_EOL; return; }
if ( 'https://www.facebook.com/colabrio' !== $before ) { WP_CLI::error( 'Unexpected current URL; nothing written: ' . wp_json_encode( $before ) ); }

$written = function_exists( 'update_sub_field' )
	? update_sub_field( array( 'global_header_menu_social_links', 3, 'url' ), $target, 'option' )
	: update_option( 'options_global_header_menu_social_links_2_url', $target );
wp_cache_delete( 'options_global_header_menu_social_links_2_url', 'options' );
$after = get_option( 'options_global_header_menu_social_links_2_url' );
if ( $target !== $after ) { WP_CLI::error( 'Readback failed: ' . wp_json_encode( array( 'written' => $written, 'after' => $after ) ) ); }
if ( function_exists( 'wp_cache_flush' ) ) { wp_cache_flush(); }
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( 'efeoncepro.com', 0 ) : 'unavailable';
echo wp_json_encode( array( 'status' => 'applied', 'before' => $before, 'after' => $after, 'via' => function_exists( 'update_sub_field' ) ? 'acf' : 'option', 'purge' => $purge ), JSON_UNESCAPED_SLASHES ) . PHP_EOL;
