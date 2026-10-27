'use strict';
window.FieldDashboard=(()=>{
 let session=null,bulk=null,selectionKey='';const selected=new Set(),checks=new Map();
 const selector=$('#review-field'),scope=$('#review-scope');
 for(const [key,definition]of Object.entries(RecordFields.definitions))selector.add(new Option(definition.label,key));selector.value='author';
 const viewKey='prodigo-review-grid-view';let view={imagesOnly:false,columns:'auto'};
 try{const saved=JSON.parse(localStorage.getItem(viewKey));if(saved&&typeof saved.imagesOnly==='boolean')view.imagesOnly=saved.imagesOnly;if(saved&&(saved.columns==='auto'||Number.isInteger(Number(saved.columns))&&Number(saved.columns)>=2&&Number(saved.columns)<=12))view.columns=String(saved.columns);}catch(e){}
 function applyView(persist=false){
  const grid=$('#review-list');grid.classList.toggle('images-only',view.imagesOnly);grid.style.gridTemplateColumns=view.columns==='auto'?'':'repeat('+view.columns+', minmax(0, 1fr))';
  $('#review-images-only').checked=view.imagesOnly;$('#review-columns').value=view.columns;
  if(persist)try{localStorage.setItem(viewKey,JSON.stringify(view));}catch(e){}
 }
 $('#review-images-only').onchange=()=>{view.imagesOnly=$('#review-images-only').checked;applyView(true);};
 $('#review-columns').onchange=()=>{const value=$('#review-columns').value;if(value==='auto'||Number.isInteger(Number(value))&&Number(value)>=2&&Number(value)<=12){view.columns=value;applyView(true);}};
 applyView();
 const items=()=>db?RecordFields.candidates(images(),selector.value,scope.value).filter(i=>!$('#review-side').value||i.record.side===$('#review-side').value):[];
 function updateSelection(){
  const list=items(),count=list.filter(i=>selected.has(i.id)).length;
  for(const [id,{checkbox,card}]of checks){checkbox.checked=selected.has(id);checkbox.disabled=busy;card.classList.toggle('selected',checkbox.checked);}
  $('#selection-count').textContent=count+' de '+list.length+' seleccionadas';
  $('#membership-selected').disabled=!count||busy;$('#membership-selected').textContent=$('#status').value==='withdrawn'?'Reincorporar seleccionadas':'Retirar seleccionadas';$('#bulk-open').disabled=!count||busy;$('#start-review').disabled=!list.length||busy;
  $('#start-review').textContent=count?'Recorrer '+count+' seleccionadas →':'Empezar recorrido →';
  for(const id of ['select-all','select-none','select-invert'])$('#'+id).disabled=!list.length||busy;
 }
 function render(){
  if(!db)return;
  const key=GithubStore.id+'|'+selector.value;if(key!==selectionKey){selected.clear();selectionKey=key;}
  const selection=images(),part=$('#review-side'),partValue=part.value;
  part.replaceChildren(new Option('Todas las partes',''));for(const value of [...new Set([...RecordFields.definitions.side.options,...selection.map(i=>i.record.side).filter(Boolean)])])part.add(new Option(value,value));part.value=partValue;
  $('#dashboard-summary').textContent=`${selection.length} imágenes en los filtros actuales`;
  const cards=$('#field-stats');cards.replaceChildren();for(const key of ['color','author','identifiedPeople','identifier']){const count=RecordFields.stats(selection,key),button=el('button','');button.type='button';button.className='field-stat';button.append(el('strong',RecordFields.definitions[key].label),el('span',`${count.filled} / ${count.total} con dato`),el('small',`${count.total-count.filled} vacíos · ${count.reviewed} revisados`));button.onclick=()=>{selector.value=key;$('#dashboard-panel').open=true;render();};cards.append(button);}
  const list=items(),visible=new Set(list.map(i=>i.id));for(const id of selected)if(!visible.has(id))selected.delete(id);
  $('#bulk-open').hidden=!RecordFields.bulkAllowed(selector.value);$('#review-count').textContent=`${list.length} imágenes para ${RecordFields.definitions[selector.value].label.toLowerCase()}`;$('#review-list').replaceChildren();checks.clear();
  for(const image of list){
   const card=el('article','');card.className='review-tile';
   const label=el('label','');label.className='review-pick';const checkbox=el('input','');checkbox.type='checkbox';checkbox.setAttribute('aria-label','Seleccionar '+image.relative);label.append(checkbox);
   if(image.media?.thumb){const thumb=new Image();thumb.src=GithubStore.url(image.media.thumb);thumb.alt=image.relative;thumb.loading='lazy';label.append(thumb);}else{const placeholder=el('span','Sin vista');placeholder.className='review-no-image';label.append(placeholder);}
   label.append(el('strong',image.record.identifier||image.record.number||image.relative),el('small',image.relative+' · '+(image.record.side||'Sin parte')),el('span',RecordFields.text(image,selector.value,db)));
   checkbox.onchange=()=>{if(!busy){if(checkbox.checked)selected.add(image.id);else selected.delete(image.id);}updateSelection();};
   const preview=el('button','Revisar imagen');preview.type='button';preview.className='review-preview';preview.setAttribute('aria-label','Revisar '+image.relative);preview.title='Revisar '+image.relative;preview.onclick=()=>start(image.id);
   card.append(label,preview);checks.set(image.id,{checkbox,card});$('#review-list').append(card);
  }
  if(!list.length)$('#review-list').append(el('p','No hay imágenes para este campo y filtro.'));
  updateSelection();
 }
 $('#membership-selected').onclick=async()=>{const targets=items().filter(i=>selected.has(i.id));if(targets.length&&await changeMembership(targets,$('#status').value!=='withdrawn')){selected.clear();render();}};
 $('#select-all').onclick=()=>{if(busy)return;for(const image of items())selected.add(image.id);updateSelection();};
 $('#select-none').onclick=()=>{if(busy)return;selected.clear();updateSelection();};
 $('#select-invert').onclick=()=>{if(busy)return;for(const image of items()){if(selected.has(image.id))selected.delete(image.id);else selected.add(image.id);}updateSelection();};
 $('#review-side').onchange=render;
 function openBulk(){
  if(typeof guarded==='function'&&!guarded())return;if(busy)return;
  if(!GithubStore.connected){$('#connection-error').textContent='Conectá GitHub para editar globalmente.';$('#connection').showModal();return;}
  const field=selector.value,list=items().filter(i=>selected.has(i.id));if(!list.length||!RecordFields.bulkAllowed(field))return;
  bulk={field,targets:list.map(i=>({id:i.id,revision:i.revision||0}))};
  $('#bulk-title').textContent='Edición global · '+RecordFields.definitions[field].label;
  $('#bulk-summary').textContent=list.length+' imágenes seleccionadas. Solo se modifica este conjunto; las demás se conservan.';
  const select=$('#bulk-value');select.replaceChildren(new Option('Elegí el nuevo valor…','__choose__'),new Option('Dejar vacío',''));
  if(field==='signature')for(const [value,label]of Object.entries(db.signatures||{}))select.add(new Option(label,value));
  else for(const value of field==='author'?[...new Set([...GithubStore.vocabulary.authors,...(db.authors||[]),...Object.values(db.images).map(i=>i.record?.author).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'es')):RecordFields.definitions[field].options)select.add(new Option(value,value));
  select.value='__choose__';$('#bulk-preview').textContent='';$('#bulk-error').textContent='';$('#bulk-apply').disabled=true;$('#bulk-list').replaceChildren();
  for(const image of list){const row=el('div','');row.className='bulk-selected-image';if(image.media?.thumb){const thumb=new Image();thumb.src=GithubStore.url(image.media.thumb);thumb.alt='';thumb.loading='lazy';row.append(thumb);}row.append(el('span',image.relative+' · '+RecordFields.text(image,field,db)));$('#bulk-list').append(row);}
  $('#bulk-dialog').showModal();
 }
 $('#bulk-value').onchange=()=>{if(!bulk)return;const value=$('#bulk-value').value;$('#bulk-apply').disabled=value==='__choose__';$('#bulk-preview').textContent=value==='__choose__'?'':bulk.targets.length+' imágenes → '+(value===''?'Sin dato':bulk.field==='signature'?db.signatures[value]:value)+'. Se reemplaza el valor actual del campo y se marca como revisado.';$('#bulk-apply').textContent='Aplicar a '+bulk.targets.length+' imágenes';};
 $('#bulk-open').onclick=openBulk;
 $('#bulk-cancel').onclick=()=>{if(!busy)$('#bulk-dialog').close();};
 $('#bulk-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('#bulk-apply').onclick=async()=>{
  if(!bulk||busy||$('#bulk-value').value==='__choose__')return;const operation=bulk,value=$('#bulk-value').value;busy=true;for(const id of ['bulk-apply','bulk-cancel','bulk-value'])$('#'+id).disabled=true;
  try{const result=await api('bulk_field',{...operation,value});for(const image of result.images)db.images[image.id]=image;db.authors=result.authors;$('#bulk-dialog').close();bulk=null;for(const target of operation.targets)selected.delete(target.id);render();$('#notice').textContent=operation.targets.length+' imágenes actualizadas en '+RecordFields.definitions[operation.field].label+'.';}
  catch(e){$('#bulk-error').textContent=e.message;}
  finally{busy=false;for(const id of ['bulk-apply','bulk-cancel','bulk-value'])$('#'+id).disabled=false;render();}
 };
 function start(id){
  if(typeof guarded==='function'&&!guarded())return;
  if(!GithubStore.connected){$('#connection-error').textContent='Conectá GitHub para completar o revisar campos.';$('#connection').showModal();return;}
  const candidates=items(),list=id?[candidates.find(i=>i.id===id)].filter(Boolean):selected.size?candidates.filter(i=>selected.has(i.id)):candidates;if(!list.length)return;
  session={field:selector.value,ids:list.map(i=>i.id),cursor:Math.max(0,list.findIndex(i=>i.id===id)),saved:0};openCurrent();
 }
 function openCurrent(){if(!session)return;const image=db.images[session.ids[session.cursor]];if(image)open(image,session.field);}
 function drawEditor(key){
  $('#steps').hidden=true;$('#step-counter').textContent=`REVISIÓN POR CAMPO · ${session.cursor+1} / ${session.ids.length}`;$('#step-title').textContent=RecordFields.definitions[key].label;$('#fields').replaceChildren();$('#save-error').textContent='';renderSingleField(key);
  $('#fields').append(el('p','Este guardado modifica solo el campo elegido y conserva el estado de catalogación. Podés dejarlo vacío si no hay datos y marcarlo como revisado.'));
  $('#back').textContent='← Imagen anterior';$('#back').disabled=session.cursor===0;$('#draft').textContent='Guardar y cerrar';$('#next').textContent='Guardar y siguiente imagen →';
  let skip=$('#skip-field');if(!skip){skip=el('button','Saltar imagen →');skip.id='skip-field';skip.type='button';$('#next').parentElement.append(skip);skip.onclick=()=>move(1);}skip.hidden=false;focusFirst();
 }
 function move(delta){
  if(busy||!session)return;if(dirty&&!confirm('¿Saltar esta imagen y descartar el cambio sin guardar?'))return;
  const index=session.cursor+delta;if(index>=0&&index<session.ids.length){session.cursor=index;openCurrent();}else finish();
 }
 function finish(){const count=session?.saved||0;dirty=false;$('#editor').close();release();render();$('#notice').textContent=`Recorrido finalizado: ${count} guardados del campo seleccionado.`;}
 async function saveField(advance){
  if(!session||busy)return;busy=true;for(const id of ['next','draft','back','skip-field'])if($('#'+id))$('#'+id).disabled=true;
  const key=session.field;
  try{
   const result=await api('patch_field',{id:active.id,revision:active.revision||0,field:key,value:record[key]??(['names','tags'].includes(RecordFields.definitions[key].type)?[]:'')});
   db.images[active.id]=result.image;db.authors=result.authors;
   if(RecordFields.definitions[key].type==='tags')db.terms[key]=[...new Set([...(db.terms[key]||[]),...(result.image.record[key]||[])])];
   session.saved++;dirty=false;active=result.image;record=recordForEditing(active.record);render();
   if(advance&&session.cursor+1<session.ids.length){session.cursor++;openCurrent();}else if(advance)finish();else{$('#editor').close();release();$('#notice').textContent='Campo guardado y marcado como revisado.';}
  }catch(e){$('#save-error').textContent=e.message;}
  finally{busy=false;for(const id of ['next','draft','back','skip-field'])if($('#'+id))$('#'+id).disabled=false;if(session)$('#back').disabled=session.cursor===0;}
 }
 function release(){session=null;editingField=null;if($('#skip-field'))$('#skip-field').hidden=true;}
 selector.onchange=render;scope.onchange=render;$('#start-review').onclick=()=>start();
 return {render,drawEditor,save:saveField,previous:()=>move(-1),release};
})();
