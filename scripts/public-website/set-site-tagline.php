<?php
/**
 * Site tagline aligned with the official brochure (operator, 2026-10-16): «Agencia de marketing 360°». Feeds the WebSite
 * schema description and any theme spot that prints the tagline. Guarded by the current value; snapshot printed below.
 * Rollback: update_option( 'blogdescription', <snapshot value> ), purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$old = get_option( 'blogdescription' );
if ( 'Agencia de Inbound y Loop Marketing' !== $old ) { WP_CLI::error( 'Unexpected current tagline. Inspect before retry.' ); }
$name = '_gh_site_tagline_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $old, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
update_option( 'blogdescription', 'Agencia de marketing 360°' );
if ( 'Agencia de marketing 360°' !== get_option( 'blogdescription' ) ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $name ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'tagline_updated', 'snapshot' => $name ), JSON_PRETTY_PRINT ) . PHP_EOL;
