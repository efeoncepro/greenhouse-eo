<?php
/**
 * TASK-2055 — CLI: the archive markup exactly as eo-blog-home serves it, for one view's example content.
 *
 *   php php-archive-page.php <pluginDir> <imgBase> <view>
 */
define( 'EOBH_CLI_PARITY', true );

[ , $plugin, $img_base, $view ] = $argv;

require $plugin . '/includes/class-eobh-template.php';
require $plugin . '/includes/class-eobh-archive.php';

echo EOBH_Archive::markup( EOBH_Archive::fixture( $view, $img_base ) );
