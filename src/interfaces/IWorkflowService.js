/**
 * Workflow Service Interface
 * Defines the contract for workflow automation and macro management
 */
class IWorkflowService {
  /**
   * Initialize workflow service
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('IWorkflowService.initialize() must be implemented');
  }

  /**
   * Start recording a new workflow
   * @param {string} workflowName - Name of the workflow to record
   * @param {Object} [options] - Recording options
   * @returns {Promise<string>} Workflow ID
   */
  async startRecording(workflowName, options = {}) {
    throw new Error('IWorkflowService.startRecording() must be implemented');
  }

  /**
   * Stop recording current workflow
   * @returns {Promise<Object>} Recorded workflow data
   */
  async stopRecording() {
    throw new Error('IWorkflowService.stopRecording() must be implemented');
  }

  /**
   * Execute a saved workflow
   * @param {string} workflowName - Name of workflow to execute
   * @param {Object} [options] - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(workflowName, options = {}) {
    throw new Error('IWorkflowService.executeWorkflow() must be implemented');
  }

  /**
   * Save workflow to persistent storage
   * @param {string} workflowName - Name of workflow
   * @param {Object} workflowData - Workflow data to save
   * @returns {Promise<void>}
   */
  async saveWorkflow(workflowName, workflowData) {
    throw new Error('IWorkflowService.saveWorkflow() must be implemented');
  }

  /**
   * Load workflow from persistent storage
   * @param {string} workflowName - Name of workflow to load
   * @returns {Promise<Object>} Workflow data
   */
  async loadWorkflow(workflowName) {
    throw new Error('IWorkflowService.loadWorkflow() must be implemented');
  }

  /**
   * Delete a saved workflow
   * @param {string} workflowName - Name of workflow to delete
   * @returns {Promise<void>}
   */
  async deleteWorkflow(workflowName) {
    throw new Error('IWorkflowService.deleteWorkflow() must be implemented');
  }

  /**
   * List all available workflows
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} Array of workflow information
   */
  async listWorkflows(filters = {}) {
    throw new Error('IWorkflowService.listWorkflows() must be implemented');
  }

  /**
   * Get workflow information and metadata
   * @param {string} workflowName - Name of workflow
   * @returns {Promise<Object>} Workflow information
   */
  async getWorkflowInfo(workflowName) {
    throw new Error('IWorkflowService.getWorkflowInfo() must be implemented');
  }

  /**
   * Validate workflow structure and steps
   * @param {Object} workflowData - Workflow data to validate
   * @returns {Object} Validation result
   */
  validateWorkflow(workflowData) {
    throw new Error('IWorkflowService.validateWorkflow() must be implemented');
  }

  /**
   * Export workflow to file
   * @param {string} workflowName - Name of workflow to export
   * @param {string} filePath - Export file path
   * @param {string} [format] - Export format (json, yaml, etc.)
   * @returns {Promise<void>}
   */
  async exportWorkflow(workflowName, filePath, format = 'json') {
    throw new Error('IWorkflowService.exportWorkflow() must be implemented');
  }

  /**
   * Import workflow from file
   * @param {string} filePath - Import file path
   * @param {Object} [options] - Import options
   * @returns {Promise<string>} Imported workflow name
   */
  async importWorkflow(filePath, options = {}) {
    throw new Error('IWorkflowService.importWorkflow() must be implemented');
  }

  /**
   * Schedule workflow execution
   * @param {string} workflowName - Name of workflow to schedule
   * @param {Object} schedule - Schedule configuration
   * @returns {Promise<string>} Schedule ID
   */
  async scheduleWorkflow(workflowName, schedule) {
    throw new Error('IWorkflowService.scheduleWorkflow() must be implemented');
  }

  /**
   * Unschedule workflow execution
   * @param {string} scheduleId - Schedule ID to remove
   * @returns {Promise<void>}
   */
  async unscheduleWorkflow(scheduleId) {
    throw new Error(
      'IWorkflowService.unscheduleWorkflow() must be implemented'
    );
  }

  /**
   * Get workflow execution history
   * @param {string} [workflowName] - Specific workflow name, or all if not provided
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} Execution history
   */
  async getExecutionHistory(workflowName = null, filters = {}) {
    throw new Error(
      'IWorkflowService.getExecutionHistory() must be implemented'
    );
  }

  /**
   * Add step to current recording
   * @param {Object} step - Step data to add
   * @returns {Promise<void>}
   */
  async addStep(step) {
    throw new Error('IWorkflowService.addStep() must be implemented');
  }

  /**
   * Check if currently recording
   * @returns {boolean} True if recording is active
   */
  isRecording() {
    throw new Error('IWorkflowService.isRecording() must be implemented');
  }

  /**
   * Get current recording state
   * @returns {Object} Current recording information
   */
  getRecordingState() {
    throw new Error('IWorkflowService.getRecordingState() must be implemented');
  }
}

module.exports = IWorkflowService;
