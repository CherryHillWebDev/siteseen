import { supabase } from './supabase.js';
import { WORKER_URL } from './config.js';

// ── Auth Functions ─────────────────────────────────────────────

async function handleSignUp({ email, password, confirm }) {
    const errEl = document.getElementById('signup-error');
    errEl.hidden = true;

    if (password !== confirm) {
        errEl.textContent = 'Passwords do not match';
        errEl.hidden = false;
        return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        errEl.textContent = error.message;
        errEl.hidden = false;
        return;
    }

    if (data.user) {
        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${WORKER_URL}/api/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ session_token: sessionToken })
            });
            localStorage.removeItem('session_token');
        }
        window.location.href = '/site/index.html';
    }
}

async function handleSignIn({ email, password }) {
    const errEl = document.getElementById('signin-error');
    errEl.hidden = true;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errEl.textContent = error.message;
        errEl.hidden = false;
        return;
    }

    window.location.href = '/site/index.html';
}

async function handleForgotPassword({ email }) {
    const errEl     = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    errEl.hidden     = true;
    successEl.hidden = true;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://getsiteseen.com/auth.html'
    });

    if (error) {
        errEl.textContent = error.message;
        errEl.hidden = false;
        return;
    }

    successEl.hidden = false;
}

// ── Panel Switching ────────────────────────────────────────────

function clearErrors() {
    document.getElementById('signin-error').hidden = true;
    document.getElementById('signup-error').hidden = true;
    document.getElementById('forgot-error').hidden = true;
    document.getElementById('forgot-success').hidden = true;
}

function showPanel(panelId) {
    clearErrors();
    ['auth-signin', 'auth-signup', 'auth-forgot'].forEach(id => {
        document.getElementById(id).hidden = id !== panelId;
    });
}

// ── Event Listeners ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // Sign in
    document.getElementById('btn-signin').addEventListener('click', () => {
        const email    = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        handleSignIn({ email, password });
    });

    // Sign up
    document.getElementById('btn-signup').addEventListener('click', () => {
        const email    = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm  = document.getElementById('signup-confirm').value;
        handleSignUp({ email, password, confirm });
    });

    // Forgot password
    document.getElementById('btn-forgot').addEventListener('click', () => {
        const email = document.getElementById('forgot-email').value.trim();
        handleForgotPassword({ email });
    });

    // Panel links
    document.getElementById('link-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        showPanel('auth-signup');
    });

    document.getElementById('link-to-signin').addEventListener('click', (e) => {
        e.preventDefault();
        showPanel('auth-signin');
    });

    document.getElementById('link-forgot').addEventListener('click', (e) => {
        e.preventDefault();
        showPanel('auth-forgot');
    });

    document.getElementById('link-back-signin').addEventListener('click', (e) => {
        e.preventDefault();
        showPanel('auth-signin');
    });

    // Route to correct panel based on URL hash
    // e.g. auth.html#signup goes straight to sign up panel
    if (window.location.hash === '#signup') {
        showPanel('auth-signup');
    }
});