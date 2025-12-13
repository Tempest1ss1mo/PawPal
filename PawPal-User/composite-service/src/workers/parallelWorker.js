const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

/**
 * Worker thread for parallel API calls
 * Handles fetching data from atomic services in parallel
 */
async function executeTask() {
  const { taskType, config } = workerData;
  
  try {
    let result;
    
    switch (taskType) {
      case 'fetchUser':
        result = await fetchUser(config);
        break;
      case 'fetchDogs':
        result = await fetchDogs(config);
        break;
      case 'fetchUserStats':
        result = await fetchUserStats(config);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
    
    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ 
      success: false, 
      error: {
        message: error.message,
        status: error.status || 500,
        data: error.data
      }
    });
  }
}

async function fetchUser(config) {
  const { userId, baseURL, timeout } = config;
  const client = axios.create({
    baseURL: baseURL || 'http://localhost:3001',
    timeout: timeout || 5000
  });
  
  const response = await client.get(`/api/users/${userId}`);
  return response.data;
}

async function fetchDogs(config) {
  const { ownerId, baseURL, timeout } = config;
  const client = axios.create({
    baseURL: baseURL || 'http://localhost:3001',
    timeout: timeout || 5000
  });
  
  const response = await client.get(`/api/dogs/owner/${ownerId}`);
  return response.data;
}

async function fetchUserStats(config) {
  const { userId, baseURL, timeout } = config;
  const client = axios.create({
    baseURL: baseURL || 'http://localhost:3001',
    timeout: timeout || 5000
  });
  
  const response = await client.get(`/api/users/${userId}/stats`);
  return response.data;
}

// Execute the task when worker receives data
executeTask();

