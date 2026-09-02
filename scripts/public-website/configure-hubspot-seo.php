<?php
/** Native page-only SEO update. Snapshot + drift guards; no Elementor rewrite. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$id = 244079;
if (!current_user_can('manage_options') || !current_user_can('edit_post',$id)) { WP_CLI::error('Insufficient permission.'); }
$expected='b44adec9c6120b94bab004fa4d5d162ef7e5c8e53835288b47551cd880ada151';
if (get_post_status($id)!=='publish' || get_post_field('post_name',$id)!=='servicios-contratar-hubspot'
    || get_the_title($id)!=='Empodera tu crecimiento con HubSpot + Efeonce'
    || hash('sha256',get_post_meta($id,'_elementor_data',true))!==$expected) { WP_CLI::error('Page drift; inspect before writing.'); }
$title=get_post_meta($id,'_yoast_wpseo_title',true);
$description=get_post_meta($id,'_yoast_wpseo_metadesc',true);
if ($title!=='Implementación y operación de HubSpot | Efeonce' || $description!=='Habilitamos HubSpot Hub por Hub y después lo operamos contigo. Implementación, migración y operación con Efeonce, Solutions Partner Gold.') { WP_CLI::error('Metadata drift.'); }
$target=[
 '_yoast_wpseo_opengraph-title'=>$title,'_yoast_wpseo_opengraph-description'=>$description,
 '_yoast_wpseo_twitter-title'=>$title,'_yoast_wpseo_twitter-description'=>$description,
 '_yoast_wpseo_bctitle'=>'Servicios HubSpot',
 '_eo_hubspot_seo_enabled'=>'1',
];
$protected=static function()use($id,$target){
 $out=['meta'=>[],'pages'=>[],'options'=>[]];
 foreach(get_post_meta($id) as $k=>$v){if(!array_key_exists($k,$target)&&!in_array($k,['_edit_lock','_yoast_indexnow_last_ping','_eael_post_view_count','_elementor_element_cache'],true))$out['meta'][$k]=$v;}
 foreach([251731,251279,250816,251078] as $p)$out['pages'][$p]=hash('sha256',get_post_meta($p,'_elementor_data',true));
 foreach(['wpseo_titles','wpseo_social','blogname','blogdescription','page_on_front','sidebars_widgets','widget_ohio_widget_socialbar_subscribe'] as $k)$out['options'][$k]=get_option($k);
 $out['menu']=get_post(244116,ARRAY_A);return $out;
};
$before=$protected();$snapshot='_gh_hubspot_seo_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'meta'=>get_post_meta($id),'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
wp_update_post(['ID'=>$id,'post_title'=>'Servicios HubSpot']);
foreach($target as $k=>$v)update_post_meta($id,$k,$v);
YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');
clean_post_cache($id);
// Refresh only this document's rendered Elementor cache for the new proof link.
delete_post_meta($id,'_elementor_element_cache');
$after=$protected();unset($before['meta']['_elementor_element_cache'],$after['meta']['_elementor_element_cache']);
if($before!==$after)WP_CLI::error('Protected state drift; inspect snapshot '.$snapshot);
foreach($target as $k=>$v)if(get_post_meta($id,$k,true)!==$v)WP_CLI::error('Readback failed.');
WP_CLI::runcommand('cache flush',['return'=>true]);
WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'title'=>get_the_title($id),'metadata'=>$target,'protectedUnchanged'=>true,'elementorHash'=>$expected],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;
