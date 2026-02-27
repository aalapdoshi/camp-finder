// favorites.js - Add/remove/get favorites via Supabase
// Requires: auth.js (initSupabase, getSession), Supabase client

/**
 * Get array of camp IDs the current user has favorited.
 * @returns {Promise<string[]>} Array of Airtable camp record IDs
 */
async function getSavedCampIds() {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const client = initSupabase();
    if (!client) return [];

    try {
        const { data, error } = await client
            .from('favorites')
            .select('camp_id')
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error fetching favorites:', error);
            return [];
        }
        return (data || []).map(row => row.camp_id);
    } catch (err) {
        console.error('Error in getSavedCampIds:', err);
        return [];
    }
}

/**
 * Add a camp to favorites. No-op if not logged in or already favorited.
 * @param {string} campId - Airtable record ID
 * @returns {Promise<boolean>} true if added, false otherwise
 */
async function addFavorite(campId) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    try {
        const { error } = await client
            .from('favorites')
            .insert({ user_id: session.user.id, camp_id: campId });

        if (error) {
            if (error.code === '23505') return true; // duplicate, already saved
            console.error('Error adding favorite:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in addFavorite:', err);
        return false;
    }
}

/**
 * Remove a camp from favorites. No-op if not logged in.
 * @param {string} campId - Airtable record ID
 * @returns {Promise<boolean>} true if removed, false otherwise
 */
async function removeFavorite(campId) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    try {
        const { error } = await client
            .from('favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('camp_id', campId);

        if (error) {
            console.error('Error removing favorite:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in removeFavorite:', err);
        return false;
    }
}

/**
 * Check if a camp is in the user's favorites. Uses provided set for efficiency.
 * @param {string} campId - Airtable record ID
 * @param {Set<string>} [savedIds] - Optional set of saved IDs (from getSavedCampIds)
 * @returns {Promise<boolean>}
 */
async function isFavorite(campId, savedIds) {
    if (savedIds) return savedIds.has(campId);
    const ids = await getSavedCampIds();
    return ids.includes(campId);
}
