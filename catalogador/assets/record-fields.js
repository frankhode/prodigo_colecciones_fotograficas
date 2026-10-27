'use strict';
// Definiciones compartidas por la ficha y el panel de revisión por campos.
const RecordFields=(()=>{
 const definitions={
  identifier:{label:'Identificador único',type:'identifier'},author:{label:'Autor / fotógrafo',type:'author'},identifiedPeople:{label:'Personas identificadas',type:'names'},
  parent:{label:'Imagen vinculada',type:'link'},color:{label:'Color',options:[]},displayOrder:{label:'Orden de visualización'},side:{label:'Parte del documento',options:[]},number:{label:'Número original'},date:{label:'Fecha'},
  kind:{label:'Tipo de imagen',options:[]},portrait:{label:'Tipo de retrato',options:[],portraitOnly:true},
  frame:{label:'Encuadre',options:[],portraitOnly:true},direction:{label:'Orientación',options:[],portraitOnly:true},
  environment:{label:'Ambiente',options:[]},people:{label:'Personas: categorías',type:'tags'},objects:{label:'Objetos',type:'tags'},highlights:{label:'Destacados',type:'tags'},signature:{label:'Firma del estudio',type:'signature'},notes:{label:'Notas'}
 };
 let configured=false,terms={};
 function configure(source){
  const parsed={options:{},terms:{}};
  for(const [section,keys] of Object.entries({options:['side','kind','portrait','frame','direction','environment','color'],terms:['people','objects','highlights']})){
   for(const key of keys){const list=source?.[section]?.[key];if(!Array.isArray(list)||list.some(v=>typeof v!=='string'||!v.trim()||v.length>300)||new Set(list.map(v=>v.trim())).size!==list.length)throw Error('options.json: lista inválida en '+section+'.'+key);parsed[section][key]=list.map(v=>v.trim());}
  }
  if(!parsed.options.side.length)throw Error('options.json: la lista side no puede estar vacía.');
  for(const [key,list]of Object.entries(parsed.options))definitions[key].options=list;
  terms=parsed.terms;configured=true;
 }
 async function loadOptions(){
  try{const response=await fetch('https://raw.githubusercontent.com/frankhode/prodigo-catalogador/main/options.json?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('archivo no disponible');configure(await response.json());}
  catch(error){configured=false;throw Error('No se pudo cargar options.json. '+error.message+' Corregí el archivo y recargá la página.');}
 }
 function validateOptions(record,previous={}){
  if(!configured)throw Error('Primero debe cargarse options.json.');
  for(const [key,definition] of Object.entries(definitions))if(definition.options&&record[key]&&!definition.options.includes(record[key])&&record[key]!==previous[key])throw Error('Elegí un valor del listado de '+definition.label+'.');
 }
 if(typeof module!=='undefined'&&module.exports)configure(require('../options.json'));
 const has=value=>Array.isArray(value)?value.some(v=>String(v).trim()):value!==undefined&&value!==null&&String(value).trim()!=='';
 const value=(image,key)=>image.record?.[key];
 const partFields=new Set(['side','parent','displayOrder','notes']);
 const applicable=(image,key)=>partFields.has(key)||image.record?.side==='Frente'&&(!definitions[key]?.portraitOnly||image.record?.kind==='Retrato');
 function text(image,key,db){const v=value(image,key);if(!has(v))return 'Sin dato';if(key==='parent')return db.images?.[v]?.relative||v;if(key==='signature')return db.signatures?.[v]||v;return Array.isArray(v)?v.join(' · '):String(v);}
 function stats(images,key){const list=images.filter(i=>applicable(i,key));return {total:list.length,filled:list.filter(i=>has(value(i,key))).length,reviewed:list.filter(i=>i.fieldReviews?.[key]).length};}
 function candidates(images,key,scope){return images.filter(i=>applicable(i,key)&&(scope==='all'||scope==='filled'&&has(value(i,key))||scope==='unreviewed'&&!i.fieldReviews?.[key]||scope==='missing'&&!has(value(i,key))&&!i.fieldReviews?.[key]));}
 function cleanNames(value){if(!Array.isArray(value))throw Error('Indicá un nombre por línea.');if(value.length>100)throw Error('Hay demasiados nombres en esta imagen.');return [...new Set(value.map(v=>{if(typeof v!=='string'||v.length>300)throw Error('Nombre de persona inválido.');return v.trim();}).filter(Boolean))];}
 function normalize(record){
  const next={...record};
  for(const key of ['identifier','author'])if(key in next){if(typeof next[key]!=='string'||next[key].length>300)throw Error('Valor inválido para '+definitions[key]?.label+'.');next[key]=next[key].trim();}
  if('displayOrder' in next){if(next.displayOrder==='')next.displayOrder='';else {const n=Number(next.displayOrder);if(!Number.isInteger(n)||n<1||n>9999)throw Error('El orden debe ser un número entre 1 y 9999.');next.displayOrder=n;}}
  if('identifiedPeople'in next)next.identifiedPeople=cleanNames(next.identifiedPeople);
  return next;
 }
 function validateIdentifier(db,id,record){
  const images={...db.images,[id]:{...db.images[id],record}};
  const root=start=>{let current=start;const seen=new Set();while(images[current]?.record?.parent){if(seen.has(current))throw Error('El vínculo forma un ciclo. Elegí otra imagen o dejá la pieza sin vínculo.');seen.add(current);current=images[current].record.parent;}return current;};
  const ownRoot=root(id);if(!record.identifier)return;const key=record.identifier.toLocaleUpperCase();
  for(const other of Object.values(images))if(other.id!==id&&String(other.record?.identifier||'').trim().toLocaleUpperCase()===key&&root(other.id)!==ownRoot)throw Error('El identificador '+record.identifier+' ya pertenece a '+(other.record.number||other.relative)+'. Solo los archivos de una misma pieza vinculada pueden compartirlo.');
 }
 const bulkAllowed=key=>!!definitions[key]?.options||['author','signature'].includes(key);
 return {definitions,bulkAllowed,configure,loadOptions,validateOptions,get ready(){return configured;},get terms(){return terms;},has,value,applicable,text,stats,candidates,cleanNames,normalize,validateIdentifier};
})();
if(typeof module!=='undefined')module.exports=RecordFields;
