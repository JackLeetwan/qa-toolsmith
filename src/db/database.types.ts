export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      ai_daily_usage: {
        Row: {
          day: string;
          used: number;
          user_id: string;
        };
        Insert: {
          day: string;
          used?: number;
          user_id: string;
        };
        Update: {
          day?: string;
          used?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_daily_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_invocations: {
        Row: {
          action: string;
          created_at: string;
          error_code: string | null;
          id: string;
          meta: Json | null;
          model: string | null;
          success: boolean;
          tokens_completion: number | null;
          tokens_prompt: number | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          meta?: Json | null;
          model?: string | null;
          success?: boolean;
          tokens_completion?: number | null;
          tokens_prompt?: number | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          meta?: Json | null;
          model?: string | null;
          success?: boolean;
          tokens_completion?: number | null;
          tokens_prompt?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_invocations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      charter_notes: {
        Row: {
          body: string;
          charter_id: string;
          id: string;
          noted_at: string;
          tag: string;
          user_id: string;
        };
        Insert: {
          body: string;
          charter_id: string;
          id?: string;
          noted_at?: string;
          tag: string;
          user_id: string;
        };
        Update: {
          body?: string;
          charter_id?: string;
          id?: string;
          noted_at?: string;
          tag?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "charter_notes_charter_id_fkey";
            columns: ["charter_id"];
            isOneToOne: false;
            referencedRelation: "charters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charter_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      charters: {
        Row: {
          created_at: string;
          ended_at: string | null;
          goal: string;
          hypotheses: string | null;
          id: string;
          started_at: string;
          status: string;
          summary_notes: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          goal: string;
          hypotheses?: string | null;
          id?: string;
          started_at?: string;
          status: string;
          summary_notes?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          goal?: string;
          hypotheses?: string | null;
          id?: string;
          started_at?: string;
          status?: string;
          summary_notes?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "charters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      drafts: {
        Row: {
          content: Json;
          created_at: string;
          expires_at: string | null;
          id: string;
          template_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          template_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          template_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drafts_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drafts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_entries: {
        Row: {
          created_at: string;
          id: string;
          search_vector: unknown;
          tags: string[];
          title: string;
          updated_at: string;
          url_canonical: string | null;
          url_original: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          search_vector: unknown;
          tags?: string[];
          title: string;
          updated_at?: string;
          url_canonical?: string | null;
          url_original: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          search_vector?: unknown;
          tags?: string[];
          title?: string;
          updated_at?: string;
          url_canonical?: string | null;
          url_original?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_notes: {
        Row: {
          body: string;
          created_at: string;
          entry_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          entry_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          entry_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_notes_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "kb_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kb_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          org_id: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          org_id?: string | null;
          role: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          org_id?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          attachments: string[];
          created_at: string;
          fields: Json;
          id: string;
          is_readonly: boolean;
          name: string;
          origin_template_id: string | null;
          owner_id: string | null;
          preset: string | null;
          required_fields: string[];
          scope: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          attachments?: string[];
          created_at?: string;
          fields: Json;
          id?: string;
          is_readonly?: boolean;
          name: string;
          origin_template_id?: string | null;
          owner_id?: string | null;
          preset?: string | null;
          required_fields?: string[];
          scope: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          attachments?: string[];
          created_at?: string;
          fields?: Json;
          id?: string;
          is_readonly?: boolean;
          name?: string;
          origin_template_id?: string | null;
          owner_id?: string | null;
          preset?: string | null;
          required_fields?: string[];
          scope?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "templates_origin_template_id_fkey";
            columns: ["origin_template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "templates_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_events: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          meta: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          meta?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          meta?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      admin_stats_activity: {
        Row: {
          recent_ai_invocations: number | null;
          recent_charters: number | null;
          recent_kb_entries: number | null;
        };
        Relationships: [];
      };
      admin_stats_templates: {
        Row: {
          global_templates: number | null;
          total_templates: number | null;
          user_templates: number | null;
        };
        Relationships: [];
      };
      admin_stats_users: {
        Row: {
          admin_users: number | null;
          regular_users: number | null;
          total_users: number | null;
        };
        Relationships: [];
      };
      templates_effective: {
        Row: {
          attachments: string[] | null;
          created_at: string | null;
          fields: Json | null;
          id: string | null;
          is_readonly: boolean | null;
          name: string | null;
          origin_template_id: string | null;
          owner_id: string | null;
          preset: string | null;
          required_fields: string[] | null;
          scope: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      can_invoke_ai: {
        Args: { uid: string };
        Returns: boolean;
      };
      canonicalize_url: {
        Args: { url_input: string };
        Returns: string;
      };
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown };
        Returns: string;
      };
      citext_hash: {
        Args: { "": string };
        Returns: number;
      };
      citextin: {
        Args: { "": unknown };
        Returns: string;
      };
      citextout: {
        Args: { "": string };
        Returns: unknown;
      };
      citextrecv: {
        Args: { "": unknown };
        Returns: string;
      };
      citextsend: {
        Args: { "": string };
        Returns: string;
      };
      gtrgm_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { "": unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      set_limit: {
        Args: { "": number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { "": string };
        Returns: string[];
      };
      unaccent: {
        Args: { "": string };
        Returns: string;
      };
      unaccent_init: {
        Args: { "": unknown };
        Returns: unknown;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
