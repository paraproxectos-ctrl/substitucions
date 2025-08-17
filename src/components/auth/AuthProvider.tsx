import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
  telefono?: string;
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
    throw new Error('useAuth debe ser usado dentro dun AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      console.log('Profile data found:', profileData);
      setProfile(profileData);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setLoading(false);
        return;
      }

      // Si hay múltiples roles, tomar el primero (priorizando admin)
      const roles = roleData || [];
      console.log('User roles found:', roles);
      
      let selectedRole: UserRole | null = null;
      if (roles.length > 0) {
        // Priorizar admin si existe
        const adminRole = roles.find(r => r.role === 'admin');
        selectedRole = adminRole || roles[0];
      }
      
      console.log('Selected role:', selectedRole);
      setUserRole(selectedRole);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Configurar listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile and role after successful authentication
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Comprobar sesión existente
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
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
      await fetchUserProfile(user.id);
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