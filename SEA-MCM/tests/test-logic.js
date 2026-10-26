const assert = require('node:assert/strict');
const logic = require('../logic');
const makeId = n => 't' + n;
for (const count of [2,3,4,5,6,7,8,9]) {
  const ids = Array.from({length: count}, (_,i)=>makeId(i));
  const games = logic.roundRobin(ids);
  assert.equal(games.length,count*(count-1)/2,'nº de jogos: '+count);
  assert.equal(new Set(games.map(m=>[m.teamA,m.teamB].sort().join(':'))).size,games.length,'confrontos únicos');
  assert.ok(games.every(m=>m.teamA!==m.teamB));
}
const teams=[{id:'A',name:'Azul'},{id:'B',name:'Bordô'},{id:'C',name:'Creme'}];
const matches=[{teamA:'A',teamB:'B',scoreA:2,scoreB:1,status:'finished'},{teamA:'A',teamB:'C',scoreA:0,scoreB:0,status:'finished'},{teamA:'B',teamB:'C',scoreA:null,scoreB:null,status:'scheduled'}];
let table=logic.standings(teams,matches);
assert.equal(table[0].id,'A');assert.equal(table[0].p,4);assert.equal(table[0].j,2);assert.equal(table[0].sg,1);
assert.equal(table[1].p,1);
const knockout=logic.eliminationPairs(['A','B','C']);
assert.equal(knockout.matches.length,1);assert.equal(knockout.byes[0].teamId,'C');
assert.deepEqual(logic.winners([{teamA:'A',teamB:'B',scoreA:2,scoreB:0,status:'finished'}]),['A']);
assert.equal(logic.winners([{teamA:'A',teamB:'B',scoreA:0,scoreB:0,status:'finished'}]),null);
console.log('✅ Testes de tabela, liga e mata-mata passaram.');
