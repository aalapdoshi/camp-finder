// auth.js - Supabase Auth helpers for login, logout, session, and nav updates

let supabaseClient = null;

/**
 * Initialize Supabase client. Call once before using auth functions.
 * @returns {object|null} Supabase client or null if config missing
 */
function initSupabase() {
    if (supabaseClient) return supabaseClient;
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined' ||
        !SUPABASE_URL || SUPABASE_URL.includes('YOUR_') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_')) {
        console.warn('Supabase auth not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to js/auth-config.js');
        return null;
    }
    if (typeof supabase === 'undefined') {
        console.warn('Supabase library not loaded. Add script before auth.js');
        return null;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

/**
 * Build redirect URL for OAuth callback. Callback lands on index.html which then redirects.
 * @param {string} [targetPage] - Page to redirect to after auth (e.g. 'browse.html')
 */
function getOAuthRedirectUrl(targetPage) {
    const base = window.location.origin + '/index.html';
    if (targetPage) return base + '?redirectTo=' + encodeURIComponent(targetPage);
    return base;
}

/**
 * Sign in with Google OAuth. Redirects to Google, then back to index.html (and optionally targetPage).
 * @param {string} [targetPage] - Page to redirect to after auth (e.g. 'browse.html')
 */
async function signInWithGoogle(targetPage) {
    const client = initSupabase();
    if (!client) return;
    await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getOAuthRedirectUrl(targetPage) }
    });
}

/**
 * Sign in with Facebook OAuth. Redirects to Facebook, then back to index.html (and optionally targetPage).
 * @param {string} [targetPage] - Page to redirect to after auth (e.g. 'browse.html')
 */
async function signInWithFacebook(targetPage) {
    const client = initSupabase();
    if (!client) return;
    await client.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: getOAuthRedirectUrl(targetPage) }
    });
}

/**
 * Sign out the current user.
 */
async function signOut() {
    const client = initSupabase();
    if (client) await client.auth.signOut();
    window.location.reload();
}

/**
 * Get current session (user + access token).
 * @returns {Promise<object|null>} Session or null
 */
async function getSession() {
    const client = initSupabase();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
}

/**
 * Subscribe to auth state changes (login, logout, token refresh).
 * @param {function} callback - Called with (event, session)
 */
function onAuthStateChange(callback) {
    const client = initSupabase();
    if (!client) return () => {};
    const { data: { subscription } } = client.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
}

/**
 * Check if URL hash contains OAuth callback (access_token). If so, Supabase
 * client will have already exchanged it. Redirect to target page.
 * Call this on login.html and signup.html load.
 */
async function handleOAuthCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return false;
    const client = initSupabase();
    if (!client) return false;
    // Supabase parses hash automatically on getSession; session is now set
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirectTo') || 'index.html';
        window.location.replace(redirectTo);
        return true;
    }
    return false;
}

/**
 * Update nav and footer auth links based on session.
 * Call on page load and when auth state changes.
 * @param {object|null} session - Current session from getSession()
 */
function updateAuthUI(session) {
    const navAuth = document.getElementById('nav-auth');
    const footerAuth = document.getElementById('footer-auth');
    const elements = [navAuth, footerAuth].filter(Boolean);

    elements.forEach(container => {
        if (!container) return;
        if (session?.user) {
            const email = session.user.email || session.user.user_metadata?.email || 'Signed in';
            container.innerHTML = `
                <span class="nav-auth-email">${escapeHtml(email)}</span>
                <a href="#" class="auth-logout nav-auth-link">Log out</a>
            `;
            const logoutBtn = container.querySelector('.auth-logout');
            if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(); });
        } else {
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const redirect = currentPage && currentPage !== 'index.html' && currentPage !== 'login.html' && currentPage !== 'signup.html'
                ? '?redirectTo=' + encodeURIComponent(currentPage)
                : '';
            container.innerHTML = `
                <a href="login.html${redirect}">Log in</a>
                <a href="signup.html${redirect}">Sign up</a>
            `;
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize auth on page load: handle OAuth callback, update UI, subscribe to changes.
 * Call on DOMContentLoaded for pages that have nav-auth and/or footer-auth.
 */
async function initAuth() {
    initSupabase();
    const handled = await handleOAuthCallback();
    if (handled) return;
    const session = await getSession();
    updateAuthUI(session);
    onAuthStateChange((_event, session) => updateAuthUI(session));
}
