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
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_bans: {
        Row: {
          banned_by: string
          banned_until: string
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_until: string
          created_at?: string
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_until?: string
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      custom_role_permissions: {
        Row: {
          id: string
          permission_key: string
          permission_type: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_key: string
          permission_type: string
          role_id: string
        }
        Update: {
          id?: string
          permission_key?: string
          permission_type?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string
          id: string
          is_guest_role: boolean
          name: string
          stats_scope: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_guest_role?: boolean
          name: string
          stats_scope?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_guest_role?: boolean
          name?: string
          stats_scope?: string
        }
        Relationships: []
      }
      discord_webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          event_types: string[]
          id: string
          label: string | null
          league_id: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_types?: string[]
          id?: string
          label?: string | null
          league_id?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_types?: string[]
          id?: string
          label?: string | null
          league_id?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_webhooks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      extension_settings: {
        Row: {
          auto_approve: boolean
          auto_approve_manual: boolean
          auto_approve_screenshot: boolean
          created_at: string
          id: string
          league_id: string | null
          require_180s: boolean
          require_autodarts_link: boolean
          require_avg: boolean
          require_checkout_stats: boolean
          require_darts_thrown: boolean
          require_high_checkout: boolean
          require_nine_darters: boolean
          require_ton_ranges: boolean
          updated_at: string
          webhook_enabled: boolean
        }
        Insert: {
          auto_approve?: boolean
          auto_approve_manual?: boolean
          auto_approve_screenshot?: boolean
          created_at?: string
          id?: string
          league_id?: string | null
          require_180s?: boolean
          require_autodarts_link?: boolean
          require_avg?: boolean
          require_checkout_stats?: boolean
          require_darts_thrown?: boolean
          require_high_checkout?: boolean
          require_nine_darters?: boolean
          require_ton_ranges?: boolean
          updated_at?: string
          webhook_enabled?: boolean
        }
        Update: {
          auto_approve?: boolean
          auto_approve_manual?: boolean
          auto_approve_screenshot?: boolean
          created_at?: string
          id?: string
          league_id?: string | null
          require_180s?: boolean
          require_autodarts_link?: boolean
          require_avg?: boolean
          require_checkout_stats?: boolean
          require_darts_thrown?: boolean
          require_high_checkout?: boolean
          require_nine_darters?: boolean
          require_ton_ranges?: boolean
          updated_at?: string
          webhook_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "extension_settings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channel_roles: {
        Row: {
          channel_id: string
          id: string
          role_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          role_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_channel_roles_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_channel_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channel_system_roles: {
        Row: {
          channel_id: string
          id: string
          system_role: string
        }
        Insert: {
          channel_id: string
          id?: string
          system_role: string
        }
        Update: {
          channel_id?: string
          id?: string
          system_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_channel_system_roles_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      group_channels: {
        Row: {
          channel_type: string
          created_at: string
          description: string
          id: string
          league_id: string | null
          name: string
          platform: string | null
        }
        Insert: {
          channel_type?: string
          created_at?: string
          description?: string
          id?: string
          league_id?: string | null
          name: string
          platform?: string | null
        }
        Update: {
          channel_type?: string
          created_at?: string
          description?: string
          id?: string
          league_id?: string | null
          name?: string
          platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_channels_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "group_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      league_rules: {
        Row: {
          content: string
          created_at: string
          id: string
          is_global: boolean
          league_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          league_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean
          league_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_rules_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          bonus_rules: Json | null
          created_at: string
          description: string
          format: string | null
          id: string
          is_active: boolean
          league_type: string
          lucky_loser: boolean
          max_legs: number | null
          meetings_per_pair: number
          name: string
          platform: string
          registration_deadline: string | null
          registration_open: boolean
          season: string
          third_place_match: boolean
        }
        Insert: {
          bonus_rules?: Json | null
          created_at?: string
          description?: string
          format?: string | null
          id?: string
          is_active?: boolean
          league_type?: string
          lucky_loser?: boolean
          max_legs?: number | null
          meetings_per_pair?: number
          name: string
          platform?: string
          registration_deadline?: string | null
          registration_open?: boolean
          season: string
          third_place_match?: boolean
        }
        Update: {
          bonus_rules?: Json | null
          created_at?: string
          description?: string
          format?: string | null
          id?: string
          is_active?: boolean
          league_type?: string
          lucky_loser?: boolean
          max_legs?: number | null
          meetings_per_pair?: number
          name?: string
          platform?: string
          registration_deadline?: string | null
          registration_open?: boolean
          season?: string
          third_place_match?: boolean
        }
        Relationships: []
      }
      live_matches: {
        Row: {
          autodarts_link: string
          autodarts_match_id: string
          id: string
          match_id: string | null
          player1_score: number | null
          player2_score: number | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          autodarts_link: string
          autodarts_match_id: string
          id?: string
          match_id?: string | null
          player1_score?: number | null
          player2_score?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          autodarts_link?: string
          autodarts_match_id?: string
          id?: string
          match_id?: string | null
          player1_score?: number | null
          player2_score?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          match_id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          match_id: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          match_id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_audit_log_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_proposals: {
        Row: {
          created_at: string
          id: string
          match_id: string
          proposed_date: string
          proposed_time: string | null
          proposer_player_id: string
          response_note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          proposed_date: string
          proposed_time?: string | null
          proposer_player_id: string
          response_note?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          proposed_date?: string
          proposed_time?: string | null
          proposer_player_id?: string
          response_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_proposals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_proposals_proposer_player_id_fkey"
            columns: ["proposer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_proposals_proposer_player_id_fkey"
            columns: ["proposer_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reactions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          autodarts_link: string | null
          avg_until_170_1: number | null
          avg_until_170_2: number | null
          avg1: number | null
          avg2: number | null
          bracket_position: number | null
          bracket_round: string | null
          checkout_attempts1: number
          checkout_attempts2: number
          checkout_hits1: number
          checkout_hits2: number
          confirmed_date: string | null
          created_at: string
          darts_thrown1: number | null
          darts_thrown2: number | null
          date: string
          first_9_avg1: number | null
          first_9_avg2: number | null
          group_name: string | null
          high_checkout1: number | null
          high_checkout2: number | null
          id: string
          is_walkover: boolean
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
          screenshot_urls: string[] | null
          source_platform: string | null
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
          avg_until_170_1?: number | null
          avg_until_170_2?: number | null
          avg1?: number | null
          avg2?: number | null
          bracket_position?: number | null
          bracket_round?: string | null
          checkout_attempts1?: number
          checkout_attempts2?: number
          checkout_hits1?: number
          checkout_hits2?: number
          confirmed_date?: string | null
          created_at?: string
          darts_thrown1?: number | null
          darts_thrown2?: number | null
          date: string
          first_9_avg1?: number | null
          first_9_avg2?: number | null
          group_name?: string | null
          high_checkout1?: number | null
          high_checkout2?: number | null
          id?: string
          is_walkover?: boolean
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
          screenshot_urls?: string[] | null
          source_platform?: string | null
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
          avg_until_170_1?: number | null
          avg_until_170_2?: number | null
          avg1?: number | null
          avg2?: number | null
          bracket_position?: number | null
          bracket_round?: string | null
          checkout_attempts1?: number
          checkout_attempts2?: number
          checkout_hits1?: number
          checkout_hits2?: number
          confirmed_date?: string | null
          created_at?: string
          darts_thrown1?: number | null
          darts_thrown2?: number | null
          date?: string
          first_9_avg1?: number | null
          first_9_avg2?: number | null
          group_name?: string | null
          high_checkout1?: number | null
          high_checkout2?: number | null
          id?: string
          is_walkover?: boolean
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
          screenshot_urls?: string[] | null
          source_platform?: string | null
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
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players_public"
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
      player_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          notified: boolean
          player_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          notified?: boolean
          player_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          notified?: boolean
          player_id?: string
        }
        Relationships: []
      }
      player_leagues: {
        Row: {
          disqualified: boolean
          disqualified_at: string | null
          id: string
          league_id: string
          player_id: string
        }
        Insert: {
          disqualified?: boolean
          disqualified_at?: string | null
          id?: string
          league_id: string
          player_id: string
        }
        Update: {
          disqualified?: boolean
          disqualified_at?: string | null
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
          {
            foreignKeyName: "player_leagues_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          approved: boolean
          auto_submit_enabled: boolean
          autodarts_user_id: string | null
          avatar: string
          avatar_url: string | null
          created_at: string
          dartcounter_id: string | null
          dartsmind_id: string | null
          discord: string | null
          id: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          auto_submit_enabled?: boolean
          autodarts_user_id?: string | null
          avatar?: string
          avatar_url?: string | null
          created_at?: string
          dartcounter_id?: string | null
          dartsmind_id?: string | null
          discord?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          auto_submit_enabled?: boolean
          autodarts_user_id?: string | null
          avatar?: string
          avatar_url?: string | null
          created_at?: string
          dartcounter_id?: string | null
          dartsmind_id?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_custom_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_challenge_entries: {
        Row: {
          challenge_id: string
          id: string
          match_count: number
          player_id: string
          score: number
          updated_at: string
        }
        Insert: {
          challenge_id: string
          id?: string
          match_count?: number
          player_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          id?: string
          match_count?: number
          player_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_challenge_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_challenge_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenge_rewards: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          player_id: string
          rank: number
          reward_type: string
          reward_value: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          player_id: string
          rank: number
          reward_type?: string
          reward_value?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          player_id?: string
          rank?: number
          reward_type?: string
          reward_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenge_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_challenge_rewards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_challenge_rewards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          title: string
          week_end: string
          week_start: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          week_end: string
          week_start: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      players_public: {
        Row: {
          approved: boolean | null
          avatar: string | null
          avatar_url: string | null
          created_at: string | null
          id: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean | null
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean | null
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_opponent_contact: {
        Args: { opponent_player_id: string }
        Returns: {
          discord: string
          phone: string
        }[]
      }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
