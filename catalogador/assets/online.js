'use strict';
let collectionBusy=false;
const setNotice=text=>$('#notice').textContent=text;
function downloadBackup(){const snapshot=GithubStore.db;if(active&&dirty&&snapshot.images[active.id]){snapshot.images[active.id].record=recordForEditing(record);snapshot.images[active.id].status='draft';}const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='prodigo-'+GithubStore.id+'-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function collections(){const index=await GithubStore.list();$('#collection').replaceChildren();for(const c of index.collections)$('#collection').add(new Option(c.name,c.id));$('#collection').value=GithubStore.id;$('#view-catalog').href='../?coleccion='+encodeURIComponent(GithubStore.id);}
function guarded(){if(collectionBusy||busy){setNotice('Esperá a que termine la operación en curso.');return false;}if(dirty){setNotice('Guardá o cerrá la ficha antes de cambiar de colección.');return false;}return true;}
function lock(value){collectionBusy=value;for(const id of ['collection','new-collection','import','import-json','refresh','resume','connect'])$('#'+id).disabled=value;}
$('#backup').onclick=downloadBackup;$('#backup-current').onclick=downloadBackup;
$('#connect').onclick=()=>{if(GithubStore.connected){GithubStore.disconnect();$('#connect').textContent='Conectar GitHub';setNotice('Sesión de escritura cerrada.');return;}$('#connection-error').textContent='';$('#connection').showModal();$('#github-token').focus();};
$('#cancel-connect').onclick=()=>{$('#github-token').value='';$('#connection').close();};$('#connection').addEventListener('close',()=>$('#github-token').value='');
$('#connection-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await GithubStore.connect($('#github-token').value);$('#github-token').value='';$('#connection').close();$('#connect').textContent='Desconectar GitHub';if(!dirty){await GithubStore.open(GithubStore.id);await load();}setNotice('Conectado. Los guardados se registrarán en GitHub.');}catch(error){$('#connection-error').textContent=error.message;}finally{b.disabled=false;}};
$('#new-collection').onclick=()=>{if(!guarded())return;try{GithubStore.requireAuth();$('#collection-error').textContent='';$('#collection-dialog').showModal();$('#collection-name').focus();}catch(e){setNotice(e.message);}};
$('#cancel-collection').onclick=()=>$('#collection-dialog').close();$('#collection-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await GithubStore.create($('#collection-name').value.trim());await collections();await load();$('#collection-dialog').close();setNotice('Colección creada. Ya podés leer su carpeta de imágenes.');}catch(error){$('#collection-error').textContent=error.message;}finally{e.submitter.disabled=false;}};
$('#collection').onchange=async e=>{if(!guarded()){e.target.value=GithubStore.id;return;}lock(true);try{await GithubStore.open(e.target.value);await load();await collections();setNotice('Colección cargada.');}catch(error){setNotice(error.message);e.target.value=GithubStore.id;}finally{lock(false);}};
$('#refresh').onclick=async()=>{if(!guarded())return;lock(true);try{await GithubStore.open(GithubStore.id);await load();setNotice('Colección actualizada.');}catch(e){setNotice(e.message);}finally{lock(false);}};
$('#import').onclick=()=>{if(!guarded())return;try{GithubStore.requireAuth();$('#local-folder').click();}catch(e){setNotice(e.message);}};
$('#local-folder').onchange=async event=>{
 const files=[...event.target.files].filter(f=>/\.(tiff?|jpe?g|png|webp)$/i.test(f.name));event.target.value='';if(!files.length)return;
 if(!guarded())return;lock(true);let saved=0,skipped=0;
 try{
  GithubStore.requireAuth();let next=GithubStore.db,extra=[],batch=0;
  for(let n=0;n<files.length;n++){
   const file=files[n],parts=(file.webkitRelativePath||file.name).split('/'),rootName=parts.length>1?parts.shift():'Imágenes',relative=parts.join('/');
   if(parts.includes('.bixio-vistas')){skipped++;continue;}
   const folder=await OnlineImages.hash(rootName);next.folders[folder]={name:rootName,path:rootName};
   const candidates=Object.values(next.images).filter(i=>i.relative===relative),matching=candidates.filter(i=>next.folders[i.folder]?.name===rootName);
   if(matching.length>1||!matching.length&&candidates.length>1)throw Error('Hay rutas repetidas para '+relative+'. Elegí una carpeta más específica.');
   const previous=matching[0]||(candidates.length===1?candidates[0]:null),id=previous?.id||await OnlineImages.hash(rootName+'/'+relative),fingerprint=(await OnlineImages.hash(file.size+':'+file.lastModified)).slice(0,16);
   if(previous?.media&&previous.fingerprint===fingerprint){skipped++;continue;}
   setNotice(`Preparando y subiendo ${n+1} de ${files.length} · ${relative}`);
   const prepared=await OnlineImages.prepare(file),image=previous?{...previous,folder,fingerprint}:{id,relative,folder,status:'pending',record:{},revision:0,fingerprint};
   extra.push(...await GithubStore.imageEntries(image,prepared.thumb,prepared.full));next.images[id]=image;batch++;
   if(batch===5||n===files.length-1){await GithubStore.commit(next,extra);saved+=batch;batch=0;extra=[];next=GithubStore.db;await load();}
  }
  if(batch){await GithubStore.commit(next,extra);saved+=batch;await load();}
  setNotice(`${saved} imágenes guardadas en GitHub. ${skipped} ya disponibles o vistas auxiliares omitidas.`);
 }catch(e){setNotice(`${e.message} Se conservaron ${saved} imágenes de esta lectura. Podés volver a elegir la carpeta para retomar.`);}finally{await collections().catch(()=>{});lock(false);}
};
$('#import-json').onclick=()=>{if(!guarded())return;try{GithubStore.requireAuth();$('#json-file').click();}catch(e){setNotice(e.message);}};
$('#json-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file||!guarded())return;lock(true);try{
 const source=JSON.parse(await file.text());if(!source.images||typeof source.images!=='object')throw Error('El archivo no es un respaldo del catalogador.');
 let next=GithubStore.db,added=0;for(const [oldId,image]of Object.entries(source.images)){
  if(!image||typeof image.relative!=='string')throw Error('El JSON contiene una ruta de imagen inválida.');
  const id=/^[a-f0-9]{64}$/.test(oldId)?oldId:await OnlineImages.hash(oldId);
  if(next.images[id])continue;
  const oldFolder=source.folders?.[image.folder],name=oldFolder?.name||String(oldFolder?.path||'Imágenes').split(/[\\/]/).pop(),folder=await OnlineImages.hash(name);next.folders[folder]={name,path:name};
  next.images[id]={id,relative:image.relative,folder,excluded:!!image.excluded,status:['done','draft','pending'].includes(image.status)?image.status:'pending',record:{...image.record},fieldReviews:{...(image.fieldReviews||{})},revision:0};added++;
 }
 // Reasignar vínculos si el respaldo usa identificadores cortos.
 for(const image of Object.values(next.images))if(image.record.parent&&!/^[a-f0-9]{64}$/.test(image.record.parent))image.record.parent=await OnlineImages.hash(image.record.parent);
 for(const [key,value]of Object.entries(source.signatures||{})){
  if(next.signatures[key]&&next.signatures[key]!==value&&key.startsWith('BIX-'))throw Error('La firma '+key+' tiene otra descripción en esta colección. Importá en una colección nueva para conservar sus códigos.');
  next.signatures[key]=value;
 }
 next.authors=[...new Set([...(next.authors||[]),...(source.authors||[]).filter(v=>typeof v==='string')])];
 // Los respaldos antiguos no incluían el repertorio de firmas: mantener las iniciales.
 for(const key of ['people','objects','highlights'])next.terms[key]=[...new Set([...(next.terms[key]||[]),...(source.terms?.[key]||[])])];
 await GithubStore.commit(next);await load();await collections();setNotice(`${added} fichas recuperadas. Ahora elegí Leer carpeta de imágenes para generar y publicar sus vistas.`);
 }catch(error){setNotice(error.message);}finally{lock(false);}};
(async()=>{lock(true);try{await RecordFields.loadOptions();const index=await GithubStore.list();const requested=new URLSearchParams(location.search).get('coleccion');const selected=index.collections.find(c=>c.id===requested)||index.collections[0];if(selected)await GithubStore.open(selected.id);await collections();await load();setNotice('Elegí una colección. Conectá GitHub para guardar cambios.');}catch(e){setNotice(e.message);}finally{lock(!RecordFields.ready);}})();
