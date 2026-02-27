// favorites-page.js - Load and render user's favorite camps

async function initFavoritesPage() {
    const loginPrompt = document.getElementById('favorites-login-prompt');
    const emptyState = document.getElementById('favorites-empty-state');
    const gridWrap = document.getElementById('favorites-grid-wrap');
    const resultsContainer = document.getElementById('favorites-results');
    const loadingEl = document.getElementById('favorites-loading');

    try {
        const session = await getSession();
        if (!session?.user?.id) {
            loadingEl.style.display = 'none';
            loginPrompt.style.display = 'block';
            return;
        }

        const savedIds = await getSavedCampIds();
        if (savedIds.length === 0) {
            loadingEl.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        const camps = await fetchCamps();
        const campById = new Map(camps.map(c => [c.id, c]));

        loadingEl.style.display = 'none';
        gridWrap.style.display = 'block';
        resultsContainer.innerHTML = '';

        const removeCardAndMaybeShowEmpty = (card) => {
            if (card) card.remove();
            if (resultsContainer.children.length === 0) {
                gridWrap.style.display = 'none';
                emptyState.style.display = 'block';
            }
        };

        for (const campId of savedIds) {
            const camp = campById.get(campId);
            if (camp) {
                const card = createCampCard(camp, {
                    isSaved: true,
                    onRemove: removeCardAndMaybeShowEmpty
                });
                resultsContainer.appendChild(card);
            } else {
                const unavailableCard = createUnavailableFavoriteCard(campId);
                resultsContainer.appendChild(unavailableCard);
            }
        }

        resultsContainer.querySelectorAll('.btn-remove-unavailable').forEach(btn => {
            btn.addEventListener('click', async () => {
                const campId = btn.dataset.campId;
                const ok = await removeFavorite(campId);
                if (ok) {
                    removeCardAndMaybeShowEmpty(btn.closest('.camp-card-unavailable'));
                }
            });
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
        loadingEl.style.display = 'none';
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="favorites-error">Unable to load favorites. Please refresh the page.</p>';
        }
    }
}

/**
 * Create a card for a camp that is no longer available in Airtable.
 */
function createUnavailableFavoriteCard(campId) {
    const card = document.createElement('div');
    card.className = 'camp-card camp-card-unavailable';
    card.innerHTML = `
        <div class="camp-card-unavailable-content">
            <h3 class="camp-name">Camp no longer available</h3>
            <p>This camp has been removed from our listings.</p>
            <button type="button" class="btn-remove-unavailable btn-secondary" data-camp-id="${campId}">
                Remove from favorites
            </button>
        </div>
    `;
    return card;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFavoritesPage);
} else {
    initFavoritesPage();
}
