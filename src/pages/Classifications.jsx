import React from 'react';
import { LayoutDashboard, Users, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function Classifications({
  categories,
  departments,
  setShowCatModal,
  setShowDeptModal,
  editingCategory,
  setEditingCategory,
  editingDepartment,
  setEditingDepartment,
  handleUpdateCategory,
  handleDeleteCategory,
  handleUpdateDepartment,
  handleDeleteDepartment
}) {
  return (
    <div className="classifications-view" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div className="system-table-container">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={20} color="var(--accent-primary)" />
            Categories
          </h2>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowCatModal(true)}>
            <Plus size={16} /> Add
          </button>
        </div>
        <table className="system-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Description</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="system-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                {editingCategory?.id === cat.id ? (
                  <>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        style={{ padding: '0.5rem', width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        style={{ padding: '0.5rem', width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" style={{ color: '#4ade80' }} onClick={() => handleUpdateCategory(cat.id, editingCategory.name, editingCategory.description)}><Save size={16} /></button>
                        <button className="icon-btn" onClick={() => setEditingCategory(null)}><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{cat.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{cat.description || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" onClick={() => setEditingCategory(cat)}><Edit2 size={16} /></button>
                        <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="system-table-container">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--accent-primary)" />
            Departments
          </h2>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowDeptModal(true)}>
            <Plus size={16} /> Add
          </button>
        </div>
        <table className="system-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Head of Dept</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="system-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                {editingDepartment?.id === dept.id ? (
                  <>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        value={editingDepartment.name}
                        onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                        style={{ padding: '0.5rem', width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        value={editingDepartment.head_of_dept || ''}
                        onChange={(e) => setEditingDepartment({ ...editingDepartment, head_of_dept: e.target.value })}
                        style={{ padding: '0.5rem', width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" style={{ color: '#4ade80' }} onClick={() => handleUpdateDepartment(dept.id, editingDepartment.name, editingDepartment.head_of_dept)}><Save size={16} /></button>
                        <button className="icon-btn" onClick={() => setEditingDepartment(null)}><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{dept.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{dept.head_of_dept || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" onClick={() => setEditingDepartment(dept)}><Edit2 size={16} /></button>
                        <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => handleDeleteDepartment(dept.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
