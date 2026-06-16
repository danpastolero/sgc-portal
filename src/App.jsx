import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Database,
  Users as UsersIcon,
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
  FileEdit,
  Menu
} from 'lucide-react'
import { supabase } from './lib/supabase'
import SettingsPage from './pages/Settings'
import TextExtractor from './pages/TextExtractor'
import PdfEditor from './pages/PdfEditor'
import Dashboard from './pages/Dashboard'
import Directory from './pages/Directory'
import Audit from './pages/Audit'
import Classifications from './pages/Classifications'
import Users from './pages/Users'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'classic')
  const [systemName, setSystemName] = useState(() => localStorage.getItem('systemName') || 'SGC - Systems Portal')
  const [systemLogo, setSystemLogo] = useState(() => localStorage.getItem('systemLogo') || '/logo.png')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)

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

  useEffect(() => {
    localStorage.setItem('systemName', systemName)
  }, [systemName])

  useEffect(() => {
    localStorage.setItem('systemLogo', systemLogo)
  }, [systemLogo])

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

  return (
    <div className="layout-container">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${isSidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer', margin: 0 }}>
            <div className="logo-icon" style={{ background: 'transparent' }}>
              <img src={systemLogo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
            </div>
            <span>{systemName}</span>
          </div>
          <button 
            className="menu-toggle-btn desktop-only" 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            aria-label="Toggle Menu"
          >
            <Menu size={24} />
          </button>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => { setActiveTab('directory'); setIsMobileMenuOpen(false); }}
          >
            <Database size={20} />
            <span>Systems Directory</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
          >
            <UsersIcon size={20} />
            <span>User Roles</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'classifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('classifications'); setIsMobileMenuOpen(false); }}
          >
            <LayoutDashboard size={20} />
            <span>Categories & Depts</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audit'); setIsMobileMenuOpen(false); }}
          >
            <History size={20} />
            <span>Audit Logs</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
          >
            <BarChart3 size={20} />
            <span>Reports</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'extractor' ? 'active' : ''}`}
            onClick={() => { setActiveTab('extractor'); setIsMobileMenuOpen(false); }}
          >
            <FileText size={20} />
            <span>Text Extractor</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'pdf-editor' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pdf-editor'); setIsMobileMenuOpen(false); }}
          >
            <FileEdit size={20} />
            <span>PDF Editor</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="menu-toggle-btn mobile-only" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
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
          activeTab === 'dashboard' ? <Dashboard stats={stats} systems={systems} setActiveTab={setActiveTab} /> :
            activeTab === 'directory' ? <Directory searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredSystems={filteredSystems} handleOpenEditSystem={handleOpenEditSystem} handleDeleteSystem={handleDeleteSystem} /> :
              activeTab === 'audit' ? <Audit auditLogs={auditLogs} /> :
                activeTab === 'users' ? <Users users={users} /> :
                  activeTab === 'classifications' ? <Classifications categories={categories} departments={departments} setShowCatModal={setShowCatModal} setShowDeptModal={setShowDeptModal} editingCategory={editingCategory} setEditingCategory={setEditingCategory} editingDepartment={editingDepartment} setEditingDepartment={setEditingDepartment} handleUpdateCategory={handleUpdateCategory} handleDeleteCategory={handleDeleteCategory} handleUpdateDepartment={handleUpdateDepartment} handleDeleteDepartment={handleDeleteDepartment} /> :
                    activeTab === 'settings' ? <SettingsPage theme={theme} onThemeChange={setTheme} systemName={systemName} setSystemName={setSystemName} systemLogo={systemLogo} setSystemLogo={setSystemLogo} /> :
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


