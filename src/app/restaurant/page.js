"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingCard from '@/components/FloatingCard';
import ImpactWidget from '@/components/ImpactWidget';

export default function RestaurantPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  // Dashboard states
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshStats, setRefreshStats] = useState(0);

  // Listing Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('meals');
  const [imageDataUrl, setImageDataUrl] = useState('');   // base64 preview + upload
  const [imageDragOver, setImageDragOver] = useState(false);

  // Default pickup time: 2 hours from now
  const getDefaultPickupTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };
  const [pickupTime, setPickupTime] = useState(getDefaultPickupTime());

  const [uploadLoading, setUploadLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [orderStatusLoading, setOrderStatusLoading] = useState(null);

  // Auth check
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'restaurant') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  // Fetch inventory (all statuses for restaurant view)
  const fetchInventory = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const res = await fetch(`http://localhost:5000/api/food/listings?restaurant_id=${user.id}`);
      if (res.ok) setListings(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingListings(false); }
  };

  // Fetch incoming claims
  const fetchIncomingOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`http://localhost:5000/api/order/restaurant/${user.id}`);
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => {
    if (user) { fetchInventory(); fetchIncomingOrders(); }
  }, [user]);

  // ── Image Handling ──────────────────────────────────────────────────────────
  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ text: 'Image must be under 5 MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setImageDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Upload listing ──────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!user) return;
    setUploadLoading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const res = await fetch('http://localhost:5000/api/food/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          restaurant_id: user.id,
          price: Number(price),
          original_price: Number(originalPrice),
          quantity: Number(quantity),
          category,
          pickup_time: new Date(pickupTime).toISOString(),
          image: imageDataUrl || undefined   // pass base64 or let server pick default
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setStatusMsg({ text: '🎉 Listing successfully posted online!', type: 'success' });
      setTitle(''); setDescription(''); setPrice(''); setOriginalPrice('');
      setQuantity('1'); setCategory('meals'); setPickupTime(getDefaultPickupTime());
      setImageDataUrl('');
      fetchInventory();
      setRefreshStats(p => p + 1);
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setOrderStatusLoading(orderId);
    try {
      const res = await fetch('http://localhost:5000/api/order/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus })
      });
      if (res.ok) { fetchIncomingOrders(); fetchInventory(); setRefreshStats(p => p + 1); }
    } catch (err) { console.error(err); }
    finally { setOrderStatusLoading(null); }
  };

  if (!user) return null;

  const statusColor = { available: '#4CAF7A', sold: '#1A73E8', expired: '#9AA0A6' };

  return (
    <main className="page-container">

      {/* ── Header ── */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>
            Restaurant Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            List surplus food, manage orders, and track your environmental impact.
          </p>
        </div>
        <Link href="/restaurant/analytics" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span>📈</span> Business Analytics
        </Link>
      </div>

      {/* ── Impact Stats ── */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>📊 Quick Stats</h2>
        <ImpactWidget restaurantId={user.id} refreshTrigger={refreshStats} />
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px', alignItems: 'start' }}>

        {/* ── LEFT: Upload Form ── */}
        <FloatingCard style={{ padding: '30px', backgroundColor: 'var(--surface)' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '20px', borderBottom: '1px solid rgba(95,111,101,0.1)', paddingBottom: '10px' }}>
            🍲 Upload Surplus Food
          </h3>

          {statusMsg.text && (
            <div style={{
              background: statusMsg.type === 'success' ? 'var(--accent)' : '#FCE8E6',
              color: statusMsg.type === 'success' ? 'var(--primary)' : '#C5221F',
              padding: '12px', borderRadius: '12px', fontSize: '0.85rem',
              fontWeight: 600, marginBottom: '20px'
            }}>
              {statusMsg.type === 'success' ? '✔' : '⚠️'} {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Photo Upload Zone ── */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Food Photo <span style={{ fontWeight: 400, color: '#9AA0A6' }}>(optional — max 5 MB)</span>
              </label>

              {imageDataUrl ? (
                /* Preview */
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '180px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setImageDataUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                      borderRadius: '50%', width: '30px', height: '30px',
                      cursor: 'pointer', fontSize: '1rem', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '10px',
                    background: 'rgba(47,107,79,0.85)', color: '#fff',
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600
                  }}>
                    Photo ready ✓
                  </div>
                </div>
              ) : (
                /* Drop Zone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                  onDragLeave={() => setImageDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${imageDragOver ? 'var(--primary)' : 'rgba(95,111,101,0.25)'}`,
                    borderRadius: '16px', padding: '32px 20px',
                    textAlign: 'center', cursor: 'pointer',
                    background: imageDragOver ? 'var(--accent)' : 'rgba(244,247,245,0.6)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                    Click to upload or drag & drop
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    JPG, PNG, WEBP — max 5 MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Listing Title
              </label>
              <input type="text" className="form-input" placeholder="e.g. Avocado Toast Box (Set of 2)"
                value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <textarea className="form-input" rows="2"
                placeholder="Describe contents, ingredients, or allergens..."
                value={description} onChange={(e) => setDescription(e.target.value)}
                style={{ resize: 'vertical', minHeight: '70px' }} />
            </div>

            {/* Price row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Rescue Price ($)
                </label>
                <input type="number" step="0.01" min="0" className="form-input"
                  placeholder="0.00 = free" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Original Value ($)
                </label>
                <input type="number" step="0.01" min="0.01" className="form-input"
                  placeholder="Original price" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} required />
              </div>
            </div>

            {/* Qty / Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Quantity
                </label>
                <input type="number" min="1" className="form-input"
                  value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ appearance: 'auto' }}>
                  <option value="meals">Surplus Meals</option>
                  <option value="bakery">Bakery / Bread</option>
                  <option value="groceries">Groceries / Produce</option>
                  <option value="beverages">Beverages</option>
                  <option value="other">Other Deals</option>
                </select>
              </div>
            </div>

            {/* Pickup */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Pickup Deadline
              </label>
              <input type="datetime-local" className="form-input"
                value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required />
            </div>

            <button type="submit" disabled={uploadLoading} className="btn btn-primary"
              style={{ marginTop: '6px', height: '48px', borderRadius: '12px', fontSize: '0.95rem' }}>
              {uploadLoading ? 'Publishing...' : 'Publish Surplus Listing'}
            </button>
          </form>
        </FloatingCard>

        {/* ── RIGHT: Claims + Inventory ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Active Claim Pickups */}
          <FloatingCard style={{ padding: '28px', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid rgba(95,111,101,0.1)', paddingBottom: '10px' }}>
              🛎️ Active Claim Pickups
            </h3>
            {loadingOrders ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading claims...</p>
            ) : orders.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No active claims. Deals will appear here once rescued.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {orders.map(order => {
                  const isClaimed = order.status === 'placed';
                  const isPicked = order.status === 'picked';
                  const isCompleted = order.status === 'completed';
                  return (
                    <div key={order._id} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--background)', border: '1px solid rgba(95,111,101,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.food_id?.title || 'Unknown Item'}</span>
                        <span className={`badge ${isCompleted ? 'badge-neutral' : isPicked ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {order.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        <span>Qty: <strong>{order.quantity}</strong></span>
                        <span>Total: <strong>${Number(order.total_price).toFixed(2)}</strong></span>
                      </div>
                      {!isCompleted && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isClaimed && (
                            <button disabled={orderStatusLoading === order._id}
                              onClick={() => handleUpdateOrderStatus(order._id, 'picked')}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}>
                              {orderStatusLoading === order._id ? 'Updating...' : 'Mark Picked Up'}
                            </button>
                          )}
                          {isPicked && (
                            <button disabled={orderStatusLoading === order._id}
                              onClick={() => handleUpdateOrderStatus(order._id, 'completed')}
                              className="btn btn-primary"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}>
                              {orderStatusLoading === order._id ? 'Updating...' : 'Complete Fulfillment'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </FloatingCard>

          {/* Live Inventory */}
          <FloatingCard style={{ padding: '28px', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px', borderBottom: '1px solid rgba(95,111,101,0.1)', paddingBottom: '10px' }}>
              📦 Live Inventory
            </h3>
            {loadingListings ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading inventory...</p>
            ) : listings.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Inventory is empty. List your first surplus item using the form.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {listings.map(listing => (
                  <div key={listing._id} style={{
                    padding: '10px 14px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(95,111,101,0.12)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    {/* Thumbnail */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={listing.image} alt={listing.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {listing.title}
                      </h4>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        {listing.quantity} left · ${Number(listing.price).toFixed(2)}
                      </p>
                    </div>
                    <span style={{
                      flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%',
                      background: statusColor[listing.status] || '#9AA0A6'
                    }} title={listing.status} />
                  </div>
                ))}
              </div>
            )}
          </FloatingCard>

        </div>
      </div>
    </main>
  );
}
