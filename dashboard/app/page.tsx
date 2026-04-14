import { supabase } from "@/lib/supabase";
import Dashboard from "@/components/Dashboard";

export const revalidate = 60;

type Order = {
  id: number;
  status: string | null;
  created_at: string | null;
  total_summ: number | null;
  city: string | null;
  utm_source: string | null;
};

type Item = {
  order_id: number;
  product_name: string | null;
  quantity: number | null;
  initial_price: number | null;
};

// Порядок статусов в воронке — от первого к финальному
const FUNNEL_ORDER = ["new", "approval", "assembling", "delivering", "complete"];

export default async function Page() {
  const [ordersRes, itemsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, created_at, total_summ, city, utm_source")
      .order("created_at", { ascending: true })
      .limit(10000),
    supabase
      .from("order_items")
      .select("order_id, product_name, quantity, initial_price")
      .limit(50000),
  ]);

  if (ordersRes.error) {
    return <ErrorView msg={ordersRes.error.message} />;
  }

  const orders = (ordersRes.data ?? []) as Order[];
  const items  = (itemsRes.data  ?? []) as Item[];

  // ---------- Даты ----------
  const today  = new Date().toISOString().slice(0, 10);
  const now    = new Date();
  const weekAgo     = new Date(now.getTime() - 7  * 864e5);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);

  // ---------- KPI ----------
  let ordersToday = 0, revenueToday = 0;
  let revenueThisWeek = 0, revenueLastWeek = 0;
  let paidCount = 0;
  let totalRevenue = 0;

  // ---------- Агрегаты ----------
  const byDay = new Map<string, { date: string; orders: number; revenue: number }>();
  const byStatus = new Map<string, number>();
  const byUtmRev = new Map<string, { name: string; revenue: number; orders: number }>();
  const byCity   = new Map<string, number>();
  const heat     = new Map<string, number>(); // `${dayOfWeek}-${hour}`

  for (const o of orders) {
    const sum = Number(o.total_summ ?? 0);
    totalRevenue += sum;

    const day = (o.created_at ?? "").slice(0, 10);
    if (day) {
      const b = byDay.get(day) ?? { date: day, orders: 0, revenue: 0 };
      b.orders += 1;
      b.revenue += sum;
      byDay.set(day, b);

      if (day === today) {
        ordersToday += 1;
        revenueToday += sum;
      }
    }

    if (o.created_at) {
      const d = new Date(o.created_at);
      if (d >= weekAgo)                          revenueThisWeek += sum;
      else if (d >= twoWeeksAgo && d < weekAgo)  revenueLastWeek += sum;

      const dow = d.getDay(); // 0..6
      const hr  = d.getHours();
      const k = `${dow}-${hr}`;
      heat.set(k, (heat.get(k) ?? 0) + 1);
    }

    if (o.status) {
      byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      if (o.status === "complete" || o.status === "paid") paidCount += 1;
    }

    const utm = o.utm_source ?? "direct";
    const u = byUtmRev.get(utm) ?? { name: utm, revenue: 0, orders: 0 };
    u.revenue += sum;
    u.orders  += 1;
    byUtmRev.set(utm, u);

    if (o.city) byCity.set(o.city, (byCity.get(o.city) ?? 0) + 1);
  }

  // Воронка в фиксированном порядке
  const funnel = FUNNEL_ORDER
    .map(s => ({ name: s, value: byStatus.get(s) ?? 0 }))
    .filter(x => x.value > 0);
  // Прочие статусы не из воронки — складываем отдельно, но в воронку не добавляем

  const daily   = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  const utms    = Array.from(byUtmRev.values()).sort((a, b) => b.revenue - a.revenue);
  const cities  = Array.from(byCity, ([name, value]) => ({ name, value }))
                       .sort((a, b) => b.value - a.value).slice(0, 10);

  // Топ товаров по выручке
  const prodMap = new Map<string, { name: string; revenue: number; qty: number }>();
  for (const it of items) {
    const name = it.product_name ?? "—";
    const rev  = Number(it.initial_price ?? 0) * Number(it.quantity ?? 0);
    const qty  = Number(it.quantity ?? 0);
    const p = prodMap.get(name) ?? { name, revenue: 0, qty: 0 };
    p.revenue += rev;
    p.qty     += qty;
    prodMap.set(name, p);
  }
  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Heatmap data (7 дней × 24 часа)
  const heatmap: { dow: number; hour: number; value: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      heatmap.push({ dow: d, hour: h, value: heat.get(`${d}-${h}`) ?? 0 });
    }
  }

  const wowGrowth = revenueLastWeek
    ? ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100
    : 0;
  const conversion = orders.length ? (paidCount / orders.length) * 100 : 0;

  return (
    <Dashboard
      kpi={{
        ordersToday,
        revenueToday,
        avgCheck: orders.length ? totalRevenue / orders.length : 0,
        conversion,
        wowGrowth,
        totalOrders: orders.length,
      }}
      daily={daily}
      funnel={funnel}
      utms={utms}
      cities={cities}
      topProducts={topProducts}
      heatmap={heatmap}
    />
  );
}

function ErrorView({ msg }: { msg: string }) {
  return (
    <main style={{ padding: 32 }}>
      <h1>Ошибка загрузки</h1>
      <pre style={{ color: "#ff8080" }}>{msg}</pre>
    </main>
  );
}
