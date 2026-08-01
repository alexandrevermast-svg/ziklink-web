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
      concert_interested: {
        Row: {
          concert_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          concert_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          concert_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concert_interested_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concert_interested_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concerts: {
        Row: {
          artist: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_at: string | null
          genre: string | null
          group_id: string | null
          id: string
          is_free: boolean | null
          location: string | null
          poster_url: string | null
          price: number | null
          start_time: string
          ticket_url: string | null
          title: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_at?: string | null
          genre?: string | null
          group_id?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_url?: string | null
          price?: number | null
          start_time: string
          ticket_url?: string | null
          title: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_at?: string | null
          genre?: string | null
          group_id?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_url?: string | null
          price?: number | null
          start_time?: string
          ticket_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "concerts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          has_left: boolean | null
          is_admin: boolean | null
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          has_left?: boolean | null
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          has_left?: boolean | null
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          instrument: string | null
          joined_at: string | null
          role: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          instrument?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          instrument?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          genre: string | null
          id: string
          is_open: boolean
          name: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          genre?: string | null
          id?: string
          is_open?: boolean
          name: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          genre?: string | null
          id?: string
          is_open?: boolean
          name?: string
        }
        Relationships: []
      }
      jam_interested: {
        Row: {
          created_at: string
          id: string
          jam_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jam_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jam_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_interested_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_interested_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          jam_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          jam_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          jam_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jam_messages_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_participants: {
        Row: {
          id: string
          is_organizer: boolean
          jam_id: string | null
          joined_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          id?: string
          is_organizer?: boolean
          jam_id?: string | null
          joined_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          is_organizer?: boolean
          jam_id?: string | null
          joined_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jam_participants_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_sessions: {
        Row: {
          created_at: string
          created_by: string
          current_slot_index: number | null
          description: string
          end_at: string | null
          group_id: string | null
          has_drums: boolean
          has_keyboard: boolean
          id: string
          is_open: boolean
          location: string | null
          poster_url: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_slot_index?: number | null
          description: string
          end_at?: string | null
          group_id?: string | null
          has_drums?: boolean
          has_keyboard?: boolean
          id?: string
          is_open?: boolean
          location?: string | null
          poster_url?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_slot_index?: number | null
          description?: string
          end_at?: string | null
          group_id?: string | null
          has_drums?: boolean
          has_keyboard?: boolean
          id?: string
          is_open?: boolean
          location?: string | null
          poster_url?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_slots: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          instrument: string | null
          jam_id: string | null
          label: string | null
          slot_index: number | null
          slot_order: number
          song: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          instrument?: string | null
          jam_id?: string | null
          label?: string | null
          slot_index?: number | null
          slot_order?: number
          song?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          instrument?: string | null
          jam_id?: string | null
          label?: string | null
          slot_index?: number | null
          slot_order?: number
          song?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jam_slots_jam_id_fkey"
            columns: ["jam_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jam_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      musician_ads: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          genres: string[]
          id: string
          instrument: string | null
          mode: string
          status: string
          title: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          genres?: string[]
          id?: string
          instrument?: string | null
          mode: string
          status?: string
          title: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          genres?: string[]
          id?: string
          instrument?: string | null
          mode?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          bio: string | null
          city: string | null
          display_name: string | null
          id: string
          instruments: string[] | null
          is_admin: boolean
          is_banned: boolean
          looking_for_group: boolean
          onboarding_completed: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          city?: string | null
          display_name?: string | null
          id: string
          instruments?: string[] | null
          is_admin?: boolean
          is_banned?: boolean
          looking_for_group?: boolean
          onboarding_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          city?: string | null
          display_name?: string | null
          id?: string
          instruments?: string[] | null
          is_admin?: boolean
          is_banned?: boolean
          looking_for_group?: boolean
          onboarding_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      profs: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          hourly_rate: number | null
          id: number
          instrument: string
          name: string
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: number
          instrument: string
          name: string
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: number
          instrument?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      repetitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "repetitions_created_by_fkey1"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          created_at: string | null
          id: number
          instrument: string | null
          location: string | null
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instrument?: string | null
          location?: string | null
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instrument?: string | null
          location?: string | null
          query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          instrument: string | null
          photo_url: string | null
          price_info: string | null
          title: string
          type: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          instrument?: string | null
          photo_url?: string | null
          price_info?: string | null
          title: string
          type: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          instrument?: string | null
          photo_url?: string | null
          price_info?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      create_concert:
        | {
            Args: {
              p_artist: string
              p_description: string
              p_end_at: string
              p_genre: string
              p_is_free: boolean
              p_location: string
              p_poster_url: string
              p_price: number
              p_start_time: string
              p_ticket_url: string
              p_title: string
            }
            Returns: string
          }
        | {
            Args: {
              p_artist: string
              p_description: string
              p_end_at: string
              p_genre: string
              p_group_id: string
              p_is_free: boolean
              p_location: string
              p_poster_url: string
              p_price: number
              p_start_time: string
              p_ticket_url: string
              p_title: string
            }
            Returns: {
              conversation_id: string
              id: string
              title: string
            }[]
          }
      create_concert_conversation: {
        Args: { p_entity_id: string; p_title: string }
        Returns: string
      }
      create_direct_group_conversation: {
        Args: { p_entity_id: string; p_member_ids: string[]; p_title: string }
        Returns: string
      }
      create_group: {
        Args: {
          p_avatar_url: string
          p_bio: string
          p_city: string
          p_genre: string
          p_name: string
        }
        Returns: string
      }
      create_jam_sessions: {
        Args: {
          p_description: string
          p_group_id: string
          p_has_drums?: boolean
          p_has_keyboard?: boolean
          p_is_open: boolean
          p_location: string
          p_occurrences: Json
          p_title: string
        }
        Returns: {
          conversation_id: string
          jam_id: string
          title: string
        }[]
      }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      delete_jam: { Args: { p_jam_id: string }; Returns: undefined }
      get_conversation_between: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: string
      }
      get_conversations_list: {
        Args: never
        Returns: {
          entity_id: string
          id: string
          last_activity_at: string
          last_message_content: string
          last_message_created_at: string
          last_message_username: string
          other_avatar_url: string
          other_user_id: string
          other_username: string
          title: string
          type: string
          unread_count: number
        }[]
      }
      get_my_conversation_ids: { Args: never; Returns: string[] }
      get_or_create_direct_conversation:
        | { Args: { p_other_user_id: string }; Returns: string }
        | {
            Args: { p_other_user_id: string; p_title: string }
            Returns: string
          }
      invite_to_group: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: string
      }
      join_concert_conversation: {
        Args: { p_concert_id: string; p_concert_title: string }
        Returns: string
      }
      request_join_group: { Args: { p_group_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
