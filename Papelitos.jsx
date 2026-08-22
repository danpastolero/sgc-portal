import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Building,
  User,
  Hash,
  Clock,
  X,
  RefreshCw,
  BarChart3,
  ListFilter,
  ArrowUpDown,
  Check,
  Tag,
  Printer
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from './lib/supabase';

const getStoredItems = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading localStorage key ' + key, e);
    return [];
  }
};

const setStoredItems = (key, items) => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('Error writing localStorage key ' + key, e);
  }
};

// Color palette for Company Report matching exact image styling (Green, Pink/Magenta, Coral/Red, Soft Blue, Yellow, Purple, Teal)
const COMPANY_ROW_COLORS = [
  { bg: '#a8d08d', text: '#000000', rgb: [168 / 255, 208 / 255, 141 / 255] }, // Soft Green (e.g. LDN)
  { bg: '#ff00ff', text: '#000000', rgb: [255 / 255, 0 / 255, 255 / 255] },   // Magenta/Pink (e.g. LDS)
  { bg: '#e57373', text: '#000000', rgb: [229 / 255, 115 / 255, 115 / 255] }, // Coral/Red (e.g. IMPERIAL)
  { bg: '#90caf9', text: '#000000', rgb: [144 / 255, 202 / 255, 249 / 255] }, // Soft Blue (e.g. 5A ROYAL)
  { bg: '#ffe082', text: '#000000', rgb: [255 / 255, 224 / 255, 130 / 255] }, // Soft Yellow
  { bg: '#ce93d8', text: '#000000', rgb: [206 / 255, 147 / 255, 216 / 255] }, // Soft Purple
  { bg: '#80cbc4', text: '#000000', rgb: [128 / 255, 203 / 255, 196 / 255] }  // Soft Teal
];

function getMonthInfo(filterMonth) {
  let dateObj = new Date();
  if (filterMonth && filterMonth.includes('-')) {
    const [y, m] = filterMonth.split('-').map(Number);
    dateObj = new Date(y, m - 1, 1);
  }
  const year = dateObj.getFullYear();
  const monthIdx = dateObj.getMonth();
  const daysCount = new Date(year, monthIdx + 1, 0).getDate();
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  return {
    monthName,
    daysCount,
    year,
    title: `${monthName} (${daysCount} DAYS)`
  };
}

// Initial Sample Data (default empty)
const INITIAL_MOCK_PAPELITOS = [];

