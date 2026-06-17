import fs from 'fs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'server', 'database', 'database.json')

function readDb(){
  try{
    const raw = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(raw)
  }catch(e){
    return { reports: [] }
  }
}

function writeDb(obj){
  fs.writeFileSync(dbPath, JSON.stringify(obj, null, 2), 'utf8')
}

export async function listJobs(limit = 50){
  const db = readDb()
  const jobs = db.reports || []
  return jobs.slice(-limit).reverse()
}

export async function saveJob(job){
  const db = readDb()
  db.reports = db.reports || []
  const idx = db.reports.findIndex(j => j.id === job.id)
  if(idx >= 0){
    db.reports[idx] = job
  }else{
    db.reports.push(job)
  }
  writeDb(db)
  return job
}
