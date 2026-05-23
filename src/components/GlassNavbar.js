"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function GlassNavbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for user info on boot
    const storedUser = localStorage.getItem('decarb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Listen for custom authentication changes (e.g. login/register/logout)
    const handleAuthChange = () => {
      const stored = localStorage.getItem('decarb_user');
      setUser(stored ? JSON.parse(stored) : null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('decarb_user');
    localStorage.removeItem('decarb_token');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  return (
    <nav className="glass-panel" style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)',
      maxWidth: '1200px',
      height: '70px',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 30px',
      zIndex: 1000,
      boxShadow: 'var(--shadow-soft)'
    }}>
      {/* Brand Logo */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        fontWeight: 800,
        fontSize: '1.4rem',
        color: 'var(--primary)',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--secondary)' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        decarb<span style={{ color: 'var(--secondary)' }}>.io</span>
      </Link>

      {/* Nav Links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <Link href="/" style={{
          color: pathname === '/' ? 'var(--primary)' : 'var(--text-secondary)',
          fontWeight: pathname === '/' ? '700' : '500',
          textDecoration: 'none',
          fontSize: '0.95rem',
          transition: 'var(--transition-smooth)'
        }}>
          Home
        </Link>

        {user && user.role === 'customer' && (
          <Link href="/consumer" style={{
            color: pathname === '/consumer' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/consumer' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Rescue Deals
          </Link>
        )}

        {user && user.role === 'restaurant' && (
          <Link href="/restaurant" style={{
            color: pathname === '/restaurant' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/restaurant' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Dashboard
          </Link>
        )}

        {user && user.role === 'restaurant' && (
          <Link href="/restaurant/analytics" style={{
            color: pathname === '/restaurant/analytics' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/restaurant/analytics' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Analytics
          </Link>
        )}

        {user && user.role === 'ngo' && (
          <Link href="/ngo" style={{
            color: pathname === '/ngo' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/ngo' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            NGO Portal
          </Link>
        )}
      </div>

      {/* Auth Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {user ? (
          <>
            <span style={{
              fontSize: '0.85rem',
              background: 'var(--accent)',
              color: 'var(--primary)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {user.role}
            </span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              Hi, {user.name.split(' ')[0]}
            </span>
            <button onClick={handleLogout} className="btn btn-glass" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            {/* We will route to modals or standard routes. Let's make an intuitive modal trigger or redirect them to sign-in */}
            <Link href="/?auth=login" className="btn btn-glass" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Sign In
            </Link>
            <Link href="/?auth=register" className="btn btn-primary" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
