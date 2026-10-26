'use strict';
// Lectura pública del repositorio del catalogador. No usa tokens.
window.BixioRemote=(()=>{
 const ROOT='https://raw.githubusercontent.com/frankhode/prodigo-catalogador/main/';
 let current='all',lastVersion=null,reading=false,registry=null,retryTimer=null;
 const status=$('import-status'),select=$('live-collection');
 function safeMedia(path){return typeof path==='string'&&/^media\/[a-z0-9-]+\/[a-f0-9]+-[a-f0-9]+(?:-thumb)?\.(webp|jpg)$/.test(path)?ROOT+path:BixioFormat.blank;}
 async function json(path,key){const response=await fetch(ROOT+path+'?v='+encodeURIComponent(key)+'&fresh='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('No se pudo actualizar el catálogo online.');return response.json();}
 function options(index){const before=select.value;select.replaceChildren(new Option('Todas las colecciones','all'));for(const c of index.collections)select.add(new Option(c.name,c.id));select.value=current||before||'all';}
 async function update(force=false){
  if(!current||reading)return;if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}reading=true;const requested=current;
  try{
   registry=await json('data/index.json',Date.now());if(current!==requested)return;options(registry);
   const selected=requested==='all'?registry.collections:registry.collections.filter(c=>c.id===requested);
   if(!selected.length&&requested!=='all')throw Error('Colección inexistente.');
   const signature=JSON.stringify(selected.map(c=>[c.id,c.name,c.version]));
   if(!force&&signature===lastVersion)return;
   const results=await Promise.all(selected.map(async meta=>{
    if(!/^data\/collections\/[a-z0-9-]+\.json$/.test(meta.path))throw Error('Ruta de colección inválida.');
    const source=await json(meta.path,meta.version);
    if(source.version!==meta.version){const error=Error('GitHub está propagando el último guardado. Se reintentará automáticamente.');error.retry=true;throw error;}
    const ready=Object.fromEntries(Object.entries(source.images).filter(([,image])=>image.status==='done'&&image.media?.src&&image.media?.thumb));
    const result=Object.keys(ready).length?BixioFormat.convert({...source,images:ready},source.images):{items:[],facets:{}};
    const key=id=>meta.id+'::'+id;
    // Las firmas son autoridades de cada colección; sus códigos pueden repetirse.
    if(result.facets.marca)result.facets.marca=result.facets.marca.map(([id,label])=>[key(id),label+' · '+meta.name]);
    for(const item of result.items){
     const image=ready[item.id];item.src=safeMedia(image.media.src);item.thumb=safeMedia(image.media.thumb);item.w=image.media.w;item.h=image.media.h;
     item.collectionId=meta.id;item.collectionName=meta.name;item.id=key(item.id);item.brand=item.brand.map(key);delete item.imageKey;delete item.backKey;
     for(const frame of item.sequence||[]){const media=ready[frame.id].media;frame.src=safeMedia(media.src);frame.thumb=safeMedia(media.thumb);frame.id=key(frame.id);delete frame.imageKey;}
     if(item.back){item.backSrc=safeMedia(ready[item.back]?.media?.src);item.back=key(item.back);}
    }
    return result;
   }));
   if(current!==requested)return;
   const result={items:results.flatMap(r=>r.items),facets:{}};
   for(const r of results)for(const [group,values]of Object.entries(r.facets)){
    const merged=new Map([...(result.facets[group]||[]),...values]);
    result.facets[group]=[...merged].sort((a,b)=>a[1].localeCompare(b[1],'es',{numeric:true}));
   }
   const name=requested==='all'?'Colecciones fotográficas':selected[0].name;
   const wasOpen=!viewer.hidden,previous=wasOpen?shown[activeIndex]?.id:null;
   window.BixioImport?.deactivate();sourceVersion++;installCatalog(result.items,result.facets);
   if(previous){const index=shown.findIndex(i=>i.id===previous);if(index>=0)openViewer(index);else closeViewer();}
   $('collection-name-display').textContent=name;lastVersion=signature;
   status.hidden=true;$('viewer-sync-status').hidden=true;
  }catch(e){status.hidden=false;status.textContent=e.message+' Se conserva la vista anterior.';$('viewer-sync-status').textContent=status.textContent;$('viewer-sync-status').hidden=false;if(e.retry&&current===requested)retryTimer=setTimeout(()=>{retryTimer=null;update(true);},3000);}finally{reading=false;if(current&&current!==requested)queueMicrotask(()=>update(true));}
 }
 function stop(){current=null;lastVersion=null;select.value='local';}
 
 select.onchange=()=>{current=select.value;lastVersion=null;update(true);};
 const params=new URLSearchParams(location.search);
 current=params.get('coleccion')||'all';update(true);
 setInterval(()=>{if(!document.hidden)update();},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 return {stop,update};
})();
