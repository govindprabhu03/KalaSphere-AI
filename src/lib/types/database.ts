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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
