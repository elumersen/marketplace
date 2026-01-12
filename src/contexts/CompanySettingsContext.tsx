import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { companySettingsAPI } from '@/lib/api';
import { CompanySettings } from '@/types/api.types';

interface CompanySettingsContextType {
  settings: CompanySettings | null;
  logoUrl: string | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateLogoUrl: (url: string | null) => void;
}

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      setIsLoading(true);
      const response = await companySettingsAPI.getSettings();
      setSettings(response.settings);
      setLogoUrl(response.settings.logoUrl);
    } catch (error) {
      console.error('Failed to load company settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLogoUrl = (url: string | null) => {
    setLogoUrl(url);
    if (settings) {
      setSettings({ ...settings, logoUrl: url });
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <CompanySettingsContext.Provider
      value={{
        settings,
        logoUrl,
        isLoading,
        refreshSettings,
        updateLogoUrl,
      }}
    >
      {children}
    </CompanySettingsContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};

