// browse.js - Browse and filter camps

let browseCamps = [];
let browseSavedCampIds = new Set();
let browseFilters = {
    searchQuery: '',
    age: '',
    maxPrice: '',
    cities: [],
    categories: [],
    afterCare: false,
};

let browseSearchTimeout = null;
let multiDropdownListenersReady = false;
const ALL_CITIES_LABEL = 'All cities';
const ALL_CATEGORIES_LABEL = 'All categories';

async function initBrowsePage() {
    const searchInput = document.getElementById('browse-search');
    const ageInput = document.getElementById('browse-age');
    const maxPriceInput = document.getElementById('browse-max-price');
    const afterCareCheckbox = document.getElementById('browse-aftercare');
    const clearBtn = document.getElementById('browse-clear');
    const clearBtn2 = document.getElementById('browse-clear-2');

    const resultsContainer = document.getElementById('browse-results');
    const resultsCountEl = document.getElementById('browse-results-count');
    const noResultsEl = document.getElementById('browse-no-results');

    try {
        // Load initial data
        browseCamps = await fetchCamps();
        const session = await getSession();
        if (session?.user?.id) {
            const ids = await getSavedCampIds();
            browseSavedCampIds = new Set(ids);
        }
        const [cities, categories] = await Promise.all([
            getCities(),
            getCategories()
        ]);

        populateMultiDropdown('city', cities);
        populateMultiDropdown('category', categories);

        // Seed from localStorage (quickSearch/category cards)
        const storedSearch = localStorage.getItem('searchQuery');
        const storedCategory = localStorage.getItem('categoryFilter');
        const storedAfterCare = localStorage.getItem('afterCareFilter');

        if (storedSearch && searchInput) {
            browseFilters.searchQuery = storedSearch;
            searchInput.value = storedSearch;
            localStorage.removeItem('searchQuery');
        }

        if (storedCategory) {
            seedMultiDropdown('category', storedCategory);
            localStorage.removeItem('categoryFilter');
        }

        if (storedAfterCare === 'true' && afterCareCheckbox) {
            browseFilters.afterCare = true;
            afterCareCheckbox.checked = true;
            localStorage.removeItem('afterCareFilter');
        }

        // Wire up events
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                browseFilters.searchQuery = searchInput.value.trim();
                if (browseSearchTimeout) {
                    clearTimeout(browseSearchTimeout);
                }
                browseSearchTimeout = setTimeout(applyBrowseFiltersAndRender, 250);
            });
        }

        if (ageInput) {
            ageInput.addEventListener('input', () => {
                browseFilters.age = ageInput.value.trim();
                applyBrowseFiltersAndRender();
            });
        }

        if (maxPriceInput) {
            maxPriceInput.addEventListener('input', () => {
                browseFilters.maxPrice = maxPriceInput.value.trim();
                applyBrowseFiltersAndRender();
            });
        }

        if (afterCareCheckbox) {
            afterCareCheckbox.addEventListener('change', () => {
                browseFilters.afterCare = afterCareCheckbox.checked;
                applyBrowseFiltersAndRender();
            });
        }

        const clearAll = () => {
            browseFilters = {
                searchQuery: '',
                age: '',
                maxPrice: '',
                cities: [],
                categories: [],
                afterCare: false,
            };

            if (searchInput) searchInput.value = '';
            if (ageInput) ageInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            resetMultiDropdown('city');
            resetMultiDropdown('category');
            if (afterCareCheckbox) afterCareCheckbox.checked = false;

            applyBrowseFiltersAndRender();
        };

        if (clearBtn) {
            clearBtn.addEventListener('click', clearAll);
        }
        if (clearBtn2) {
            clearBtn2.addEventListener('click', clearAll);
        }

        // Callback when user toggles favorite (refresh saved IDs)
        window.onFavoriteToggled = async () => {
            const ids = await getSavedCampIds();
            browseSavedCampIds = new Set(ids);
            applyBrowseFiltersAndRender();
        };

        // Initial render
        applyBrowseFiltersAndRender();
    } catch (error) {
        console.error('Error initializing browse page:', error);
        const message = error.message || 'Unable to load camps. Please refresh the page.';
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="loading">${message}</div>`;
        }
        if (resultsCountEl) {
            resultsCountEl.textContent = message;
        }
        if (noResultsEl) {
            noResultsEl.style.display = 'none';
        }
    }
}

function applyBrowseFiltersAndRender() {
    const resultsContainer = document.getElementById('browse-results');
    const resultsCountEl = document.getElementById('browse-results-count');
    const noResultsEl = document.getElementById('browse-no-results');

    if (!resultsContainer || !Array.isArray(browseCamps)) {
        return;
    }

    const filtered = filterCamps(browseCamps, browseFilters);

    // Update count
    if (resultsCountEl) {
        const count = filtered.length;
        if (count === 0) {
            resultsCountEl.textContent = 'No camps found';
        } else if (count === 1) {
            resultsCountEl.textContent = '1 camp found';
        } else {
            resultsCountEl.textContent = `${count} camps found`;
        }
    }

    // Render results
    resultsContainer.innerHTML = '';

    if (filtered.length === 0) {
        if (noResultsEl) {
            noResultsEl.style.display = 'block';
        }
        return;
    }

    if (noResultsEl) {
        noResultsEl.style.display = 'none';
    }

    filtered.forEach(camp => {
        const isSaved = browseSavedCampIds.has(camp.id);
        const card = createCampCard(camp, { isSaved, variant: 'rich' });
        resultsContainer.appendChild(card);
    });
}

function multiDropdownKind(kind) {
    return kind === 'category' ? 'category' : 'city';
}

function multiDropdownFilterKey(kind) {
    return multiDropdownKind(kind) === 'category' ? 'categories' : 'cities';
}

function multiDropdownAllLabel(kind) {
    return multiDropdownKind(kind) === 'category' ? ALL_CATEGORIES_LABEL : ALL_CITIES_LABEL;
}

function otherMultiDropdownKind(kind) {
    return multiDropdownKind(kind) === 'category' ? 'city' : 'category';
}

function getMultiDropdownEls(kind) {
    const k = multiDropdownKind(kind);
    return {
        button: document.getElementById(`browse-${k}-button`),
        buttonText: document.getElementById(`browse-${k}-button-text`),
        panel: document.getElementById(`browse-${k}-panel`),
    };
}

function isMultiDropdownOpen(kind) {
    const { panel } = getMultiDropdownEls(kind);
    return !!(panel && !panel.hidden);
}

function setMultiButtonLabel(kind, values) {
    const { button, buttonText } = getMultiDropdownEls(kind);
    const label = values.length ? values.join(', ') : multiDropdownAllLabel(kind);
    if (buttonText) buttonText.textContent = label;
    if (button) button.title = label;
}

function closeMultiDropdown(kind, options = {}) {
    const { button, panel } = getMultiDropdownEls(kind);
    if (!button || !panel || panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (options.restoreFocus) button.focus();
}

function toggleMultiDropdown(kind) {
    const { button, panel } = getMultiDropdownEls(kind);
    if (!button || !panel) return;
    const willOpen = panel.hidden;
    if (willOpen) {
        closeMultiDropdown(otherMultiDropdownKind(kind));
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
    } else {
        closeMultiDropdown(kind);
    }
}

function selectedValuesFromPanel(kind) {
    const { panel } = getMultiDropdownEls(kind);
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
}

function onMultiCheckboxChange(kind) {
    const key = multiDropdownFilterKey(kind);
    browseFilters[key] = selectedValuesFromPanel(kind);
    setMultiButtonLabel(kind, browseFilters[key]);
    applyBrowseFiltersAndRender();
}

function ensureMultiDropdownListeners() {
    if (multiDropdownListenersReady) return;
    multiDropdownListenersReady = true;
    document.addEventListener('click', () => {
        closeMultiDropdown('city');
        closeMultiDropdown('category');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (isMultiDropdownOpen('city')) {
            closeMultiDropdown('city', { restoreFocus: true });
        } else if (isMultiDropdownOpen('category')) {
            closeMultiDropdown('category', { restoreFocus: true });
        }
    });
}

function populateMultiDropdown(kind, values) {
    const k = multiDropdownKind(kind);
    const { button, panel } = getMultiDropdownEls(k);
    if (!panel) return;

    panel.innerHTML = '';
    (values || []).forEach((value, i) => {
        const id = `browse-${k}-${i}`;
        const label = document.createElement('label');
        label.className = 'browse-multi-option';
        label.htmlFor = id;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.name = `browse-${k}`;
        input.value = value;
        input.addEventListener('change', () => onMultiCheckboxChange(k));

        label.appendChild(input);
        label.appendChild(document.createTextNode(value));
        panel.appendChild(label);
    });

    const key = multiDropdownFilterKey(k);
    setMultiButtonLabel(k, browseFilters[key]);

    if (button && !button.dataset.multiDropdownWired) {
        button.dataset.multiDropdownWired = '1';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMultiDropdown(k);
        });
        panel.addEventListener('click', (e) => e.stopPropagation());
        ensureMultiDropdownListeners();
    }
}

function seedMultiDropdown(kind, value) {
    const { panel } = getMultiDropdownEls(kind);
    if (!panel || !value) return;
    const input = Array.from(panel.querySelectorAll('input[type="checkbox"]'))
        .find((el) => el.value === value);
    if (!input) return;
    input.checked = true;
    onMultiCheckboxChange(kind);
}

function resetMultiDropdown(kind) {
    const { panel } = getMultiDropdownEls(kind);
    panel?.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        el.checked = false;
    });
    const key = multiDropdownFilterKey(kind);
    browseFilters[key] = [];
    setMultiButtonLabel(kind, []);
    closeMultiDropdown(kind);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowsePage);
} else {
    initBrowsePage();
}

