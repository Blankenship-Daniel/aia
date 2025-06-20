/**
 * Configuration Validator Interface
 * SOLID SRP: Handles only configuration validation logic
 * SOLID OCP: Can be extended with new validation rules
 * SOLID LSP: All implementations must be substitutable
 * SOLID ISP: Focused only on validation operations
 * SOLID DIP: ConfigurationService depends on this abstraction
 */

export interface IConfigurationValidator {
  /**
   * Validate API key format for a specific provider
   * @param key API key to validate
   * @param provider Provider name (openai, anthropic, etc.)
   * @returns True if key format is valid
   */
  validateApiKey(key: string, provider: string): boolean;

  /**
   * Validate model name for a specific provider
   * @param model Model name to validate
   * @param provider Provider name
   * @returns True if model is valid for provider
   */
  validateModel(model: string, provider: string): boolean;

  /**
   * Validate complete configuration object
   * @param config Configuration to validate
   * @returns Validation result with errors
   */
  validateConfiguration(config: any): ValidationResult;

  /**
   * Get supported models for a provider
   * @param provider Provider name
   * @returns Array of supported model names
   */
  getSupportedModels(provider: string): string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
