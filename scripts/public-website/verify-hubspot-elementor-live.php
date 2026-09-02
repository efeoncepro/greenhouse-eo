<?php
/** Native Elementor save/read/render check, on a temporary draft. The public page is read-only. */
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$source=244079;$hash=hash('sha256',get_post_meta($source,'_elementor_data',true));$home=get_option('page_on_front');$homeHash=hash('sha256',get_post_meta($home,'_elementor_data',true));
$doc=\Elementor\Plugin::$instance->documents->get($source);$elements=$doc->get_elements_data();$types=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();$registered=[];
foreach($elements as $container){$w=$container['elements'][0];$name=$w['widgetType'];if(!isset($types[$name]))WP_CLI::error('Missing '.$name);$registered[$name]=count($types[$name]->get_controls());}
$test=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'QA temporal · HubSpot Elementor save/read'],true);if(is_wp_error($test))WP_CLI::error('Cannot create test draft');update_post_meta($test,'_elementor_edit_mode','builder');
try{$testdoc=\Elementor\Plugin::$instance->documents->get($test);$testElements=[$elements[0],$elements[9]];$field=$types['greenhouse_hubspot_hero']->content_schema()['fields'][0]['key'];
$schema=$types['greenhouse_hubspot_hero']->content_schema();foreach($schema['fields'] as $f)if($f['type']==='text'&&strpos($f['label'],'Título principal')===0){$field=$f['key'];break;}
$testElements[0]['elements'][0]['settings'][$field]='QA editable <safe> & persistente';$questions=$testElements[1]['elements'][0]['settings']['questions'];$testElements[1]['elements'][0]['settings']['questions']=array_reverse($questions);
$testdoc->save(['elements'=>$testElements,'settings'=>['page_layout'=>'default']]);$read=json_decode(get_post_meta($test,'_elementor_data',true),true);
if($read[0]['elements'][0]['settings'][$field]!=='QA editable <safe> & persistente')throw new Exception('Native text did not persist');
if($read[1]['elements'][0]['settings']['questions'][0]['_id']!==end($questions)['_id'])throw new Exception('Repeater reorder did not persist');
$html=EO_Hubspot_Landing_Base_Widget::render_module('hero',$read[0]['elements'][0]['settings'],'qa-test');if(strpos($html,'QA editable &lt;safe&gt; &amp; persistente')===false)throw new Exception('Escaped edited content not rendered');
$pass=true;
}finally{wp_trash_post($test);}
if($hash!==hash('sha256',get_post_meta($source,'_elementor_data',true))||$homeHash!==hash('sha256',get_post_meta($home,'_elementor_data',true)))WP_CLI::error('Protected page changed');
echo wp_json_encode(['status'=>'pass','nativeWidgets'=>$registered,'draftSaveReadRender'=>$pass,'testDraftTrashed'=>$test,'pageHash'=>$hash,'homeHash'=>$homeHash,'featured'=>get_post_thumbnail_id($source),'postStatus'=>get_post_status($source)],JSON_PRETTY_PRINT);
