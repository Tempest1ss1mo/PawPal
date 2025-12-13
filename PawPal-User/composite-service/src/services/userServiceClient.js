const axios = require('axios');

class UserServiceClient {
  constructor(baseURL, timeout = 5000) {
    this.client = axios.create({
      baseURL: baseURL || process.env.USER_SERVICE_URL || 'http://localhost:3001',
      timeout: timeout || parseInt(process.env.SERVICE_TIMEOUT) || 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getUserById(id) {
    try {
      const response = await this.client.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async getAllUsers(filters = {}) {
    try {
      const response = await this.client.get('/api/users', { params: filters });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async createUser(userData) {
    try {
      const response = await this.client.post('/api/users', userData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async updateUser(id, updateData) {
    try {
      const response = await this.client.put(`/api/users/${id}`, updateData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async deleteUser(id) {
    try {
      const response = await this.client.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async getUserDogs(userId) {
    try {
      const response = await this.client.get(`/api/users/${userId}/dogs`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }

  async searchUsers(searchTerm, filters = {}) {
    try {
      const response = await this.client.get('/api/users/search', {
        params: { q: searchTerm, ...filters }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data
        };
      }
      throw {
        status: 500,
        message: 'User service unavailable',
        error: error.message
      };
    }
  }
}

module.exports = UserServiceClient;

