
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { School, Mail, Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useCapsLock } from '@/hooks/use-caps-lock';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const capsLock = useCapsLock();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/');
    };
    checkUser();
  }, [navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!loginForm.email.trim()) {
      newErrors.email = t('error.emailRequired');
    }
    
    if (!loginForm.password) {
      newErrors.password = t('error.passwordRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        let errorMessage = t('error.unexpectedError');
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('error.invalidCredentials');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('error.emailNotConfirmed');
        }
        setErrors({ general: errorMessage });
        toast({ 
          title: 'Error de autenticación', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        return;
      }

      if (data.user) {
        toast({ 
          title: t('success.welcome'), 
          description: t('success.loginSuccess') 
        });
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = t('error.unexpectedError');
      setErrors({ general: errorMsg });
      toast({ 
        title: 'Error', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin(e as any);
    }
  };

  const isFormValid = loginForm.email.trim() && loginForm.password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <School className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('auth.title')}</h1>
          <p className="text-muted-foreground">{t('auth.subtitle')}</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur rounded-2xl">
          <CardHeader className="space-y-1 pb-4 p-6 sm:p-8">
            <CardTitle className="text-center text-xl">{t('auth.access')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label 
                  htmlFor="login-email" 
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  onKeyDown={handleKeyDown}
                  required
                  disabled={loading}
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : 'email-help'}
                  className={`transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                  }`}
                />
                {errors.email && (
                  <div id="email-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                    {errors.email}
                  </div>
                )}
                <div id="email-help" className="sr-only">
                  {t('auth.enterSubmit')}
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="login-password" 
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {t('auth.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={loginForm.password}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onKeyDown={handleKeyDown}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : 'password-help'}
                    className={`pr-12 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {errors.password && (
                  <div id="password-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                    {errors.password}
                  </div>
                )}
                
                {capsLock && (
                  <div role="status" aria-live="polite" className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    {t('auth.capsLock')}
                  </div>
                )}
                
                <div id="password-help" className="sr-only">
                  {t('auth.enterSubmit')}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('auth.logging')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>

            {errors.general && (
              <Alert variant="destructive" role="alert" aria-live="polite">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('auth.info')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('general.copyright')} © {new Date().getFullYear()} {t('auth.title')}
        </p>
      </div>
    </div>
  );
};

export default Auth;
