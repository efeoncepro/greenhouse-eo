<?php
/**
 * Site-wide SEO identity (operator, 2026-10-16): Yoast website name «Efeonce» (alternate «Efeonce Group»), tagline
 * without «&» (WordPress stores it escaped and Yoast escapes it again in the WebSite schema node), and og:locale es_LA
 * through the mu-plugin `efeonce-og-locale.php` (input file, created only if absent or identical).
 * Rollback: restore the snapshot option printed below and delete wp-content/mu-plugins/efeonce-og-locale.php; purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the mu-plugin input.' ); }
$titles = get_option( 'wpseo_titles' );
if ( ! is_array( $titles ) || ( $titles['website_name'] ?? '' ) !== 'Efeonce - Agencia de Inbound & Loop Marketing' || get_option( 'blogdescription' ) !== 'Agencia de Inbound &amp; Loop Marketing' ) { WP_CLI::error( 'Unexpected current values. Inspect before retry.' ); }
$target  = WPMU_PLUGIN_DIR . '/efeonce-og-locale.php';
$content = (string) file_get_contents( $args[0] );
if ( false === strpos( $content, "wpseo_og_locale" ) ) { WP_CLI::error( 'Unexpected mu-plugin input.' ); }
if ( file_exists( $target ) && ! hash_equals( hash( 'sha256', $content ), hash_file( 'sha256', $target ) ) ) { WP_CLI::error( 'A different mu-plugin already exists at the target.' ); }
$name = '_gh_site_identity_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, array( 'website_name' => $titles['website_name'], 'alternate_website_name' => $titles['alternate_website_name'] ?? null, 'blogdescription' => get_option( 'blogdescription' ), 'muPluginExisted' => file_exists( $target ) ), '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
$titles['website_name']           = 'Efeonce';
$titles['alternate_website_name'] = 'Efeonce Group';
update_option( 'wpseo_titles', $titles );
update_option( 'blogdescription', 'Agencia de Inbound y Loop Marketing' );
if ( ! wp_mkdir_p( WPMU_PLUGIN_DIR ) || false === file_put_contents( $target, $content ) ) { WP_CLI::error( 'mu-plugin write failed. Snapshot: ' . $name ); }
$check = get_option( 'wpseo_titles' );
if ( 'Efeonce' !== $check['website_name'] || 'Efeonce Group' !== $check['alternate_website_name'] || 'Agencia de Inbound y Loop Marketing' !== get_option( 'blogdescription' ) ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $name ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'site_identity_updated', 'snapshot' => $name, 'muPlugin' => $target ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
