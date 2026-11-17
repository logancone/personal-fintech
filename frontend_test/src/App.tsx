import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { accounts, CATEGORY_COLORS, streams, transactions, usd } from './data.ts';
import type { Category, Txn } from './data.ts';
import { CashFlowChart, Donut } from './charts.tsx';
import { RANGES, buildBuckets, dayNum, rangeBounds } from './range.ts';
import type { RangeKey } from './range.ts';
import './App.css';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function totals(l: Txn[]) {
  let inn = 0, out = 0;
  for (const t of l) { if (t.amount > 0) inn += t.amount; else out -= t.amount; }
  return { inn, out };
}

function compute(key: RangeKey) {
  const { start, end, unit, hasPrior } = rangeBounds(key, transactions);
  const span = end.getTime() - start.getTime();
  const pStart = new Date(start.getTime() - span);
  const cur = transactions.filter(t => t.date >= start && t.date < end);
  const prev = hasPrior ? totals(transactions.filter(t => t.date >= pStart && t.date < start)) : null;
  const now = totals(cur);
  const days = dayNum(end) - dayNum(start);
  const spent = cur.filter(t => t.amount < 0);
  const byCat = new Map<Category, number>();
  const byMerchant = new Map<string, number>();
  const byDow = Array(7).fill(0) as number[];
  for (const t of spent) {
    byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amount);
    byMerchant.set(t.merchant, (byMerchant.get(t.merchant) ?? 0) - t.amount);
    byDow[t.date.getDay()] -= t.amount;
  }
  return {
    ...now, prev, days,
    buckets: buildBuckets(cur, start, end, unit),
    categories: [...byCat].map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] })).sort((a, b) => b.value - a.value),
    merchants: [...byMerchant].sort((a, b) => b[1] - a[1]).slice(0, 6),
    largest: [...spent].sort((a, b) => a.amount - b.amount)[0],
    busiest: DOW[byDow.indexOf(Math.max(...byDow))],
    noSpend: days - new Set(spent.map(t => dayNum(t.date))).size,
    recent: [...cur].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8),
  };
}

function Delta({ now, before, goodWhenUp }: { now: number; before: number | undefined; goodWhenUp: boolean }) {
  if (!before) return null;
  const p = ((now - before) / before) * 100;
  const up = p >= 0;
  return <span className={`delta ${up === goodWhenUp ? 'good' : 'bad'}`}>{up ? '↑' : '↓'} {Math.abs(p).toFixed(0)}% vs. the period before</span>;
}

function Panel({ title, source, className = '', children }: { title: string; source: string; className?: string; children: ReactNode }) {
  return (
    <section className={`panel ${className}`}>
      <header><h2>{title}</h2><span className="src">{source}</span></header>
      {children}
    </section>
  );
}

