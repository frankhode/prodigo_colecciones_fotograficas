const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const map=new Map();class E{constructor(id){this.id=id;this.style={};this.dataset={};this.hidden=true;this.classList={toggle(){},add(){},remove(){}};this.events={};}replaceChildren(...v){this.children=v;}append(v){(this.children??=[]).push(v);}setAttribute(k,v){this[k]=v;}addEventListener(k,v){this.events[k]=v;}querySelectorAll(){return [];}getBoundingClientRect(){return{width:300,height:500};}}
const document={createElement:()=>new E('button'),getElementById:id=>{if(!map.has(id))map.set(id,new E(id));return map.get(id);},querySelectorAll:()=>[],body:{style:{}},addEventListener(){}};const context={document,console,window:{addEventListener(){}},IntersectionObserver:class{observe(){}unobserve(){}disconnect(){}},fetch:()=>new Promise(()=>{}),location:{reload(){}},URL,Map,Set,Number,structuredClone};vm.createContext(context);for(const file of ['catalog-format.js','app.js','import.js'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..',file),'utf8'),context);context.window.BixioImport=vm.runInContext('window.BixioImport',context);

const record=(author,color,highlights,objects,date)=>({status:'done',relative:author+color+'.tif',record:{side:'Frente',author,color,highlights,objects,date}});
const db={images:{a:record('A','sepia',['Sombrero','Sombrero'],['Libro'],'1900'),b:record('A','byn',['Bufanda'],['Libro'],'1905'),c:record('B','sepia',['Sombrero'],[],'1910'),d:record('B','byn',[],[],'')}};
context.fixture=vm.runInContext('BixioFormat',context).convert(db);
vm.runInContext('installCatalog(fixture.items,fixture.facets)',context);
const value=expression=>vm.runInContext(expression,context);
assert.equal(value("facetCounts('destacados').counts.get('highlights-sombrero')"),2);assert.equal(value("facetCounts('destacados').total"),3);
value("chosen.add('author-a');render()");assert.equal(value('shown.length'),2);assert.equal(value("facetCounts('destacados').counts.get('highlights-sombrero')"),1);
value("chosen.add('highlights-sombrero');render()");assert.equal(value('shown.length'),1);assert.equal(value("facetCounts('destacados').counts.get('highlights-bufanda')"),1);assert.equal(value("facetCounts('color').counts.get('color-byn')"),0);
value("chosen.add('highlights-bufanda');render()");assert.equal(value('shown.length'),2); // OR within group, AND between groups.
value('yearMin=1905;yearMax=1910;render()');assert.equal(value('shown.length'),1);assert.equal(value("facetCounts('destacados').counts.get('highlights-sombrero')"),0);
value('reset()');assert.equal(value('shown.length'),4);assert.equal(value("facetCounts('color').counts.get('color-byn')"),2);
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');for(const group of ['destacados','objetos','color','tipo','retrato','encuadre','orientacion'])assert(html.includes('data-group="'+group+'"'));
console.log('PASS: filtros completos, destacados separados de objetos, cantidades sin duplicados, conteos condicionados, OR/AND y períodos.');
const authorChip=new E('authors');authorChip.dataset.group='autores';
const allChip=new E('all');allChip.dataset.group='all';
document.querySelectorAll=selector=>selector==='.filter-chip'?[authorChip,allChip]:[];
value('updateFilterChips()');
assert(authorChip.innerHTML.includes('>2</span>'));
assert.equal(authorChip.title,'2 opciones');assert.equal(allChip.title,'4 fotografías');
for(const size of ['0','1','2','3']){document.getElementById('density').value=size;document.getElementById('density').onchange();assert.equal(document.getElementById('gallery').dataset.size,size);}
console.log('PASS: autores cuenta opciones, Todas cuenta fotos y se seleccionan cuatro tamaños.');