// Helper to generate initials from full name
function getInitials(name) {
  if (!name) return 'P';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Helper color palette for avatars based on name hash
const AVATAR_COLORS = [
  { bg: 'rgba(37, 99, 235, 0.15)', text: '#2563eb' },
  { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
  { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' }
];

function getAvatarStyle(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Convert number to words for Cash Voucher (e.g. 1500 -> ONE THOUSAND FIVE HUNDRED PESOS ONLY)
function amountInWords(amount) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  function convert(n) {
    if (n === 0) return 'Zero';
    let res = '';
    if (Math.floor(n / 1000000) > 0) {
      res += convertLessThanThousand(Math.floor(n / 1000000)) + ' Million ';
      n %= 1000000;
    }
    if (Math.floor(n / 1000) > 0) {
      res += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      res += convertLessThanThousand(n);
    }
    return res.trim();
  }

  const intPart = Math.floor(amount);
  const words = convert(intPart);
  return `${words} PESOS ONLY`.toUpperCase();
}

export default function Papelitos() {
  const [papelitosList, setPapelitosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Navigation View Mode inside module
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'reports'

  // Multi-Select Filter Buttons: Array of active filter keys e.g. ['unpaid', 'unreturned']
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('date_received');
  const [sortOrder, setSortOrder] = useState('desc');

  // Action Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [showPaidModal, setShowPaidModal] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState(null);

  // Multi-selection for Batch Payment
  const [selectedIds, setSelectedIds] = useState([]);
  const [shouldPrintVoucher, setShouldPrintVoucher] = useState(true);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnRemarksInput, setReturnRemarksInput] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form State & Validation
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    quantity: 1,
    date_received: new Date().toISOString().split('T')[0],
    payment_status: 'Unpaid',
    status: 'Unreturned',
    remarks: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'table_missing' | 'rls_blocked' | 'error' | 'checking'

  // Voucher Print Queue & A4 Preview Modal State
  const [voucherQueue, setVoucherQueue] = useState([]);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

  // Add record to voucher queue
  const addToVoucherQueue = (record) => {
    setVoucherQueue(prev => {
      if (prev.some(item => item.id === record.id)) return prev;
      return [...prev, record];
    });
  };

  // Remove record from voucher queue
  const removeFromVoucherQueue = (recordId) => {
    setVoucherQueue(prev => prev.filter(item => item.id !== recordId));
  };

  useEffect(() => {
    fetchPapelitos();

    const channel = supabase
      .channel('papelitos-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'papelitos' }, () => {
        fetchPapelitos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Papelitos records from Supabase
  const fetchPapelitos = async () => {
    setLoading(true);
    setErrorMsg(null);
    let remoteData = [];
    try {
      let { data, error } = await supabase
        .from('papelitos')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error && (error.message?.includes('is_deleted') || error.code === '42703')) {
        const fallback = await supabase
          .from('papelitos')
          .select('*')
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn('Supabase fetch notice:', error.message);
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          setDbStatus('table_missing');
        } else if (error.code === '42501' || error.message?.includes('row-level security')) {
          setDbStatus('rls_blocked');
        } else {
          setDbStatus('error');
        }
      } else {
        setDbStatus('connected');
        remoteData = data || [];
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setDbStatus('error');
    } finally {
      const localItems = getStoredItems('sgc_portal_local_papelitos');
      const mergedMap = new Map();
      remoteData.forEach(item => mergedMap.set(item.id, item));
      localItems.forEach(item => {
        if (item && item.id) {
          const existing = mergedMap.get(item.id);
          if (existing) {
            mergedMap.set(item.id, { ...existing, ...item });
          } else if (!item.is_deleted) {
            mergedMap.set(item.id, item);
          }
        }
      });
      const finalPapelitos = Array.from(mergedMap.values()).filter(i => !i.is_deleted);
      setPapelitosList(finalPapelitos);
      setLoading(false);
    }
  };

  // Clear all database records
  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all Papelitos records from the database? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('papelitos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.warn('Delete error:', error.message);
      }
      setStoredItems('sgc_portal_local_papelitos', []);
      setPapelitosList([]);
      showNotification('All Papelitos records cleared.');
    } catch (err) {
      console.error('Clear DB error:', err);
      setStoredItems('sgc_portal_local_papelitos', []);
      setPapelitosList([]);
      showNotification('Local records cleared.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // Helper for audit logging
  const logAudit = async (action, recordId, oldVals, newVals) => {
    try {
      await supabase.from('audit_logs').insert([
        {
          action: `Papelitos: ${action}`,
          old_values: JSON.stringify(oldVals),
          new_values: JSON.stringify({ record_id: recordId, ...newVals })
        }
      ]);
    } catch (e) {
      console.log('Audit log entry skipped:', e);
    }
  };

  // Summary Metrics Calculation
  const summaryStats = useMemo(() => {
    const totalRecords = papelitosList.length;
    let totalUnpaid = 0;
    let totalPaid = 0;
    let totalUnreturned = 0;
    let totalReturned = 0;
    let totalQuantity = 0;
    let totalUnpaidQty = 0;
    let totalPaidQty = 0;

    papelitosList.forEach(item => {
      const qty = Number(item.quantity) || 0;
      totalQuantity += qty;

      if (item.payment_status === 'Paid') {
        totalPaid += 1;
        totalPaidQty += qty;
      } else {
        totalUnpaid += 1;
        totalUnpaidQty += qty;
      }

      if (item.status === 'Returned') {
        totalReturned += 1;
      } else {
        totalUnreturned += 1;
      }
    });

    const totalAmount = totalQuantity * 100;
    const totalUnpaidAmount = totalUnpaidQty * 100;
    const totalPaidAmount = totalPaidQty * 100;

    return {
      totalRecords,
      totalUnpaid,
      totalPaid,
      totalUnreturned,
      totalReturned,
      totalQuantity,
      totalUnpaidQty,
      totalPaidQty,
      totalAmount,
      totalUnpaidAmount,
      totalPaidAmount
    };
  }, [papelitosList]);

  // Toggle Multi-Select Filter Button
  const toggleFilter = (filterKey) => {
    if (filterKey === 'all') {
      setSelectedFilters([]);
      return;
    }
    setSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        return prev.filter(k => k !== filterKey);
      } else {
        return [...prev, filterKey];
      }
    });
  };

  // Search & Multi-Select Filter Logic
  const filteredList = useMemo(() => {
    return papelitosList.filter(item => {
      // 1. Search Query (Name, Company, ID)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const nameMatch = item.name?.toLowerCase().includes(q);
        const compMatch = item.company_name?.toLowerCase().includes(q);
        const idMatch = item.id?.toLowerCase().includes(q);
        if (!nameMatch && !compMatch && !idMatch) return false;
      }

      // 2. Multi-Select Filter Buttons
      if (selectedFilters.length > 0) {
        const hasUnpaid = selectedFilters.includes('unpaid');
        const hasPaid = selectedFilters.includes('paid');
        const hasUnreturned = selectedFilters.includes('unreturned');
        const hasReturned = selectedFilters.includes('returned');

        // Payment status filter
        if (hasUnpaid || hasPaid) {
          const isUnpaidMatch = hasUnpaid && item.payment_status === 'Unpaid';
          const isPaidMatch = hasPaid && item.payment_status === 'Paid';
          if (!isUnpaidMatch && !isPaidMatch) return false;
        }

        // Papelitos status filter
        if (hasUnreturned || hasReturned) {
          const itemStatus = item.status === 'Returned' ? 'Returned' : 'Unreturned';
          const isUnreturnedMatch = hasUnreturned && itemStatus === 'Unreturned';
          const isReturnedMatch = hasReturned && itemStatus === 'Returned';
          if (!isUnreturnedMatch && !isReturnedMatch) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'quantity') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [papelitosList, searchQuery, selectedFilters, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFilters([]);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      name: '',
      company_name: 'LDN',
      quantity: 1,
      date_received: new Date().toISOString().split('T')[0],
      payment_status: 'Unpaid',
      status: 'Unreturned',
      remarks: ''
    });
    setFormErrors({});
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      name: record.name || '',
      company_name: record.company_name || 'LDN',
      quantity: record.quantity || 1,
      date_received: record.date_received || new Date().toISOString().split('T')[0],
      payment_status: record.payment_status || 'Unpaid',
      status: record.status === 'Returned' ? 'Returned' : 'Unreturned',
      remarks: record.remarks || ''
    });
    setFormErrors({});
    setShowAddEditModal(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Person Name is required.';
    if (!formData.company_name.trim()) errors.company_name = 'Company Name is required.';

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      errors.quantity = 'Number of Papelitos must be a positive integer (> 0).';
    }

    if (!formData.date_received) {
      errors.date_received = 'Date Received is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Record (Add or Edit)
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const computedStatus = formData.status === 'Returned' ? 'Returned' : 'Unreturned';

    const payload = {
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      quantity: Number(formData.quantity),
      date_received: formData.date_received,
      payment_status: formData.payment_status,
      status: computedStatus,
      remarks: formData.remarks.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (formData.payment_status === 'Paid' && !editingRecord?.date_paid) {
      payload.date_paid = new Date().toISOString();
    }
    if (formData.status === 'Returned' && !editingRecord?.date_returned) {
      payload.date_returned = new Date().toISOString();
    }

    try {
      let savedRecord = null;
      if (editingRecord) {
        let { data, error } = await supabase
          .from('papelitos')
          .update(payload)
          .eq('id', editingRecord.id)
          .select()
          .single();

        savedRecord = data || { ...editingRecord, ...payload };

        if (error) {
          console.warn('Update error:', error.message);
          showNotification(`Updated locally. (Database notice: ${error.message})`, 'error');
        } else if (data) {
          setDbStatus('connected');
          showNotification('Papelitos record updated successfully in database!');
        }

        logAudit('Update Record', editingRecord.id, editingRecord, payload);
      } else {
        payload.created_at = new Date().toISOString();
        payload.is_deleted = false;

        let { data, error } = await supabase
          .from('papelitos')
          .insert([payload])
          .select()
          .single();

        if (error && error.message?.includes('is_deleted')) {
          const { is_deleted, ...payloadNoDeleted } = payload;
          const fallback = await supabase
            .from('papelitos')
            .insert([payloadNoDeleted])
            .select()
            .single();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) {
          console.warn('Insert error:', error.message);
          savedRecord = {
            id: `p-${Date.now()}`,
            ...payload
          };
          if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
            setDbStatus('table_missing');
            showNotification('Record saved locally. Table is missing in Supabase!', 'error');
          } else if (error.code === '42501' || error.message?.includes('row-level security')) {
            setDbStatus('rls_blocked');
            showNotification('Supabase RLS is blocking saves! Run RLS policy in Supabase SQL Editor.', 'error');
          } else {
            showNotification(`Record saved locally. (Database notice: ${error.message})`, 'error');
          }
        } else if (data) {
          savedRecord = data;
          setDbStatus('connected');
          showNotification('New Papelitos record created successfully in database!');
        }

        logAudit('Create Record', 'new', null, payload);

        // Auto-generate Cash Voucher PDF if Paid was selected on record creation
        if (formData.payment_status === 'Paid' && savedRecord) {
          await generateCashVoucherPDF([savedRecord]);
        }
      }

      if (savedRecord) {
        const localItems = getStoredItems('sgc_portal_local_papelitos');
        const updatedLocal = editingRecord
          ? localItems.map(item => item.id === savedRecord.id ? savedRecord : item)
          : [savedRecord, ...localItems.filter(item => item.id !== savedRecord.id)];
        setStoredItems('sgc_portal_local_papelitos', updatedLocal);

        setPapelitosList(prev => {
          const exists = prev.some(item => item.id === savedRecord.id);
          if (exists) {
            return prev.map(item => item.id === savedRecord.id ? savedRecord : item);
          } else {
            return [savedRecord, ...prev];
          }
        });
      }

      setShowAddEditModal(false);
    } catch (err) {
      console.error('Save error:', err);
      showNotification('Failed to save record.', 'error');
    }
  };

  // Save Draft & Reset Form to Add Another Voucher
  const handleSaveDraftAndAddAnother = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const computedStatus = formData.status === 'Returned' ? 'Returned' : 'Unreturned';

    const payload = {
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      quantity: Number(formData.quantity),
      date_received: formData.date_received,
      payment_status: formData.payment_status,
      status: computedStatus,
      remarks: formData.remarks.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      payload.created_at = new Date().toISOString();
      payload.is_deleted = false;

      let { data, error } = await supabase
        .from('papelitos')
        .insert([payload])
        .select()
        .single();

      if (error && error.message?.includes('is_deleted')) {
        const { is_deleted, ...payloadNoDeleted } = payload;
        const fallback = await supabase
          .from('papelitos')
          .insert([payloadNoDeleted])
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      let savedRecord = data;
      if (error) {
        savedRecord = { id: `p-${Date.now()}`, ...payload };
        setPapelitosList(prev => [savedRecord, ...prev]);
      } else if (data) {
        savedRecord = data;
        setPapelitosList(prev => [data, ...prev]);
        setDbStatus('connected');
      }

      addToVoucherQueue(savedRecord);
      showNotification(`Voucher draft for "${savedRecord.name}" saved & added to Print Queue!`);

      // Reset name & quantity for next voucher, keeping company & date
      setFormData(prev => ({
        ...prev,
        name: '',
        quantity: 1,
        remarks: ''
      }));
      setFormErrors({});
    } catch (err) {
      console.error('Draft save error:', err);
      showNotification('Failed to save draft.', 'error');
    }
  };

  // Save Draft & Open A4 Print Preview Modal
  const handleSaveAndOpenPrintPreview = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const computedStatus = formData.status === 'Returned' ? 'Returned' : 'Unreturned';

    const payload = {
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      quantity: Number(formData.quantity),
      date_received: formData.date_received,
      payment_status: formData.payment_status,
      status: computedStatus,
      remarks: formData.remarks.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      let savedRecord = null;
      if (editingRecord) {
        let { data, error } = await supabase
          .from('papelitos')
          .update(payload)
          .eq('id', editingRecord.id)
          .select()
          .single();

        savedRecord = data || { ...editingRecord, ...payload };
      } else {
        payload.created_at = new Date().toISOString();
        payload.is_deleted = false;

        let { data, error } = await supabase
          .from('papelitos')
          .insert([payload])
          .select()
          .single();

        savedRecord = data || { id: `p-${Date.now()}`, ...payload };
      }

      if (savedRecord) {
        const localItems = getStoredItems('sgc_portal_local_papelitos');
        const updatedLocal = editingRecord
          ? localItems.map(item => item.id === savedRecord.id ? savedRecord : item)
          : [savedRecord, ...localItems.filter(item => item.id !== savedRecord.id)];
        setStoredItems('sgc_portal_local_papelitos', updatedLocal);

        setPapelitosList(prev => {
          const exists = prev.some(item => item.id === savedRecord.id);
          if (exists) {
            return prev.map(item => item.id === savedRecord.id ? savedRecord : item);
          } else {
            return [savedRecord, ...prev];
          }
        });
      }

      const updatedQueue = [...voucherQueue.filter(i => i.id !== savedRecord.id), savedRecord];
      setVoucherQueue(updatedQueue);
      setShowAddEditModal(false);

      // Generate preview & open print preview modal
      const previewUrl = await generateCashVoucherPDF(updatedQueue, false);
      setPreviewPdfUrl(previewUrl);
      setShowPrintPreviewModal(true);
    } catch (err) {
      console.error('Save & Preview error:', err);
    }
  };

  // Open A4 Print Preview Modal directly from Queue toolbar button
  const handleOpenPrintPreviewModal = async () => {
    let queueToUse = voucherQueue;
    if (queueToUse.length === 0 && filteredList.length > 0) {
      queueToUse = selectedIds.length > 0
        ? papelitosList.filter(r => selectedIds.includes(r.id))
        : filteredList.slice(0, 3);
      setVoucherQueue(queueToUse);
    }
    if (queueToUse.length > 0) {
      const previewUrl = await generateCashVoucherPDF(queueToUse, false);
      setPreviewPdfUrl(previewUrl);
    } else {
      setPreviewPdfUrl(null);
    }
    setShowPrintPreviewModal(true);
  };

  // Confirm & Print A4 PDF
  const confirmAndPrintA4PDF = async () => {
    if (voucherQueue.length === 0) return;
    await generateCashVoucherPDF(voucherQueue, true);
    setShowPrintPreviewModal(false);
  };

  // Selection Handlers for Batch Payment
  const toggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const unpaidRecords = filteredList.filter(item => item.payment_status !== 'Paid');
    const unpaidIds = unpaidRecords.map(item => item.id);

    if (selectedIds.length === unpaidIds.length && unpaidIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpaidIds);
    }
  };

  // Trigger Mark as Paid (Supports single OR multiple selected records)
  const confirmMarkAsPaid = async () => {
    let recordsToUpdate = [];
    if (selectedIds.length > 0) {
      recordsToUpdate = papelitosList.filter(item => selectedIds.includes(item.id));
    } else if (selectedForAction) {
      recordsToUpdate = [selectedForAction];
    }

    if (recordsToUpdate.length === 0) return;

    const recordIds = recordsToUpdate.map(r => r.id);
    const nowIso = new Date().toISOString();
    const updateData = {
      payment_status: 'Paid',
      date_paid: nowIso,
      updated_at: nowIso
    };

    try {
      const { error } = await supabase
        .from('papelitos')
        .update(updateData)
        .in('id', recordIds);

      if (error) {
        console.warn('Supabase update notice:', error.message);
      }
    } catch (err) {
      console.error('Error marking paid:', err);
    } finally {
      // Update LocalStorage persistence so Paid status remains on refresh
      const localItems = getStoredItems('sgc_portal_local_papelitos');
      const localMap = new Map();
      localItems.forEach(item => localMap.set(item.id, item));

      recordsToUpdate.forEach(rec => {
        const existing = localMap.get(rec.id) || rec;
        localMap.set(rec.id, { ...existing, ...updateData });
      });

      setStoredItems('sgc_portal_local_papelitos', Array.from(localMap.values()));
      setPapelitosList(prev => prev.map(item => recordIds.includes(item.id) ? { ...item, ...updateData } : item));

      recordIds.forEach(id => {
        logAudit('Mark as Paid', id, null, updateData);
      });

      showNotification(`Marked ${recordIds.length} Papelitos record(s) as Paid!`);

      if (shouldPrintVoucher) {
        const updatedRecords = recordsToUpdate.map(r => ({ ...r, ...updateData }));
        await generateCashVoucherPDF(updatedRecords);
      }

      setShowPaidModal(false);
      setSelectedForAction(null);
      setSelectedIds([]);
    }
  };

  // Trigger Mark as Returned
  const confirmMarkAsReturned = async () => {
    if (!selectedForAction) return;

    const recordId = selectedForAction.id;
    const nowIso = new Date().toISOString();
    const updateData = {
      status: 'Returned',
      date_returned: nowIso,
      return_remarks: returnRemarksInput.trim() || 'Marked as Returned',
      updated_at: nowIso
    };

    try {
      const { error } = await supabase
        .from('papelitos')
        .update(updateData)
        .eq('id', recordId);

      if (error) {
        console.warn('Supabase update returned notice:', error.message);
      }
    } catch (err) {
      console.error('Error marking returned:', err);
    } finally {
      const localItems = getStoredItems('sgc_portal_local_papelitos');
      const localMap = new Map();
      localItems.forEach(item => localMap.set(item.id, item));
      const existing = localMap.get(recordId) || selectedForAction;
      localMap.set(recordId, { ...existing, ...updateData });

      setStoredItems('sgc_portal_local_papelitos', Array.from(localMap.values()));
      setPapelitosList(prev => prev.map(item => item.id === recordId ? { ...item, ...updateData } : item));

      logAudit('Mark as Returned', recordId, selectedForAction, updateData);
      showNotification(`Papelitos record for "${selectedForAction.name}" marked as Returned!`);

      setShowReturnModal(false);
      setSelectedForAction(null);
      setReturnRemarksInput('');
    }
  };

  // Confirm Soft Delete
  const confirmSoftDelete = async () => {
    if (!selectedForAction) return;

    const recordId = selectedForAction.id;
    const updateData = {
      is_deleted: true,
      updated_at: new Date().toISOString()
    };

    try {
      let { error } = await supabase
        .from('papelitos')
        .update(updateData)
        .eq('id', recordId);

      if (error && error.message?.includes('is_deleted')) {
        const delRes = await supabase
          .from('papelitos')
          .delete()
          .eq('id', recordId);
        error = delRes.error;
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      const localItems = getStoredItems('sgc_portal_local_papelitos');
      const localMap = new Map();
      localItems.forEach(item => localMap.set(item.id, item));
      const existing = localMap.get(recordId) || selectedForAction;
      localMap.set(recordId, { ...existing, ...updateData, is_deleted: true });

      setStoredItems('sgc_portal_local_papelitos', Array.from(localMap.values()));
      setPapelitosList(prev => prev.filter(item => item.id !== recordId));

      logAudit('Delete Record', recordId, selectedForAction, updateData);
      showNotification('Record removed from active view.');

      setShowDeleteModal(false);
      setSelectedForAction(null);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (filteredList.length === 0) {
      showNotification('No data available to export.', 'error');
      return;
    }

    const headers = [
      'Record ID',
      'Person Name',
      'Company Name',
      'Quantity (# of Papelitos)',
      'Date Received',
      'Payment Status',
      'Papelitos Status',
      'Date Paid',
      'Date Returned',
      'Remarks',
      'Return Remarks'
    ];

    const rows = filteredList.map(item => [
      `"${item.id}"`,
      `"${item.name || ''}"`,
      `"${item.company_name || ''}"`,
      `"${item.quantity || 0}"`,
      `"${item.date_received || ''}"`,
      `"${item.payment_status || ''}"`,
      `"${item.status || ''}"`,
      `"${item.date_paid ? new Date(item.date_paid).toLocaleString() : ''}"`,
      `"${item.date_returned ? new Date(item.date_returned).toLocaleString() : ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
      `"${(item.return_remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Papelitos_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${filteredList.length} Papelitos records to CSV.`);
  };

  // Company breakdown calculation for Reports view
  const companyBreakdown = useMemo(() => {
    const map = {};
    papelitosList.forEach(item => {
      const comp = item.company_name || 'Unspecified Company';
      if (!map[comp]) {
        map[comp] = { count: 0, totalQty: 0, paidQty: 0, unpaidQty: 0 };
      }
      map[comp].count += 1;
      map[comp].totalQty += Number(item.quantity) || 0;
      if (item.payment_status === 'Paid') {
        map[comp].paidQty += Number(item.quantity) || 0;
      } else {
        map[comp].unpaidQty += Number(item.quantity) || 0;
      }
    });
    return Object.entries(map).map(([company, data]) => ({ company, ...data }));
  }, [papelitosList]);

  // Month info helper (e.g. AUGUST (31 DAYS))
  const monthInfo = useMemo(() => getMonthInfo(''), []);

  // Generate PDF Report using pdf-lib matching the user image layout
  const generateCompanyPDF = async () => {
    if (companyBreakdown.length === 0) {
      showNotification('No data available to generate PDF report.', 'error');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const { width, height } = page.getSize();

      // Top Banner
      page.drawRectangle({
        x: 40,
        y: height - 85,
        width: width - 80,
        height: 50,
        color: rgb(37 / 255, 99 / 255, 235 / 255)
      });

      page.drawText('SGC SYSTEMS PORTAL — PAPELITOS MANAGEMENT SYSTEM', {
        x: 55,
        y: height - 58,
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });

      page.drawText('OFFICIAL MONTHLY COMPANY SUMMARY REPORT', {
        x: 55,
        y: height - 75,
        size: 9,
        font: helveticaFont,
        color: rgb(0.9, 0.9, 0.9)
      });

      // Month Title Header Box (e.g. AUGUST (31 DAYS))
      const tableWidth = 460;
      const startX = (width - tableWidth) / 2;
      let startY = height - 130;

      page.drawRectangle({
        x: startX,
        y: startY,
        width: tableWidth,
        height: 28,
        color: rgb(0.96, 0.96, 0.96),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5
      });

      const headerTitleStr = monthInfo.title;
      const headerTitleWidth = helveticaBold.widthOfTextAtSize(headerTitleStr, 13);
      page.drawText(headerTitleStr, {
        x: startX + (tableWidth - headerTitleWidth) / 2,
        y: startY + 8,
        size: 13,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      });

      // Data Rows
      let currentY = startY - 26;
      const rowHeight = 25;
      const col1W = 200;
      const col2W = 130;
      const col3W = 130;

      const totalQtyAll = companyBreakdown.reduce((sum, c) => sum + c.totalQty, 0);

      companyBreakdown.forEach((cb, idx) => {
        const colorObj = COMPANY_ROW_COLORS[idx % COMPANY_ROW_COLORS.length];
        const [r, g, b] = colorObj.rgb;

        page.drawRectangle({
          x: startX,
          y: currentY,
          width: tableWidth,
          height: rowHeight,
          color: rgb(r, g, b),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        });

        // Vertical divider lines
        page.drawLine({
          start: { x: startX + col1W, y: currentY },
          end: { x: startX + col1W, y: currentY + rowHeight },
          thickness: 1,
          color: rgb(0, 0, 0)
        });

        page.drawLine({
          start: { x: startX + col1W + col2W, y: currentY },
          end: { x: startX + col1W + col2W, y: currentY + rowHeight },
          thickness: 1,
          color: rgb(0, 0, 0)
        });

        // Company Name
        page.drawText(cb.company.toUpperCase(), {
          x: startX + 12,
          y: currentY + 8,
          size: 11,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        });

        // Quantity
        const qtyStr = String(cb.totalQty);
        const qtyWidth = helveticaFont.widthOfTextAtSize(qtyStr, 11);
        page.drawText(qtyStr, {
          x: startX + col1W + (col2W - qtyWidth) / 2,
          y: currentY + 8,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });

        // Percentage
        const pctVal = totalQtyAll > 0 ? (cb.totalQty / totalQtyAll) * 100 : 0;
        const pctStr = `${pctVal.toFixed(2)}%`;
        const pctWidth = helveticaFont.widthOfTextAtSize(pctStr, 11);
        page.drawText(pctStr, {
          x: startX + col1W + col2W + col3W - pctWidth - 15,
          y: currentY + 8,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });

        currentY -= rowHeight;
      });

      // Total Summary Row
      page.drawRectangle({
        x: startX,
        y: currentY,
        width: tableWidth,
        height: rowHeight + 3,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 2
      });

      page.drawText('total', {
        x: startX + 12,
        y: currentY + 8,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      });

      const totalAmountVal = totalQtyAll * 100;
      const totalAmountStr = `P${totalAmountVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const totalAmountWidth = helveticaBold.widthOfTextAtSize(totalAmountStr, 11);
      page.drawText(totalAmountStr, {
        x: startX + col1W + (col2W - totalAmountWidth) / 2,
        y: currentY + 8,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      });

      const totalPctStr = '100.00%';
      const totalPctWidth = helveticaBold.widthOfTextAtSize(totalPctStr, 11);
      page.drawText(totalPctStr, {
        x: startX + col1W + col2W + col3W - totalPctWidth - 15,
        y: currentY + 8,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0, 0)
      });

      // Footer (Positioned directly under the table to preserve bottom half of paper for next print)
      const footerY = currentY - 18;
      page.drawText(`Generated on: ${new Date().toLocaleString()} | I'm Done| Papelitos Management System`, {
        x: startX,
        y: footerY,
        size: 8,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Optional paper cut line helper
      const cutLineY = footerY - 15;
      page.drawLine({
        start: { x: 30, y: cutLineY },
        end: { x: width - 30, y: cutLineY },
        thickness: 0.5,
        color: rgb(0.65, 0.65, 0.65),
        dashArray: [4, 4]
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Papelitos_Company_Report_${monthInfo.monthName}_${monthInfo.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification(`Generated PDF report for ${monthInfo.monthName}!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      showNotification('Failed to generate PDF report.', 'error');
    }
  };

  // Helper function to trigger direct wired printing (EPSON L3210 Series)
  const printPdfUrlDirectly = (pdfBlobUrl) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = pdfBlobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 300);
      };
    } catch (e) {
      console.warn('Direct print fallback:', e);
    }
  };

  // Generate Cash Voucher PDF on printable A4 sheets (1 to 4 vouchers per A4 page, 2.5" height)
  const generateCashVoucherPDF = async (recordsToVoucher, autoDownload = true) => {
    if (!recordsToVoucher || recordsToVoucher.length === 0) return null;

    try {
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const a4Width = 595.28;  // A4 width in pt
      const a4Height = 841.89; // A4 height in pt
      const voucherW = 6.5 * 72; // 468 pt (6.5 inches)
      const voucherH = 2.5 * 72; // 180 pt (2.5 inches height)
      const boxX = (a4Width - voucherW) / 2; // 63.64 pt (centered horizontally)
      const marginTop = 0; // 0 pt (No top margin)

      const voucherItems = Array.isArray(recordsToVoucher) ? recordsToVoucher : [recordsToVoucher];

      // Group vouchers into pages of up to 4 per A4 page
      const maxVouchersPerPage = 4;
      const pagesChunks = [];
      for (let i = 0; i < voucherItems.length; i += maxVouchersPerPage) {
        pagesChunks.push(voucherItems.slice(i, i + maxVouchersPerPage));
      }

      const drawVoucherCard = (page, x, y, w, h, vRecords) => {
        const itemArray = Array.isArray(vRecords) ? vRecords : [vRecords];

        // Outer Border Box (2.5" height = 180 pt)
        page.drawRectangle({
          x: x,
          y: y,
          width: w,
          height: h,
          color: rgb(1, 1, 1),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1.5
        });

        // Header Title: CASH VOUCHER
        const titleStr = 'CASH VOUCHER';
        const titleWidth = helveticaBold.widthOfTextAtSize(titleStr, 12);
        page.drawText(titleStr, {
          x: x + (w - titleWidth) / 2,
          y: y + h - 17,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0)
        });

        // Calculate totals
        const totalQty = itemArray.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
        const totalAmount = totalQty * 100;
        const amountWordsStr = amountInWords(totalAmount);
        const amountFigureStr = totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const monthStr = today.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

        const companySummaryMap = {};
        itemArray.forEach(r => {
          const comp = r.company_name || 'Unspecified';
          companySummaryMap[comp] = (companySummaryMap[comp] || 0) + Number(r.quantity || 0);
        });
        const papelitosSummaryStr = Object.entries(companySummaryMap)
          .map(([comp, qty]) => `(${qty}) ${comp}`)
          .join(' | ');

        const namesStr = Array.from(new Set(itemArray.map(r => r.name))).join(', ');

        const drawCenteredOnSegment = (text, segStartX, segEndX, yPos, fontObj, fontSize, colorObj = rgb(0, 0, 0)) => {
          if (!text) return;
          const textWidth = fontObj.widthOfTextAtSize(String(text), fontSize);
          const centerSegX = segStartX + (segEndX - segStartX) / 2;
          page.drawText(String(text), {
            x: Math.max(segStartX + 2, centerSegX - (textWidth / 2)),
            y: yPos,
            size: fontSize,
            font: fontObj,
            color: colorObj
          });
        };

        // Shared line starting point X = 156 pt for all primary lines
        const lineStartX = x + 138;
        const lineEndX = x + w - 12;

        // ROW 1: Date & Month
        let currentY = y + h - 38;
        page.drawText('Date:', { x: x + 12, y: currentY, size: 8.5, font: helveticaFont });
        const dateSegEnd = x + 265;
        page.drawLine({ start: { x: lineStartX, y: currentY - 2 }, end: { x: dateSegEnd, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(dateStr, lineStartX, dateSegEnd, currentY + 1, helveticaBold, 8.5);

        const monthLabelX = dateSegEnd + 10;
        page.drawText('for the month of:', { x: monthLabelX, y: currentY, size: 8.5, font: helveticaFont });
        const monthSegStart = monthLabelX + 76;
        page.drawLine({ start: { x: monthSegStart, y: currentY - 2 }, end: { x: lineEndX, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(monthStr, monthSegStart, lineEndX, currentY + 1, helveticaBold, 8.5);

        // ROW 2: Received amount in words & in figure on SAME line
        currentY -= 30;
        page.drawText('Received the amount of:', { x: x + 12, y: currentY, size: 8.5, font: helveticaFont });
        const figureLabelX = x + 338;
        const wordsSegEnd = figureLabelX - 10;
        page.drawLine({ start: { x: lineStartX, y: currentY - 2 }, end: { x: wordsSegEnd, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(amountWordsStr, lineStartX, wordsSegEnd, currentY + 1, helveticaBold, 8);

        const wordsCenter = lineStartX + (wordsSegEnd - lineStartX) / 2;
        const inWordsTextWidth = helveticaFont.widthOfTextAtSize('In words', 6.5);
        page.drawText('In words', { x: wordsCenter - (inWordsTextWidth / 2), y: currentY - 10, size: 6.5, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });

        page.drawText('(P)', { x: figureLabelX, y: currentY, size: 8.5, font: helveticaBold });
        const figureSegStart = figureLabelX + 16;
        page.drawLine({ start: { x: figureSegStart, y: currentY - 2 }, end: { x: lineEndX, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(amountFigureStr, figureSegStart, lineEndX, currentY + 1, helveticaBold, 8.5);

        const figureCenter = figureSegStart + (lineEndX - figureSegStart) / 2;
        const inFigTextWidth = helveticaFont.widthOfTextAtSize('In figure', 6.5);
        page.drawText('In figure', { x: figureCenter - (inFigTextWidth / 2), y: currentY - 10, size: 6.5, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });

        // ROW 3: In payment for PAPELITOS
        currentY -= 30;
        page.drawText('In payment for PAPELITOS:', { x: x + 12, y: currentY, size: 8.5, font: helveticaFont });
        page.drawLine({ start: { x: lineStartX, y: currentY - 2 }, end: { x: lineEndX, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(papelitosSummaryStr, lineStartX, lineEndX, currentY + 1, helveticaBold, 8.5);

        // ROW 4: Name and Signature (Compact - no extra space below Received by)
        currentY -= 30;
        page.drawText('Name and Signature :', { x: x + 12, y: currentY, size: 8.5, font: helveticaFont });
        page.drawLine({ start: { x: lineStartX, y: currentY - 2 }, end: { x: lineEndX, y: currentY - 2 }, thickness: 1, color: rgb(0, 0, 0) });
        drawCenteredOnSegment(namesStr, lineStartX, lineEndX, currentY + 1, helveticaBold, 8.5);

        const nameCenter = lineStartX + (lineEndX - lineStartX) / 2;
        const rxByTextWidth = helveticaBold.widthOfTextAtSize('Received by:', 7.5);
        page.drawText('Received by:', { x: nameCenter - (rxByTextWidth / 2), y: currentY - 11, size: 7.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      };

      // Loop through each A4 page chunk (4 vouchers per page)
      pagesChunks.forEach((chunkItems) => {
        const page = pdfDoc.addPage([a4Width, a4Height]); // Printable A4 page

        chunkItems.forEach((vItem, vIdx) => {
          const slotGap = 20; // 20 pt gap between 2.5" cards
          const boxY = a4Height - marginTop - (vIdx + 1) * voucherH - vIdx * slotGap;

          drawVoucherCard(page, boxX, boxY, voucherW, voucherH, [vItem]);

          // Draw dashed cut line between stacked vouchers on the same A4 page
          if (vIdx < chunkItems.length - 1) {
            const cutLineY = boxY - (slotGap / 2);
            page.drawLine({
              start: { x: 30, y: cutLineY },
              end: { x: a4Width - 30, y: cutLineY },
              thickness: 0.75,
              color: rgb(0.6, 0.6, 0.6),
              dashArray: [4, 4]
            });
          }
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (autoDownload) {
        // Download PDF
        const link = document.createElement('a');
        link.href = url;
        link.download = `Cash_Vouchers_A4_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Also trigger wired printer dialog (EPSON L3210 Series)
        printPdfUrlDirectly(url);
        showNotification('Printable A4 Vouchers sent to EPSON L3210 Series Printer!');
      }

      return url;
    } catch (err) {
      console.error('Voucher generation error:', err);
      showNotification('Failed to generate Cash Voucher PDF.', 'error');
      return null;
    }
  };

  return (
    <div className="papelitos-module">

      {/* Database Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>Papelitos Management</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.82rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: dbStatus === 'connected' ? '#10b981' : dbStatus === 'table_missing' ? '#f59e0b' : '#ef4444',
            display: 'inline-block'
          }}></span>
          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
            {dbStatus === 'connected' && 'Database Connected (Supabase)'}
            {dbStatus === 'table_missing' && 'Database Table Missing (Run sgc_portal_init.sql)'}
            {dbStatus === 'rls_blocked' && 'Supabase RLS Policy Blocking Saves (Fix Required)'}
            {dbStatus === 'error' && 'Database Connection Error'}
            {dbStatus === 'checking' && 'Checking DB Connection...'}
          </span>
          <button
            onClick={fetchPapelitos}
            title="Refresh Database Connection"
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {dbStatus === 'table_missing' && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #f59e0b', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#f59e0b' }}>
            <AlertCircle size={20} />
            <span>Database Setup Required</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
            The <strong>papelitos</strong> table is not created in your Supabase project yet. Please copy and run the SQL script in <code>sgc_portal_init.sql</code> inside your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Supabase Dashboard SQL Editor</a>.
          </p>
        </div>
      )}

      {dbStatus === 'rls_blocked' && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#ef4444' }}>
            <AlertCircle size={20} />
            <span>Supabase RLS Policy Blocking Saves</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
            Row-Level Security (RLS) is enabled on the <strong>papelitos</strong> table without an access policy, blocking client saves. To fix this, run this command in your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Supabase SQL Editor</a>:
          </p>
          <pre style={{ margin: '0.25rem 0 0 0', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem', color: '#38bdf8', overflowX: 'auto' }}>
            {`CREATE POLICY "Allow full access to papelitos" ON papelitos FOR ALL USING (true) WITH CHECK (true);`}
          </pre>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.3s ease' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.3s ease' }}>
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Interactive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Total Records Card */}
        <div
          className="glass-card"
          onClick={() => toggleFilter('all')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid var(--accent-primary)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            background: selectedFilters.length === 0 ? 'rgba(59, 130, 246, 0.12)' : 'var(--glass-bg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Records
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {summaryStats.totalRecords}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            All Papelitos entries
          </div>
        </div>

        {/* Total Unpaid Card */}
        <div
          className="glass-card"
          onClick={() => toggleFilter('unpaid')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid #f59e0b',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            background: selectedFilters.includes('unpaid') ? 'rgba(245, 158, 11, 0.12)' : 'var(--glass-bg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unpaid
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f59e0b' }}>
            {summaryStats.totalUnpaid}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {summaryStats.totalUnpaidQty.toLocaleString()} Papelitos pending
          </div>
        </div>

        {/* Total Paid Card */}
        <div
          className="glass-card"
          onClick={() => toggleFilter('paid')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid #10b981',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            background: selectedFilters.includes('paid') ? 'rgba(16, 185, 129, 0.12)' : 'var(--glass-bg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paid
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>
            {summaryStats.totalPaid}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {summaryStats.totalPaidQty.toLocaleString()} Papelitos cleared
          </div>
        </div>

        {/* Total Returned Card */}
        <div
          className="glass-card"
          onClick={() => toggleFilter('returned')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            borderLeft: '4px solid #8b5cf6',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            background: selectedFilters.includes('returned') ? 'rgba(139, 92, 246, 0.12)' : 'var(--glass-bg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Returned
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={18} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#8b5cf6' }}>
            {summaryStats.totalReturned}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Returned / processed
          </div>
        </div>

        {/* Total Amount Card (Papelitos x PHP 100) */}
        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--accent-secondary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Amount (PHP)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={18} color="var(--accent-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
            ₱{summaryStats.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {summaryStats.totalQuantity.toLocaleString()} Papelitos × ₱100
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>

        {/* Module Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>

          {/* Main View Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
              style={{ border: 'none', padding: '0.45rem 1rem' }}
            >
              <ListFilter size={15} />
              <span>Records Directory</span>
            </button>
            <button
              className={`btn ${viewMode === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('reports')}
              style={{ border: 'none', padding: '0.45rem 1rem' }}
            >
              <BarChart3 size={15} />
              <span>Company Reports</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={fetchPapelitos} title="Refresh records list">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button className="btn btn-secondary" onClick={exportToCSV} title="Export current list to CSV">
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button className="btn btn-secondary btn-danger" onClick={handleClearAllData} title="Clear all Papelitos data from database">
              <Trash2 size={15} />
              <span>Clear All Data</span>
            </button>
            <button className="btn btn-secondary" onClick={handleOpenPrintPreviewModal} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: voucherQueue.length > 0 ? 'var(--accent-primary)' : 'var(--border-color)' }}>
              <Printer size={16} color={voucherQueue.length > 0 ? 'var(--accent-primary)' : 'currentColor'} />
              <span>A4 Print Queue</span>
              {voucherQueue.length > 0 && (
                <span style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: '0.72rem', fontWeight: '700', borderRadius: '10px', padding: '0.1rem 0.45rem', marginLeft: '0.2rem' }}>
                  {voucherQueue.length}
                </span>
              )}
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '0.5rem 1.25rem', fontWeight: '600' }}>
              <Plus size={18} />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <>
            {/* Multi-Select Filter Toolbar with Embedded Search */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              
              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '340px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search name, company, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.4rem', height: '36px', fontSize: '0.88rem', borderRadius: '20px' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Multi-Select Filter Buttons */}
              <button
                className={`btn ${selectedFilters.length === 0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleFilter('all')}
                style={{ borderRadius: '20px', padding: '0.4rem 0.95rem', fontSize: '0.85rem', height: '36px' }}
              >
                All Records ({summaryStats.totalRecords})
              </button>

              <button
                className={`btn ${selectedFilters.includes('unpaid') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleFilter('unpaid')}
                style={{
                  borderRadius: '20px',
                  padding: '0.4rem 0.95rem',
                  fontSize: '0.85rem',
                  height: '36px',
                  background: selectedFilters.includes('unpaid') ? '#f59e0b' : 'var(--bg-tertiary)',
                  borderColor: selectedFilters.includes('unpaid') ? '#f59e0b' : 'var(--border-color)',
                  color: selectedFilters.includes('unpaid') ? '#fff' : '#f59e0b',
                  fontWeight: '600'
                }}
              >
                ⏳ Unpaid ({summaryStats.totalUnpaid})
              </button>

              <button
                className={`btn ${selectedFilters.includes('paid') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleFilter('paid')}
                style={{
                  borderRadius: '20px',
                  padding: '0.4rem 0.95rem',
                  fontSize: '0.85rem',
                  height: '36px',
                  background: selectedFilters.includes('paid') ? '#10b981' : 'var(--bg-tertiary)',
                  borderColor: selectedFilters.includes('paid') ? '#10b981' : 'var(--border-color)',
                  color: selectedFilters.includes('paid') ? '#fff' : '#10b981',
                  fontWeight: '600'
                }}
              >
                💳 Paid ({summaryStats.totalPaid})
              </button>

              <button
                className={`btn ${selectedFilters.includes('unreturned') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleFilter('unreturned')}
                style={{
                  borderRadius: '20px',
                  padding: '0.4rem 0.95rem',
                  fontSize: '0.85rem',
                  height: '36px',
                  background: selectedFilters.includes('unreturned') ? '#3b82f6' : 'var(--bg-tertiary)',
                  borderColor: selectedFilters.includes('unreturned') ? '#3b82f6' : 'var(--border-color)',
                  color: selectedFilters.includes('unreturned') ? '#fff' : '#3b82f6',
                  fontWeight: '600'
                }}
              >
                📋 Unreturned ({summaryStats.totalUnreturned})
              </button>

              <button
                className={`btn ${selectedFilters.includes('returned') ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleFilter('returned')}
                style={{
                  borderRadius: '20px',
                  padding: '0.4rem 0.95rem',
                  fontSize: '0.85rem',
                  height: '36px',
                  background: selectedFilters.includes('returned') ? '#8b5cf6' : 'var(--bg-tertiary)',
                  borderColor: selectedFilters.includes('returned') ? '#8b5cf6' : 'var(--border-color)',
                  color: selectedFilters.includes('returned') ? '#fff' : '#8b5cf6',
                  fontWeight: '600'
                }}
              >
                🔄 Returned ({summaryStats.totalReturned})
              </button>

              {/* Reset Filters button if any filters or search are active */}
              {(selectedFilters.length > 0 || searchQuery) && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetFilters}
                  style={{ borderRadius: '20px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: '36px', marginLeft: 'auto' }}
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedIds.length > 0 && (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Selected {selectedIds.length} unpaid record(s)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])} style={{ padding: '0.35rem 0.8rem' }}>
                    Deselect All
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: '#10b981', borderColor: '#10b981', fontWeight: '600', padding: '0.35rem 1rem' }}
                    onClick={() => {
                      setSelectedForAction(null);
                      setShowPaidModal(true);
                    }}
                  >
                    <CheckCircle2 size={15} /> Mark Selected as Paid ({selectedIds.length})
                  </button>
                </div>
              </div>
            )}

            {/* Main Table */}
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <RefreshCw size={32} className="spin" color="var(--accent-primary)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-dim)' }}>Loading Papelitos database records...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                <FileText size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Papelitos Records Found</h3>
                <p style={{ color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                  There are no records matching your selected filter criteria. Try clearing search filters or add a new record.
                </p>
                <button className="btn btn-primary" onClick={handleOpenAdd}>
                  <Plus size={16} /> Add New
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                      <th style={{ width: '40px', padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filteredList.filter(i => i.payment_status !== 'Paid').length}
                          onChange={toggleSelectAll}
                          title="Select all unpaid items"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Name</span>
                          <ArrowUpDown size={13} style={{ opacity: sortField === 'name' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('company_name')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Company</span>
                          <ArrowUpDown size={13} style={{ opacity: sortField === 'company_name' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <span>Qty</span>
                          <ArrowUpDown size={13} style={{ opacity: sortField === 'quantity' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => handleSort('date_received')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Date Received</span>
                          <ArrowUpDown size={13} style={{ opacity: sortField === 'date_received' ? 1 : 0.4 }} />
                        </div>
                      </th>
                      <th style={{ padding: '0.85rem 1rem' }}>Payment</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Paid Date</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Returned Date</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: '290px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map(item => {
                      const avatar = getAvatarStyle(item.name);
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease', background: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'transparent' }}>

                          {/* Checkbox Column */}
                          <td style={{ width: '40px', padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                            {item.payment_status !== 'Paid' ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(item.id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            ) : (
                              <Check size={14} color="#10b981" style={{ opacity: 0.5 }} />
                            )}
                          </td>

                          {/* Person Name with Avatar */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: avatar.bg,
                                  color: avatar.text,
                                  fontWeight: '700',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {getInitials(item.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {item.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>

                          {/* Company Name */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building size={14} color="var(--text-dim)" />
                              <span style={{ fontWeight: '500' }}>{item.company_name}</span>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              background: 'var(--bg-tertiary)',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              color: 'var(--text-main)',
                              display: 'inline-block'
                            }}>
                              {item.quantity}
                            </span>
                          </td>

                          {/* Date Received */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} color="var(--text-dim)" />
                              <span>{item.date_received}</span>
                            </div>
                          </td>

                          {/* Payment Badge */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge ${item.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              {item.payment_status === 'Paid' ? <Check size={12} /> : <Clock size={12} />}
                              {item.payment_status}
                            </span>
                          </td>

                          {/* Papelitos Status Badge */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge ${item.status === 'Returned' ? 'badge-purple' : 'badge-info'}`}>
                              {item.status === 'Returned' ? 'Returned' : 'Unreturned'}
                            </span>
                          </td>

                          {/* Date Paid */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            {item.date_paid ? new Date(item.date_paid).toLocaleDateString() : '-'}
                          </td>

                          {/* Date Returned */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            {item.date_returned ? new Date(item.date_returned).toLocaleDateString() : '-'}
                          </td>

                          {/* Quick Actions - Fixed Position Grid with Words */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center', minWidth: '282px' }}>

                              {/* 1. Mark as Paid Action */}
                              {item.payment_status !== 'Paid' ? (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="Mark as Paid"
                                  onClick={() => {
                                    setSelectedForAction(item);
                                    setShowPaidModal(true);
                                  }}
                                  style={{
                                    width: '76px',
                                    height: '32px',
                                    padding: '0 0.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Paid</span>
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="Already Paid"
                                  disabled
                                  style={{
                                    width: '76px',
                                    height: '32px',
                                    padding: '0 0.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.15)',
                                    opacity: 0.4,
                                    cursor: 'not-allowed',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Paid</span>
                                </button>
                              )}

                              {/* 2. Mark as Returned Action */}
                              {item.status !== 'Returned' ? (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="Mark as Returned"
                                  onClick={() => {
                                    setSelectedForAction(item);
                                    setReturnRemarksInput('');
                                    setShowReturnModal(true);
                                  }}
                                  style={{
                                    width: '90px',
                                    height: '32px',
                                    padding: '0 0.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    color: '#8b5cf6',
                                    border: '1px solid rgba(139, 92, 246, 0.35)',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Return</span>
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="Already Returned"
                                  disabled
                                  style={{
                                    width: '90px',
                                    height: '32px',
                                    padding: '0 0.4rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    background: 'rgba(139, 92, 246, 0.05)',
                                    color: '#8b5cf6',
                                    border: '1px solid rgba(139, 92, 246, 0.15)',
                                    opacity: 0.4,
                                    cursor: 'not-allowed',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Returned</span>
                                </button>
                              )}

                              {/* 3. View Details */}
                              <button
                                className="btn btn-secondary btn-sm"
                                title="View Record Details"
                                onClick={() => {
                                  setSelectedForAction(item);
                                  setShowDetailModal(true);
                                }}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px'
                                }}
                              >
                                <Eye size={15} />
                              </button>

                              {/* 4. Edit */}
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Edit Record"
                                onClick={() => handleOpenEdit(item)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px'
                                }}
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* 5. Delete */}
                              <button
                                className="btn btn-secondary btn-sm btn-danger"
                                title="Delete Record"
                                onClick={() => {
                                  setSelectedForAction(item);
                                  setShowDeleteModal(true);
                                }}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px'
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* Reports & Breakdown View */
          <div className="reports-section">

            {/* Header & Export Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: '700' }}>Company Monthly Summary Report</h3>
                <p style={{ color: 'var(--text-dim)', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                  Distribution of Papelitos volume and percentages for <strong>{monthInfo.monthName}</strong> ({monthInfo.daysCount} DAYS).
                </p>
              </div>

              <button className="btn btn-primary" onClick={generateCompanyPDF} style={{ padding: '0.6rem 1.25rem', fontWeight: '600' }}>
                <Download size={16} />
                <span>Generate PDF Report</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

              {/* Image-Style Company Monthly Table */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ border: '2px solid #000000', borderRadius: '4px', overflow: 'hidden', fontFamily: 'sans-serif', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>

                  {/* Table Header: e.g. AUGUST (31 DAYS) */}
                  <div style={{ background: '#ffffff', color: '#000000', textAlign: 'center', padding: '0.65rem', fontWeight: '800', fontSize: '1.15rem', borderBottom: '2px solid #000000', letterSpacing: '0.04em' }}>
                    {monthInfo.title}
                  </div>

                  {companyBreakdown.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: '#666666', background: '#ffffff' }}>
                      No Papelitos entries recorded for {monthInfo.monthName}.
                    </div>
                  ) : (
                    <>
                      {/* Data Rows matching exact colors */}
                      {companyBreakdown.map((cb, idx) => {
                        const colorObj = COMPANY_ROW_COLORS[idx % COMPANY_ROW_COLORS.length];
                        const totalQtyAll = companyBreakdown.reduce((sum, c) => sum + c.totalQty, 0);
                        const pctVal = totalQtyAll > 0 ? ((cb.totalQty / totalQtyAll) * 100).toFixed(2) : '0.00';

                        return (
                          <div
                            key={cb.company}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.6fr 1fr 1fr',
                              background: colorObj.bg,
                              color: colorObj.text,
                              borderBottom: '1px solid #000000',
                              fontWeight: '700',
                              fontSize: '1rem',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ padding: '0.55rem 0.85rem', textTransform: 'uppercase', borderRight: '1px solid #000000' }}>
                              {cb.company}
                            </div>
                            <div style={{ padding: '0.55rem 0.85rem', textAlign: 'center', borderRight: '1px solid #000000' }}>
                              {cb.totalQty}
                            </div>
                            <div style={{ padding: '0.55rem 0.85rem', textAlign: 'right' }}>
                              {pctVal}%
                            </div>
                          </div>
                        );
                      })}

                      {/* Total Summary Row */}
                      {(() => {
                        const totalQtyAll = companyBreakdown.reduce((sum, c) => sum + c.totalQty, 0);
                        const totalAmountVal = totalQtyAll * 100;
                        return (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.6fr 1fr 1fr',
                              background: '#ffffff',
                              color: '#000000',
                              borderTop: '2px solid #000000',
                              fontWeight: '800',
                              fontSize: '1.05rem',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ padding: '0.6rem 0.85rem', textTransform: 'lowercase' }}>
                              total
                            </div>
                            <div style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
                              ₱{totalAmountVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>
                              100.00%
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Visual Progress Breakdown */}
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} color="var(--accent-secondary)" />
                  <span>Payment Clearance Ratio</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem', fontWeight: '600' }}>
                      <span style={{ color: '#10b981' }}>Paid Volume ({summaryStats.totalPaidQty} Papelitos)</span>
                      <span>{summaryStats.totalQuantity > 0 ? Math.round((summaryStats.totalPaidQty / summaryStats.totalQuantity) * 100) : 0}%</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${summaryStats.totalQuantity > 0 ? (summaryStats.totalPaidQty / summaryStats.totalQuantity) * 100 : 0}%`, background: '#10b981', height: '100%', borderRadius: '5px' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem', fontWeight: '600' }}>
                      <span style={{ color: '#f59e0b' }}>Pending Unpaid Volume ({summaryStats.totalUnpaidQty} Papelitos)</span>
                      <span>{summaryStats.totalQuantity > 0 ? Math.round((summaryStats.totalUnpaidQty / summaryStats.totalQuantity) * 100) : 0}%</span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${summaryStats.totalQuantity > 0 ? (summaryStats.totalUnpaidQty / summaryStats.totalQuantity) * 100 : 0}%`, background: '#f59e0b', height: '100%', borderRadius: '5px' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Add / Edit Modal */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '520px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="var(--accent-primary)" />
                <span>{editingRecord ? 'Edit Papelitos Record' : 'Record New Papelitos'}</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddEditModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              {/* Name Input */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Person Name <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Juan Dela Cruz"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{ paddingLeft: '2.4rem' }}
                  />
                </div>
                {formErrors.name && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.name}</span>}
              </div>

              {/* Company Dropdown */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Company Name <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', zIndex: 1 }} />
                  <select
                    className="form-control"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    style={{ paddingLeft: '2.4rem' }}
                  >
                    <option value="LDN">LDN</option>
                    <option value="LDS">LDS</option>
                    <option value="IMPERIAL">IMPERIAL</option>
                    <option value="5A ROYAL">5A ROYAL</option>
                  </select>
                </div>
                {formErrors.company_name && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.company_name}</span>}
              </div>

              {/* Quantity & Date Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Number of Papelitos <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      style={{ paddingLeft: '2.4rem' }}
                    />
                  </div>
                  {formErrors.quantity && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.quantity}</span>}
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>
                    Date Received <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date_received}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_received: e.target.value }))}
                  />
                  {formErrors.date_received && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.date_received}</span>}
                </div>
              </div>

              {/* Payment Status Buttons */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Payment Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, payment_status: 'Unpaid' }))}
                    style={{
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: formData.payment_status === 'Unpaid' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      background: formData.payment_status === 'Unpaid' ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                      color: formData.payment_status === 'Unpaid' ? '#f59e0b' : 'var(--text-dim)'
                    }}
                  >
                    <AlertCircle size={16} color={formData.payment_status === 'Unpaid' ? '#f59e0b' : 'var(--text-dim)'} />
                    <span>Unpaid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, payment_status: 'Paid' }))}
                    style={{
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: formData.payment_status === 'Paid' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: formData.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-tertiary)',
                      color: formData.payment_status === 'Paid' ? '#10b981' : 'var(--text-dim)'
                    }}
                  >
                    <CheckCircle2 size={16} color={formData.payment_status === 'Paid' ? '#10b981' : 'var(--text-dim)'} />
                    <span>Paid</span>
                  </button>
                </div>
              </div>

              {/* Papelitos Status Buttons */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Papelitos Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'Unreturned' }))}
                    style={{
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: formData.status !== 'Returned' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                      background: formData.status !== 'Returned' ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-tertiary)',
                      color: formData.status !== 'Returned' ? '#3b82f6' : 'var(--text-dim)'
                    }}
                  >
                    <Clock size={16} color={formData.status !== 'Returned' ? '#3b82f6' : 'var(--text-dim)'} />
                    <span>Unreturned</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'Returned' }))}
                    style={{
                      padding: '0.6rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: formData.status === 'Returned' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: formData.status === 'Returned' ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-tertiary)',
                      color: formData.status === 'Returned' ? '#8b5cf6' : 'var(--text-dim)'
                    }}
                  >
                    <RotateCcw size={16} color={formData.status === 'Returned' ? '#8b5cf6' : 'var(--text-dim)'} />
                    <span>Returned</span>
                  </button>
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>Remarks / Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Optional details or submission notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditModal(false)}>
                  CANCEL
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-secondary" style={{ padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                    <Check size={16} />
                    <span>SAVE</span>
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveAndOpenPrintPreview} style={{ padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                    <Printer size={16} />
                    <span>SAVE & PRINT</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Confirmation Modal: Mark as Paid (Single OR Batch) */}
      {showPaidModal && (selectedForAction || selectedIds.length > 0) && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '480px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Confirm Payment Status</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Are you sure you want to mark {selectedIds.length > 1 ? `these ${selectedIds.length} Papelitos records` : 'this Papelitos record'} as <strong style={{ color: '#10b981' }}>Paid</strong>?
            </p>

            {/* Summary Box */}
            {(() => {
              const recordsToPay = selectedIds.length > 0
                ? papelitosList.filter(item => selectedIds.includes(item.id))
                : [selectedForAction];
              const totalQty = recordsToPay.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
              const totalAmount = totalQty * 100;

              // Group by company name for PAPELITOS summary line: e.g. (12) LDN | (3) LDS
              const companySummaryMap = {};
              recordsToPay.forEach(r => {
                const comp = r.company_name || 'Unspecified';
                companySummaryMap[comp] = (companySummaryMap[comp] || 0) + Number(r.quantity || 0);
              });
              const summaryStr = Object.entries(companySummaryMap)
                .map(([comp, qty]) => `(${qty}) ${comp}`)
                .join(' | ');

              return (
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.9rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  {selectedIds.length > 1 ? (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '600' }}>
                      Batch Selected: {recordsToPay.length} Records
                    </div>
                  ) : (
                    <div style={{ marginBottom: '0.35rem' }}><strong>Submitted By:</strong> {recordsToPay[0]?.name}</div>
                  )}
                  <div style={{ marginBottom: '0.35rem' }}><strong>PAPELITOS Summary:</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>{summaryStr}</span></div>
                  <div style={{ marginBottom: '0.35rem' }}><strong>Total Papelitos Qty:</strong> {totalQty} pieces</div>
                  <div><strong>Total Cash Amount:</strong> <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                </div>
              );
            })()}

            {/* Cash Voucher Printing Checkbox */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <input
                type="checkbox"
                id="chkPrintVoucher"
                checked={shouldPrintVoucher}
                onChange={(e) => setShouldPrintVoucher(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="chkPrintVoucher" style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-main)' }}>
                Print / Download Cash Voucher PDF
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => { setShowPaidModal(false); setSelectedForAction(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', padding: '0.5rem 1.25rem', fontWeight: '600' }} onClick={confirmMarkAsPaid}>
                <CheckCircle2 size={16} /> Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirmation Modal: Mark as Returned */}
      {showReturnModal && selectedForAction && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '440px', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <RotateCcw size={30} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Confirm Return Status</h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                Marking Papelitos record for <strong>{selectedForAction.name}</strong> as <strong style={{ color: '#8b5cf6' }}>Returned</strong>.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '600', fontSize: '0.9rem' }}>Optional Return Remarks</label>
              <input
                type="text"
                className="form-control"
                placeholder="Reason for return or return details..."
                value={returnRemarksInput}
                onChange={(e) => setReturnRemarksInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.5rem 1.25rem' }} onClick={confirmMarkAsReturned}>
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Confirmation Modal: Soft Delete */}
      {showDeleteModal && selectedForAction && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '440px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Trash2 size={30} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Record</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '0.95rem' }}>
              Are you sure you want to delete the Papelitos record for <strong>{selectedForAction.name}</strong>?
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', background: 'var(--bg-tertiary)', padding: '0.65rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              In accordance with data protection rules, this record will be archived for audit compliance rather than permanently deleted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-danger" onClick={confirmSoftDelete} style={{ padding: '0.5rem 1.25rem' }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Record Details View Modal */}
      {showDetailModal && selectedForAction && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '500px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--accent-primary)" />
                <span>Papelitos Details</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetailModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Record ID:</span>
                <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{selectedForAction.id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Submitted By:</span>
                <span style={{ fontWeight: '600' }}>{selectedForAction.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Company:</span>
                <span style={{ fontWeight: '600' }}>{selectedForAction.company_name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}># of Papelitos:</span>
                <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{selectedForAction.quantity}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Date Received:</span>
                <span style={{ fontWeight: '500' }}>{selectedForAction.date_received}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Payment Status:</span>
                <span className={`badge ${selectedForAction.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedForAction.payment_status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Papelitos Status:</span>
                <span className={`badge ${selectedForAction.status === 'Returned' ? 'badge-purple' : 'badge-info'}`}>
                  {selectedForAction.status === 'Returned' ? 'Returned' : 'Unreturned'}
                </span>
              </div>

              {selectedForAction.date_paid && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Date Paid:</span>
                  <span>{new Date(selectedForAction.date_paid).toLocaleString()}</span>
                </div>
              )}

              {selectedForAction.date_returned && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Date Returned:</span>
                  <span>{new Date(selectedForAction.date_returned).toLocaleString()}</span>
                </div>
              )}

              {selectedForAction.remarks && (
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Remarks:</span>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px' }}>{selectedForAction.remarks}</div>
                </div>
              )}

              {selectedForAction.return_remarks && (
                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Return Remarks:</span>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px', color: '#8b5cf6' }}>{selectedForAction.return_remarks}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. A4 Print Preview Modal */}
      {showPrintPreviewModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '880px', width: '92%', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Printer size={20} color="var(--accent-primary)" />
                  <span>A4 Cash Voucher Print Preview</span>
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                  {voucherQueue.length} voucher(s) in queue • Formatted at 2.5x6.5" (stacked 1 to 4 per printable A4 sheet)
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintPreviewModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.25rem' }}>

              {/* PDF Preview Area */}
              <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', minHeight: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewPdfUrl ? (
                  <iframe src={previewPdfUrl} title="A4 Print Preview" style={{ width: '100%', height: '440px', border: 'none' }} />
                ) : (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
                    <RefreshCw size={28} className="spin" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '0.95rem' }}>Generating printable A4 preview...</div>
                  </div>
                )}
              </div>

              {/* Sidebar Queue & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Print Queue ({voucherQueue.length})</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setShowPrintPreviewModal(false); handleOpenAdd(); }}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Plus size={13} />
                      <span>Add Another</span>
                    </button>
                  </div>

                  {voucherQueue.length === 0 ? (
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0' }}>
                      No vouchers queued yet. Click "+ Add Another" to draft vouchers.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '290px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {voucherQueue.map((item, index) => (
                        <div key={item.id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', padding: '0.55rem 0.75rem', borderRadius: '6px', fontSize: '0.83rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.company_name} • {item.quantity} papelitos (₱{item.quantity * 100})</div>
                          </div>
                          <button
                            onClick={async () => {
                              const newQ = voucherQueue.filter(i => i.id !== item.id);
                              setVoucherQueue(newQ);
                              const previewUrl = await generateCashVoucherPDF(newQ, false);
                              setPreviewPdfUrl(previewUrl);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem' }}
                            title="Remove from queue"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={confirmAndPrintA4PDF}
                    disabled={voucherQueue.length === 0}
                    style={{ padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600' }}
                  >
                    <Printer size={16} />
                    <span>Confirm & Print A4 PDF</span>
                  </button>
                  {voucherQueue.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setVoucherQueue([]); setPreviewPdfUrl(null); }}
                      style={{ fontSize: '0.8rem', color: '#ef4444' }}
                    >
                      Clear Queue
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
