import React from 'react';
import { Monitor, Clock, ExternalLink } from 'lucide-react';

export default function Dashboard({ stats, systems, setActiveTab }) {
  return (
    <>
      <div className="dashboard-grid">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card stat-card">
            <div className="stat-header">
              <span className="stat-label">{stat.label}</span>
              <div style={{ color: stat.color, padding: '8px', background: `${stat.color}15`, borderRadius: '8px' }}>
                {stat.icon}
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="system-table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Recent Activity</h2>
          <button className="btn btn-secondary" onClick={() => setActiveTab('directory')}>View All Systems</button>
        </div>

        <table className="system-table">
          <thead>
            <tr>
              <th>System Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {systems.slice(0, 4).map((system) => (
              <tr key={system.id} className="system-row">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Monitor size={16} color="var(--accent-primary)" />
                    </div>
                    <span style={{ fontWeight: '500' }}>{system.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{system.category}</td>
                <td>
                  <span className={`badge badge-${system.status.toLowerCase()}`}>
                    {system.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} />
                    {system.lastUpdated}
                  </div>
                </td>
                <td>
                  {system.documentation_url ? (
                    <a
                      href={system.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-btn"
                      style={{ display: 'inline-flex', color: 'var(--text-dim)' }}
                      title="Open System Link"
                    >
                      <ExternalLink size={18} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--glass-border)', display: 'inline-flex', padding: '4px' }} title="No Link Available">
                      <ExternalLink size={18} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
