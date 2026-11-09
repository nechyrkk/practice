import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
const originals = JSON.parse(await readFile(new URL('../data/originals.json', import.meta.url)));
const authored = JSON.parse(await readFile(new URL('../data/generated.json', import.meta.url)));
const sets = JSON.parse(await readFile(new URL('../data/author-sets.json', import.meta.url)));
const root = new URL('../', import.meta.url);
const letters = ['А','Б','В','Г','Д'];
const days = ['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
// Separate solvers: no generator functions or stored answer values are used.
function* permute(a, k=0) {
  if (k===a.length) { yield [...a]; return; }
  for(let i=k;i<a.length;i++) { [a[k],a[i]]=[a[i],a[k]]; yield* permute(a,k+1); [a[k],a[i]]=[a[i],a[k]]; }
}
const orders = [...permute([0,1,2,3,4,5])];
const tables = [...permute([1,2,3,4,5,6,7,8,9])].filter(a =>
  a.every((n,i)=>(i%3===2||n<a[i+1])&&(i>=6||n>a[i+3])));
assert.equal(tables.length,42);
const digitSegments = ['abcefg','cf','acdeg','acdfg','bcdf','abdfg','abdefg','acf','abcdefg','abcdfg'];
const sticks = n => [...String(n)].flatMap((d,i)=>[...digitSegments[Number(d)]].map(s=>i+':'+s));
function one(values) { assert.equal(values.length,1,'answer must be uniquely determined'); return values[0]; }
function solve(task) {
  const v=task.verification;
  switch(v.type) {
    case 'digit-sum-range': { let count=0; for(let n=v.lo;n<=v.hi;n++){let x=n,sum=0;while(x){sum+=x%10;x=Math.trunc(x/10);}if(sum===v.target)count++;}return count; }
    case 'segment-difference': return sticks(v.b).length-sticks(v.a).length;
    case 'nested-operations': return [n=>n-v.minus,n=>n+v.plus,n=>n-v.minus].reduce((n,f)=>f(n),v.start);
    case 'red-shapes': return v.circles+v.redSquares;
    case 'seats': return Array.from({length:v.n},(_,i)=>i+1).filter(n=>n>Math.min(v.left,v.n-v.right+1)&&n<Math.max(v.left,v.n-v.right+1)).length;
    case 'grid-recolor': return 'Рисунок '+letters[one(v.candidates.map((a,i)=>a.every((n,j)=>n===v.mapping[v.grid[j]]) ) .flatMap((ok,i)=>ok?[i]:[]))];
    case 'apple-parts': assert.equal((v.halves*2+v.quarters)%4,0); return (v.halves*2+v.quarters)/4;
    case 'odd-digit-count': return one(task.options.filter(n=>[...n].filter(d=>'13579'.includes(d)).length%2===0));
    case 'match-moves': {
      const from=new Set(sticks(v.from)),to=new Set(sticks(v.to));
      const removed=[...from].filter(s=>!to.has(s)).length, added=[...to].filter(s=>!from.has(s)).length;
      assert.ok(removed>=added,'target must be possible without new sticks');
      return Math.min(removed,added)+Math.abs(removed-added);
    }
    case 'weekday': { const date=new Date(Date.UTC(2026,10,9+v.start,v.hour));date.setUTCHours(date.getUTCHours()+v.hours);return days[(date.getUTCDay()+6)%7]; }
    case 'gaps': { const a=Array.from({length:v.first},(_,i)=>i*v.step1),b=Array.from({length:v.second},(_,i)=>i*v.step2);return Math.abs(a.at(-1)-b.at(-1)); }
    case 'intersection': return one(Array.from({length:v.total+1},(_,both)=>both).filter(both=>v.a-both>=0&&v.b-both>=0&&v.a+v.b-both===v.total));
    case 'two-digit-rebus': {
      const answers=new Set();
      for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)if(a!==b&&10*a+b+10*b+a===v.total)answers.add(a+b);
      return one([...answers]);
    }
    case 'paper-height': return v.sheets*v.thickness/v.batch/100;
    case 'directed-paths': {
      function walk(node,seen=new Set()) { assert.ok(!seen.has(node),'graph has a cycle');if(node===v.n-1)return 1;return v.edges.filter(e=>e[0]===node).reduce((s,[,next])=>s+walk(next,new Set([...seen,node])),0); }
      return walk(0);
    }
    case 'box-fraction': { const possible=[];for(let fruit=1;fruit<=v.total;fruit++)for(let figure=1;figure<=v.total;figure++)if(fruit/v.divisor===v.loss&&fruit+figure+v.box===v.total)possible.push(figure);return one(possible); }
    case 'equal-chain': { const values=v.offsets.map(n=>100-n);return 'Буква '+letters[one(values.flatMap((n,i)=>n===Math.min(...values)?[i]:[]))]; }
    case 'euler-drawings': {
      function canTrace(edges) {
        function trail(at,mask) { if(mask===(1<<edges.length)-1)return true;return edges.some(([a,b],i)=>!(mask&(1<<i))&&(a===at||b===at)&&trail(a===at?b:a,mask|(1<<i))); }
        return [0,1,2,3].some(start=>trail(start,0));
      }
      return v.graphs.filter(canTrace).length;
    }
    case 'max-digit-composition': {
      const best=Array(v.total+1).fill(null);best[0]=0n;
      for(let sum=1;sum<=v.total;sum++)for(const digit of [v.small,v.big])if(sum>=digit&&best[sum-digit]!==null){const value=best[sum-digit]*10n+BigInt(digit);if(best[sum]===null||value>best[sum])best[sum]=value;}
      assert.notEqual(best[v.total],null);return [...String(best[v.total])].filter(d=>d===String(v.big)).length;
    }
    case 'apartment-floor': { let apartment=1;for(let floor=2;floor<=40;floor++)for(let n=0;n<(floor%2?v.odd:v.even);n++)if(apartment++===v.apartment)return floor;throw Error('apartment outside house'); }
    case 'sum-code': { let count=0;for(let a=1;a<=9;a++)for(let b=0;b<=9;b++)for(let c=0;c<=9;c++)if(String(a+b)+String(b+c)===v.code)count++;return count; }
    case 'stickers': { const sums=[];for(let a=0;a<=300;a++)for(let b=v.swap;b<=300;b++)if(a>=v.swap&&a-v.swap===b+v.swap&&a+v.swap===v.ratio*(b-v.swap))sums.push(a+b);return one(sums); }
    case 'robot': { let value=v.start,n=v.steps;while(n-->0)value+=value>=v.threshold?-v.down:v.up;return value; }
    case 'ordering': {
      const valid=orders.filter(order=>v.constraints.every(c=>{
        const a=order.indexOf(c.a),b=order.indexOf(c.b);
        return c.kind==='interior'?a!==0&&a!==5:c.kind==='before'?a<b:c.kind==='adjacent'?Math.abs(a-b)===1:Math.abs(a-b)>1;
      }));
      assert.ok(valid.length>=2);
      return 'Фишка '+letters[one([0,1,2,3,4].filter(n=>valid.every(a=>Math.abs(a.indexOf(n)-a.indexOf(v.target))===1)))];
    }
    case 'monotone-grid': {
      const valid=tables.filter(a=>Object.entries(v.fixed).every(([i,n])=>a[i]===n));
      assert.ok(valid.length>=2);
      const position=one([...new Set(valid.map(a=>a.indexOf(v.target)))]);
      assert.ok(v.target>=3&&v.target<=7);
      assert.ok(v.candidates.includes(position));return 'Клетка '+letters[v.candidates.indexOf(position)];
    }
    case 'cryptarithm-add': {
      const answers=new Set();
      for(let s=1;s<=9;s++)for(let m=0;m<=9;m++)for(let a=1;a<=9;a++)for(let r=0;r<=9;r++)for(let t=0;t<=9;t++)
        if(new Set([s,m,a,r,t]).size===5&&1000*s+100*m+10*v.u+v.v+100*a+10*r+t===v.total)answers.add(a);
      return answers.size;
    }
    default: throw Error('Unknown solver '+v.type);
  }
}
test('80 original questions match checked official keys and source hashes', async()=>{
  assert.equal(originals.length,80);
  for(const year of [2023,2024,2025,2026]){
    const manifest=JSON.parse(await readFile(new URL('data/source-'+year+'.json',root)));
    assert.equal(createHash('sha256').update(await readFile(new URL('исходники/'+manifest.file,root))).digest('hex'),manifest.sha256);
    const rows=originals.filter(t=>t.source.year===year).sort((a,b)=>a.number-b.number);
    assert.deepEqual(rows.map(t=>t.number),Array.from({length:20},(_,i)=>i+1));
    assert.deepEqual(rows.map(t=>t.correct),manifest.answerIndexes);
    assert.ok(rows.every(t=>t.source.answerVerified&&t.image.kind==='question'));
  }
});
test('20 complete authored sets contain 400 distinct tasks and usable media', async()=>{
  assert.equal(authored.length,400);assert.equal(sets.length,20);
  const ids=new Set();
  for(const task of [...originals,...authored]){
    assert.ok(!ids.has(task.id));ids.add(task.id);
    assert.equal(task.options.length,5);assert.equal(new Set(task.options).size,5);
    assert.ok(Number.isInteger(task.correct)&&task.correct>=0&&task.correct<5);
    assert.equal(task.points,task.number<=8?3:task.number<=16?4:5);
    if(task.image)await access(new URL(task.image.src,root));
  }
  for(const set of sets){
    const rows=set.taskIds.map(id=>authored.find(t=>t.id===id));
    assert.ok(rows.every(t=>t&&t.setId===set.id));
    assert.deepEqual(rows.map(t=>t.number),Array.from({length:20},(_,i)=>i+1));
  }
});
for(const type of new Set(authored.map(t=>t.verification.type))){
  test('independent solver: '+type,()=>{
    for(const task of authored.filter(t=>t.verification.type===type)){
      const expected=String(solve(task));
      assert.equal(task.options[task.correct],expected,task.id);
      assert.equal(task.options.filter(o=>o===expected).length,1,task.id);
    }
  });
}
test('published bank retains 20 numbered pools of 24 tasks and restores progress',async()=>{
  const items=new Map();
  const context=vm.createContext({crypto:webcrypto,localStorage:{getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)}});
  for(const file of ['task-bank.js','variant-engine.js'])vm.runInContext(await readFile(new URL(file,root),'utf8'),context);
    const bank=context.KANGAROO_BANK,engine=context.KangarooEngine;
    engine.validateBank(bank);assert.equal(bank.pools.length,20);
    bank.pools.forEach(p=>{
      assert.equal(p.tasks.length,24);
      assert.equal(p.tasks.filter(t=>t.source.kind==='original').length,4);
      assert.equal(p.tasks.filter(t=>t.source.kind==='author').length,20);
    });
    for(let attempt=0;attempt<30;attempt++){
      const state=engine.generate(bank);
      assert.ok(engine.tasksFor(bank,state).every((t,i)=>t.number===i+1));
      assert.equal(engine.save(bank,state),true);
      assert.equal(engine.load(bank).id,state.id);
    }
});
