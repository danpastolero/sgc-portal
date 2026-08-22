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
  FileEdit,
  Eye,
  EyeOff,
  LogOut,
  Lock,
  Mail
} from 'lucide-react'
import { supabase } from './lib/supabase'
import SettingsPage from './Settings'
import TextExtractor from './TextExtractor'
import PdfEditor from './PdfEditor'
import PdfComparator from './PdfComparator'
import Papelitos from './Papelitos'
import './App.css'

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'directory', label: 'Systems Directory', icon: Database },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'extractor', label: 'Text Extractor', icon: FileText },
  { id: 'pdf-editor', label: 'PDF Editor', icon: FileEdit },
  { id: 'settings', label: 'System Settings', icon: Settings },
  { id: 'papelitos', label: 'Papelitos Management', icon: FileText },
  { id: 'users', label: 'User Roles', icon: Users },
  { id: 'classifications', label: 'Categories & Depts', icon: LayoutDashboard },
  { id: 'audit', label: 'Audit Logs', icon: History },
  { id: 'pdf-comparator', label: '3-PDF Comparator', icon: FileText }
]

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'classic')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showDeptModal, setShowDeptModal] = useState(false)

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userFormData, setUserFormData] = useState({
    id: null,
    full_name: '',
    email: '',
    role: 'Staff',
    status: 'active',
    allowed_tabs: ALL_MODULES.map(m => m.id)
  })

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

    const channel = supabase
      .channel('portal-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'systems' }, () => {
        fetchAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchLookups()
        fetchAllData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
        fetchLookups()
        fetchAllData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Redirect if current active tab is restricted for currentUser
  useEffect(() => {
    if (currentUser && currentUser.allowed_tabs && currentUser.allowed_tabs.length > 0) {
      if (!currentUser.allowed_tabs.includes(activeTab)) {
        setActiveTab(currentUser.allowed_tabs[0])
      }
    }
  }, [currentUser, activeTab])

  // User Management Handlers
  const resetUserForm = () => {
    setUserFormData({
      id: null,
      full_name: '',
      email: '',
      role: 'Staff',
      status: 'active',
      allowed_tabs: ALL_MODULES.map(m => m.id)
    })
  }

  const handleOpenAddUser = () => {
    resetUserForm()
    setShowUserModal(true)
  }

  const handleOpenEditUser = (user) => {
    setUserFormData({
      id: user.id,
      full_name: user.name,
      email: user.email,
      role: user.role || 'Staff',
      status: user.status || 'active',
      allowed_tabs: user.allowed_tabs || ALL_MODULES.map(m => m.id)
    })
    setShowUserModal(true)
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!userFormData.full_name || !userFormData.email) {
      return alert('Full Name and Email are required.')
    }
    if (!userFormData.allowed_tabs || userFormData.allowed_tabs.length === 0) {
      return alert('Please select at least one permitted module.')
    }

    setSaving(true)
    try {
      const payload = {
        full_name: userFormData.full_name,
        email: userFormData.email,
        role: userFormData.role,
        status: userFormData.status,
        allowed_tabs: userFormData.allowed_tabs
      }

      if (userFormData.id) {
        // Try updating Supabase
        const { data, error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', userFormData.id)
          .select()
          .single()

        if (error) {
          console.warn('Supabase update user warning:', error.message)
          // Update local state fallback
          setUsers(prev => prev.map(u => u.id === userFormData.id ? { ...u, name: payload.full_name, email: payload.email, role: payload.role, status: payload.status, allowed_tabs: payload.allowed_tabs } : u))
          if (currentUser?.id === userFormData.id) {
            setCurrentUser(prev => ({ ...prev, name: payload.full_name, email: payload.email, role: payload.role, status: payload.status, allowed_tabs: payload.allowed_tabs }))
          }
        } else {
          await supabase.from('audit_logs').insert([{
            user_id: currentUser?.id,
            action: 'Updated User Permissions',
            new_values: JSON.stringify({ name: payload.full_name, allowed_tabs: payload.allowed_tabs })
          }])
          await fetchAllData()
        }
      } else {
        // Try inserting Supabase
        const { data, error } = await supabase
          .from('users')
          .insert([payload])
          .select()
          .single()

        if (error) {
          console.warn('Supabase insert user warning:', error.message)
          // Insert local state fallback
          const newUser = {
            id: 'user-' + Date.now(),
            name: payload.full_name,
            email: payload.email,
            role: payload.role,
            status: payload.status,
            allowed_tabs: payload.allowed_tabs
          }
          setUsers(prev => [...prev, newUser])
        } else {
          await supabase.from('audit_logs').insert([{
            user_id: currentUser?.id,
            action: 'Created User',
            new_values: JSON.stringify({ name: payload.full_name, allowed_tabs: payload.allowed_tabs })
          }])
          await fetchAllData()
        }
      }

      setShowUserModal(false)
      resetUserForm()
    } catch (err) {
      alert('Error saving user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) {
        console.warn('Supabase delete user warning:', error.message)
        setUsers(prev => prev.filter(u => u.id !== userId))
      } else {
        await supabase.from('audit_logs').insert([{
          user_id: currentUser?.id,
          action: 'Deleted User',
          new_values: JSON.stringify({ user_id: userId })
        }])
        await fetchAllData()
      }

      if (currentUser?.id === userId) {
        setCurrentUser(users.find(u => u.id !== userId) || null)
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message)
    }
  }

  const togglePermission = (moduleId) => {
    setUserFormData(prev => {
      const current = prev.allowed_tabs || []
      if (current.includes(moduleId)) {
        return { ...prev, allowed_tabs: current.filter(id => id !== moduleId) }
      } else {
        return { ...prev, allowed_tabs: [...current, moduleId] }
      }
    })
  }

  const selectAllPermissions = () => {
    setUserFormData(prev => ({
      ...prev,
      allowed_tabs: ALL_MODULES.map(m => m.id)
    }))
  }

  const clearAllPermissions = () => {
    setUserFormData(prev => ({
      ...prev,
      allowed_tabs: []
    }))
  }

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

      const mappedUsers = (usersData || []).map(u => {
        let allowedTabs = ALL_MODULES.map(m => m.id)
        if (u.allowed_tabs) {
          if (Array.isArray(u.allowed_tabs)) {
            allowedTabs = u.allowed_tabs
          } else if (typeof u.allowed_tabs === 'string') {
            try { allowedTabs = JSON.parse(u.allowed_tabs) } catch (e) { }
          }
        }
        return {
          id: u.id,
          name: u.full_name || u.name || 'Unnamed User',
          email: u.email,
          role: u.role || 'Staff',
          status: u.status || 'active',
          allowed_tabs: allowedTabs
        }
      })

      if (mappedUsers.length === 0) {
        const defaultAdmin = {
          id: 'admin-default',
          name: 'System Administrator',
          email: 'admin@sgc.com',
          role: 'Super Admin',
          status: 'active',
          allowed_tabs: ALL_MODULES.map(m => m.id)
        }
        setUsers([defaultAdmin])
        setCurrentUser(prev => prev || defaultAdmin)
      } else {
        setUsers(mappedUsers)
        setCurrentUser(prev => prev || mappedUsers[0])
      }

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

  const renderUsers = () => {
    const filteredUsers = users.filter(u =>
      (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    )

    return (
      <div className="users-view">
        <div className="toolbar glass-panel">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search users by name, email or role..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleOpenAddUser}>
            <Plus size={18} />
            Add User
          </button>
        </div>

        <div className="system-table-container">
          <table className="system-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>User</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Role</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Email</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Allowed Access ({ALL_MODULES.length} Total)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const allowedCount = user.allowed_tabs?.length || 0
                const isFullAccess = allowedCount === ALL_MODULES.length

                return (
                  <tr key={user.id} className="system-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                          <span style={{ fontWeight: '600', display: 'block' }}>{user.name}</span>
                          {currentUser?.id === user.id && (
                            <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 'bold' }}>● Active Profile</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <Shield size={14} />
                        <span>{user.role}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${(user.status || 'active').toLowerCase() === 'active' ? 'active' : 'pending'}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isFullAccess ? (
                        <span className="permission-chip all-access">
                          <CheckCircle2 size={13} /> Full Access (All 11 Modules)
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '340px' }}>
                          {ALL_MODULES.filter(m => user.allowed_tabs?.includes(m.id)).map(m => (
                            <span key={m.id} className="permission-chip">
                              {m.label}
                            </span>
                          ))}
                          {allowedCount === 0 && (
                            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>No access granted</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" title="Edit User & Access" onClick={() => handleOpenEditUser(user)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn" style={{ color: '#f87171' }} title="Delete User" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon" style={{ background: 'transparent' }}>
            <img src="logo.png" alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
          </div>
          <span>SGC - Systems Portal</span>
        </div>

        <nav className="nav-links">
          {ALL_MODULES.filter(m => m.id !== 'settings' && (currentUser?.allowed_tabs || ALL_MODULES.map(x => x.id)).includes(m.id)).map(m => {
            const ModIcon = m.icon
            return (
              <div
                key={m.id}
                className={`nav-item ${activeTab === m.id ? 'active' : ''}`}
                onClick={() => setActiveTab(m.id)}
              >
                <ModIcon size={20} />
                <span>{m.label}</span>
              </div>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          {(currentUser?.allowed_tabs || ALL_MODULES.map(x => x.id)).includes('settings') && (
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={20} />
              <span>System Settings</span>
            </div>
          )}

          <div style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', opacity: 0.7 }}>
            © 2026 SGC System Portal <br></br> All Rights Reserved <br></br> Design and Develop by: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.8rem' }}>danpastolero</span>
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
                            activeTab === 'pdf-comparator' ? '3-PDF Comparison System' :
                              activeTab === 'papelitos' ? 'Papelitos Management' :
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
                            activeTab === 'pdf-comparator' ? 'Compare baseline, interim, and final PDF documents side-by-side' :
                              activeTab === 'papelitos' ? 'Record, monitor, pay, and return Papelitos transactions' :
                                activeTab === 'classifications' ? 'Manage system classifications and department ownership' : ''}
            </p>
          </div>

          <div className="header-actions">
            {/* Active Profile Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
              <User size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Active Profile:</span>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const targetUser = users.find(u => u.id === e.target.value)
                  if (targetUser) setCurrentUser(targetUser)
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                    {u.name} ({u.role || 'User'})
                  </option>
                ))}
              </select>
            </div>

            <div className="notification-bell">
              <Bell size={20} />
              <div className="notification-dot"></div>
            </div>
            {activeTab !== 'papelitos' && activeTab !== 'extractor' && activeTab !== 'pdf-editor' && activeTab !== 'pdf-comparator' && activeTab !== 'settings' && (
              <button className="btn btn-primary" onClick={() => {
                setFormData({ id: null, name: '', category_id: categories[0]?.id, department_id: departments[0]?.id, description: '', documentation_url: '' })
                setShowAddModal(true)
              }}>
                <Plus size={18} />
                Add System
              </button>
            )}
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
                          activeTab === 'pdf-comparator' ? <PdfComparator /> :
                            activeTab === 'papelitos' ? <Papelitos /> :
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

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-card modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h2>{userFormData.id ? 'Edit User & Access Permissions' : 'Add New User'}</h2>
              <button className="close-btn" onClick={() => setShowUserModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={userFormData.full_name}
                      onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. maria@sgc.com"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="System Admin">System Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Operator">Operator</option>
                      <option value="Staff">Staff</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={userFormData.status}
                      onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-main)' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      Limit Access / Permitted Modules ({userFormData.allowed_tabs.length} of {ALL_MODULES.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="text-link" style={{ fontSize: '0.75rem' }} onClick={selectAllPermissions}>Select All</button>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <button type="button" className="text-link" style={{ fontSize: '0.75rem', color: '#f87171' }} onClick={clearAllPermissions}>Clear All</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                    Select which of the 11 system modules this user is allowed to access:
                  </p>
                  <div className="permissions-grid">
                    {ALL_MODULES.map((mod) => {
                      const isChecked = userFormData.allowed_tabs.includes(mod.id)
                      const ModIcon = mod.icon
                      return (
                        <div
                          key={mod.id}
                          className={`permission-checkbox-item ${isChecked ? 'checked' : ''}`}
                          onClick={() => togglePermission(mod.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }}
                          />
                          <ModIcon size={16} color={isChecked ? 'var(--accent-primary)' : 'var(--text-dim)'} />
                          <span style={{ fontSize: '0.82rem', fontWeight: isChecked ? '500' : 'normal' }}>
                            {mod.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (userFormData.id ? 'Update Access' : 'Create User')}
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


