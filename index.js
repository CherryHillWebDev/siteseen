import { createClient } from '@supabase/supabase-js';
import { handleSearch }    from './routes/search.js';
import { handleAudit }     from './routes/audit.js';
import { handleLink }      from './routes/link.js';
import { handleDashboard } from './routes/dashboard.js';
import { handleRescan }    from './routes/rescan.js';
import { handleHealth }    from './routes/health.js';
import { corsHeaders }     from './middleware/cors.js';

const routes = [
  ['GET',  '/api/health',    handleHealth],
  ['POST', '/api/search',    handleSearch],
  ['POST', '/api/audit',     handleAudit],
  ['POST', '/api/link',      handleLink],
  ['GET',  '/api/dashboard', handleDashboard],
  ['POST', '/api/rescan',    handleRescan],
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Initialize Supabase once, pass into every handler
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SECRET_KEY
    );

    for (const [method, path, handler] of routes) {
      if (request.method === method && url.pathname === path) {
        return handler(request, env, supabase);
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found', path: url.pathname }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};