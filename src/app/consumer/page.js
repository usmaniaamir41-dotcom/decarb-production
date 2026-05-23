"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import CategoryTabs from '@/components/CategoryTabs';
import FoodCard from '@/components/FoodCard';
import ImpactWidget from '@/components/ImpactWidget';

export default function ConsumerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  
  // Track orders/stats refresh
  const [refreshStats, setRefreshStats] = useState(0);
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState({ text: '', type: '' });

  // Authentication check
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) {
      router.push('/?auth=login');
      return;
    }
    const u = JSON.parse(stored);
    if (u.role !== 'customer') {
      router.push('/');
      return;
    }
    setUser(u);
  }, [router]);

  // Fetch listings from backend
  useEffect(() => {
    if (!user) return;

    async function fetchListings() {
      setLoading(true);
      try {
        let url = `http://localhost:5000/api/food/listings?lat=${user.location.lat}&lng=${user.location.lng}&type=paid`;
        
        if (category !== 'all') {
          url += `&category=${category}`;
        }
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setListings(data);
        }
      } catch (err) {
        console.error('Error loading food listings:', err);
      } finally {
        setLoading(false);
      }
    }

    // Small debounce for search queries
    const delayDebounce = setTimeout(fetchListings, search ? 300 : 0);
    return () => clearTimeout(delayDebounce);
  }, [user, category, search]);

  const handleOrder = async (foodId, qty) => {
    if (!user) return;
    setLoadingId(foodId);
    setToast({ text: '', type: '' });

    try {
      const res = await fetch('http://localhost:5000/api/order/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          food_id: foodId,
          quantity: qty
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete order');
      }

      setToast({
        text: `🎉 Rescued successfully! Your claim has been registered. Meet at the store during the pickup window!`,
        type: 'success'
      });

      // Update remaining local inventory count
      setListings(prev => prev.map(item => {
        if (item._id === foodId) {
          const remaining = Number(item.quantity) - qty;
          return {
            ...item,
            quantity: remaining,
            status: remaining === 0 ? 'sold' : 'available'
          };
        }
        return item;
      }));

      // Refresh impact stats widget
      setRefreshStats(prev => prev + 1);
    } catch (err) {
      setToast({ text: err.message, type: 'error' });
    } finally {
      setLoadingId(null);
      // Auto clear toast in 5 seconds
      setTimeout(() => setToast({ text: '', type: '' }), 5000);
    }
  };

  if (!user) return null;

  return (
    <main className="page-container">
      {/* Page Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        animation: 'slideUpFade 0.5s ease-out'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
          Rescue Nearby Surplus Meals
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Choose from discounted meals from local partners near your registered location.
        </p>
      </div>

      {/* Toast Alert */}
      {toast.text && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? 'var(--primary)' : '#C5221F',
          color: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-hover)',
          zIndex: 2000,
          fontWeight: 600,
          fontSize: '0.95rem',
          maxWidth: '400px',
          animation: 'slideUpFade 0.3s ease-out'
        }}>
          {toast.text}
        </div>
      )}

      {/* Live User Environmental Impact Tracker widget */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
          🌱 Your Personal Waste Rescue Impact
        </h2>
        <ImpactWidget userId={user.id} refreshTrigger={refreshStats} />
      </div>

      {/* Filter and Search controls */}
      <div style={{ marginBottom: '32px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search for restaurant names or meals..." />
        <CategoryTabs activeCategory={category} onSelect={setCategory} />
      </div>

      {/* Food Listings Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '60px',
          color: 'var(--text-secondary)',
          fontWeight: 500
        }}>
          Searching local stores for surplus...
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '24px',
          border: '1px dashed rgba(95, 111, 101, 0.2)'
        }}>
          <span style={{ fontSize: '2.5rem' }}>🍃</span>
          <h3 style={{ fontSize: '1.2rem', marginTop: '12px', color: 'var(--primary)' }}>No active surplus deals detected</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Check back later! Local restaurants list meals closer to their closing times.
          </p>
        </div>
      ) : (
        <div className="grid-responsive">
          {listings.map(item => (
            <FoodCard
              key={item._id}
              listing={item}
              onOrder={handleOrder}
              userRole={user.role}
              loadingId={loadingId}
            />
          ))}
        </div>
      )}
    </main>
  );
}
