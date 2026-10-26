'use strict';
const CatalogSort=(()=>{
 const compare=(a,b)=>String(a).localeCompare(String(b),'es',{numeric:true,sensitivity:'base'});
 const number=item=>String(item.record?.number||'').trim();
 function value(item,key,groups){
  if(key==='fecha')return Number.isFinite(item.year)?item.year:null;
  if(key==='numero')return number(item)||null;
  if(key==='coleccion')return item.collectionName||null;
  const terms=(groups[key]||[]).filter(([id])=>key==='marca'?(Array.isArray(item.brand)?item.brand.includes(id):item.brand===id):(item.tags||[]).includes(id)).map(([,text])=>text).sort(compare);
  return terms.length?terms.join(' · '):null;
 }
 // Reference years are calculated from the full collection, before applying filters.
 function chronology(items){
  const collection=i=>i.collectionId||i.collectionName||'';
  const numeric=i=>{const s=number(i);return /^\d+(?:[.,]\d+)?$/.test(s)?Number(s.replace(',','.')):null;};
  const anchors=new Map();
  for(const i of items){const n=numeric(i);if(n!==null&&Number.isFinite(i.year)){const k=collection(i);if(!anchors.has(k))anchors.set(k,[]);anchors.get(k).push({n,y:i.year});}}
  for(const [k,a] of anchors){a.sort((a,b)=>a.n-b.n||a.y-b.y);const merged=[];for(const p of a){const last=merged.at(-1);if(last&&last.n===p.n){last.sum+=p.y;last.count++;last.y=last.sum/last.count;}else merged.push({...p,sum:p.y,count:1});}anchors.set(k,merged);}
  return new Map(items.map(i=>{
   if(Number.isFinite(i.year))return [i,i.year];
   const n=numeric(i),a=anchors.get(collection(i))||[];
   if(n===null||!a.length)return [i,null];
   const upper=a.findIndex(p=>p.n>=n);
   if(upper>=0&&a[upper].n===n)return [i,a[upper].y];
   // Interpolate between references; beyond the known range keep the inferred
   // position immediately outside the nearest reference, without inventing dates.
   if(upper===0)return [i,a[0].y-0.5+Math.atan(n-a[0].n)/Math.PI];
   if(upper===-1)return [i,a.at(-1).y+0.5+Math.atan(n-a.at(-1).n)/Math.PI];
   const lo=a[upper-1],hi=a[upper];
   return [i,hi.y>=lo.y?lo.y+(hi.y-lo.y)*(n-lo.n)/(hi.n-lo.n):null];
  }));
 }
 function sort(items,key='catalog',descending=false,groups={},referenceItems=items){
  if(key==='catalog')return descending?[...items].reverse():items;
  const dates=key==='fecha'?chronology(referenceItems):null;
  return [...items].sort((a,b)=>{
   const av=dates?dates.get(a):value(a,key,groups),bv=dates?dates.get(b):value(b,key,groups),missingA=av===null,missingB=bv===null;
   if(missingA!==missingB)return missingA?1:-1;
   const direction=descending?-1:1;
   if(!missingA){const result=key==='fecha'?av-bv:compare(av,bv);if(result)return result*direction;}
   // Original numbers break ties; records without a usable reference remain last.
   const an=number(a),bn=number(b);if(!!an!==!!bn)return an?-1:1;
   return (compare(an,bn)||compare(a.collectionName||'',b.collectionName||'')||compare(a.displayId||a.id,b.displayId||b.id))*direction;
  });
 }
 return {sort};
})();
if(typeof window!=='undefined')window.CatalogSort=CatalogSort;
if(typeof module!=='undefined')module.exports=CatalogSort;
