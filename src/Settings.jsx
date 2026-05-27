import React from 'react'

export default function Settings({ theme, onThemeChange }) {
  return (
    <div className="settings-view">
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          System Settings
        </h2>
        
        <div className="form-group" style={{ maxWidth: '400px' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem', display: 'block' }}>Theme Preference</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { id: 'classic', label: 'Classic (Light)' },
              { id: 'dark', label: 'Dark Mode' },
              { id: 'midnight', label: 'Midnight Blue' },
              { id: 'forest', label: 'Forest Green' },
              { id: 'sunset', label: 'Sunset Orange' },
              { id: 'ocean', label: 'Ocean Teal' },
              { id: 'amethyst', label: 'Amethyst Purple' },
              { id: 'fern', label: 'Fern Green' }
            ].map(t => (
              <button 
                key={t.id}
                className={`btn ${theme === t.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onThemeChange(t.id)}
                style={{ flex: '1 1 calc(50% - 0.75rem)' }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Choose the interface theme that best suits your environment.
          </p>
        </div>
      </div>
    </div>
  )
}
