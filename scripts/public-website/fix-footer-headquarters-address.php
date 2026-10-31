<?php
/**
 * Guarded correction of the global footer address (2026-10-31): the active footer block still showed the legacy
 * Las Bellotas office. The casa matriz is Dr. Manuel Barros Borgoño 71, oficina 1105, Providencia (CONTACT_PAGE_REBUILD_BRIEF_V1).
 * Touches only block-17 inside ohio-sidebar-footer-1; snapshot first, readback after.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$index    = 17;
$sidebar  = 'ohio-sidebar-footer-1';
$expected = "<!-- wp:paragraph -->\n<p><strong>Oficina Chile</strong><br> Las Bellotas 199, OF 102<br> Providencia, Santiago de Chile</p>\n<!-- /wp:paragraph -->";
$new      = "<!-- wp:paragraph -->\n<p><strong>Casa matriz</strong><br> Dr. Manuel Barros Borgoño 71, oficina 1105<br> Providencia, Santiago de Chile</p>\n<!-- /wp:paragraph -->";

$blocks   = get_option( 'widget_block' );
$sidebars = get_option( 'sidebars_widgets' );
if ( ! is_array( $blocks ) || ! isset( $blocks[ $index ]['content'] ) ) { WP_CLI::error( 'Footer block absent.' ); }
if ( ! in_array( 'block-' . $index, (array) ( $sidebars[ $sidebar ] ?? array() ), true ) ) { WP_CLI::error( 'Block is not in the footer sidebar.' ); }
if ( trim( $blocks[ $index ]['content'] ) !== $expected ) { WP_CLI::error( 'Footer block content drift. Inspect before retry.' ); }

$snapshot = '_gh_footer_address_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'widget_block' => $blocks, 'sidebars_widgets' => $sidebars ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }

$blocks[ $index ]['content'] = $new;
update_option( 'widget_block', $blocks );

$after = get_option( 'widget_block' );
if ( ( $after[ $index ]['content'] ?? '' ) !== $new ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }
if ( get_option( 'sidebars_widgets' ) !== $sidebars ) { WP_CLI::error( 'Sidebars changed unexpectedly. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_address_updated', 'snapshot' => $snapshot, 'block' => 'block-' . $index ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
