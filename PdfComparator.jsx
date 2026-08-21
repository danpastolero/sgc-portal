import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, ArrowRight, RefreshCw, CheckCircle2, AlertCircle,
  Download, Search, Filter, Layers, Eye, FileDiff, Sparkles, X, Plus,
  HelpCircle, ChevronRight, BarChart2, TrendingUp, TrendingDown, MinusCircle,
  FileCheck, Copy, ArrowUpDown
} from 'lucide-react';
import './App.css';

// Sample pre-loaded Tally Sheet data matching PDF OCR inputs
const SAMPLE_DATASETS = {
  tally: {
    name: 'Royal Gaming Tally Sheets (10:30, 10:38 & 10:49 AM)',
    pdf1Name: 'Tally_1030AM_Before.pdf',
    pdf2Name: 'Tally_1038AM_Mid.pdf',
    pdf3Name: 'Tally_1049AM_After.pdf',
    pdf1Text: `5A ROYAL GAMING MAGUINDANAO GENERAL TALLY SHEET (Online)
2026-08-10: 10:30AM
Time Generated: 10:30
GAME: S2
TOTAL: 91,240.00
00:| 2400
01:| 2200
02:| 1000
03:| 2300
04:| 742
05:| 909
06:| 821
07:| 1400
08:| 1800
09:| 1550
10:| 2450
11:| 2000
12:| 1500
13:| 1500
14:| 850
15:| 1100
16:| 850
17:| 1600
18:| 1800
19:| 1950
20:| 1650
21:| 1150
22:| 1000
23:| 740
24:| 700
25:| 1350
26:| 1700
27:| 1200
28:| 1250
29:| 550
30:| 2400
31:| 1250
32:| 300
33:| 850
34:| 500
35:| 750
36:| 600
37:| 500
38:| 800
39:| 1050
40:| 1100
85:| 650
86:| 550
87:| 950
88:| 700
89:| 680
90:| 1200
91:| 600
92:| 1000
93:| 350
94:| 800
95:| 450
96:| 850
97:| 430
98:| 550
99:| 2900`,
    pdf2Text: `5A ROYAL GAMING MAGUINDANAO GENERAL TALLY SHEET(Online)
2026-08 - 10: 10: 30AM
Time Generated: 10: 38
GAME: S2
TOTAL: 95, 332.00
00:| 2498
01:| 2221
02:| 1001
03:| 2375
04:| 742
05:| 909
06:| 821
07:| 1412
08:| 1817
09:| 1583
10:| 2499
11:| 2086
12:| 1504
13:| 1592
14:| 851
15:| 1150
16:| 852
17:| 1611
18:| 1849
19:| 1982
20:| 1680
21:| 1180
22:| 1060
23:| 740
24:| 715
25:| 1391
26:| 1721
27:| 1220
28:| 1290
29:| 568
30:| 2487
31:| 1280
32:| 320
33:| 885
34:| 535
35:| 770
36:| 632
37:| 528
38:| 805
39:| 1077
40:| 1110
85:| 670
86:| 565
87:| 980
88:| 710
89:| 695
90:| 1238
91:| 605
92:| 1005
93:| 355
94:| 815
95:| 465
96:| 881
97:| 440
98:| 570
99:| 2942`,
    pdf3Text: `5A ROYAL GAMING MAGUINDANAO GENERAL TALLY SHEET(Online)
2026-08 - 10: 10: 30AM
Time Generated: 10: 49
GAME: S2
TOTAL: 98, 750.00
00:| 2550
01:| 2280
02:| 1050
03:| 2410
04:| 755
05:| 920
06:| 830
07:| 1435
08:| 1850
09:| 1600
10:| 2520
11:| 2110
12:| 1525
13:| 1610
14:| 870
15:| 1180
16:| 875
17:| 1640
18:| 1890
19:| 2010
20:| 1710
21:| 1200
22:| 1090
23:| 750
24:| 730
25:| 1420
26:| 1750
27:| 1245
28:| 1310
29:| 580
30:| 2510
31:| 1300
32:| 340
33:| 900
34:| 550
35:| 790
36:| 650
37:| 540
38:| 820
39:| 1100
40:| 1130
85:| 690
86:| 580
87:| 1010
88:| 730
89:| 710
90:| 1260
91:| 620
92:| 1030
93:| 370
94:| 835
95:| 480
96:| 900
97:| 455
98:| 590
99:| 2990`
  }
};

