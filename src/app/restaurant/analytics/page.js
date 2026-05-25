"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingCard from '@/components/FloatingCard';

// ── Tiny bar chart rendered with pure CSS ─────────────────────────────────────
function BarChart({ data, color = 'var(--primary)', label }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {label && <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{label}</p>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '100%', height: `${Math.max((d.value / max) * 100, 4)}%`,
              background: color, borderRadius: '6px 6px 0 0',
              transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)',
              minHeight: '4px'
            }} title={`${d.label}: ${d.value}`} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut / progress ring ─────────────────────────────────────────────────────
function RingChart({ value, max, color, label, sublabel }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = 36, stroke = 7;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(95,111,101,0.1)" strokeWidth={stroke} />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="44" y="49" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{Math.round(pct)}%</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</p>
        {sublabel && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sublabel}</p>}
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, sub, color = 'var(--primary)', bg = 'var(--accent)' }) {
  return (
    <FloatingCard style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '18px' }}>
      <div style={{ background: bg, borderRadius: '14px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: '1.7rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</h4>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>{label}</p>
        {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</p>}
      </div>
    </FloatingCard>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_MS = 86400000;
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekday(dateStr) {
  return new Date(dateStr).getDay(); // 0=Sun…6=Sat
}
function getMonthNum(dateStr) {
  return new Date(dateStr).getMonth();
}

export default function RestaurantAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'restaurant') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const [ordRes, lstRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/restaurant/${user.id}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/food/listings?restaurant_id=${user.id}`)
        ]);
        if (ordRes.ok) setOrders(await ordRes.json());
        if (lstRes.ok) setListings(await lstRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  if (!user) return null;

  // ── Derived Metrics ────────────────────────────────────────────────────────
  const completedOrders = orders.filter(o => o.status === 'completed');
  const activeOrders    = orders.filter(o => o.status === 'placed');
  const inTransit       = orders.filter(o => o.status === 'picked');

  const totalRevenue    = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const completedRev    = completedOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  const totalItemsSold  = orders.reduce((s, o) => s + Number(o.quantity || 0), 0);
  const co2Saved        = listings.reduce((s, l) => {
    const claimed = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                          .reduce((a, o) => a + Number(o.quantity || 0), 0);
    return s + (claimed * 2.5);
  }, 0);

  // Savings generated for customers (original - rescue) × qty
  const customerSavings = orders.reduce((s, o) => {
    const food = o.food_id || {};
    const diff = Number(food.original_price || 0) - Number(food.price || 0);
    return s + diff * Number(o.quantity || 0);
  }, 0);

  // Unique customers
  const uniqueCustomers = new Set(orders.map(o => o.user_id)).size;

  // Avg order value
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Sell-through rate
  const totalListedQty = listings.reduce((s, l) => {
    // estimate original quantity = current + sold qty
    const soldQty = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                          .reduce((a, o) => a + Number(o.quantity || 0), 0);
    return s + Number(l.quantity || 0) + soldQty;
  }, 0);
  const sellThroughRate = totalListedQty > 0 ? (totalItemsSold / totalListedQty) * 100 : 0;

  // Inventory breakdown
  const invAvailable = listings.filter(l => l.status === 'available').length;
  const invSold      = listings.filter(l => l.status === 'sold').length;
  const invExpired   = listings.filter(l => l.status === 'expired').length;
  const invTotal     = listings.length;

  // Revenue by day of week (last data)
  const revByWeekday = Array(7).fill(0);
  orders.forEach(o => {
    const wd = getWeekday(o.createdAt || new Date().toISOString());
    revByWeekday[wd] += Number(o.total_price || 0);
  });
  // Rotate so Mon=0
  const weekdayData = WEEK_LABELS.map((label, i) => ({
    label,
    value: revByWeekday[(i + 1) % 7]  // 0=Sun→Sun is index 6 in label array
  }));

  // Revenue by month
  const revByMonth = Array(12).fill(0);
  orders.forEach(o => {
    const m = getMonthNum(o.createdAt || new Date().toISOString());
    revByMonth[m] += Number(o.total_price || 0);
  });
  const monthData = MONTH_ABBR.map((label, i) => ({ label, value: revByMonth[i] }));

  // Revenue by category
  const catMap = {};
  listings.forEach(l => {
    const rev = orders
      .filter(o => (o.food_id?._id || o.food_id) === l._id)
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    catMap[l.category] = (catMap[l.category] || 0) + rev;
  });
  const catData = Object.entries(catMap).map(([label, value]) => ({ label, value }));

  // Top 5 performing listings
  const listingPerf = listings.map(l => {
    const claimed = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                          .reduce((s, o) => s + Number(o.quantity || 0), 0);
    const rev = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    return { ...l, claimedQty: claimed, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Order fulfillment rate
  const fulfillmentRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

  return (
    <main className="page-container">

      {/* ── Header ── */}
      <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Link href="/restaurant" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>
            Business Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Deep-dive into your revenue, customers, inventory, and environmental impact.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-success" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            🟢 {invAvailable} Live listings
          </div>
          <div className="badge badge-neutral" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            📦 {invTotal} Total ever listed
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
          <div className="animate-float">📊 Crunching your business numbers...</div>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px', marginBottom: '36px' }}>
            <KpiCard icon="💰" value={`$${totalRevenue.toFixed(2)}`} label="Total Revenue Recovered" sub="All orders combined" color="var(--primary)" bg="var(--accent)" />
            <KpiCard icon="✅" value={`$${completedRev.toFixed(2)}`} label="Confirmed Revenue" sub={`${completedOrders.length} completed orders`} color="#2E7D32" bg="#E8F5E9" />
            <KpiCard icon="👥" value={uniqueCustomers} label="Unique Customers" sub="Distinct buyers / NGOs" color="#1565C0" bg="#E3F2FD" />
            <KpiCard icon="🍱" value={totalItemsSold} label="Items Rescued" sub="Total quantity sold" color="#E65100" bg="#FFF3E0" />
            <KpiCard icon="🌱" value={`${co2Saved.toFixed(1)} kg`} label="CO₂ Saved" sub="2.5 kg per meal" color="#00695C" bg="#E0F2F1" />
            <KpiCard icon="🎁" value={`$${customerSavings.toFixed(2)}`} label="Savings for Customers" sub="Discount value generated" color="#6A1B9A" bg="#F3E5F5" />
            <KpiCard icon="📋" value={`$${avgOrderValue.toFixed(2)}`} label="Avg. Order Value" sub={`${orders.length} total orders`} color="#BF360C" bg="#FBE9E7" />
            <KpiCard icon="🚀" value={`${sellThroughRate.toFixed(0)}%`} label="Sell-Through Rate" sub="Items sold vs listed" color="#0277BD" bg="#E1F5FE" />
          </div>

          {/* ── Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '36px' }}>

            {/* Revenue by Weekday */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '20px' }}>
                📅 Revenue by Day of Week
              </h3>
              <BarChart data={weekdayData} color="var(--secondary)" label="Revenue ($)" />
            </FloatingCard>

            {/* Revenue by Month */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '20px' }}>
                🗓️ Monthly Revenue Trend
              </h3>
              <BarChart data={monthData} color="var(--primary)" label="Revenue ($)" />
            </FloatingCard>

            {/* Revenue by Category */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '20px' }}>
                🏷️ Revenue by Category
              </h3>
              {catData.length === 0
                ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No category data yet.</p>
                : <BarChart data={catData} color="#A8E6CF" />}
            </FloatingCard>
          </div>

          {/* ── Rings + Order Pipeline ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '36px' }}>

            {/* Fulfillment Rings */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '24px' }}>
                🎯 Order Fulfillment Rates
              </h3>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                <RingChart value={completedOrders.length} max={Math.max(orders.length, 1)} color="var(--primary)" label="Completed" sublabel={`${completedOrders.length} / ${orders.length}`} />
                <RingChart value={inTransit.length} max={Math.max(orders.length, 1)} color="#1A73E8" label="In Transit" sublabel={`${inTransit.length} picked`} />
                <RingChart value={activeOrders.length} max={Math.max(orders.length, 1)} color="#F29900" label="Pending" sublabel={`${activeOrders.length} placed`} />
              </div>
            </FloatingCard>

            {/* Inventory Health */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '24px' }}>
                🏪 Inventory Health
              </h3>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                <RingChart value={invAvailable} max={Math.max(invTotal, 1)} color="var(--secondary)" label="Active" sublabel={`${invAvailable} live`} />
                <RingChart value={invSold} max={Math.max(invTotal, 1)} color="#1A73E8" label="Sold Out" sublabel={`${invSold} listings`} />
                <RingChart value={invExpired} max={Math.max(invTotal, 1)} color="#9AA0A6" label="Expired" sublabel={`${invExpired} missed`} />
              </div>
            </FloatingCard>

          </div>

          {/* ── Top Listings + Recent Orders ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

            {/* Top Performing Listings */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '20px', borderBottom: '1px solid rgba(95,111,101,0.1)', paddingBottom: '10px' }}>
                🏆 Top Performing Listings
              </h3>
              {listingPerf.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No listing data available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {listingPerf.map((l, idx) => (
                    <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px', borderRadius: '12px', background: 'var(--background)' }}>
                      {/* Rank badge */}
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: idx < 3 ? '#fff' : 'var(--primary)', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      {/* Thumbnail */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{l.claimedQty} units rescued</p>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)', flexShrink: 0 }}>
                        ${l.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </FloatingCard>

            {/* Recent Orders Table */}
            <FloatingCard style={{ padding: '28px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '20px', borderBottom: '1px solid rgba(95,111,101,0.1)', paddingBottom: '10px' }}>
                🧾 Recent Orders
              </h3>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No orders yet.</p>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: '340px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(95,111,101,0.12)' }}>Item</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid rgba(95,111,101,0.12)' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid rgba(95,111,101,0.12)' }}>Revenue</th>
                        <th style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(95,111,101,0.12)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...orders].reverse().slice(0, 20).map(o => (
                        <tr key={o._id} style={{ borderBottom: '1px solid rgba(95,111,101,0.06)' }}>
                          <td style={{ padding: '8px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.food_id?.title || '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{o.quantity}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            ${Number(o.total_price).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span className={`badge ${
                              o.status === 'completed' ? 'badge-success'
                              : o.status === 'picked' ? 'badge-info'
                              : 'badge-warning'
                            }`} style={{ fontSize: '0.6rem' }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </FloatingCard>

          </div>
        </>
      )}
    </main>
  );
}
