// main.js - Main application utilities and shared functions

/**
 * Initialize the application
 */
function initApp() {
    console.log('CampFinder initialized');
    // Any global initialization code can go here
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
