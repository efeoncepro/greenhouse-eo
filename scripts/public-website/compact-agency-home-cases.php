<?php
/** Approved compact portfolio CTA. One widget only; preserve all other page data. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='86cd9ca457e1836d005122450249fb99b40cf74e47f64b222d650a64ab07d66e';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
if(get_post_status(247116)!=='publish'||untrailingslashit(get_permalink(247116))!=='https://efeoncepro.com/portafolio')WP_CLI::error('Portfolio destination drift.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$widget=\Elementor\Plugin::$instance->widgets_manager->get_widget_types('greenhouse_agency_cases');
$controls=$widget?$widget->get_controls():[];
if(($controls['cases_url']['type']??'')!=='url'||isset($controls['cases']))WP_CLI::error('Compact cases native controls not registered.');
$protected=function()use($id){$out=['pages'=>[],'meta'=>[]];foreach([2791,247116,251300,250265,250816,251078,251279,244079]as$other)$out['pages'][$other]=hash('sha256',get_post_meta($other,'_elementor_data',true));foreach(get_post_meta($id)as$k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$matched=0;
foreach($elements as &$container)foreach($container['elements'] as &$node){
 if(($node['widgetType']??'')!=='greenhouse_agency_cases')continue;
 if($node['id']!=='517e985'||count($node['settings']['cases']??[])!==4)WP_CLI::error('Cases identity/count drift.');
 $matched++;
 foreach(['f001_texto','f002_titulo','f003_texto','f004_descripcion','f005_descripcion','cases']as$key)unset($node['settings'][$key]);
 $node['settings']=array_replace($node['settings'],[
  'eyebrow'=>'Casos de éxito','title'=>'Del desafío al trabajo hecho.',
  'description'=>'Conoce los proyectos que hemos desarrollado junto a nuestros clientes.',
  'button_label'=>'Ver casos de éxito','cases_url'=>['url'=>get_permalink(247116),'is_external'=>'','nofollow'=>''],
  'heading_color'=>'#eaf2ff','button_background'=>'#14b8a6','button_text_color'=>'#04223d','button_hover_background'=>'#5eead4',
  '_title'=>'Casos · Invitación al portafolio'
 ]);
}unset($container,$node);
if($matched!==1)WP_CLI::error('Expected exactly one cases widget.');
$snapshot='_gh_home_compact_cases_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Readback differs; inspect snapshot '.$snapshot);
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'destination'=>get_permalink(247116),'protectedUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
