import React from 'react';

export type MobileTab = 'dashboard' | 'properties' | 'contacts' | 'leads' | 'more';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  notificationBadge?: number;
}

const TAB_CONFIG: Array<{ key: MobileTab; label: string; icon: React.ReactNode }> = [
  {
    key: 'dashboard',
    label: 'Inicio',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    key: 'properties',
    label: 'Propiedades',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'contacts',
    label: 'Contactos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'leads',
    label: 'Leads',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    key: 'more',
    label: 'Más',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
      </svg>
    ),
  },
];

const ACTIVE_COLOR = '#4669ff';
const INACTIVE_COLOR = '#506180';

export function MobileTabBar({ activeTab, onTabChange, notificationBadge }: MobileTabBarProps) {
  return (
    <>
      <style>{`
        .corredor-mobile-tab-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 200;
          background: #0D1526;
          border-top: 1px solid #1F2D48;
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          height: calc(56px + env(safe-area-inset-bottom, 0px));
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
        }
        .corredor-mobile-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 6px 0;
          border: none;
          background: none;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 100ms ease;
        }
        .corredor-mobile-tab:active {
          opacity: 0.6;
        }
        .corredor-mobile-tab-label {
          font-size: 10px;
          font-weight: 500;
          font-family: 'DM Sans', system-ui, sans-serif;
          line-height: 1;
        }
        .corredor-mobile-tab-badge {
          position: absolute;
          top: 4px;
          right: calc(50% - 16px);
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          background: #E83B3B;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
      `}</style>
      <nav className="corredor-mobile-tab-bar" role="tablist">
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key;
          const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="corredor-mobile-tab"
              onClick={() => onTabChange(tab.key)}
              style={{ color }}
            >
              {tab.icon}
              <span className="corredor-mobile-tab-label">{tab.label}</span>
              {tab.key === 'leads' && notificationBadge != null && notificationBadge > 0 && (
                <span className="corredor-mobile-tab-badge">
                  {notificationBadge > 99 ? '99+' : notificationBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
