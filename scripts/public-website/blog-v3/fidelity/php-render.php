<?php
/**
 * TASK-2051 — CLI entry for the PHP ↔ browser parity test: renders one board of the eo-blog-home plugin with a data
 * file and a fixed clock, exactly as the WordPress page would on the server.
 *
 *   php php-render.php <pluginDir> <portada|movil> <data.json> <nowMs>
 */
define( 'EOBH_CLI_PARITY', true );

[ , $plugin, $board, $data_file, $now ] = $argv;

require $plugin . '/includes/class-eobh-template.php';
require $plugin . '/includes/class-eobh-view.php';

$ast  = json_decode( file_get_contents( $plugin . '/assets/build/' . $board . '.ast.json' ), true );
$data = json_decode( file_get_contents( $data_file ), true );
$vals = 'portada' === $board ? EOBH_View::desktop( $data, (int) $now ) : EOBH_View::mobile( $data, (int) $now );

echo EOBH_Template::render( $ast, $vals );
