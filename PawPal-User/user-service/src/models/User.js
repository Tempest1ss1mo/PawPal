const { executeQuery } = require('../config/database');

// Mock data for demo
const mockUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "owner",
    phone: "+1234567890",
    location: "Seattle, WA",
    profile_image_url: "https://example.com/john.jpg",
    bio: "Dog lover and busy professional",
    rating: 4.8,
    total_reviews: 127,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    is_active: true
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "walker",
    phone: "+1234567891",
    location: "Portland, OR",
    profile_image_url: "https://example.com/jane.jpg",
    bio: "Professional dog walker with 5 years experience",
    rating: 4.9,
    total_reviews: 89,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_active: true
  }
];

const mockDogs = [
  {
    id: 1,
    owner_id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age: 3,
    size: "large",
    temperament: "Friendly, energetic, loves treats",
    special_needs: "Needs medication twice daily",
    medical_notes: "Allergic to chicken",
    profile_image_url: "https://example.com/buddy.jpg",
    is_friendly_with_other_dogs: true,
    is_friendly_with_children: true,
    energy_level: "high",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    is_active: true
  }
];

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.role = data.role;
    this.phone = data.phone;
    this.location = data.location;
    this.profile_image_url = data.profile_image_url;
    this.bio = data.bio;
    this.rating = data.rating;
    this.total_reviews = data.total_reviews;
    this.google_id = data.google_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.is_active = data.is_active;
  }

  // Get all users with optional filtering
  static async findAll(filters = {}) {
    try {
      let sql = `
        SELECT 
          id, name, email, role, phone, location, 
          profile_image_url, bio, rating, total_reviews, google_id,
          created_at, updated_at, is_active
        FROM users 
        WHERE 1=1
      `;
      const params = [];

      if (filters.role) {
        sql += ' AND role = ?';
        params.push(filters.role);
      }

      if (filters.location) {
        sql += ' AND location LIKE ?';
        params.push(`%${filters.location}%`);
      }

      if (filters.is_active !== undefined) {
        sql += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.min_rating) {
        sql += ' AND rating >= ?';
        params.push(filters.min_rating);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }

      return await executeQuery(sql, params);
    } catch (error) {
      console.log('📝 Using mock data for findAll');
      let filteredUsers = [...mockUsers];
      
      if (filters.role) {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }
      
      if (filters.location) {
        filteredUsers = filteredUsers.filter(user => 
          user.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      
      if (filters.min_rating) {
        filteredUsers = filteredUsers.filter(user => user.rating >= filters.min_rating);
      }
      
      if (filters.offset) {
        filteredUsers = filteredUsers.slice(parseInt(filters.offset));
      }
      
      if (filters.limit) {
        filteredUsers = filteredUsers.slice(0, parseInt(filters.limit));
      }
      
      return filteredUsers;
    }
  }

  // Get total count of users with optional filtering
  static async count(filters = {}) {
    try {
      let sql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const params = [];

      if (filters.role) {
        sql += ' AND role = ?';
        params.push(filters.role);
      }

      if (filters.location) {
        sql += ' AND location LIKE ?';
        params.push(`%${filters.location}%`);
      }

      if (filters.is_active !== undefined) {
        sql += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      if (filters.min_rating) {
        sql += ' AND rating >= ?';
        params.push(filters.min_rating);
      }

      const results = await executeQuery(sql, params);
      return results[0]?.total || 0;
    } catch (error) {
      console.log('📝 Using mock data for count');
      let filteredUsers = [...mockUsers];
      
      if (filters.role) {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }
      
      if (filters.location) {
        filteredUsers = filteredUsers.filter(user => 
          user.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      
      if (filters.min_rating) {
        filteredUsers = filteredUsers.filter(user => user.rating >= filters.min_rating);
      }
      
      return filteredUsers.length;
    }
  }

  // Get user by ID
  static async findById(id) {
    const sql = `
      SELECT 
        id, name, email, role, phone, location, 
        profile_image_url, bio, rating, total_reviews, google_id,
        created_at, updated_at, is_active
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `;
    const results = await executeQuery(sql, [id]);
    return results.length > 0 ? new User(results[0]) : null;
  }

  // Get user by email
  static async findByEmail(email) {
    const sql = `
      SELECT 
        id, name, email, role, phone, location, 
        profile_image_url, bio, rating, total_reviews, google_id,
        created_at, updated_at, is_active
      FROM users 
      WHERE email = ? AND is_active = TRUE
    `;
    const results = await executeQuery(sql, [email]);
    return results.length > 0 ? new User(results[0]) : null;
  }

  // Create new user
  static async create(userData) {
    const {
      name, email, role, phone, location, 
      profile_image_url, bio, google_id
    } = userData;

    const sql = `
      INSERT INTO users (
        name, email, role, phone, location, 
        profile_image_url, bio, google_id, rating, total_reviews, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 0, TRUE)
    `;

    // Convert undefined to null for MySQL compatibility
    const params = [
      name, 
      email, 
      role, 
      phone ?? null, 
      location ?? null, 
      profile_image_url ?? null, 
      bio ?? null, 
      google_id ?? null
    ];

    const result = await executeQuery(sql, params);
    return await User.findById(result.insertId);
  }

  // Update user
  async update(updateData) {
    const allowedFields = [
      'name', 'email', 'role', 'phone', 'location', 
      'profile_image_url', 'bio', 'rating', 'total_reviews'
    ];

    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(this.id);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(sql, params);
    return await User.findById(this.id);
  }

  // Soft delete user
  async delete() {
    const sql = 'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(sql, [this.id]);
    return true;
  }

  // Hard delete user (for admin purposes)
  async hardDelete() {
    const sql = 'DELETE FROM users WHERE id = ?';
    await executeQuery(sql, [this.id]);
    return true;
  }

  // Update Google ID
  static async updateGoogleId(userId, googleId) {
    const sql = 'UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(sql, [googleId, userId]);
    return true;
  }

  // Get user's dogs
  async getDogs() {
    const sql = `
      SELECT 
        id, owner_id, name, breed, age, size, temperament,
        special_needs, medical_notes, profile_image_url,
        is_friendly_with_other_dogs, is_friendly_with_children,
        energy_level, created_at, updated_at, is_active
      FROM dogs 
      WHERE owner_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `;
    return await executeQuery(sql, [this.id]);
  }

  // Get user statistics
  async getStats() {
    const sql = `
      SELECT 
        COUNT(d.id) as dog_count,
        AVG(d.energy_level = 'high') as high_energy_dogs_ratio,
        AVG(d.energy_level = 'low') as low_energy_dogs_ratio
      FROM dogs d
      WHERE d.owner_id = ? AND d.is_active = TRUE
    `;
    const results = await executeQuery(sql, [this.id]);
    return results[0];
  }

  // Search users
  static async search(searchTerm, filters = {}) {
    let sql = `
      SELECT 
        id, name, email, role, phone, location, 
        profile_image_url, bio, rating, total_reviews,
        created_at, updated_at, is_active
      FROM users 
      WHERE is_active = TRUE AND (
        name LIKE ? OR 
        email LIKE ? OR 
        location LIKE ? OR 
        bio LIKE ?
      )
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const params = [searchPattern, searchPattern, searchPattern, searchPattern];

    if (filters.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    sql += ' ORDER BY rating DESC, created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    return await executeQuery(sql, params);
  }

  // Convert to JSON (excluding sensitive data)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      location: this.location,
      profile_image_url: this.profile_image_url,
      bio: this.bio,
      rating: this.rating,
      total_reviews: this.total_reviews,
      created_at: this.created_at,
      updated_at: this.updated_at,
      is_active: this.is_active
    };
  }
}

module.exports = User;
