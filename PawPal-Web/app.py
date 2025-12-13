from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
from datetime import datetime
import logging
import requests
import json
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'True') == 'True'

# Enable CORS
CORS(app, supports_credentials=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Microservice URLs
USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://34.9.57.25:3001')
COMPOSITE_SERVICE_URL = os.environ.get('COMPOSITE_SERVICE_URL', 'http://localhost:3002')
WALK_SERVICE_URL = os.environ.get('WALK_SERVICE_URL', 'http://localhost:8000')
REVIEW_SERVICE_URL = os.environ.get('REVIEW_SERVICE_URL', 'http://localhost:8001')

# Google OAuth2 Config
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com')

logger.info(f"Using User Service at: {USER_SERVICE_URL}")
logger.info(f"Using Walk Service at: {WALK_SERVICE_URL}")
logger.info(f"Using Review Service at: {REVIEW_SERVICE_URL}")

# Routes
@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/api/health')
def health():
    """Health check endpoint"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'pawpal-web-app',
        'environment': 'production',
        'dependencies': {}
    }

    # Check User Service
    try:
        response = requests.get(f'{USER_SERVICE_URL}/health', timeout=5)
        health_status['dependencies']['user_service'] = {
            'status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'url': USER_SERVICE_URL
        }
    except Exception as e:
        health_status['dependencies']['user_service'] = {
            'status': 'unavailable',
            'url': USER_SERVICE_URL,
            'error': str(e)
        }

    # Check Walk Service
    try:
        response = requests.get(f'{WALK_SERVICE_URL}/', timeout=5)
        health_status['dependencies']['walk_service'] = {
            'status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'url': WALK_SERVICE_URL
        }
    except Exception as e:
        health_status['dependencies']['walk_service'] = {
            'status': 'unavailable',
            'url': WALK_SERVICE_URL,
            'error': str(e)
        }

    # Check Review Service
    try:
        response = requests.get(f'{REVIEW_SERVICE_URL}/health', timeout=5)
        health_status['dependencies']['review_service'] = {
            'status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'url': REVIEW_SERVICE_URL
        }
    except Exception as e:
        health_status['dependencies']['review_service'] = {
            'status': 'unavailable',
            'url': REVIEW_SERVICE_URL,
            'error': str(e)
        }

    return jsonify(health_status)

# ==================== GOOGLE OAUTH2 AUTHENTICATION ====================

@app.route('/api/auth/google/login')
def google_login():
    """Redirect to Google OAuth2 via User Service"""
    # Redirect to user service's OAuth endpoint
    return redirect(f'{USER_SERVICE_URL}/api/auth/google')

@app.route('/api/auth/google/callback')
def google_callback():
    """Handle Google OAuth2 callback from User Service"""
    # Get the token from query params (in real app, this would be handled differently)
    token = request.args.get('token')

    if token:
        session['jwt_token'] = token
        return redirect('/?login=success')

    return redirect('/?login=failed')

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Handle Google OAuth2 token verification and login"""
    data = request.json
    google_token = data.get('credential')

    if not google_token:
        return jsonify({
            'success': False,
            'message': 'Google credential is required'
        }), 400

    try:
        # Verify Google token and get user info
        # First try to verify with Google
        google_verify_url = f'https://oauth2.googleapis.com/tokeninfo?id_token={google_token}'
        google_response = requests.get(google_verify_url, timeout=10)

        if google_response.status_code != 200:
            return jsonify({
                'success': False,
                'message': 'Invalid Google token'
            }), 401

        google_user = google_response.json()

        # Extract user info from Google response
        email = google_user.get('email')
        name = google_user.get('name', email.split('@')[0])
        google_id = google_user.get('sub')
        picture = google_user.get('picture', '')

        logger.info(f"Google OAuth - Email: {email}, Name: {name}")

        # Search for existing user by email
        search_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/search',
            params={'q': email},
            timeout=10
        )

        user = None
        if search_response.status_code == 200:
            search_result = search_response.json()
            users = search_result.get('data', [])
            for u in users:
                if u.get('email', '').lower() == email.lower():
                    user = u
                    break

        if user:
            # Existing user - log them in
            session['user_id'] = user['id']
            session['user_email'] = user['email']
            session['user_name'] = user['name']
            session['user_role'] = user['role']
            session['google_id'] = google_id

            return jsonify({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                },
                'isNewUser': False
            })
        else:
            # New user - return info for registration
            session['pending_google_user'] = {
                'email': email,
                'name': name,
                'google_id': google_id,
                'picture': picture
            }

            return jsonify({
                'success': True,
                'message': 'New user - please complete registration',
                'isNewUser': True,
                'googleUser': {
                    'email': email,
                    'name': name,
                    'picture': picture
                }
            })

    except requests.exceptions.RequestException as e:
        logger.error(f"Google auth error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Authentication error: {str(e)}'
        }), 503

