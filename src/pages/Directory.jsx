import React from 'react';
import { Search, Filter, Download, Monitor, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';

export default function Directory({
  searchQuery,
  setSearchQuery,
  filteredSystems,
  handleOpenEditSystem,
  handleDeleteSystem
}) {
  return (
    <div className="directory-view">
      <div className="toolbar glass-panel">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Filter systems by name, owner or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary"><Filter size={18} /> Filter</button>
          <button className="btn btn-secondary"><Download size={18} /> Export</button>
        </div>
      </div>

      <div className="system-table-container">
        <table className="system-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>System Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Description</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Category/Dept</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Link</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map(system => (
              <tr key={system.id} className="system-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Monitor size={16} color="var(--accent-primary)" />
                    </div>
                    <span style={{ fontWeight: '500' }}>{system.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-dim)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {system.description || 'No description'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>{system.category || 'N/A'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{system.owner || 'N/A'}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge badge-${(system.status || 'active').toLowerCase()}`}>
                    {system.status || 'Active'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {system.documentation_url ? (
                    <a href={system.documentation_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      <LinkIcon size={14} />
                      Open
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>No link</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="icon-btn" title="Edit System" onClick={() => handleOpenEditSystem(system.id)}><Edit2 size={18} /></button>
                    <button className="icon-btn" style={{ color: '#f87171' }} title="Delete System" onClick={() => handleDeleteSystem(system.id)}><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
