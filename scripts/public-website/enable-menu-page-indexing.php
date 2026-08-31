<?php
/** One-shot operator-authorized correction after auditing all 18 primary-menu pages. */
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$baseline=json_decode(file_get_contents($args[0]??''),true);$id=251300;$key='_yoast_wpseo_meta-robots-noindex';
if(!current_user_can('manage_options')||!current_user_can('edit_post',$id))WP_CLI::error('Insufficient permissions.');
if(!isset($baseline['pages'][$id])||get_nav_menu_locations()!==$baseline['locations']||get_option('blog_public')!=='1')WP_CLI::error('Site/menu scope drift.');
$actualMenus=[];
foreach($baseline['locations'] as $location=>$menuId){if(!$menuId)continue;foreach(wp_get_nav_menu_items($menuId)?:[] as $item){$postId=$item->type==='post_type'?(int)$item->object_id:url_to_postid($item->url);$actualMenus[$menuId][]=['location'=>$location,'itemId'=>$item->ID,'title'=>$item->title,'url'=>$item->url,'parent'=>$item->menu_item_parent,'type'=>$item->type,'object'=>$item->object,'postId'=>$postId];}}
if($actualMenus!==$baseline['menus'])WP_CLI::error('Menu membership or destinations changed.');
foreach($baseline['pages'] as $p){if(get_post_status($p['id'])!=='publish'||get_permalink($p['id'])!==$p['url']||!hash_equals($p['elementorHash'],hash('sha256',get_post_meta($p['id'],'_elementor_data',true))))WP_CLI::error('Page drift.');}
if(get_post_meta($id,$key,true)!=='1'||get_permalink($id)!=='https://efeoncepro.com/servicios/redes-sociales/'||get_post($id)->post_password!=='')WP_CLI::error('Target identity or noindex drift.');
if(!function_exists('YoastSEO')||!class_exists('Yoast\\WP\\SEO\\Builders\\Indexable_Builder'))WP_CLI::error('Yoast rebuild unavailable.');
$protected=function()use($baseline,$id,$key){$out=['posts'=>[],'seo'=>[],'menus'=>[],'options'=>[]];foreach($baseline['pages'] as $p){$pid=$p['id'];$out['posts'][$pid]=hash('sha256',wp_json_encode([get_post($pid,ARRAY_A),get_post_meta($pid,'_elementor_data',true)]));foreach(get_post_meta($pid) as $k=>$v)if(($k!==$key||$pid!==$id)&&(strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true)))$out['seo'][$pid][$k]=$v;}foreach($baseline['locations'] as $mid)$out['menus'][$mid]=hash('sha256',wp_json_encode(wp_get_nav_menu_items($mid)));foreach(['blog_public','page_on_front','page_for_posts','wpseo_titles','wpseo_social','theme_mods_ohio-child','ohio_options'] as $k)$out['options'][$k]=get_option($k);return $out;};
$before=$protected();$snapshot='_gh_menu_indexability_'.gmdate('Ymd_His');
if(!add_option($snapshot,['contract'=>'menu-page-indexability.v1','baseline'=>$baseline,'protected'=>$before,'changes'=>[$id=>[$key=>['exists'=>metadata_exists('post',$id,$key),'value'=>get_post_meta($id,$key,true)]]]],'',false))WP_CLI::error('Snapshot failed.');
update_post_meta($id,$key,'2');
YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');
if(class_exists('WPSEO_Sitemaps_Cache'))WPSEO_Sitemaps_Cache::clear();
clean_post_cache($id);WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
if(get_post_meta($id,$key,true)!=='2'||$protected()!==$before)WP_CLI::error('Readback/protected-state mismatch; inspect snapshot '.$snapshot);
echo wp_json_encode(['status'=>'index_enabled_verified','postId'=>$id,'auditedMenuPages'=>count($baseline['pages']),'changedMeta'=>[$key=>'2'],'snapshot'=>$snapshot,'contentAndMenuUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
