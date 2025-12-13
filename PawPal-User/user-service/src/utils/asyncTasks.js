/**
 * Async task manager for 202 Accepted responses
 * Stores task status in memory (in production, use Redis or database)
 */

const tasks = new Map();

/**
 * Task statuses
 */
const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Create a new async task
 * @param {string} type - Task type
 * @param {Object} data - Task data
 * @returns {string} Task ID
 */
function createTask(type, data) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  tasks.set(taskId, {
    id: taskId,
    type,
    status: TaskStatus.PENDING,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null
  });
  
  // Simulate async processing
  processTaskAsync(taskId);
  
  return taskId;
}

/**
 * Get task status
 * @param {string} taskId - Task ID
 * @returns {Object|null} Task object or null if not found
 */
function getTask(taskId) {
  return tasks.get(taskId) || null;
}

/**
 * Update task status
 * @param {string} taskId - Task ID
 * @param {string} status - New status
 * @param {any} result - Task result (optional)
 * @param {string} error - Error message (optional)
 */
function updateTask(taskId, status, result = null, error = null) {
  const task = tasks.get(taskId);
  if (task) {
    task.status = status;
    task.result = result;
    task.error = error;
    task.updatedAt = new Date().toISOString();
  }
}

/**
 * Simulate async task processing
 * @param {string} taskId - Task ID
 */
async function processTaskAsync(taskId) {
  const task = tasks.get(taskId);
  if (!task) return;
  
  // Update to processing
  updateTask(taskId, TaskStatus.PROCESSING);
  
  // Simulate processing delay (2-5 seconds)
  const delay = 2000 + Math.random() * 3000;
  
  setTimeout(() => {
    try {
      // Simulate task completion
      // In real implementation, this would do actual work
      const result = {
        message: `Task ${task.type} completed successfully`,
        taskId,
        completedAt: new Date().toISOString()
      };
      
      updateTask(taskId, TaskStatus.COMPLETED, result);
    } catch (error) {
      updateTask(taskId, TaskStatus.FAILED, null, error.message);
    }
  }, delay);
}

/**
 * Clean up old completed tasks (older than 1 hour)
 */
function cleanupOldTasks() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  for (const [taskId, task] of tasks.entries()) {
    const taskTime = new Date(task.createdAt).getTime();
    if (task.status === TaskStatus.COMPLETED && taskTime < oneHourAgo) {
      tasks.delete(taskId);
    }
  }
}

// Clean up old tasks every 30 minutes
setInterval(cleanupOldTasks, 30 * 60 * 1000);

module.exports = {
  createTask,
  getTask,
  updateTask,
  TaskStatus
};

