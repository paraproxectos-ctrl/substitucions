export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      arquivos_audit_log: {
        Row: {
          action: string
          by_uid: string
          file_id: string | null
          id: string
          owner_uid: string
          timestamp: string
        }
        Insert: {
          action: string
          by_uid: string
          file_id?: string | null
          id?: string
          owner_uid: string
          timestamp?: string
        }
        Update: {
          action?: string
          by_uid?: string
          file_id?: string | null
          id?: string
          owner_uid?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_audit_log_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "arquivos_calendario"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos_calendario: {
        Row: {
          class_id: string | null
          class_name: string
          created_at: string
          date: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          notes: string | null
          original_filename: string
          owner_name: string
          owner_uid: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          class_name: string
          created_at?: string
          date: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          notes?: string | null
          original_filename: string
          owner_name: string
          owner_uid: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          class_name?: string
          created_at?: string
          date?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          notes?: string | null
          original_filename?: string
          owner_name?: string
          owner_uid?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_calendario_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "grupos_educativos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversacion_participantes: {
        Row: {
          conversacion_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversacion_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversacion_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversacion_participantes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversacions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversacions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_grupo: boolean
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_grupo?: boolean
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_grupo?: boolean
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grupos_educativos: {
        Row: {
          created_at: string
          id: string
          nivel: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nivel: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nivel?: string
          nome?: string
        }
        Relationships: []
      }
      mensaxes: {
        Row: {
          asunto: string
          contido: string
          conversacion_id: string | null
          created_at: string
          destinatario_id: string | null
          id: string
          is_grupo: boolean
          leido: boolean
          remitente_id: string
        }
        Insert: {
          asunto: string
          contido: string
          conversacion_id?: string | null
          created_at?: string
          destinatario_id?: string | null
          id?: string
          is_grupo?: boolean
          leido?: boolean
          remitente_id: string
        }
        Update: {
          asunto?: string
          contido?: string
          conversacion_id?: string | null
          created_at?: string
          destinatario_id?: string | null
          id?: string
          is_grupo?: boolean
          leido?: boolean
          remitente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensaxes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversacions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apelidos: string
          created_at: string
          email: string
          horas_libres_semanais: number
          id: string
          is_active: boolean
          nome: string
          sustitucions_realizadas_semana: number
          telefono: string | null
          ultima_semana_reset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apelidos: string
          created_at?: string
          email: string
          horas_libres_semanais?: number
          id?: string
          is_active?: boolean
          nome: string
          sustitucions_realizadas_semana?: number
          telefono?: string | null
          ultima_semana_reset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apelidos?: string
          created_at?: string
          email?: string
          horas_libres_semanais?: number
          id?: string
          is_active?: boolean
          nome?: string
          sustitucions_realizadas_semana?: number
          telefono?: string | null
          ultima_semana_reset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      substitucions: {
        Row: {
          confirmada_professor: boolean | null
          created_at: string
          created_by: string
          data: string
          grupo_id: string | null
          guardia_transporte:
            | Database["public"]["Enums"]["guardia_transporte_tipo"]
            | null
          hora_fin: string
          hora_inicio: string
          id: string
          motivo: Database["public"]["Enums"]["motivo_sustitucion"]
          motivo_outro: string | null
          observacions: string | null
          profesor_asignado_id: string
          profesor_ausente_id: string | null
          sesion: Database["public"]["Enums"]["sesion_tipo"] | null
          updated_at: string
          vista: boolean
        }
        Insert: {
          confirmada_professor?: boolean | null
          created_at?: string
          created_by: string
          data: string
          grupo_id?: string | null
          guardia_transporte?:
            | Database["public"]["Enums"]["guardia_transporte_tipo"]
            | null
          hora_fin: string
          hora_inicio: string
          id?: string
          motivo: Database["public"]["Enums"]["motivo_sustitucion"]
          motivo_outro?: string | null
          observacions?: string | null
          profesor_asignado_id: string
          profesor_ausente_id?: string | null
          sesion?: Database["public"]["Enums"]["sesion_tipo"] | null
          updated_at?: string
          vista?: boolean
        }
        Update: {
          confirmada_professor?: boolean | null
          created_at?: string
          created_by?: string
          data?: string
          grupo_id?: string | null
          guardia_transporte?:
            | Database["public"]["Enums"]["guardia_transporte_tipo"]
            | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          motivo?: Database["public"]["Enums"]["motivo_sustitucion"]
          motivo_outro?: string | null
          observacions?: string | null
          profesor_asignado_id?: string
          profesor_ausente_id?: string | null
          sesion?: Database["public"]["Enums"]["sesion_tipo"] | null
          updated_at?: string
          vista?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_substitucions_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_substitucions_profesor_asignado"
            columns: ["profesor_asignado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_substitucions_profesor_ausente"
            columns: ["profesor_ausente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "substitucions_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_educativos"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_updates_cursor: {
        Row: {
          id: number
          last_update_id: number
        }
        Insert: {
          id: number
          last_update_id?: number
        }
        Update: {
          id?: number
          last_update_id?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_telegram: {
        Row: {
          chat_id: string
          linked_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          chat_id: string
          linked_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          chat_id?: string
          linked_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_teacher_user: {
        Args: {
          user_apelidos: string
          user_email: string
          user_nome: string
          user_password: string
        }
        Returns: Json
      }
      delete_expired_arquivos: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_admin_sql: {
        Args: { sql_query: string }
        Returns: undefined
      }
      get_current_iso_week: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_proportional_teacher: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_recommended_teacher: {
        Args: Record<PropertyKey, never>
        Returns: {
          apelidos: string
          horas_libres_semanais: number
          nome: string
          sustitucions_realizadas_semana: number
          user_id: string
        }[]
      }
      get_substitution_confirmations: {
        Args: { target_date?: string }
        Returns: {
          confirmada: boolean
          grupo_nome: string
          hora_fin: string
          hora_inicio: string
          professor_id: string
          professor_name: string
          substitution_id: string
          vista: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_teacher_substitution: {
        Args: { teacher_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_active: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reset_weekly_counters: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_push_to_user: {
        Args: {
          p_msg: string
          p_title: string
          p_url?: string
          p_user_id: string
        }
        Returns: undefined
      }
      telegram_send_to_user: {
        Args: { p_text: string; p_user_id: string }
        Returns: undefined
      }
      telegram_sync_updates: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "profesor"
      guardia_transporte_tipo: "entrada" | "saida" | "ningun"
      motivo_sustitucion:
        | "ausencia_imprevista"
        | "enfermidade"
        | "asuntos_propios"
        | "outro"
      sesion_tipo:
        | "primeira"
        | "segunda"
        | "terceira"
        | "cuarta"
        | "quinta"
        | "recreo"
        | "hora_lectura"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "profesor"],
      guardia_transporte_tipo: ["entrada", "saida", "ningun"],
      motivo_sustitucion: [
        "ausencia_imprevista",
        "enfermidade",
        "asuntos_propios",
        "outro",
      ],
      sesion_tipo: [
        "primeira",
        "segunda",
        "terceira",
        "cuarta",
        "quinta",
        "recreo",
        "hora_lectura",
      ],
    },
  },
} as const
