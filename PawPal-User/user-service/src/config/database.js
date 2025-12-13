const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pawpal_db',
  waitForConnections: true,
  connectionLimit: process.env.DB_POOL_MAX || 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000, // 10 seconds timeout for initial connection
  // Force IPv4 to avoid IPv6 connection issues
  // If host is 'localhost', use 127.0.0.1 instead
  ...(process.env.DB_HOST === 'localhost' || !process.env.DB_HOST ? { host: '127.0.0.1' } : {})
};

// Create connection pool
let pool = null;

// Mock data for when database is not available
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

function getMockData(sql) {
  console.log('📝 Using mock data for query:', sql.substring(0, 50) + '...');
  
  // Simple mock data based on SQL query patterns
  if (sql.includes('SELECT') && sql.includes('users')) {
    if (sql.includes('WHERE role = ?')) {
      // Filter by role - check the parameter value
      const roleParam = sql.match(/WHERE role = \?/);
      if (roleParam) {
        // This is a simplified check - in real implementation we'd check the actual parameter
        // For now, return walkers for role queries
        return mockUsers.filter(user => user.role === 'walker');
      }
    }
    if (sql.includes('WHERE id = ?')) {
      return mockUsers.slice(0, 1);
    }
    if (sql.includes('WHERE email = ?')) {
      return mockUsers.slice(0, 1);
    }
    // Check if this is a walkers-specific query
    if (sql.includes('role = \'walker\'')) {
      return mockUsers.filter(user => user.role === 'walker');
    }
    // Check if this is an owners-specific query
    if (sql.includes('role = \'owner\'')) {
      return mockUsers.filter(user => user.role === 'owner');
    }
    // Default: return all users
    return mockUsers;
  }
  
  if (sql.includes('SELECT') && sql.includes('dogs')) {
    if (sql.includes('WHERE owner_id = ?')) {
      return mockDogs;
    }
    // Default: return all dogs
    return mockDogs;
  }
  
  if (sql.includes('INSERT')) {
    return [{ insertId: mockUsers.length + 1 }];
  }
  
  // Default empty result
  return [];
}

async function connectDatabase() {
  try {
    // Close existing pool if any
    if (pool) {
      await pool.end();
      pool = null;
    }
    
    pool = mysql.createPool(dbConfig);
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log('📊 Database connection established');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database test query successful:', rows[0]);
    
    connection.release();
    
    // Verify pool is set
    if (!pool) {
      throw new Error('Pool was not set correctly');
    }
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    pool = null; // Ensure pool is null on error
    throw error; // Throw error instead of returning null
  }
}

function getPool() {
  if (!pool) {
    console.error('❌ Database pool not initialized');
    return null;
  }
  return pool;
}

async function executeQuery(sql, params = []) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available. Please ensure the database is connected.');
  }
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error; // Re-throw error instead of using mock data
  }
}

async function executeTransaction(queries) {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [rows] = await connection.execute(sql, params);
      results.push(rows);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('📊 Database connection closed');
  }
}

module.exports = {
  connectDatabase,
  getPool,
  executeQuery,
  executeTransaction,
  closeDatabase
};
