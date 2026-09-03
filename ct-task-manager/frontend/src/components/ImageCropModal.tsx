import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  RotateCcw, 
  Circle, 
  Square, 
  RectangleHorizontal 
} from 'lucide-react';
import './ImageCropModal.css';

export type LogoShape = 'circle' | 'square' | 'rectangle';

interface ImageCropModalProps {
  imageSrc: string;
  initialShape?: LogoShape;
  onCropComplete: (croppedDataUrl: string, shape: LogoShape) => void;
  onCancel: () => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  initialShape = 'square',
  onCropComplete,
  onCancel,
}) => {
  const [shape, setShape] = useState<LogoShape>(initialShape);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Aspect ratio sizes for the crop box
  // Square: 240x240, Circle: 240x240, Rectangle: 300x140
  const cropBoxWidth = shape === 'rectangle' ? 300 : 240;
  const cropBoxHeight = shape === 'rectangle' ? 140 : 240;

  // Reset pan & zoom when image changes or shape toggles
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [shape]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom(prev => Math.min(Math.max(0.6, prev + delta), 3.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    // High-DPI dimensions: 220x220 for square/circle, 320x160 for rectangle
    const targetWidth = shape === 'rectangle' ? 320 : 220;
    const targetHeight = shape === 'rectangle' ? 160 : 220;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // If circle, create circular clipping path
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(targetWidth / 2, targetHeight / 2, targetWidth / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Scale calculations
    // How the image is rendered relative to crop box
    const scaleFactor = targetWidth / cropBoxWidth;
    
    // Original image aspect
    const imgNaturalW = img.naturalWidth;
    const imgNaturalH = img.naturalHeight;

    // Displayed image size in the crop box
    const displayW = img.width * zoom * scaleFactor;
    const displayH = img.height * zoom * scaleFactor;

    // Center coordinates
    const drawX = (targetWidth / 2) - (displayW / 2) + (pan.x * scaleFactor);
    const drawY = (targetHeight / 2) - (displayH / 2) + (pan.y * scaleFactor);

    ctx.drawImage(img, 0, 0, imgNaturalW, imgNaturalH, drawX, drawY, displayW, displayH);

    // Smart browser compression: high quality webp with fallback to png
    let croppedDataUrl = '';
    try {
      const webpUrl = canvas.toDataURL('image/webp', 0.92);
      if (webpUrl.startsWith('data:image/webp')) {
        croppedDataUrl = webpUrl;
      }
    } catch {
      // fallback
    }
    if (!croppedDataUrl) {
      croppedDataUrl = canvas.toDataURL('image/png');
    }

    onCropComplete(croppedDataUrl, shape);
  };

  return (
    <div className="icm-backdrop" onClick={onCancel}>
      <div className="icm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="icm-header">
          <div>
            <h3>Crop & Adjust Logo</h3>
            <p>Drag to reposition, zoom, and select your logo shape.</p>
          </div>
          <button type="button" className="icm-close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Shape Switcher Bar */}
        <div className="icm-shape-bar">
          <span className="icm-shape-label">Logo Shape:</span>
          <div className="icm-shape-pills">
            <button
              type="button"
              className={`icm-shape-pill ${shape === 'circle' ? 'active' : ''}`}
              onClick={() => setShape('circle')}
            >
              <Circle size={15} /> Circle
            </button>
            <button
              type="button"
              className={`icm-shape-pill ${shape === 'square' ? 'active' : ''}`}
              onClick={() => setShape('square')}
            >
              <Square size={15} /> Square
            </button>
            <button
              type="button"
              className={`icm-shape-pill ${shape === 'rectangle' ? 'active' : ''}`}
              onClick={() => setShape('rectangle')}
            >
              <RectangleHorizontal size={15} /> Rectangle
            </button>
          </div>
        </div>

        {/* Crop Viewport */}
        <div 
          className="icm-viewport-container" 
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          ref={containerRef}
        >
          {/* Draggable Image */}
          <img 
            ref={imageRef}
            src={imageSrc} 
            alt="Source"
            className="icm-source-image"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />

          {/* Dark Overlay with Transparent Cutout */}
          <div className="icm-mask-overlay">
            <div 
              className={`icm-crop-cutout ${shape}`}
              style={{
                width: `${cropBoxWidth}px`,
                height: `${cropBoxHeight}px`,
              }}
            >
              {/* Instagram-style 3x3 Grid Overlay */}
              <div className="icm-grid-overlay">
                <div className="icm-grid-line v1" />
                <div className="icm-grid-line v2" />
                <div className="icm-grid-line h1" />
                <div className="icm-grid-line h2" />
              </div>
            </div>
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="icm-controls">
          <div className="icm-zoom-group">
            <button 
              type="button" 
              className="icm-icon-btn"
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <input 
              type="range"
              min="0.6"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="icm-zoom-slider"
            />
            <button 
              type="button" 
              className="icm-icon-btn"
              onClick={() => setZoom(prev => Math.min(3.5, prev + 0.15))}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <span className="icm-zoom-val">{Math.round(zoom * 100)}%</span>
          </div>

          <button 
            type="button" 
            className="icm-btn-reset" 
            onClick={handleReset}
            title="Reset position and zoom"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* Footer Actions */}
        <div className="icm-footer">
          <button type="button" className="icm-btn icm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button 
            type="button" 
            className="icm-btn icm-btn-apply" 
            onClick={handleApplyCrop}
            disabled={!imageLoaded}
          >
            <Check size={16} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
