// Basic type definition for a Persona

import { Database } from "@/core/supabase/database.types";

// Extract the Row type from the generated types
export type Persona = Database["public"]["Tables"]["personas"]["Row"];

// Type for creating a new persona (omit DB-generated fields)
export type PersonaInsert = Database["public"]["Tables"]["personas"]["Insert"];

// Type for updating a persona (make fields optional)
export type PersonaUpdate = Database["public"]["Tables"]["personas"]["Update"]; 