@app.route('/api/auth/google/complete-registration', methods=['POST'])
def complete_google_registration():
    """Complete registration for Google OAuth users"""
    pending_user = session.get('pending_google_user')

    if not pending_user:
        return jsonify({
            'success': False,
            'message': 'No pending Google registration found'
        }), 400

    data = request.json
    role = data.get('role', 'owner')
    phone = data.get('phone', '')
    location = data.get('location', '')
    bio = data.get('bio', '')

    # Create user in User Service
    user_data = {
        'name': pending_user['name'],
        'email': pending_user['email'],
        'role': role,
        'phone': phone,
        'location': location,
        'profile_image_url': pending_user.get('picture', 'https://via.placeholder.com/150'),
        'bio': bio,
        'google_id': pending_user['google_id']
    }

    try:
        response = requests.post(
            f'{USER_SERVICE_URL}/api/users',
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 201:
            result = response.json()
            created_user = result.get('data', {})

            # Clear pending user and set session
            session.pop('pending_google_user', None)
            session['user_id'] = created_user.get('id')
            session['user_email'] = created_user.get('email')
            session['user_name'] = created_user.get('name')
            session['user_role'] = created_user.get('role')

            return jsonify({
                'success': True,
                'message': 'Registration complete',
                'user': {
                    'id': created_user.get('id'),
                    'name': created_user.get('name'),
                    'email': created_user.get('email'),
                    'role': created_user.get('role')
                }
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to create user'
            }), response.status_code

    except requests.exceptions.RequestException as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Service error: {str(e)}'
        }), 503

# ==================== USER AUTHENTICATION ====================

