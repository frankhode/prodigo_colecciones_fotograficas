'use strict';
const groups=Object.fromEntries(['tipo','retrato','encuadre','orientacion','color','objetos','destacados','autores','identificados','personas','composicion','ambiente','detalles','marca'].map(key=>[key,[]]));
let sortKey="catalog",sortDescending=false;
let sourceVersion=0,yearFloor=0,yearCeiling=0;
const label=Object.fromEntries(Object.values(groups).flat());let data=[],shown=[],chosen=new Set(),yearMin=yearFloor,yearMax=yearCeiling,panel=null,activeIndex=-1,flipped=false,zoom=1,panX=0,panY=0,down=null,pointers=new Map(),pinchStart=null;
const $=id=>document.getElementById(id);
const gallery=$('gallery'),viewer=$('viewer'),big=$('big'),stage=$('stage');
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function matches(d,ignoreGroup=null){for(const [g,options] of Object.entries(groups)){if(g===ignoreGroup)continue;const active=options.map(x=>x[0]).filter(x=>chosen.has(x));if(active.length && !active.some(x=>g==='marca'?(Array.isArray(d.brand)?d.brand.includes(x):d.brand===x):d.tags.includes(x)))return false;}return yearMin===yearFloor&&yearMax===yearCeiling||d.year!==null&&d.year<=yearMax&&(d.yearTo??d.year)>=yearMin;}
function render(){shown=window.CatalogSort?window.CatalogSort.sort(data.filter(matches),sortKey,sortDescending,groups,data):data.filter(matches);gallery.innerHTML=shown.map((d,i)=>`<button class="tile" data-i="${i}" aria-label="Abrir fotografía ${esc(d.id)}"><span class="tile-image"><img src="${esc(d.thumb)}" alt="Fotografía ${esc(d.id)}, ${esc(d.dateText||("c. "+d.year))}" loading="lazy" decoding="async" width="${d.w}" height="${d.h}"><span class="loupe"><span class="loupe-inner">⌕</span></span></span><span class="tile-meta"><span>${esc(d.dateText||d.record?.date||'Sin fecha')}</span><span>N.º ${esc(d.record?.number||'—')}</span></span></button>`).join('');window.BixioImport?.bindGallery();$('counter').textContent=`${shown.length} FOTOGRAFÍAS`;$('empty').hidden=shown.length!==0;const isFiltered=chosen.size||yearMin!==yearFloor||yearMax!==yearCeiling;$('reset').hidden=!isFiltered;document.querySelectorAll('.filter-chip').forEach(b=>{if(b.dataset.group==='all')b.classList.toggle('selected',!isFiltered);else b.classList.toggle('has-selection',b.dataset.group==='fechas'?(yearMin!==yearFloor||yearMax!==yearCeiling):(groups[b.dataset.group]||[]).some(x=>chosen.has(x[0])))});updateFilterChips();if(panel&&panel!=='fechas')renderOptions();$('active').innerHTML=[...chosen].map(k=>`<button class="tag" data-tag="${esc(k)}">${esc(label[k])} ✕</button>`).join('')+((yearMin!==yearFloor||yearMax!==yearCeiling)?`<button class="tag" data-tag="fecha">${yearMin} — ${yearMax} ✕</button>`:'');}
function reset(){chosen.clear();yearMin=yearFloor;yearMax=yearCeiling;panel=null;$('filter-panel').hidden=true;closeFilters(false);render()}
const groupNames={all:'Todas',autores:'Autores',identificados:'Personas identificadas',personas:'Personas',tipo:'Tipo de imagen',retrato:'Tipo de retrato',encuadre:'Encuadre',orientacion:'Orientación',color:'Color',ambiente:'Ambiente',objetos:'Objetos',destacados:'Destacados',composicion:'Composición',detalles:'Detalles',marca:'Firma del estudio',fechas:'Período'};
const termMatch=(d,g,key)=>g==='marca'?(Array.isArray(d.brand)?d.brand.includes(key):d.brand===key):d.tags.includes(key);
function facetCounts(g){const counts=new Map((groups[g]||[]).map(([key])=>[key,0]));let total=0;for(const d of data){if(!matches(d,g))continue;let found=false;for(const [key]of counts)if(termMatch(d,g,key)){counts.set(key,counts.get(key)+1);found=true;}if(found)total++;}return {counts,total};}
function updateFilterChips(){document.querySelectorAll('.filter-chip').forEach(button=>{const g=button.dataset.group;let total=data.length,available=true;if(g==='fechas'){total=data.filter(d=>{if(!Number.isFinite(d.year))return false;for(const [group,options]of Object.entries(groups)){const active=options.filter(([key])=>chosen.has(key));if(active.length&&!active.some(([key])=>termMatch(d,group,key)))return false;}return true;}).length;available=total>0;}else if(g!=='all'){const result=facetCounts(g);total=[...result.counts.values()].filter(count=>count>0).length;available=total>0||(groups[g]||[]).some(([key])=>chosen.has(key));}const unit=g==='all'||g==='fechas'?'fotografías':'opciones';button.title=total+' '+unit;button.setAttribute?.('aria-label',(groupNames[g]||g)+': '+total+' '+unit);button.hidden=!available;button.innerHTML=esc(groupNames[g]||g)+' <span class="facet-count">'+total+'</span>'+(g==='all'?'':' <span class="down">⌄</span>');button.setAttribute?.('aria-expanded',String(panel===g));});}
function renderOptions(){
 if(!panel||panel==='fechas')return;const box=$('filter-panel'),options=box.querySelector('#facet-options');if(!options)return;
 const query=box.querySelector('#filter-search')?.value||'',normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 const {counts,total}=facetCounts(panel),eligible=(groups[panel]||[]).filter(([key])=>counts.get(key)>0||chosen.has(key));
 const values=eligible.filter(([key,text])=>normal(text+' '+key).includes(normal(query))).sort((a,b)=>Number(chosen.has(b[0]))-Number(chosen.has(a[0]))||a[1].localeCompare(b[1],'es',{numeric:true}));
 box.querySelector('#facet-summary').textContent=values.length+' de '+eligible.length+' opciones · '+total+' fotografías';
 options.innerHTML=values.length?values.map(([key,text])=>`<button class="option ${chosen.has(key)?'on':''}" data-option="${esc(key)}" aria-pressed="${chosen.has(key)}"><span>${esc(text)}</span><span class="option-count" title="Fotografías que coinciden con los demás filtros">${counts.get(key)}</span></button>`).join(''):'<p class="facet-no-results">No hay opciones para esta búsqueda y selección.</p>';
}
function setPanel(g){
 const box=$('filter-panel');if(panel===g){showFilterCategories();return;}panel=g;box.hidden=false;$('filter-categories').hidden=true;$('filter-back').hidden=false;$('filter-menu-title').textContent=groupNames[g]||g;
 if(g==='fechas'){
  box.innerHTML=`<div class="year-panel"><strong id="yr-start">${yearMin}</strong><input id="range-start" aria-label="Desde el año" type="range" min="${yearFloor}" max="${yearCeiling}" value="${yearMin}"><span>—</span><input id="range-end" aria-label="Hasta el año" type="range" min="${yearFloor}" max="${yearCeiling}" value="${yearMax}"><strong id="yr-end">${yearMax}</strong></div>`;
  box.querySelector('#range-start').addEventListener('input',e=>{yearMin=Math.min(+e.target.value,yearMax);box.querySelector('#yr-start').textContent=yearMin;render()});box.querySelector('#range-end').addEventListener('input',e=>{yearMax=Math.max(+e.target.value,yearMin);box.querySelector('#yr-end').textContent=yearMax;render()});
 }else{
  box.innerHTML=`<div class="facet-toolbar"><strong>${esc(groupNames[g]||g)}</strong><span id="facet-summary"></span><button data-clear-group="${esc(g)}" class="facet-clear">Limpiar filtro</button><button data-close-filter class="facet-close" aria-label="Cerrar filtro">✕</button></div><label class="facet-search" ${(groups[g]||[]).length<8?'hidden':''}>Buscar opción<input id="filter-search" type="search" placeholder="Escribí para buscar en esta lista" autocomplete="off"></label><div id="facet-options" class="options"></div>`;
  box.querySelector('#filter-search').addEventListener('input',renderOptions);renderOptions();
 }
 updateFilterChips();
}
function closeFilters(focus=true){$('filter-menu').hidden=true;$('filter-toggle').setAttribute('aria-expanded','false');if(focus)$('filter-toggle').focus();}
function showFilterCategories(){panel=null;$('filter-panel').hidden=true;$('filter-categories').hidden=false;$('filter-back').hidden=true;$('filter-menu-title').textContent='Filtros';updateFilterChips();}
$('filter-toggle').onclick=()=>{if(!$('filter-menu').hidden){closeFilters();return;}showFilterCategories();$('filter-menu').hidden=false;$('filter-toggle').setAttribute('aria-expanded','true');};
$('filter-back').onclick=()=>{showFilterCategories();$('filters').querySelector('button:not([hidden])')?.focus();};
$('filter-menu-close').onclick=()=>closeFilters();
document.addEventListener('click',e=>{if(!$('filter-menu').hidden&&!$('filter-menu').contains(e.target)&&!$('filter-toggle').contains(e.target))closeFilters(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('filter-menu').hidden){closeFilters();e.preventDefault();}});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;if(b.dataset.group==='all')reset();else setPanel(b.dataset.group)});
$('filter-panel').addEventListener('click',e=>{
 if(e.target.closest('[data-close-filter]')){setPanel(panel);return;}
 if(e.target.closest('[data-clear-group]')){for(const [key]of groups[panel]||[])chosen.delete(key);render();return;}
 const button=e.target.closest('[data-option]');if(!button)return;const key=button.dataset.option;if(chosen.has(key))chosen.delete(key);else chosen.add(key);render();
 const replacement=Array.from($('filter-panel').querySelectorAll('[data-option]')).find(b=>b.dataset.option===key);replacement?.focus({preventScroll:true});
});
$('sort-order').onchange=()=>{sortKey=$('sort-order').value;render();};
$('sort-direction').onclick=()=>{sortDescending=!sortDescending;$('sort-direction').textContent=sortDescending?'↓':'↑';$('sort-direction').setAttribute('aria-pressed',String(sortDescending));render();};
$('active').addEventListener('click',e=>{const b=e.target.closest('[data-tag]');if(!b)return;if(b.dataset.tag==='fecha'){yearMin=yearFloor;yearMax=yearCeiling;}else chosen.delete(b.dataset.tag);render()});$('reset').onclick=reset;$('clear-empty').onclick=reset;$('density').onchange=()=>{gallery.dataset.size=$('density').value;};$('up').onclick=e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})};
gallery.addEventListener('click',e=>{const tile=e.target.closest('[data-i]');if(tile)openViewer(+tile.dataset.i)});
function applyZoom(){
if(zoom<=1){zoom=1;panX=0;panY=0}
else if(big.naturalWidth){
const rw=big.getBoundingClientRect().width/Math.max(zoom,0.001),rh=big.getBoundingClientRect().height/Math.max(zoom,0.001);
const maxX=Math.max(0,(rw*zoom-stage.clientWidth)/2),maxY=Math.max(0,(rh*zoom-stage.clientHeight)/2);
panX=Math.max(-maxX,Math.min(maxX,panX));panY=Math.max(-maxY,Math.min(maxY,panY));
}
big.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
$('fit').textContent=`${Math.round(zoom*100)}%`;
stage.classList.toggle('grabbing',!!down)
}function resetZoom(){zoom=1;panX=0;panY=0;applyZoom()}
function openViewer(i){activeIndex=i;flipped=false;viewer.hidden=false;document.body.style.overflow='hidden';showPhoto()}
let frameIndex=0;
function showPhoto(){frameIndex=0;pointers.clear();down=null;pinchStart=null;if(activeIndex<0||activeIndex>=shown.length)return;const d=shown[activeIndex];$('viewer-collection').textContent=d.collectionName||'Colecciones fotográficas';$('image-sequence').replaceChildren();$('image-position').textContent='';big.src=d.src;if(d.imageKey)window.BixioImport?.paint(big,d.imageKey);big.alt=`Fotografía ${d.displayId||d.id}`;$('viewer-id').textContent=(d.displayId||d.id).toUpperCase();$('date').textContent=d.dateText||`c. ${d.year}`;$('record-details').textContent=d.record?[`Fecha: ${d.dateText||d.record.date||'Sin fecha'}`,`Número original: ${d.record.number||'Sin número'}`,d.record.identifier?`Identificador único: ${d.record.identifier}`:'',(d.authors?.length||d.record.author)?`Autor: ${(d.authors||[d.record.author]).join('; ')}`:'',(d.names||d.record.identifiedPeople)?.length?'Personas: '+(d.names||d.record.identifiedPeople).join('; '):'',d.record.color,d.record.kind,d.record.portrait,d.record.frame,d.record.direction,...(d.record.people||[]),...(d.record.objects||[]),...(d.record.highlights||[]),...(d.brand||[]).map(k=>label[k]||k)].filter(Boolean).join(' · '):'';$('current').textContent=`${activeIndex+1} / ${shown.length}`;$('flip').hidden=d.sequence?d.sequence.length<2:!d.back;$('flip').innerHTML='↺ <span>Reverso</span>';resetZoom();if(d.sequence?.length)showFrame(0);}
function showFrame(index){const d=shown[activeIndex],frames=d?.sequence;if(!frames?.length)return;pointers.clear();down=null;pinchStart=null;frameIndex=(index+frames.length)%frames.length;const frame=frames[frameIndex];big.src=frame.src;big.alt=frame.side+' · '+frame.relative;if(frame.imageKey)window.BixioImport?.paint(big,frame.imageKey);$('flip').textContent='Siguiente imagen →';$('image-position').textContent=frame.side+' · '+(frameIndex+1)+' / '+frames.length;const nav=$('image-sequence');nav.replaceChildren();frames.forEach((f,n)=>{const button=document.createElement('button');button.type='button';button.textContent=(n+1)+'. '+f.side;button.title=f.relative;button.setAttribute('aria-pressed',String(n===frameIndex));button.onclick=()=>showFrame(n);nav.append(button);});resetZoom();}
function flip(){pointers.clear();down=null;pinchStart=null;const d=shown[activeIndex];if(d?.sequence?.length){showFrame(frameIndex+1);return;}if(!d?.back)return;flipped=!flipped;big.src=flipped?(d.backSrc||`assets/full/${d.back}.webp`):d.src;if(d.imageKey)window.BixioImport?.paint(big,flipped?d.backKey:d.imageKey);$('flip').innerHTML=flipped?'↺ <span>Frente</span>':'↺ <span>Reverso</span>';resetZoom()}
function closeViewer(){viewer.hidden=true;document.body.style.overflow='';pointers.clear();down=null;pinchStart=null}
function navigate(step){activeIndex=(activeIndex+step+shown.length)%shown.length;flipped=false;showPhoto()}
$('close').onclick=closeViewer;$('prev').onclick=()=>navigate(-1);$('next').onclick=()=>navigate(1);$('flip').onclick=flip;$('zoom-in').onclick=()=>{zoom=Math.min(zoom*1.35,8);applyZoom()};$('zoom-out').onclick=()=>{zoom=Math.max(1,zoom/1.35);if(zoom===1)panX=panY=0;applyZoom()};$('fit').onclick=resetZoom;$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else viewer.requestFullscreen?.()};
big.addEventListener('load',applyZoom);window.addEventListener('resize',()=>{if(!viewer.hidden)applyZoom()});
stage.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(1,Math.min(8,zoom*(e.deltaY>0?.87:1.15)));if(zoom===1)panX=panY=0;applyZoom()},{passive:false});stage.addEventListener('dblclick',e=>{zoom=zoom>1?1:2.5;panX=panY=0;applyZoom()});
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){down={x:e.clientX,y:e.clientY,px:panX,py:panY,time:Date.now()}}else if(pointers.size===2){const p=[...pointers.values()];pinchStart={dist:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom};down=null}});
stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinchStart){const p=[...pointers.values()];zoom=Math.max(1,Math.min(8,pinchStart.zoom*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/Math.max(1,pinchStart.dist)));if(zoom===1)panX=panY=0;applyZoom()}else if(down&&zoom>1){panX=down.px+e.clientX-down.x;panY=down.py+e.clientY-down.y;applyZoom()}});
let lastTapAt=0;
function endPointer(e){if(!pointers.has(e.pointerId))return;const first=down;pointers.delete(e.pointerId);if(first&&e.pointerType==='touch'&&Date.now()-first.time<550){const dx=e.clientX-first.x,dy=e.clientY-first.y;if(zoom===1&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.2)navigate(dx<0?1:-1);else if(Math.abs(dx)<18&&Math.abs(dy)<18&&pointers.size===0){const now=Date.now();if(now-lastTapAt<330){zoom=zoom>1?1:2.5;panX=panY=0;lastTapAt=0}else lastTapAt=now}}if(pointers.size<2)pinchStart=null;if(!pointers.size)down=null;applyZoom()}
stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
document.addEventListener('keydown',e=>{if(viewer.hidden)return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowRight')navigate(1);if(e.key==='ArrowLeft')navigate(-1);if(e.key==='+'||e.key==='=')$('zoom-in').click();if(e.key==='-')$('zoom-out').click();if(e.key==='r'||e.key==='R')flip()});


function installCatalog(items,facets){
 data=items;for(const key of Object.keys(groups))groups[key]=facets[key]||[];
 for(const key of Object.keys(label))delete label[key];Object.assign(label,Object.fromEntries(Object.values(groups).flat()));
 const years=items.flatMap(i=>[i.year,i.yearTo]).filter(Number.isFinite);yearFloor=years.length?Math.min(...years):0;yearCeiling=years.length?Math.max(...years):0;
 $('period-label').textContent=years.length?`${yearFloor} — ${yearCeiling}`:'Sin fechas consignadas';
 document.querySelectorAll('[data-group]').forEach(b=>{const key=b.dataset.group;b.hidden=key!=='all'&&(key==='fechas'?!years.length:!groups[key]?.length);});reset();
}
