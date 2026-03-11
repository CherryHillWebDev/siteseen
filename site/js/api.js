import { WORKER_URL } from './config.js'
import { supabase } from './supabase.js';

export async function searchBusiness({ name, location, trade }) {
    try {
        const response = await fetch(`${WORKER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, trade })
        })

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Search failed' };
        }

        return { success: true, businesses: data.businesses };
    } catch(err) {
        return { success: false, error: 'Could not reach the server' }
    }
}

export async function detailedSearch({ business, trade }) {
    try {
        localStorage.removeItem('siteseen_dashboard');
        const { data: { session } } = await supabase.auth.getSession();

        const headers = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${WORKER_URL}/api/audit`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                place_id: business.id,
                confirmed_trade: trade
             })
        })
        
        const data = await response.json();

        console.log('[detailedSearch] Response status:', response.status);

        if (!response.ok) {
             console.error('[detailedSearch] Server error response:', data);
            return {success: false, error: data.error || 'Something went wrong. Try again.'} 
        }

        return { success: true, businessDetails: data }
    } catch(err) {
        console.error('[detailedSearch] Exception caught:', err);
        return { success: false, error: 'Could not reach the server' }
    }
}

export async function fetchDashboard() {
    try {
        const cached = localStorage.getItem('siteseen_dashboard');
        if (cached) return { success: true, dashboard: JSON.parse(cached) };

        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;

        const response = await fetch(`${WORKER_URL}/api/dashboard`, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            }
        })

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to fetch dashboard' };
        }

        localStorage.setItem('siteseen_dashboard', JSON.stringify(data))
        return { success: true, dashboard: data };

    } catch(err) {
        return { success: false, error: err || 'Something went wrong. Please try again' }
    }
}

export async function rescanBusiness({ place_id, confirmed_trade }) {
    try {
        localStorage.removeItem('siteseen_dashboard');
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${WORKER_URL}/api/rescan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ place_id, confirmed_trade })
        });
        const data = await response.json();
        if (!response.ok) return { success: false, error: data.error || 'Rescan failed' };
        return { success: true };
    } catch(err) {
        return { success: false, error: 'Could not reach the server' };
    }
}