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
        
        // If profile doesn't exist, create a basic one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, trying to create basic profile...');
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              nome: 'Usuario',
              apelidos: 'Sin Configurar',
              email: user?.email || '',
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('Error creating profile:', insertError);
            toast({
              title: "Error de perfil",
              description: "No se pudo crear el perfil de usuario. Contacta al administrador.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          
          console.log('Basic profile created:', insertData);
          setProfile(insertData);
        } else {
          toast({
            title: "Error de conexión",
            description: "No se pudo cargar el perfil de usuario. Por favor, recarga la página.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        console.log('Profile data found:', profileData);
        setProfile(profileData);
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching role:', roleError);
        
        // If no role found, assign default profesor role
        if (roleError.code === 'PGRST116' || (roleData && roleData.length === 0)) {
          console.log('No role found, assigning default profesor role...');
          const { error: insertRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'profesor',
            });
            
          if (insertRoleError) {
            console.error('Error creating role:', insertRoleError);
            // Continue without role - let admin assign it
            setUserRole({ role: 'profesor' });
          } else {
            setUserRole({ role: 'profesor' });
          }
        } else {
          toast({
            title: "Error de permisos",
            description: "No se pudieron cargar los permisos de usuario. Contacta al administrador.",
            variant: "destructive",
          });
          // Continue with null role
          setUserRole(null);
        }
      } else {
        // Si hay múltiples roles, tomar el primero (priorizando admin)
        const roles = roleData || [];
        console.log('User roles found:', roles);
        
        let selectedRole: UserRole | null = null;
        if (roles.length > 0) {
          // Priorizar admin si existe
          const adminRole = roles.find(r => r.role === 'admin');
          selectedRole = adminRole || roles[0];
        } else {
          // No roles found, assign default
          selectedRole = { role: 'profesor' };
        }
        
        console.log('Selected role:', selectedRole);
        setUserRole(selectedRole);
      }
      
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
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        await fetchUserProfile(session.user.id);
      } else if (!session) {
        setLoading(false);
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

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