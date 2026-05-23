"use client";
import { useState } from 'react';
import FloatingCard from './FloatingCard';

export default function FoodCard({ listing, onOrder, userRole, loadingId }) {
  const {
    _id,
    title,
    description,
    price,
    original_price,
    quantity,
    pickup_time,
    co2_saved,
    image,
    restaurant_id,
    distance,
    status
  } = listing;

  const [orderQty, setOrderQty] = useState(1);

  const restaurantName = typeof restaurant_id === 'object' && restaurant_id ? restaurant_id.name : 'Partner Store';
  const isFree = Number(price) === 0;
  const isAvailable = status === 'available' && Number(quantity) > 0;
  const isLoading = loadingId === _id;

  const formattedTime = new Date(pickup_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' - ' + new Date(pickup_time).toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });

  return (
    <FloatingCard style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Listing Image & CO2 Saved Tag */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '180px',
        overflow: 'hidden',
        borderTopLeftRadius: '28px',
        borderTopRightRadius: '28px'
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={image} 
          alt={title} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'var(--transition-smooth)'
          }}
          className="card-img-zoom"
        />
        
        {/* CO2 Savings Tag */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'var(--primary)',
          color: '#FFFFFF',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 4px 10px rgba(47,107,79,0.3)',
          backdropFilter: 'blur(4px)'
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58-1 9.8a7 7 0 0 1-7 8.2z"/>
            <path d="M9 10a1 1 0 0 1-2 0"/>
          </svg>
          -{co2_saved} kg CO2
        </div>

        {/* Distance Badge if exists */}
        {distance !== undefined && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            color: 'var(--text-primary)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-soft)'
          }}>
            📍 {distance} km away
          </div>
        )}
      </div>

      {/* Card Details */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'space-between'
      }}>
        <div>
          {/* Restaurant details */}
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 700,
            marginBottom: '4px'
          }}>
            {restaurantName}
          </p>

          <h3 style={{
            fontSize: '1.25rem',
            marginBottom: '8px',
            lineHeight: 1.2
          }}>
            {title}
          </h3>

          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: '2',
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '40px'
          }}>
            {description || 'No description provided.'}
          </p>

          {/* Logistics info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
            borderTop: '1px solid rgba(95, 111, 101, 0.1)',
            paddingTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🕒</span>
              <span>Pickup: <strong>{formattedTime}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📦</span>
              <span>Stock: <strong>{quantity} left</strong></span>
            </div>
          </div>
        </div>

        <div>
          {/* Price Comparisons */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div>
              {isFree ? (
                <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  FREE DONATION
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--primary)'
                  }}>${Number(price).toFixed(2)}</span>
                  <span style={{
                    fontSize: '0.9rem',
                    textDecoration: 'line-through',
                    color: 'var(--text-secondary)'
                  }}>${Number(original_price).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Quantity Selector for Customers if item is available */}
            {isAvailable && userRole === 'customer' && Number(quantity) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty:</span>
                <select 
                  value={orderQty} 
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(95, 111, 101, 0.2)',
                    background: 'var(--surface)',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                >
                  {[...Array(Math.min(5, Number(quantity)))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Button */}
          {userRole === 'customer' || userRole === 'ngo' ? (
            <button
              onClick={() => onOrder(_id, orderQty)}
              disabled={!isAvailable || isLoading}
              className={`btn ${isAvailable ? 'btn-primary' : 'btn-danger'}`}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '16px',
                fontSize: '0.9rem',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Processing...' : isAvailable 
                ? (isFree ? 'Claim Donation' : 'Rescue Meal') 
                : (status === 'sold' ? 'Already Rescued' : 'Expired')}
            </button>
          ) : (
            <div style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              background: 'var(--accent)',
              padding: '10px',
              borderRadius: '12px',
              fontWeight: 500
            }}>
              {status === 'available' ? 'Listing is Active' : `Status: ${status}`}
            </div>
          )}
        </div>
      </div>
    </FloatingCard>
  );
}
