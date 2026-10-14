<?php
/** Inputs: payload.json. Modes apply/readback/rollback; snapshot option is non-autoload. */
function eo2_hash($v){return hash('sha256',wp_json_encode($v));}
function eo2_assert($ok,$message){if(!$ok)throw new Exception($message);}
$p=json_decode(file_get_contents($args[0]),true,512,JSON_THROW_ON_ERROR);
eo2_assert(get_option('home')===$p['home'] && (int)get_option('page_on_front')===$p['frontId'] && get_stylesheet()==='ohio-child','site_identity_drift');
eo2_assert(current_user_can('edit_theme_options') && current_user_can('wpcf7_edit_contact_form',$p['formId']),'missing_permission');
$key='eo_footer_refinement_20261014_v2';$mode=$p['mode']??'readback';$snap=get_option($key);$f=WPCF7_ContactForm::get_instance($p['formId']);eo2_assert((bool)$f,'missing_form');
if($mode==='apply' && !$snap){
 $before=[];
 foreach($p['expectedOptions'] as $name=>$hash){$v=get_option($name,null);eo2_assert(eo2_hash($v)===$hash,'option_drift_'.$name);$before[$name]=$v;}
 eo2_assert(eo2_hash($f->get_properties())===$p['expectedFormHash'],'form_drift');
 $after=$before;
 foreach($p['blocks'] as $id=>$html)$after['widget_block'][(int)$id]['content']=$html;
 $after['sidebars_widgets']['ohio-sidebar-footer-3']=['ohio_widget_subscribe-2'];
 $after['sidebars_widgets']['ohio-sidebar-footer-4']=['block-31','block-34'];
 $after['widget_ohio_widget_subscribe'][2]['title']=$p['subscribeTitle'];
 $after['widget_ohio_widget_socialbar_subscribe'][3]['instagram']='https://www.instagram.com/efeoncepro/';
 $after['widget_ohio_widget_socialbar_subscribe'][3]['spotify']='';
 $after['options_global_footer_copyright_left']=$p['copyrightLeft'];
 $after['options_global_footer_copyright_right']=$p['copyrightRight'];
 $props=$f->get_properties();$nextProps=$props;$nextProps['form']=$p['form'];
 $snap=['state'=>'prepared','createdAt'=>gmdate('c'),'before'=>$before,'after'=>$after,'formBefore'=>$props,'formAfter'=>$nextProps,'frontHash'=>eo2_hash([get_post($p['frontId'])->post_content,get_post_meta($p['frontId'],'_elementor_data',true),get_post_meta($p['frontId'],'_elementor_page_settings',true)]),'templateHash'=>hash_file('sha256',get_stylesheet_directory().'/parts/elements/footer.php')];
 eo2_assert(add_option($key,$snap,'',false),'snapshot_exists');
}
eo2_assert(is_array($snap),'snapshot_missing');
if($mode==='apply' && $snap['state']==='prepared'){
 foreach($snap['before'] as $name=>$v)eo2_assert(eo2_hash(get_option($name,null))===eo2_hash($v),'concurrent_option_edit_'.$name);
 eo2_assert(eo2_hash($f->get_properties())===eo2_hash($snap['formBefore']),'concurrent_form_edit');
 foreach($snap['after'] as $name=>$v)if(eo2_hash($v)!==eo2_hash($snap['before'][$name]))update_option($name,$v);
 $f->set_properties($snap['formAfter']);$f->save();
 $snap['state']='applied';$snap['appliedAt']=gmdate('c');update_option($key,$snap,false);
}
if($mode==='rollback'){
 eo2_assert($snap['state']==='applied','rollback_state_guard');
 $owned=['widget_block'=>[31,34,45],'widget_ohio_widget_subscribe'=>[2],'widget_ohio_widget_socialbar_subscribe'=>[3],'sidebars_widgets'=>['ohio-sidebar-footer-3','ohio-sidebar-footer-4']];
 $restore=[];
 foreach($snap['after'] as $name=>$v){$now=get_option($name,null);if(isset($owned[$name])){foreach($owned[$name] as $id){eo2_assert(eo2_hash($now[$id])===eo2_hash($v[$id]),'rollback_drift_'.$name.'_'.$id);$now[$id]=$snap['before'][$name][$id];}$restore[$name]=$now;}elseif(eo2_hash($v)!==eo2_hash($snap['before'][$name])){eo2_assert(eo2_hash($now)===eo2_hash($v),'rollback_drift_'.$name);$restore[$name]=$snap['before'][$name];}}
 eo2_assert(eo2_hash($f->get_properties())===eo2_hash($snap['formAfter']),'rollback_form_drift');
 foreach($restore as $name=>$v)update_option($name,$v);
 $f->set_properties($snap['formBefore']);$f->save();
 $snap['state']='rolled_back';update_option($key,$snap,false);
}
$checks=[];$expected=$snap['state']==='rolled_back'?$snap['before']:$snap['after'];
foreach($expected as $name=>$v)$checks[$name]=eo2_hash(get_option($name,null))===eo2_hash($v);
$f=WPCF7_ContactForm::get_instance($p['formId']);$checks['form']=eo2_hash($f->get_properties())===eo2_hash($snap['state']==='rolled_back'?$snap['formBefore']:$snap['formAfter']);
$checks['form_delivery_properties']=eo2_hash(array_diff_key($f->get_properties(),['form'=>true]))===$p['formOtherHash'];
$checks['home']=eo2_hash([get_post($p['frontId'])->post_content,get_post_meta($p['frontId'],'_elementor_data',true),get_post_meta($p['frontId'],'_elementor_page_settings',true)])===$snap['frontHash'];
$checks['template']=hash_file('sha256',get_stylesheet_directory().'/parts/elements/footer.php')===$snap['templateHash'];
echo wp_json_encode(['state'=>$snap['state'],'snapshotOption'=>$key,'checks'=>$checks,'allChecksPass'=>!in_array(false,$checks,true),'formId'=>$p['formId'],'formDeliveryHash'=>$p['formOtherHash'],'blockHashes'=>array_map('eo2_hash',array_intersect_key(get_option('widget_block'),$p['blocks']))],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
eo2_assert(!in_array(false,$checks,true),'readback_failed_do_not_repeat_apply');
