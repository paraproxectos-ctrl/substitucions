
import React from 'react';
import { Moon, Sun, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, highContrast, setHighContrast } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={theme === 'light' ? t('theme.dark') : t('theme.light')}
        className="h-9 w-9 px-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHighContrast(!highContrast)}
        aria-label={t('theme.highContrast')}
        aria-pressed={highContrast}
        className={`h-9 w-9 px-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          highContrast ? 'bg-primary text-primary-foreground' : ''
        }`}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
};
