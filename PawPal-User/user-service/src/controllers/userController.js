const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateETag, etagMatches } = require('../utils/etag');
const { generateLinks, getBaseUrl } = require('../utils/links');
const { createTask, getTask, TaskStatus } = require('../utils/asyncTasks');

class UserController {
  // Get all users with pagination, query parameters, and links
  static getAllUsers = asyncHandler(async (req, res) => {
    const filters = { ...req.query };
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    filters.limit = limit;
    filters.offset = offset;
    
    // Get users and total count
    const [users, total] = await Promise.all([
      User.findAll(filters),
      User.count(filters)
    ]);
    
    // Generate ETag for the collection
    const etag = generateETag(JSON.stringify(users));
    res.set('ETag', etag);
    
    // Check If-None-Match header
    if (res.locals.ifNoneMatch && etagMatches(res.locals.ifNoneMatch, etag)) {
      return res.status(304).end();
    }
    
    // Generate links
    const baseUrl = getBaseUrl(req);
    const links = generateLinks({
      baseUrl,
      path: '/api/users',
      query: req.query,
      page,
      limit,
      total
    });
    
    // Add links to each user item
    const usersWithLinks = users.map(user => ({
      ...user,
      links: {
        self: { href: `${baseUrl}/api/users/${user.id}` },
        collection: { href: `${baseUrl}/api/users` }
      }
    }));
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: usersWithLinks,
      links
    });
  });

  // Get user by ID with ETag support
  static getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userJson = user.toJSON();
    
    // Generate ETag
    const etag = generateETag(JSON.stringify(userJson));
    res.set('ETag', etag);
    
    // Check If-None-Match header
    if (res.locals.ifNoneMatch && etagMatches(res.locals.ifNoneMatch, etag)) {
      return res.status(304).end();
    }
    
    // Generate links
    const baseUrl = getBaseUrl(req);
    const links = generateLinks({
      baseUrl,
      path: '/api/users',
      id: user.id
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...userJson,
        links
      }
    });
  });

  // Get user by email
  static getUserByEmail = asyncHandler(async (req, res) => {
    const { email } = req.params;
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userJson = user.toJSON();
    const baseUrl = getBaseUrl(req);
    const links = generateLinks({
      baseUrl,
      path: '/api/users',
      id: user.id
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...userJson,
        links
      }
    });
  });

  // Create new user - returns 201 Created with Location header
  static createUser = asyncHandler(async (req, res) => {
    const userData = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    const user = await User.create(userData);
    const userJson = user.toJSON();
    
    // Generate Location header
    const baseUrl = getBaseUrl(req);
    const location = `${baseUrl}/api/users/${user.id}`;
    res.set('Location', location);
    
    // Generate ETag
    const etag = generateETag(JSON.stringify(userJson));
    res.set('ETag', etag);
    
    // Generate links
    const links = generateLinks({
      baseUrl,
      path: '/api/users',
      id: user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...userJson,
        links
      }
    });
  });

  // Update user with ETag conditional update support
  static updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check If-Match header for conditional update
    if (res.locals.ifMatch) {
      const currentETag = generateETag(JSON.stringify(user.toJSON()));
      if (!etagMatches(res.locals.ifMatch, currentETag)) {
        return res.status(412).json({
          success: false,
          message: 'Precondition Failed: Resource has been modified',
          error: 'ETag mismatch'
        });
      }
    }
    
    // Check if email is being updated and if it already exists
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }
    
    const updatedUser = await user.update(updateData);
    const userJson = updatedUser.toJSON();
    
    // Generate new ETag
    const etag = generateETag(JSON.stringify(userJson));
    res.set('ETag', etag);
    
    // Generate links
    const baseUrl = getBaseUrl(req);
    const links = generateLinks({
      baseUrl,
      path: '/api/users',
      id: updatedUser.id
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        ...userJson,
        links
      }
    });
  });

  // Delete user (soft delete)
  static deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await user.delete();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  });

  // Hard delete user (admin only)
  static hardDeleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await user.hardDelete();
    
    res.status(200).json({
      success: true,
      message: 'User permanently deleted'
    });
  });

  // Get user's dogs with pagination and links
  static getUserDogs = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const dogs = await user.getDogs();
    
    const baseUrl = getBaseUrl(req);
    const dogsWithLinks = dogs.map(dog => ({
      ...dog,
      links: {
        self: { href: `${baseUrl}/api/dogs/${dog.id}` },
        owner: { href: `${baseUrl}/api/users/${id}` }
      }
    }));
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      data: dogsWithLinks,
      links: {
        self: { href: `${baseUrl}/api/users/${id}/dogs` },
        owner: { href: `${baseUrl}/api/users/${id}` }
      }
    });
  });

  // Get user statistics
  static getUserStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const stats = await user.getStats();
    const baseUrl = getBaseUrl(req);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          links: {
            self: { href: `${baseUrl}/api/users/${id}` }
          }
        },
        stats
      },
      links: {
        self: { href: `${baseUrl}/api/users/${id}/stats` },
        user: { href: `${baseUrl}/api/users/${id}` }
      }
    });
  });

  // Search users with pagination and links
  static searchUsers = asyncHandler(async (req, res) => {
    const { q, ...filters } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    filters.limit = limit;
    filters.offset = (page - 1) * limit;
    
    const users = await User.search(q, filters);
    
    const baseUrl = getBaseUrl(req);
    const usersWithLinks = users.map(user => ({
      ...user,
      links: {
        self: { href: `${baseUrl}/api/users/${user.id}` }
      }
    }));
    
    res.status(200).json({
      success: true,
      count: users.length,
      query: q,
      page,
      limit,
      data: usersWithLinks,
      links: {
        self: { href: `${baseUrl}/api/users/search?q=${encodeURIComponent(q)}` }
      }
    });
  });

  // Get walkers with pagination and links
  static getWalkers = asyncHandler(async (req, res) => {
    const filters = { ...req.query, role: 'walker' };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    filters.limit = limit;
    filters.offset = offset;
    
    const [walkers, total] = await Promise.all([
      User.findAll(filters),
      User.count(filters)
    ]);
    
    const baseUrl = getBaseUrl(req);
    const walkersWithLinks = walkers.map(walker => ({
      ...walker,
      links: {
        self: { href: `${baseUrl}/api/users/${walker.id}` }
      }
    }));
    
    const links = generateLinks({
      baseUrl,
      path: '/api/users/walkers',
      query: req.query,
      page,
      limit,
      total
    });
    
    res.status(200).json({
      success: true,
      count: walkers.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: walkersWithLinks,
      links
    });
  });

  // Get owners with pagination and links
  static getOwners = asyncHandler(async (req, res) => {
    const filters = { ...req.query, role: 'owner' };
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    filters.limit = limit;
    filters.offset = offset;
    
    const [owners, total] = await Promise.all([
      User.findAll(filters),
      User.count(filters)
    ]);
    
    const baseUrl = getBaseUrl(req);
    const ownersWithLinks = owners.map(owner => ({
      ...owner,
      links: {
        self: { href: `${baseUrl}/api/users/${owner.id}` }
      }
    }));
    
    const links = generateLinks({
      baseUrl,
      path: '/api/users/owners',
      query: req.query,
      page,
      limit,
      total
    });
    
    res.status(200).json({
      success: true,
      count: owners.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: ownersWithLinks,
      links
    });
  });

  // Get top-rated walkers with pagination
  static getTopWalkers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const filters = {
      role: 'walker',
      min_rating: 4.0,
      limit,
      offset
    };
    
    const [walkers, total] = await Promise.all([
      User.findAll(filters),
      User.count(filters)
    ]);
    
    const baseUrl = getBaseUrl(req);
    const walkersWithLinks = walkers.map(walker => ({
      ...walker,
      links: {
        self: { href: `${baseUrl}/api/users/${walker.id}` }
      }
    }));
    
    const links = generateLinks({
      baseUrl,
      path: '/api/users/top-walkers',
      query: req.query,
      page,
      limit,
      total
    });
    
    res.status(200).json({
      success: true,
      count: walkers.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: walkersWithLinks,
      links
    });
  });

  // Bulk user import - returns 202 Accepted with async task
  static bulkImportUsers = asyncHandler(async (req, res) => {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Users array is required and must not be empty'
      });
    }
    
    // Create async task
    const taskId = createTask('bulk_import_users', { userCount: users.length });
    
    // Generate Location header for task status
    const baseUrl = getBaseUrl(req);
    const location = `${baseUrl}/api/users/tasks/${taskId}`;
    res.set('Location', location);
    
    res.status(202).json({
      success: true,
      message: 'Bulk import task accepted',
      task: {
        id: taskId,
        status: TaskStatus.PENDING,
        type: 'bulk_import_users',
        links: {
          self: { href: location },
          status: { href: location }
        }
      }
    });
  });

  // Get async task status
  static getTaskStatus = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    
    const task = getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const baseUrl = getBaseUrl(req);
    const links = {
      self: { href: `${baseUrl}/api/users/tasks/${taskId}` }
    };
    
    // Add result link if completed
    if (task.status === TaskStatus.COMPLETED && task.result) {
      links.result = { href: `${baseUrl}/api/users/tasks/${taskId}/result` };
    }
    
    res.status(200).json({
      success: true,
      task: {
        ...task,
        links
      }
    });
  });

  // Get async task result
  static getTaskResult = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    
    const task = getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: `Task is not completed. Current status: ${task.status}`,
        task: {
          id: task.id,
          status: task.status
        }
      });
    }
    
    const baseUrl = getBaseUrl(req);
    
    res.status(200).json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        type: task.type,
        completedAt: task.updatedAt
      },
      result: task.result,
      links: {
        self: { href: `${baseUrl}/api/users/tasks/${taskId}/result` },
        task: { href: `${baseUrl}/api/users/tasks/${taskId}` }
      }
    });
  });
}

module.exports = UserController;
