import React from 'react';
import { Search, Plus, User, Shield, Key, Settings } from 'lucide-react';

export default function Users({ users }) {
  return (
    <div className="users-view">
      <div className="toolbar glass-panel">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search users or roles..." />
        </div>
        <button className="btn btn-primary">
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div className="system-table-container">
        <table className="system-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="system-row">
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color="var(--accent-primary)" />
                    </div>
                    <span style={{ fontWeight: '500' }}>{user.name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Shield size={14} />
                    {user.role}
                  </div>
                </td>
                <td style={{ color: 'var(--text-dim)' }}>{user.email}</td>
                <td>
                  <span className={`badge badge-${user.status.toLowerCase() === 'active' ? 'active' : 'pending'}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Key size={14} color="var(--accent-primary)" />
                    <Key size={14} color="var(--accent-primary)" />
                    <Key size={14} color="var(--text-dim)" />
                  </div>
                </td>
                <td>
                  <button className="icon-btn"><Settings size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
