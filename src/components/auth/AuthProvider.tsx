import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
  telefono?: string;
  horas_libres_semanais?: number;
  sustitucions_realizadas_semana?: number;
}

interface UserRole {
  role: 'admin' | 'profesor';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Fetch profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      let profileData = null;
      try {
        const result = await Promise.race([profilePromise, timeoutPromise]) as any;
        profileData = result.data;
      } catch (error: any) {
        console.log('Profile fetch failed:', error.message);
        // Set default profile if fetch fails
        profileData = {
          user_id: userId,
          nome: 'Usuario',
          apelidos: 'Sin Configurar',
          email: user?.email || '',
          horas_libres_semanais: 0,
          sustitucions_realizadas_semana: 0
        };
      }

      setProfile(profileData);

      // Fetch role with timeout
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1);

      let roleData = null;
      try {
        const result = await Promise.race([rolePromise, timeoutPromise]) as any;
        roleData = result.data;
      } catch (error: any) {
        console.log('Role fetch failed:', error.message);
      }

      if (roleData && roleData.length > 0) {
        const adminRole = roleData.find((r: any) => r.role === 'admin');
        setUserRole(adminRole || roleData[0]);
      } else {
        setUserRole({ role: 'profesor' });
      }

      console.log('User data loaded successfully');
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Set defaults on error
      setProfile({
        user_id: userId,
        nome: 'Usuario',
        apelidos: 'Sin Configurar',
        email: user?.email || '',
        horas_libres_semanais: 0,
        sustitucions_realizadas_semana: 0
      });
      setUserRole({ role: 'profesor' });
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 3000)
        );

        const { data: { session } } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as any;

        if (!mounted) return;

        console.log('Session status:', session ? 'found' : 'not found');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Use setTimeout to prevent deadlock
        setTimeout(() => {
          if (mounted) {
            fetchUserData(session.user.id).finally(() => {
              if (mounted) setLoading(false);
            });
          }
        }, 100);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};