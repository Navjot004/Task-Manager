import React from 'react';
import { Building2 } from 'lucide-react';
import { useSettings, LogoShape, LogoSize } from '../context/SettingsContext';
import './PortalBrandLogo.css';

interface PortalBrandLogoProps {
  overrideUrl?: string | null;
  overrideShape?: LogoShape;
  overrideSize?: LogoSize;
  className?: string;
}

export const PortalBrandLogo: React.FC<PortalBrandLogoProps> = ({
  overrideUrl,
  overrideShape,
  overrideSize,
  className = '',
}) => {
  const { logoUrl: contextUrl, logoShape: contextShape, logoSize: contextSize } = useSettings();

  const url = overrideUrl !== undefined ? overrideUrl : contextUrl;
  const shape = overrideShape || contextShape || 'square';
  const size = overrideSize || contextSize || 'medium';

  const iconSizes: Record<LogoSize, number> = {
    small: 16,
    medium: 20,
    large: 26,
  };

  if (url) {
    return (
      <div className={`pbl-container shape-${shape} size-${size} ${className}`}>
        <img 
          src={url} 
          alt="Portal Logo" 
          className={`pbl-image shape-${shape} size-${size}`} 
        />
      </div>
    );
  }

  // Fallback: Default Built-in Icon
  return (
    <div className={`pbl-default shape-${shape} size-${size} ${className}`}>
      <Building2 size={iconSizes[size]} />
    </div>
  );
};

export default PortalBrandLogo;
