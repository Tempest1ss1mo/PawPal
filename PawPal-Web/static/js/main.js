// PawPal Web Application - Main JavaScript

// Global State
let currentUser = null;
let selectedAccountType = 'owner';
let selectedGoogleAccountType = 'owner';
let selectedRating = 0;
let allWalks = [];

// API Base URL
const API_BASE_URL = window.location.origin + '/api';

// ==================== INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initializeGoogleAuth();
    setupFormHandlers();
    setMinDateTime();
});

// Initialize Google OAuth2
function initializeGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
        // Initialize Google Sign-In for login page
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false
        });

        // Render button for login page
        const loginButton = document.getElementById('googleSignInButton');
        if (loginButton) {
            google.accounts.id.renderButton(loginButton, {
                theme: 'outline',
                size: 'large',
                width: 300,
                text: 'signin_with'
            });
        }

        // Render button for signup page
        const signupButton = document.getElementById('googleSignUpButton');
        if (signupButton) {
            google.accounts.id.renderButton(signupButton, {
                theme: 'outline',
                size: 'large',
                width: 300,
                text: 'signup_with'
            });
        }
    } else {
        console.log('Google Sign-In not available');
    }
}

// Handle Google OAuth2 Response
async function handleGoogleCredentialResponse(response) {
    console.log('Google credential received');

    try {
        const result = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: response.credential
            })
        });

        const data = await result.json();

        if (data.success) {
            if (data.isNewUser) {
                // New user - show registration completion form
                document.getElementById('googleEmail').value = data.googleUser.email;
                document.getElementById('googleName').value = data.googleUser.name;
                showPage('google-complete');
            } else {
                // Existing user - log them in
                currentUser = data.user;
                updateUIForLoggedInUser();
                alert('Welcome back, ' + currentUser.name + '!');
                showPage('home');
            }
        } else {
            alert('Google login failed: ' + data.message);
        }
    } catch (error) {
        console.error('Google auth error:', error);
        alert('Failed to authenticate with Google');
    }
}

// Set minimum date/time for walk scheduling
function setMinDateTime() {
    const walkDateTime = document.getElementById('walkDateTime');
    if (walkDateTime) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        walkDateTime.min = now.toISOString().slice(0, 16);
    }
}

// ==================== AUTHENTICATION ====================

async function checkLoginStatus() {
    try {
        const response = await fetch('/api/current-user');
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            updateUIForLoggedInUser();
        } else {
            updateUIForGuestUser();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        updateUIForGuestUser();
    }
}

function updateUIForLoggedInUser() {
    // Hide guest-only elements
    document.querySelectorAll('.nav-guest-only').forEach(el => {
        el.style.display = 'none';
    });

    // Show auth-required elements
    document.querySelectorAll('.nav-auth-required').forEach(el => {
        el.style.display = 'flex';
    });

    // Hide hero guest buttons, show auth buttons
    document.querySelectorAll('.hero-guest-btn').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.hero-auth-btn').forEach(el => {
        el.style.display = 'inline-block';
    });

    // Show role-specific navigation
    if (currentUser.role === 'owner') {
        document.querySelectorAll('.nav-owner').forEach(el => {
            el.style.display = 'inline-block';
        });
        document.querySelectorAll('.nav-walker').forEach(el => {
            el.style.display = 'none';
        });
    } else if (currentUser.role === 'walker') {
        document.querySelectorAll('.nav-walker').forEach(el => {
            el.style.display = 'inline-block';
        });
        document.querySelectorAll('.nav-owner').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Update user info in nav
    const navUserName = document.getElementById('navUserName');
    if (navUserName && currentUser) {
        navUserName.textContent = `Welcome, ${currentUser.name}`;
    }

    const navUserRole = document.getElementById('navUserRole');
    if (navUserRole && currentUser) {
        navUserRole.textContent = `(${currentUser.role})`;
    }

    // If on login/signup page, redirect to home
    const activePage = document.querySelector('.page.active');
    if (activePage && (activePage.id === 'login' || activePage.id === 'signup')) {
        showPage('home');
    }
}

function updateUIForGuestUser() {
    // Show guest-only elements
    document.querySelectorAll('.nav-guest-only').forEach(el => {
        el.style.display = 'inline-block';
    });

    // Hide auth-required elements
    document.querySelectorAll('.nav-auth-required').forEach(el => {
        el.style.display = 'none';
    });

    // Show hero guest buttons, hide auth buttons
    document.querySelectorAll('.hero-guest-btn').forEach(el => {
        el.style.display = 'inline-block';
    });
    document.querySelectorAll('.hero-auth-btn').forEach(el => {
        el.style.display = 'none';
    });

    currentUser = null;
}

