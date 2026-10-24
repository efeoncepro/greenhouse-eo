<?php
/**
 * TASK-2051 — CLI: the [eo_blog_home] markup exactly as the plugin serves it, for the local preview.
 *
 *   php php-page.php <pluginDir> <imgBase> [nowMs]
 */
define( 'EOBH_CLI_PARITY', true );

$plugin   = $argv[1];
$img_base = $argv[2];
$now      = isset( $argv[3] ) ? (int) $argv[3] : (int) floor( microtime( true ) * 1000 );

require $plugin . '/includes/class-eobh-template.php';
require $plugin . '/includes/class-eobh-view.php';
require $plugin . '/includes/class-eobh-data.php';
require $plugin . '/includes/class-eobh-front.php';

echo EOBH_Front::markup( EOBH_Data::get( $img_base ), $now );
