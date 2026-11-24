// Fake data only. Swap these exports for real Plaid data later.
// NOTE: Plaid reports outflows as POSITIVE amounts. Here money IN is positive
// and money OUT is negative, so flip the sign when you map real transactions.

export type Category =
  | 'Income' | 'Rent & Utilities' | 'Groceries' | 'Food & Drink' | 'Transport'
  | 'Shopping' | 'Entertainment' | 'Health' | 'Travel' | 'NONE';

export interface Txn { id: string; date: Date; merchant: string; category: Category; amount: number; pending: boolean; account: string }
export interface Stream { id: string; merchant: string; category: Category; frequency: 'Monthly' | 'Semi-monthly' | 'Weekly'; amount: number; nextDate: Date; kind: 'in' | 'out' }
export interface Account { id: string; name: string; mask: string; type: 'Checking' | 'Savings' | 'Credit' | 'Investment'; balance: number }

export const usd = (n: number, dp = 0) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp });
export const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`);

export const CATEGORY_COLORS: Record<Category, string> = {
  Income: '#0e8f72', 'Rent & Utilities': '#4f5bd5', Groceries: '#e09f1f', 'Food & Drink': '#c2355a',
  Transport: '#1d9bd1', Shopping: '#9b5de5', Entertainment: '#e5619e', Health: '#1fb5a3', Travel: '#7fb800',
  NONE: '#ff0000'
};

async function retrieve_transactions(): Txn[]{
    const result = await fetch('/api/retrieve_transactions')

    if (!result.ok){
        throw new Error(`Request failed: ${result.status}`)
    }



    return 
}


export const transactions: Txn[] = build();


export const streams: Stream[] = [
];

export const accounts: Account[] = [
];
