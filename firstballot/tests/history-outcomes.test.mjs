import test from 'node:test'
import assert from 'node:assert/strict'
import { careerOutcome, careerPoints, gradeOrder } from '../lib/history-outcomes.ts'
const player = (id, year, points, adp=10) => ({id,espnId:id,name:id,position:'WR',year,adp,adpCount:20,adpWindow:['2020-08-01','2020-09-01'],seasons:{[year]:{points:Array(18).fill(points),games:18}}})
const peers=Array.from({length:10},(_,i)=>player(`p${i}`,2020,10))
test('grades descend; null grades follow all graded players with stable names',()=>{
 const items=[{name:'Z',overall_grade:null},{name:'B',overall_grade:0},{name:'A',overall_grade:95},{name:'C',overall_grade:null}]
 assert.deepEqual(items.sort(gradeOrder).map(p=>p.name),['A','B','C','Z'])
})
test('historical years align to the same regular-season fraction',()=>{
 assert.equal(careerPoints(peers[0],0,6,2026),60)
 assert.equal(careerPoints(peers[0],0,18,2026),170)
})
test('ADP and sparse cohort gaps stay neutral',()=>{
 const p=player('subject',2025,12,null)
 assert.equal(careerOutcome(p,{season:2025,week:6,players:peers}).bars,null)
 assert.equal(careerOutcome({...p,adp:10},{season:2025,week:6,players:peers.slice(0,7)}).bars,null)
})
test('same class, future class, other positions and unrelated ADP excluded',()=>{
 const p=player('subject',2025,10)
 const excluded=[player('same',2025,100),player('future',2026,100),{...player('qb',2020,100),position:'QB'},player('cheap',2020,100,100)]
 const result=careerOutcome(p,{season:2025,week:6,players:[...peers,...excluded]})
 assert.equal(result.peers,10)
 assert.equal(result.expected,60)
 assert.equal(result.early,true)
})
test('low and high production map to expectation-relative bars',()=>{
 const snapshot={season:2025,week:6,players:peers}
 assert.equal(careerOutcome(player('high',2025,20),snapshot).bars,5)
 assert.equal(careerOutcome(player('low',2025,1),snapshot).bars,1)
})
test('retired and zero-production peers remain in baseline',()=>{
 const result=careerOutcome(player('subject',2025,10),{season:2025,week:6,players:[...peers,{...player('retired',2019,0),seasons:{}}]})
 assert.equal(result.peers,11)
 assert.ok(result.expected<60)
})