export default function App() {
  const [range, setRange] = useState<RangeKey>('1M');
  const d = useMemo(() => compute(range), [range]);
  const phrase = RANGES.find(r => r.key === range)!.phrase;
  const net = d.inn - d.out;
  const saveRate = d.inn ? (net / d.inn) * 100 : 0;
  const monthly = streams.filter(s => s.kind === 'out').reduce((a, s) => a + s.amount * (s.frequency === 'Weekly' ? 52 / 12 : s.frequency === 'Semi-monthly' ? 2 : 1), 0);
  const netWorth = accounts.reduce((a, x) => a + x.balance, 0);
  const catTotal = d.categories.reduce((a, c) => a + c.value, 0);
  const merchMax = d.merchants[0]?.[1] ?? 1;

  return (
    <main className="app">
      <header className="top">
        <div className="brand"><span className="mark" aria-hidden />Ledger</div>
        <div className="sync">Synced 2 minutes ago</div>
      </header>

      <section className="hero">
        <div className="hero-head">
          <div>
            <h1>{net >= 0 ? `You kept ${usd(net)}` : `You spent ${usd(-net)} more than you earned`}</h1>
            <p>{net >= 0 ? `of ${usd(d.inn)} that came in over ${phrase}.` : `over ${phrase}, with ${usd(d.inn)} coming in.`}</p>
          </div>
          <div className="tabs" role="tablist" aria-label="Time range">
            {RANGES.map(r => (
              <button key={r.key} role="tab" aria-selected={range === r.key} className={range === r.key ? 'tab on' : 'tab'} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <CashFlowChart buckets={d.buckets} />
        <div className="stats">
          <div><span className="k"><i className="dot in" />Money in</span><b>{usd(d.inn)}</b><Delta now={d.inn} before={d.prev?.inn} goodWhenUp /></div>
          <div><span className="k"><i className="dot out" />Money out</span><b>{usd(d.out)}</b><Delta now={d.out} before={d.prev?.out} goodWhenUp={false} /></div>
          <div><span className="k">Savings rate</span><b>{saveRate.toFixed(0)}%</b><span className="delta">of income kept</span></div>
          <div><span className="k">Average per day</span><b>{usd(d.out / Math.max(d.days, 1))}</b><span className="delta">spent</span></div>
        </div>
      </section>

      <div className="grid">
        <Panel title="Where it went" source="Plaid spending categories" className="c5">
          <div className="cats">
            <Donut data={d.categories} total={catTotal || 1} />
            <ul>
              {d.categories.map(c => (
                <li key={c.name}>
                  <i className="sw" style={{ background: c.color }} />
                  <span>{c.name}</span>
                  <b>{usd(c.value)}</b>
                  <em>{((c.value / catTotal) * 100).toFixed(0)}%</em>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Coming up" source="Plaid recurring transactions" className="c4">
          <p className="lead">About {usd(monthly)} a month goes to bills and subscriptions.</p>
          <ul className="rows">
            {[...streams].sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime()).map(s => (
              <li key={s.id}>
                <div><b>{s.merchant}</b><small>{s.frequency}, next {shortDate(s.nextDate)}</small></div>
                <span className={s.kind === 'in' ? 'in' : ''}>{s.kind === 'in' ? '+' : ''}{usd(s.amount, 2)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Accounts" source="Plaid balances" className="c3">
          <p className="lead big">{usd(netWorth)}<small>net worth</small></p>
          <ul className="rows">
            {accounts.map(a => (
              <li key={a.id}>
                <div><b>{a.name}</b><small>{a.type} ending {a.mask}</small></div>
                <span className={a.balance < 0 ? 'out' : ''}>{a.balance < 0 ? '−' : ''}{usd(Math.abs(a.balance))}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent activity" source="Plaid transactions" className="c7">
          <ul className="txns">
            {d.recent.map(t => (
              <li key={t.id}>
                <span className="av" style={{ background: CATEGORY_COLORS[t.category] }}>{t.merchant[0]}</span>
                <div><b>{t.merchant}</b><small>{t.category}, {t.account}</small></div>
                <span className="when">{t.pending ? <em className="pend">Pending</em> : shortDate(t.date)}</span>
                <span className={t.amount > 0 ? 'in amt' : 'amt'}>{t.amount > 0 ? '+' : '−'}{usd(Math.abs(t.amount), 2)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="c5 stack">
          <Panel title="Top merchants" source="Plaid merchant names">
            <ul className="bars">
              {d.merchants.map(([name, v]) => (
                <li key={name}><span>{name}</span><div><i style={{ width: `${(v / merchMax) * 100}%` }} /></div><b>{usd(v)}</b></li>
              ))}
            </ul>
          </Panel>
          <Panel title="Your patterns" source="Worked out from your transactions">
            <ul className="rows">
              <li><div><b>Largest purchase</b><small>{d.largest ? `${d.largest.merchant}, ${shortDate(d.largest.date)}` : 'None yet'}</small></div><span>{d.largest ? usd(-d.largest.amount, 2) : '—'}</span></li>
              <li><div><b>Busiest spending day</b><small>Most money out on this weekday</small></div><span>{d.busiest}</span></li>
              <li><div><b>No-spend days</b><small>Days with nothing going out</small></div><span>{d.noSpend} of {d.days}</span></li>
            </ul>
          </Panel>
        </div>
      </div>
    </main>
  );
}
