<?php
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$m=json_decode(file_get_contents($args[0]),true);if(($m['contract']??'')!=='hubspot-elementor-release.v1')WP_CLI::error('Invalid manifest');$errors=[];
foreach($m['files'] as $f){if(strpos($f['path'],'..')!==false)WP_CLI::error('Unsafe path');$p=WP_PLUGIN_DIR.'/eo-elementor-widgets/'.$f['path'];if(!is_file($p)||!hash_equals($f['sha256'],hash_file('sha256',$p)))$errors[]=$f['path'];}
echo wp_json_encode(['status'=>$errors?'FAIL':'PASS','files'=>count($m['files']),'mismatches'=>$errors,'pageHash'=>hash('sha256',get_post_meta(244079,'_elementor_data',true)),'featured'=>get_post_thumbnail_id(244079),'homeHash'=>hash('sha256',get_post_meta(251731,'_elementor_data',true)),'creativeHash'=>hash('sha256',get_post_meta(251279,'_elementor_data',true))]);if($errors)WP_CLI::error('Runtime mismatch');
