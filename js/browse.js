// browse.js - Browse and filter camps

let browseCamps = [];
let browseSavedCampIds = new Set();
let browseFilters = {
    searchQuery: '',
    age: '',
    maxPrice: '',
    cities: [],
    category: 'all',
    afterCare: false,
};

let browseSearchTimeout = null;
const ALL_CITIES_LABEL = 'All cities';

async function initBrowsePage() {
    const searchInput = document.getElementById('browse-search');
    const ageInput = document.getElementById('browse-age');
    const maxPriceInput = document.getElementById('browse-max-price');
    const categorySelect = document.getElementById('browse-category');
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

        populateCityDropdown(cities);

        if (categorySelect) {
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categorySelect.appendChild(opt);
            });
        }

        // Seed from localStorage (quickSearch/category cards)
        const storedSearch = localStorage.getItem('searchQuery');
        const storedCategory = localStorage.getItem('categoryFilter');
        const storedAfterCare = localStorage.getItem('afterCareFilter');

        if (storedSearch && searchInput) {
            browseFilters.searchQuery = storedSearch;
            searchInput.value = storedSearch;
            localStorage.removeItem('searchQuery');
        }

        if (storedCategory && categorySelect) {
            browseFilters.category = storedCategory;
            categorySelect.value = storedCategory;
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

        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                browseFilters.category = categorySelect.value;
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
                category: 'all',
                afterCare: false,
            };

            if (searchInput) searchInput.value = '';
            if (ageInput) ageInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            resetCityDropdown();
            if (categorySelect) categorySelect.value = 'all';
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

function getCityDropdownEls() {
    return {
        button: document.getElementById('browse-city-button'),
        buttonText: document.getElementById('browse-city-button-text'),
        panel: document.getElementById('browse-city-panel'),
    };
}

function isCityDropdownOpen() {
    const { panel } = getCityDropdownEls();
    return !!(panel && !panel.hidden);
}

function setCityButtonLabel(cities) {
    const { button, buttonText } = getCityDropdownEls();
    const label = cities.length ? cities.join(', ') : ALL_CITIES_LABEL;
    if (buttonText) buttonText.textContent = label;
    if (button) button.title = label;
}

function closeCityDropdown(options = {}) {
    const { button, panel } = getCityDropdownEls();
    if (!button || !panel || panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (options.restoreFocus) button.focus();
}

function toggleCityDropdown() {
    const { button, panel } = getCityDropdownEls();
    if (!button || !panel) return;
    const willOpen = panel.hidden;
    if (willOpen) {
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
    } else {
        closeCityDropdown();
    }
}

function selectedCitiesFromPanel() {
    const { panel } = getCityDropdownEls();
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
}

function onCityCheckboxChange() {
    browseFilters.cities = selectedCitiesFromPanel();
    setCityButtonLabel(browseFilters.cities);
    applyBrowseFiltersAndRender();
}

function populateCityDropdown(cities) {
    const { button, panel } = getCityDropdownEls();
    if (!panel) return;

    panel.innerHTML = '';
    (cities || []).forEach((city, i) => {
        const id = `browse-city-${i}`;
        const label = document.createElement('label');
        label.className = 'browse-city-option';
        label.htmlFor = id;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.name = 'browse-city';
        input.value = city;
        input.addEventListener('change', onCityCheckboxChange);

        label.appendChild(input);
        label.appendChild(document.createTextNode(city));
        panel.appendChild(label);
    });

    setCityButtonLabel(browseFilters.cities);

    if (button && !button.dataset.cityDropdownWired) {
        button.dataset.cityDropdownWired = '1';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCityDropdown();
        });
        panel.addEventListener('click', (e) => e.stopPropagation());
        document.addEventListener('click', () => closeCityDropdown());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isCityDropdownOpen()) {
                closeCityDropdown({ restoreFocus: true });
            }
        });
    }
}

function resetCityDropdown() {
    const { panel } = getCityDropdownEls();
    panel?.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        el.checked = false;
    });
    setCityButtonLabel([]);
    closeCityDropdown();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowsePage);
} else {
    initBrowsePage();
}

