import fs from 'fs/promises'
import path from 'path'

const databasePath = path.join(process.cwd(), 'server', 'database', 'database.json')

export async function loadDatabase(){
  try{
    const raw = await fs.readFile(databasePath, 'utf8')
    const database = JSON.parse(raw)

    return {
      jobs: Array.isArray(database.jobs) ? database.jobs : []
    }
  }catch(error){
    if(error.code !== 'ENOENT'){
      console.warn('database load failed:', error.message)
    }

    return { jobs: [] }
  }
}

export async function saveJob(job){
  const database = await loadDatabase()
  const existingIndex = database.jobs.findIndex(item => item.id === job.id)
  const savedJob = {
    ...job,
    updated_at: new Date().toISOString()
  }

  if(existingIndex >= 0){
    database.jobs[existingIndex] = savedJob
  }else{
    database.jobs.unshift(savedJob)
  }

  database.jobs = database.jobs.slice(0, 100)

  await fs.mkdir(path.dirname(databasePath), { recursive: true })
  await fs.writeFile(databasePath, JSON.stringify(database, null, 2), 'utf8')

  return savedJob
}

export async function listJobs(limit = 20){
  const database = await loadDatabase()
  return database.jobs.slice(0, limit)
}
