<?php
/** Guarded native-shell/featured-image finalization after the initial public readback. */
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$id=244079;$expected='4ccbd5b0b49219fef59de0e2c097e70a97df09bd57ef575b0e85569ab35a89cd';
if(!hash_equals($expected,hash('sha256',get_post_meta($id,'_elementor_data',true))))WP_CLI::error('Content drift');
$doc=\Elementor\Plugin::$instance->documents->get($id);$settings=$doc->get_settings();
$settings['post_featured_image']=['id'=>248703,'url'=>wp_get_attachment_url(248703)];
$doc->save(['elements'=>$doc->get_elements_data(),'settings'=>$settings]);
foreach(['page_add_wrapper'=>'0','page_full_width_margins_size'=>'0px','page_add_top_padding'=>'0'] as $key=>$value)update_post_meta($id,$key,$value);
if((int)get_post_thumbnail_id($id)!==248703)WP_CLI::error('Featured image not restored');
update_post_meta($id,'_gh_hubspot_module_schema','hubspotModule.v1');
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'published_verified_metadata','hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'featured'=>get_post_thumbnail_id($id),'url'=>get_permalink($id),'homeHash'=>hash('sha256',get_post_meta(get_option('page_on_front'),'_elementor_data',true))]);
