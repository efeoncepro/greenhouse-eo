<?php
/**
 * Installs the mu-plugin `efeonce-breadcrumb-single-item.php` (Search Console, 2026-11-04: the home BreadcrumbList had a
 * single ListItem without "item"). Input file = the governed copy in efeonce-public-site-runtime
 * (`wp-content/mu-plugins/efeonce-breadcrumb-single-item.php`); created only if absent or identical.
 * Usage: pnpm public-website:wpcli -- --eval-file ./scripts/public-website/install-breadcrumb-single-item-mu-plugin.php \
 *          --input-file <runtime>/wp-content/mu-plugins/efeonce-breadcrumb-single-item.php --wp-user 12
 * Rollback: delete wp-content/mu-plugins/efeonce-breadcrumb-single-item.php; wp cache flush; wp kinsta cache purge --all.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the mu-plugin input.' ); }
$target  = WPMU_PLUGIN_DIR . '/efeonce-breadcrumb-single-item.php';
$content = (string) file_get_contents( $args[0] );
if ( false === strpos( $content, 'wpseo_schema_breadcrumb' ) ) { WP_CLI::error( 'Unexpected mu-plugin input.' ); }
$hash    = hash( 'sha256', $content );
$existed = file_exists( $target );
if ( $existed && ! hash_equals( $hash, hash_file( 'sha256', $target ) ) ) { WP_CLI::error( 'A different mu-plugin already exists at the target.' ); }
if ( ! $existed && ( ! wp_mkdir_p( WPMU_PLUGIN_DIR ) || false === file_put_contents( $target, $content ) ) ) { WP_CLI::error( 'mu-plugin write failed.' ); }
if ( ! hash_equals( $hash, hash_file( 'sha256', $target ) ) ) { WP_CLI::error( 'Readback hash mismatch.' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => $existed ? 'already_installed' : 'installed', 'muPlugin' => $target, 'sha256' => $hash ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
