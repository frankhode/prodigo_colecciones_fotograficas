const assert=require('node:assert/strict'),{sort}=require('../grid-sort.js');
const photo=(id,number,year,author='')=>({id,year,record:{number},tags:author?[author]:[]});
const items=[photo('a','100',null),photo('b','20',null),photo('c','10',1920,'b'),photo('d','2',1920,'a'),photo('e','',null),photo('f','9',1910)];
const ids=items=>items.map(i=>i.id).join('');
assert.equal(ids(sort(items,'fecha')),'fdcbae');assert.equal(ids(sort(items,'fecha',true)),'abcdfe');
assert.equal(ids(sort(items,'numero')),'dfcbae');
assert.equal(ids(sort(items,'autores',false,{autores:[['a','Autor A'],['b','Autor B']]})).slice(0,2),'dc');
assert.equal(ids(items),'abcdef');assert.equal(ids(sort(items,'catalog')),'abcdef');
console.log('PASS: fecha, números naturales, cronología inferida, desempates, autores y orden inverso sin mutar el catálogo.');

const example=[photo('ten','10',1920),photo('dated','',1919),photo('nine','9',null)];
assert.equal(ids(sort(example,'fecha')),'datednineten');
assert.equal(ids(sort(example,'fecha',true)),'tenninedated');
const middle=[photo('first','10',1900),photo('middle','15',null),photo('last','20',1920),photo('dated','',1915)];
assert.equal(ids(sort(middle,'fecha')),'firstmiddledatedlast');
assert.equal(ids(sort([middle[1],middle[3]],'fecha',false,{},middle)),'middledated');
const isolated=photo('other','9',null);isolated.collectionId='other';
assert.equal(ids(sort([...example,isolated],'fecha')),'datedninetenother');
console.log('PASS: referencias cronológicas, interpolación, filtros y aislamiento entre colecciones.');