@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login using name and email"""
    data = request.json
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()

    if not name:
        return jsonify({
            'success': False,
            'message': 'Name is required'
        }), 400

    if not email:
        return jsonify({
            'success': False,
            'message': 'Email is required'
        }), 400

    logger.info(f"Login attempt - Name: {name}, Email: {email}")

    try:
        response = requests.get(
            f'{USER_SERVICE_URL}/api/users/search',
            params={'q': email},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            users = result.get('data', [])

            user = None
            for u in users:
                if (u.get('email', '').lower() == email and
                    u.get('name', '').lower() == name.lower()):
                    user = u
                    break

            if user:
                session['user_id'] = user['id']
                session['user_email'] = user['email']
                session['user_name'] = user['name']
                session['user_role'] = user['role']

                logger.info(f"Login successful for user ID: {user['id']}")

                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user['id'],
                        'name': user['name'],
                        'email': user['email'],
                        'role': user['role']
                    }
                })
            else:
                email_exists = any(u.get('email', '').lower() == email for u in users)
                if email_exists:
                    return jsonify({
                        'success': False,
                        'message': 'Name does not match the email. Please check your credentials.'
                    }), 401
                else:
                    return jsonify({
                        'success': False,
                        'message': 'User not found. Please check your email or sign up first.'
                    }), 404
        else:
            return jsonify({
                'success': False,
                'message': 'Service error'
            }), 500

    except requests.exceptions.RequestException as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'User service error: {str(e)}'
        }), 503

@app.route('/api/signup', methods=['POST'])
def signup():
    """Handle user registration with all required fields"""
    data = request.json

    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    role = data.get('accountType', 'owner')
    phone = data.get('phone', '').strip()
    location = data.get('location', '').strip()
    profile_image_url = data.get('profile_image_url', '').strip()
    bio = data.get('bio', '').strip()

    logger.info(f"Signup attempt - Name: {name}, Email: {email}, Role: {role}")

    # Validate required fields
    if not name:
        return jsonify({'success': False, 'message': 'Name is required'}), 400
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    if not phone:
        return jsonify({'success': False, 'message': 'Phone is required'}), 400
    if not location:
        return jsonify({'success': False, 'message': 'Location is required'}), 400
    if not profile_image_url:
        return jsonify({'success': False, 'message': 'Profile image URL is required'}), 400
    if not bio:
        return jsonify({'success': False, 'message': 'Bio is required'}), 400

    if '@' not in email or '.' not in email:
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400

    if role not in ['owner', 'walker']:
        return jsonify({'success': False, 'message': 'Invalid role. Must be "owner" or "walker"'}), 400

    import re
    phone_pattern = r'^\+?[1-9]\d{0,15}$'
    if not re.match(phone_pattern, phone):
        return jsonify({
            'success': False,
            'message': 'Invalid phone format. Use digits only (e.g., 15551234567)'
        }), 400

    try:
        # Check if user exists
        search_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/search',
            params={'q': email},
            timeout=10
        )

        if search_response.status_code == 200:
            search_result = search_response.json()
            existing_users = search_result.get('data', [])

            for existing_user in existing_users:
                if existing_user.get('email', '').lower() == email:
                    return jsonify({
                        'success': False,
                        'message': 'Email already exists. Please login instead.'
                    }), 409

        user_data = {
            'name': name,
            'email': email,
            'role': role,
            'phone': phone,
            'location': location,
            'profile_image_url': profile_image_url,
            'bio': bio
        }

        response = requests.post(
            f'{USER_SERVICE_URL}/api/users',
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 201:
            result = response.json()
            created_user = result.get('data', {})

            session['user_id'] = created_user.get('id')
            session['user_email'] = created_user.get('email', email)
            session['user_name'] = created_user.get('name', name)
            session['user_role'] = created_user.get('role', role)

            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'user': {
                    'id': created_user.get('id'),
                    'name': created_user.get('name', name),
                    'email': created_user.get('email', email),
                    'role': created_user.get('role', role)
                }
            }), 201
        elif response.status_code == 409:
            return jsonify({
                'success': False,
                'message': 'Email already exists.'
            }), 409
        else:
            return jsonify({
                'success': False,
                'message': f'Failed to create account. Status: {response.status_code}'
            }), response.status_code

    except requests.exceptions.RequestException as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Service error: {str(e)}'
        }), 503

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle user logout"""
    session.clear()
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })

@app.route('/api/current-user', methods=['GET'])
def current_user():
    """Get current logged in user"""
    if 'user_id' in session:
        return jsonify({
            'success': True,
            'user': {
                'id': session.get('user_id'),
                'name': session.get('user_name'),
                'email': session.get('user_email'),
                'role': session.get('user_role')
            }
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Not logged in'
        }), 401

# ==================== USER PROFILE ====================

