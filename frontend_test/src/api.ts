export type Category =
  | "Income"
  | "Rent & Utilities"
  | "Groceries"
  | "Food & Drink"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Travel";

export interface Stream {
  id: string;
  merchant: string;
  category: Category;
  frequency: "Monthly" | "Semi-monthly" | "Weekly";
  amount: number;
  nextDate: Date;
  kind: "in" | "out";
}
export interface Account {
  id: string;
  name: string;
  mask: string;
  type: "Checking" | "Savings" | "Credit" | "Investment";
  balance: number;
}

export const usd = (n: number, dp = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
export const compact = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;

export const CATEGORY_COLORS: Record<Category, string> = {
  Income: "#0e8f72",
  "Rent & Utilities": "#4f5bd5",
  Groceries: "#e09f1f",
  "Food & Drink": "#c2355a",
  Transport: "#1d9bd1",
  Shopping: "#9b5de5",
  Entertainment: "#e5619e",
  Health: "#1fb5a3",
  Travel: "#7fb800",
};
export type Transaction = {
  id: string;
  date: Date;
  merchant: string;
  category: Category;
  amount: number;
  pending: boolean;
  account: string;
};

type TransactionApiResponse = Omit<Transaction, "date"> & { date: string };
type RetrieveTransactionsResponse = {
  transactions: TransactionApiResponse[];
  count: number;
};

export async function retrieveTransactions(): Promise<Transaction[]> {
  const response = await fetch("/api/retrieve_transactions");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data: RetrieveTransactionsResponse = await response.json();

  return data.transactions.map(({ date, ...transaction }) => {
    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid transaction date: ${date}`);
    }

    return { ...transaction, date: parsedDate };
  });
}

export async function createLinkToken(): Promise<string> {
  const response = await fetch("/api/create_link_token", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Could not prepare Plaid Link (${response.status}).`);
  }

  const data: { link_token: string } = await response.json();
  return data.link_token;
}

export async function exchangePublicToken(publicToken: string): Promise<void> {
  const response = await fetch("/api/exchange_public_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_token: publicToken }),
  });
  if (!response.ok) {
    throw new Error(`Could not finish connecting the bank (${response.status}).`);
  }
}

export async function getLinkStatus(): Promise<boolean> {
  const response = await fetch("/api/link_status");
  if (!response.ok) {
    throw new Error(`Could not check bank connection (${response.status}).`);
  }

  const data: { connected: boolean } = await response.json();
  return data.connected;
}
