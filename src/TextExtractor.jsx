import React, { useState, useRef, useEffect } from 'react';
import Tesseract, { createWorker } from 'tesseract.js';
import { Upload, FileText, Loader2, Image as ImageIcon, Copy, CheckCircle2 } from 'lucide-react';
import './App.css'; // Using the same styling context

const TextExtractor = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
            setExtractedText('');
            setProgress(0);
          }
          break; // Only take the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setExtractedText('');
      setProgress(0);
    }
  };

  const handleExtractText = async () => {
    if (!image) return;

    setIsProcessing(true);
    setExtractedText('');
    
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      // Page Segmentation Mode 7: Treat the image as a single text line.
      // This is drastically faster for small snippets since it skips layout analysis.
      await worker.setParameters({
        tessedit_pageseg_mode: '7',
      });

      const result = await worker.recognize(image);
      setExtractedText(result.data.text);
      await worker.terminate();
    } catch (error) {
      console.error('Error during OCR:', error);
      setExtractedText('An error occurred during text extraction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="text-extractor-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="system-table-container glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ImageIcon size={24} color="var(--accent-primary)" />
            Optical Character Recognition
          </h2>
          <button 
            className="btn btn-primary" 
            onClick={triggerFileInput}
            disabled={isProcessing}
          >
            <Upload size={18} />
            Upload Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column: Image Preview */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImageIcon size={18} /> Image Preview
            </h3>
            
            <div style={{ 
              flex: 1, 
              border: '2px dashed var(--border-color)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-tertiary)'
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                  <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                  <p>No image selected<br/><span style={{ fontSize: '0.85rem' }}>Upload or Paste (Ctrl+V) an image</span></p>
                </div>
              )}
            </div>

            {imagePreview && (
              <button 
                className="btn btn-primary" 
                style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                onClick={handleExtractText}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Extracting... {progress}%
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Extract Text
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right Column: Extracted Text */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} /> Extracted Text
              </h3>
              {extractedText && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCopyText}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  {copied ? <CheckCircle2 size={16} color="#22c55e" /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            <textarea
              style={{
                flex: 1,
                width: '100%',
                padding: '1rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}
              placeholder="Extracted text will appear here. You can edit this text after extraction."
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              disabled={isProcessing}
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextExtractor;
