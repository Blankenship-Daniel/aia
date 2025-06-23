/**
 * ICopilotDependencyService.ts - Interface for GitHub Copilot CLI dependency checking.
 *
 * Responsibilities:
 * - Checks for GitHub CLI (gh) installation and availability.
 * - Verifies GitHub Copilot CLI extension is installed and configured.
 * - Provides installation instructions for missing dependencies.
 * - Validates user authentication and access to Copilot services.
 *
 * Architecture:
 * - Service interface following SOLID principles for dependency management.
 * - Integrates with AIA's existing service architecture and DI container.
 * - Provides clear error messages and recovery instructions.
 *
 * Exports:
 * - {@link ICopilotDependencyService}: Main interface for dependency checking.
 * - {@link DependencyStatus}: Result structure with status and messages.
 *
 * @see CopilotDependencyService - Implementation of this interface.
 * @see ICopilotService - Main Copilot service that depends on these checks.
 */

export interface DependencyStatus {
  /** Whether GitHub CLI is installed and available */
  gh: boolean;
  /** Whether Copilot CLI extension is installed */
  copilot: boolean;
  /** Whether user is authenticated with GitHub */
  authenticated: boolean;
  /** Whether user has Copilot access */
  copilotAccess: boolean;
  /** Overall status message */
  message?: string;
  /** Detailed error messages if any */
  errors?: string[];
  /** Installation/setup instructions */
  instructions?: string[];
}

export interface ICopilotDependencyService {
  /**
   * Checks all GitHub Copilot CLI dependencies and returns comprehensive status.
   *
   * @returns {Promise<DependencyStatus>} Complete dependency status with installation guidance.
   *
   * @example
   * const status = await dependencyService.checkDependencies();
   * if (!status.gh) {
   *   console.log('GitHub CLI not found:', status.instructions);
   * }
   */
  checkDependencies(): Promise<DependencyStatus>;

  /**
   * Returns platform-specific installation instructions for missing dependencies.
   *
   * @param {DependencyStatus} status - Current dependency status.
   * @returns {Promise<string>} Formatted installation instructions.
   *
   * @example
   * const instructions = await dependencyService.getInstallInstructions(status);
   * console.log(instructions);
   */
  getInstallInstructions(status: DependencyStatus): Promise<string>;

  /**
   * Attempts to install GitHub CLI if not present (where possible).
   *
   * @returns {Promise<boolean>} Whether installation was successful.
   */
  attemptInstallation(): Promise<boolean>;

  /**
   * Validates that GitHub Copilot CLI is properly configured and accessible.
   *
   * @returns {Promise<boolean>} Whether Copilot CLI is ready for use.
   */
  validateCopilotSetup(): Promise<boolean>;
}
