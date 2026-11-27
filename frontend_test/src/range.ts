import type { Transaction } from "./api";

export type Unit = "day" | "week" | "month";
export type RangeKey = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export const RANGES: {
  key: RangeKey;
  label: string;
  phrase: string;
  days: number;
  unit: Unit;
}[] = [
  { key: "1W", label: "Week", phrase: "the past week", days: 7, unit: "day" },
  {
    key: "1M",
    label: "Month",
    phrase: "the past 30 days",
    days: 30,
    unit: "day",
  },
  {
    key: "3M",
    label: "3 months",
    phrase: "the past 3 months",
    days: 91,
    unit: "week",
  },
  {
    key: "6M",
    label: "6 months",
    phrase: "the past 6 months",
    days: 182,
    unit: "week",
  },
  {
    key: "1Y",
    label: "Year",
    phrase: "the past year",
    days: 365,
    unit: "month",
  },
  { key: "ALL", label: "Lifetime", phrase: "all time", days: 0, unit: "month" },
];

export interface Bucket {
  label: string;
  full: string;
  in: number;
  out: number;
}

const DAY = 86400000;
export const dayNum = (d: Date) =>
  Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
  d.toLocaleDateString("en-US", o);

export function rangeBounds(key: RangeKey, all: Transaction[]) {
  const r = RANGES.find((x) => x.key === key)!;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const end = addDays(t, 1);
  let start: Date;
  if (key === "1Y") start = new Date(t.getFullYear(), t.getMonth() - 11, 1);
  else if (key === "ALL") {
    const e = all.reduce((m, x) => (x.date < m ? x.date : m), t);
    start = new Date(e.getFullYear(), e.getMonth(), 1);
  } else start = addDays(end, -r.days);
  return { start, end, unit: r.unit, hasPrior: key !== "ALL" };
}

export function buildBuckets(
  txns: Transaction[],
  start: Date,
  end: Date,
  unit: Unit,
): Bucket[] {
  const buckets: Bucket[] = [];
  const spanDays = dayNum(end) - dayNum(start);
  let i = 0;
  for (
    let c = new Date(start);
    c < end;
    c =
      unit === "day"
        ? addDays(c, 1)
        : unit === "week"
          ? addDays(c, 7)
          : new Date(c.getFullYear(), c.getMonth() + 1, 1)
  ) {
    let label: string;
    let full: string;
    if (unit === "day") {
      label =
        spanDays <= 7
          ? fmt(c, { weekday: "short" })
          : fmt(c, { month: "short", day: "numeric" });
      full = fmt(c, { weekday: "long", month: "short", day: "numeric" });
    } else if (unit === "week") {
      label = fmt(c, { month: "short", day: "numeric" });
      full = `Week of ${fmt(c, { month: "short", day: "numeric" })}`;
    } else {
      const yy =
        c.getMonth() === 0 || i === 0
          ? ` ’${String(c.getFullYear()).slice(2)}`
          : "";
      label = fmt(c, { month: "short" }) + yy;
      full = fmt(c, { month: "long", year: "numeric" });
    }
    buckets.push({ label, full, in: 0, out: 0 });
    i++;
  }
  const sm = start.getFullYear() * 12 + start.getMonth();
  for (const t of txns) {
    const idx =
      unit === "month"
        ? t.date.getFullYear() * 12 + t.date.getMonth() - sm
        : Math.floor(
            (dayNum(t.date) - dayNum(start)) / (unit === "week" ? 7 : 1),
          );
    const b = buckets[idx];
    if (!b) continue;
    if (t.amount > 0) b.in += t.amount;
    else b.out -= t.amount;
  }
  return buckets;
}
