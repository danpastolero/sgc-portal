import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Database,
  Users,
  ShieldCheck,
  History,
  BarChart3,
  Search,
  Plus,
  Settings,
  Bell,
  ExternalLink,
  ChevronRight,
  Monitor,
  Filter,
  Download,
  MoreVertical,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Shield,
  Key,
  Loader2,
  Edit2,
  Trash2,
  Save,
  Link as LinkIcon,
  FileText,
  FileEdit
} from 'lucide-react'
import { supabase } from './lib/supabase'
import SettingsPage from './Settings'
import TextExtractor from './TextExtractor'
import PdfEditor from './PdfEditor'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'classic')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [systems, setSystems] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState([])

  // Lookup data for form
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])

  // CRUD Edit State
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingDepartment, setEditingDepartment] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category_id: '',
    department_id: '',
    description: '',
    documentation_url: ''
  })

  // Quick Add State
  const [newCatName, setNewCatName] = useState('')
  const [newDeptName, setNewDeptName] = useState('')

  useEffect(() => {
    fetchAllData()
    fetchLookups()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const fetchLookups = async () => {
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('name')
      const { data: deptData } = await supabase.from('departments').select('*').order('name')
      setCategories(catData || [])
      setDepartments(deptData || [])

      // Update form defaults if currently empty
      setFormData(prev => ({
        ...prev,
        category_id: prev.category_id || catData?.[0]?.id || '',
        department_id: prev.department_id || deptData?.[0]?.id || ''
      }))
    } catch (error) {
      console.error('Error fetching lookups:', error)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const { data: systemsData, error: systemsError } = await supabase
        .from('systems')
        .select(`*, categories(name), departments(name)`)

      if (systemsError) throw systemsError

      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select(`*, users(full_name), systems(name)`)
        .order('created_at', { ascending: false })

      if (logsError) throw logsError

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')

      if (usersError) throw usersError

      setSystems(systemsData.map(s => ({
        id: s.id,
        name: s.name,
        category: s.categories?.name || 'Uncategorized',
        owner: s.departments?.name || 'No Owner',
        status: s.status,
        documentation_url: s.documentation_url,
        lastUpdated: new Date(s.updated_at).toLocaleDateString(),
        description: s.description
      })))

      setAuditLogs(logsData.map(l => {
        let parsedValues = null;
        try {
          parsedValues = typeof l.new_values === 'string' ? JSON.parse(l.new_values) : l.new_values;
        } catch (e) {
          parsedValues = l.new_values;
        }

        return {
          id: l.id,
          action: l.action,
          system: l.systems?.name || 'Unknown System',
          user: l.users?.full_name || 'System',
          time: formatTimeAgo(l.created_at),
          rawDetail: parsedValues,
          detail: typeof parsedValues === 'object' && parsedValues ? JSON.stringify(parsedValues) : String(parsedValues || 'N/A')
        };
      }))

      setUsers(usersData.map(u => ({
        id: u.id,
        name: u.full_name,
        role: 'Admin',
        email: u.email,
        status: u.status
      })))

      setStats([
        { label: 'Total Systems', value: systemsData.length.toString(), icon: <Database size={20} />, color: 'var(--accent-primary)' },
        { label: 'Active Now', value: systemsData.filter(s => s.status === 'active').length.toString(), icon: <ShieldCheck size={20} />, color: '#22c55e' },
        { label: 'Incidents', value: systemsData.filter(s => s.status === 'critical').length.toString(), icon: <Bell size={20} />, color: '#ef4444' },
        { label: 'System Health', value: '96%', icon: <BarChart3 size={20} />, color: '#8b5cf6' },
      ])

    } catch (error) {
      console.error('Error fetching data:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSystem = async () => {
    if (!formData.name) return alert('System name is required')
    setSaving(true)
    try {
      const systemData = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        department_id: formData.department_id,
        documentation_url: formData.documentation_url,
        status: 'active',
        uptime_percentage: 100
      }

      const { data: adminUser } = await supabase.from('users').select('id').limit(1).single()
      let savedSystem;

      if (formData.id) {
        const { data, error } = await supabase.from('systems').update(systemData).eq('id', formData.id).select().single()
        if (error) throw error
        savedSystem = data
        await supabase.from('audit_logs').insert([{ user_id: adminUser?.id, system_id: savedSystem.id, action: 'Updated System', new_values: JSON.stringify({ name: savedSystem.name }) }])
      } else {
        const { data, error } = await supabase.from('systems').insert([systemData]).select().single()
        if (error) throw error
        savedSystem = data
        await supabase.from('audit_logs').insert([{ user_id: adminUser?.id, system_id: savedSystem.id, action: 'Added System', new_values: JSON.stringify({ name: savedSystem.name }) }])
      }

      await fetchAllData()
      setShowAddModal(false)
      setFormData({ id: null, name: '', category_id: categories[0]?.id, department_id: departments[0]?.id, description: '', documentation_url: '' })
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditSystem = async (id) => {
    try {
      const { data, error } = await supabase.from('systems').select('*').eq('id', id).single()
      if (error) throw error
      setFormData({
        id: data.id,
        name: data.name,
        category_id: data.category_id || categories[0]?.id,
        department_id: data.department_id || departments[0]?.id,
        description: data.description || '',
        documentation_url: data.documentation_url || ''
      })
      setShowAddModal(true)
    } catch (err) {
      alert('Error fetching system details: ' + err.message)
    }
  }

  const handleDeleteSystem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this system?')) return;
    try {
      const { data: adminUser } = await supabase.from('users').select('id').limit(1).single()
      const { data: sysData } = await supabase.from('systems').select('name').eq('id', id).single()

      const { error } = await supabase.from('systems').delete().eq('id', id);
      if (error) throw error;

      if (sysData) {
        await supabase.from('audit_logs').insert([{ user_id: adminUser?.id, system_id: null, action: 'Deleted System', new_values: JSON.stringify({ name: sysData.name }) }])
      }
      await fetchAllData();
    } catch (error) {
      alert('Error deleting system: ' + error.message);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!newCatName) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('categories').insert([{ name: newCatName }]).select().single()
      if (error) throw error
      await fetchLookups()
      setFormData(prev => ({ ...prev, category_id: data.id }))
      setNewCatName('')
      setShowCatModal(false)
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDepartment = async (e) => {
    e.preventDefault()
    if (!newDeptName) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('departments').insert([{ name: newDeptName }]).select().single()
      if (error) throw error
      await fetchLookups()
      setFormData(prev => ({ ...prev, department_id: data.id }))
      setNewDeptName('')
      setShowDeptModal(false)
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await fetchLookups();
    } catch (error) {
      alert('Error deleting category: ' + error.message);
    }
  };

  const handleUpdateCategory = async (id, name, description) => {
    try {
      const { error } = await supabase.from('categories').update({ name, description }).eq('id', id);
      if (error) throw error;
      await fetchLookups();
      setEditingCategory(null);
    } catch (error) {
      alert('Error updating category: ' + error.message);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      await fetchLookups();
    } catch (error) {
      alert('Error deleting department: ' + error.message);
    }
  };

  const handleUpdateDepartment = async (id, name, head_of_dept) => {
    try {
      const { error } = await supabase.from('departments').update({ name, head_of_dept }).eq('id', id);
      if (error) throw error;
      await fetchLookups();
      setEditingDepartment(null);
    } catch (error) {
      alert('Error updating department: ' + error.message);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  const filteredSystems = systems.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderDashboard = () => (
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
  )

  const renderDirectory = () => (
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
  )

  const renderAudit = () => (
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
  )

  const renderClassifications = () => (
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
  )

  const renderUsers = () => (
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
  )

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon" style={{ background: 'transparent' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
          </div>
          <span>SGC - Systems Portal</span>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            <Database size={20} />
            <span>Systems Directory</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            <span>User Roles</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'classifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('classifications')}
          >
            <LayoutDashboard size={20} />
            <span>Categories & Depts</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={20} />
            <span>Audit Logs</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={20} />
            <span>Reports</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'extractor' ? 'active' : ''}`}
            onClick={() => setActiveTab('extractor')}
          >
            <FileText size={20} />
            <span>Text Extractor</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'pdf-editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf-editor')}
          >
            <FileEdit size={20} />
            <span>PDF Editor</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            <span>System Settings</span>
          </div>

          <div style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', opacity: 0.7 }}>
            © 2026 SGC-Directory Portal <br></br> All Rights Reserved <br></br> Design and Develop by: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.8rem' }}>danpastolero</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' ? 'System Dashboard' :
                activeTab === 'directory' ? 'Systems Directory' :
                  activeTab === 'audit' ? 'Audit History' :
                    activeTab === 'users' ? 'Access Control' :
                      activeTab === 'settings' ? 'Settings' :
                        activeTab === 'extractor' ? 'Text Extractor' :
                          activeTab === 'pdf-editor' ? 'PDF Editor' :
                            activeTab === 'classifications' ? 'Categories & Departments' : 'Section Under Development'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'dashboard' ? 'Real-time overview of all infrastructure' :
                activeTab === 'directory' ? 'Manage and register corporate systems' :
                  activeTab === 'audit' ? 'Full chronological record of system changes' :
                    activeTab === 'users' ? 'Manage user roles and system permissions' :
                      activeTab === 'settings' ? 'Configure application preferences' :
                        activeTab === 'extractor' ? 'Extract text from images automatically' :
                          activeTab === 'pdf-editor' ? 'Edit and manipulate PDF documents' :
                            activeTab === 'classifications' ? 'Manage system classifications and department ownership' : ''}
            </p>
          </div>

          <div className="header-actions">
            <div className="notification-bell">
              <Bell size={20} />
              <div className="notification-dot"></div>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setFormData({ id: null, name: '', category_id: categories[0]?.id, department_id: departments[0]?.id, description: '', documentation_url: '' })
              setShowAddModal(true)
            }}>
              <Plus size={18} />
              Add System
            </button>
          </div>
        </header>

        {loading ? (
          <div className="loading-container">
            <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
            <p>Fetching infrastructure data...</p>
          </div>
        ) : (
          activeTab === 'dashboard' ? renderDashboard() :
            activeTab === 'directory' ? renderDirectory() :
              activeTab === 'audit' ? renderAudit() :
                activeTab === 'users' ? renderUsers() :
                  activeTab === 'classifications' ? renderClassifications() :
                    activeTab === 'settings' ? <SettingsPage theme={theme} onThemeChange={setTheme} /> :
                      activeTab === 'extractor' ? <TextExtractor /> :
                        activeTab === 'pdf-editor' ? <PdfEditor /> :
                        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                          <Settings size={48} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
                          <h2>Module Under Construction</h2>
                          <p style={{ color: 'var(--text-dim)' }}>We're working on the {activeTab} module.</p>
                        </div>
        )}
      </main>

      {/* Add System Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2>{formData.id ? 'Edit System' : 'Register New System'}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form
              className="modal-body"
              onSubmit={(e) => { e.preventDefault(); handleSaveSystem(); }}
              autoComplete="on"
            >
              <div className="form-group">
                <label htmlFor="system_name">System Name</label>
                <input
                  id="system_name"
                  name="system_name"
                  type="text"
                  placeholder="e.g. Enterprise CRM"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoComplete="name"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="category" style={{ marginBottom: 0 }}>Category</label>
                    <button type="button" className="text-link" style={{ fontSize: '0.75rem' }} onClick={() => setShowCatModal(true)}>
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                  <select
                    id="category"
                    name="category"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="department" style={{ marginBottom: 0 }}>Department Owner</label>
                    <button type="button" className="text-link" style={{ fontSize: '0.75rem' }} onClick={() => setShowDeptModal(true)}>
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                  <select
                    id="department"
                    name="department"
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="documentation_url">System Link</label>
                <input
                  id="documentation_url"
                  name="documentation_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.documentation_url}
                  onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                  autoComplete="url"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Briefly describe the system purpose..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  autoComplete="on"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>New Category</h2>
              <button className="close-btn" onClick={() => setShowCatModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Finance"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>New Department</h2>
              <button className="close-btn" onClick={() => setShowDeptModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App


