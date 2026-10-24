<?php
/**
 * TASK-2050 — Turns the visitor-facing content model on or off (option `eo_content_model_enabled`, PDR-029 §7).
 * Input file with `1` or `0`. Prints the previous value (rollback: run again with it) and purges caches.
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/set-content-model-flag.php --input-file <file with 1|0> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$want = isset( $args[0] ) ? trim( (string) file_get_contents( $args[0] ) ) : '';
if ( ! in_array( $want, array( '0', '1' ), true ) ) { WP_CLI::error( 'Input must be 1 or 0.' ); }
$before = get_option( 'eo_content_model_enabled', 'missing' );
update_option( 'eo_content_model_enabled', $want, true );
if ( (string) get_option( 'eo_content_model_enabled' ) !== $want ) { WP_CLI::error( 'Readback failed.' ); }
flush_rewrite_rules( false );
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'eo_content_model_flag_set', 'before' => $before, 'now' => $want ) ) . PHP_EOL;
