
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'gl' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  gl: {
    // Auth
    'auth.title': 'Valle Inclán',
    'auth.subtitle': 'Sistema de Xestión de Substitucións',
    'auth.access': 'Acceso ao sistema',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.login': 'Iniciar sesión',
    'auth.logging': 'Iniciando sesión...',
    'auth.showPassword': 'Mostrar contraseña',
    'auth.hidePassword': 'Ocultar contraseña',
    'auth.info': 'Utiliza as credenciais de administrador para acceder ao sistema.',
    'auth.emailPlaceholder': 'admin@valleinclan.edu.es',
    'auth.passwordPlaceholder': '••••••••',
    'auth.enterSubmit': 'Prema Enter para enviar',
    'auth.capsLock': 'Bloqueio de maiúsculas activo',
    
    // Errors
    'error.emailRequired': 'Por favor, introduce o email',
    'error.passwordRequired': 'Por favor, introduce a contraseña',
    'error.bothRequired': 'Por favor, introduce email e contraseña',
    'error.invalidCredentials': 'Email ou contraseña incorrectos',
    'error.emailNotConfirmed': 'Por favor, confirma o teu email antes de iniciar sesión',
    'error.unexpectedError': 'Erro inesperado ao iniciar sesión',
    
    // Success
    'success.welcome': 'Benvido/a',
    'success.loginSuccess': 'Sesión iniciada correctamente',
    
    // General
    'general.loading': 'Cargando...',
    'general.copyright': 'Sistema educativo',
    'theme.light': 'Tema claro',
    'theme.dark': 'Tema escuro',
    'theme.highContrast': 'Alto contraste',
    'language.galician': 'Galego',
    'language.spanish': 'Español',
  },
  es: {
    // Auth
    'auth.title': 'Valle Inclán',
    'auth.subtitle': 'Sistema de Gestión de Sustituciones',
    'auth.access': 'Acceso al sistema',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.login': 'Iniciar sesión',
    'auth.logging': 'Iniciando sesión...',
    'auth.showPassword': 'Mostrar contraseña',
    'auth.hidePassword': 'Ocultar contraseña',
    'auth.info': 'Utiliza las credenciales de administrador para acceder al sistema.',
    'auth.emailPlaceholder': 'admin@valleinclan.edu.es',
    'auth.passwordPlaceholder': '••••••••',
    'auth.enterSubmit': 'Pulse Enter para enviar',
    'auth.capsLock': 'Bloqueo de mayúsculas activo',
    
    // Errors
    'error.emailRequired': 'Por favor, introduce el email',
    'error.passwordRequired': 'Por favor, introduce la contraseña',
    'error.bothRequired': 'Por favor, introduce email y contraseña',
    'error.invalidCredentials': 'Email o contraseña incorrectos',
    'error.emailNotConfirmed': 'Por favor, confirma tu email antes de iniciar sesión',
    'error.unexpectedError': 'Error inesperado al iniciar sesión',
    
    // Success
    'success.welcome': 'Bienvenido/a',
    'success.loginSuccess': 'Sesión iniciada correctamente',
    
    // General
    'general.loading': 'Cargando...',
    'general.copyright': 'Sistema educativo',
    'theme.light': 'Tema claro',
    'theme.dark': 'Tema oscuro',
    'theme.highContrast': 'Alto contraste',
    'language.galician': 'Galego',
    'language.spanish': 'Español',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('gl');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'gl' || savedLanguage === 'es')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
