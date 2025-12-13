const { executeQuery } = require('../config/database');

class Dog {
  constructor(data) {
    this.id = data.id;
    this.owner_id = data.owner_id;
    this.name = data.name;
    this.breed = data.breed;
    this.age = data.age;
    this.size = data.size;
    this.temperament = data.temperament;
    this.special_needs = data.special_needs;
    this.medical_notes = data.medical_notes;
    this.profile_image_url = data.profile_image_url;
    this.is_friendly_with_other_dogs = data.is_friendly_with_other_dogs;
    this.is_friendly_with_children = data.is_friendly_with_children;
    this.energy_level = data.energy_level;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.is_active = data.is_active;
  }

  // Get all dogs with optional filtering
  static async findAll(filters = {}) {
    let sql = `
      SELECT 
        d.id, d.owner_id, d.name, d.breed, d.age, d.size, d.temperament,
        d.special_needs, d.medical_notes, d.profile_image_url,
        d.is_friendly_with_other_dogs, d.is_friendly_with_children,
        d.energy_level, d.created_at, d.updated_at, d.is_active,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM dogs d
      JOIN users u ON d.owner_id = u.id
      WHERE d.is_active = TRUE AND u.is_active = TRUE
    `;
    const params = [];

    if (filters.owner_id) {
      sql += ' AND d.owner_id = ?';
      params.push(filters.owner_id);
    }

    if (filters.size) {
      sql += ' AND d.size = ?';
      params.push(filters.size);
    }

    if (filters.breed) {
      sql += ' AND d.breed LIKE ?';
      params.push(`%${filters.breed}%`);
    }

    if (filters.energy_level) {
      sql += ' AND d.energy_level = ?';
      params.push(filters.energy_level);
    }

    if (filters.is_friendly_with_other_dogs !== undefined) {
      sql += ' AND d.is_friendly_with_other_dogs = ?';
      params.push(filters.is_friendly_with_other_dogs);
    }

    if (filters.is_friendly_with_children !== undefined) {
      sql += ' AND d.is_friendly_with_children = ?';
      params.push(filters.is_friendly_with_children);
    }

    sql += ' ORDER BY d.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }

    return await executeQuery(sql, params);
  }

  // Get dog by ID
  static async findById(id) {
    const sql = `
      SELECT 
        d.id, d.owner_id, d.name, d.breed, d.age, d.size, d.temperament,
        d.special_needs, d.medical_notes, d.profile_image_url,
        d.is_friendly_with_other_dogs, d.is_friendly_with_children,
        d.energy_level, d.created_at, d.updated_at, d.is_active,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
        u.location as owner_location
      FROM dogs d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = ? AND d.is_active = TRUE AND u.is_active = TRUE
    `;
    const results = await executeQuery(sql, [id]);
    return results.length > 0 ? new Dog(results[0]) : null;
  }

  // Get dogs by owner ID
  static async findByOwnerId(ownerId) {
    const sql = `
      SELECT 
        d.id, d.owner_id, d.name, d.breed, d.age, d.size, d.temperament,
        d.special_needs, d.medical_notes, d.profile_image_url,
        d.is_friendly_with_other_dogs, d.is_friendly_with_children,
        d.energy_level, d.created_at, d.updated_at, d.is_active
      FROM dogs d
      WHERE d.owner_id = ? AND d.is_active = TRUE
      ORDER BY d.created_at DESC
    `;
    return await executeQuery(sql, [ownerId]);
  }

