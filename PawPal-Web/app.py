from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
from datetime import datetime
import logging
import requests
import json
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

# Microservice URLs - PRODUCTION (VM Deployment)
USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://34.9.57.25:3001')
COMPOSITE_SERVICE_URL = os.environ.get('COMPOSITE_SERVICE_URL', 'http://localhost:3002')

logger.info(f"Using PRODUCTION User Service at: {USER_SERVICE_URL}")
logger.info(f"Swagger UI available at: {USER_SERVICE_URL}/api-docs")

# Routes
@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')

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
    
    try:
        response = requests.get(f'{USER_SERVICE_URL}/health', timeout=5)
        health_status['dependencies']['user_service'] = {
            'status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'url': USER_SERVICE_URL,
            'deployment': 'GCP VM'
        }
    except Exception as e:
        health_status['dependencies']['user_service'] = {
            'status': 'unavailable',
            'url': USER_SERVICE_URL,
            'error': str(e)
        }
    
    try:
        response = requests.get(f'{COMPOSITE_SERVICE_URL}/health', timeout=2)
        health_status['dependencies']['composite_service'] = {
            'status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'url': COMPOSITE_SERVICE_URL,
            'deployment': 'local'
        }
    except:
        health_status['dependencies']['composite_service'] = {
            'status': 'unavailable',
            'url': COMPOSITE_SERVICE_URL,
            'deployment': 'local'
        }
    
    return jsonify(health_status)

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
        # Search for user by email and verify name matches
        response = requests.get(
            f'{USER_SERVICE_URL}/api/users/search',
            params={'q': email},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            users = result.get('data', [])
            
            # Find user with matching email AND name
            user = None
            for u in users:
                if (u.get('email', '').lower() == email and 
                    u.get('name', '').lower() == name.lower()):
                    user = u
                    break
            
            if user:
                # Login successful
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
                # Check if email exists but name doesn't match
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
    
    # Extract all fields
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    role = data.get('accountType', 'owner')  # Frontend sends 'accountType'
    phone = data.get('phone', '').strip()
    location = data.get('location', '').strip()
    profile_image_url = data.get('profile_image_url', '').strip()
    bio = data.get('bio', '').strip()
    
    logger.info(f"Signup attempt - Name: {name}, Email: {email}, Role: {role}")
    
    # Validate ALL required fields
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
    
    if not phone:
        return jsonify({
            'success': False,
            'message': 'Phone is required'
        }), 400
    
    if not location:
        return jsonify({
            'success': False,
            'message': 'Location is required'
        }), 400
    
    if not profile_image_url:
        return jsonify({
            'success': False,
            'message': 'Profile image URL is required'
        }), 400
    
    if not bio:
        return jsonify({
            'success': False,
            'message': 'Bio is required'
        }), 400
    
    # Simple email validation
    if '@' not in email or '.' not in email:
        return jsonify({
            'success': False,
            'message': 'Invalid email format'
        }), 400
    
    # Validate role
    if role not in ['owner', 'walker']:
        return jsonify({
            'success': False,
            'message': 'Invalid role. Must be "owner" or "walker"'
        }), 400
    
    # Validate phone format
    import re
    phone_pattern = r'^\+?[1-9]\d{0,15}$'
    if not re.match(phone_pattern, phone):
        return jsonify({
            'success': False,
            'message': 'Invalid phone format. Use digits only (e.g., 15551234567) or with + prefix (e.g., +8613812345678). No dashes or spaces allowed.'
        }), 400
    
    try:
        # Check if user already exists
        search_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/search',
            params={'q': email},
            timeout=10
        )
        
        if search_response.status_code == 200:
            search_result = search_response.json()
            existing_users = search_result.get('data', [])
            
            # Check for exact email match
            for existing_user in existing_users:
                if existing_user.get('email', '').lower() == email:
                    logger.info(f"User already exists: {email}")
                    return jsonify({
                        'success': False,
                        'message': 'Email already exists. Please login instead or use a different email.'
                    }), 409
        
        # Prepare user data for VM User Service with ALL fields
        user_data = {
            'name': name,
            'email': email,
            'role': role,
            'phone': phone,
            'location': location,
            'profile_image_url': profile_image_url,
            'bio': bio
        }
        
        logger.info(f"Creating user with data: {json.dumps(user_data, indent=2)}")
        
        # Create user on VM service
        response = requests.post(
            f'{USER_SERVICE_URL}/api/users',
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        logger.info(f"VM Service Response Status: {response.status_code}")
        
        if response.status_code == 201:
            # Success - 201 Created
            result = response.json()
            created_user = result.get('data', {})
            
            logger.info(f"User created successfully with ID: {created_user.get('id')}")
            
            # Auto-login after signup
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
            }), 201  # Return 201 to match VM service
            
        elif response.status_code == 200:
            # Some services might return 200 instead of 201
            result = response.json()
            if result.get('success'):
                created_user = result.get('data', {})
                logger.info(f"User created successfully (200 response)")
                
                return jsonify({
                    'success': True,
                    'message': 'Account created successfully',
                    'user': created_user
                }), 200
            else:
                # 200 but not successful
                return jsonify({
                    'success': False,
                    'message': 'Failed to create account'
                }), 400
                
        elif response.status_code == 409:
            return jsonify({
                'success': False,
                'message': 'Email already exists. Please use a different email.'
            }), 409
        elif response.status_code == 400:
            error_data = response.json()
            # Extract validation error details if available
            details = error_data.get('details', [])
            if details:
                error_messages = []
                for detail in details:
                    field = detail.get('field', 'unknown')
                    msg = detail.get('message', 'validation error')
                    error_messages.append(f"{field}: {msg}")
                return jsonify({
                    'success': False,
                    'message': 'Validation errors:\n' + '\n'.join(error_messages)
                }), 400
            else:
                return jsonify({
                    'success': False,
                    'message': error_data.get('message', 'Invalid input data')
                }), 400
        else:
            # Any other status code is an error
            logger.error(f"Unexpected status code: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return jsonify({
                'success': False,
                'message': f'Failed to create account. Server returned status {response.status_code}'
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
    """Get, update, or delete user profile using VM Service"""
    if 'user_id' not in session:
        return jsonify({
            'success': False,
            'message': 'Please login first'
        }), 401
    
    if request.method == 'GET':
        try:
            # Get user from VM service
            response = requests.get(
                f'{USER_SERVICE_URL}/api/users/{session["user_id"]}',
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                user_data = result.get('data', {})
                
                # Get user's dogs
                dogs_response = requests.get(
                    f'{USER_SERVICE_URL}/api/dogs/owner/{session["user_id"]}',
                    timeout=10
                )
                
                dogs = []
                if dogs_response.status_code == 200:
                    dogs_result = dogs_response.json()
                    dogs = dogs_result.get('data', [])
                
                # Get user stats
                stats_response = requests.get(
                    f'{USER_SERVICE_URL}/api/users/{session["user_id"]}/stats',
                    timeout=10
                )
                
                stats = {}
                if stats_response.status_code == 200:
                    stats_result = stats_response.json()
                    stats = stats_result.get('data', {})
                
                return jsonify({
                    'success': True,
                    'data': {
                        'user': user_data,
                        'dogs': dogs,
                        'stats': stats
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
            # Only send fields that are being updated
            update_data = {}
            if 'name' in data:
                update_data['name'] = data['name']
            if 'phone' in data:
                update_data['phone'] = data['phone']
            if 'location' in data:
                update_data['location'] = data['location']
            if 'bio' in data:
                update_data['bio'] = data['bio']
            
            response = requests.put(
                f'{USER_SERVICE_URL}/api/users/{session["user_id"]}',
                json=update_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                updated_user = result.get('data', {})
                
                # Update session
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
            # Soft delete user
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
    """Handle pet management using VM User Service"""
    if request.method == 'POST':
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': 'Please login first'
            }), 401
        
        data = request.json
        logger.info(f"Adding new pet: {data.get('name')}")
        
        try:
            # Prepare dog data
            dog_data = {
                'owner_id': session['user_id'],
                'name': data.get('name'),
                'breed': data.get('breed', 'Mixed'),
                'age': int(data.get('ageYears', 0)) if data.get('ageYears') else 0,
                'size': data.get('size', 'medium'),
                'temperament': data.get('temperament', 'Friendly'),
                'energy_level': data.get('energy_level', 'medium'),
                'is_friendly_with_other_dogs': True,
                'is_friendly_with_children': True
            }
            
            if data.get('special_needs'):
                dog_data['special_needs'] = data.get('special_needs')
            
            # Create dog on VM service
            response = requests.post(
                f'{USER_SERVICE_URL}/api/dogs',
                json=dog_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                return jsonify({
                    'success': True,
                    'message': 'Pet added successfully',
                    'data': result.get('data', result)
                })
            else:
                error_msg = response.json().get('message', 'Failed to add pet')
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
            # Get user's dogs from VM service
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
    """Update or delete a specific pet using VM Service"""
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

# ==================== STATISTICS ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics from VM User Service"""
    try:
        stats = {
            'totalUsers': 0,
            'totalDogs': 0,
            'owners': 0,
            'walkers': 0,
            'breeds': [],
            'sizes': []
        }
        
        # Get user count
        users_response = requests.get(
            f'{USER_SERVICE_URL}/api/users',
            params={'limit': 1},
            timeout=10
        )
        
        if users_response.status_code == 200:
            users_data = users_response.json()
            stats['totalUsers'] = users_data.get('total', 0)
        
        # Get dog statistics
        breed_stats_response = requests.get(
            f'{USER_SERVICE_URL}/api/dogs/stats/breeds',
            timeout=10
        )
        
        if breed_stats_response.status_code == 200:
            breed_data = breed_stats_response.json()
            stats['breeds'] = breed_data.get('data', [])
            stats['totalDogs'] = sum(b.get('count', 0) for b in stats['breeds'])
        
        size_stats_response = requests.get(
            f'{USER_SERVICE_URL}/api/dogs/stats/sizes',
            timeout=10
        )
        
        if size_stats_response.status_code == 200:
            size_data = size_stats_response.json()
            stats['sizes'] = size_data.get('data', [])
        
        # Get owner and walker counts
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

# ==================== WALKER SEARCH ====================

@app.route('/api/walkers', methods=['GET'])
def get_walkers():
    """Get available walkers from VM User Service"""
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

# ==================== VM SERVICE INFO ====================

@app.route('/api/service-info', methods=['GET'])
def service_info():
    """Get VM Service information and status"""
    return jsonify({
        'user_service': {
            'url': USER_SERVICE_URL,
            'swagger_ui': f'{USER_SERVICE_URL}/api-docs',
            'swagger_json': f'{USER_SERVICE_URL}/api-docs/swagger.json',
            'deployment': 'GCP Compute Engine VM',
            'database': 'MariaDB (local on VM)',
            'port': 3001
        },
        'composite_service': {
            'url': COMPOSITE_SERVICE_URL,
            'deployment': 'Local (for development)',
            'port': 3002
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
    port = int(os.environ.get('PORT', 5000))
    
    print("\n" + "="*60)
    print("🚀 PawPal Web App - PRODUCTION MODE")
    print("="*60)
    print(f"📍 Web App Port: {port}")
    print(f"📍 User Service: {USER_SERVICE_URL} (GCP VM)")
    print(f"📍 Swagger UI: {USER_SERVICE_URL}/api-docs")
    print(f"📍 Composite Service: {COMPOSITE_SERVICE_URL} (Local)")
    print("="*60)
    print("")
    print("✅ Features:")
    print("   - User registration and login")
    print("   - Pet management")
    print("   - Walker search")
    print("   - Statistics")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=app.config['DEBUG']
    )