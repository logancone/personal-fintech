// export type Transaction = {
//     id: number
//     amount: number
//     date: string
// }

export type TotalMoney = {
    num_transactions: number
    amount: number
}

export async function getTotalMoney(): Promise<TotalMoney> {
    const result = await fetch('/api/hello')

    if (!result.ok){
        throw new Error(`Request failed: ${result.status}`)
    }
    return result.json()
}

