import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type LogoShape = 'circle' | 'square' | 'rectangle';
export type LogoSize = 'small' | 'medium' | 'large';

interface SettingsContextType {
  systemName: string;
  logoUrl: string | null;
  logoShape: LogoShape;
  logoSize: LogoSize;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  saveSettings: (newSettings: {
    systemName?: string;
    logoUrl?: string | null;
    logoShape?: LogoShape;
    logoSize?: LogoSize;
  }) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemName, setSystemName] = useState<string>(() => {
    return localStorage.getItem('systemName') || 'Task-Manage';
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('logoUrl') || null;
  });
  const [logoShape, setLogoShape] = useState<LogoShape>(() => {
    return (localStorage.getItem('logoShape') as LogoShape) || 'square';
  });
  const [logoSize, setLogoSize] = useState<LogoSize>(() => {
    return (localStorage.getItem('logoSize') as LogoSize) || 'medium';
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const res = await api.getSettings();
        if (isMounted && res.success && res.data) {
          if (res.data.systemName) {
            setSystemName(res.data.systemName);
            localStorage.setItem('systemName', res.data.systemName);
          }
          if (res.data.logoUrl !== undefined) {
            setLogoUrl(res.data.logoUrl);
            if (res.data.logoUrl) {
              localStorage.setItem('logoUrl', res.data.logoUrl);
            } else {
              localStorage.removeItem('logoUrl');
            }
          }
          if (res.data.logoShape) {
            setLogoShape(res.data.logoShape);
            localStorage.setItem('logoShape', res.data.logoShape);
          }
          if (res.data.logoSize) {
            setLogoSize(res.data.logoSize);
            localStorage.setItem('logoSize', res.data.logoSize);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const saveSettings = async (newSettings: {
    systemName?: string;
    logoUrl?: string | null;
    logoShape?: LogoShape;
    logoSize?: LogoSize;
  }) => {
    setLoading(true);
    try {
      const res = await api.updateSettings(newSettings);
      if (res.success && res.data) {
        if (res.data.systemName) {
          setSystemName(res.data.systemName);
          localStorage.setItem('systemName', res.data.systemName);
        }
        if (res.data.logoUrl !== undefined) {
          setLogoUrl(res.data.logoUrl);
          if (res.data.logoUrl) {
            localStorage.setItem('logoUrl', res.data.logoUrl);
          } else {
            localStorage.removeItem('logoUrl');
          }
        }
        if (res.data.logoShape) {
          setLogoShape(res.data.logoShape);
          localStorage.setItem('logoShape', res.data.logoShape);
        }
        if (res.data.logoSize) {
          setLogoSize(res.data.logoSize);
          localStorage.setItem('logoSize', res.data.logoSize);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        systemName,
        logoUrl,
        logoShape,
        logoSize,
        isSettingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        saveSettings,
        loading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

const defaultSettingsValue: SettingsContextType = {
  systemName: localStorage.getItem('systemName') || 'Task-Manage',
  logoUrl: localStorage.getItem('logoUrl') || null,
  logoShape: ((localStorage.getItem('logoShape') as LogoShape) || 'square'),
  logoSize: ((localStorage.getItem('logoSize') as LogoSize) || 'medium'),
  isSettingsModalOpen: false,
  openSettingsModal: () => {},
  closeSettingsModal: () => {},
  saveSettings: async () => {},
  loading: false,
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    return defaultSettingsValue;
  }
  return context;
};

