import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Settings, Download, Trash2, Edit, Layers, 
  Scissors, Type, Lock, Loader2, Image as ImageIcon, 
  PenTool, MousePointer2, Eraser, Search, ChevronLeft, ChevronRight,
  Save, MoreVertical, Undo, Redo, Grid, FileText, Bookmark, AlignLeft,
  Bot, Sparkles, Languages, FileOutput, Shield, Fingerprint, Users, 
  MessageSquare, FilePlus, X, Plus, Printer, Share2, Menu, Layout, FileEdit, Wand2
} from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import './App.css';

const PdfEditor = () => {
  // Core State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI State
  const [activeRibbon, setActiveRibbon] = useState('Home');
  const [leftSidebarTab, setLeftSidebarTab] = useState('thumbnails');
  const [rightSidebarTab, setRightSidebarTab] = useState('properties');
  const [zoom, setZoom] = useState(100);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  
  // Editing State
  const [activeTool, setActiveTool] = useState('select');
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasContainerRef = useRef(null);

  // Wheel Zoom handler
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        setZoom(prev => Math.min(300, Math.max(50, prev + delta)));
      }
    };

    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // File loading
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      const getPageCount = async () => {
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          setPageCount(pdfDoc.getPageCount());
        } catch (error) {
          console.error("Error loading PDF:", error);
          setPageCount(1);
        }
      };
      getPageCount();
      setElements([]);
      setSelectedElementId(null);
      setCurrentPage(1);
      
      // Setup mock tabs
      if (openTabs.length === 0) {
        const newTab = { id: Date.now(), name: selectedFile.name, file: selectedFile };
        setOpenTabs([newTab]);
        setActiveTabId(newTab.id);
      }

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setPageCount(1);
    }
  }, [selectedFile]);

  // Dragging logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && selectedElementId) {
        const container = document.getElementById('pdf-overlay-container');
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const scale = zoom / 100;
        const x = (e.clientX - containerRect.left) / scale - dragOffset.x;
        const y = (e.clientY - containerRect.top) / scale - dragOffset.y;
        
        setElements(prev => prev.map(el => el.id === selectedElementId ? {
          ...el,
          x: Math.max(0, Math.round(x)),
          y: Math.max(0, Math.round(y))
        } : el));
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedElementId, zoom, dragOffset]);

  const handleElementMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedElementId(id);
    setActiveTool('select');
    setRightSidebarTab('properties');
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    setDragOffset({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleContainerClick = (e) => {
    if (e.target.id !== 'pdf-overlay-container-inner') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);

    if (activeTool === 'text') {
      const newEl = { id: Date.now().toString(), type: 'text', text: 'Type here...', font: 'Helvetica', size: 16, color: '#000000', x, y, page: currentPage };
      setElements([...elements, newEl]);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      setRightSidebarTab('properties');
    } else if (activeTool === 'erase') {
      const newEl = { id: Date.now().toString(), type: 'erase', x, y, width: 100, height: 50, page: currentPage };
      setElements([...elements, newEl]);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      setRightSidebarTab('properties');
    } else if (activeTool === 'select') {
      setSelectedElementId(null);
    }
  };

  const updateSelectedElement = (updates) => {
    setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, ...updates } : el));
  };

  const deleteSelectedElement = () => {
    setElements(prev => prev.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16)/255, g: parseInt(result[2], 16)/255, b: parseInt(result[3], 16)/255 } : { r: 0, g: 0, b: 0 };
  };

  const executeTool = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      let pdfDoc = await PDFDocument.load(arrayBuffer);
      let outputName = `edited_${selectedFile.name}`;
      const pages = pdfDoc.getPages();

      for (const el of elements) {
        const pageIndex = el.page - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const targetPage = pages[pageIndex];
        const { width: pdfWidth, height: pdfHeight } = targetPage.getSize();
        const scaleX = pdfWidth / 800;
        const scaleY = pdfHeight / 1130;

        if (el.type === 'text') {
          const rgbColor = hexToRgb(el.color);
          targetPage.drawText(el.text || 'Sample Text', {
            x: (el.x !== undefined ? el.x : 50) * scaleX,
            y: pdfHeight - ((el.y !== undefined ? el.y : 50) * scaleY) - (el.size * scaleY * 0.8),
            size: (el.size || 16) * scaleY,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
          });
        } 
        else if (el.type === 'image' && el.imgFile) {
          const imgArrayBuffer = await el.imgFile.arrayBuffer();
          let pdfImage = el.imgFile.type === 'image/png' ? await pdfDoc.embedPng(imgArrayBuffer) : await pdfDoc.embedJpg(imgArrayBuffer);
          if (pdfImage) {
            targetPage.drawImage(pdfImage, { 
              x: (el.x || 50) * scaleX, 
              y: pdfHeight - ((el.y || 50) * scaleY) - ((el.imgHeight || 150) * scaleY), 
              width: (el.imgWidth || 150) * scaleX, 
              height: (el.imgHeight || 150) * scaleY 
            });
          }
        }
        else if (el.type === 'erase') {
          targetPage.drawRectangle({ 
            x: (el.x || 50) * scaleX, 
            y: pdfHeight - ((el.y || 50) * scaleY) - ((el.height || 50) * scaleY), 
            width: (el.width || 100) * scaleX, 
            height: (el.height || 50) * scaleY, 
            color: rgb(1, 1, 1) 
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Error saving PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const featureNotImplemented = (featureName) => {
    alert(`The "${featureName}" feature requires backend integration (e.g., OCR API, AI Services, or Conversion Libraries) and is currently in development mode.`);
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // --- UI RENDER HELPERS ---
  const RibbonButton = ({ icon: Icon, label, active, onClick, disabled }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
        padding: '0.5rem', minWidth: '60px', border: 'none', background: 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-main)', opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: '6px'
      }}
      className="ribbon-btn-hover"
    >
      <Icon size={20} />
      <span style={{ fontSize: '0.7rem' }}>{label}</span>
    </button>
  );

  if (!selectedFile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)' }}>
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <FileEdit size={40} color="var(--accent-primary)" /> SGC Acrobat Pro
          </h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: '3rem' }}>Professional desktop and web-based PDF management.</p>
          
          <div 
            onClick={() => document.getElementById('pdf-upload').click()}
            style={{ border: '2px dashed var(--accent-primary)', borderRadius: '12px', padding: '6rem 2rem', background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.3s ease' }}
            className="upload-zone-hover"
          >
            <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <Upload size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Open PDF Document</h3>
            <p style={{ color: 'var(--text-dim)' }}>Drag and drop your PDF here to begin advanced editing</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      
      {/* Title Bar & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', padding: '0.5rem 1rem 0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '2rem', paddingBottom: '0.5rem' }}>
          <FileEdit size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>SGC Acrobat Pro</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {openTabs.map(tab => (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeTabId === tab.id ? 'var(--bg-main)' : 'var(--bg-secondary)', padding: '0.4rem 1rem', borderRadius: '6px 6px 0 0', border: '1px solid var(--border-color)', borderBottom: activeTabId === tab.id ? '1px solid var(--bg-main)' : '1px solid var(--border-color)', marginBottom: '-1px', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</span>
              <X size={14} style={{ opacity: 0.5 }} className="tab-close-hover" onClick={(e) => { e.stopPropagation(); /* Close logic */ }} />
            </div>
          ))}
          <div style={{ padding: '0.4rem 0.5rem', cursor: 'pointer', color: 'var(--text-dim)' }} className="tab-add-hover">
            <Plus size={16} />
          </div>
        </div>
      </div>

      {/* Main Ribbon */}
      <div style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
        {/* Ribbon Categories */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 1rem 0 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          {['Home', 'Edit', 'Annotate', 'Convert', 'Sign & Protect', 'AI Assistant'].map(tab => (
            <div 
              key={tab} 
              onClick={() => setActiveRibbon(tab)}
              style={{ paddingBottom: '0.5rem', cursor: 'pointer', color: activeRibbon === tab ? 'var(--accent-primary)' : 'var(--text-main)', borderBottom: activeRibbon === tab ? '2px solid var(--accent-primary)' : '2px solid transparent', fontWeight: activeRibbon === tab ? '500' : 'normal' }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Ribbon Toolbar Content */}
        <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', minHeight: '70px', overflowX: 'auto' }}>
          {activeRibbon === 'Home' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={Save} label="Export PDF" onClick={executeTool} />
                <RibbonButton icon={Printer} label="Print" onClick={() => featureNotImplemented('Print')} />
                <RibbonButton icon={Share2} label="Share" onClick={() => featureNotImplemented('Cloud Sharing')} />
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={MousePointer2} label="Select" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
                <RibbonButton icon={Search} label="Search" onClick={() => featureNotImplemented('Deep Search')} />
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={Undo} label="Undo" />
                <RibbonButton icon={Redo} label="Redo" />
              </div>
            </>
          )}

          {activeRibbon === 'Edit' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={Type} label="Add Text" active={activeTool === 'text'} onClick={() => { setActiveTool('text'); setSelectedElementId(null); }} />
                <RibbonButton icon={ImageIcon} label="Add Image" active={activeTool === 'image'} onClick={() => { setActiveTool('image'); setSelectedElementId(null); setRightSidebarTab('properties'); }} />
                <RibbonButton icon={Eraser} label="Whiteout" active={activeTool === 'erase'} onClick={() => { setActiveTool('erase'); setSelectedElementId(null); }} />
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={FilePlus} label="Insert Page" onClick={() => featureNotImplemented('Insert Page')} />
                <RibbonButton icon={Scissors} label="Crop/Split" onClick={() => featureNotImplemented('Crop & Split')} />
                <RibbonButton icon={Layers} label="Organize" onClick={() => featureNotImplemented('Organize Pages')} />
              </div>
            </>
          )}

          {activeRibbon === 'Annotate' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={PenTool} label="Highlight" onClick={() => featureNotImplemented('Highlight Text')} />
                <RibbonButton icon={MessageSquare} label="Comment" onClick={() => featureNotImplemented('Sticky Notes')} />
              </div>
            </>
          )}

          {activeRibbon === 'Convert' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={FileOutput} label="To Word" onClick={() => featureNotImplemented('Convert to Word')} />
                <RibbonButton icon={FileOutput} label="To Excel" onClick={() => featureNotImplemented('Convert to Excel')} />
                <RibbonButton icon={Languages} label="OCR (Text)" onClick={() => featureNotImplemented('Optical Character Recognition')} />
              </div>
            </>
          )}

          {activeRibbon === 'Sign & Protect' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={Fingerprint} label="Sign PDF" onClick={() => featureNotImplemented('Digital Signatures')} />
                <RibbonButton icon={Shield} label="Protect" onClick={() => featureNotImplemented('Password Protection & AES')} />
                <RibbonButton icon={Users} label="Permissions" onClick={() => featureNotImplemented('Role-based Permissions')} />
              </div>
            </>
          )}

          {activeRibbon === 'AI Assistant' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <RibbonButton icon={Wand2} label="Summarize" onClick={() => { setRightSidebarTab('ai'); setActiveRibbon('Home'); }} />
                <RibbonButton icon={Bot} label="Chat with PDF" onClick={() => { setRightSidebarTab('ai'); setActiveRibbon('Home'); }} />
                <RibbonButton icon={Sparkles} label="Extract Keys" onClick={() => { setRightSidebarTab('ai'); setActiveRibbon('Home'); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Sidebar */}
        <div style={{ width: '48px', background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0', gap: '1rem' }}>
          <button className={`sidebar-icon-btn ${leftSidebarTab === 'thumbnails' ? 'active' : ''}`} onClick={() => setLeftSidebarTab(leftSidebarTab === 'thumbnails' ? null : 'thumbnails')} title="Thumbnails"><Grid size={20} /></button>
          <button className={`sidebar-icon-btn ${leftSidebarTab === 'bookmarks' ? 'active' : ''}`} onClick={() => setLeftSidebarTab(leftSidebarTab === 'bookmarks' ? null : 'bookmarks')} title="Bookmarks"><Bookmark size={20} /></button>
          <button className={`sidebar-icon-btn ${leftSidebarTab === 'layers' ? 'active' : ''}`} onClick={() => setLeftSidebarTab(leftSidebarTab === 'layers' ? null : 'layers')} title="Layers"><Layers size={20} /></button>
        </div>

        {/* Left Panel Content */}
        {leftSidebarTab && (
          <div style={{ width: '220px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              {leftSidebarTab}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {leftSidebarTab === 'thumbnails' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                    <div 
                      key={page} 
                      onClick={() => { setCurrentPage(page); setSelectedElementId(null); }}
                      style={{ 
                        cursor: 'pointer', border: currentPage === page ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        borderRadius: '6px', padding: '0.5rem', background: currentPage === page ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                      }}
                    >
                      <div style={{ width: '100px', height: '140px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        Page {page}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {leftSidebarTab === 'bookmarks' && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No bookmarks in this document.</p>
              )}
              {leftSidebarTab === 'layers' && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Document layers will appear here.</p>
              )}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e0e0e0' /* Darker bg for canvas area to match Acrobat */ }}>
          
          {/* Zoom & View Controls */}
          <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Page {currentPage} of {pageCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ border: 'none', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>-</button>
              <span style={{ minWidth: '40px', textAlign: 'center' }}>{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(300, z + 10))} style={{ border: 'none', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>+</button>
              <span style={{ color: 'var(--text-dim)', marginLeft: '1rem' }}>(Ctrl + Scroll to Zoom)</span>
            </div>
          </div>

          <div 
            ref={canvasContainerRef}
            style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2rem' }}
          >
            <div 
              id="pdf-overlay-container" 
              style={{ 
                position: 'relative', 
                width: `${800 * (zoom / 100)}px`, 
                height: `${1130 * (zoom / 100)}px`, 
                background: '#fff', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)', 
                border: '1px solid #ccc',
                transition: 'width 0.1s ease, height 0.1s ease'
              }}
            >
              
              {/* Simulated Canvas Overlay Layer */}
              <div 
                id="pdf-overlay-container-inner"
                onClick={handleContainerClick}
                style={{ 
                  position: 'absolute', top: 0, left: 0, width: '800px', height: '1130px',
                  transform: `scale(${zoom / 100})`, transformOrigin: 'top left',
                  zIndex: 10, pointerEvents: 'auto', overflow: 'hidden',
                  cursor: activeTool === 'text' ? 'text' : activeTool === 'erase' ? 'crosshair' : 'default'
                }}
              >
                  {elements.filter(el => el.page === currentPage).map(el => {
                    if (el.type === 'text') {
                      return (
                        <div 
                          key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                          style={{ position: 'absolute', left: `${el.x}px`, top: `${el.y}px`, fontSize: `${el.size}px`, fontFamily: el.font === 'Helvetica' ? 'Arial, Helvetica, sans-serif' : el.font, color: el.color, whiteSpace: 'pre-wrap', lineHeight: 1, pointerEvents: 'auto', cursor: isDragging && selectedElementId === el.id ? 'grabbing' : 'grab', userSelect: 'none', border: selectedElementId === el.id ? '1px dashed var(--accent-primary)' : '1px dashed transparent', padding: '2px' }}
                        >
                          {el.text}
                        </div>
                      );
                    }
                    if (el.type === 'image') {
                      return (
                        <div
                          key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                          style={{ position: 'absolute', left: `${el.x}px`, top: `${el.y}px`, width: `${el.imgWidth}px`, height: `${el.imgHeight}px`, pointerEvents: 'auto', cursor: isDragging && selectedElementId === el.id ? 'grabbing' : 'grab', userSelect: 'none', border: selectedElementId === el.id ? '1px dashed var(--accent-primary)' : '1px dashed transparent', backgroundImage: `url(${el.imgUrl})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
                        />
                      );
                    }
                    if (el.type === 'erase') {
                      return (
                        <div
                          key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                          style={{ position: 'absolute', left: `${el.x}px`, top: `${el.y}px`, width: `${el.width}px`, height: `${el.height}px`, backgroundColor: '#ffffff', pointerEvents: 'auto', cursor: isDragging && selectedElementId === el.id ? 'grabbing' : 'grab', userSelect: 'none', border: selectedElementId === el.id ? '1px dashed var(--accent-primary)' : '1px dashed #ccc', boxShadow: '0 0 4px rgba(0,0,0,0.1)' }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
                
                <iframe 
                  src={`${previewUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  title="PDF Render"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>
        {/* Right Sidebar (Properties / AI) */}
        <div style={{ width: '300px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setRightSidebarTab('properties')} style={{ flex: 1, padding: '0.75rem', background: rightSidebarTab === 'properties' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', border: 'none', borderBottom: rightSidebarTab === 'properties' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Properties</button>
            <button onClick={() => setRightSidebarTab('ai')} style={{ flex: 1, padding: '0.75rem', background: rightSidebarTab === 'ai' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', border: 'none', borderBottom: rightSidebarTab === 'ai' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Sparkles size={14} color="var(--accent-primary)" /> AI Chat
            </button>
          </div>
          
          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            {rightSidebarTab === 'properties' && (
              <>
                {selectedElement ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{selectedElement.type} Element</span>
                      <button onClick={deleteSelectedElement} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}><Trash2 size={14} /> Delete</button>
                    </div>
                    
                    {selectedElement.type === 'text' && (
                      <>
                        <div className="form-group">
                          <label style={{ fontSize: '0.85rem' }}>Text Content</label>
                          <textarea rows="3" value={selectedElement.text} onChange={(e) => updateSelectedElement({ text: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.85rem' }}>Typography</label>
                          <select value={selectedElement.font} onChange={(e) => updateSelectedElement({ font: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times Roman">Times Roman</option>
                            <option value="Courier">Courier</option>
                          </select>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" title="Font Size" value={selectedElement.size} onChange={(e) => updateSelectedElement({ size: parseInt(e.target.value) || 12 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                            <input type="color" title="Text Color" value={selectedElement.color} onChange={(e) => updateSelectedElement({ color: e.target.value })} style={{ width: '50px', height: '36px', padding: '0', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }} />
                          </div>
                        </div>
                      </>
                    )}

                    {selectedElement.type === 'image' && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.85rem' }}>Dimensions (W / H)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="number" placeholder="Width" value={selectedElement.imgWidth} onChange={(e) => updateSelectedElement({ imgWidth: parseInt(e.target.value) || 50 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                          <input type="number" placeholder="Height" value={selectedElement.imgHeight} onChange={(e) => updateSelectedElement({ imgHeight: parseInt(e.target.value) || 50 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'erase' && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.85rem' }}>Dimensions (W / H)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="number" placeholder="Width" value={selectedElement.width} onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 10 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                          <input type="number" placeholder="Height" value={selectedElement.height} onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 10 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem' }}>Positioning (X / Y)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" placeholder="X" value={selectedElement.x} onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        <input type="number" placeholder="Y" value={selectedElement.y} onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-dim)' }}>
                    {activeTool === 'text' && <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>Click anywhere on the PDF to add text.</p>}
                    {activeTool === 'erase' && <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>Click anywhere on the PDF to place a whiteout block.</p>}
                    {activeTool === 'image' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>Upload an image to place it on the current page.</p>
                        <input 
                          type="file" accept="image/png, image/jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const newEl = { id: Date.now().toString(), type: 'image', imgFile: file, imgUrl: URL.createObjectURL(file), imgWidth: 150, imgHeight: 150, x: 100, y: 100, page: currentPage };
                              setElements([...elements, newEl]);
                              setSelectedElementId(newEl.id);
                              setActiveTool('select');
                            }
                          }}
                          style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    )}
                    {activeTool === 'select' && (
                      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Layout size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                        <p>Select an object or click a tool in the ribbon.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {rightSidebarTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-primary)', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                  <p><strong>AI Assistant</strong> is ready.</p>
                  <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>I can summarize this document, find key points, or answer questions.</p>
                </div>
                <div style={{ flex: 1 }}></div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Ask AI about this PDF..." style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                  <button style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default PdfEditor;
