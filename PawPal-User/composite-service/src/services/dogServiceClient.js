const axios = require('axios');

class DogServiceClient {
  constructor(baseURL, timeout = 5000) {
    this.client = axios.create({
      baseURL: baseURL || process.env.DOG_SERVICE_URL || 'http://localhost:3001',
      timeout: timeout || parseInt(process.env.SERVICE_TIMEOUT) || 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getDogById(id) {
    try {
      const response = await this.client.get(`/api/dogs/${id}`);
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async getAllDogs(filters = {}) {
    try {
      const response = await this.client.get('/api/dogs', { params: filters });
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async createDog(dogData) {
    try {
      const response = await this.client.post('/api/dogs', dogData);
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async updateDog(id, updateData) {
    try {
      const response = await this.client.put(`/api/dogs/${id}`, updateData);
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async deleteDog(id) {
    try {
      const response = await this.client.delete(`/api/dogs/${id}`);
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async getDogsByOwner(ownerId) {
    try {
      const response = await this.client.get(`/api/dogs/owner/${ownerId}`);
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }

  async searchDogs(searchTerm, filters = {}) {
    try {
      const response = await this.client.get('/api/dogs/search', {
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
        message: 'Dog service unavailable',
        error: error.message
      };
    }
  }
}

module.exports = DogServiceClient;

