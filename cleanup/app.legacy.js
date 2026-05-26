// ...conteúdo movido de 'const button = document.js' para cleanup...
const button = document.getElementById('analyzeBtn')

button.addEventListener('click', async ()=>{

  const symbol = document
    .getElementById('symbol')
    .value
    .trim()
    .toUpperCase()

  if(!symbol){
    return alert('Digite símbolo')
  }

  const status = document.getElementById('status')
  const result = document.getElementById('result')

  status.innerText = 'Processando agentes...'

  result.innerHTML = ''

  try{

    const response = await fetch('http://localhost:3000/jobs',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({ symbol })
    })

    const data = await response.json()

    poll(data.id)

  }catch(error){

    status.innerText = error.message

  }
})

async function poll(id){

  const status = document.getElementById('status')
  const result = document.getElementById('result')

  const interval = setInterval(async ()=>{

    const response = await fetch(
      'http://localhost:3000/jobs/' + id
    )

    const data = await response.json()

    status.innerText = data.status

    if(data.status === 'finished'){

      clearInterval(interval)

      result.innerHTML = JSON.stringify(
        data.result,
        null,
        2
      )
    }

    if(data.status === 'error'){

      clearInterval(interval)

      result.innerHTML = data.error
    }

  },2000)
}
