<?php
/** Input: {snapshot,expectedDataSha}. Restore only the subscription widget, preserving unrelated edits. */
if(!defined('ABSPATH')||count($args??[])!==1)throw new Exception('Expected guarded rollback spec');
$s=json_decode(file_get_contents($args[0]),true);$backup=get_option($s['snapshot']??'');
if(!is_array($backup)||empty($backup['target']))throw new Exception('Missing durable snapshot');
$id=18456;$raw=get_post_meta($id,'_elementor_data',true);
if(!hash_equals($s['expectedDataSha']??'',hash('sha256',$raw)))throw new Exception('Inspect current document before rollback');
$tree=json_decode($raw,true);$n=0;$walk=function(&$nodes)use(&$walk,&$n,$backup){foreach($nodes as &$node){if(($node['id']??'')==='4246f0d'){if(($node['widgetType']??'')!=='html'||strpos($node['settings']['html']??'','6bc62588-a4a0-4214-9501-13b0c2948c81')===false)throw new Exception('Unexpected target');$node=$backup['target'];$n++;}if(!empty($node['elements']))$walk($node['elements']);}};$walk($tree);if($n!==1)throw new Exception('Expected one target');
$types=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();$types['ohio_contact_form']->get_controls();
$doc=\Elementor\Plugin::$instance->documents->get($id,false);$settings=$doc->get_settings();$thumb=get_post_thumbnail_id($id);if($thumb)$settings['post_featured_image']=['id'=>$thumb,'url'=>wp_get_attachment_url($thumb)];
if(false===$doc->save(['elements'=>$tree,'settings'=>$settings]))throw new Exception('Rollback save failed');
if($thumb)set_post_thumbnail($id,$thumb);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!=$tree)throw new Exception('Rollback tree differs');
\Elementor\Plugin::$instance->files_manager->clear_cache();WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'rolled_back','pageId'=>$id,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true))]);
