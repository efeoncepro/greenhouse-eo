<?php
/** Operator-authorized Home cutover. Does not modify Elementor content or form integrations. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
if (!current_user_can('manage_options') || !current_user_can('edit_post', 251731)) { WP_CLI::error('Insufficient permissions.'); }
$old = 2791; $new = 251731; $menu = 247118;
$expected = [2791=>'600cd2fe663eb7380af64dd86775ae8fabdbeb698146e6df006fef86d3a165c3',251731=>'d7cfbe17b45a55cacc7360122735fc44da61aefdc5159d33af2e8e3cd079ea9f'];
if ((int)get_option('page_on_front')!==$old || get_option('show_on_front')!=='page') { WP_CLI::error('Unexpected current Home; inspect before retrying.'); }
foreach($expected as $id=>$hash){
 if(get_post_status($id)!=='publish' || !hash_equals($hash,hash('sha256',get_post_meta($id,'_elementor_data',true)))) { WP_CLI::error('Page drift: '.$id); }
}
if(get_post_meta($new,'_gh_task1358_preview_contract',true)!=='task-1358-home-claude-preview-v1' || (int)get_post_meta($menu,'_menu_item_object_id',true)!==$old){ WP_CLI::error('Ownership or navigation drift.'); }
$snapshot=['contract'=>'agency-home-cutover.v1','createdAt'=>gmdate('c'),'options'=>[],'pages'=>[],'menu'=>['id'=>$menu,'objectId'=>$old]];
foreach(['show_on_front','page_on_front','page_for_posts','blog_public'] as $key){ $snapshot['options'][$key]=get_option($key); }
foreach([$old,$new] as $id){
 $meta=get_post_meta($id);
 foreach(array_keys($meta) as $key){ if(strpos($key,'_gh_backup_')===0){unset($meta[$key]);} }
 $snapshot['pages'][$id]=['post'=>get_post($id,ARRAY_A),'meta'=>$meta];
}
$backup='_gh_home_cutover_'.gmdate('Ymd_His');
if(!add_option($backup,$snapshot,'',false)){ WP_CLI::error('Snapshot failed.'); }
// Preserve the established Home search/social presentation; copywriting is a separate task.
foreach(['_yoast_wpseo_title','_yoast_wpseo_metadesc','_yoast_wpseo_opengraph-image','_yoast_wpseo_opengraph-image-id','_thumbnail_id'] as $key){
 $value=get_post_meta($old,$key,true);
 if($value!==''){update_post_meta($new,$key,$value);}
}
update_post_meta($new,'_yoast_wpseo_canonical',home_url('/'));
update_post_meta($new,'_yoast_wpseo_meta-robots-noindex','2');
update_post_meta($new,'_yoast_wpseo_meta-robots-nofollow','0');
$result=wp_update_post(['ID'=>$new,'post_title'=>'Home'],true);
if(is_wp_error($result)){ WP_CLI::error('Page title update failed. Snapshot: '.$backup); }
// Keep the old design recoverable without introducing another indexable Home.
update_post_meta($old,'_yoast_wpseo_meta-robots-noindex','1');
update_post_meta($old,'_yoast_wpseo_canonical',home_url('/'));
update_post_meta($menu,'_menu_item_object_id',$new);
update_option('page_on_front',$new);
foreach([$old,$new,$menu] as $id){clean_post_cache($id);}
// Rebuild only affected Yoast indexables, never reset the site's whole SEO index.
if(function_exists('YoastSEO') && class_exists('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')){
 $builder=YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder');
 foreach([$old,$new] as $id){$builder->build_for_id_and_type($id,'post');}
}
WP_CLI::runcommand('cache flush',['return'=>true]);
WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
$failures=[];
foreach($expected as $id=>$hash){if(!hash_equals($hash,hash('sha256',get_post_meta($id,'_elementor_data',true)))){$failures[]='Elementor content changed: '.$id;}}
if((int)get_option('page_on_front')!==$new || (int)get_post_meta($menu,'_menu_item_object_id',true)!==$new){$failures[]='Home or menu readback mismatch';}
if(get_option('page_for_posts')!==$snapshot['options']['page_for_posts'] || get_option('blog_public')!==$snapshot['options']['blog_public']){$failures[]='Unrelated option changed';}
echo wp_json_encode(['status'=>$failures?'FAIL':'home_promoted','backupOption'=>$backup,'homeId'=>(int)get_option('page_on_front'),'url'=>get_permalink($new),'previousHomeUrl'=>get_permalink($old),'elementorUnchanged'=>!$failures,'formIntegration'=>'unchanged_demo','failures'=>$failures],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
if($failures){WP_CLI::error('Readback failed; inspect snapshot before recovery.');}
