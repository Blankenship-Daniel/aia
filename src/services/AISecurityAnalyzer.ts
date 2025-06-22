/**
 * AISecurityAnalyzer.ts - AI-powered security analysis service
 *
 * Responsibilities:
 * - Provides intelligent, context-aware security analysis of commands
 * - Reduces false positives through intent understanding
 * - Suggests safer alternatives and modifications
 * - Learns from user feedback to improve accuracy
 *
 * Architecture:
 * - Integrates with IAIService for AI model interactions
 * - Maintains compatibility with existing SecurityValidator
 * - Implements caching for improved performance
 * - Supports fallback to regex-based validation
 */

import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import {
  IAISecurityAnalyzer,
  SecurityContext,
  AISecurityAnalysis,
  SecurityAnalysisOptions,
} from '../interfaces/IAISecurityAnalyzer';
import { ContextInfo } from '../types/index';

/**
 * AISecurityAnalyzer class
 * 
 * TODO: Add class description
 */
export class AISecurityAnalyzer implements IAISecurityAnalyzer {
  private readonly ANALYSIS_TIMEOUT_MS = 5000; // 5 second timeout
  private readonly CONFIDENCE_THRESHOLD = 0.7; // Minimum confidence for AI analysis
  private analysisCache = new Map<
    string,
    { analysis: AISecurityAnalysis; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  constructor(
    private aiService: IAIService,
    private contextService: IContextService
  ) {
    if (!aiService) {
      throw new Error(
        'AI service is required for AI-powered security analysis'
      );
    }
    if (!contextService) {
      throw new Error(
        'Context service is required for AI-powered security analysis'
      );
    }
  }

  async analyzeCommand(
    command: string,
    context: SecurityContext,
    options: SecurityAnalysisOptions = {}
  ): Promise<AISecurityAnalysis> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(command, context);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build AI analysis prompt
      const prompt = this.buildSecurityAnalysisPrompt(
        command,
        context,
        options
      );

      // Get current context for enhanced analysis
      const currentContext = await this.contextService.gatherContext();

      // Query AI service with timeout
      const aiResponse = await Promise.race([
        this.aiService.queryAI(prompt, currentContext),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('AI security analysis timeout')),
            this.ANALYSIS_TIMEOUT_MS
          )
        ),
      ]);

      // Parse and validate AI response
      const analysis = this.parseSecurityResponse(aiResponse);

      // Validate analysis confidence
      if (analysis.confidence < this.CONFIDENCE_THRESHOLD) {
        throw new Error(
          `AI security analysis confidence too low: ${analysis.confidence}. ` +
            'AIA CLI requires high-confidence security analysis to function properly.'
        );
      }

      // Cache the result
      this.cacheAnalysis(cacheKey, analysis);

      return analysis;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `🚨 AI security analysis failed: ${errorMessage}\n` +
          '   AIA CLI requires AI-powered security validation to function safely.\n' +
          '   Please ensure your AI service is properly configured.\n\n' +
          'To fix this:\n' +
          "1. Run 'aia config' to verify your AI API keys\n" +
          '2. Check your internet connection\n' +
          '3. Ensure your API key has sufficient credits'
      );
    }
  }

  async analyzeCommands(
    commands: string[],
    context: SecurityContext,
    options: SecurityAnalysisOptions = {}
  ): Promise<AISecurityAnalysis[]> {
    const analyses = await Promise.all(
      commands.map((command) => this.analyzeCommand(command, context, options))
    );
    return analyses;
  }

  async provideFeedback(
    command: string,
    analysis: AISecurityAnalysis,
    userFeedback: 'correct' | 'false_positive' | 'false_negative',
    userComment?: string
  ): Promise<void> {
    try {
      const feedbackPrompt = this.buildFeedbackPrompt(
        command,
        analysis,
        userFeedback,
        userComment
      );

      // Get current context for feedback
      const currentContext = await this.contextService.gatherContext();

      // Send feedback to AI service for learning (if supported)
      await this.aiService.queryAI(feedbackPrompt, currentContext);

      // Clear relevant cache entries to ensure updated analysis
      this.clearRelatedCache(command);
    } catch (error) {
      // Feedback is non-critical, log but don't throw
      console.warn('Failed to provide AI security feedback:', error);
    }
  }

  async getSaferAlternatives(
    command: string,
    context: SecurityContext
  ): Promise<string[]> {
    try {
      const prompt = this.buildAlternativesPrompt(command, context);
      const currentContext = await this.contextService.gatherContext();

      const aiResponse = await this.aiService.queryAI(prompt, currentContext);
      return this.parseAlternativesResponse(aiResponse);
    } catch (error) {
      console.warn('Failed to get AI-powered safer alternatives:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Handles isAvailable operation
   * 
   * @returns Promise<boolean> - Return value description
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple, safe command
      const testAnalysis = await this.analyzeCommand('ls -la', {
        workingDirectory: '/tmp',
        userRole: 'user',
      });
      return testAnalysis.confidence >= this.CONFIDENCE_THRESHOLD;
    } catch (error) {
      return false;
    }
  }

  private buildSecurityAnalysisPrompt(
    command: string,
    context: SecurityContext,
    options: SecurityAnalysisOptions
  ): string {
    return `
Analyze this command for security threats with context awareness:

Command: "${command}"

Context:
- Working Directory: ${context.workingDirectory || 'unknown'}
- User Role: ${context.userRole || 'standard'}
- Project Type: ${context.projectType || 'unknown'}
- Environment: ${context.environment || 'unknown'}
- Recent Commands: ${context.recentHistory?.slice(-3).join(', ') || 'none'}

Consider these factors:
1. Command intent and legitimate use cases
2. Potential for system damage or data exposure
3. Context appropriateness (e.g., development vs production)
4. False positive likelihood for legitimate development tasks

Analyze for:
- Command injection vulnerabilities
- File system manipulation risks
- Network security implications
- Privilege escalation attempts
- Data exfiltration potential

Respond with JSON in this exact format:
{
  "threat_level": "low|medium|high|critical",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of the security assessment",
  "context_factors": ["factor1", "factor2"],
  "recommended_action": "allow|warn|block|modify",
  "suggested_modification": "safer alternative if applicable",
  "false_positive_likelihood": 0.1,
  "security_score": 85
}

Be especially careful to distinguish between:
- Legitimate development commands (find, grep, awk) vs actual threats
- Context-appropriate admin commands vs unauthorized escalation
- Standard file operations vs malicious file manipulation`;
  }

  private buildFeedbackPrompt(
    command: string,
    analysis: AISecurityAnalysis,
    feedback: string,
    comment?: string
  ): string {
    return `
User feedback on security analysis:

Command: "${command}"
Previous Analysis: ${JSON.stringify(analysis, null, 2)}
User Feedback: ${feedback}
User Comment: ${comment || 'none'}

Please learn from this feedback to improve future security analysis accuracy.
${
  feedback === 'false_positive'
    ? 'This command was incorrectly flagged as dangerous.'
    : ''
}
${
  feedback === 'false_negative'
    ? 'This command should have been flagged as dangerous.'
    : ''
}
`;
  }

  private buildAlternativesPrompt(
    command: string,
    context: SecurityContext
  ): string {
    return `
Suggest safer alternatives for this command:

Command: "${command}"
Context: ${JSON.stringify(context, null, 2)}

Provide 2-3 safer alternatives that accomplish the same goal.
Respond with JSON array of strings:
["alternative1", "alternative2", "alternative3"]
`;
  }

  /**
   * Parses securityresponse
   * 
   * @param aiResponse - Parameter description
   * 
   * @returns AISecurityAnalysis - Return value description
   */
  private parseSecurityResponse(aiResponse: any): AISecurityAnalysis {
    try {
      let content = aiResponse.content || aiResponse;

      // Handle different response formats
      if (typeof content === 'string') {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1];
        }
        content = JSON.parse(content);
      }

      // Validate required fields
      const analysis: AISecurityAnalysis = {
        threat_level: content.threat_level || 'medium',
        confidence: content.confidence || 0.5,
        reasoning: content.reasoning || 'AI analysis completed',
        context_factors: content.context_factors || [],
        recommended_action: content.recommended_action || 'warn',
        suggested_modification: content.suggested_modification,
        false_positive_likelihood: content.false_positive_likelihood || 0.5,
        security_score: content.security_score || 50,
      };

      // Validate enum values
      if (
        !['low', 'medium', 'high', 'critical'].includes(analysis.threat_level)
      ) {
        analysis.threat_level = 'medium';
      }

      if (
        !['allow', 'warn', 'block', 'modify'].includes(
          analysis.recommended_action
        )
      ) {
        analysis.recommended_action = 'warn';
      }

      // Ensure confidence is in valid range
      analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));
      analysis.security_score = Math.max(
        0,
        Math.min(100, analysis.security_score)
      );

      return analysis;
    } catch (error) {
      throw new Error(
        `Failed to parse AI security analysis response: ${error}`
      );
    }
  }

  /**
   * Parses alternativesresponse
   * 
   * @param aiResponse - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private parseAlternativesResponse(aiResponse: any): string[] {
    try {
      let content = aiResponse.content || aiResponse;

      if (typeof content === 'string') {
        // Try to extract JSON array
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: split by lines and clean
          return content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('```'))
            .slice(0, 3);
        }
      }

      return Array.isArray(content) ? content.slice(0, 3) : [];
    } catch (error) {
      console.warn('Failed to parse alternatives response:', error);
      return [];
    }
  }

  /**
   * Generates cachekey
   * 
   * @param command - Parameter description
   * @param context - Parameter description
   * 
   * @returns string - Return value description
   */
  private generateCacheKey(command: string, context: SecurityContext): string {
    const contextStr = JSON.stringify({
      wd: context.workingDirectory,
      role: context.userRole,
      type: context.projectType,
      env: context.environment,
    });
    return `${command}:${contextStr}`;
  }

  /**
   * Gets fromcache
   * 
   * @param key - Parameter description
   * 
   * @returns AISecurityAnalysis | null - Return value description
   */
  private getFromCache(key: string): AISecurityAnalysis | null {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.analysis;
    }
    if (cached) {
      this.analysisCache.delete(key); // Remove expired cache
    }
    return null;
  }

  /**
   * Handles cacheAnalysis operation
   * 
   * @param key - Parameter description
   * @param analysis - Parameter description
   */
  private cacheAnalysis(key: string, analysis: AISecurityAnalysis): void {
    this.analysisCache.set(key, {
      analysis,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.analysisCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.analysisCache.entries()) {
        if (now - v.timestamp > this.CACHE_TTL_MS) {
          this.analysisCache.delete(k);
        }
      }
    }
  }

  /**
   * Handles clearRelatedCache operation
   * 
   * @param command - Parameter description
   */
  private clearRelatedCache(command: string): void {
    for (const key of this.analysisCache.keys()) {
      if (key.startsWith(command + ':')) {
        this.analysisCache.delete(key);
      }
    }
  }
}
