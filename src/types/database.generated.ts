// AUTOGENEROVANÉ Supabase typy — needituj ručně.
// Regenerace: Supabase MCP generate_typescript_types → tento soubor.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          owner_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          owner_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          owner_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contracts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledged_ip: string | null
          client_id: string | null
          counterparty: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          document_id: string | null
          end_date: string | null
          event_id: string | null
          id: string
          note: string | null
          party_type: Database["public"]["Enums"]["bc_party_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["bc_status"]
          supplier_id: string | null
          tenant_id: string
          title: string
          type: string | null
          value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_ip?: string | null
          client_id?: string | null
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          document_id?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          note?: string | null
          party_type?: Database["public"]["Enums"]["bc_party_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["bc_status"]
          supplier_id?: string | null
          tenant_id: string
          title: string
          type?: string | null
          value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_ip?: string | null
          client_id?: string | null
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          document_id?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          note?: string | null
          party_type?: Database["public"]["Enums"]["bc_party_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["bc_status"]
          supplier_id?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contracts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assigned_custom_role_id: string | null
          assigned_role: Database["public"]["Enums"]["app_role"] | null
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          start_time: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_custom_role_id?: string | null
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          tenant_id: string
          title: string
        }
        Update: {
          assigned_custom_role_id?: string | null
          assigned_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_custom_role_id_fkey"
            columns: ["assigned_custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          active: boolean
          created_at: string | null
          currency: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["catalog_kind"]
          name: string
          tenant_id: string
          unit: string
          unit_price: number
          vat_rate: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["catalog_kind"]
          name: string
          tenant_id: string
          unit?: string
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["catalog_kind"]
          name?: string
          tenant_id?: string
          unit?: string
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          bank_account: string | null
          careers_intro: string | null
          city: string | null
          country: string
          default_vat_rate: number
          dic: string | null
          email: string | null
          iban: string | null
          ico: string | null
          jobs_enabled: boolean
          legal_name: string | null
          phone: string | null
          street: string | null
          tenant_id: string
          updated_at: string | null
          vat_payer: boolean
          zip: string | null
        }
        Insert: {
          bank_account?: string | null
          careers_intro?: string | null
          city?: string | null
          country?: string
          default_vat_rate?: number
          dic?: string | null
          email?: string | null
          iban?: string | null
          ico?: string | null
          jobs_enabled?: boolean
          legal_name?: string | null
          phone?: string | null
          street?: string | null
          tenant_id: string
          updated_at?: string | null
          vat_payer?: boolean
          zip?: string | null
        }
        Update: {
          bank_account?: string | null
          careers_intro?: string | null
          city?: string | null
          country?: string
          default_vat_rate?: number
          dic?: string | null
          email?: string | null
          iban?: string | null
          ico?: string | null
          jobs_enabled?: boolean
          legal_name?: string | null
          phone?: string | null
          street?: string | null
          tenant_id?: string
          updated_at?: string | null
          vat_payer?: boolean
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          client_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          done: boolean
          due_date: string | null
          due_reminded_at: string | null
          id: string
          subject: string
          tenant_id: string
          type: Database["public"]["Enums"]["crm_activity_type"]
          visible_to_client: boolean
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          done?: boolean
          due_date?: string | null
          due_reminded_at?: string | null
          id?: string
          subject: string
          tenant_id: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
          visible_to_client?: boolean
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          done?: boolean
          due_date?: string | null
          due_reminded_at?: string | null
          id?: string
          subject?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_clients: {
        Row: {
          address: string | null
          created_at: string | null
          dic: string | null
          email: string | null
          ico: string | null
          id: string
          name: string
          note: string | null
          owner_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["crm_client_status"]
          tenant_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name: string
          note?: string | null
          owner_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["crm_client_status"]
          tenant_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name?: string
          note?: string | null
          owner_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["crm_client_status"]
          tenant_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          position: string | null
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          position?: string | null
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          position?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          client_id: string | null
          created_at: string | null
          currency: string
          expected_close: string | null
          id: string
          note: string | null
          owner_id: string | null
          stage: Database["public"]["Enums"]["crm_deal_stage"]
          tenant_id: string
          title: string
          value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          currency?: string
          expected_close?: string | null
          id?: string
          note?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          tenant_id: string
          title: string
          value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          currency?: string
          expected_close?: string | null
          id?: string
          note?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          tenant_id?: string
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospect_touches: {
        Row: {
          channel: string
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          outcome: string
          prospect_id: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          outcome?: string
          prospect_id: string
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          outcome?: string
          prospect_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospect_touches_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "crm_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_prospect_touches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospects: {
        Row: {
          converted_client_id: string | null
          created_at: string | null
          dic: string | null
          digest_notified_at: string | null
          email: string | null
          ico: string | null
          id: string
          instagram: string | null
          name: string
          next_touch_at: string | null
          note: string | null
          owner: string | null
          phone: string | null
          region: string | null
          score: number
          signals: Json
          source: string
          status: string
          tenant_id: string
          touch_count: number
          updated_at: string | null
          website: string | null
        }
        Insert: {
          converted_client_id?: string | null
          created_at?: string | null
          dic?: string | null
          digest_notified_at?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          instagram?: string | null
          name: string
          next_touch_at?: string | null
          note?: string | null
          owner?: string | null
          phone?: string | null
          region?: string | null
          score?: number
          signals?: Json
          source?: string
          status?: string
          tenant_id: string
          touch_count?: number
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          converted_client_id?: string | null
          created_at?: string | null
          dic?: string | null
          digest_notified_at?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          instagram?: string | null
          name?: string
          next_touch_at?: string | null
          note?: string | null
          owner?: string | null
          phone?: string | null
          region?: string | null
          score?: number
          signals?: Json
          source?: string
          status?: string
          tenant_id?: string
          touch_count?: number
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_prospects_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_prospects_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_prospects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          modules: Json
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          modules?: Json
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          modules?: Json
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          client_comment: string | null
          client_id: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          description: string | null
          document_id: string | null
          event_id: string | null
          external_url: string | null
          id: string
          project_id: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          client_comment?: string | null
          client_id: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          document_id?: string | null
          event_id?: string | null
          external_url?: string | null
          id?: string
          project_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          client_comment?: string | null
          client_id?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description?: string | null
          document_id?: string | null
          event_id?: string | null
          external_url?: string | null
          id?: string
          project_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      department_messages: {
        Row: {
          body: string
          created_at: string | null
          department_id: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          department_id: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          department_id?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_messages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      department_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          department_id: string
          description: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          due_date: string | null
          id: string
          priority: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          tenant_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          client_id: string | null
          created_at: string | null
          description: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          source: string
          source_ref: string | null
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          source?: string
          source_ref?: string | null
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          source?: string
          source_ref?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lineup: {
        Row: {
          artist: string
          created_at: string | null
          event_id: string
          fee: number | null
          id: string
          note: string | null
          slot_end: string | null
          slot_start: string | null
          sort: number
          status: string
          tenant_id: string
        }
        Insert: {
          artist: string
          created_at?: string | null
          event_id: string
          fee?: number | null
          id?: string
          note?: string | null
          slot_end?: string | null
          slot_start?: string | null
          sort?: number
          status?: string
          tenant_id: string
        }
        Update: {
          artist?: string
          created_at?: string | null
          event_id?: string
          fee?: number | null
          id?: string
          note?: string | null
          slot_end?: string | null
          slot_start?: string | null
          sort?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_lineup_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lineup_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_timeline: {
        Row: {
          at_time: string | null
          created_at: string | null
          event_id: string
          id: string
          item: string
          sort: number
          tenant_id: string
        }
        Insert: {
          at_time?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          item: string
          sort?: number
          tenant_id: string
        }
        Update: {
          at_time?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          item?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          budget: number | null
          capacity: number | null
          client: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          doors_time: string | null
          end_time: string | null
          event_date: string | null
          id: string
          location: string | null
          name: string
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          tech_notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          capacity?: number | null
          client?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doors_time?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tech_notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          capacity?: number | null
          client?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doors_time?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tech_notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          currency: string
          description: string | null
          expense_date: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status"]
          tenant_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          expense_date: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tenant_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tenant_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list: {
        Row: {
          added_by: string | null
          arrived: boolean
          arrived_at: string | null
          created_at: string | null
          event_id: string
          id: string
          name: string
          note: string | null
          party_size: number
          tenant_id: string
          type: Database["public"]["Enums"]["guest_type"]
        }
        Insert: {
          added_by?: string | null
          arrived?: boolean
          arrived_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          note?: string | null
          party_size?: number
          tenant_id: string
          type?: Database["public"]["Enums"]["guest_type"]
        }
        Update: {
          added_by?: string | null
          arrived?: boolean
          arrived_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          note?: string | null
          party_size?: number
          tenant_id?: string
          type?: Database["public"]["Enums"]["guest_type"]
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          id: string
          note: string | null
          tenant_id: string
          user_id: string
          work_date: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          tenant_id: string
          user_id: string
          work_date: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          tenant_id?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          detail: string | null
          entity: string
          entity_id: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          detail?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          detail?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidates: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          cv_path: string | null
          email: string | null
          id: string
          job_id: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          stage: Database["public"]["Enums"]["hr_candidate_stage"]
          tenant_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          cv_path?: string | null
          email?: string | null
          id?: string
          job_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["hr_candidate_stage"]
          tenant_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          cv_path?: string | null
          email?: string | null
          id?: string
          job_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["hr_candidate_stage"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          id: string
          label: string
          sort: number
          tenant_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          id?: string
          label: string
          sort?: number
          tenant_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          id?: string
          label?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "hr_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklist_run_items: {
        Row: {
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          label: string
          run_id: string
          sort: number
          tenant_id: string
        }
        Insert: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label: string
          run_id: string
          sort?: number
          tenant_id: string
        }
        Update: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label?: string
          run_id?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklist_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "hr_checklist_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_checklist_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklist_runs: {
        Row: {
          checklist_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["hr_checklist_kind"]
          name: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_checklist_kind"]
          name: string
          tenant_id: string
          user_id: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_checklist_kind"]
          name?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklist_runs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "hr_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_checklist_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklists: {
        Row: {
          created_at: string | null
          id: string
          kind: Database["public"]["Enums"]["hr_checklist_kind"]
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_checklist_kind"]
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["hr_checklist_kind"]
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_contracts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          end_date: string | null
          expiry_reminded_at: string | null
          hourly_rate: number | null
          id: string
          salary: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["hr_contract_status"]
          storage_path: string | null
          tenant_id: string
          title: string | null
          type: Database["public"]["Enums"]["hr_contract_type"]
          updated_at: string | null
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          end_date?: string | null
          expiry_reminded_at?: string | null
          hourly_rate?: number | null
          id?: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["hr_contract_status"]
          storage_path?: string | null
          tenant_id: string
          title?: string | null
          type?: Database["public"]["Enums"]["hr_contract_type"]
          updated_at?: string | null
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          end_date?: string | null
          expiry_reminded_at?: string | null
          hourly_rate?: number | null
          id?: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["hr_contract_status"]
          storage_path?: string | null
          tenant_id?: string
          title?: string | null
          type?: Database["public"]["Enums"]["hr_contract_type"]
          updated_at?: string | null
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          category: Database["public"]["Enums"]["hr_doc_category"]
          created_at: string | null
          id: string
          name: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["hr_doc_category"]
          created_at?: string | null
          id?: string
          name: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["hr_doc_category"]
          created_at?: string | null
          id?: string
          name?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          address: string | null
          annual_leave_days: number
          created_at: string | null
          department_id: string | null
          employment_type: Database["public"]["Enums"]["hr_employment_type"]
          end_date: string | null
          hourly_rate: number | null
          id: string
          manager_id: string | null
          notes: string | null
          personal_email: string | null
          personal_no: string | null
          phone: string | null
          position: string | null
          salary: number | null
          salary_currency: string
          start_date: string | null
          status: Database["public"]["Enums"]["hr_employee_status"]
          tenant_id: string
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          address?: string | null
          annual_leave_days?: number
          created_at?: string | null
          department_id?: string | null
          employment_type?: Database["public"]["Enums"]["hr_employment_type"]
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          personal_email?: string | null
          personal_no?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          salary_currency?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["hr_employee_status"]
          tenant_id: string
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          address?: string | null
          annual_leave_days?: number
          created_at?: string | null
          department_id?: string | null
          employment_type?: Database["public"]["Enums"]["hr_employment_type"]
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          personal_email?: string | null
          personal_no?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          salary_currency?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["hr_employee_status"]
          tenant_id?: string
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_postings: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          published: boolean
          salary_range: string | null
          status: Database["public"]["Enums"]["hr_job_status"]
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          published?: boolean
          salary_range?: string | null
          status?: Database["public"]["Enums"]["hr_job_status"]
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          published?: boolean
          salary_range?: string | null
          status?: Database["public"]["Enums"]["hr_job_status"]
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_postings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_postings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["hr_leave_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["hr_leave_type"]
          user_id: string
          working_days: number
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["hr_leave_status"]
          tenant_id: string
          type?: Database["public"]["Enums"]["hr_leave_type"]
          user_id: string
          working_days?: number
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["hr_leave_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["hr_leave_type"]
          user_id?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_reviews: {
        Row: {
          created_at: string | null
          id: string
          improvements: string | null
          next_steps: string | null
          rating: number | null
          review_date: string
          reviewer_id: string | null
          strengths: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["hr_review_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          improvements?: string | null
          next_steps?: string | null
          rating?: number | null
          review_date?: string
          reviewer_id?: string | null
          strengths?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["hr_review_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          improvements?: string | null
          next_steps?: string | null
          rating?: number | null
          review_date?: string
          reviewer_id?: string | null
          strengths?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["hr_review_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_shift_assignments: {
        Row: {
          created_at: string | null
          decline_reason: string | null
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["hr_assignment_status"]
          tenant_id: string
          user_id: string
          worked_note: string | null
          worked_reported_at: string | null
          worked_status: string
          worked_verified_at: string | null
          worked_verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          decline_reason?: string | null
          id?: string
          shift_id: string
          status?: Database["public"]["Enums"]["hr_assignment_status"]
          tenant_id: string
          user_id: string
          worked_note?: string | null
          worked_reported_at?: string | null
          worked_status?: string
          worked_verified_at?: string | null
          worked_verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          decline_reason?: string | null
          id?: string
          shift_id?: string
          status?: Database["public"]["Enums"]["hr_assignment_status"]
          tenant_id?: string
          user_id?: string
          worked_note?: string | null
          worked_reported_at?: string | null
          worked_status?: string
          worked_verified_at?: string | null
          worked_verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "hr_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          location: string | null
          note: string | null
          project_id: string | null
          required_count: number
          role: string | null
          start_time: string | null
          tenant_id: string
          work_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          note?: string | null
          project_id?: string | null
          required_count?: number
          role?: string | null
          start_time?: string | null
          tenant_id: string
          work_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          note?: string | null
          project_id?: string | null
          required_count?: number
          role?: string | null
          start_time?: string | null
          tenant_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_shifts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_trainings: {
        Row: {
          completed_on: string | null
          created_at: string | null
          created_by: string | null
          expires_on: string | null
          id: string
          name: string
          note: string | null
          provider: string | null
          reminded_on: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          completed_on?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_on?: string | null
          id?: string
          name: string
          note?: string | null
          provider?: string | null
          reminded_on?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          completed_on?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_on?: string | null
          id?: string
          name?: string
          note?: string | null
          provider?: string | null
          reminded_on?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_trainings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          created_at: string | null
          created_by: string | null
          currency: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          overdue_notified_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          tenant_id: string
          type: Database["public"]["Enums"]["invoice_type"]
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          client_name: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          due_date: string
          id?: string
          invoice_number: string
          issue_date: string
          overdue_notified_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tenant_id: string
          type: Database["public"]["Enums"]["invoice_type"]
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          overdue_notified_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["invoice_type"]
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          imap_host: string
          imap_port: number
          owner_id: string | null
          secret_enc: string
          smtp_host: string
          smtp_port: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email: string
          id?: string
          imap_host?: string
          imap_port?: number
          owner_id?: string | null
          secret_enc: string
          smtp_host?: string
          smtp_port?: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          imap_host?: string
          imap_port?: number
          owner_id?: string | null
          secret_enc?: string
          smtp_host?: string
          smtp_port?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_poll_state: {
        Row: {
          account_id: string
          last_checked_at: string | null
          last_uid: number | null
        }
        Insert: {
          account_id: string
          last_checked_at?: string | null
          last_uid?: number | null
        }
        Update: {
          account_id?: string
          last_checked_at?: string | null
          last_uid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_poll_state_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          assignee: string | null
          created_at: string | null
          done: boolean
          id: string
          meeting_id: string
          sort: number
          tenant_id: string
          text: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          done?: boolean
          id?: string
          meeting_id: string
          sort?: number
          tenant_id: string
          text: string
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          done?: boolean
          id?: string
          meeting_id?: string
          sort?: number
          tenant_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          attendees: string | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          starts_at: string
          status: Database["public"]["Enums"]["meeting_status"]
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["meeting_status"]
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          archived: boolean
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          progress: number
          target_date: string | null
          tenant_id: string
          timeframe: string
          title: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          progress?: number
          target_date?: string | null
          tenant_id: string
          timeframe?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          progress?: number
          target_date?: string | null
          tenant_id?: string
          timeframe?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          calendar: boolean
          crm: boolean
          email: boolean
          events: boolean
          hr: boolean
          invoices: boolean
          meetings: boolean
          portal: boolean
          projects: boolean
          social: boolean
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar?: boolean
          crm?: boolean
          email?: boolean
          events?: boolean
          hr?: boolean
          invoices?: boolean
          meetings?: boolean
          portal?: boolean
          projects?: boolean
          social?: boolean
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar?: boolean
          crm?: boolean
          email?: boolean
          events?: boolean
          hr?: boolean
          invoices?: boolean
          meetings?: boolean
          portal?: boolean
          projects?: boolean
          social?: boolean
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          id: string
          label: string
          sort: number
          tenant_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          id?: string
          label: string
          sort?: number
          tenant_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          id?: string
          label?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "ops_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_checklist_run_items: {
        Row: {
          created_at: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          label: string
          run_id: string
          sort: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label: string
          run_id: string
          sort?: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label?: string
          run_id?: string
          sort?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_checklist_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ops_checklist_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_checklist_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_checklist_runs: {
        Row: {
          checklist_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          run_date: string
          tenant_id: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          run_date?: string
          tenant_id: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          run_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_checklist_runs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "ops_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_checklist_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_checklists: {
        Row: {
          category: Database["public"]["Enums"]["sop_category"]
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["sop_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["sop_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_config: {
        Row: {
          credit_child1: number
          credit_child2: number
          credit_child3: number
          credit_taxpayer: number
          dpc_threshold: number
          dpp_threshold: number
          id: string
          min_wage_hour: number
          sp_emp: number
          sp_er: number
          srazkova_rate: number
          tax_progress_monthly: number
          tax_rate1: number
          tax_rate2: number
          tenant_id: string
          updated_at: string | null
          year: number
          zp_emp: number
          zp_er: number
        }
        Insert: {
          credit_child1?: number
          credit_child2?: number
          credit_child3?: number
          credit_taxpayer?: number
          dpc_threshold?: number
          dpp_threshold?: number
          id?: string
          min_wage_hour?: number
          sp_emp?: number
          sp_er?: number
          srazkova_rate?: number
          tax_progress_monthly?: number
          tax_rate1?: number
          tax_rate2?: number
          tenant_id: string
          updated_at?: string | null
          year: number
          zp_emp?: number
          zp_er?: number
        }
        Update: {
          credit_child1?: number
          credit_child2?: number
          credit_child3?: number
          credit_taxpayer?: number
          dpc_threshold?: number
          dpp_threshold?: number
          id?: string
          min_wage_hour?: number
          sp_emp?: number
          sp_er?: number
          srazkova_rate?: number
          tax_progress_monthly?: number
          tax_rate1?: number
          tax_rate2?: number
          tenant_id?: string
          updated_at?: string | null
          year?: number
          zp_emp?: number
          zp_er?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          children: number
          contract_type: string
          created_at: string | null
          employer_cost: number
          gross: number
          id: string
          net: number
          note: string | null
          regime: string | null
          run_id: string
          sp_emp: number
          sp_er: number
          tax: number
          taxpayer_credit: boolean
          tenant_id: string
          user_id: string
          zp_emp: number
          zp_er: number
        }
        Insert: {
          children?: number
          contract_type?: string
          created_at?: string | null
          employer_cost?: number
          gross?: number
          id?: string
          net?: number
          note?: string | null
          regime?: string | null
          run_id: string
          sp_emp?: number
          sp_er?: number
          tax?: number
          taxpayer_credit?: boolean
          tenant_id: string
          user_id: string
          zp_emp?: number
          zp_er?: number
        }
        Update: {
          children?: number
          contract_type?: string
          created_at?: string | null
          employer_cost?: number
          gross?: number
          id?: string
          net?: number
          note?: string | null
          regime?: string | null
          run_id?: string
          sp_emp?: number
          sp_er?: number
          tax?: number
          taxpayer_credit?: boolean
          tenant_id?: string
          user_id?: string
          zp_emp?: number
          zp_er?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          month: number
          status: string
          tenant_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: number
          status?: string
          tenant_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          status?: string
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_events: {
        Row: {
          all_day: boolean
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          start_time: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_goals: {
        Row: {
          archived: boolean
          created_at: string | null
          description: string | null
          id: string
          progress: number
          target_date: string | null
          tenant_id: string
          timeframe: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number
          target_date?: string | null
          tenant_id: string
          timeframe?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          progress?: number
          target_date?: string | null
          tenant_id?: string
          timeframe?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          pinned: boolean
          tenant_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          id?: string
          pinned?: boolean
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          pinned?: boolean
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          done: boolean
          due_date: string | null
          id: string
          note: string | null
          priority: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          note?: string | null
          priority?: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          note?: string | null
          priority?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access: {
        Row: {
          client_id: string | null
          created_at: string | null
          display_name: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          display_name?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          display_name?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invites: {
        Row: {
          client_id: string | null
          created_at: string | null
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          tenant_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          status: string
          subject: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          status?: string
          subject?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          status?: string
          subject?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_visibility_overrides: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          item_type: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          item_type: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          item_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_visibility_overrides_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_visibility_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["project_priority"]
          project_id: string
          status: Database["public"]["Enums"]["project_task_status"]
          tenant_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["project_priority"]
          project_id: string
          status?: Database["public"]["Enums"]["project_task_status"]
          tenant_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["project_priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["project_task_status"]
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          note: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["project_priority"]
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          tenant_id: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          note?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          note?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["project_priority"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          line_total: number
          po_id: string
          position: number
          quantity: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          line_total?: number
          po_id: string
          position?: number
          quantity?: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          line_total?: number
          po_id?: string
          position?: number
          quantity?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string
          event_id: string | null
          expected_date: string | null
          id: string
          note: string | null
          number: string
          order_date: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          tenant_id: string
          total: number
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          event_id?: string | null
          expected_date?: string | null
          id?: string
          note?: string | null
          number: string
          order_date?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          tenant_id: string
          total?: number
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          event_id?: string | null
          expected_date?: string | null
          id?: string
          note?: string | null
          number?: string
          order_date?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          tenant_id?: string
          total?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string | null
          description: string
          id: string
          line_total: number
          position: number
          quantity: number
          quote_id: string
          tenant_id: string
          unit_price: number
          vat_rate: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          quote_id: string
          tenant_id: string
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          quote_id?: string
          tenant_id?: string
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          invoice_id: string | null
          issue_date: string
          note: string | null
          number: string
          sent_at: string | null
          stale_reminded_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tenant_id: string
          total: number
          valid_until: string | null
          vat_total: number
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          issue_date?: string
          note?: string | null
          number: string
          sent_at?: string | null
          stale_reminded_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tenant_id: string
          total?: number
          valid_until?: string | null
          vat_total?: number
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          invoice_id?: string | null
          issue_date?: string
          note?: string | null
          number?: string
          sent_at?: string | null
          stale_reminded_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tenant_id?: string
          total?: number
          valid_until?: string | null
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      Role: {
        Row: {
          createdAt: string | null
          description: string | null
          id: string
          name: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          description?: string | null
          id?: string
          name: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          description?: string | null
          id?: string
          name?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token_enc: string | null
          auto_sync: boolean
          connected_by: string | null
          created_at: string | null
          display_name: string | null
          followers: number
          following: number
          handle: string | null
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count: number
          profile_url: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_token_enc?: string | null
          auto_sync?: boolean
          connected_by?: string | null
          created_at?: string | null
          display_name?: string | null
          followers?: number
          following?: number
          handle?: string | null
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          posts_count?: number
          profile_url?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_token_enc?: string | null
          auto_sync?: boolean
          connected_by?: string | null
          created_at?: string | null
          display_name?: string | null
          followers?: number
          following?: number
          handle?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          posts_count?: number
          profile_url?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_metrics: {
        Row: {
          account_id: string
          captured_at: string | null
          followers: number
          following: number
          id: string
          posts_count: number
          tenant_id: string
        }
        Insert: {
          account_id: string
          captured_at?: string | null
          followers?: number
          following?: number
          id?: string
          posts_count?: number
          tenant_id: string
        }
        Update: {
          account_id?: string
          captured_at?: string | null
          followers?: number
          following?: number
          id?: string
          posts_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          error: string | null
          id: string
          media_doc_id: string | null
          media_name: string | null
          notified_at: string | null
          platforms: Database["public"]["Enums"]["social_platform"][]
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          media_doc_id?: string | null
          media_name?: string | null
          notified_at?: string | null
          platforms?: Database["public"]["Enums"]["social_platform"][]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          media_doc_id?: string | null
          media_name?: string | null
          notified_at?: string | null
          platforms?: Database["public"]["Enums"]["social_platform"][]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_media_doc_id_fkey"
            columns: ["media_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_articles: {
        Row: {
          body: string | null
          category: Database["public"]["Enums"]["sop_category"]
          created_at: string | null
          id: string
          tenant_id: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          category?: Database["public"]["Enums"]["sop_category"]
          created_at?: string | null
          id?: string
          tenant_id: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          category?: Database["public"]["Enums"]["sop_category"]
          created_at?: string | null
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: Database["public"]["Enums"]["supplier_category"]
          created_at: string | null
          created_by: string | null
          dic: string | null
          email: string | null
          ico: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["supplier_category"]
          created_at?: string | null
          created_by?: string | null
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["supplier_category"]
          created_at?: string | null
          created_by?: string | null
          dic?: string | null
          email?: string | null
          ico?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string | null
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billable: boolean
          created_at: string | null
          currency: string
          description: string | null
          hourly_rate: number | null
          id: string
          minutes: number
          project_id: string | null
          task_id: string | null
          tenant_id: string
          user_id: string
          work_date: string
        }
        Insert: {
          billable?: boolean
          created_at?: string | null
          currency?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          minutes: number
          project_id?: string | null
          task_id?: string | null
          tenant_id: string
          user_id: string
          work_date: string
        }
        Update: {
          billable?: boolean
          created_at?: string | null
          currency?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          minutes?: number
          project_id?: string | null
          task_id?: string | null
          tenant_id?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          date: string
          description: string | null
          id: string
          invoice_id: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          date: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          createdAt: string | null
          id: string
          name: string
          password: string
          roleId: string | null
          status: string | null
          updatedAt: string | null
          username: string
        }
        Insert: {
          createdAt?: string | null
          id?: string
          name: string
          password: string
          roleId?: string | null
          status?: string | null
          updatedAt?: string | null
          username: string
        }
        Update: {
          createdAt?: string | null
          id?: string
          name?: string
          password?: string
          roleId?: string | null
          status?: string | null
          updatedAt?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_reservations: {
        Row: {
          arrived_at: string | null
          box_label: string | null
          box_type: Database["public"]["Enums"]["vip_box"]
          contact: string | null
          created_at: string | null
          created_by: string | null
          deposit: number | null
          event_id: string
          guest_name: string | null
          id: string
          min_spend: number | null
          note: string | null
          party_size: number
          status: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
        }
        Insert: {
          arrived_at?: string | null
          box_label?: string | null
          box_type?: Database["public"]["Enums"]["vip_box"]
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          deposit?: number | null
          event_id: string
          guest_name?: string | null
          id?: string
          min_spend?: number | null
          note?: string | null
          party_size?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
        }
        Update: {
          arrived_at?: string | null
          box_label?: string | null
          box_type?: Database["public"]["Enums"]["vip_box"]
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          deposit?: number | null
          event_id?: string
          guest_name?: string | null
          id?: string
          min_spend?: number | null
          note?: string | null
          party_size?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee" | "external"
      bc_party_type: "artist" | "rental" | "supplier" | "client" | "other"
      bc_status: "draft" | "active" | "expired" | "terminated"
      catalog_kind: "product" | "service"
      crm_activity_type: "note" | "call" | "meeting" | "email" | "task"
      crm_client_status: "active" | "inactive" | "lead"
      crm_deal_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      event_status: "planning" | "confirmed" | "done" | "cancelled"
      expense_status: "pending" | "approved" | "rejected"
      guest_type: "guest" | "press" | "artist" | "staff" | "promoter"
      hr_assignment_status:
        | "assigned"
        | "confirmed"
        | "declined"
        | "decline_requested"
      hr_candidate_stage:
        | "applied"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
      hr_checklist_kind: "onboarding" | "offboarding"
      hr_contract_status: "draft" | "active" | "ended"
      hr_contract_type: "hpp" | "dpp" | "dpc" | "ico" | "other"
      hr_doc_category: "contract" | "payslip" | "id" | "other"
      hr_employee_status: "active" | "terminated"
      hr_employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "intern"
        | "dpp"
        | "dpc"
      hr_job_status: "open" | "closed"
      hr_leave_status: "pending" | "approved" | "rejected"
      hr_leave_type: "vacation" | "sick" | "personal" | "unpaid"
      hr_review_type: "review" | "one_on_one"
      invoice_status: "draft" | "pending" | "paid" | "overdue" | "cancelled"
      invoice_type: "issued" | "received"
      meeting_status: "scheduled" | "done" | "cancelled"
      po_status: "draft" | "sent" | "confirmed" | "delivered" | "cancelled"
      project_priority: "low" | "medium" | "high"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      project_task_status: "todo" | "in_progress" | "done"
      quote_status: "draft" | "sent" | "accepted" | "rejected"
      reservation_status:
        | "pending"
        | "confirmed"
        | "seated"
        | "cancelled"
        | "no_show"
      social_platform:
        | "instagram"
        | "facebook"
        | "tiktok"
        | "youtube"
        | "x"
        | "linkedin"
        | "threads"
        | "other"
      social_post_status: "draft" | "scheduled" | "published" | "failed"
      sop_category: "open" | "close" | "emergency" | "bar" | "other"
      supplier_category: "artist" | "security" | "rental" | "drinks" | "other"
      transaction_type: "income" | "expense"
      vip_box: "diamond" | "gold" | "silver" | "other"
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
      app_role: ["admin", "manager", "employee", "external"],
      bc_party_type: ["artist", "rental", "supplier", "client", "other"],
      bc_status: ["draft", "active", "expired", "terminated"],
      catalog_kind: ["product", "service"],
      crm_activity_type: ["note", "call", "meeting", "email", "task"],
      crm_client_status: ["active", "inactive", "lead"],
      crm_deal_stage: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      event_status: ["planning", "confirmed", "done", "cancelled"],
      expense_status: ["pending", "approved", "rejected"],
      guest_type: ["guest", "press", "artist", "staff", "promoter"],
      hr_assignment_status: [
        "assigned",
        "confirmed",
        "declined",
        "decline_requested",
      ],
      hr_candidate_stage: [
        "applied",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
      ],
      hr_checklist_kind: ["onboarding", "offboarding"],
      hr_contract_status: ["draft", "active", "ended"],
      hr_contract_type: ["hpp", "dpp", "dpc", "ico", "other"],
      hr_doc_category: ["contract", "payslip", "id", "other"],
      hr_employee_status: ["active", "terminated"],
      hr_employment_type: [
        "full_time",
        "part_time",
        "contract",
        "intern",
        "dpp",
        "dpc",
      ],
      hr_job_status: ["open", "closed"],
      hr_leave_status: ["pending", "approved", "rejected"],
      hr_leave_type: ["vacation", "sick", "personal", "unpaid"],
      hr_review_type: ["review", "one_on_one"],
      invoice_status: ["draft", "pending", "paid", "overdue", "cancelled"],
      invoice_type: ["issued", "received"],
      meeting_status: ["scheduled", "done", "cancelled"],
      po_status: ["draft", "sent", "confirmed", "delivered", "cancelled"],
      project_priority: ["low", "medium", "high"],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      project_task_status: ["todo", "in_progress", "done"],
      quote_status: ["draft", "sent", "accepted", "rejected"],
      reservation_status: [
        "pending",
        "confirmed",
        "seated",
        "cancelled",
        "no_show",
      ],
      social_platform: [
        "instagram",
        "facebook",
        "tiktok",
        "youtube",
        "x",
        "linkedin",
        "threads",
        "other",
      ],
      social_post_status: ["draft", "scheduled", "published", "failed"],
      sop_category: ["open", "close", "emergency", "bar", "other"],
      supplier_category: ["artist", "security", "rental", "drinks", "other"],
      transaction_type: ["income", "expense"],
      vip_box: ["diamond", "gold", "silver", "other"],
    },
  },
} as const
