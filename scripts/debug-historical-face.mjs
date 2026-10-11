import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('legacy-stats/headshots.json','utf8'));
const urls=data.headshots.daunteculpepper||[];
for(const u of urls){
  try{
    const r=await fetch(u,{redirect:'follow'});
    const b=await r.arrayBuffer();
    console.log('CANDIDATE',u,'status',r.status,'type',r.headers.get('content-type'),'bytes',b.byteLength,'final',r.url);
  }catch(e){console.log('CANDIDATE ERROR',u,e.message)}
}
for(const u of [
  'https://www.espn.com/nfl/player/_/id/1762/daunte-culpepper',
  'https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/1762',
  'https://sports.api.espn.com/apis/v2/sports/football/nfl/athletes/1762'
]){
  try{
    const r=await fetch(u,{redirect:'follow'});
    const text=await r.text();
    console.log('PAGE',u,'status',r.status,'type',r.headers.get('content-type'),'len',text.length);
    const matches=[...text.matchAll(/https?:[^"'\\\s]+(?:headshot|headshots|1762)[^"'\\\s]*/gi)].map(x=>x[0]).slice(0,30);
    console.log('MATCHES',matches);
    if(text.trim().startsWith('{')){
      try{
        const j=JSON.parse(text);
        console.log('JSON_HEADSHOT',JSON.stringify(j.headshot||j.athlete?.headshot||null));
      }catch{}
    }
  }catch(e){console.log('PAGE ERROR',u,e.message)}
}
