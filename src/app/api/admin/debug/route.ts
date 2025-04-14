import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: Request) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get database info about the ai_endpoints table
    const { data: endpointsInfo, error: endpointsError } = await supabase
      .from('ai_endpoints')
      .select('*')
      .limit(0);
      
    // Get database info about the ai_endpoint_models table
    const { data: modelsInfo, error: modelsError } = await supabase
      .from('ai_endpoint_models')
      .select('*')
      .limit(0);
      
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    return NextResponse.json({
      tables: {
        ai_endpoints: {
          status: endpointsError ? 'error' : 'available',
          error: endpointsError
        },
        ai_endpoint_models: {
          status: modelsError ? 'error' : 'available',
          error: modelsError
        }
      },
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
} 