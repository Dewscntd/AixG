/**
 * Secure Configuration Management Service
 * Manages encrypted environment variables and configuration secrets
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialVaultService } from './credential-vault.service';
import { CredentialEncryptionService } from './credential-encryption.service';

export interface SecureConfigItem {
  key: string;
  value: string;
  encrypted: boolean;
  source: 'env' | 'vault' | 'file' | 'database';
  environment: string;
  tags: string[];
  metadata: {
    description: string;
    lastUpdated: Date;
    accessCount: number;
    sensitive: boolean;
  };
}

export interface ConfigValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'json' | 'url' | 'email';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  allowedValues?: any[];
  sensitive: boolean;
}

@Injectable()
export class SecureConfigService implements OnModuleInit {
  private readonly logger = new Logger(SecureConfigService.name);
  
  private configCache = new Map<string, SecureConfigItem>();
  private validationRules = new Map<string, ConfigValidationRule>();
  private encryptedKeys = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly vaultService: CredentialVaultService,
    private readonly encryptionService: CredentialEncryptionService
  ) {}

  async onModuleInit() {
    await this.initializeSecureConfig();
  }

  /**
   * Initialize secure configuration
   */
  private async initializeSecureConfig(): Promise<void> {
    try {
      this.logger.log('Initializing secure configuration...');

      // Load validation rules
      this.loadValidationRules();

      // Load encrypted environment variables
      await this.loadEncryptedEnvironmentVariables();

      // Load configuration from Vault
      await this.loadVaultConfiguration();

      this.logger.log('Secure configuration initialized successfully');

    } catch (error) {
      this.logger.error(`Secure configuration initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load validation rules for configuration
   */
  private loadValidationRules(): void {
    const rules: ConfigValidationRule[] = [
      {
        key: 'DATABASE_URL',
        required: true,
        type: 'url',
        sensitive: true
      },
      {
        key: 'JWT_SECRET',
        required: true,
        type: 'string',
        minLength: 32,
        sensitive: true
      },
      {
        key: 'OPENAI_API_KEY',
        required: true,
        type: 'string',
        pattern: /^sk-[a-zA-Z0-9]{48}$/,
        sensitive: true
      },
      {
        key: 'PINECONE_API_KEY',
        required: true,
        type: 'string',
        sensitive: true
      },
      {
        key: 'REDIS_URL',
        required: false,
        type: 'url',
        sensitive: true
      },
      {
        key: 'STRIPE_SECRET_KEY',
        required: false,
        type: 'string',
        pattern: /^sk_(test|live)_[a-zA-Z0-9]{24,}$/,
        sensitive: true
      },
      {
        key: 'SENDGRID_API_KEY',
        required: false,
        type: 'string',
        pattern: /^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/,
        sensitive: true
      },
      {
        key: 'NODE_ENV',
        required: true,
        type: 'string',
        allowedValues: ['development', 'staging', 'production'],
        sensitive: false
      },
      {
        key: 'PORT',
        required: false,
        type: 'number',
        sensitive: false
      },
      {
        key: 'LOG_LEVEL',
        required: false,
        type: 'string',
        allowedValues: ['error', 'warn', 'info', 'debug', 'verbose'],
        sensitive: false
      }
    ];

    for (const rule of rules) {
      this.validationRules.set(rule.key, rule);
    }

    this.logger.debug(`Loaded ${rules.length} configuration validation rules`);
  }

  /**
   * Load encrypted environment variables
   */
  private async loadEncryptedEnvironmentVariables(): Promise<void> {
    try {
      const environment = this.configService.get<string>('NODE_ENV', 'development');
      
      // Look for encrypted environment variables (prefixed with ENC_)
      const encryptedVars = Object.keys(process.env)
        .filter(key => key.startsWith('ENC_'))
        .map(key => ({ key: key.substring(4), encryptedValue: process.env[key]! }));

      for (const { key, encryptedValue } of encryptedVars) {
        try {
          // Decrypt the environment variable
          const decryptedValue = await this.encryptionService.decryptField(encryptedValue);
          
          const configItem: SecureConfigItem = {
            key,
            value: decryptedValue,
            encrypted: true,
            source: 'env',
            environment,
            tags: ['encrypted', 'environment'],
            metadata: {
              description: `Encrypted environment variable: ${key}`,
              lastUpdated: new Date(),
              accessCount: 0,
              sensitive: this.isSensitiveKey(key)
            }
          };

          this.configCache.set(key, configItem);
          this.encryptedKeys.add(key);

          this.logger.debug(`Loaded encrypted environment variable: ${key}`);

        } catch (error) {
          this.logger.error(`Failed to decrypt environment variable ${key}: ${error.message}`);
        }
      }

      this.logger.log(`Loaded ${encryptedVars.length} encrypted environment variables`);

    } catch (error) {
      this.logger.error(`Failed to load encrypted environment variables: ${error.message}`);
    }
  }

  /**
   * Load configuration from Vault
   */
  private async loadVaultConfiguration(): Promise<void> {
    try {
      const environment = this.configService.get<string>('NODE_ENV', 'development');
      const configPaths = [
        `config/${environment}/database`,
        `config/${environment}/api-keys`,
        `config/${environment}/secrets`,
        `config/shared/global`
      ];

      for (const path of configPaths) {
        try {
          const secretResponse = await this.vaultService.getSecret(path);
          
          if (secretResponse.success && secretResponse.data) {
            for (const [key, value] of Object.entries(secretResponse.data)) {
              const configItem: SecureConfigItem = {
                key,
                value: String(value),
                encrypted: true,
                source: 'vault',
                environment,
                tags: ['vault', 'config', environment],
                metadata: {
                  description: `Vault configuration: ${path}/${key}`,
                  lastUpdated: new Date(secretResponse.metadata?.createdAt || Date.now()),
                  accessCount: 0,
                  sensitive: this.isSensitiveKey(key)
                }
              };

              this.configCache.set(key, configItem);
              this.logger.debug(`Loaded configuration from Vault: ${key}`);
            }
          }

        } catch (error) {
          this.logger.warn(`Failed to load Vault configuration from ${path}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`Failed to load Vault configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration value with automatic decryption
   */
  public get<T = string>(key: string, defaultValue?: T): T {
    try {
      // Check cache first
      const cached = this.configCache.get(key);
      if (cached) {
        cached.metadata.accessCount++;
        return this.parseConfigValue(cached.value, cached.key) as T;
      }

      // Fall back to standard config service
      const value = this.configService.get<T>(key, defaultValue);
      
      // Cache non-sensitive values
      if (value !== undefined && !this.isSensitiveKey(key)) {
        const configItem: SecureConfigItem = {
          key,
          value: String(value),
          encrypted: false,
          source: 'env',
          environment: this.configService.get<string>('NODE_ENV', 'development'),
          tags: ['standard', 'environment'],
          metadata: {
            description: `Standard environment variable: ${key}`,
            lastUpdated: new Date(),
            accessCount: 1,
            sensitive: false
          }
        };

        this.configCache.set(key, configItem);
      }

      return value as T;

    } catch (error) {
      this.logger.error(`Failed to get configuration value for ${key}: ${error.message}`);
      return defaultValue as T;
    }
  }

  /**
   * Set encrypted configuration value
   */
  public async setEncrypted(
    key: string,
    value: string,
    source: SecureConfigItem['source'] = 'vault',
    tags: string[] = []
  ): Promise<void> {
    try {
      const environment = this.configService.get<string>('NODE_ENV', 'development');

      if (source === 'vault') {
        // Store in Vault
        const path = `config/${environment}/runtime`;
        await this.vaultService.storeSecret(path, { [key]: value });
      } else {
        // Store locally encrypted
        const encryptedValue = await this.encryptionService.encryptField(value, key, 'config');
        
        // In a real implementation, this would update the environment or config file
        this.logger.debug(`Encrypted value stored for key: ${key}`);
      }

      // Update cache
      const configItem: SecureConfigItem = {
        key,
        value,
        encrypted: true,
        source,
        environment,
        tags: [...tags, 'encrypted', source],
        metadata: {
          description: `Encrypted configuration: ${key}`,
          lastUpdated: new Date(),
          accessCount: 0,
          sensitive: this.isSensitiveKey(key)
        }
      };

      this.configCache.set(key, configItem);
      this.encryptedKeys.add(key);

      this.logger.log(`Encrypted configuration value set: ${key}`);

    } catch (error) {
      this.logger.error(`Failed to set encrypted configuration value: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate configuration against rules
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, rule] of this.validationRules) {
      try {
        const value = this.get(key);

        // Check if required
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`Required configuration key missing: ${key}`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          // Validate type
          if (!this.validateType(value, rule.type)) {
            errors.push(`Invalid type for ${key}: expected ${rule.type}`);
          }

          // Validate pattern
          if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
            errors.push(`Invalid format for ${key}: does not match required pattern`);
          }

          // Validate length
          if (typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
              errors.push(`${key} is too short: minimum length is ${rule.minLength}`);
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              errors.push(`${key} is too long: maximum length is ${rule.maxLength}`);
            }
          }

          // Validate allowed values
          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push(`Invalid value for ${key}: must be one of ${rule.allowedValues.join(', ')}`);
          }
        }

      } catch (error) {
        errors.push(`Validation error for ${key}: ${error.message}`);
      }
    }

    const valid = errors.length === 0;

    if (valid) {
      this.logger.log('Configuration validation passed');
    } else {
      this.logger.error(`Configuration validation failed: ${errors.length} errors`);
      errors.forEach(error => this.logger.error(`  - ${error}`));
    }

    return { valid, errors };
  }

  /**
   * Get configuration statistics
   */
  public getConfigurationStats(): any {
    const totalConfigs = this.configCache.size;
    const encryptedConfigs = this.encryptedKeys.size;
    const sensitiveConfigs = Array.from(this.configCache.values())
      .filter(config => config.metadata.sensitive).length;

    const sourceBreakdown = Array.from(this.configCache.values())
      .reduce((acc, config) => {
        acc[config.source] = (acc[config.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalAccesses = Array.from(this.configCache.values())
      .reduce((sum, config) => sum + config.metadata.accessCount, 0);

    return {
      total: totalConfigs,
      encrypted: encryptedConfigs,
      sensitive: sensitiveConfigs,
      sourceBreakdown,
      totalAccesses,
      validationRules: this.validationRules.size,
      lastValidation: new Date()
    };
  }

  /**
   * Export configuration (with sensitive values masked)
   */
  public exportConfiguration(includeSensitive: boolean = false): Record<string, any> {
    const exported: Record<string, any> = {};

    for (const [key, config] of this.configCache) {
      if (config.metadata.sensitive && !includeSensitive) {
        exported[key] = '***REDACTED***';
      } else {
        exported[key] = {
          value: config.value,
          source: config.source,
          encrypted: config.encrypted,
          tags: config.tags,
          lastUpdated: config.metadata.lastUpdated,
          accessCount: config.metadata.accessCount
        };
      }
    }

    return exported;
  }

  /**
   * Refresh configuration from sources
   */
  public async refreshConfiguration(): Promise<void> {
    try {
      this.logger.log('Refreshing configuration...');

      // Clear cache
      this.configCache.clear();
      this.encryptedKeys.clear();

      // Reload from sources
      await this.loadEncryptedEnvironmentVariables();
      await this.loadVaultConfiguration();

      // Validate after refresh
      this.validateConfiguration();

      this.logger.log('Configuration refreshed successfully');

    } catch (error) {
      this.logger.error(`Configuration refresh failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /auth/i,
      /private/i,
      /ssl/i,
      /cert/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' || !isNaN(Number(value));
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false';
      case 'json':
        try {
          JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      case 'url':
        try {
          new URL(String(value));
          return true;
        } catch {
          return false;
        }
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }

  private parseConfigValue(value: string, key: string): any {
    // Try to parse as JSON if it looks like JSON
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Parse boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numbers
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }

    return value;
  }
}