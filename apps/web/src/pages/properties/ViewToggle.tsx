import React, { useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import type { ViewMode } from '../../routes/properties/-types.js';

const C = {
  bgRaised: '#0D1526',
  border: '#1F2D48',
  textSecondary: '#8DA0C0',
  brandLight: '#5577FF',
  brandFaint: 'rgba(22,84,217,0.12)',
};

const messages = defineMessages({
  table: { id: 'properties.view.table' },
  cards: { id: 'properties.view.cards' },
  map:   { id: 'properties.view.map' },
  ariaGroup: { id: 'properties.list.ariaLabel' },
});

const MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  table: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  cards: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  map: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
};

const VIEW_MODES: ViewMode[] = ['table', 'cards', 'map'];

interface ViewToggleProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ current, onChange }: ViewToggleProps) {
  const intl = useIntl();

  const modeLabels: Record<ViewMode, string> = useMemo(() => ({
    table: intl.formatMessage(messages.table),
    cards: intl.formatMessage(messages.cards),
    map:   intl.formatMessage(messages.map),
  }), [intl]);

  return (
    <div
      style={{
        display: 'flex',
        background: C.bgRaised,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
      role="group"
      aria-label={intl.formatMessage(messages.ariaGroup)}
    >
      {VIEW_MODES.map((value, i) => {
        const active = current === value;
        const label = modeLabels[value];
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            aria-pressed={active}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 32,
              background: active ? C.brandFaint : 'transparent',
              color: active ? C.brandLight : C.textSecondary,
              border: 'none',
              borderRight: i < VIEW_MODES.length - 1 ? `1px solid ${C.border}` : 'none',
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {MODE_ICONS[value]}
          </button>
        );
      })}
    </div>
  );
}
