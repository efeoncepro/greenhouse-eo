<?php
/** Read-only against real Elementor: saved structure, controls, rendering and inherited chrome. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$raw=get_post_meta($id,'_elementor_data',true);$tree=json_decode($raw,true);
$registered=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$report=[];$failures=[];$counts=['containers'=>0,'widgets'=>0,'html'=>0,'controls'=>0,'repeaters'=>0];
foreach($tree as $container){
 $counts['containers']++;
 foreach($container['elements'] as $node){
  $counts['widgets']++;
  if($node['widgetType']==='html')$counts['html']++;
  $widget=$registered[$node['widgetType']]??null;
  if(!$widget){$failures[]='Unregistered '.$node['widgetType'];continue;}
  $controls=$widget->get_controls();$schema=$widget->content_schema();
  $counts['controls']+=count($schema['fields']);$counts['repeaters']+=count($schema['repeaters']);
  foreach($schema['fields'] as $field)if(!isset($controls[$field['key']]))$failures[]='Missing control '.$node['widgetType'].'.'.$field['key'];
  foreach($schema['repeaters'] as $group)if(($controls[$group['key']]['type']??'')!=='repeater')$failures[]='Missing repeater '.$group['key'];
  $render=\EO_Agency_Landing_Base_Widget::render_module($schema['module'],$node['settings'],$node['id']);
  if(preg_match('/%%[^%]+%%/',$render))$failures[]='Unresolved placeholder '.$node['widgetType'];
  $probe=array_values(array_filter($schema['fields'],fn($f)=>in_array($f['type'],['text','textarea'],true)))[0]??null;
  if($probe){$settings=$node['settings'];$settings[$probe['key']]='EDITOR-CONTROL-PROBE';$probe_html=\EO_Agency_Landing_Base_Widget::render_module($schema['module'],$settings,'probe');if(strpos($probe_html,'EDITOR-CONTROL-PROBE')===false)$failures[]='Edit not rendered '.$node['widgetType'];}
  $report[]=['widget'=>$node['widgetType'],'contentFields'=>count($schema['fields']),'repeaters'=>count($schema['repeaters']),'templateBytes'=>strlen($render)];
 }
}
$polish_controls=['hero'=>['brands'=>'repeater'],'ecosystem'=>['heading_color'=>'color','f001_imagen'=>'media','globe_logo'=>'media','kortex_logo'=>'media','wave_logo'=>'media','show_launch_notice'=>'select'],'agenda'=>['button_background'=>'color','button_text_color'=>'color','button_hover_background'=>'color'],'social_proof'=>['hubspot_logo'=>'media']];
$polish_report=[];
foreach($polish_controls as $module=>$expected_controls)foreach($expected_controls as $control_id=>$type){
 // Elementor's bulk getter omits optimized style controls on the frontend.
 // The named getter resolves both content and style stacks in the real registry.
 $control=$registered['greenhouse_agency_'.$module]->get_controls($control_id);
 $polish_report[$module.'.'.$control_id]=['type'=>$control['type']??null,'default'=>$control['default']??null];
 if(($control['type']??null)!==$type)$failures[]='Missing native control '.$module.'.'.$control_id;
}
if($counts['html']!==0 || $counts['widgets']!==17)$failures[]='Wrong document shape';
$metas=['home'=>(int)get_option('page_on_front'),'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true),'header'=>get_post_meta($id,'page_header_visibility',true),'footer'=>get_post_meta($id,'page_footer_visibility',true),'template'=>get_post_meta($id,'_wp_page_template',true)];
if($metas['home']!==$id||$metas['noindex']!=='2'||$metas['header']!=='1'||$metas['footer']!=='1')$failures[]='Protected Home settings changed';
if(get_post_meta($id,'_yoast_wpseo_canonical',true)!==home_url('/'))$failures[]='Home canonical mismatch';
echo wp_json_encode(['status'=>$failures?'FAIL':'PASS','counts'=>$counts,'documentBytes'=>strlen($raw),'pageHash'=>hash('sha256',$raw),'protected'=>$metas,'modules'=>$report,'polishControls'=>$polish_report,'failures'=>$failures],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
if($failures)WP_CLI::error('Elementor contract failed.');
