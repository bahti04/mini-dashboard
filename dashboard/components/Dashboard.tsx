"use client";

import {
  BarChart, Bar, ComposedChart, Line, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell,
} from "recharts";

type Daily   = { date: string; orders: number; revenue: number };
type FunnelItem  = { name: string; value: number };
type Utm     = { name: string; revenue: number; orders: number };
type City    = { name: string; value: number };
type Product = { name: string; revenue: number; qty: number };
type Heat    = { dow: number; hour: number; value: number };

type Props = {
  kpi: {
    ordersToday: number;
    revenueToday: number;
    avgCheck: number;
    conversion: number;
    wowGrowth: number;
    totalOrders: number;
  };
  daily: Daily[];
  funnel: FunnelItem[];
  utms: Utm[];
  cities: City[];
  topProducts: Product[];
  heatmap: Heat[];
};

const COLORS = ["#5B8DEF", "#33C69F", "#F5A623", "#E05C5C", "#A26BF0", "#2EC4B6", "#FFB86B", "#4FB7FF"];
const DOW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const fmt    = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const tooltipStyle = {
  background: "#14171c",
  border: "1px solid #272b33",
  borderRadius: 8,
  color: "#e6e7ea",
  fontSize: 13,
};

export default function Dashboard(p: Props) {
  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: -0.3 }}>Orders Analytics</h1>
          <p style={{ color: "#8a8f98", marginTop: 4, fontSize: 13 }}>
            RetailCRM · обновляется каждые 60 сек
          </p>
        </div>
        <div style={{ color: "#8a8f98", fontSize: 13 }}>
          Всего заказов в базе: <b style={{ color: "#e6e7ea" }}>{fmt(p.kpi.totalOrders)}</b>
        </div>
      </header>

      {/* KPI row */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 20 }}>
        <Kpi label="Заказы сегодня"  value={fmt(p.kpi.ordersToday)} />
        <Kpi label="Выручка сегодня, ₸"  value={fmt(p.kpi.revenueToday)} />
        <Kpi label="Средний чек, ₸"  value={fmt(p.kpi.avgCheck)} />
        <Kpi label="Конверсия в оплату"
             value={`${p.kpi.conversion.toFixed(1)}%`} />
        <Kpi label="Рост WoW"
             value={fmtPct(p.kpi.wowGrowth)}
             tone={p.kpi.wowGrowth >= 0 ? "good" : "bad"} />
      </section>

      {/* Daily — двойная ось */}
      <Card title="Динамика заказов и выручки по дням">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={p.daily}>
            <CartesianGrid stroke="#1f232a" vertical={false} />
            <XAxis dataKey="date" stroke="#8a8f98" fontSize={12} />
            <YAxis yAxisId="l" stroke="#8a8f98" fontSize={12} />
            <YAxis yAxisId="r" orientation="right" stroke="#8a8f98" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar  yAxisId="l" dataKey="orders"  name="Заказы"    fill="#5B8DEF" radius={[4,4,0,0]} />
            <Line yAxisId="r" dataKey="revenue" name="Выручка, ₸" stroke="#33C69F" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Funnel + UTM revenue */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card title="Воронка статусов заказов">
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Funnel dataKey="value" data={p.funnel} isAnimationActive>
                {p.funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                <LabelList position="right" fill="#e6e7ea" fontSize={12}
                           formatter={(v: any, entry: any) => `${entry?.name ?? ""}: ${v}`} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Выручка по UTM-источникам, ₸">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={p.utms} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke="#1f232a" horizontal={false} />
              <XAxis type="number" stroke="#8a8f98" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#8a8f98" fontSize={12} width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" name="Выручка" fill="#A26BF0" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* Heatmap + Top cities */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        <Card title="Активность: день недели × час">
          <Heatmap data={p.heatmap} />
        </Card>

        <Card title="Топ городов">
          <ResponsiveContainer width="100%" height={Math.max(240, p.cities.length * 32)}>
            <BarChart data={p.cities} layout="vertical" margin={{ left: 70 }}>
              <CartesianGrid stroke="#1f232a" horizontal={false} />
              <XAxis type="number" stroke="#8a8f98" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#8a8f98" fontSize={12} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#33C69F" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* Top products */}
      <Card title="Топ товаров по выручке, ₸">
        <ResponsiveContainer width="100%" height={Math.max(240, p.topProducts.length * 36)}>
          <BarChart data={p.topProducts} layout="vertical" margin={{ left: 180 }}>
            <CartesianGrid stroke="#1f232a" horizontal={false} />
            <XAxis type="number" stroke="#8a8f98" fontSize={12} />
            <YAxis type="category" dataKey="name" stroke="#8a8f98" fontSize={11} width={170} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" name="Выручка" fill="#F5A623" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <footer style={{ color: "#5c616a", fontSize: 12, textAlign: "center", padding: "24px 0 8px" }}>
        Built with Next.js · Supabase · Recharts
      </footer>
    </main>
  );
}

/* ---------- UI pieces ---------- */

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "#33C69F" : tone === "bad" ? "#E05C5C" : "#e6e7ea";
  return (
    <div style={{ background: "#14171c", border: "1px solid #1f232a", borderRadius: 12, padding: 16 }}>
      <div style={{ color: "#8a8f98", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color }}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#14171c", border: "1px solid #1f232a", borderRadius: 12, padding: 18, marginTop: 16 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#c9ccd1", fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  );
}

function Heatmap({ data }: { data: Heat[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data) grid[d.dow][d.hour] = d.value;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px repeat(24, 1fr)", gap: 3, fontSize: 10 }}>
      {/* header hours */}
      <div></div>
      {Array.from({ length: 24 }).map((_, h) => (
        <div key={h} style={{ color: "#8a8f98", textAlign: "center" }}>
          {h % 3 === 0 ? h : ""}
        </div>
      ))}
      {/* rows: Пн..Вс */}
      {[1, 2, 3, 4, 5, 6, 0].map(dow => (
        <FragmentRow key={dow} label={DOW[dow]} row={grid[dow]} max={max} />
      ))}
    </div>
  );
}

function FragmentRow({ label, row, max }: { label: string; row: number[]; max: number }) {
  return (
    <>
      <div style={{ color: "#8a8f98", display: "flex", alignItems: "center" }}>{label}</div>
      {row.map((v, h) => {
        const a = v === 0 ? 0.05 : 0.15 + 0.85 * (v / max);
        return (
          <div
            key={h}
            title={`${label} ${h}:00 — ${v} заказ(ов)`}
            style={{
              height: 22,
              borderRadius: 3,
              background: `rgba(91, 141, 239, ${a})`,
              border: "1px solid #1f232a",
            }}
          />
        );
      })}
    </>
  );
}
