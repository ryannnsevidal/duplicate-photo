export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      blocked_email_domains: {
        Row: {
          added_by: string | null
          block_type: string
          created_at: string
          domain: string
          id: string
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          block_type?: string
          created_at?: string
          domain: string
          id?: string
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          block_type?: string
          created_at?: string
          domain?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      captcha_attempts: {
        Row: {
          action_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action_type: string
          id?: string
          ip_address: unknown
          occurred_at?: string
          success: boolean
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      captcha_verifications: {
        Row: {
          action_type: string
          captcha_token: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          user_id: string | null
          verified_at: string
        }
        Insert: {
          action_type: string
          captcha_token: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address: unknown
          user_id?: string | null
          verified_at?: string
        }
        Update: {
          action_type?: string
          captcha_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
          verified_at?: string
        }
        Relationships: []
      }
      cloud_sync_configs: {
        Row: {
          config_data: Json
          created_at: string
          id: string
          is_active: boolean
          provider: Database["public"]["Enums"]["cloud_provider"]
          remote_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config_data?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider: Database["public"]["Enums"]["cloud_provider"]
          remote_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config_data?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["cloud_provider"]
          remote_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dedup_events: {
        Row: {
          confidence: number | null
          created_at: string | null
          duplicate_type: string | null
          file_hash: string
          file_type: string | null
          id: string
          is_duplicate: boolean
          metadata: Json | null
          original_filename: string | null
          processing_time_ms: number | null
          similar_files: Json | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          duplicate_type?: string | null
          file_hash: string
          file_type?: string | null
          id?: string
          is_duplicate?: boolean
          metadata?: Json | null
          original_filename?: string | null
          processing_time_ms?: number | null
          similar_files?: Json | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          duplicate_type?: string | null
          file_hash?: string
          file_type?: string | null
          id?: string
          is_duplicate?: boolean
          metadata?: Json | null
          original_filename?: string | null
          processing_time_ms?: number | null
          similar_files?: Json | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      duplicate_checks: {
        Row: {
          created_at: string
          duplicates: Json | null
          file_path: string
          id: string
          original_filename: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicates?: Json | null
          file_path: string
          id?: string
          original_filename: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duplicates?: Json | null
          file_path?: string
          id?: string
          original_filename?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      file_upload_logs: {
        Row: {
          cloud_path: string
          cloud_provider: Database["public"]["Enums"]["cloud_provider"]
          content_hash: string | null
          created_at: string
          duplicate_of: string | null
          file_size_bytes: number
          file_type: Database["public"]["Enums"]["file_kind"] | null
          id: string
          metadata: Json | null
          original_filename: string
          perceptual_hash: string | null
          rclone_remote: string
          sha256_hash: string
          similarity_score: number | null
          updated_at: string
          upload_status: string
          upload_timestamp: string
          user_id: string
        }
        Insert: {
          cloud_path: string
          cloud_provider: Database["public"]["Enums"]["cloud_provider"]
          content_hash?: string | null
          created_at?: string
          duplicate_of?: string | null
          file_size_bytes: number
          file_type?: Database["public"]["Enums"]["file_kind"] | null
          id?: string
          metadata?: Json | null
          original_filename: string
          perceptual_hash?: string | null
          rclone_remote: string
          sha256_hash: string
          similarity_score?: number | null
          updated_at?: string
          upload_status?: string
          upload_timestamp?: string
          user_id: string
        }
        Update: {
          cloud_path?: string
          cloud_provider?: Database["public"]["Enums"]["cloud_provider"]
          content_hash?: string | null
          created_at?: string
          duplicate_of?: string | null
          file_size_bytes?: number
          file_type?: Database["public"]["Enums"]["file_kind"] | null
          id?: string
          metadata?: Json | null
          original_filename?: string
          perceptual_hash?: string | null
          rclone_remote?: string
          sha256_hash?: string
          similarity_score?: number | null
          updated_at?: string
          upload_status?: string
          upload_timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_upload_logs_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "file_upload_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_reputation: {
        Row: {
          abuse_count: number
          block_reason: string | null
          blocked_until: string | null
          country_code: string | null
          created_at: string
          first_seen: string
          id: string
          ip_address: unknown
          last_activity: string
          reputation_score: number
          updated_at: string
          user_agent_patterns: string[] | null
        }
        Insert: {
          abuse_count?: number
          block_reason?: string | null
          blocked_until?: string | null
          country_code?: string | null
          created_at?: string
          first_seen?: string
          id?: string
          ip_address: unknown
          last_activity?: string
          reputation_score?: number
          updated_at?: string
          user_agent_patterns?: string[] | null
        }
        Update: {
          abuse_count?: number
          block_reason?: string | null
          blocked_until?: string | null
          country_code?: string | null
          created_at?: string
          first_seen?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          reputation_score?: number
          updated_at?: string
          user_agent_patterns?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempts: number
          blocked_until: string | null
          captcha_required: boolean | null
          created_at: string
          id: string
          ip_address: unknown | null
          severity_level: number | null
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          action: string
          attempts?: number
          blocked_until?: string | null
          captcha_required?: boolean | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          severity_level?: number | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action?: string
          attempts?: number
          blocked_until?: string | null
          captcha_required?: boolean | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          severity_level?: number | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          mfa_verified: boolean
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          mfa_verified?: boolean
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          mfa_verified?: boolean
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_terminate_session: {
        Args: { session_id_param: string }
        Returns: Json
      }
      assign_admin_role: {
        Args: { user_email: string }
        Returns: undefined
      }
      check_duplicates_rpc: {
        Args: { file_name: string }
        Returns: Json
      }
      check_enhanced_rate_limit: {
        Args: {
          _action: string
          _ip_address?: unknown
          _max_attempts?: number
          _window_minutes?: number
          _severity_level?: number
        }
        Returns: Json
      }
      check_ip_reputation: {
        Args: { _ip_address: unknown }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_security_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_or_update_session: {
        Args: {
          _user_id: string
          _session_token: string
          _ip_address?: unknown
          _user_agent?: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_email_domain_allowed: {
        Args: { _email: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _action: string
          _resource?: string
          _success?: boolean
          _error_message?: string
          _metadata?: Json
        }
        Returns: undefined
      }
      require_authentication: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sanitize_input: {
        Args: { _input: string; _max_length?: number }
        Returns: string
      }
      secure_assign_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      update_ip_reputation: {
        Args: {
          _ip_address: unknown
          _score_delta: number
          _block_reason?: string
        }
        Returns: undefined
      }
      validate_file_upload: {
        Args: {
          _filename: string
          _file_size: number
          _content_type: string
          _user_id?: string
        }
        Returns: Json
      }
      validate_session_security: {
        Args: {
          session_token: string
          user_agent?: string
          ip_address?: unknown
        }
        Returns: boolean
      }
      verify_captcha: {
        Args: {
          _captcha_token: string
          _action_type: string
          _ip_address?: unknown
        }
        Returns: boolean
      }
      warn_auth_users_access: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "auditor"
      cloud_provider: "s3" | "gdrive" | "dropbox" | "onedrive" | "other"
      file_kind: "image" | "pdf" | "doc" | "other"
      file_type: "image" | "pdf" | "document"
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
      app_role: ["admin", "user", "auditor"],
      cloud_provider: ["s3", "gdrive", "dropbox", "onedrive", "other"],
      file_kind: ["image", "pdf", "doc", "other"],
      file_type: ["image", "pdf", "document"],
    },
  },
} as const
