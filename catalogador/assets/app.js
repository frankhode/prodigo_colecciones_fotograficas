'use strict';
const $=s=>document.querySelector(s), el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
let db,token,active,record,step=0,dirty=false,busy=false,scale=1,editingField=null;
const previewObserver=new IntersectionObserver(items=>{for(const item of items){if(!item.isIntersecting)continue;previewObserver.unobserve(item.target);const img=item.target;BixioMedia.show(img,img.dataset.id,img.parentElement.querySelector(".preview-state"));}},{rootMargin:"150px"});
const defaults={people:[],objects:[],highlights:[]};
const titles=['Identificación','Tipo de imagen','Personas','Objetos','Destacados','Firma del estudio','Revisar'];
async function api(action,data){return GithubStore.mutate(action,data);}
async function load(){let v=await api('state');db=v.db;token=v.token;window.bixioToken=token;render();}
function images(){return Object.values(db.images).filter(i=>(!$('#folder').value||i.folder===$('#folder').value)&&($('#status').value==='withdrawn'?!!i.excluded:!i.excluded&&(!$('#status').value||i.status===$('#status').value))&&JSON.stringify([i.relative,i.record]).toLocaleLowerCase().includes($('#search').value.toLocaleLowerCase())).sort((a,b)=>a.relative.localeCompare(b.relative,undefined,{numeric:true}));}
function render(){const selected=$('#folder').value;$('#folder').replaceChildren(new Option('Todas las carpetas',''));for(const[id,f]of Object.entries(db.folders))$('#folder').add(new Option(f.name||f.path||'Carpeta',id));$('#folder').value=selected;const list=images();$('#count').textContent=list.length+' imágenes';previewObserver.disconnect();$('#gallery').replaceChildren();for(const i of list){let b=el('button','');b.className='tile';let img=new Image();img.dataset.id=i.id;img.alt=i.relative;let state=el('span','Preparando imagen…');state.className='preview-state';b.append(img,state,el('strong',i.record.number||i.relative),el('small',i.excluded?'Retirada':({pending:'Pendiente',draft:'Borrador',done:'Catalogada'})[i.status]));b.onclick=()=>open(i);$('#gallery').append(b);previewObserver.observe(img);}window.FieldDashboard?.render();if(!list.length)$('#gallery').append(el('p',Object.keys(db.images).length?'No hay imágenes para estos filtros.':'Agregá una carpeta para empezar.'));}
function recordForEditing(value){return structuredClone(value&&typeof value==='object'?{...value}:{});}
function open(i,focusedField=null){if(!RecordFields.ready){$('#notice').textContent='No se cargaron las opciones. Revisá options.json y recargá la página.';return;}if(!GithubStore.connected){$('#connection-error').textContent='Conectá GitHub para editar fichas.';$('#connection').showModal();$('#github-token').focus();return;}editingField=focusedField;active=i;$('#membership-one').textContent=i.excluded?'Reincorporar a la colección':'Retirar de la colección';record=recordForEditing(i.record);step=0;dirty=false;$('#filename').textContent=i.relative;$('#photo').removeAttribute('src');BixioMedia.show($('#photo'),i.id,$('#image-error'),true);scale=1;zoom();show();if(!$('#editor').open)$('#editor').showModal();focusFirst();}
$('#photo').onerror=()=>{$('#photo').hidden=true;$('#image-error').textContent='No se pudo mostrar esta imagen.';$('#image-error').hidden=false;};
function zoom(){$('#photo').style.width=scale*100+'%';$('#photo').style.height=scale===1?'100%':'auto';}
$('#plus').onclick=()=>{scale=Math.min(5,scale+.25);zoom();};$('#minus').onclick=()=>{scale=Math.max(1,scale-.25);zoom();};$('#fit').onclick=()=>{scale=1;zoom();};
function focusFirst(){setTimeout(()=>$('#fields input, #fields select, #fields textarea, #fields button')?.focus(),0);}
function field(label,key,options){const wrap=el('label',label);let input;if(options){input=el('select','');input.add(new Option('Sin indicar',''));for(const v of options)input.add(new Option(v,v));if(RecordFields.definitions[key]?.options&&record[key]&&!options.includes(record[key]))input.add(new Option(record[key]+' (valor anterior)',record[key]));}else input=el(key==='notes'?'textarea':'input','');input.value=record[key]||'';input.oninput=()=>{record[key]=input.value;dirty=true;};wrap.append(input);$('#fields').append(wrap);return input;}
function vocabularyValues(key){const shared=GithubStore.vocabulary;return [...new Set([...(key==='author'?shared.authors:shared.terms[key]||[]),...(key==='author'?db.authors||[]:RecordFields.terms[key]||[]),...(key==='author'?Object.values(db.images).map(i=>i.record?.author):db.terms[key]||[]),...(key==='author'?[record.author]:record[key]||[])].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));}
function termPicker(key,multiple){
 const wrap=el('div','');wrap.className='term-picker';const caption=el('label',RecordFields.definitions[key].label),input=el('input','');input.type='search';input.placeholder='Buscar o escribir un término nuevo';input.autocomplete='off';input.maxLength=300;caption.append(input);
 const hint=el('small','Escribí para buscar · ↑ ↓ recorrer · Enter elegir · Tab salir · Enter sin búsqueda: avanzar');
 const selected=el('div','');selected.className='term-selected';const list=el('div','');list.className='term-results';list.setAttribute('role','listbox');if(multiple)list.setAttribute('aria-multiselectable','true');list.id='terms-'+key;input.setAttribute('aria-controls',list.id);
 const status=el('small','');status.setAttribute('aria-live','polite');let cursor=-1,values=[],creating=false;
 const chosen=()=>multiple?record[key]||[]:record[key]?[record[key]]:[];
 function choose(value){if(multiple)record[key]=chosen().includes(value)?chosen().filter(v=>v!==value):[...chosen(),value];else record[key]=record[key]===value?'':value;dirty=true;input.value='';cursor=-1;draw();input.focus();}
 function draw(){const normal=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();const query=input.value.trim();values=vocabularyValues(key).filter(v=>normal(v).includes(normal(query)));creating=!!query&&!vocabularyValues(key).some(v=>normal(v)===normal(query));if(creating)values.push(query);cursor=Math.min(cursor,values.length-1);
  selected.replaceChildren();for(const value of chosen()){const button=el('button',value+' ×');button.type='button';button.tabIndex=-1;button.onclick=()=>choose(value);selected.append(button);}
  list.replaceChildren();values.forEach((value,n)=>{const button=el('button',(chosen().includes(value)?'☑ ':'☐ ')+(creating&&n===values.length-1?'Agregar: ':'')+value);button.type='button';button.tabIndex=-1;button.id=list.id+'-'+n;button.setAttribute('role','option');button.setAttribute('aria-selected',String(chosen().includes(value)));button.classList.toggle('cursor',cursor===n);button.onclick=()=>choose(value);list.append(button);});
  if(cursor>=0){input.setAttribute('aria-activedescendant',list.id+'-'+cursor);list.children[cursor]?.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');status.textContent=chosen().length+' seleccionados · '+values.length+' opciones';
 }
 input.oninput=()=>{cursor=-1;draw();};input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();cursor=values.length?(cursor<0?(e.key==='ArrowDown'?0:values.length-1):(cursor+(e.key==='ArrowDown'?1:-1)+values.length)%values.length):-1;draw();}else if(e.key==='Enter'&&!e.ctrlKey&&(input.value.trim()||cursor>=0)){e.preventDefault();e.stopPropagation();if(values.length)choose(values[cursor>=0?cursor:0]);}};
 wrap.append(caption,hint,selected,list,status);$('#fields').append(wrap);draw();return input;
}
function tags(key){if(!Array.isArray(record[key]))record[key]=[];termPicker(key,true);}
function identifierFields(){
 const value=field('Identificador único','identifier');value.type='text';value.autocomplete='off';
}

