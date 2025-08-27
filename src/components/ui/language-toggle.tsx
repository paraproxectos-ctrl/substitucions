
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === 'gl' ? 'es' : 'gl')}
      aria-label={language === 'gl' ? t('language.spanish') : t('language.galician')}
      className="h-9 px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {language === 'gl' ? 'ES' : 'GL'}
    </Button>
  );
};