@app.route('/api/profile', methods=['GET', 'PUT', 'DELETE'])
def profile():
    """Get, update, or delete user profile"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    if request.method == 'GET':
        try:
            response = requests.get(
                f'{USER_SERVICE_URL}/api/users/{session["user_id"]}',
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                user_data = result.get('data', {})

                dogs_response = requests.get(
                    f'{USER_SERVICE_URL}/api/dogs/owner/{session["user_id"]}',
                    timeout=10
                )

                dogs = []
                if dogs_response.status_code == 200:
                    dogs_result = dogs_response.json()
                    dogs = dogs_result.get('data', [])

                return jsonify({
                    'success': True,
                    'data': {
                        'user': user_data,
                        'dogs': dogs
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to get profile'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Get profile error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    elif request.method == 'PUT':
        data = request.json
        try:
            update_data = {}
            for field in ['name', 'phone', 'location', 'bio']:
                if field in data:
                    update_data[field] = data[field]

            response = requests.put(
                f'{USER_SERVICE_URL}/api/users/{session["user_id"]}',
                json=update_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                updated_user = result.get('data', {})

                if 'name' in updated_user:
                    session['user_name'] = updated_user['name']

                return jsonify({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'user': updated_user
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to update profile'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Update profile error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # DELETE
        try:
            response = requests.delete(
                f'{USER_SERVICE_URL}/api/users/{session["user_id"]}',
                timeout=10
            )

            if response.status_code in [200, 204]:
                session.clear()
                return jsonify({
                    'success': True,
                    'message': 'Account deactivated successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to delete account'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Delete profile error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

# ==================== PET MANAGEMENT ====================

@app.route('/api/pets', methods=['GET', 'POST'])
def pets():
    """Handle pet management"""
    if request.method == 'POST':
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please login first'
            }), 401

        data = request.json
        logger.info(f"Adding new pet: {data.get('name')} for user {session['user_id']}")

        try:
            # Ensure owner_id is an integer (as per API spec)
            owner_id = int(session['user_id'])

            dog_data = {
                'owner_id': owner_id,
                'name': data.get('name'),
                'breed': data.get('breed', 'Mixed'),
                'age': int(data.get('ageYears', 0)) if data.get('ageYears') else 0,
                'size': data.get('size', 'medium'),
                'temperament': data.get('temperament', 'Friendly'),
                'energy_level': data.get('energy_level', 'medium'),
                'is_friendly_with_other_dogs': True,
                'is_friendly_with_children': True,
                'special_needs': data.get('special_needs') or 'None',
                'medical_notes': data.get('medical_notes') or 'None',
                'profile_image_url': data.get('profile_image_url', 'https://via.placeholder.com/150')
            }

            logger.info(f"Sending dog data to user service: {dog_data}")

            response = requests.post(
                f'{USER_SERVICE_URL}/api/dogs',
                json=dog_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            logger.info(f"User service response status: {response.status_code}")
            logger.info(f"User service response body: {response.text}")

            if response.status_code in [200, 201]:
                result = response.json()
                # Check if the response indicates success
                if result.get('success') == False:
                    return jsonify({
                        'success': False,
                        'message': result.get('message', 'Failed to add pet')
                    }), 400
                return jsonify({
                    'success': True,
                    'message': 'Pet added successfully',
                    'data': result.get('data', result)
                })
            else:
                try:
                    error_response = response.json()
                    error_msg = error_response.get('message') or error_response.get('error') or 'Failed to add pet'
                except:
                    error_msg = f'Failed to add pet (status: {response.status_code})'
                logger.error(f"Add pet failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Add pet error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # GET
        if 'user_id' not in session:
            return jsonify({'pets': []})

        try:
            response = requests.get(
                f'{USER_SERVICE_URL}/api/dogs/owner/{session["user_id"]}',
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                dogs = result.get('data', [])

                pets_formatted = [{
                    'id': dog.get('id'),
                    'name': dog.get('name'),
                    'type': 'dog',
                    'breed': dog.get('breed', 'Mixed breed'),
                    'age': dog.get('age', 0),
                    'size': dog.get('size', 'medium'),
                    'temperament': dog.get('temperament', ''),
                    'energy_level': dog.get('energy_level', 'medium')
                } for dog in dogs]

                return jsonify({'pets': pets_formatted})
            else:
                return jsonify({'pets': []})

        except requests.exceptions.RequestException as e:
            logger.error(f"Get pets error: {str(e)}")
            return jsonify({'pets': []})

@app.route('/api/pets/<int:pet_id>', methods=['PUT', 'DELETE'])
def manage_pet(pet_id):
    """Update or delete a specific pet"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    if request.method == 'PUT':
        data = request.json
        try:
            response = requests.put(
                f'{USER_SERVICE_URL}/api/dogs/{pet_id}',
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Pet updated successfully',
                    'data': result.get('data', {})
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to update pet'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Update pet error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # DELETE
        try:
            response = requests.delete(
                f'{USER_SERVICE_URL}/api/dogs/{pet_id}',
                timeout=10
            )

            if response.status_code in [200, 204]:
                return jsonify({
                    'success': True,
                    'message': 'Pet deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to delete pet'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Delete pet error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

# ==================== WALK REQUEST MANAGEMENT ====================

@app.route('/api/walks', methods=['GET', 'POST'])
def walks():
    """Handle walk requests - owners create, walkers view available"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    if request.method == 'POST':
        # Only owners can create walk requests
        if session.get('user_role') != 'owner':
            return jsonify({
                'success': False,
                'message': 'Only pet owners can create walk requests'
            }), 403

        data = request.json

        try:
            walk_data = {
                'id': str(uuid.uuid4()),
                'owner_id': str(session['user_id']),
                'pet_id': str(data.get('pet_id')),
                'location': data.get('location', ''),
                'city': data.get('city', ''),
                'scheduled_time': data.get('scheduled_time'),
                'duration_minutes': int(data.get('duration_minutes', 30)),
                'status': 'requested'
            }

            logger.info(f"Creating walk request: {walk_data}")

            response = requests.post(
                f'{WALK_SERVICE_URL}/walks',
                json=walk_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 201:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Walk request created successfully',
                    'data': result
                }), 201
            else:
                error_detail = response.json().get('detail', 'Failed to create walk request')
                return jsonify({
                    'success': False,
                    'message': error_detail
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Create walk error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Walk service error: {str(e)}'
            }), 503

    else:  # GET
        try:
            params = {}
            user_role = session.get('user_role')

            # Owners see their own walks, walkers see all requested walks
            if user_role == 'owner':
                params['owner_id'] = str(session['user_id'])
            elif user_role == 'walker':
                status_filter = request.args.get('status', 'requested')
                if status_filter:
                    params['status'] = status_filter

            # Add city filter if provided
            city = request.args.get('city')
            if city:
                params['city'] = city

            response = requests.get(
                f'{WALK_SERVICE_URL}/walks',
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                walks_data = response.json()
                return jsonify({
                    'success': True,
                    'walks': walks_data
                })
            else:
                return jsonify({
                    'success': False,
                    'walks': []
                })

        except requests.exceptions.RequestException as e:
            logger.error(f"Get walks error: {str(e)}")
            return jsonify({
                'success': False,
                'walks': [],
                'error': str(e)
            })

@app.route('/api/walks/<walk_id>', methods=['GET', 'PATCH', 'DELETE'])
def manage_walk(walk_id):
    """Get, update, or delete a specific walk"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    if request.method == 'GET':
        try:
            response = requests.get(
                f'{WALK_SERVICE_URL}/walks/{walk_id}',
                timeout=10
            )

            if response.status_code == 200:
                walk_data = response.json()
                return jsonify({
                    'success': True,
                    'data': walk_data
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Walk not found'
                }), 404

        except requests.exceptions.RequestException as e:
            logger.error(f"Get walk error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    elif request.method == 'PATCH':
        data = request.json
        try:
            response = requests.patch(
                f'{WALK_SERVICE_URL}/walks/{walk_id}',
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Walk updated successfully',
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to update walk'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Update walk error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # DELETE
        try:
            response = requests.delete(
                f'{WALK_SERVICE_URL}/walks/{walk_id}',
                timeout=10
            )

            if response.status_code == 204:
                return jsonify({
                    'success': True,
                    'message': 'Walk deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to delete walk'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Delete walk error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

# ==================== WALK ASSIGNMENT (ACCEPT WALKS) ====================

@app.route('/api/assignments', methods=['GET', 'POST'])
def assignments():
    """Handle walk assignments - walkers accept walks"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    if request.method == 'POST':
        # Only walkers can accept/create assignments
        if session.get('user_role') != 'walker':
            return jsonify({
                'success': False,
                'message': 'Only pet walkers can accept walk requests'
            }), 403

        data = request.json
        walk_id = data.get('walk_id')

        if not walk_id:
            return jsonify({
                'success': False,
                'message': 'Walk ID is required'
            }), 400

        try:
            # Create assignment
            assignment_data = {
                'id': str(uuid.uuid4()),
                'walk_id': walk_id,
                'walker_id': str(session['user_id']),
                'status': 'pending',
                'notes': data.get('notes', '')
            }

            response = requests.post(
                f'{WALK_SERVICE_URL}/assignments',
                json=assignment_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 201:
                result = response.json()

                # Update walk status to 'accepted'
                requests.patch(
                    f'{WALK_SERVICE_URL}/walks/{walk_id}',
                    json={'status': 'accepted'},
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )

                return jsonify({
                    'success': True,
                    'message': 'Walk accepted successfully',
                    'data': result
                }), 201
            else:
                error_detail = response.json().get('detail', 'Failed to accept walk')
                return jsonify({
                    'success': False,
                    'message': error_detail
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Accept walk error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # GET
        try:
            params = {}
            user_role = session.get('user_role')

            if user_role == 'walker':
                params['walker_id'] = str(session['user_id'])

            status = request.args.get('status')
            if status:
                params['status'] = status

            response = requests.get(
                f'{WALK_SERVICE_URL}/assignments',
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                assignments_data = response.json()
                return jsonify({
                    'success': True,
                    'assignments': assignments_data
                })
            else:
                return jsonify({
                    'success': False,
                    'assignments': []
                })

        except requests.exceptions.RequestException as e:
            logger.error(f"Get assignments error: {str(e)}")
            return jsonify({
                'success': False,
                'assignments': [],
                'error': str(e)
            })

@app.route('/api/assignments/<assignment_id>', methods=['PATCH'])
def update_assignment(assignment_id):
    """Update assignment status (start walk, complete walk)"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401

    data = request.json

    try:
        update_data = {}

        if 'status' in data:
            update_data['status'] = data['status']
        if 'notes' in data:
            update_data['notes'] = data['notes']
        if 'start_time' in data:
            update_data['start_time'] = data['start_time']
        if 'end_time' in data:
            update_data['end_time'] = data['end_time']

        response = requests.patch(
            f'{WALK_SERVICE_URL}/assignments/{assignment_id}',
            json=update_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()

            # If assignment is completed, update walk status too
            if update_data.get('status') == 'completed':
                walk_id = result.get('walk_id')
                if walk_id:
                    requests.patch(
                        f'{WALK_SERVICE_URL}/walks/{walk_id}',
                        json={'status': 'completed'},
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )

            return jsonify({
                'success': True,
                'message': 'Assignment updated successfully',
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to update assignment'
            }), response.status_code

    except requests.exceptions.RequestException as e:
        logger.error(f"Update assignment error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Service error: {str(e)}'
        }), 503

# ==================== REVIEW MANAGEMENT ====================

@app.route('/api/reviews', methods=['GET', 'POST'])
def reviews():
    """Handle reviews - owners leave reviews after walks"""
    if request.method == 'POST':
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please login first'
            }), 401

        data = request.json

        try:
            review_data = {
                'walkId': data.get('walk_id'),
                'ownerId': str(session['user_id']),
                'walkerId': data.get('walker_id'),
                'rating': float(data.get('rating', 5)),
                'comment': data.get('comment', '')
            }

            logger.info(f"Creating review: {review_data}")

            response = requests.post(
                f'{REVIEW_SERVICE_URL}/reviews',
                json=review_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 201:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Review submitted successfully',
                    'data': result
                }), 201
            else:
                error_detail = response.json().get('detail', 'Failed to create review')
                return jsonify({
                    'success': False,
                    'message': error_detail
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Create review error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Review service error: {str(e)}'
            }), 503

    else:  # GET
        try:
            params = {}

            walker_id = request.args.get('walker_id')
            owner_id = request.args.get('owner_id')
            min_rating = request.args.get('min_rating')
            max_rating = request.args.get('max_rating')

            if walker_id:
                params['walkerId'] = walker_id
            if owner_id:
                params['ownerId'] = owner_id
            if min_rating:
                params['minRating'] = min_rating
            if max_rating:
                params['maxRating'] = max_rating

            response = requests.get(
                f'{REVIEW_SERVICE_URL}/reviews',
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'success': True,
                    'reviews': result.get('data', []),
                    'pagination': result.get('pagination', {})
                })
            else:
                return jsonify({
                    'success': False,
                    'reviews': []
                })

        except requests.exceptions.RequestException as e:
            logger.error(f"Get reviews error: {str(e)}")
            return jsonify({
                'success': False,
                'reviews': [],
                'error': str(e)
            })

@app.route('/api/reviews/<review_id>', methods=['GET', 'PATCH', 'DELETE'])
def manage_review(review_id):
    """Get, update, or delete a specific review"""
    if request.method == 'GET':
        try:
            response = requests.get(
                f'{REVIEW_SERVICE_URL}/reviews/{review_id}',
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Review not found'
                }), 404

        except requests.exceptions.RequestException as e:
            logger.error(f"Get review error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    elif request.method == 'PATCH':
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please login first'
            }), 401

        data = request.json
        try:
            update_data = {}
            if 'rating' in data:
                update_data['rating'] = float(data['rating'])
            if 'comment' in data:
                update_data['comment'] = data['comment']

            response = requests.patch(
                f'{REVIEW_SERVICE_URL}/reviews/{review_id}',
                json=update_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Review updated successfully',
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to update review'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Update review error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

    else:  # DELETE
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please login first'
            }), 401

        try:
            response = requests.delete(
                f'{REVIEW_SERVICE_URL}/reviews/{review_id}',
                timeout=10
            )

            if response.status_code == 204:
                return jsonify({
                    'success': True,
                    'message': 'Review deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to delete review'
                }), response.status_code

        except requests.exceptions.RequestException as e:
            logger.error(f"Delete review error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Service error: {str(e)}'
            }), 503

