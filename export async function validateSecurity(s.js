export async function validateSecurity(symbol){

  const blocked = [
    '<script>',
    'DROP TABLE',
    '../',
    'SELECT *'
  ]

  const invalid = blocked.some(term=>
    symbol.includes(term)
  )

  if(invalid){
    throw new Error('invalid symbol')
  }

  return {
    status:'secure',
    checked_at:new Date().toISOString()
  }
}
