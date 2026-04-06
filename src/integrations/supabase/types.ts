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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alimentos_smae: {
        Row: {
          calorias: number | null
          carbohidratos: number | null
          created_at: string
          fibra: number | null
          grasas: number | null
          grupo: string
          id: string
          nombre: string
          porcion: string | null
          proteinas: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calorias?: number | null
          carbohidratos?: number | null
          created_at?: string
          fibra?: number | null
          grasas?: number | null
          grupo: string
          id?: string
          nombre: string
          porcion?: string | null
          proteinas?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calorias?: number | null
          carbohidratos?: number | null
          created_at?: string
          fibra?: number | null
          grasas?: number | null
          grupo?: string
          id?: string
          nombre?: string
          porcion?: string | null
          proteinas?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          created_at: string
          dia: number
          id: string
          incluir_detalle_pdf: boolean | null
          item_id: string
          nombre_override: string | null
          nota_menu: string | null
          orden: number
          plan_id: string
          porcion: string | null
          tiempo_comida: string
          tipo: string
        }
        Insert: {
          created_at?: string
          dia: number
          id?: string
          incluir_detalle_pdf?: boolean | null
          item_id: string
          nombre_override?: string | null
          nota_menu?: string | null
          orden?: number
          plan_id: string
          porcion?: string | null
          tiempo_comida: string
          tipo: string
        }
        Update: {
          created_at?: string
          dia?: number
          id?: string
          incluir_detalle_pdf?: boolean | null
          item_id?: string
          nombre_override?: string | null
          nota_menu?: string | null
          orden?: number
          plan_id?: string
          porcion?: string | null
          tiempo_comida?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_menu: {
        Row: {
          created_at: string
          dias: number
          es_plantilla: boolean | null
          estilo_pdf: string | null
          generalidades: string | null
          id: string
          mensaje_agradecimiento: string | null
          nombre_paciente: string
          pautas_extra: string | null
          recomendaciones: string | null
          snacks_colaciones: string | null
          tiempos_comida: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dias?: number
          es_plantilla?: boolean | null
          estilo_pdf?: string | null
          generalidades?: string | null
          id?: string
          mensaje_agradecimiento?: string | null
          nombre_paciente: string
          pautas_extra?: string | null
          recomendaciones?: string | null
          snacks_colaciones?: string | null
          tiempos_comida?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dias?: number
          es_plantilla?: boolean | null
          estilo_pdf?: string | null
          generalidades?: string | null
          id?: string
          mensaje_agradecimiento?: string | null
          nombre_paciente?: string
          pautas_extra?: string | null
          recomendaciones?: string | null
          snacks_colaciones?: string | null
          tiempos_comida?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plantillas_texto: {
        Row: {
          contenido: string
          created_at: string | null
          id: string
          nombre: string
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contenido?: string
          created_at?: string | null
          id?: string
          nombre: string
          tipo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string | null
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recetas: {
        Row: {
          created_at: string
          etiquetas: string[] | null
          id: string
          imagen_url: string | null
          incluir_detalle_pdf: boolean | null
          ingredientes: string | null
          nombre: string
          nota_predeterminada: string | null
          preparacion: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          etiquetas?: string[] | null
          id?: string
          imagen_url?: string | null
          incluir_detalle_pdf?: boolean | null
          ingredientes?: string | null
          nombre: string
          nota_predeterminada?: string | null
          preparacion?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          etiquetas?: string[] | null
          id?: string
          imagen_url?: string | null
          incluir_detalle_pdf?: boolean | null
          ingredientes?: string | null
          nombre?: string
          nota_predeterminada?: string | null
          preparacion?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