# ==================== WALKER SEARCH ====================

@app.route('/api/walkers', methods=['GET'])
def get_walkers():
    """Get available walkers"""
    try:
        params = {
            'role': 'walker',
            'limit': 20
        }

        location = request.args.get('location')
        if location:
            params['location'] = location

        min_rating = request.args.get('min_rating')
        if min_rating:
            params['min_rating'] = min_rating

        response = requests.get(
            f'{USER_SERVICE_URL}/api/users',
            params=params,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            walkers = result.get('data', [])

            walkers_formatted = [{
                'id': walker.get('id'),
                'name': walker.get('name'),
                'rating': walker.get('rating', 0.0),
                'reviews': walker.get('total_reviews', 0),
                'location': walker.get('location', 'Unknown'),
                'bio': walker.get('bio', ''),
                'price': 25,
                'availability': 'Available'
            } for walker in walkers]

            return jsonify({
                'success': True,
                'walkers': walkers_formatted,
                'total': result.get('total', len(walkers))
            })
        else:
            return jsonify({
                'success': False,
                'walkers': []
            })

    except requests.exceptions.RequestException as e:
        logger.error(f"Get walkers error: {str(e)}")
        return jsonify({
            'success': False,
            'walkers': [],
            'error': str(e)
        })

# ==================== STATISTICS ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics"""
    try:
        stats = {
            'totalUsers': 0,
            'totalDogs': 0,
            'owners': 0,
            'walkers': 0
        }

        users_response = requests.get(
            f'{USER_SERVICE_URL}/api/users',
            params={'limit': 1},
            timeout=10
        )

        if users_response.status_code == 200:
            users_data = users_response.json()
            stats['totalUsers'] = users_data.get('total', 0)

        owners_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/owners',
            params={'limit': 1},
            timeout=10
        )
        if owners_response.status_code == 200:
            stats['owners'] = owners_response.json().get('total', 0)

        walkers_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/walkers',
            params={'limit': 1},
            timeout=10
        )
        if walkers_response.status_code == 200:
            stats['walkers'] = walkers_response.json().get('total', 0)

        return jsonify({
            'success': True,
            'stats': stats
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"Get stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Service error: {str(e)}'
        }), 503

