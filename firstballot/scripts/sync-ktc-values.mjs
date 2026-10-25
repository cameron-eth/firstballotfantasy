// Server/CI only. Idempotently upsert all validated archive rows, without deleting existing history.
import fs from 'node:fs'
const archive=JSON.parse(fs.readFileSync(new URL('../data/ktc-history.json',import.meta.url),'utf8'))
const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw Error('Supabase server configuration required')
const rows=Object.entries(archive.players).flatMap(([id,p])=>p.history.map(h=>({ktc_player_id:Number(id),player_name:p.name,position:p.position,team:p.team,scraped_date:h[0],value_sf:h[1],value_1qb:h[2],rank_sf:h[3],rank_1qb:h[4]})))
for(let i=0;i<rows.length;i+=500){
 const response=await fetch(`${url}/rest/v1/ktc_player_values?on_conflict=ktc_player_id,scraped_date`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+500))})
 if(!response.ok)throw Error(`KTC import failed (${response.status}): ${await response.text()}`)
 if(i%10000===0)console.log(`Imported ${Math.min(i+500,rows.length)}/${rows.length}`)
}
console.log(`Imported ${rows.length} KTC values without deleting existing history.`)