const PdfComparator = () => {
  // 3 PDF File states
  const [files, setFiles] = useState({
    pdf1: null,
    pdf2: null,
    pdf3: null
  });

  const [fileTexts, setFileTexts] = useState({
    pdf1: '',
    pdf2: '',
    pdf3: ''
  });

  const [loading, setLoading] = useState({
    pdf1: false,
    pdf2: false,
    pdf3: false
  });

  // Display & View mode states
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | '3way' | 'pairwise' | 'unified'
  const [pairwiseLeft, setPairwiseLeft] = useState('pdf1');
  const [pairwiseRight, setPairwiseRight] = useState('pdf3');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'changed' | 'increased' | 'decreased' | 'added' | 'removed'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  // File input refs
  const refPdf1 = useRef(null);
  const refPdf2 = useRef(null);
  const refPdf3 = useRef(null);

  // Load default sample dataset on mount
  useEffect(() => {
    loadSampleData('tally');
  }, []);

  const loadSampleData = (key) => {
    const sample = SAMPLE_DATASETS[key];
    if (!sample) return;

    setFiles({
      pdf1: { name: sample.pdf1Name },
      pdf2: { name: sample.pdf2Name },
      pdf3: { name: sample.pdf3Name }
    });

    setFileTexts({
      pdf1: sample.pdf1Text,
      pdf2: sample.pdf2Text,
      pdf3: sample.pdf3Text
    });
  };

  // Extract raw text from uploaded PDF file using browser APIs
  const extractTextFromPdf = async (file) => {
    try {
      // First attempt: pure text reader fallback if plain text or standard file
      const text = await file.text();
      // If valid text content extracted
      if (text && text.length > 50 && !text.startsWith('%PDF-')) {
        return text;
      }
      
      // If standard PDF binary, attempt dynamic PDF.js extraction from CDN
      if (window.pdfjsLib) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extracted = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageStrings = content.items.map(item => item.str);
          extracted += pageStrings.join('\n') + '\n';
        }
        return extracted;
      }
      
      // Fallback: read ArrayBuffer to find text strings in uncompressed streams
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const rawString = decoder.decode(buffer);
      
      // Basic regex extract for printable line blocks inside PDF streams
      const matches = rawString.match(/[A-Za-z0-9\s:|\.,\-\(\)]{4,}/g);
      if (matches && matches.length > 0) {
        return matches.join('\n');
      }
      
      return `[File: ${ file.name }]\nUnable to render binary image stream directly without OCR.\nTip: Use Text Extractor or paste raw tally sheet content below.`;
    } catch (err) {
      console.error('PDF text extraction error:', err);
      return `Error extracting text from ${ file.name }: ${ err.message } `;
    }
  };

  const handleFileUpload = async (slotKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFiles(prev => ({ ...prev, [slotKey]: file }));
    setLoading(prev => ({ ...prev, [slotKey]: true }));

    const extracted = await extractTextFromPdf(file);

    setFileTexts(prev => ({ ...prev, [slotKey]: extracted }));
    setLoading(prev => ({ ...prev, [slotKey]: false }));
  };

  const clearSlot = (slotKey) => {
    setFiles(prev => ({ ...prev, [slotKey]: null }));
    setFileTexts(prev => ({ ...prev, [slotKey]: '' }));
  };

  // Helper to parse key-value structured data from tally sheet lines
  // Format examples: "00:| 2498", "TOTAL: 95,332.00", "Time Generated: 10:38"
  const parseLinesToStructuredMap = (text) => {
    if (!text) return new Map();
    const lines = text.split('\n');
    const map = new Map();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check key-value format e.g. "00:| 2498"
      const pipeMatch = trimmed.match(/^([0-9]{2,3}:\|?)\s*([\d,\.]+)/);
      if (pipeMatch) {
        const key = pipeMatch[1].replace('|', '').trim();
        const numVal = parseFloat(pipeMatch[2].replace(/,/g, ''));
        map.set(key, { raw: pipeMatch[2], num: numVal, line: trimmed });
        return;
      }

      // Check key-value format e.g. "TOTAL: 95,332.00" or "GAME: S2"
      const colonMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch) {
        const key = colonMatch[1].trim();
        const valStr = colonMatch[2].trim();
        const numVal = parseFloat(valStr.replace(/,/g, ''));
        map.set(key, { raw: valStr, num: isNaN(numVal) ? null : numVal, line: trimmed });
        return;
      }

      // Fallback line item key
      const key = `Line ${ index + 1 }: ${ trimmed.substring(0, 20) } `;
      map.set(key, { raw: trimmed, num: null, line: trimmed });
    });

    return map;
  };

  // Compute 3-Way Matrix Comparison
  const map1 = parseLinesToStructuredMap(fileTexts.pdf1);
  const map2 = parseLinesToStructuredMap(fileTexts.pdf2);
  const map3 = parseLinesToStructuredMap(fileTexts.pdf3);

  // Union of all keys across the 3 PDFs
  const allKeys = Array.from(new Set([...map1.keys(), ...map2.keys(), ...map3.keys()]));

  const comparisonMatrix = allKeys.map(key => {
    const v1 = map1.get(key);
    const v2 = map2.get(key);
    const v3 = map3.get(key);

    const val1Str = v1 ? v1.raw : '-';
    const val2Str = v2 ? v2.raw : '-';
    const val3Str = v3 ? v3.raw : '-';

    const num1 = v1 ? v1.num : null;
    const num2 = v2 ? v2.num : null;
    const num3 = v3 ? v3.num : null;

    let delta13 = null; // Difference between PDF 1 (Before) and PDF 3 (After)
    let delta12 = null; // Difference between PDF 1 (Before) and PDF 2 (Mid)
    let status = 'unchanged';

    if (num1 !== null && num3 !== null) {
      delta13 = num3 - num1;
      if (delta13 > 0) status = 'increased';
      else if (delta13 < 0) status = 'decreased';
      else status = 'unchanged';
    } else if (val1Str !== val3Str || val1Str !== val2Str) {
      status = 'modified';
    }

    if (!v1 && (v2 || v3)) status = 'added';
    if (v1 && !v3) status = 'removed';

    if (num1 !== null && num2 !== null) {
      delta12 = num2 - num1;
    }

    return {
      key,
      val1Str,
      val2Str,
      val3Str,
      num1,
      num2,
      num3,
      delta12,
      delta13,
      status
    };
  });

  // Filter comparison matrix based on user choices
  const filteredMatrix = comparisonMatrix.filter(row => {
    const matchesSearch = searchQuery === '' || 
      row.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.val1Str.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.val2Str.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.val3Str.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'changed') return row.status !== 'unchanged';
    if (filterMode === 'increased') return row.status === 'increased';
    if (filterMode === 'decreased') return row.status === 'decreased';
    if (filterMode === 'added') return row.status === 'added';
    if (filterMode === 'removed') return row.status === 'removed';

    return true;
  });

  // Calculate Metrics
  const totalEntries = comparisonMatrix.length;
  const changedEntries = comparisonMatrix.filter(r => r.status !== 'unchanged').length;
  const increasedEntries = comparisonMatrix.filter(r => r.status === 'increased').length;
  const decreasedEntries = comparisonMatrix.filter(r => r.status === 'decreased').length;

  const totalBeforeNum = comparisonMatrix.reduce((acc, r) => acc + (r.num1 || 0), 0);
  const totalMidNum = comparisonMatrix.reduce((acc, r) => acc + (r.num2 || 0), 0);
  const totalAfterNum = comparisonMatrix.reduce((acc, r) => acc + (r.num3 || 0), 0);
  const netDelta = totalAfterNum - totalBeforeNum;

  // Export Matrix to CSV
  const exportToCSV = () => {
    const headers = ['Key / Item', 'PDF 1 (Before)', 'PDF 2 (Interim)', 'PDF 3 (After)', 'Delta (PDF 3 - PDF 1)', 'Status'];
    const csvRows = [headers.join(',')];

    filteredMatrix.forEach(row => {
      const deltaStr = row.delta13 !== null ? row.delta13 : 'N/A';
      csvRows.push([
        `"${row.key}"`,
        `"${row.val1Str}"`,
        `"${row.val2Str}"`,
        `"${row.val3Str}"`,
        `"${deltaStr}"`,
        `"${row.status}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PDF_3Way_Comparison_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySummaryReport = () => {
    let reportText = `PDF 3 - WAY COMPARISON ANALYSIS REPORT\n`;
    reportText += `Generated: ${ new Date().toLocaleString() } \n`;
    reportText += `PDF 1(Before): ${ files.pdf1?.name || 'Empty' } \n`;
    reportText += `PDF 2(Interim): ${ files.pdf2?.name || 'Empty' } \n`;
    reportText += `PDF 3(After): ${ files.pdf3?.name || 'Empty' } \n`;
    reportText += `----------------------------------------\n`;
    reportText += `Total Tracked Items: ${ totalEntries } \n`;
    reportText += `Changed Items: ${ changedEntries } \n`;
    reportText += `Increased Items: ${ increasedEntries } \n`;
    reportText += `Decreased Items: ${ decreasedEntries } \n`;
    reportText += `Net Total Delta: ${ netDelta > 0 ? '+' : '' }${ netDelta.toLocaleString() } \n\n`;
    reportText += `ITEMIZED BREAKDOWN: \n`;

    filteredMatrix.forEach(row => {
      reportText += `${ row.key.padEnd(12) } | P1: ${ row.val1Str.padEnd(8) } | P2: ${ row.val2Str.padEnd(8) } | P3: ${ row.val3Str.padEnd(8) } | Δ: ${ row.delta13 !== null ? row.delta13 : 'N/A' } [${ row.status.toUpperCase() }]\n`;
    });

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="pdf-comparator-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner & Quick Controls */}
      <div className="glass-card" style={{ padding: '1.5rem 2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={26} color="var(--accent-primary)" />
              3-PDF Content Comparison System
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Compare baseline, interim, and final PDF documents side-by-side with automated diff tracking and tally matrix analysis.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => loadSampleData('tally')}
              style={{ fontSize: '0.85rem' }}
            >
              <Sparkles size={16} color="#eab308" />
              Load Sample Tally Sheets
            </button>
            <button 
              className="btn btn-secondary"
              onClick={copySummaryReport}
              disabled={!fileTexts.pdf1 && !fileTexts.pdf2 && !fileTexts.pdf3}
            >
              {copiedReport ? <CheckCircle2 size={16} color="#22c55e" /> : <Copy size={16} />}
              {copiedReport ? 'Copied Report' : 'Copy Summary'}
            </button>
            <button 
              className="btn btn-primary"
              onClick={exportToCSV}
              disabled={!fileTexts.pdf1 && !fileTexts.pdf2 && !fileTexts.pdf3}
            >
              <Download size={16} />
              Export CSV Report
            </button>
          </div>
        </div>

        {/* 3 PDF File Slot Dropzones */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          
          {/* Slot 1: PDF 1 (Before) */}
          <div className="glass-panel" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
                1. BEFORE / BASELINE
              </span>
              {files.pdf1 && (
                <button className="icon-btn" onClick={() => clearSlot('pdf1')} title="Remove file"><X size={16} /></button>
              )}
            </div>
            {files.pdf1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <FileText size={28} color="#3b82f6" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{files.pdf1.name}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {loading.pdf1 ? 'Extracting text...' : `${ fileTexts.pdf1.split('\n').length } lines extracted`}
                  </span>
                </div>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem 0' }}>
                <Upload size={24} color="var(--text-dim)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload 1st PDF (Before)</span>
                <input ref={refPdf1} type="file" accept=".pdf,.txt,.csv" onChange={(e) => handleFileUpload('pdf1', e)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Slot 2: PDF 2 (Interim / Mid) */}
          <div className="glass-panel" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontWeight: 600 }}>
                2. INTERIM / MID-STATE
              </span>
              {files.pdf2 && (
                <button className="icon-btn" onClick={() => clearSlot('pdf2')} title="Remove file"><X size={16} /></button>
              )}
            </div>
            {files.pdf2 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <FileText size={28} color="#eab308" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{files.pdf2.name}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {loading.pdf2 ? 'Extracting text...' : `${ fileTexts.pdf2.split('\n').length } lines extracted`}
                  </span>
                </div>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem 0' }}>
                <Upload size={24} color="var(--text-dim)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload 2nd PDF (Interim)</span>
                <input ref={refPdf2} type="file" accept=".pdf,.txt,.csv" onChange={(e) => handleFileUpload('pdf2', e)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Slot 3: PDF 3 (After) */}
          <div className="glass-panel" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 600 }}>
                3. AFTER / FINAL
              </span>
              {files.pdf3 && (
                <button className="icon-btn" onClick={() => clearSlot('pdf3')} title="Remove file"><X size={16} /></button>
              )}
            </div>
            {files.pdf3 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <FileText size={28} color="#22c55e" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{files.pdf3.name}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {loading.pdf3 ? 'Extracting text...' : `${ fileTexts.pdf3.split('\n').length } lines extracted`}
                  </span>
                </div>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem 0' }}>
                <Upload size={24} color="var(--text-dim)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload 3rd PDF (After)</span>
                <input ref={refPdf3} type="file" accept=".pdf,.txt,.csv" onChange={(e) => handleFileUpload('pdf3', e)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

        </div>
      </div>

      {/* Metrics & Analytics Overview Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Tracked Items</span>
            <Layers size={20} color="var(--accent-primary)" />
          </div>
          <div className="stat-value">{totalEntries}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Parsed across 3 files</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Changed Items</span>
            <FileDiff size={20} color="#eab308" />
          </div>
          <div className="stat-value" style={{ color: changedEntries > 0 ? '#eab308' : 'inherit' }}>
            {changedEntries}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {totalEntries > 0 ? `${ ((changedEntries / totalEntries) * 100).toFixed(1) }% modified` : '0%'}
          </span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Value Increases</span>
            <TrendingUp size={20} color="#22c55e" />
          </div>
          <div className="stat-value" style={{ color: '#22c55e' }}>+{increasedEntries}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Higher in After vs Before</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Value Decreases</span>
            <TrendingDown size={20} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>-{decreasedEntries}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Lower in After vs Before</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-label">Net Delta (P3 - P1)</span>
            <BarChart2 size={20} color="var(--accent-primary)" />
          </div>
          <div className="stat-value" style={{ color: netDelta >= 0 ? '#22c55e' : '#ef4444' }}>
            {netDelta >= 0 ? `+ ${ netDelta.toLocaleString() } ` : netDelta.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Cumulative sum change</span>
        </div>
      </div>

      {/* Main View Area with Tab Switcher & Search Bar */}
      <div className="system-table-container glass-card" style={{ padding: '1.5rem' }}>
        
        {/* Navigation View Modes & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          
          {/* View Mode Buttons */}
          <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
            <button 
              className={`btn ${ viewMode === 'matrix' ? 'btn-primary' : 'btn-secondary' } `}
              onClick={() => setViewMode('matrix')}
              style={{ border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <BarChart2 size={16} />
              Tally Matrix Table
            </button>

            <button 
              className={`btn ${ viewMode === '3way' ? 'btn-primary' : 'btn-secondary' } `}
              onClick={() => setViewMode('3way')}
              style={{ border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Layers size={16} />
              3-Way Side-by-Side
            </button>

            <button 
              className={`btn ${ viewMode === 'pairwise' ? 'btn-primary' : 'btn-secondary' } `}
              onClick={() => setViewMode('pairwise')}
              style={{ border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <ArrowUpDown size={16} />
              Pairwise Before/After
            </button>

            <button 
              className={`btn ${ viewMode === 'unified' ? 'btn-primary' : 'btn-secondary' } `}
              onClick={() => setViewMode('unified')}
              style={{ border: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <FileDiff size={16} />
              Unified Line Diff
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ minWidth: '220px' }}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search tally codes or values..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              value={filterMode} 
              onChange={(e) => setFilterMode(e.target.value)}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--text-main)', 
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">Show All Items ({totalEntries})</option>
              <option value="changed">Only Changed Items ({changedEntries})</option>
              <option value="increased">Only Increases (+{increasedEntries})</option>
              <option value="decreased">Only Decreases (-{decreasedEntries})</option>
            </select>
          </div>

        </div>

        {/* VIEW 1: STRUCTURED TALLY MATRIX TABLE */}
        {viewMode === 'matrix' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="system-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Item / Tally Code</th>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: '#3b82f6' }}>PDF 1 (Before)</th>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: '#eab308' }}>PDF 2 (Interim)</th>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', color: '#22c55e' }}>PDF 3 (After)</th>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Delta (Δ P3 - P1)</th>
                  <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Comparison Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                      No matching comparison items found. Adjust search or upload PDF files.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((row, idx) => (
                    <tr 
                      key={idx}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: row.status === 'increased' ? 'rgba(34, 197, 94, 0.04)' :
                          row.status === 'decreased' ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {row.key}
                      </td>
                      
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                        {row.val1Str}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                        {row.val2Str}
                        {row.delta12 !== null && row.delta12 !== 0 && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: row.delta12 > 0 ? '#22c55e' : '#ef4444' }}>
                            ({row.delta12 > 0 ? `+ ${ row.delta12 } ` : row.delta12})
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>
                        {row.val3Str}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {row.delta13 !== null ? (
                          <span style={{ color: row.delta13 > 0 ? '#22c55e' : row.delta13 < 0 ? '#ef4444' : 'var(--text-dim)' }}>
                            {row.delta13 > 0 ? `+ ${ row.delta13 } ` : row.delta13}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {row.status === 'increased' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                            <TrendingUp size={12} style={{ marginRight: '4px' }} /> Increased
                          </span>
                        )}
                        {row.status === 'decreased' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            <TrendingDown size={12} style={{ marginRight: '4px' }} /> Decreased
                          </span>
                        )}
                        {row.status === 'unchanged' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-dim)' }}>
                            Unchanged
                          </span>
                        )}
                        {row.status === 'modified' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                            Modified Text
                          </span>
                        )}
                        {row.status === 'added' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            New Addition
                          </span>
                        )}
                        {row.status === 'removed' && (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            Removed Item
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: 3-WAY SIDE-BY-SIDE VIEW */}
        {viewMode === '3way' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', minHeight: '500px' }}>
            
            {/* Column 1: PDF 1 */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', fontWeight: 600, color: '#3b82f6', display: 'flex', justifyContent: 'space-between' }}>
                <span>PDF 1 (BEFORE)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{files.pdf1?.name || 'No file'}</span>
              </div>
              <pre style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word', 
                lineHeight: '1.6', 
                backgroundColor: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '8px',
                overflowY: 'auto',
                maxHeight: '600px'
              }}>
                {fileTexts.pdf1 || 'No text extracted for PDF 1'}
              </pre>
            </div>

            {/* Column 2: PDF 2 */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', fontWeight: 600, color: '#eab308', display: 'flex', justifyContent: 'space-between' }}>
                <span>PDF 2 (INTERIM)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{files.pdf2?.name || 'No file'}</span>
              </div>
              <pre style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word', 
                lineHeight: '1.6', 
                backgroundColor: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '8px',
                overflowY: 'auto',
                maxHeight: '600px'
              }}>
                {fileTexts.pdf2 || 'No text extracted for PDF 2'}
              </pre>
            </div>

            {/* Column 3: PDF 3 */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', fontWeight: 600, color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                <span>PDF 3 (AFTER)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{files.pdf3?.name || 'No file'}</span>
              </div>
              <pre style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word', 
                lineHeight: '1.6', 
                backgroundColor: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '8px',
                overflowY: 'auto',
                maxHeight: '600px'
              }}>
                {fileTexts.pdf3 || 'No text extracted for PDF 3'}
              </pre>
            </div>

          </div>
        )}

        {/* VIEW 3: PAIRWISE BEFORE / AFTER SELECTOR */}
        {viewMode === 'pairwise' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Pair Selector Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Select Before Document:</span>
                <select 
                  value={pairwiseLeft}
                  onChange={(e) => setPairwiseLeft(e.target.value)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                >
                  <option value="pdf1">PDF 1 (Before / 10:30 AM)</option>
                  <option value="pdf2">PDF 2 (Interim / 10:38 AM)</option>
                  <option value="pdf3">PDF 3 (After / 10:49 AM)</option>
                </select>
              </div>

              <ArrowRight size={20} color="var(--accent-primary)" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Select After Document:</span>
                <select 
                  value={pairwiseRight}
                  onChange={(e) => setPairwiseRight(e.target.value)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                >
                  <option value="pdf1">PDF 1 (Before / 10:30 AM)</option>
                  <option value="pdf2">PDF 2 (Interim / 10:38 AM)</option>
                  <option value="pdf3">PDF 3 (After / 10:49 AM)</option>
                </select>
              </div>

            </div>

            {/* Pairwise Split Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '0.75rem', color: '#3b82f6' }}>
                  BEFORE ({files[pairwiseLeft]?.name || pairwiseLeft.toUpperCase()})
                </h4>
                <pre style={{ 
                  fontSize: '0.85rem', 
                  fontFamily: 'monospace', 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: '8px',
                  maxHeight: '550px',
                  overflowY: 'auto'
                }}>
                  {fileTexts[pairwiseLeft] || 'No text extracted.'}
                </pre>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '0.75rem', color: '#22c55e' }}>
                  AFTER ({files[pairwiseRight]?.name || pairwiseRight.toUpperCase()})
                </h4>
                <pre style={{ 
                  fontSize: '0.85rem', 
                  fontFamily: 'monospace', 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: '8px',
                  maxHeight: '550px',
                  overflowY: 'auto'
                }}>
                  {fileTexts[pairwiseRight] || 'No text extracted.'}
                </pre>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 4: UNIFIED LINE DIFF */}
        {viewMode === 'unified' && (
          <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileDiff size={18} color="var(--accent-primary)" />
              Unified Line-by-Line Changes (PDF 1 Before → PDF 3 After)
            </h4>
            
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredMatrix.map((row, idx) => {
                let prefix = ' ';
                let bgColor = 'transparent';
                let textColor = 'var(--text-main)';

                if (row.status === 'increased' || row.status === 'added') {
                  prefix = '+';
                  bgColor = 'rgba(34, 197, 94, 0.12)';
                  textColor = '#22c55e';
                } else if (row.status === 'decreased' || row.status === 'removed') {
                  prefix = '-';
                  bgColor = 'rgba(239, 68, 68, 0.12)';
                  textColor = '#ef4444';
                } else if (row.status === 'modified') {
                  prefix = '~';
                  bgColor = 'rgba(234, 179, 8, 0.12)';
                  textColor = '#eab308';
                }

                return (
                  <div 
                    key={idx}
                    style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      backgroundColor: bgColor,
                      color: textColor,
                      marginBottom: '2px'
                    }}
                  >
                    <span style={{ width: '20px', userSelect: 'none', opacity: 0.7 }}>{prefix}</span>
                    <span style={{ width: '120px', fontWeight: 600 }}>{row.key}</span>
                    <span style={{ width: '100px' }}>P1: {row.val1Str}</span>
                    <span style={{ width: '100px' }}>P2: {row.val2Str}</span>
                    <span style={{ width: '100px', fontWeight: 600 }}>P3: {row.val3Str}</span>
                    <span>
                      {row.delta13 !== null ? `(Δ ${ row.delta13 > 0 ? '+' : '' }${ row.delta13 })` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default PdfComparator;
