<?php
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$id=244079;if(!hash_equals('4ccbd5b0b49219fef59de0e2c097e70a97df09bd57ef575b0e85569ab35a89cd',hash('sha256',get_post_meta($id,'_elementor_data',true))))WP_CLI::error('Content drift');
$doc=\Elementor\Plugin::$instance->documents->get($id);$elements=$doc->get_elements_data();
array_walk_recursive($elements,function(&$value){if(is_string($value)&&strpos($value,'http://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/assets/img/hubspot/')===0)$value=set_url_scheme($value,'https');});
$settings=$doc->get_settings();$settings['post_featured_image']=['id'=>248703,'url'=>set_url_scheme(wp_get_attachment_url(248703),'https')];
$doc->save(['elements'=>$elements,'settings'=>$settings]);
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'featured'=>get_post_thumbnail_id($id)]);
