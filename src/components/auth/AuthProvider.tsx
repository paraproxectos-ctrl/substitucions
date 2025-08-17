import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [initialized, setInitialized] = useState(false);
  const fetchingProfile = useRef(false);

  const fetchUserProfile = async (userId: string) => {
    // Prevent concurrent profile fetches
    if (fetchingProfile.current) {
      console.log('Profile fetch already in progress, skipping...');
      return;
    }

    try {
      fetchingProfile.current = true;
      console.log('Fetching profile for user:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Error de conexión",
          description: "No se pudo cargar el perfil de usuario. Por favor, recarga la página.",
          variant: "destructive",
        });
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
        toast({
          title: "Error de permisos",
          description: "No se pudieron cargar los permisos de usuario. Contacta al administrador.",
          variant: "destructive",
        });
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
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al cargar la aplicación. Por favor, recarga la página.",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      fetchingProfile.current = false;
    }
  };

  useEffect(() => {
    // Initialize auth state only once
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          toast({
            title: "Error de autenticación",
            description: "No se pudo verificar la sesión. Por favor, recarga la página.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con el sistema. Verifica tu conexión a internet.",
          variant: "destructive",
        });
        setLoading(false);
        setInitialized(true);
      }
    };

    if (!initialized) {
      initializeAuth();
    }
  }, [initialized]);

  useEffect(() => {
    // Set up auth state change listener only after initialization
    if (!initialized) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        // Only handle sign-in events to avoid duplicate profile fetches
        if (event === 'SIGNED_IN' && session?.user) {
          setSession(session);
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialized]);

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