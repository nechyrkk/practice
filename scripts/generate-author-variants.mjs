import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'assets/tasks/author'), { recursive: true });
const letters = ['А', 'Б', 'В', 'Г', 'Д'];
const days = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const records = [], sets = [], fingerprints = new Set();
const svgNS = 'http://www.w3.org/2000/svg';
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(values, random) { const a = [...values]; for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const digitSum = n => [...String(n)].reduce((sum,digit)=>sum+Number(digit),0);
const allNumbers = (a,b) => Array.from({length:b-a+1},(_,i)=>i+a);
function optionsFor(answer, seed, extras = []) {
  const random = rng(seed), all = new Set([answer]);
  extras.forEach(n => { if(Number.isFinite(n) && n >= 0) all.add(n); });
  for(let distance=1;all.size<7;distance++){if(answer-distance>=0)all.add(answer-distance);all.add(answer+distance);}
  const wrong = shuffle([...all].filter(n=>n!==answer),random).slice(0,4);
  return shuffle([answer,...wrong],random).map(String);
}
function svg(body,width=600,height=220) {
  return '<svg xmlns="'+svgNS+'" viewBox="0 0 '+width+' '+height+'"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="#4b7080"/></marker></defs><g font-family="Arial,sans-serif" fill="#304d59">'+body+'</g></svg>';
}
function textSVG(text,x,y,size=24,anchor='middle') { return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="'+size+'">'+esc(text)+'</text>'; }
function graphSVG(nodes,edges,labels,width=480,height=240) {
  let body='';
  for(const [a,b] of edges){const [x1,y1]=nodes[a],[x2,y2]=nodes[b],dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy);body+='<path d="M'+(x1+dx/l*21)+' '+(y1+dy/l*21)+' L'+(x2-dx/l*24)+' '+(y2-dy/l*24)+'" stroke="#4b7080" stroke-width="2" fill="none" marker-end="url(#arrow)"/>';}
  nodes.forEach(([x,y],i)=>{body+='<circle cx="'+x+'" cy="'+y+'" r="20" fill="#dae8ed" stroke="#648895" stroke-width="1.4"/>'+textSVG(labels[i],x,y+6,18);});
  return svg(body,width,height);
}
const segments = {
  0:[0,1,2,4,5,6], 1:[2,5], 2:[0,2,3,4,6], 3:[0,2,3,5,6], 4:[1,2,3,5],
  5:[0,1,3,5,6], 6:[0,1,3,4,5,6], 7:[0,2,5], 8:[0,1,2,3,4,5,6], 9:[0,1,2,3,5,6]
};
const segmentLines=[[8,4,38,4],[4,8,4,38],[42,8,42,38],[8,42,38,42],[4,46,4,76],[42,46,42,76],[8,80,38,80]];
function matchNumber(number,x,y) {
  return [...number].map((d,i)=>segments[d].map(s=>{const [a,b,c,e]=segmentLines[s];return '<path d="M'+(x+i*52+a)+' '+(y+b)+' L'+(x+i*52+c)+' '+(y+e)+'" stroke="#567d77" stroke-width="4" stroke-linecap="round"/>';}).join('')).join('');
}
function permutations(items) { if(!items.length)return [[]]; return items.flatMap((item,i)=>permutations(items.filter((_,j)=>j!==i)).map(p=>[item,...p])); }
const sixOrders=permutations([0,1,2,3,4,5]);
// All 3x3 fillings with increasing rows and decreasing columns, generated once.
const tables=[];
function fillTable(values=[],left=allNumbers(1,9)) {
  const index=values.length;if(index===9){tables.push(values);return;}
  for(const value of left){
    if(index%3 && value<=values[index-1])continue;
    if(index>=3 && value>=values[index-3])continue;
    fillTable([...values,value],left.filter(n=>n!==value));
  }
}
fillTable();
if(tables.length!==42)throw new Error('Unexpected monotone table count');
function cryptarithm(u,v,total) {
  const result=[];
  for(let S=1;S<=9;S++)for(let M=0;M<=9;M++){
    const tail=total-(1000*S+100*M+10*u+v);
    if(tail<100||tail>999)continue;
    const A=Math.floor(tail/100),R=Math.floor(tail/10)%10,T=tail%10;
    if(new Set([S,M,A,R,T]).size===5)result.push({S,M,A,R,T});
  }
  return result;
}
function countPaths(edges,n=6) { const counts=Array(n).fill(0);counts[0]=1;for(let i=0;i<n;i++)for(const [a,b]of edges)if(a===i)counts[b]+=counts[a];return counts[n-1]; }
function connected(edges,n=4) { const seen=new Set([0]);let old=-1;while(old!==seen.size){old=seen.size;for(const[a,b]of edges){if(seen.has(a))seen.add(b);if(seen.has(b))seen.add(a);}}return seen.size===n; }
const graphSamples=[];
const undirectedEdges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
for(let mask=1;mask<64;mask++){const edges=undirectedEdges.filter((_,i)=>mask&(1<<i));if(connected(edges))graphSamples.push(edges);}

async function makeTask(t,number) {
  const random=rng(t*9931+number*131), id='author-'+String(t).padStart(2,'0')+'-'+String(number).padStart(2,'0');
  const task={id,number,points:number<=8?3:number<=16?4:5,setId:'author-'+String(t).padStart(2,'0'),source:{kind:'author',variant:t,grade:'3–4',review:'computed'},topic:'Логика'};
  let answer, diagram, alt;
  switch(number){
    case 1: {
      if(t%2){
        const lo=2000+10*t,hi=lo+29,target=digitSum(lo+13);
        const matches=allNumbers(lo,hi).filter(n=>digitSum(n)===target);
        task.topic='Сумма цифр';task.text='На ленте времени записаны все годы от '+lo+' до '+hi+' включительно. У скольких из этих чисел сумма цифр равна '+target+'?';
        answer=matches.length;task.explanation='Подходят годы '+matches.join(', ')+'. Всего их '+answer+'.';
        task.verification={type:'digit-sum-range',lo,hi,target};
      }else{
        let a,b,ca,cb;
        do{a=String(1000+Math.floor(random()*8999));b=String(1000+Math.floor(random()*8999));ca=[...a].reduce((s,d)=>s+segments[d].length,0);cb=[...b].reduce((s,d)=>s+segments[d].length,0);}while(cb<=ca||cb-ca>9);
        task.topic='Палочки';task.text='Два числа выложили из одинаковых палочек так, как показано на рисунке. На сколько палочек во втором числе больше, чем в первом?';
        answer=cb-ca;diagram=svg(matchNumber(a,35,42)+textSVG('первое',139,160,18)+matchNumber(b,335,42)+textSVG('второе',439,160,18),600,185);
        alt='Палочки образуют '+a+' и '+b+' стандартными семисегментными цифрами.';task.explanation='В первом числе '+ca+' палочек, во втором '+cb+'. Разность: '+cb+' − '+ca+' = '+answer+'.';
        task.verification={type:'segment-difference',a,b};
      }break;
    }
    case 2: {
      if(t%2===0){
        const start=18+t,plus=3+t%7,minus=2+t%5;
        task.topic='Шифры';task.text='В этом шифре круг прибавляет '+plus+', а квадрат вычитает '+minus+'. Действия выполняются изнутри наружу. Какое число получится на рисунке?';
        answer=start-minus+plus-minus;
        diagram=svg('<rect x="110" y="12" width="240" height="216" rx="4" fill="none" stroke="#547c91" stroke-width="3"/><circle cx="230" cy="120" r="85" fill="none" stroke="#78a391" stroke-width="3"/><rect x="194" y="84" width="72" height="72" rx="3" fill="#e4eef3" stroke="#547c91" stroke-width="3"/>'+textSVG(start,230,130,28),460,240);
        alt='Число '+start+' находится в квадрате, затем в круге, затем ещё в одном квадрате.';
        task.explanation=start+' − '+minus+' + '+plus+' − '+minus+' = '+answer+'.';task.verification={type:'nested-operations',start,plus,minus};
      }else{
        const circles=3+t,blue=4+t%7,redSquares=2+t%6,green=5+t%4;
        task.topic='Счёт';task.text='В коробке лежат '+circles+' красных кружков, '+blue+' синих кружков, '+redSquares+' красных квадратов и '+green+' зелёных квадратов. Сколько всего красных фигур в коробке?';
        answer=circles+redSquares;task.explanation='Складываем только красные кружки и красные квадраты: '+circles+' + '+redSquares+' = '+answer+'.';
        task.verification={type:'red-shapes',circles,redSquares};
      }break;
    }
    case 3: {
      const n=12+t,right=4+t%4,left=4+t%5;
      task.topic='Порядок';task.text='В одном ряду '+n+' мест. Аня села на '+right+'-е место справа, а Боря — на '+left+'-е место слева. Сколько свободных мест между ними, если остальные места не заняты?';
      answer=Math.abs((n-right+1)-left)-1;
      task.explanation='Место Ани слева имеет номер '+(n-right+1)+', место Бори — '+left+'. Между ними '+answer+' мест.';
      task.verification={type:'seats',n,right,left};break;
    }
    case 4: {
      task.topic='Цвета и клетки';
      const palette=['#72a998','#f4c96c','#738fb4'],mapping=[1,2,0];
      let grid;do{grid=Array.from({length:6},()=>Math.floor(random()*3));}while(new Set(grid).size<3);
      const correct=grid.map(n=>mapping[n]),candidates=[correct];
      while(candidates.length<5){const wrong=[...correct];const i=Math.floor(random()*6);wrong[i]=(correct[i]+1+Math.floor(random()*2))%3;if(!candidates.some(a=>a.join()===wrong.join()))candidates.push(wrong);}
      const ordered=shuffle(candidates,random);answer=ordered.findIndex(a=>a.join()===correct.join());
      let body=textSVG('Исходная таблица',300,25,17);
      const drawGrid=(cells,x,y,s)=>cells.map((c,i)=>'<rect x="'+(x+i%3*s)+'" y="'+(y+Math.floor(i/3)*s)+'" width="'+(s-2)+'" height="'+(s-2)+'" rx="2" fill="'+palette[c]+'" stroke="#6a8393" stroke-width="1"/>').join('');
      body+=drawGrid(grid,237,40,42);
      ordered.forEach((cells,i)=>{const x=12+i*118;body+=textSVG(letters[i],x+48,162,17)+drawGrid(cells,x,175,32);});
      diagram=svg(body,600,250);alt='Исходные цвета по строкам: '+grid.map(n=>['зелёный','жёлтый','синий'][n]).join(', ')+'. Ниже пять вариантов преобразования.';
      task.text='Каждую зелёную клетку заменили жёлтой, каждую жёлтую — синей, а каждую синюю — зелёной. Какой рисунок получился?';task.options=letters.map(letter=>'Рисунок '+letter);
      task.explanation='Меняем цвет каждой клетки на том же месте. Правильный рисунок — '+letters[answer]+'.';
      task.verification={type:'grid-recolor',grid,mapping,candidates:ordered};break;
    }
    case 5: {
      if(t%2){
        const halves=2*(2+t%4)+1,quarters=4*(1+t%3)+2;
        task.topic='Доли';task.text='Все разрезанные яблоки целиком разложили на тарелке. Получилось '+halves+' половинок и '+quarters+' четвертинок. Сколько яблок разрезали?';
        answer=halves/2+quarters/4;task.explanation='Две половинки или четыре четвертинки составляют одно яблоко. '+halves+'/2 + '+quarters+'/4 = '+answer+'.';
        task.verification={type:'apple-parts',halves,quarters};
      }else{
        const desired=(t+2)%5,choices=[];
        for(let i=0;i<5;i++){let n;do{n=String(10000+Math.floor(random()*89999));}while(choices.includes(n)||[...n].filter(d=>Number(d)%2).length%2!==(i===desired?0:1));choices.push(n);}
        task.topic='Чётность';task.text='В каком числе количество нечётных цифр чётно?';task.options=choices;answer=desired;
        const digits=[...choices[answer]].filter(d=>Number(d)%2);
        task.explanation=(digits.length?'В числе '+choices[answer]+' нечётные цифры: '+digits.join(', ')+'. Их '+digits.length:'В числе '+choices[answer]+' нет нечётных цифр. Их 0')+' — чётное количество. В остальных вариантах их нечётное количество.';
        task.verification={type:'odd-digit-count'};
      }break;
    }
    case 6: {
      let from,to,removed,added;
      do{
        from=Array.from({length:4},()=>String([0,6,8,9][Math.floor(random()*4)])).join('');
        to=String(1000+Math.floor(random()*8999));removed=0;added=0;
        [...from].forEach((digit,i)=>{removed+=segments[digit].filter(s=>!segments[to[i]].includes(s)).length;added+=segments[to[i]].filter(s=>!segments[digit].includes(s)).length;});
      }while(from[0]==='0'||removed<4||removed>12||added>removed);
      task.topic='Спички';task.text='Число '+from+' выложили палочками и хотят получить число '+to+', как на рисунке. За один ход можно убрать одну палочку или переложить одну палочку. Новые палочки добавлять нельзя. Какое наименьшее число ходов нужно?';
      answer=removed;diagram=svg(matchNumber(from,24,28)+textSVG('→',299,83,34)+matchNumber(to,357,28),590,125);alt='Два числа стандартными семисегментными цифрами: '+from+' и '+to+'.';
      task.explanation='Из исходных мест нужно убрать '+removed+' палочек. Из них '+added+' можно переложить на недостающие места, остальные убрать. Каждый ход меняет одно исходное место, поэтому меньше '+removed+' ходов не хватит.';
      task.verification={type:'match-moves',from,to};break;
    }
    case 7: {
      const start=t%7,hour=5+t%12,hours=26+5*t;
      const day=(start+Math.floor((hour+hours)/24))%7;
      task.topic='Календарь';task.text='Поход начался в день «'+days[start]+'» в '+hour+':00 и продолжался '+hours+' часов. В какой день недели он закончился?';
      task.options=shuffle([days[day],...shuffle(days.filter(d=>d!==days[day]),random).slice(0,4)],random);answer=task.options.indexOf(days[day]);
      task.explanation='Прошло '+Math.floor((hour+hours)/24)+' полных смен суток. Получается '+days[day]+', '+((hour+hours)%24)+':00.';
      task.verification={type:'weekday',start,hour,hours};break;
    }
    case 8: {
      const first=6+t,step1=5*(1+t%4),second=9+t%9,step2=10*(1+t%3);
      task.topic='Промежутки';task.text='В первой гирлянде '+first+' лампочек с промежутками по '+step1+' см, а во второй '+second+' лампочек с промежутками по '+step2+' см. На сколько сантиметров отличаются длины гирлянд от первой лампочки до последней?';
      answer=Math.abs((first-1)*step1-(second-1)*step2);
      task.explanation='Между '+first+' лампочками '+(first-1)+' промежутков, между '+second+' — '+(second-1)+'. Длины '+((first-1)*step1)+' см и '+((second-1)*step2)+' см. Разность '+answer+' см.';
      task.verification={type:'gaps',first,step1,second,step2};break;
    }
    case 9: {
      if(t%2){
        const total=17+t,both=2+t%6,a=10+t%8,b=total+both-a;
        task.topic='Множества';task.text='В кружке '+total+' учеников. Каждый решил хотя бы одну из двух задач. Первую решили '+a+' учеников, вторую — '+b+'. Сколько учеников решили обе задачи?';
        answer=both;task.explanation='При сложении '+a+' + '+b+' решившие обе задачи посчитаны дважды. Поэтому '+a+' + '+b+' − '+total+' = '+both+'.';
        task.verification={type:'intersection',total,a,b};
      }else{
        const sum=4+Math.floor(t/2),total=11*sum;
        task.topic='Числовой ребус';task.text='Разные фигуры обозначают разные ненулевые цифры. Известно, что □△ + △□ = '+total+'. Чему равна сумма □ + △?';
        answer=sum;task.explanation='В сумме каждая цифра входит один раз в разряд десятков и один раз в разряд единиц. Получается 11 × (□ + △) = '+total+'. Значит, □ + △ = '+sum+'.';
        task.verification={type:'two-digit-rebus',total};
      }break;
    }
    case 10: {
      const batch=200+50*t,thickness=2+t%5,factor=100*(1+t%4),sheets=batch*factor;
      task.topic='Масштаб';task.text='Стопка из '+batch+' одинаковых листов имеет высоту '+thickness+' см. Какой высоты в метрах будет стопка из '+sheets.toLocaleString('ru-RU')+' таких листов?';
      answer=thickness*factor/100;task.explanation='Новая стопка в '+factor+' раз выше: '+thickness+' × '+factor+' = '+(thickness*factor)+' см = '+answer+' м.';
      task.verification={type:'paper-height',batch,thickness,sheets};break;
    }
    case 11: {
      const optional=[[1,4],[2,3],[1,2],[3,4],[0,3],[2,5]],mask=t+3;
      const edges=[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],...optional.filter((_,i)=>mask&(1<<i))];
      answer=countPaths(edges);
      task.topic='Пути по стрелкам';task.text='Сколько разных путей ведёт из А в Е по стрелкам? В местах пересечения линий без кружочка поворачивать нельзя.';
      diagram=graphSVG([[36,120],[145,40],[145,200],[285,40],[285,200],[444,120]],edges,['А','Б','В','Г','Д','Е']);
      alt='Стрелки: '+edges.map(([a,b])=>['А','Б','В','Г','Д','Е'][a]+' → '+['А','Б','В','Г','Д','Е'][b]).join('; ')+'.';
      task.explanation='Для каждой вершины складываем количество путей, приходящих в неё. В конечной вершине Е получается '+answer+' путей.';
      task.verification={type:'directed-paths',edges,n:6};break;
    }
    case 12: {
      const divisor=3+t%3,loss=2+t%6,box=1+t%3,figure=3+t%5,fruit=divisor*loss,total=fruit+box+figure;
      task.topic='Масса и доли';task.text='Коробка с яблоками и деревянной фигуркой весила '+total+' кг. Когда из неё убрали 1/'+divisor+' всех яблок, масса уменьшилась на '+loss+' кг. Пустая коробка весит '+box+' кг. Сколько килограммов весит фигурка?';
      answer=figure;task.explanation='Все яблоки весят '+loss+' × '+divisor+' = '+fruit+' кг. Масса фигурки: '+total+' − '+fruit+' − '+box+' = '+figure+' кг.';
      task.verification={type:'box-fraction',divisor,loss,box,total};break;
    }
    case 13: {
      if(t%2){
        const offsets=shuffle(allNumbers(0,8),random).slice(0,5);
        task.topic='Сравнение неизвестных';task.text='Буквы обозначают числа. Известно, что '+offsets.map((n,i)=>letters[i]+' + '+n).join(' = ')+'. Какой буквой обозначено самое маленькое число?';
        task.options=letters.map(letter=>'Буква '+letter);answer=offsets.indexOf(Math.max(...offsets));
        task.explanation='Все суммы равны. Чем больше прибавляемое число, тем меньше число под буквой. Самое большое прибавляемое — '+offsets[answer]+', значит, ответ '+letters[answer]+'.';
        task.verification={type:'equal-chain',offsets};
      }else{
        const graphs=shuffle(graphSamples,random).slice(0,5);
        const can=graphs.map(edges=>{const degree=Array(4).fill(0);edges.forEach(([a,b])=>{degree[a]++;degree[b]++;});return [0,2].includes(degree.filter(n=>n%2).length);});
        answer=can.filter(Boolean).length;task.topic='Один росчерк';task.text='Сколько из пяти рисунков можно обвести, не отрывая карандаш и не проходя по одному отрезку два раза? Соединения обозначены точками; пересечения без точек соединениями не считаются.';
        let body='';
        graphs.forEach((edges,i)=>{const x=10+i*118,nodes=[[x+12,30],[x+95,30],[x+95,115],[x+12,115]];edges.forEach(([a,b])=>{body+='<path d="M'+nodes[a].join(' ')+' L'+nodes[b].join(' ')+'" fill="none" stroke="#6d7192" stroke-width="2"/>';});nodes.forEach(([cx,cy])=>{body+='<circle cx="'+cx+'" cy="'+cy+'" r="3.5" fill="#304d59"/>';});body+=textSVG(letters[i],x+53,151,16);});
        diagram=svg(body,600,175);alt='Пять графов. Условия соединений сохраняются точками на концах отрезков.';
        task.explanation='Один росчерк возможен, если у связного рисунка ровно ноль или две вершины с нечётным числом выходящих отрезков. '+(answer?'Подходят '+letters.filter((_,i)=>can[i]).join(', ')+'. Всего '+answer+'.':'Ни один из этих рисунков не подходит.');
        task.verification={type:'euler-drawings',graphs};
      }break;
    }
    case 14: {
      const small=2+t%3,big=small+1+t%2;
      let total=16+t;
      if(small%2===0&&big%2===0&&total%2)total++;
      const possibilities=[];
      for(let a=0;a<=total;a++)for(let b=0;b<=total;b++)if(a*small+b*big===total&&a+b)possibilities.push({a,b,value:String(big).repeat(b)+String(small).repeat(a)});
      possibilities.sort((a,b)=>b.value.length-a.value.length||b.value.localeCompare(a.value));
      const best=possibilities[0];if(!best)throw new Error('No digit composition');
      task.topic='Максимальное число';task.text='Из цифр '+small+' и '+big+' составляют число с суммой цифр '+total+'. Каждую цифру можно повторять. Сколько раз цифра '+big+' встретится в самом большом из таких чисел?';
      answer=best.b;task.explanation='Сначала выбираем наибольшее количество цифр, а затем ставим большие цифры в начало. Самое большое число: '+best.value+'. Цифра '+big+' встречается '+answer+' раз.';
      task.verification={type:'max-digit-composition',small,big,total};break;
    }
    case 15: {
      if(t%2){
        const even=6+t%3,odd=4+t%3,floor=6+t;
        let before=0;for(let f=2;f<floor;f++)before+=f%2?odd:even;
        const apartment=before+1+t%((floor%2)?odd:even);
        task.topic='Нумерация';task.text='В 40-этажном доме первый этаж занимают магазины. Начиная со второго этажа квартиры нумеруются подряд: на чётном этаже '+even+' квартир, на нечётном — '+odd+'. На каком этаже находится квартира '+apartment+'?';
        answer=floor;task.explanation='До этого этажа расположены квартиры с номерами от 1 до '+before+'. На '+floor+'-м этаже — от '+(before+1)+' до '+(before+((floor%2)?odd:even))+'.';
        task.verification={type:'apartment-floor',even,odd,apartment};
      }else{
        const first=3+Math.floor(t/2)%6,second=2+(Math.floor(t/2)*3)%8,code=String(first)+String(second),matches=[];
        for(let n=100;n<1000;n++){const [a,b,c]=String(n).split('').map(Number);if(String(a+b)+String(b+c)===code)matches.push(n);}
        task.topic='Шифры';task.text='Шифровальщик записывает сумму первых двух цифр трёхзначного числа и приписывает к ней сумму последних двух цифр. Например, 315 превращается в 46. Сколько трёхзначных чисел превращаются в '+code+'?';
        answer=matches.length;task.explanation='Подходящие числа: '+matches.join(', ')+'. Их '+answer+'.';
        task.verification={type:'sum-code',code};
      }break;
    }
    case 16: {
      const ratio=2+t%3,u=1+Math.floor((t-1)/4),swap=(ratio-1)*u;
      const b=(ratio+3)*u,a=b+2*swap,total=a+b;
      task.topic='Обмены';task.text='У Ани и Бори есть наклейки. Если Боря отдаст Ане '+swap+' наклеек, у Ани станет в '+ratio+' раза больше наклеек, чем у Бори. Если вместо этого Аня отдаст Боре '+swap+' наклеек, их станет поровну. Сколько всего наклеек у ребят?';
      answer=total;task.explanation='Первоначально у Ани '+a+', у Бори '+b+' наклеек. Проверка: '+(a+swap)+' = '+ratio+' × '+(b-swap)+'; '+(a-swap)+' = '+(b+swap)+'. Всего '+total+'.';
      task.verification={type:'stickers',ratio,swap};break;
    }
    case 17: {
      const threshold=100+10*t,up=6+2*(t%4),down=2+2*(t%3),start=5+2*(t%7),steps=80+7*t;
      let value=start;const seen=new Map(),values=[];let cycleStart=-1,cycleLength=0;
      for(let i=0;i<steps;i++){if(seen.has(value)&&cycleStart<0){cycleStart=seen.get(value);cycleLength=i-cycleStart;}seen.set(value,i);values.push(value);value=value<threshold?value+up:value-down;}
      task.topic='Алгоритмы';task.text='Робот начинает с числа '+start+'. За один шаг он прибавляет '+up+', если число меньше '+threshold+', а иначе вычитает '+down+'. Какое число получится после '+steps+' шагов?';
      answer=value;task.options=optionsFor(answer,t*401+number,[value-6,value-4,value-2,value+2,value+4,value+6]);task.explanation='После первых шагов значения начинают повторяться по циклу длиной '+cycleLength+'. Можно отбросить полные циклы и досчитать оставшиеся шаги. После '+steps+' шагов получится '+answer+'.';
      task.verification={type:'robot',threshold,up,down,start,steps};break;
    }
    case 18: {
      const label=['А','Б','В','Г','Д','Е'];
      let chosen,solutions,common,attempt=0;
      do{
        if(++attempt>10000)throw new Error('No ordering puzzle '+t);
        const secret=shuffle([0,1,2,3,4,5],random),position=Object.fromEntries(secret.map((n,i)=>[n,i])),pool=[];
        for(let a=0;a<6;a++){
          if(position[a]!==0&&position[a]!==5)pool.push({kind:'interior',a});
          for(let b=a+1;b<6;b++){
            if(Math.abs(position[a]-position[b])===1){if(a!==5&&b!==5)pool.push({kind:'adjacent',a,b});}
            else pool.push({kind:'apart',a,b});
            if(position[a]<position[b])pool.push({kind:'before',a,b});else pool.push({kind:'before',a:b,b:a});
          }
        }
        chosen=shuffle(pool,random).slice(0,5);
        const valid=order=>{const p=Object.fromEntries(order.map((n,i)=>[n,i]));return chosen.every(c=>c.kind==='interior'?p[c.a]>0&&p[c.a]<5:c.kind==='adjacent'?Math.abs(p[c.a]-p[c.b])===1:c.kind==='apart'?Math.abs(p[c.a]-p[c.b])!==1:p[c.a]<p[c.b]);};
        solutions=sixOrders.filter(valid);
        common=allNumbers(0,4).filter(candidate=>solutions.every(order=>Math.abs(order.indexOf(candidate)-order.indexOf(5))===1));
      }while(solutions.length<2||solutions.length>24||common.length!==1);
      const clauses=chosen.map(c=>c.kind==='interior'?'Фишка '+label[c.a]+' стоит не с краю':c.kind==='adjacent'?'Фишки '+label[c.a]+' и '+label[c.b]+' стоят рядом':c.kind==='apart'?'Фишки '+label[c.a]+' и '+label[c.b]+' не стоят рядом':'Фишка '+label[c.a]+' находится левее фишки '+label[c.b]);
      task.topic='Расположения';task.text='Шесть фишек А, Б, В, Г, Д и Е стоят в ряд.\n'+clauses.map(s=>'• '+s+'.').join('\n')+'\nКакая фишка обязательно стоит рядом с Е?';
      task.options=letters.map(letter=>'Фишка '+letter);answer=common[0];
      task.explanation='Условиям соответствуют '+solutions.length+' расположений. В каждом рядом с Е стоит '+label[answer]+'. Один из допустимых порядков: '+solutions[0].map(n=>label[n]).join(' — ')+'.';
      task.verification={type:'ordering',constraints:chosen,target:5};break;
    }
    case 19: {
      let fixed,matches,target,position,attempt=0;
      do{
        if(++attempt>10000)throw new Error('No grid puzzle '+t);
        const table=tables[Math.floor(random()*tables.length)],fixedCells=shuffle(allNumbers(0,8),random).slice(0,2+t%2);
        fixed=Object.fromEntries(fixedCells.map(i=>[i,table[i]]));
        matches=tables.filter(row=>Object.entries(fixed).every(([i,n])=>row[i]===n));
        const unseen=allNumbers(3,7).filter(n=>!Object.values(fixed).includes(n));
        target=unseen[Math.floor(random()*unseen.length)];
        const locations=new Set(matches.map(row=>row.indexOf(target)));position=[...locations][0];
        if(locations.size!==1)position=null;
      }while(position===null||matches.length<2);
      const empty=allNumbers(0,8).filter(i=>fixed[i]===undefined),candidates=[position,...shuffle(empty.filter(i=>i!==position),random).slice(0,4)].sort((a,b)=>a-b);
      answer=candidates.indexOf(position);task.options=letters.map(letter=>'Клетка '+letter);
      let body='';
      for(let i=0;i<9;i++){
        const x=160+i%3*72,y=15+Math.floor(i/3)*72;
        body+='<rect x="'+x+'" y="'+y+'" width="70" height="70" rx="4" fill="#e3eee9" stroke="#638b8b" stroke-width="1.5"/>';
        const value=fixed[i]!==undefined?fixed[i]:candidates.includes(i)?letters[candidates.indexOf(i)]:'';
        body+=textSVG(value,x+35,y+46,29);
      }
      diagram=svg(body,540,245);alt='Таблица 3 на 3. Известные клетки: '+Object.entries(fixed).map(([i,n])=>'строка '+(Math.floor(Number(i)/3)+1)+', столбец '+(Number(i)%3+1)+' — '+n).join('; ')+'.';
      task.topic='Таблица чисел';task.text='В таблицу вписывают числа от 1 до 9, каждое один раз. В строках числа возрастают слева направо, в столбцах уменьшаются сверху вниз. Несколько чисел уже вписаны. В какой клетке будет число '+target+'?';
      task.explanation='Условиям соответствуют '+matches.length+' таблицы. Во всех число '+target+' стоит в клетке '+letters[answer]+'. Пример заполнения по строкам: '+[0,1,2].map(row=>matches[0].slice(row*3,row*3+3).join(', ')).join(' / ')+'.';
      task.verification={type:'monotone-grid',fixed,target,candidates};break;
    }
    case 20: {
      let u,v,total,solutions,possible,attempt=0;
      do{
        if(++attempt>10000)throw new Error('No cryptarithm '+t);
        const [S,M,A,R,T]=shuffle(allNumbers(1,9),random).slice(0,5);
        u=Math.floor(random()*10);v=Math.floor(random()*10);
        total=1000*S+100*M+10*u+v+100*A+10*R+T;
        if(total>9999)continue;
        solutions=cryptarithm(u,v,total);possible=[...new Set(solutions.map(row=>row.A))].sort((a,b)=>a-b);
      }while(total>9999||possible.length<2||possible.length>7);
      task.topic='Числовой ребус';task.text='В ребусе СМ'+u+v+' + АРТ = '+total+' буквы С, М, А, Р и Т обозначают разные цифры. Числа не начинаются с нуля. Сколько различных значений может принимать буква А?';
      answer=possible.length;task.options=optionsFor(answer,t*401+number,allNumbers(1,9));task.explanation='Проверяем возможные первые цифры и учитываем, что все пять букв обозначают разные цифры. Для А подходят '+possible.join(', ')+'. Всего '+answer+' значений.';
      task.verification={type:'cryptarithm-add',u,v,total};break;
    }
  }
  if(!task.options)task.options=optionsFor(answer,t*401+number);
  // Non-numeric answer indexes are explicitly set by the corresponding puzzle.
  if(['grid-recolor','odd-digit-count','weekday','equal-chain','ordering','monotone-grid'].includes(task.verification.type))task.correct=answer;
  else task.correct=task.options.indexOf(String(answer));
  if(task.correct<0||task.correct>=5||new Set(task.options).size!==5)throw new Error('Bad answer options '+id);
  task.verification.answer=task.options[task.correct];
  const fingerprint=number+'|'+task.text+'|'+task.options.join('|')+'|'+(diagram||'');
  if(fingerprints.has(fingerprint))throw new Error('Duplicate task '+id);
  fingerprints.add(fingerprint);
  if(diagram){const src='assets/tasks/author/'+id+'.svg';await writeFile(path.join(root,src),diagram,'utf8');task.image={src,alt:alt||task.text};}
  return task;
}
for(let t=1;t<=20;t++){
  const ids=[];
  for(let n=1;n<=20;n++){const task=await makeTask(t,n);records.push(task);ids.push(task.id);}
  sets.push({id:'author-'+String(t).padStart(2,'0'),kind:'author',title:'Авторский вариант '+String(t).padStart(2,'0'),grade:'3–4',taskIds:ids});
}
await writeFile(path.join(root,'data/generated.json'),JSON.stringify(records,null,2)+'\n','utf8');
await writeFile(path.join(root,'data/author-sets.json'),JSON.stringify(sets,null,2)+'\n','utf8');
console.log('Generated '+sets.length+' author variants / '+records.length+' tasks. All options are distinct.');
