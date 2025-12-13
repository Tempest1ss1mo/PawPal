const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Utility for executing tasks in parallel using worker threads
 */
class ParallelExecutor {
  constructor() {
    this.workerPath = path.join(__dirname, '../workers/parallelWorker.js');
  }

  /**
   * Execute multiple tasks in parallel using worker threads
   * @param {Array} tasks - Array of task configurations
   * @returns {Promise<Array>} - Array of results in the same order as tasks
   */
  async executeParallel(tasks) {
    const workers = tasks.map(task => this.createWorker(task));
    
    try {
      const results = await Promise.all(
        workers.map(worker => this.waitForWorker(worker))
      );
      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a worker thread for a task
   * @param {Object} task - Task configuration
   * @returns {Worker} - Worker thread instance
   */
  createWorker(task) {
    const worker = new Worker(this.workerPath, {
      workerData: task
    });

    return worker;
  }

  /**
   * Wait for a worker to complete and return result
   * @param {Worker} worker - Worker thread instance
   * @returns {Promise} - Task result
   */
  waitForWorker(worker) {
    return new Promise((resolve, reject) => {
      worker.on('message', (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
        worker.terminate();
      });

      worker.on('error', (error) => {
        reject({
          message: error.message,
          status: 500
        });
        worker.terminate();
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject({
            message: `Worker stopped with exit code ${code}`,
            status: 500
          });
        }
      });
    });
  }

  /**
   * Execute user and dogs fetch in parallel
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} - Combined result with user and dogs
   */
  async fetchUserWithDogs(userId, userServiceURL, dogServiceURL) {
    const tasks = [
      {
        taskType: 'fetchUser',
        config: {
          userId,
          baseURL: userServiceURL || process.env.USER_SERVICE_URL,
          timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
        }
      },
      {
        taskType: 'fetchDogs',
        config: {
          ownerId: userId,
          baseURL: dogServiceURL || process.env.DOG_SERVICE_URL,
          timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
        }
      }
    ];

    const [userResult, dogsResult] = await this.executeParallel(tasks);
    
    return {
      user: userResult.data || userResult,
      dogs: dogsResult.data || dogsResult
    };
  }

  /**
   * Execute user, dogs, and stats fetch in parallel
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} - Combined result
   */
  async fetchUserComplete(userId, userServiceURL, dogServiceURL) {
    const tasks = [
      {
        taskType: 'fetchUser',
        config: {
          userId,
          baseURL: userServiceURL || process.env.USER_SERVICE_URL,
          timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
        }
      },
      {
        taskType: 'fetchDogs',
        config: {
          ownerId: userId,
          baseURL: dogServiceURL || process.env.DOG_SERVICE_URL,
          timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
        }
      },
      {
        taskType: 'fetchUserStats',
        config: {
          userId,
          baseURL: userServiceURL || process.env.USER_SERVICE_URL,
          timeout: parseInt(process.env.SERVICE_TIMEOUT) || 5000
        }
      }
    ];

    const [userResult, dogsResult, statsResult] = await this.executeParallel(tasks);
    
    return {
      user: userResult.data || userResult,
      dogs: dogsResult.data || dogsResult,
      stats: statsResult.data || statsResult
    };
  }
}

module.exports = new ParallelExecutor();

