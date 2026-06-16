import React from 'react';
import { Search, Download, Plus, AlertCircle, History, User } from 'lucide-react';

export default function Audit({ auditLogs }) {
  return (
    <div className="audit-view">
      <div className="toolbar glass-panel">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search audit logs..." />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary"><Download size={18} /> Download CSV</button>
        </div>
      </div>

      <div className="system-table-container">
        <table className="system-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Action</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>System</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Details</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>User</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id} className="system-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {log.action === 'Added System' ? <Plus size={16} color="var(--accent-primary)" /> :
                        log.action === 'Status Change' ? <AlertCircle size={16} color="#ef4444" /> :
                          <History size={16} color="var(--accent-primary)" />}
                    </div>
                    <span style={{ fontWeight: '500' }}>{log.action}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{log.system}</td>
                <td style={{ padding: '1rem', maxWidth: '300px' }}>
                  {typeof log.rawDetail === 'object' && log.rawDetail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                      {Object.entries(log.rawDetail).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{log.detail}</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)' }}>
                    <User size={14} />
                    {log.user}
                  </div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {log.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
