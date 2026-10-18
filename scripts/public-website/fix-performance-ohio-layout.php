<?php
/**
 * A page created with wp_insert_post does not get Ohio's ACF layout fields and renders the blog sidebar. Copies every
 * page_* / _page_* meta from /agencia-creativa/ (249582, same dark-header full-bleed contract) to /servicios/performance-marketing/.
 * Input: the page id printed by publish-performance-elementor-page.php.
 * Rollback: restore the snapshot option printed below (delete keys that did not exist), purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the page id.' ); }
$id = (int) ( is_numeric( $args[0] ) ? $args[0] : trim( (string) file_get_contents( $args[0] ) ) ); $source = 249582;
if ( get_post_field( 'post_name', $id ) !== 'performance-marketing' || (int) get_post_field( 'post_parent', $id ) !== 251077 ) { WP_CLI::error( 'Target identity drift.' ); }
if ( get_post_field( 'post_name', $source ) !== 'agencia-creativa' ) { WP_CLI::error( 'Source identity drift.' ); }
$all = get_post_meta( $source );
$keys = array_filter( array_keys( $all ), fn( $k ) => 0 === strpos( $k, 'page_' ) || 0 === strpos( $k, '_page_' ) );
$snapshot = array();
foreach ( $keys as $k ) { $snapshot[ $k ] = metadata_exists( 'post', $id, $k ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $k, true ) ) : array( 'exists' => false ); }
$name = '_gh_performance_ohio_layout_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
foreach ( $keys as $k ) { update_post_meta( $id, $k, maybe_unserialize( $all[ $k ][0] ) ); }
foreach ( $keys as $k ) { if ( get_post_meta( $id, $k, true ) != maybe_unserialize( $all[ $k ][0] ) ) { WP_CLI::error( 'Readback failed: ' . $k . '. Snapshot: ' . $name ); } }
clean_post_cache( $id );
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'ohio_layout_copied', 'keys' => count( $keys ), 'sidebar' => get_post_meta( $id, 'page_sidebar_position', true ), 'snapshot' => $name ), JSON_PRETTY_PRINT ) . PHP_EOL;
