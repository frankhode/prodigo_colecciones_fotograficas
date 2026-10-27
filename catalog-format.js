'use strict';
// Adaptación del respaldo XAMPP y del JSON portátil al catálogo del visor.
const BixioFormat=(()=>{
 const blank='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="650"><rect width="500" height="650" fill="#dfd4c6"/><text x="250" y="325" text-anchor="middle" fill="#705540" font-size="20">Vinculá la carpeta de imágenes</text></svg>');
 const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
 function convert(source,links=source.images){
  if(!source||typeof source!=='object'||!source.images||Array.isArray(source.images))throw Error('Elegí el JSON exportado desde el catalogador de colecciones fotográficas.');
  const all=Object.entries(source.images).map(([id,i])=>({...i,id,record:i.record&&!Array.isArray(i.record)?i.record:{}}));
  const included=all.filter(i=>!i.excluded&&i.status==='done');
  if(!included.length)throw Error('Este archivo todavía no contiene imágenes catalogadas. Guardá al menos una ficha como completa.');
  const ids=new Set(included.map(i=>i.id)),facets={personas:[],tipo:[],retrato:[],encuadre:[],orientacion:[],color:[],objetos:[],destacados:[],composicion:[],ambiente:[],detalles:[],marca:[],autores:[],identificados:[]};
  const add=(group,key,text)=>{if(!facets[group].some(x=>x[0]===key))facets[group].push([key,text]);return key;};
  const byId=new Map(included.map(i=>[i.id,i]));
  // Componentes conectados: conserva cadenas incluso si una parte intermedia es borrador.
  const adjacency=new Map(Object.keys(links).map(id=>[id,[]]));
  for(const [id,image] of Object.entries(links)){const parent=image.record?.parent;if(adjacency.has(parent)){adjacency.get(id).push(parent);adjacency.get(parent).push(id);}}
  const members=id=>{const found=new Set([id]),queue=[id];for(const key of queue)for(const next of adjacency.get(key)||[])if(!found.has(next)){found.add(next);queue.push(next);}return included.filter(x=>found.has(x.id));};
  const rank=i=>Number.isInteger(Number(i.record.displayOrder))&&Number(i.record.displayOrder)>0?Number(i.record.displayOrder):({Frente:100,Reverso:200,Tapa:300,Otros:400}[i.record.side]||500);
  const items=included.filter(i=>i.record.side==='Frente').map(i=>{
   const related=members(i.id).sort((a,b)=>rank(a)-rank(b)||a.relative.localeCompare(b.relative,'es',{numeric:true}));
   const metadata=related.filter(x=>x.record.side==='Frente');
   const r=i.record,tags=[],brands=[];
   const mark=rec=>{if(rec.signature){let key=rec.signature==='none'?'sin-marca':rec.signature==='unidentified'?'por-identificar':rec.signature;add('marca',key,(key.startsWith('BIX-')?key+' · ':'')+(source.signatures?.[rec.signature]||rec.signature));brands.push(key);}};
   for(const {record:rec} of metadata){
    for(const term of rec.people||[])tags.push(add('personas','person-'+slug(term),term));
    for(const [key,group]of Object.entries({kind:'tipo',portrait:'retrato',frame:'encuadre',direction:'orientacion',color:'color'}))if(rec[key])tags.push(add(group,key+'-'+slug(rec[key]),rec[key]));
    if(rec.environment)tags.push(add('ambiente','env-'+slug(rec.environment),rec.environment));
    for(const [key,group]of Object.entries({objects:'objetos',highlights:'destacados'}))for(const term of rec[key]||[])tags.push(add(group,key+'-'+slug(term),term));
   }
   const reverse=related.find(x=>x.record.side==='Reverso');
   for(const image of metadata){mark(image.record);if(image.record.author)tags.push(add('autores','author-'+slug(image.record.author),image.record.author));for(const term of image.record.identifiedPeople||[])tags.push(add('identificados','name-'+slug(term),term));}
   const authors=[...new Set(metadata.map(x=>x.record.author).filter(Boolean))],names=[...new Set(metadata.flatMap(x=>x.record.identifiedPeople||[]))];
   const years=(r.date||'').match(/\b\d{4}\b/g)?.map(Number)||[];
   return {sequence:related.map(x=>({id:x.id,imageKey:x.id,side:x.record.side||'Otros',relative:x.relative,record:x.record,src:blank,thumb:blank})),authors,names,id:i.id,displayId:r.identifier||r.number||i.relative,tags,brand:[...new Set(brands)],year:years[0]??null,yearTo:years[1]??years[0]??null,dateText:r.date||'Sin fecha',w:500,h:650,thumb:blank,src:blank,back:reverse?.id||null,backSrc:reverse?blank:null,record:r,backRecord:reverse?.record||null,imageKey:i.id,backKey:reverse?.id||null};
  });
  for(const values of Object.values(facets))values.sort((a,b)=>a[1].localeCompare(b[1],'es',{numeric:true}));
  return {items,facets,images:byId,source,blank};
 }
 return {convert,blank};
})();
if(typeof module!=='undefined')module.exports=BixioFormat;
