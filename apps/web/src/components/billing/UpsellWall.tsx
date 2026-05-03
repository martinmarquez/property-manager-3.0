import React from 'react';
import { C, F } from '../copilot/tokens.js';

export interface UpsellWallProps {
  featureName: string;
  requiredPlan: string;
  description?: string;
  onUpgrade?: () => void;
}

export function UpsellWall({ featureName, requiredPlan, description, onUpgrade }: UpsellWallProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', textAlign: 'center',
      background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: C.brandFaint, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, fontSize: 24,
      }}>
        🔒
      </div>
      <h3 style={{
        fontFamily: F.display, fontSize: 20, fontWeight: 700,
        color: C.textPrimary, margin: '0 0 8px',
      }}>
        {featureName}
      </h3>
      <p style={{
        fontFamily: F.body, fontSize: 14, color: C.textSecondary,
        maxWidth: 360, margin: '0 0 8px', lineHeight: 1.5,
      }}>
        {description ?? 'Esta función no está disponible en tu plan actual.'}
      </p>
      <p style={{
        fontFamily: F.body, fontSize: 13, color: C.textTertiary,
        margin: '0 0 24px',
      }}>
        Disponible desde el plan <strong style={{ color: C.textPrimary }}>{requiredPlan}</strong>
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        style={{
          background: C.brand, color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 24px',
          fontFamily: F.body, fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Actualizar plan
      </button>
    </div>
  );
}
