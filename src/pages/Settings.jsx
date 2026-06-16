import React, { useRef } from 'react'

export default function Settings({ theme, onThemeChange, systemName, setSystemName, systemLogo, setSystemLogo }) {
  const fileInputRef = useRef(null)

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSystemLogo(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="settings-view">
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', margin: 0 }}>
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

        <div className="form-group" style={{ maxWidth: '400px' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem', display: 'block' }}>Branding</label>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>System Name</label>
            <input 
              type="text" 
              value={systemName} 
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="SGC - Systems Portal"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>System Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', height: '60px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', overflow: 'hidden', padding: '0.25rem' }}>
                <img src={systemLogo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => fileInputRef.current.click()}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Upload New
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSystemLogo('/logo.png')}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
