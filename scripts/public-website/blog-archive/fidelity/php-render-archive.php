<?php
/**
 * TASK-2055 — CLI entry for the PHP ↔ browser parity test: renders the archive template of the eo-blog-home plugin
 * with a data file, exactly as the WordPress page does on the server.
 *
 *   php php-render-archive.php <pluginDir> <data.json>
 */
define( 'EOBH_CLI_PARITY', true );

[ , $plugin, $data_file ] = $argv;

require $plugin . '/includes/class-eobh-template.php';

$ast = json_decode( file_get_contents( $plugin . '/assets/generated/archive.ast.json' ), true );

echo EOBH_Template::render( $ast, json_decode( file_get_contents( $data_file ), true ) );