function authorField(){termPicker('author',false);}
function namesField(){
 const label=el('label','Nombres de las personas identificadas');const input=el('textarea','');input.value=(record.identifiedPeople||[]).join('\n');input.rows=4;input.placeholder='Un nombre por línea';input.oninput=()=>{record.identifiedPeople=[...new Set(input.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean))];dirty=true;};
 label.append(input);$('#fields').append(label);
}
function renderSingleField(key){
 const definition=RecordFields.definitions[key];
 if(definition.type==='link'){const input=field(definition.label,key,[]);for(const image of Object.values(db.images).filter(i=>i.id!==active.id))input.add(new Option((image.record.side||'Sin parte')+' · '+image.relative,image.id));input.value=record[key]||'';}else if(definition.type==='identifier')identifierFields();else if(definition.type==='author')authorField();else if(definition.type==='names')namesField();else if(definition.type==='signature')signatureFields();else if(definition.type==='tags')tags(key);else field(definition.label,key,definition.options);
}
function signatureFields(){
 const select=field('Firma del estudio','signature',[]);
 select.id='signature-select';
 for(const [code,name] of Object.entries(db.signatures||{})) select.add(new Option(/^[A-Z]+-\d+$/.test(code)?code+' · '+name:name,code));
 select.value=record.signature||'';
 const detail=el('p','');detail.className='signature-detail';
 function updateDetail(){detail.textContent=(db.signatures||{})[select.value]||'';}
 select.addEventListener('change',updateDetail);updateDetail();$('#fields').append(detail);
 const reveal=el('button','＋ Nueva firma');reveal.type='button';reveal.id='new-signature';reveal.setAttribute('aria-expanded','false');
 const box=el('div','');box.className='signature-new';box.hidden=true;
 const label=el('label','Descripción de la nueva firma');label.htmlFor='signature-name';
 const input=el('input','');input.id='signature-name';input.maxLength=200;input.placeholder='Texto, dirección o características de la firma';
 const error=el('p','');error.setAttribute('role','alert');error.className='signature-error';
 const create=el('button','Agregar y seleccionar');create.type='button';
 const cancel=el('button','Cancelar');cancel.type='button';
 const controls=el('div','');controls.className='signature-actions';controls.append(create,cancel);box.append(label,input,controls,error);
 reveal.onclick=()=>{box.hidden=false;reveal.hidden=true;reveal.setAttribute('aria-expanded','true');input.focus();};
 cancel.onclick=()=>{box.hidden=true;reveal.hidden=false;reveal.setAttribute('aria-expanded','false');reveal.focus();};
 async function add(){
  const targetRecord=record;
  const name=input.value.trim();if(!name){error.textContent='Escribí la descripción de la firma.';input.focus();return;}
  create.disabled=cancel.disabled=true;error.textContent='';
  try{const result=await api('add_signature',{name});db.signatures=result.signatures;targetRecord.signature=result.code;if(record===targetRecord){dirty=true;if(step===5||editingField==='signature'){show();$('#signature-select')?.focus();}}}
  catch(e){error.textContent=e.message;}
  finally{create.disabled=cancel.disabled=false;}
 }
 create.onclick=add;
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(!create.disabled)add();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!cancel.disabled)cancel.click();}});
 $('#fields').append(reveal,box);
}
function showPart(){
 $('#steps').hidden=true;$('#back').disabled=false;$('#back').textContent='Cancelar';$('#draft').textContent='Guardar borrador';$('#save-error').textContent='';$('#step-counter').textContent='PARTE DEL DOCUMENTO';$('#step-title').textContent='Vinculación y notas';$('#fields').replaceChildren();
 const side=field('Parte del documento','side',RecordFields.definitions.side.options);side.oninput=()=>{record.side=side.value;dirty=true;step=0;show();};
 renderSingleField('parent');const order=field('Orden de visualización','displayOrder');order.type='number';order.min='1';order.max='9999';field('Notas','notes');$('#next').textContent='Guardar y siguiente imagen →';focusFirst();
}
function show(){ if(editingField){window.FieldDashboard.drawEditor(editingField);return;}if(record.side!=='Frente'){showPart();return;}$('#steps').hidden=false;$('#back').disabled=false;$('#draft').textContent='Guardar borrador';$('#save-error').textContent='';$('#steps').replaceChildren();titles.forEach((t,n)=>{const b=el('button',String(n+1));b.title=t;b.type='button';if(n===step)b.setAttribute('aria-current','step');b.onclick=()=>{step=n;show();};$('#steps').append(b);});$('#step-counter').textContent=`PASO ${step+1} DE ${titles.length}`;$('#step-title').textContent=titles[step];$('#fields').replaceChildren();
if(step===0){const side=field('Parte del documento','side',RecordFields.definitions.side.options);side.oninput=()=>{record.side=side.value;dirty=true;step=0;show();};identifierFields();field('Número original','number');field('Fecha (admite año, intervalo o aproximación)','date');const select=field('Vincular con otra imagen de la misma pieza (opcional)','parent',[]);for(const i of Object.values(db.images).filter(x=>x.id!==active.id))select.add(new Option((i.record.side||'Sin parte')+' · '+(i.record.number?i.record.number+' · ':'')+i.relative,i.id));select.value=record.parent||'';const order=field('Orden de visualización (1, 2, 3…)','displayOrder');order.type='number';order.min='1';order.max='9999';order.placeholder='Automático: frente, reverso, tapa, otros';$('#fields').append(el('p','Vinculá las partes entre sí; pueden formar una cadena. La grilla pública muestra solo los frentes completos. El orden menor aparece primero dentro de la ficha.'));const root=id=>{const seen=new Set();while(db.images[id]?.record?.parent&&!seen.has(id)){seen.add(id);id=db.images[id].record.parent;}return id;};const summary=el('p','');$('#fields').append(summary);const updateRelated=()=>{const piece=root(record.parent||active.id);const related=Object.values(db.images).filter(i=>i.id===active.id||root(i.id)===piece).map(i=>i.id===active.id?{...i,record:{...record}}:i).sort((a,b)=>(Number(a.record.displayOrder)||9999)-(Number(b.record.displayOrder)||9999)||a.relative.localeCompare(b.relative,'es',{numeric:true}));summary.textContent='Imágenes de esta pieza: '+related.map(i=>(i.id===active.id?'Esta imagen':i.relative)+' ('+(i.record.side||'sin parte')+', orden '+(i.record.displayOrder||'automático')+(i.status==='done'?'':', borrador: no se publica')+')').join(' · ');};updateRelated();order.oninput=()=>{record.displayOrder=order.value;dirty=true;updateRelated();};select.oninput=()=>{record.parent=select.value;dirty=true;updateRelated();};}
if(step===1){
 authorField();const kind=field('Tipo de imagen','kind',RecordFields.definitions.kind.options);
 const portraitFields=el('div','');portraitFields.id='portrait-fields';$('#fields').append(portraitFields);
 for(const [label,key]of [['Tipo de retrato','portrait'],['Encuadre','frame'],['Orientación del rostro','direction']]){const input=field(label,key,RecordFields.definitions[key].options);portraitFields.append(input.parentElement);}
 const updatePortrait=()=>{portraitFields.hidden=record.kind!=='Retrato';};updatePortrait();
 kind.oninput=()=>{record.kind=kind.value;dirty=true;updatePortrait();};
 field('Ambiente','environment',RecordFields.definitions.environment.options);field('Color','color',RecordFields.definitions.color.options);
}
if(step>=2&&step<=4){tags(['people','objects','highlights'][step-2]);if(step===2)namesField();}
if(step===5)signatureFields();
if(step===6){const dl=el('dl','');const labels={identifier:'Identificador único',author:'Autor / fotógrafo',identifiedPeople:'Personas identificadas',side:'Parte',number:'Número',date:'Fecha',kind:'Imagen',portrait:'Retrato',frame:'Encuadre',direction:'Orientación',environment:'Ambiente',color:'Color',displayOrder:'Orden de visualización',parent:'Imagen vinculada',people:'Personas',objects:'Objetos',highlights:'Destacados',signature:'Firma del estudio'};for(const[k,label]of Object.entries(labels)){let v=k==='signature'?((db.signatures||{})[record[k]]?(/^[A-Z]+-\d+$/.test(record[k]||'')?record[k]+' · ':'')+db.signatures[record[k]]:''):record[k];if(Array.isArray(v))v=v.join(', ');if(v){dl.append(el('dt',label),el('dd',v));}}$('#fields').append(dl);field('Notas','notes');}
$('#back').textContent=step?'← Anterior':'Cancelar';$('#next').textContent=step===titles.length-1?'Guardar y siguiente imagen →':'Siguiente →';focusFirst();}
function close(){if(busy){$('#save-error').textContent='Esperá a que termine el guardado.';return;}if(dirty&&!confirm('¿Cerrar sin guardar los cambios?'))return;$('#editor').close();}
function back(){if(!editingField&&record.side!=='Frente'){close();return;}if(editingField){window.FieldDashboard.previous();return;}if(step){step--;show();}else close();}
function next(){if(!editingField&&record.side!=='Frente'){save(true);return;}if(editingField){save(true);return;}if(step<titles.length-1){step++;show();}else save(true);}
async function save(complete){if(busy)return;if(editingField){await window.FieldDashboard.save(complete);return;}record=recordForEditing(record);if(!record.side){step=0;show();$('#save-error').textContent='Elegí la parte del documento.';return;}busy=true;$('#next').disabled=$('#draft').disabled=true;try{let v=await api('save',{id:active.id,revision:active.revision||0,record,complete});db.images[active.id]=v.image;for(const k of Object.keys(defaults))db.terms[k]=[...new Set([...(db.terms[k]||[]),...(record[k]||[])])];dirty=false;let list=images(),idx=list.findIndex(x=>x.id===active.id);const following=idx>=0?list.slice(idx+1).concat(list.slice(0,idx)).find(x=>x.status!=='done'):list.find(x=>x.status!=='done');$('#editor').close();render();if(complete&&following)open(following);else $('#notice').textContent=complete?'Registro guardado en GitHub.':'Borrador guardado en GitHub.';}catch(e){$('#save-error').textContent=e.message;}finally{busy=false;$('#next').disabled=$('#draft').disabled=false;}}
$('#fields').onsubmit=e=>e.preventDefault();$('#next').onclick=next;$('#back').onclick=back;$('#close').onclick=close;$('#draft').onclick=()=>save(false);$('#editor').addEventListener('cancel',e=>{e.preventDefault();back();});$('#editor').addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Enter'&&e.ctrlKey){e.preventDefault();save(true);}else if(e.key==='Enter'&&!e.target.closest('button')&&e.target.tagName!=='TEXTAREA'){e.preventDefault();next();}});window.onbeforeunload=e=>{if(dirty){e.preventDefault();e.returnValue='';}};
for(const id of ['folder','status','search'])$('#'+id).oninput=render;
$('#resume').onclick=()=>{let i=images().find(i=>i.status!=='done');if(i)open(i);else $('#notice').textContent='No quedan pendientes en esta selección.';};

$('#editor').addEventListener('close',()=>{editingField=null;window.FieldDashboard?.release();});

async function changeMembership(targets,excluded){
 if(busy)return false;
 if(dirty){$('#save-error').textContent='Guardá los cambios de la ficha antes de retirarla.';return false;}
 busy=true;
 try{const result=await api('membership',{targets:targets.map(i=>({id:i.id,revision:i.revision||0})),excluded});for(const image of result.images)db.images[image.id]=image;$('#editor').close();$('#notice').textContent=result.images.length+(excluded?' imágenes retiradas de esta colección. Podés recuperarlas desde Retiradas.':' imágenes reincorporadas a esta colección.');return true;}
 catch(e){$('#notice').textContent=e.message;$('#save-error').textContent=e.message;return false;}
 finally{busy=false;render();}
}
$('#membership-one').onclick=()=>{if(active)changeMembership([active],!active.excluded);};
