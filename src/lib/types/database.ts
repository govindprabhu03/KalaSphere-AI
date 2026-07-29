/**
 * Database types for the tenancy / RBAC foundation (Phase 0).
 *
 * Hand-written to match supabase/migrations/0001_init_tenancy.sql. Once a live
 * Supabase project exists, these can be regenerated with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts
 * and extended as new modules add tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          primary_color: string;
          locale: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          primary_color?: string;
          locale?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          primary_color?: string;
          locale?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          key: string;
          name: string;
          description: string | null;
          is_org_role: boolean;
        };
        Insert: {
          key: string;
          name: string;
          description?: string | null;
          is_org_role?: boolean;
        };
        Update: {
          key?: string;
          name?: string;
          description?: string | null;
          is_org_role?: boolean;
        };
        Relationships: [];
      };
      permissions: {
        Row: { key: string; description: string | null };
        Insert: { key: string; description?: string | null };
        Update: { key?: string; description?: string | null };
        Relationships: [];
      };
      role_permissions: {
        Row: { role_key: string; permission_key: string };
        Insert: { role_key: string; permission_key: string };
        Update: { role_key?: string; permission_key?: string };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      parent_child_links: {
        Row: {
          id: string;
          organization_id: string;
          parent_user_id: string;
          child_user_id: string;
          relationship: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_user_id: string;
          child_user_id: string;
          relationship?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          parent_user_id?: string;
          child_user_id?: string;
          relationship?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          organization_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          organization_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          organization_id?: string | null;
          actor_user_id?: string | null;
          action?: string;
          entity?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          title: string;
          description: string | null;
          category: string | null;
          location_text: string | null;
          starts_at: string;
          ends_at: string | null;
          capacity: number | null;
          price_cents: number;
          currency: string;
          cover_image_url: string | null;
          is_published: boolean;
          registration_closes_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          title: string;
          description?: string | null;
          category?: string | null;
          location_text?: string | null;
          starts_at: string;
          ends_at?: string | null;
          capacity?: number | null;
          price_cents?: number;
          currency?: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          registration_closes_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          location_text?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          capacity?: number | null;
          price_cents?: number;
          currency?: string;
          cover_image_url?: string | null;
          is_published?: boolean;
          registration_closes_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          organization_id: string;
          user_id: string;
          status: string;
          payment_status: string;
          amount_cents: number;
          ticket_code: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          organization_id: string;
          user_id: string;
          status?: string;
          payment_status?: string;
          amount_cents?: number;
          ticket_code?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          payment_status?: string;
          ticket_code?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
        };
        Relationships: [];
      };
      event_feedback: {
        Row: {
          id: string;
          event_id: string;
          organization_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          organization_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: { rating?: number; comment?: string | null };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string | null;
          user_id: string;
          serial: string;
          title: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id?: string | null;
          user_id: string;
          serial: string;
          title: string;
          issued_at?: string;
        };
        Update: { title?: string };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          registration_id: string | null;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          registration_id?: string | null;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          amount_cents: number;
          currency?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      workshops: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          title: string;
          description: string | null;
          category: string | null;
          starts_at: string | null;
          ends_at: string | null;
          capacity: number | null;
          price_cents: number;
          currency: string;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          title: string;
          description?: string | null;
          category?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          capacity?: number | null;
          price_cents?: number;
          currency?: string;
          is_published?: boolean;
          created_by?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          capacity?: number | null;
          price_cents?: number;
          is_published?: boolean;
        };
        Relationships: [];
      };
      workshop_enrollments: {
        Row: {
          id: string;
          workshop_id: string;
          organization_id: string;
          user_id: string;
          status: string;
          payment_status: string;
          amount_cents: number;
          created_at: string;
        };
        Insert: {
          workshop_id: string;
          organization_id: string;
          user_id: string;
          status?: string;
          payment_status?: string;
          amount_cents?: number;
        };
        Update: { status?: string; payment_status?: string };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          title: string;
          description: string | null;
          discipline: string | null;
          fee_cents: number;
          currency: string;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          title: string;
          description?: string | null;
          discipline?: string | null;
          fee_cents?: number;
          currency?: string;
          is_published?: boolean;
          created_by?: string | null;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string | null;
          discipline?: string | null;
          fee_cents?: number;
          is_published?: boolean;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          class_id: string;
          organization_id: string;
          name: string;
          faculty_user_id: string | null;
          schedule_text: string | null;
          capacity: number | null;
          created_at: string;
        };
        Insert: {
          class_id: string;
          organization_id: string;
          name: string;
          faculty_user_id?: string | null;
          schedule_text?: string | null;
          capacity?: number | null;
        };
        Update: {
          name?: string;
          faculty_user_id?: string | null;
          schedule_text?: string | null;
          capacity?: number | null;
        };
        Relationships: [];
      };
      class_enrollments: {
        Row: {
          id: string;
          batch_id: string;
          class_id: string;
          organization_id: string;
          student_user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          batch_id: string;
          class_id: string;
          organization_id: string;
          student_user_id: string;
          status?: string;
        };
        Update: { status?: string };
        Relationships: [];
      };
      class_sessions: {
        Row: {
          id: string;
          batch_id: string;
          organization_id: string;
          title: string | null;
          session_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          batch_id: string;
          organization_id: string;
          title?: string | null;
          session_date: string;
          created_by?: string | null;
        };
        Update: { title?: string | null; session_date?: string };
        Relationships: [];
      };
      class_attendance: {
        Row: {
          id: string;
          session_id: string;
          batch_id: string;
          organization_id: string;
          student_user_id: string;
          present: boolean;
          created_at: string;
        };
        Insert: {
          session_id: string;
          batch_id: string;
          organization_id: string;
          student_user_id: string;
          present?: boolean;
        };
        Update: { present?: boolean };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          batch_id: string;
          organization_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          batch_id: string;
          organization_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_org_member: {
        Args: { org: string };
        Returns: boolean;
      };
      user_org_role: {
        Args: { org: string };
        Returns: string;
      };
      has_org_role: {
        Args: { org: string; roles: string[] };
        Returns: boolean;
      };
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      add_member_by_email: {
        Args: { org: string; member_email: string; member_role: string };
        Returns: Database["public"]["Tables"]["organization_members"]["Row"];
      };
      list_org_members: {
        Args: { org: string };
        Returns: {
          member_id: string;
          user_id: string;
          role: string;
          status: string;
          full_name: string | null;
          email: string | null;
          created_at: string;
        }[];
      };
      register_for_event: {
        Args: { p_event_id: string };
        Returns: Database["public"]["Tables"]["event_registrations"]["Row"];
      };
      check_in_ticket: {
        Args: { p_code: string };
        Returns: {
          registration_id: string;
          attendee: string;
          event_title: string;
          already: boolean;
        }[];
      };
      list_event_registrations: {
        Args: { p_event_id: string };
        Returns: {
          registration_id: string;
          user_id: string;
          full_name: string | null;
          email: string | null;
          status: string;
          payment_status: string;
          ticket_code: string | null;
          checked_in_at: string | null;
          created_at: string;
        }[];
      };
      submit_event_feedback: {
        Args: { p_event_id: string; p_rating: number; p_comment: string };
        Returns: Database["public"]["Tables"]["event_feedback"]["Row"];
      };
      public_org_by_slug: {
        Args: { p_slug: string };
        Returns: {
          id: string;
          name: string;
          slug: string;
          primary_color: string;
          logo_url: string | null;
        }[];
      };
      enroll_in_workshop: {
        Args: { p_workshop_id: string };
        Returns: Database["public"]["Tables"]["workshop_enrollments"]["Row"];
      };
      enroll_in_class: {
        Args: { p_batch_id: string };
        Returns: Database["public"]["Tables"]["class_enrollments"]["Row"];
      };
      mark_class_attendance: {
        Args: { p_session_id: string; p_student: string; p_present: boolean };
        Returns: Database["public"]["Tables"]["class_attendance"]["Row"];
      };
      list_batch_students: {
        Args: { p_batch_id: string };
        Returns: {
          enrollment_id: string;
          student_user_id: string;
          full_name: string | null;
          email: string | null;
          status: string;
        }[];
      };
      list_workshop_enrollments: {
        Args: { p_workshop_id: string };
        Returns: {
          enrollment_id: string;
          user_id: string;
          full_name: string | null;
          email: string | null;
          payment_status: string;
        }[];
      };
      class_is_published: {
        Args: { cid: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
