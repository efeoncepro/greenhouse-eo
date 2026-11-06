<?php
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$r=WP_PLUGIN_DIR.'/efeonce-editorial-blocks/';$f='includes/editorial/class-eo-editorial-styles.php';
echo wp_json_encode(['home'=>home_url(),'path'=>$f,'sha256'=>hash_file('sha256',$r.$f),'content'=>file_get_contents($r.$f),'version'=>defined('EFEONCE_EDITORIAL_BLOCKS_VERSION')?EFEONCE_EDITORIAL_BLOCKS_VERSION:null],JSON_UNESCAPED_SLASHES).PHP_EOL;