  // Create new dog
  static async create(dogData) {
    const {
      owner_id, name, breed, age, size, temperament,
      special_needs, medical_notes, profile_image_url,
      is_friendly_with_other_dogs, is_friendly_with_children,
      energy_level
    } = dogData;

    const sql = `
      INSERT INTO dogs (
        owner_id, name, breed, age, size, temperament,
        special_needs, medical_notes, profile_image_url,
        is_friendly_with_other_dogs, is_friendly_with_children,
        energy_level, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;

    const params = [
      owner_id, name, breed, age, size, temperament,
      special_needs, medical_notes, profile_image_url,
      is_friendly_with_other_dogs, is_friendly_with_children,
      energy_level
    ];

    const result = await executeQuery(sql, params);
    return await Dog.findById(result.insertId);
  }

  // Update dog
  async update(updateData) {
    const allowedFields = [
      'name', 'breed', 'age', 'size', 'temperament',
      'special_needs', 'medical_notes', 'profile_image_url',
      'is_friendly_with_other_dogs', 'is_friendly_with_children',
      'energy_level'
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
      UPDATE dogs 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(sql, params);
    return await Dog.findById(this.id);
  }

  // Soft delete dog
  async delete() {
    const sql = 'UPDATE dogs SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(sql, [this.id]);
    return true;
  }

  // Hard delete dog (for admin purposes)
  async hardDelete() {
    const sql = 'DELETE FROM dogs WHERE id = ?';
    await executeQuery(sql, [this.id]);
    return true;
  }

  // Get dog's owner
  async getOwner() {
    const sql = `
      SELECT 
        id, name, email, role, phone, location, 
        profile_image_url, bio, rating, total_reviews,
        created_at, updated_at, is_active
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `;
    const results = await executeQuery(sql, [this.owner_id]);
    return results.length > 0 ? results[0] : null;
  }

  // Search dogs
  static async search(searchTerm, filters = {}) {
    let sql = `
      SELECT 
        d.id, d.owner_id, d.name, d.breed, d.age, d.size, d.temperament,
        d.special_needs, d.medical_notes, d.profile_image_url,
        d.is_friendly_with_other_dogs, d.is_friendly_with_children,
        d.energy_level, d.created_at, d.updated_at, d.is_active,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM dogs d
      JOIN users u ON d.owner_id = u.id
      WHERE d.is_active = TRUE AND u.is_active = TRUE AND (
        d.name LIKE ? OR 
        d.breed LIKE ? OR 
        d.temperament LIKE ? OR
        d.special_needs LIKE ?
      )
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const params = [searchPattern, searchPattern, searchPattern, searchPattern];

    if (filters.size) {
      sql += ' AND d.size = ?';
      params.push(filters.size);
    }

    if (filters.energy_level) {
      sql += ' AND d.energy_level = ?';
      params.push(filters.energy_level);
    }

    if (filters.owner_id) {
      sql += ' AND d.owner_id = ?';
      params.push(filters.owner_id);
    }

    sql += ' ORDER BY d.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    return await executeQuery(sql, params);
  }

  // Get dogs by breed statistics
  static async getBreedStats() {
    const sql = `
      SELECT 
        breed,
        COUNT(*) as count,
        AVG(age) as avg_age,
        AVG(CASE WHEN energy_level = 'high' THEN 1 ELSE 0 END) as high_energy_ratio
      FROM dogs 
      WHERE is_active = TRUE AND breed IS NOT NULL
      GROUP BY breed
      ORDER BY count DESC
    `;
    return await executeQuery(sql);
  }

  // Get dogs by size statistics
  static async getSizeStats() {
    const sql = `
      SELECT 
        size,
        COUNT(*) as count,
        AVG(age) as avg_age,
        AVG(CASE WHEN energy_level = 'high' THEN 1 ELSE 0 END) as high_energy_ratio
      FROM dogs 
      WHERE is_active = TRUE
      GROUP BY size
      ORDER BY count DESC
    `;
    return await executeQuery(sql);
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      owner_id: this.owner_id,
      name: this.name,
      breed: this.breed,
      age: this.age,
      size: this.size,
      temperament: this.temperament,
      special_needs: this.special_needs,
      medical_notes: this.medical_notes,
      profile_image_url: this.profile_image_url,
      is_friendly_with_other_dogs: this.is_friendly_with_other_dogs,
      is_friendly_with_children: this.is_friendly_with_children,
      energy_level: this.energy_level,
      created_at: this.created_at,
      updated_at: this.updated_at,
      is_active: this.is_active
    };
  }
}

module.exports = Dog;
