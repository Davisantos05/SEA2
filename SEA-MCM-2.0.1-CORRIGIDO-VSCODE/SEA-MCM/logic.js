/* Funções puras, testáveis em Node e no navegador. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SeaLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function standings(teams, matches) {
    const rows = (teams || []).map(t => ({id:t.id, name:t.name, className:t.className||'', p:0,j:0,v:0,e:0,d:0,gf:0,gc:0,sg:0}));
    for (const m of matches || []) {
      if (m.status !== 'finished') continue;
      const a = rows.find(t => t.id === m.teamA), b = rows.find(t => t.id === m.teamB);
      const sa = Number(m.scoreA), sb = Number(m.scoreB);
      if (!a || !b || !Number.isInteger(sa) || !Number.isInteger(sb) || sa<0 || sb<0) continue;
      a.j++; b.j++; a.gf+=sa; b.gf+=sb; a.gc+=sb; b.gc+=sa;
      if (sa > sb) { a.v++; a.p+=3; b.d++; }
      else if (sa < sb) { b.v++; b.p+=3; a.d++; }
      else { a.e++; b.e++; a.p++; b.p++; }
    }
    for (const r of rows) r.sg=r.gf-r.gc;
    rows.sort((a,b)=>b.p-a.p || b.v-a.v || b.sg-a.sg || b.gf-a.gf || a.name.localeCompare(b.name,'pt-BR'));
    return rows;
  }
  function roundRobin(ids) {
    if (!Array.isArray(ids) || ids.length < 2 || new Set(ids).size !== ids.length) return [];
    const arr = [...ids];
    if (arr.length % 2) arr.push(null);
    const result = [];
    for (let r=0;r<arr.length-1;r++) {
      for (let j=0;j<arr.length/2;j++) {
        const a=arr[j], b=arr[arr.length-1-j];
        if(a!==null&&b!==null) result.push({round:r+1,teamA:r%2===0?a:b,teamB:r%2===0?b:a});
      }
      arr.splice(1,0,arr.pop());
    }
    return result;
  }
  function eliminationPairs(ids, round=1) {
    const matches=[],byes=[];
    for(let i=0;i<ids.length;i+=2){
      if(ids[i+1]) matches.push({round,teamA:ids[i],teamB:ids[i+1]});
      else byes.push({round,teamId:ids[i]});
    }
    return {matches,byes};
  }
  function winners(matches){
    if(matches.some(m=>m.status!=='finished')) return null;
    if(matches.some(m=>Number(m.scoreA)===Number(m.scoreB))) return null;
    return matches.map(m=>Number(m.scoreA)>Number(m.scoreB)?m.teamA:m.teamB);
  }
  return {standings,roundRobin,eliminationPairs,winners};
});
