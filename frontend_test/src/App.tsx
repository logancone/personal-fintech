import { useEffect, useState } from 'react'

import './App.css'

import { getTotalMoney, type TotalMoney } from './api'

function App() {
  const [money, setMoney] = useState<TotalMoney>({
    num_transactions: 0,
    amount: 0
  })
  const[loading, setLoading] = useState(true)
  const[error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTotalMoney()
      .then(setMoney)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <>
      <body>YOU HAVE: ${money.amount}<br></br>
      THIS TOOK: {money.num_transactions} TRANSACTIONS</body>
    </>
  )
}

export default App
