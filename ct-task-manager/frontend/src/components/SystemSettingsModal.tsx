import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  Upload, 
  Trash2, 
  Circle, 
  Square, 
  RectangleHorizontal,
  Crop
} from 'lucide-react';
import { useSettings, LogoShape, LogoSize } from '../context/SettingsContext';
import ImageCropModal from './ImageCropModal';
import PortalBrandLogo from './PortalBrandLogo';
import './SystemSettingsModal.css';

const SystemSettingsModal: React.FC = () => {
  const { 
    systemName, 
    logoUrl, 
    logoShape, 
    logoSize, 
    isSettingsModalOpen, 
    closeSettingsModal, 
    saveSettings 
  } = useSettings();

  const [nameInput, setNameInput] = useState(systemName);
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl);
  const [currentShape, setCurrentShape] = useState<LogoShape>(logoShape);
  const [currentSize, setCurrentSize] = useState<LogoSize>(logoSize);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Crop modal state
  const [cropImageSource, setCropImageSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSettingsModalOpen) {
      setNameInput(systemName);
      setCurrentLogo(logoUrl);
      setCurrentShape(logoShape);
      setCurrentSize(logoSize);
      setError(null);
      setSuccess(false);
      setCropImageSource(null);
    }
  }, [isSettingsModalOpen, systemName, logoUrl, logoShape, logoSize]);

  if (!isSettingsModalOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Selected image is too large (max 10MB). Please select a smaller file.');
      return;
    }

    // Support JPEG, PNG, SVG, WEBP, GIF, etc.
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setCropImageSource(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl: string, shape: LogoShape) => {
    setCurrentLogo(croppedDataUrl);
    setCurrentShape(shape);
    setCropImageSource(null);
  };

  const handleRemoveLogo = () => {
    setCurrentLogo(null);
  };

  const handleResetName = () => {
    setNameInput('Task-Manage');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('System name cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await saveSettings({
        systemName: trimmed,
        logoUrl: currentLogo,
        logoShape: currentShape,
        logoSize: currentSize,
      });
      setSuccess(true);
      setTimeout(() => {
        closeSettingsModal();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Interactive Crop & Zoom Modal */}
      {cropImageSource && (
        <ImageCropModal
          imageSrc={cropImageSource}
          initialShape={currentShape}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSource(null)}
        />
      )}

      <div className="ssm-backdrop" onClick={closeSettingsModal}>
        <div className="ssm-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="ssm-header">
            <div className="ssm-header-title">
              <h3>System Settings</h3>
              <p>Customize the portal name, logo branding, shape, and size across all dashboards.</p>
            </div>
            <button 
              type="button" 
              className="ssm-close-btn" 
              onClick={closeSettingsModal}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="ssm-body">
            {error && (
              <div className="ssm-alert ssm-alert-error">
                {error}
              </div>
            )}

            {success && (
              <div className="ssm-alert ssm-alert-success">
                <CheckCircle2 size={16} />
                Settings saved successfully!
              </div>
            )}

            {/* Portal Name Field */}
            <div className="ssm-field">
              <label className="ssm-label">
                Portal / System Name
              </label>
              <div className="ssm-input-row">
                <input
                  type="text"
                  className="ssm-input"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., Task-Manage"
                  maxLength={40}
                  required
                />
                <button
                  type="button"
                  className="ssm-btn-default"
                  onClick={handleResetName}
                  title="Reset name to default (Task-Manage)"
                >
                  <RotateCcw size={14} /> Default
                </button>
              </div>
            </div>

            {/* Logo Customization Section */}
            <div className="ssm-field">
              <label className="ssm-label">
                Portal Logo
              </label>

              <div className="ssm-logo-editor-row">
                {/* Current logo display */}
                <div className="ssm-logo-display-box">
                  <PortalBrandLogo 
                    overrideUrl={currentLogo} 
                    overrideShape={currentShape} 
                    overrideSize={currentSize} 
                  />
                  <span className="ssm-logo-state-label">
                    {currentLogo ? 'Custom Logo' : 'Default Icon'}
                  </span>
                </div>

                {/* Logo Action buttons */}
                <div className="ssm-logo-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp, image/gif"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="ssm-btn-action upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> Upload & Crop
                  </button>

                  {currentLogo && (
                    <>
                      <button
                        type="button"
                        className="ssm-btn-action recrop"
                        onClick={() => setCropImageSource(currentLogo)}
                        title="Re-crop and adjust current logo"
                      >
                        <Crop size={15} /> Re-crop
                      </button>
                      <button
                        type="button"
                        className="ssm-btn-action remove"
                        onClick={handleRemoveLogo}
                        title="Remove custom logo and restore default icon"
                      >
                        <Trash2 size={15} /> Default
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Shape Selection */}
            <div className="ssm-field">
              <label className="ssm-label">Logo Shape</label>
              <div className="ssm-pill-selector">
                <button
                  type="button"
                  className={`ssm-pill-option ${currentShape === 'circle' ? 'active' : ''}`}
                  onClick={() => setCurrentShape('circle')}
                >
                  <Circle size={15} /> Circle
                </button>
                <button
                  type="button"
                  className={`ssm-pill-option ${currentShape === 'square' ? 'active' : ''}`}
                  onClick={() => setCurrentShape('square')}
                >
                  <Square size={15} /> Square
                </button>
                <button
                  type="button"
                  className={`ssm-pill-option ${currentShape === 'rectangle' ? 'active' : ''}`}
                  onClick={() => setCurrentShape('rectangle')}
                >
                  <RectangleHorizontal size={15} /> Rectangle
                </button>
              </div>
            </div>

            {/* Size Selection: Small, Medium, Large */}
            <div className="ssm-field">
              <label className="ssm-label">Logo Size</label>
              <div className="ssm-pill-selector">
                <button
                  type="button"
                  className={`ssm-pill-option ${currentSize === 'small' ? 'active' : ''}`}
                  onClick={() => setCurrentSize('small')}
                >
                  Small
                </button>
                <button
                  type="button"
                  className={`ssm-pill-option ${currentSize === 'medium' ? 'active' : ''}`}
                  onClick={() => setCurrentSize('medium')}
                >
                  Medium (Default)
                </button>
                <button
                  type="button"
                  className={`ssm-pill-option ${currentSize === 'large' ? 'active' : ''}`}
                  onClick={() => setCurrentSize('large')}
                >
                  Large
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="ssm-preview-box">
              <span className="ssm-preview-title">Live Sidebar Header Preview:</span>
              <div className="ssm-preview-card">
                <PortalBrandLogo 
                  overrideUrl={currentLogo} 
                  overrideShape={currentShape} 
                  overrideSize={currentSize} 
                />
                <span className="ssm-preview-name">
                  {nameInput.trim() || 'Task-Manage'}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="ssm-footer">
              <button
                type="button"
                className="ssm-btn ssm-btn-secondary"
                onClick={closeSettingsModal}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ssm-btn ssm-btn-primary"
                disabled={isSaving}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SystemSettingsModal;
