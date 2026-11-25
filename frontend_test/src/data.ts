// Fake data only. Swap these exports for real Plaid data later.
// NOTE: Plaid reports outflows as POSITIVE amounts. Here money IN is positive
// and money OUT is negative, so flip the sign when you map real transactions.

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

export interface Txn {
  id: string;
  date: Date;
  merchant: string;
  category: Category;
  amount: number;
  pending: boolean;
  account: string;
}
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

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 760;

function build(): Txn[] {
  const r = rng(42);
  const between = (a: number, b: number) =>
    Math.round((a + r() * (b - a)) * 100) / 100;
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const list: Txn[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  let n = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const dom = date.getDate();
    const add = (
      merchant: string,
      category: Category,
      amount: number,
      account = "Everyday Checking",
    ) =>
      list.push({
        id: `t${n++}`,
        date,
        merchant,
        category,
        amount,
        pending: i <= 1 && amount < 0 && r() < 0.5,
        account,
      });

    if (dom === 1) add("Maple Apartments", "Rent & Utilities", -1650);
    if (dom === 1 || dom === 15) add("Acme Corp Payroll", "Income", 2850);
    if (dom === 5) add("Iron Works Gym", "Health", -39);
    if (dom === 8) add("Spotify", "Entertainment", -11.99, "Sapphire Card");
    if (dom === 12) add("Xfinity Internet", "Rent & Utilities", -65);
    if (dom === 15) add("Netflix", "Entertainment", -15.49, "Sapphire Card");
    if (dom === 20)
      add("Dominion Energy", "Rent & Utilities", -between(80, 125));
    if (dom === 28)
      add("Savings interest", "Income", between(28, 42), "High-Yield Savings");

    if (r() < 0.3)
      add(
        pick(["Whole Foods", "Trader Joe’s", "Kroger", "Aldi"]),
        "Groceries",
        -between(28, 115),
        "Sapphire Card",
      );
    if (r() < 0.6)
      add(
        pick([
          "Chipotle",
          "Starbucks",
          "Sweetgreen",
          "Local Pizza Co.",
          "Chick-fil-A",
        ]),
        "Food & Drink",
        -between(6, 42),
        "Sapphire Card",
      );
    if (r() < 0.25)
      add(
        pick(["Starbucks", "Dunkin’", "Taco Bell"]),
        "Food & Drink",
        -between(5, 22),
        "Sapphire Card",
      );
    if (r() < 0.25)
      add(
        pick(["Uber", "Shell", "Lyft", "Sunoco"]),
        "Transport",
        -between(8, 45),
        "Sapphire Card",
      );
    if (r() < 0.1)
      add(
        pick(["Amazon", "Target", "Best Buy", "Nike", "IKEA"]),
        "Shopping",
        -between(20, 190),
        "Sapphire Card",
      );
    if (r() < 0.08)
      add(
        pick(["AMC Theatres", "Steam", "Ticketmaster", "Topgolf"]),
        "Entertainment",
        -between(15, 75),
        "Sapphire Card",
      );
    if (r() < 0.03)
      add(
        pick(["CVS Pharmacy", "Walgreens", "Dr. Patel Dental"]),
        "Health",
        -between(20, 130),
      );
    if (r() < 0.012)
      add(
        pick(["Delta Air Lines", "Airbnb", "Marriott"]),
        "Travel",
        -between(150, 620),
        "Sapphire Card",
      );
    if (r() < 0.03) add("Stripe payout", "Income", between(150, 700));
  }
  return list;
}

export const transactions: Txn[] = build();

const nextDom = (dom: number) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(t.getFullYear(), t.getMonth(), dom);
  if (d < t) d.setMonth(d.getMonth() + 1);
  return d;
};

export const streams: Stream[] = [
  {
    id: "s1",
    merchant: "Acme Corp Payroll",
    category: "Income",
    frequency: "Semi-monthly",
    amount: 2850,
    nextDate: nextDom(15),
    kind: "in",
  },
  {
    id: "s2",
    merchant: "Maple Apartments",
    category: "Rent & Utilities",
    frequency: "Monthly",
    amount: 1650,
    nextDate: nextDom(1),
    kind: "out",
  },
  {
    id: "s3",
    merchant: "Dominion Energy",
    category: "Rent & Utilities",
    frequency: "Monthly",
    amount: 102,
    nextDate: nextDom(20),
    kind: "out",
  },
  {
    id: "s4",
    merchant: "Xfinity Internet",
    category: "Rent & Utilities",
    frequency: "Monthly",
    amount: 65,
    nextDate: nextDom(12),
    kind: "out",
  },
  {
    id: "s5",
    merchant: "Iron Works Gym",
    category: "Health",
    frequency: "Monthly",
    amount: 39,
    nextDate: nextDom(5),
    kind: "out",
  },
  {
    id: "s6",
    merchant: "Netflix",
    category: "Entertainment",
    frequency: "Monthly",
    amount: 15.49,
    nextDate: nextDom(15),
    kind: "out",
  },
  {
    id: "s7",
    merchant: "Spotify",
    category: "Entertainment",
    frequency: "Monthly",
    amount: 11.99,
    nextDate: nextDom(8),
    kind: "out",
  },
];

export const accounts: Account[] = [
  {
    id: "a1",
    name: "Everyday Checking",
    mask: "4821",
    type: "Checking",
    balance: 4820.55,
  },
  {
    id: "a2",
    name: "High-Yield Savings",
    mask: "9034",
    type: "Savings",
    balance: 12450.1,
  },
  {
    id: "a3",
    name: "Sapphire Card",
    mask: "7710",
    type: "Credit",
    balance: -1284.33,
  },
  {
    id: "a4",
    name: "Roth IRA",
    mask: "2256",
    type: "Investment",
    balance: 18230.77,
  },
];
