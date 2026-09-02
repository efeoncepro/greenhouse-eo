<?php
/** Operator-approved showreel. Only Experience settings, via Elementor Document::save. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='f35aebed6c8bcc3674da84876c92fd589273d0c1392c6c81c4f6b4ab2730b40e';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw))||get_post_meta($id,'_gh_task1358_preview_contract',true)!=='task-1358-home-claude-preview-v1')WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$widget=\Elementor\Plugin::$instance->widgets_manager->get_widget_types('greenhouse_agency_experience');
$controls=$widget?$widget->get_controls():[];
if(($controls['video_url']['type']??'')!=='url')WP_CLI::error('Native video URL control not registered.');
$protected=function()use($id){$out=['pages'=>[],'meta'=>[]];foreach([2791,247116,251300,250265,250816,251078,251279,244079]as$other)$out['pages'][$other]=hash('sha256',get_post_meta($other,'_elementor_data',true));foreach(get_post_meta($id)as$k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$matched=0;
foreach($elements as &$container)foreach($container['elements'] as &$node){
 if(($node['widgetType']??'')!=='greenhouse_agency_experience')continue;
 if($node['id']!=='ca913f7')WP_CLI::error('Experience identity drift.');
 $matched++;
 foreach(['f004_icono_tabler','f007_icono_tabler','f009_texto']as$key)unset($node['settings'][$key]);
 $node['settings']=array_replace($node['settings'],[
  'video_url'=>['url'=>'https://www.youtube.com/watch?v=yHUystNmtcQ','is_external'=>'','nofollow'=>''],
  'f003_nombre_accesible'=>'Showreel de Efeonce','f005_nombre_accesible'=>'Cerrar video',
  'f010_texto'=>'Mira cómo operamos','f011_texto'=>'El video se reproduce aquí. Si no carga, puedes verlo en YouTube.',
  'f012_texto'=>'Efeonce · Showreel','video_fallback'=>'Ver en YouTube'
 ]);
}unset($container,$node);
if($matched!==1)WP_CLI::error('Expected exactly one experience widget.');
$snapshot='_gh_home_video_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Readback differs; inspect snapshot '.$snapshot);
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'protectedUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
