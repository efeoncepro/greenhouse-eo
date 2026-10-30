<?php
/**
 * TASK-2049 — purges the page cache after a plugin release that changes the portfolio's markup (a project save purges
 * on its own; a code deploy does not). Same purge as the plugin's own saves (EOP_Cache, Kinsta complete caches).
 * Writes nothing else.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/purge-portfolio-cache.php --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EOP_Cache' ) ) { WP_CLI::error( 'eo-portfolio is not active.' ); }
echo wp_json_encode( array( 'purge' => EOP_Cache::purge( '*', 0 ), 'version' => defined( 'EOP_VERSION' ) ? EOP_VERSION : null ) ) . PHP_EOL;
