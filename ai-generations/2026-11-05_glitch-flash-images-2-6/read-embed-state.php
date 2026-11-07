<?php
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$p=get_post(252401);
if(!$p || $p->post_status!=='publish' || get_post_meta($p->ID,'_greenhouse_manifest_id',true)!=='greenhouse-cf-glitch-flash-images-2-6'){WP_CLI::error('Unexpected post');}
echo wp_json_encode(['id'=>$p->ID,'modified'=>$p->post_modified_gmt,'sha256'=>hash('sha256',$p->post_content),'content'=>$p->post_content,'title'=>$p->post_title,'author'=>$p->post_author,'date'=>$p->post_date_gmt,'categories'=>wp_get_post_categories($p->ID),'cover'=>get_post_thumbnail_id($p->ID)],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE).PHP_EOL;
