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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      leagues: {
        Row: {
          bonus_rules: Json | null
          created_at: string
          description: string
          format: string | null
          id: string
          is_active: boolean
          league_type: string
          max_legs: number | null
          meetings_per_pair: number
          name: string
          registration_open: boolean
          season: string
        }
        Insert: {
          bonus_rules?: Json | null
          created_at?: string
          description?: string
          format?: string | null
          id?: string
          is_active?: boolean
          league_type?: string
          max_legs?: number | null
          meetings_per_pair?: number
          name: string
          registration_open?: boolean
          season: string
        }
        Update: {
          bonus_rules?: Json | null
          created_at?: string
          description?: string
          format?: string | null
          id?: string
          is_active?: boolean
          league_type?: string
          max_legs?: number | null
          meetings_per_pair?: number
          name?: string
          registration_open?: boolean
          season?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          autodarts_link: string | null
          avg1: number | null
          avg2: number | null
          bracket_position: number | null
          bracket_round: string | null
          checkout_attempts1: number
          checkout_attempts2: number
          checkout_hits1: number
          checkout_hits2: number
          created_at: string
          darts_thrown1: number | null
          darts_thrown2: number | null
          date: string
          group_name: string | null
          high_checkout1: number | null
          high_checkout2: number | null
          id: string
          league_id: string
          legs_won1: number | null
          legs_won2: number | null
          nine_darters1: number | null
          nine_darters2: number | null
          one_eighties1: number | null
          one_eighties2: number | null
          player1_id: string
          player2_id: string
          round: number | null
          score1: number | null
          score2: number | null
          status: string
          ton_plus1: number | null
          ton_plus2: number | null
          ton40_1: number | null
          ton40_2: number | null
          ton60_1: number | null
          ton60_2: number | null
          ton80_1: number | null
          ton80_2: number | null
        }
        Insert: {
          autodarts_link?: string | null
          avg1?: number | null
          avg2?: number | null
          bracket_position?: number | null
          bracket_round?: string | null
          checkout_attempts1?: number
          checkout_attempts2?: number
          checkout_hits1?: number
          checkout_hits2?: number
          created_at?: string
          darts_thrown1?: number | null
          darts_thrown2?: number | null
          date: string
          group_name?: string | null
          high_checkout1?: number | null
          high_checkout2?: number | null
          id?: string
          league_id: string
          legs_won1?: number | null
          legs_won2?: number | null
          nine_darters1?: number | null
          nine_darters2?: number | null
          one_eighties1?: number | null
          one_eighties2?: number | null
          player1_id: string
          player2_id: string
          round?: number | null
          score1?: number | null
          score2?: number | null
          status?: string
          ton_plus1?: number | null
          ton_plus2?: number | null
          ton40_1?: number | null
          ton40_2?: number | null
          ton60_1?: number | null
          ton60_2?: number | null
          ton80_1?: number | null
          ton80_2?: number | null
        }
        Update: {
          autodarts_link?: string | null
          avg1?: number | null
          avg2?: number | null
          bracket_position?: number | null
          bracket_round?: string | null
          checkout_attempts1?: number
          checkout_attempts2?: number
          checkout_hits1?: number
          checkout_hits2?: number
          created_at?: string
          darts_thrown1?: number | null
          darts_thrown2?: number | null
          date?: string
          group_name?: string | null
          high_checkout1?: number | null
          high_checkout2?: number | null
          id?: string
          league_id?: string
          legs_won1?: number | null
          legs_won2?: number | null
          nine_darters1?: number | null
          nine_darters2?: number | null
          one_eighties1?: number | null
          one_eighties2?: number | null
          player1_id?: string
          player2_id?: string
          round?: number | null
          score1?: number | null
          score2?: number | null
          status?: string
          ton_plus1?: number | null
          ton_plus2?: number | null
          ton40_1?: number | null
          ton40_2?: number | null
          ton60_1?: number | null
          ton60_2?: number | null
          ton80_1?: number | null
          ton80_2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_leagues: {
        Row: {
          id: string
          league_id: string
          player_id: string
        }
        Insert: {
          id?: string
          league_id: string
          player_id: string
        }
        Update: {
          id?: string
          league_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_leagues_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_leagues_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          approved: boolean
          avatar: string
          avatar_url: string | null
          created_at: string
          discord: string | null
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          avatar?: string
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          avatar?: string
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          avatar?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_player_public_info: {
        Args: { p_id: string }
        Returns: {
          approved: boolean
          avatar: string
          avatar_url: string
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
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
      app_role: ["admin", "user", "moderator"],
    },
  },
} as const
