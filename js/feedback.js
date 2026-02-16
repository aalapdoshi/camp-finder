// feedback.js - Feedback system functionality

let selectedRating = null;

/**
 * Initialize feedback system
 */
function initFeedback() {
    const feedbackButton = document.getElementById('feedback-button');
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackClose = document.getElementById('feedback-close');
    const feedbackForm = document.getElementById('feedback-form');
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const feedbackBackdrop = document.getElementById('feedback-backdrop');

    // Initialize rating buttons
    ratingButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => handleRatingClick(index + 1));
    });

    // Open modal when button clicked
    if (feedbackButton) {
        feedbackButton.addEventListener('click', openFeedbackModal);
    }

    // Close modal when X clicked
    if (feedbackClose) {
        feedbackClose.addEventListener('click', closeFeedbackModal);
    }

    // Close modal when backdrop clicked
    if (feedbackBackdrop) {
        feedbackBackdrop.addEventListener('click', (e) => {
            if (e.target === feedbackBackdrop) {
                closeFeedbackModal();
            }
        });
    }

    // Handle form submission
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && feedbackModal && feedbackModal.classList.contains('active')) {
            closeFeedbackModal();
        }
    });
}

/**
 * Handle rating button click
 */
function handleRatingClick(rating) {
    selectedRating = rating;
    const ratingButtons = document.querySelectorAll('.rating-btn');
    
    // Update button states
    ratingButtons.forEach((btn, index) => {
        if (index + 1 <= rating) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

/**
 * Open feedback modal
 */
function openFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    const backdrop = document.getElementById('feedback-backdrop');
    
    if (modal && backdrop) {
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        backdrop.classList.add('active');
        modal.classList.add('active');
        
        // Focus first rating button for accessibility
        const firstRatingBtn = document.querySelector('.rating-btn');
        if (firstRatingBtn) {
            firstRatingBtn.focus();
        }
    }
}

/**
 * Close feedback modal
 */
function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    const backdrop = document.getElementById('feedback-backdrop');
    const form = document.getElementById('feedback-form');
    const successMessage = document.getElementById('feedback-success');
    const errorMessage = document.getElementById('feedback-error');
    
    if (modal && backdrop) {
        document.body.style.overflow = ''; // Restore scrolling
        backdrop.classList.remove('active');
        modal.classList.remove('active');
        
        // Reset form after animation
        setTimeout(() => {
            if (form) {
                form.reset();
            }
            selectedRating = null;
            
            // Reset rating buttons
            const ratingButtons = document.querySelectorAll('.rating-btn');
            ratingButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Hide messages
            if (successMessage) {
                successMessage.style.display = 'none';
            }
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        }, 300);
    }
}

/**
 * Handle feedback form submission
 */
async function handleFeedbackSubmit(e) {
    e.preventDefault();
    
    if (!selectedRating) {
        showErrorMessage('Please select a rating');
        return;
    }

    const suggestionsInput = document.getElementById('feedback-suggestions');
    const suggestions = suggestionsInput ? suggestionsInput.value.trim() : '';
    const submitButton = document.getElementById('feedback-submit');
    const successMessage = document.getElementById('feedback-success');
    const errorMessage = document.getElementById('feedback-error');

    // Show loading state
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
    }

    // Hide previous messages
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }

    // Get current page
    const page = window.location.pathname.split('/').pop() || 'index.html';

    try {
        // Determine API endpoint (Netlify or local)
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('netlify.com');
        const apiUrl = isNetlify ? '/api/feedback' : 'http://localhost:8888/.netlify/functions/feedback';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rating: selectedRating,
                suggestions: suggestions,
                page: page
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit feedback');
        }

        // Show success message
        showSuccessMessage();
        
        // Close modal after 2 seconds
        setTimeout(() => {
            closeFeedbackModal();
        }, 2000);

    } catch (error) {
        console.error('Error submitting feedback:', error);
        showErrorMessage('Failed to submit feedback. Please try again later.');
        
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Feedback';
        }
    }
}

/**
 * Show success message
 */
function showSuccessMessage() {
    const successMessage = document.getElementById('feedback-success');
    const errorMessage = document.getElementById('feedback-error');
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    if (successMessage) {
        successMessage.style.display = 'block';
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorMessage = document.getElementById('feedback-error');
    const successMessage = document.getElementById('feedback-success');
    
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedback);
} else {
    initFeedback();
}
