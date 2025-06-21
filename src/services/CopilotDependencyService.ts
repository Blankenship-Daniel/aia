/**
 * CopilotDependencyService.ts - Implementation for GitHub Copilot CLI dependency checking.
 *
 * Responsibilities:
 * - Verifies GitHub CLI installation and Copilot extension availability.
 * - Checks user authentication and Copilot access permissions.
 * - Provides detailed installation instructions for missing dependencies.
 * - Supports multiple platforms (macOS, Linux, Windows) with appropriate commands.
 *
 * Architecture:
 * - Implements ICopilotDependencyService following SOLID principles.
 * - Uses child_process for executing system commands safely.
 * - Provides comprehensive error handling and user guidance.
 * - Integrates with AIA's logging and configuration systems.
 *
 * @see ICopilotDependencyService - Interface definition for this service.
 * @see CopilotService - Main service that depends on these checks.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import {
  ICopilotDependencyService,
  DependencyStatus,
} from '../interfaces/ICopilotDependencyService';

export class CopilotDependencyService implements ICopilotDependencyService {
  private execAsync = promisify(exec);
  private readonly TIMEOUT_MS = 15000; // 15 second timeout for dependency checks (increased for reliability)

  /**
   * Checks all GitHub Copilot CLI dependencies comprehensively.
   */
  async checkDependencies(): Promise<DependencyStatus> {
    const status: DependencyStatus = {
      gh: false,
      copilot: false,
      authenticated: false,
      copilotAccess: false,
      errors: [],
      instructions: [],
    };

    try {
      // Check if GitHub CLI is installed
      status.gh = await this.checkGitHubCLI();
      if (!status.gh) {
        status.errors?.push('GitHub CLI (gh) is not installed or not in PATH');
        status.instructions?.push(await this.getGitHubCLIInstallInstructions());
        status.message = 'GitHub CLI is required but not found';
        return status;
      }

      // Check if Copilot extension is installed
      status.copilot = await this.checkCopilotExtension();
      if (!status.copilot) {
        status.errors?.push('GitHub Copilot CLI extension is not installed');
        status.instructions?.push(
          'Install Copilot CLI: gh extension install github/gh-copilot'
        );
        status.message = 'GitHub Copilot CLI extension is not installed';
        return status;
      }

      // Check authentication
      status.authenticated = await this.checkAuthentication();
      if (!status.authenticated) {
        status.errors?.push('Not authenticated with GitHub');
        status.instructions?.push('Authenticate with GitHub: gh auth login');
        status.message = 'GitHub authentication required';
        return status;
      }

      // Check Copilot access
      status.copilotAccess = await this.checkCopilotAccess();
      if (!status.copilotAccess) {
        status.errors?.push('No access to GitHub Copilot');
        status.instructions?.push(
          'Ensure you have a GitHub Copilot subscription'
        );
        status.message = 'GitHub Copilot access required';
        return status;
      }

      status.message = 'All dependencies are available and configured';
      return status;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      status.errors?.push(`Dependency check failed: ${errorMessage}`);
      status.message = 'Unable to verify dependencies';
      return status;
    }
  }

  /**
   * Returns platform-specific installation instructions.
   */
  async getInstallInstructions(status: DependencyStatus): Promise<string> {
    const instructions: string[] = [];
    const currentPlatform = platform();

    if (!status.gh) {
      instructions.push('📦 Install GitHub CLI:');
      switch (currentPlatform) {
        case 'darwin': // macOS
          instructions.push('  • Using Homebrew: brew install gh');
          instructions.push('  • Using MacPorts: sudo port install gh');
          instructions.push(
            '  • Download from: https://github.com/cli/cli/releases'
          );
          break;
        case 'linux':
          instructions.push('  • Ubuntu/Debian: sudo apt install gh');
          instructions.push('  • RHEL/CentOS: sudo dnf install gh');
          instructions.push('  • Arch Linux: sudo pacman -S github-cli');
          instructions.push(
            '  • Download from: https://github.com/cli/cli/releases'
          );
          break;
        case 'win32':
          instructions.push('  • Using Chocolatey: choco install gh');
          instructions.push('  • Using Scoop: scoop install gh');
          instructions.push(
            '  • Download from: https://github.com/cli/cli/releases'
          );
          break;
        default:
          instructions.push(
            '  • Download from: https://github.com/cli/cli/releases'
          );
      }
      instructions.push('');
    }

    if (status.gh && !status.copilot) {
      instructions.push('🤖 Install GitHub Copilot CLI:');
      instructions.push('  gh extension install github/gh-copilot');
      instructions.push('');
    }

    if (status.gh && !status.authenticated) {
      instructions.push('🔐 Authenticate with GitHub:');
      instructions.push('  gh auth login');
      instructions.push('  Follow the prompts to authenticate');
      instructions.push('');
    }

    if (status.authenticated && !status.copilotAccess) {
      instructions.push('💡 Enable GitHub Copilot:');
      instructions.push('  • Visit: https://github.com/settings/copilot');
      instructions.push('  • Subscribe to GitHub Copilot');
      instructions.push('  • Ensure your account has access');
      instructions.push('');
    }

    if (instructions.length === 0) {
      return '✅ All dependencies are properly installed and configured!';
    }

    instructions.unshift('GitHub Copilot CLI Setup Instructions:');
    instructions.unshift('');
    instructions.push(
      'After installation, restart your terminal and run: aia copilot-check'
    );

    return instructions.join('\\n');
  }

  /**
   * Attempts automatic installation where possible.
   */
  async attemptInstallation(): Promise<boolean> {
    try {
      const currentPlatform = platform();

      // Only attempt GitHub CLI installation on supported platforms
      if (currentPlatform === 'darwin' && (await this.hasHomebrew())) {
        await this.execAsync('brew install gh', { timeout: this.TIMEOUT_MS });
        return await this.checkGitHubCLI();
      }

      if (currentPlatform === 'linux' && (await this.hasApt())) {
        await this.execAsync('sudo apt update && sudo apt install -y gh', {
          timeout: this.TIMEOUT_MS,
        });
        return await this.checkGitHubCLI();
      }

      // For other platforms or if package managers aren't available,
      // return false to indicate manual installation is required
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn('Automatic installation failed:', errorMessage);
      return false;
    }
  }

  /**
   * Validates that Copilot setup is complete and functional.
   */
  async validateCopilotSetup(): Promise<boolean> {
    try {
      // Test a simple Copilot command to ensure it's working
      await this.execAsync('gh copilot --help', { timeout: this.TIMEOUT_MS });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private helper methods
   */

  private async checkGitHubCLI(): Promise<boolean> {
    try {
      const { stdout } = await this.execAsync('gh --version', {
        timeout: this.TIMEOUT_MS,
      });
      return stdout.includes('gh version');
    } catch (error) {
      return false;
    }
  }

  private async checkCopilotExtension(): Promise<boolean> {
    try {
      const { stdout } = await this.execAsync('gh extension list', {
        timeout: this.TIMEOUT_MS,
      });
      return stdout.includes('github/gh-copilot');
    } catch (error) {
      return false;
    }
  }

  private async checkAuthentication(): Promise<boolean> {
    try {
      const { stdout } = await this.execAsync('gh auth status', {
        timeout: this.TIMEOUT_MS,
      });
      const isAuthenticated = stdout.includes('Logged in to github.com');

      // Log authentication status for debugging
      if (!isAuthenticated) {
        console.log(
          `Debug: gh auth status returned: ${JSON.stringify(
            stdout.substring(0, 100)
          )}`
        );
      }

      return isAuthenticated;
    } catch (error) {
      // Log authentication check failures for debugging
      console.log(
        `Debug: gh auth status failed: ${
          error instanceof Error ? error.message : error
        }`
      );
      return false;
    }
  }

  private async checkCopilotAccess(): Promise<boolean> {
    try {
      // Try to run a simple copilot command to check access
      await this.execAsync('gh copilot --help', { timeout: this.TIMEOUT_MS });
      return true;
    } catch (error) {
      // If help command fails, user likely doesn't have Copilot access
      return false;
    }
  }

  private async hasHomebrew(): Promise<boolean> {
    try {
      await this.execAsync('which brew', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async hasApt(): Promise<boolean> {
    try {
      await this.execAsync('which apt', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getGitHubCLIInstallInstructions(): Promise<string> {
    const currentPlatform = platform();
    switch (currentPlatform) {
      case 'darwin':
        return 'Install with: brew install gh';
      case 'linux':
        return 'Install with: sudo apt install gh (or your package manager)';
      case 'win32':
        return 'Install with: choco install gh (or download from GitHub)';
      default:
        return 'Download from: https://github.com/cli/cli/releases';
    }
  }
}