# ==================== SERVICE INFO ====================

@app.route('/api/service-info', methods=['GET'])
def service_info():
    """Get service information"""
    return jsonify({
        'user_service': {
            'url': USER_SERVICE_URL,
            'swagger_ui': f'{USER_SERVICE_URL}/api-docs'
        },
        'walk_service': {
            'url': WALK_SERVICE_URL,
            'swagger_ui': f'{WALK_SERVICE_URL}/docs'
        },
        'review_service': {
            'url': REVIEW_SERVICE_URL,
            'swagger_ui': f'{REVIEW_SERVICE_URL}/docs'
        }
    })

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))

    print("\n" + "="*60)
    print("PawPal Web App - Full Feature Mode")
    print("="*60)
    print(f"Web App Port: {port}")
    print(f"User Service: {USER_SERVICE_URL}")
    print(f"Walk Service: {WALK_SERVICE_URL}")
    print(f"Review Service: {REVIEW_SERVICE_URL}")
    print("="*60)
    print("")
    print("Features:")
    print("   - Google OAuth2 Login")
    print("   - User registration and login")
    print("   - Pet management")
    print("   - Walk request creation (owners)")
    print("   - Walk acceptance (walkers)")
    print("   - Review system")
    print("   - Walker search")
    print("="*60 + "\n")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=app.config['DEBUG']
    )