// Handle "Get Started" button click
function handleGetStarted() {
    if (currentUser) {
        // If logged in, go to appropriate walk page
        goToWalks();
    } else {
        // If not logged in, go to signup
        showPage('signup');
    }
}

// Navigate to walks page based on user role
function goToWalks() {
    if (currentUser) {
        if (currentUser.role === 'owner') {
            showPage('walks');
        } else if (currentUser.role === 'walker') {
            showPage('available-walks');
        }
    } else {
        showPage('login');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = null;
            updateUIForGuestUser();
            showPage('home');
            alert('You have been logged out successfully.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// ==================== PAGE NAVIGATION ====================

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Load page-specific data
    switch (pageId) {
        case 'profile':
            loadPets();
            loadUserProfile();
            break;
        case 'walks':
            loadPetsForWalkModal();
            loadMyWalks('requested');
            break;
        case 'available-walks':
            loadAvailableWalks();
            break;
        case 'my-jobs':
            loadMyJobs('pending');
            break;
        case 'login':
        case 'signup':
            initializeGoogleAuth();
            break;
    }
}

function showTab(tabElement, tabId) {
    const tabs = tabElement.parentElement.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabElement.classList.add('active');

    const contents = tabElement.parentElement.parentElement.querySelectorAll('.tab-content');
    contents.forEach(content => content.style.display = 'none');
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
}

// ==================== MODAL FUNCTIONS ====================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');

        // Load pets for walk modal
        if (modalId === 'createWalkModal') {
            loadPetsForWalkModal();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ==================== SELECTION FUNCTIONS ====================

function selectAccountType(element, type) {
    document.querySelectorAll('#signupForm .radio-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedAccountType = type;
}

function selectGoogleAccountType(element, type) {
    document.querySelectorAll('#googleCompleteForm .radio-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedGoogleAccountType = type;
}

function setRating(stars) {
    selectedRating = stars;
    const ratingStars = document.getElementById('ratingStars');
    if (ratingStars) {
        const spans = ratingStars.querySelectorAll('span');
        spans.forEach((span, index) => {
            span.innerHTML = index < stars ? '&#9733;' : '&#9734;';
            span.style.color = index < stars ? '#ffd700' : '#ccc';
        });
    }
}

// ==================== FORM HANDLERS ====================

function setupFormHandlers() {
    // Login Form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Signup Form
    document.getElementById('signupForm')?.addEventListener('submit', handleSignup);

    // Google Complete Registration Form
    document.getElementById('googleCompleteForm')?.addEventListener('submit', handleGoogleComplete);

    // Add Pet Form
    document.getElementById('addPetForm')?.addEventListener('submit', handleAddPet);

    // Create Walk Form
    document.getElementById('createWalkForm')?.addEventListener('submit', handleCreateWalk);

    // Review Form
    document.getElementById('reviewForm')?.addEventListener('submit', handleReview);
}

async function handleLogin(e) {
    e.preventDefault();

    const name = document.getElementById('loginName').value.trim();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email })
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            updateUIForLoggedInUser();
            alert('Welcome back, ' + currentUser.name + '!');
            showPage('home');
        } else {
            alert('Login failed: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('signupName').value.trim(),
        email: document.getElementById('signupEmail').value.trim().toLowerCase(),
        accountType: selectedAccountType,
        phone: document.getElementById('signupPhone').value.trim(),
        location: document.getElementById('signupLocation').value.trim(),
        profile_image_url: document.getElementById('signupProfileImage').value.trim(),
        bio: document.getElementById('signupBio').value.trim()
    };

    // Validate phone
    const phoneRegex = /^\+?[1-9]\d{0,15}$/;
    if (!phoneRegex.test(data.phone)) {
        alert('Invalid phone format. Use digits only (e.g., 15551234567)');
        return;
    }

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.status === 201 || result.success) {
            alert('Account created successfully! You can now login.');
            showPage('login');
        } else {
            alert('Signup failed: ' + result.message);
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
    }
}

async function handleGoogleComplete(e) {
    e.preventDefault();

    const data = {
        role: selectedGoogleAccountType,
        phone: document.getElementById('googlePhone').value.trim(),
        location: document.getElementById('googleLocation').value.trim(),
        bio: document.getElementById('googleBio').value.trim()
    };

    try {
        const response = await fetch('/api/auth/google/complete-registration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            updateUIForLoggedInUser();
            alert('Registration complete! Welcome to PawPal, ' + currentUser.name + '!');
            showPage('home');
        } else {
            alert('Registration failed: ' + result.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

async function handleAddPet(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('petName').value.trim(),
        breed: document.getElementById('petBreed').value.trim() || 'Mixed',
        size: document.getElementById('petSize').value,
        ageYears: document.getElementById('petAgeYears').value || 0,
        energy_level: document.getElementById('petEnergyLevel').value,
        temperament: document.getElementById('petTemperament').value.trim() || 'Friendly'
    };

    // Validate name is not empty
    if (!data.name) {
        alert('Please enter a name for your pet');
        return;
    }

    console.log('Sending pet data:', data);

    try {
        const response = await fetch('/api/pets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response body:', result);

        if (response.ok && result.success) {
            alert('Pet added successfully!');
            closeModal('addPetModal');
            // Clear form first
            document.getElementById('addPetForm').reset();
            // Then reload pets list
            await loadPets();
        } else {
            const errorMsg = result.message || 'Unknown error occurred';
            alert('Failed to add pet: ' + errorMsg);
        }
    } catch (error) {
        console.error('Add pet error:', error);
        alert('Failed to add pet. Please check your connection and try again.');
    }
}

async function handleCreateWalk(e) {
    e.preventDefault();

    const dateTimeValue = document.getElementById('walkDateTime').value;
    const scheduledTime = new Date(dateTimeValue).toISOString();

    const data = {
        pet_id: document.getElementById('walkPetSelect').value,
        location: document.getElementById('walkLocation').value.trim(),
        city: document.getElementById('walkCity').value.trim(),
        scheduled_time: scheduledTime,
        duration_minutes: parseInt(document.getElementById('walkDuration').value)
    };

    if (!data.pet_id) {
        alert('Please select a pet');
        return;
    }

    try {
        const response = await fetch('/api/walks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert('Walk request created successfully!');
            closeModal('createWalkModal');
            loadMyWalks('requested');
            // Clear form
            document.getElementById('createWalkForm').reset();
        } else {
            alert('Failed to create walk request: ' + result.message);
        }
    } catch (error) {
        console.error('Create walk error:', error);
        alert('Failed to create walk request. Please try again.');
    }
}

async function handleReview(e) {
    e.preventDefault();

    const data = {
        walk_id: document.getElementById('reviewWalkId').value,
        walker_id: document.getElementById('reviewWalkerId').value,
        rating: selectedRating,
        comment: document.getElementById('reviewText').value.trim()
    };

    if (selectedRating === 0) {
        alert('Please select a rating');
        return;
    }

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert('Review submitted successfully!');
            closeModal('reviewModal');
            // Reset form
            document.getElementById('reviewForm').reset();
            selectedRating = 0;
            setRating(0);
        } else {
            alert('Failed to submit review: ' + result.message);
        }
    } catch (error) {
        console.error('Review error:', error);
        alert('Failed to submit review. Please try again.');
    }
}

// ==================== PET MANAGEMENT ====================

async function loadPets() {
    console.log('Loading pets...');
    try {
        const response = await fetch('/api/pets');
        const result = await response.json();
        console.log('Loaded pets:', result);

        const petsList = document.getElementById('petsList');
        if (petsList) {
            if (result.pets && result.pets.length > 0) {
                petsList.innerHTML = result.pets.map(pet => `
                    <div class="pet-card">
                        <div class="pet-header">
                            <div class="pet-avatar">🐕</div>
                            <div class="pet-details">
                                <h3>${pet.name}</h3>
                                <div class="pet-info">
                                    <span>${pet.breed || 'Mixed breed'}</span>
                                    <span>•</span>
                                    <span>${pet.age} years old</span>
                                    <span>•</span>
                                    <span>${pet.size}</span>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                            <p><strong>Energy:</strong> ${pet.energy_level || 'Medium'}</p>
                            <p><strong>Temperament:</strong> ${pet.temperament || 'Friendly'}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                petsList.innerHTML = '<p style="color: #666; text-align: center;">No pets added yet. Click "Add Pet" to add your first pet!</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load pets:', error);
    }
}

async function loadPetsForWalkModal() {
    try {
        const response = await fetch('/api/pets');
        const result = await response.json();

        const petSelect = document.getElementById('walkPetSelect');
        if (petSelect && result.pets) {
            petSelect.innerHTML = '<option value="">-- Select a pet --</option>';
            result.pets.forEach(pet => {
                petSelect.innerHTML += `<option value="${pet.id}">${pet.name} (${pet.breed})</option>`;
            });
        }
    } catch (error) {
        console.error('Failed to load pets for modal:', error);
    }
}

// ==================== USER PROFILE ====================

async function loadUserProfile() {
    if (!currentUser) return;

    const container = document.getElementById('profileInfoContainer');
    if (container) {
        container.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${currentUser.name || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" value="${currentUser.email || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Role</label>
                <input type="text" value="${currentUser.role || 'owner'}" readonly style="text-transform: capitalize;">
            </div>
        `;
    }
}

// ==================== WALK MANAGEMENT (OWNER) ====================

async function loadMyWalks(status) {
    try {
        const response = await fetch(`/api/walks?status=${status}`);
        const result = await response.json();

        let listId;
        switch (status) {
            case 'requested':
                listId = 'myWalksList';
                break;
            case 'accepted':
                listId = 'acceptedWalksList';
                break;
            case 'completed':
                listId = 'completedWalksList';
                break;
            default:
                listId = 'myWalksList';
        }

        const listElement = document.getElementById(listId);
        if (listElement && result.walks) {
            if (result.walks.length > 0) {
                listElement.innerHTML = result.walks.map(walk => {
                    const scheduledDate = new Date(walk.scheduled_time);
                    const dateStr = scheduledDate.toLocaleDateString();
                    const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let actionButtons = '';
                    if (status === 'completed') {
                        actionButtons = `<button class="btn btn-outline" onclick="openReviewModal('${walk.id}', '${walk.walker_id || ''}')">Leave Review</button>`;
                    } else if (status === 'requested') {
                        actionButtons = `<button class="btn btn-outline" style="background: #ff6b6b; color: white; border: none;" onclick="cancelWalk('${walk.id}')">Cancel</button>`;
                    }

                    return `
                        <div class="pet-card">
                            <h3>Walk Request</h3>
                            <p><strong>Location:</strong> ${walk.location}</p>
                            <p><strong>City:</strong> ${walk.city}</p>
                            <p><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
                            <p><strong>Duration:</strong> ${walk.duration_minutes} minutes</p>
                            <p><strong>Status:</strong> <span style="text-transform: capitalize; color: ${getStatusColor(walk.status)}">${walk.status}</span></p>
                            ${actionButtons}
                        </div>
                    `;
                }).join('');
            } else {
                listElement.innerHTML = `<p style="color: #666; text-align: center;">No ${status} walks found.</p>`;
            }
        }
    } catch (error) {
        console.error('Failed to load walks:', error);
    }
}

async function cancelWalk(walkId) {
    if (!confirm('Are you sure you want to cancel this walk request?')) return;

    try {
        const response = await fetch(`/api/walks/${walkId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' })
        });

        const result = await response.json();

        if (result.success) {
            alert('Walk request cancelled.');
            loadMyWalks('requested');
        } else {
            alert('Failed to cancel walk: ' + result.message);
        }
    } catch (error) {
        console.error('Cancel walk error:', error);
        alert('Failed to cancel walk. Please try again.');
    }
}

// ==================== WALK MANAGEMENT (WALKER) ====================

async function loadAvailableWalks(city = '') {
    try {
        let url = '/api/walks?status=requested';
        if (city) {
            url += `&city=${encodeURIComponent(city)}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        allWalks = result.walks || [];
        displayAvailableWalks(allWalks);
    } catch (error) {
        console.error('Failed to load available walks:', error);
    }
}

function displayAvailableWalks(walks) {
    const listElement = document.getElementById('availableWalksList');
    if (listElement) {
        if (walks.length > 0) {
            listElement.innerHTML = walks.map(walk => {
                const scheduledDate = new Date(walk.scheduled_time);
                const dateStr = scheduledDate.toLocaleDateString();
                const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return `
                    <div class="walker-card" style="cursor: default;">
                        <div class="walker-avatar">🚶</div>
                        <div class="walker-info">
                            <h3>Walk in ${walk.city}</h3>
                            <p><strong>Location:</strong> ${walk.location}</p>
                            <p><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
                            <p><strong>Duration:</strong> ${walk.duration_minutes} minutes</p>
                        </div>
                        <div style="text-align: right;">
                            <button class="btn" onclick="acceptWalk('${walk.id}')">Accept Walk</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            listElement.innerHTML = '<p style="color: #666; text-align: center;">No available walk requests at the moment.</p>';
        }
    }
}

function filterWalksByCity() {
    const cityFilter = document.getElementById('walkCityFilter').value.toLowerCase();
    const filteredWalks = allWalks.filter(walk =>
        walk.city.toLowerCase().includes(cityFilter)
    );
    displayAvailableWalks(filteredWalks);
}

async function acceptWalk(walkId) {
    if (!confirm('Are you sure you want to accept this walk request?')) return;

    try {
        const response = await fetch('/api/assignments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                walk_id: walkId,
                notes: ''
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Walk accepted successfully! Check "My Jobs" for details.');
            loadAvailableWalks();
        } else {
            alert('Failed to accept walk: ' + result.message);
        }
    } catch (error) {
        console.error('Accept walk error:', error);
        alert('Failed to accept walk. Please try again.');
    }
}

async function loadMyJobs(status) {
    try {
        const response = await fetch(`/api/assignments?status=${status}`);
        const result = await response.json();

        let listId;
        switch (status) {
            case 'pending':
                listId = 'pendingJobsList';
                break;
            case 'in_progress':
                listId = 'inprogressJobsList';
                break;
            case 'completed':
                listId = 'completedJobsList';
                break;
            default:
                listId = 'pendingJobsList';
        }

        const listElement = document.getElementById(listId);
        if (listElement && result.assignments) {
            if (result.assignments.length > 0) {
                listElement.innerHTML = result.assignments.map(assignment => {
                    let actionButtons = '';
                    if (status === 'pending') {
                        actionButtons = `<button class="btn" onclick="startWalk('${assignment.id}')">Start Walk</button>`;
                    } else if (status === 'in_progress') {
                        actionButtons = `<button class="btn" onclick="completeWalk('${assignment.id}')">Complete Walk</button>`;
                    }

                    const createdDate = new Date(assignment.created_at);

                    return `
                        <div class="pet-card">
                            <h3>Walk Assignment</h3>
                            <p><strong>Walk ID:</strong> ${assignment.walk_id}</p>
                            <p><strong>Status:</strong> <span style="text-transform: capitalize; color: ${getStatusColor(assignment.status)}">${assignment.status.replace('_', ' ')}</span></p>
                            <p><strong>Assigned:</strong> ${createdDate.toLocaleDateString()}</p>
                            ${assignment.notes ? `<p><strong>Notes:</strong> ${assignment.notes}</p>` : ''}
                            ${actionButtons}
                        </div>
                    `;
                }).join('');
            } else {
                listElement.innerHTML = `<p style="color: #666; text-align: center;">No ${status.replace('_', ' ')} jobs found.</p>`;
            }
        }
    } catch (error) {
        console.error('Failed to load jobs:', error);
    }
}

async function startWalk(assignmentId) {
    try {
        const response = await fetch(`/api/assignments/${assignmentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'in_progress',
                start_time: new Date().toISOString()
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Walk started! Have a great walk!');
            loadMyJobs('pending');
        } else {
            alert('Failed to start walk: ' + result.message);
        }
    } catch (error) {
        console.error('Start walk error:', error);
        alert('Failed to start walk. Please try again.');
    }
}

async function completeWalk(assignmentId) {
    try {
        const response = await fetch(`/api/assignments/${assignmentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'completed',
                end_time: new Date().toISOString()
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Walk completed! Great job!');
            loadMyJobs('in_progress');
        } else {
            alert('Failed to complete walk: ' + result.message);
        }
    } catch (error) {
        console.error('Complete walk error:', error);
        alert('Failed to complete walk. Please try again.');
    }
}

// ==================== REVIEW MANAGEMENT ====================

function openReviewModal(walkId, walkerId) {
    document.getElementById('reviewWalkId').value = walkId;
    document.getElementById('reviewWalkerId').value = walkerId;
    selectedRating = 0;
    setRating(0);
    document.getElementById('reviewText').value = '';
    showModal('reviewModal');
}

// ==================== UTILITY FUNCTIONS ====================

function getStatusColor(status) {
    switch (status) {
        case 'requested':
            return '#ff9800';
        case 'accepted':
        case 'pending':
            return '#2196f3';
        case 'in_progress':
            return '#9c27b0';
        case 'completed':
            return '#4caf50';
        case 'cancelled':
            return '#f44336';
        default:
            return '#666';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Console log for debugging
console.log('PawPal Web Application Initialized');
console.log('Features:');
console.log('- Google OAuth2 Authentication');
console.log('- Walk Request Management');
console.log('- Walk Acceptance (Walkers)');
console.log('- Review System');
