<?php
/** Guarded, one-shot editorial patch. Dry-run unless the second input contains exactly APPLY. */
$patch=json_decode(file_get_contents($args[0]??''),true);
if(($patch['schema']??'')!=='contentMarketingEditorial.v1'||($patch['postId']??0)!==242603)WP_CLI::error('Invalid editorial patch.');
$id=242603;$raw=get_post_meta($id,'_elementor_data',true);
if(get_post_status($id)!=='publish'||get_post_meta($id,'_eo_content_marketing_enabled',true)!=='1'||!hash_equals($patch['expectedHash'],hash('sha256',$raw)))WP_CLI::error('Page ownership, status or hash drift. Read current state before retrying.');
$doc=\Elementor\Plugin::$instance->documents->get($id);
$widgets=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$elements=json_decode($raw,true);$found=[];$count=0;
foreach($elements as &$container){foreach($container['elements'] as &$widget){
 $type=$widget['widgetType']??'';if(!isset($patch['modules'][$type]))continue;
 if(!in_array($type,['greenhouse_content_problem','greenhouse_content_system','greenhouse_content_hub','greenhouse_content_review','greenhouse_content_editorial','greenhouse_content_modes','greenhouse_content_ecosystem','greenhouse_content_faq','greenhouse_content_business','greenhouse_content_conversion'],true)||isset($found[$type]))WP_CLI::error('Unexpected target.');
 $edit=$patch['modules'][$type];if($widget['id']!==$edit['id'])WP_CLI::error('Widget identity drift.');
 $controls=$widgets[$type]->get_controls();
 foreach($edit['fields'] as $key=>$change){
  if(!isset($controls[$key])||($widget['settings'][$key]??null)!==$change['before'])WP_CLI::error('Control or value drift: '.$type.'/'.$key);
  if($controls[$key]['type']==='url'){
   $routes=['content_014'=>'/servicios/posicionamiento-seo/','content_020'=>'/aeo-2/','content_024'=>'/servicios/redes-sociales/','content_028'=>'/servicios/agencia-de-influencers/','content_032'=>'/agencia-inbound-marketing/','content_036'=>'/agencia-creativa-v2/'];
   if($type!=='greenhouse_content_ecosystem'||!isset($routes[$key])||!is_array($change['before'])||!is_array($change['after']))WP_CLI::error('Unexpected URL control.');
   $expected=$change['before'];$expected['url']='https://efeoncepro.com'.$routes[$key];
   if($change['after']!==$expected)WP_CLI::error('URL must use the verified landing and preserve other link settings.');
  }elseif(!in_array($controls[$key]['type'],['text','textarea'],true)||!is_string($change['after']))WP_CLI::error('Unexpected text control.');
  $widget['settings'][$key]=$change['after'];$count++;
 }
 $found[$type]=true;
}}unset($container,$widget);
if(count($found)<1||count($found)>2||count($found)!==count($patch['modules']))WP_CLI::error('Missing or excessive target modules.');
if(!isset($args[1])||trim(file_get_contents($args[1]))!=='APPLY'){echo wp_json_encode(['status'=>'dry_run_verified','fields'=>$count,'hash'=>$patch['expectedHash']]);return;}
$settings=$doc->get_settings();$meta=[];
foreach(get_post_meta($id) as $key=>$values)if(strpos($key,'_yoast_wpseo_')===0||strpos($key,'page_')===0||in_array($key,['_thumbnail_id','_elementor_page_settings','_eo_content_marketing_enabled','_gh_content_marketing_schema'],true))$meta[$key]=get_post_meta($id,$key,true);
$protected=[];foreach([251731,244079,251279,251300,251627] as $p)$protected[$p]=hash('sha256',get_post_meta($p,'_elementor_data',true));
$shell=[];foreach(['page_on_front','sidebars_widgets','widget_block','theme_mods_ohio-child','ohio_options'] as $key)$shell[$key]=get_option($key);
$menu=wp_get_nav_menu_items(61);$menuHash=hash('sha256',wp_json_encode($menu));
$snapshot='_gh_content_marketing_copy_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>json_decode($raw,true),'settings'=>$settings,'meta'=>$meta,'protected'=>$protected,'shell'=>$shell,'menuHash'=>$menuHash,'patch'=>$patch],'',false))WP_CLI::error('Snapshot failed.');
if(false===$doc->save(['elements'=>$elements,'settings'=>$settings]))WP_CLI::error('Save failed; inspect snapshot '.$snapshot);
$actual=json_decode(get_post_meta($id,'_elementor_data',true),true);
if($actual!==$elements)WP_CLI::error('Document readback differs; inspect snapshot '.$snapshot);
foreach($meta as $key=>$value){
 if($key==='_thumbnail_id'&&get_post_meta($id,$key,true)!==$value)update_post_meta($id,$key,$value);
 if(get_post_meta($id,$key,true)!==$value)WP_CLI::error('Protected metadata drift: '.$key.'; snapshot '.$snapshot);
}
foreach($protected as $p=>$hash)if(!hash_equals($hash,hash('sha256',get_post_meta($p,'_elementor_data',true))))WP_CLI::error('Protected page changed.');
foreach($shell as $key=>$value)if(get_option($key)!==$value)WP_CLI::error('Shell drift.');
if(!hash_equals($menuHash,hash('sha256',wp_json_encode(wp_get_nav_menu_items(61)))))WP_CLI::error('Menu drift.');
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'copy_published_verified','fields'=>$count,'snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'otherModulesUnchanged'=>true,'seoAndShellUnchanged'=>true],JSON_PRETTY_PRINT);
