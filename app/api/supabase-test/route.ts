import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      data: data || []
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
