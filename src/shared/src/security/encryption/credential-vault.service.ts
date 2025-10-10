/**
 * Credential Vault Service
 * Secure vault for external API keys, secrets, and credentials with HashiCorp Vault integration
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecureCredentialStorageService, StoredCredential } from './secure-credential-storage.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { KeyManagementService } from './key-management.service';

export interface VaultSecret {
  id: string;
  path: string;
  version: number;
  data: Record<string, any>;
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    tags: string[];
    ttl?: number;
    maxVersions: number;
    casRequired: boolean;
    deleteVersionAfter?: number;
  };
  lease?: {
    id: string;
    duration: number;
    renewable: boolean;
    renewCount: number;
    maxTTL: number;
  };
}

export interface ExternalAPIKey {
  id: string;
  name: string;
  service: string;
  apiKey: string;
  secretKey?: string;
  additionalData?: Record<string, string>;
  environment: 'development' | 'staging' | 'production';
  permissions: string[];
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  metadata: {
    description: string;
    owner: string;
    team: string;
    project: string;
    createdAt: Date;
    expiresAt?: Date;
    lastRotated?: Date;
    rotationInterval?: number;
  };
}

export interface VaultConfig {
  enabled: boolean;
  endpoint: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
  mountPath: string;
  engines: {
    kv: { path: string; version: number };
    transit: { path: string };
    pki: { path: string };
    database: { path: string };
  };
  auth: {
    method: 'token' | 'approle' | 'aws' | 'azure' | 'gcp';
    config: Record<string, any>;
  };
  policies: string[];
}

export interface SecretRequest {
  path: string;
  version?: number;
  wrapTTL?: string;
}

export interface SecretResponse {
  success: boolean;
  data?: any;
  metadata?: any;
  lease?: any;
  error?: string;
  warnings?: string[];
}

export interface VaultHealth {
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
  performanceStandby: boolean;
  replicationPerformanceMode: string;
  replicationDrMode: string;
  serverTimeUtc: number;
  version: string;
  clusterName: string;
  clusterId: string;
}

@Injectable()
export class CredentialVaultService implements OnModuleInit {
  private readonly logger = new Logger(CredentialVaultService.name);
  
  private vaultConfig: VaultConfig;
  private isVaultConnected = false;
  private vaultToken?: string;
  private tokenExpiry?: Date;
  
  private secretCache = new Map<string, { secret: VaultSecret; expiry: Date }>();
  private apiKeyCache = new Map<string, { apiKey: ExternalAPIKey; expiry: Date }>();
  
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private readonly tokenRenewalBuffer = 10 * 60 * 1000; // 10 minutes before expiry

  constructor(
    private readonly configService: ConfigService,
    private readonly credentialStorage: SecureCredentialStorageService,
    private readonly credentialEncryption: CredentialEncryptionService,
    private readonly keyManagement: KeyManagementService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.vaultConfig = {
      enabled: this.configService.get<boolean>('VAULT_ENABLED', false),
      endpoint: this.configService.get<string>('VAULT_ENDPOINT', 'http://localhost:8200'),
      token: this.configService.get<string>('VAULT_TOKEN'),
      roleId: this.configService.get<string>('VAULT_ROLE_ID'),
      secretId: this.configService.get<string>('VAULT_SECRET_ID'),
      namespace: this.configService.get<string>('VAULT_NAMESPACE'),
      mountPath: this.configService.get<string>('VAULT_MOUNT_PATH', 'secret'),
      engines: {
        kv: { 
          path: this.configService.get<string>('VAULT_KV_PATH', 'secret'), 
          version: this.configService.get<number>('VAULT_KV_VERSION', 2) 
        },
        transit: { path: this.configService.get<string>('VAULT_TRANSIT_PATH', 'transit') },
        pki: { path: this.configService.get<string>('VAULT_PKI_PATH', 'pki') },
        database: { path: this.configService.get<string>('VAULT_DATABASE_PATH', 'database') }
      },
      auth: {
        method: this.configService.get<VaultConfig['auth']['method']>('VAULT_AUTH_METHOD', 'token'),
        config: {}
      },
      policies: this.configService.get<string>('VAULT_POLICIES', '').split(',').filter(p => p.trim())
    };
  }

  async onModuleInit() {
    if (this.vaultConfig.enabled) {
      await this.initializeVault();
    }
  }

  /**
   * Initialize Vault connection
   */
  private async initializeVault(): Promise<void> {
    try {
      this.logger.log('Initializing Vault connection...');

      // Check Vault health
      const health = await this.checkVaultHealth();
      if (!health.initialized || health.sealed) {
        throw new Error('Vault is not initialized or is sealed');
      }

      // Authenticate with Vault
      await this.authenticateWithVault();

      // Start token renewal process
      this.startTokenRenewal();

      this.isVaultConnected = true;
      this.logger.log('Vault connection initialized successfully');

    } catch (error) {
      this.logger.error(`Vault initialization failed: ${error.message}`);
      this.isVaultConnected = false;
      
      // Fall back to local storage
      this.logger.warn('Falling back to local credential storage');
    }
  }

  /**
   * Check Vault health status
   */
  private async checkVaultHealth(): Promise<VaultHealth> {
    try {
      // Mock implementation - in reality would make HTTP request to /v1/sys/health
      return {
        initialized: true,
        sealed: false,
        standby: false,
        performanceStandby: false,
        replicationPerformanceMode: 'disabled',
        replicationDrMode: 'disabled',
        serverTimeUtc: Date.now(),
        version: '1.15.0',
        clusterName: 'vault-cluster-local',
        clusterId: 'vault-cluster-id'
      };
    } catch (error) {
      this.logger.error(`Vault health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate with Vault
   */
  private async authenticateWithVault(): Promise<void> {
    try {
      switch (this.vaultConfig.auth.method) {
        case 'token':
          await this.authenticateWithToken();
          break;
        case 'approle':
          await this.authenticateWithAppRole();
          break;
        default:
          throw new Error(`Unsupported auth method: ${this.vaultConfig.auth.method}`);
      }

      this.logger.log(`Authenticated with Vault using ${this.vaultConfig.auth.method}`);

    } catch (error) {
      this.logger.error(`Vault authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate using token
   */
  private async authenticateWithToken(): Promise<void> {
    if (!this.vaultConfig.token) {
      throw new Error('Vault token not provided');
    }

    // Mock token validation - in reality would validate with Vault
    this.vaultToken = this.vaultConfig.token;
    this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Authenticate using AppRole
   */
  private async authenticateWithAppRole(): Promise<void> {
    if (!this.vaultConfig.roleId || !this.vaultConfig.secretId) {
      throw new Error('Vault role_id and secret_id are required for AppRole auth');
    }

    // Mock AppRole authentication - in reality would POST to /v1/auth/approle/login
    this.vaultToken = 'mock-token-from-approle';
    this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }

  /**
   * Start token renewal process
   */
  private startTokenRenewal(): void {
    setInterval(async () => {
      if (this.tokenExpiry && Date.now() > this.tokenExpiry.getTime() - this.tokenRenewalBuffer) {
        try {
          await this.renewToken();
        } catch (error) {
          this.logger.error(`Token renewal failed: ${error.message}`);
          await this.authenticateWithVault(); // Re-authenticate
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Renew Vault token
   */
  private async renewToken(): Promise<void> {
    try {
      // Mock token renewal - in reality would POST to /v1/auth/token/renew-self
      this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // Extend by 1 hour
      this.logger.debug('Vault token renewed successfully');
    } catch (error) {
      this.logger.error(`Token renewal failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store secret in Vault
   */
  public async storeSecret(
    path: string,
    data: Record<string, any>,
    metadata: Partial<VaultSecret['metadata']> = {}
  ): Promise<VaultSecret> {
    try {
      if (this.isVaultConnected) {
        return await this.storeSecretInVault(path, data, metadata);
      } else {
        return await this.storeSecretLocally(path, data, metadata);
      }
    } catch (error) {
      this.logger.error(`Failed to store secret at ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store secret in Vault
   */
  private async storeSecretInVault(
    path: string,
    data: Record<string, any>,
    metadata: Partial<VaultSecret['metadata']>
  ): Promise<VaultSecret> {
    try {
      // Mock Vault API call - in reality would PUT to /v1/secret/data/{path}
      const secret: VaultSecret = {
        id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path,
        version: 1,
        data,
        metadata: {
          createdBy: metadata.createdBy || 'system',
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          tags: metadata.tags || [],
          ttl: metadata.ttl,
          maxVersions: metadata.maxVersions || 10,
          casRequired: metadata.casRequired || false,
          deleteVersionAfter: metadata.deleteVersionAfter
        }
      };

      // Cache the secret
      this.secretCache.set(path, {
        secret,
        expiry: new Date(Date.now() + this.cacheTimeout)
      });

      this.logger.debug(`Secret stored in Vault: ${path}`);
      
      // Emit event
      this.eventEmitter.emit('vault.secret.stored', { path, secret });

      return secret;

    } catch (error) {
      this.logger.error(`Failed to store secret in Vault: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store secret locally (fallback)
   */
  private async storeSecretLocally(
    path: string,
    data: Record<string, any>,
    metadata: Partial<VaultSecret['metadata']>
  ): Promise<VaultSecret> {
    try {
      const credentialId = `vault_${path.replace(/\//g, '_')}`;
      const serializedData = JSON.stringify(data);

      await this.credentialStorage.storeCredential(
        credentialId,
        serializedData,
        'config',
        'vault',
        {
          description: `Vault secret: ${path}`,
          tags: metadata.tags,
          externalId: path
        }
      );

      const secret: VaultSecret = {
        id: credentialId,
        path,
        version: 1,
        data,
        metadata: {
          createdBy: metadata.createdBy || 'system',
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          tags: metadata.tags || [],
          ttl: metadata.ttl,
          maxVersions: metadata.maxVersions || 10,
          casRequired: metadata.casRequired || false,
          deleteVersionAfter: metadata.deleteVersionAfter
        }
      };

      this.logger.debug(`Secret stored locally: ${path}`);
      return secret;

    } catch (error) {
      this.logger.error(`Failed to store secret locally: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve secret from Vault
   */
  public async getSecret(path: string, version?: number): Promise<SecretResponse> {
    try {
      // Check cache first
      const cached = this.secretCache.get(path);
      if (cached && cached.expiry > new Date()) {
        return {
          success: true,
          data: cached.secret.data,
          metadata: cached.secret.metadata
        };
      }

      if (this.isVaultConnected) {
        return await this.getSecretFromVault(path, version);
      } else {
        return await this.getSecretLocally(path);
      }

    } catch (error) {
      this.logger.error(`Failed to retrieve secret from ${path}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve secret from Vault
   */
  private async getSecretFromVault(path: string, version?: number): Promise<SecretResponse> {
    try {
      // Mock Vault API call - in reality would GET from /v1/secret/data/{path}
      const mockData = { api_key: 'mock-api-key', secret: 'mock-secret' };
      
      const secret: VaultSecret = {
        id: `vault_${path}`,
        path,
        version: version || 1,
        data: mockData,
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          tags: [],
          maxVersions: 10,
          casRequired: false
        }
      };

      // Update cache
      this.secretCache.set(path, {
        secret,
        expiry: new Date(Date.now() + this.cacheTimeout)
      });

      this.logger.debug(`Secret retrieved from Vault: ${path}`);

      return {
        success: true,
        data: secret.data,
        metadata: secret.metadata
      };

    } catch (error) {
      this.logger.error(`Failed to retrieve secret from Vault: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve secret locally (fallback)
   */
  private async getSecretLocally(path: string): Promise<SecretResponse> {
    try {
      const credentialId = `vault_${path.replace(/\//g, '_')}`;
      const retrieved = await this.credentialStorage.retrieveCredential(credentialId);

      if (!retrieved) {
        return {
          success: false,
          error: 'Secret not found'
        };
      }

      const data = JSON.parse(retrieved.plaintext);

      this.logger.debug(`Secret retrieved locally: ${path}`);

      return {
        success: true,
        data,
        metadata: {
          createdAt: retrieved.credential.createdAt,
          lastAccessed: retrieved.credential.lastAccessed
        }
      };

    } catch (error) {
      this.logger.error(`Failed to retrieve secret locally: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store external API key
   */
  public async storeAPIKey(apiKey: ExternalAPIKey): Promise<void> {
    try {
      const path = `api-keys/${apiKey.service}/${apiKey.environment}/${apiKey.name}`;
      
      const secretData = {
        apiKey: apiKey.apiKey,
        secretKey: apiKey.secretKey,
        ...apiKey.additionalData
      };

      await this.storeSecret(path, secretData, {
        createdBy: apiKey.metadata.owner,
        tags: [apiKey.service, apiKey.environment, apiKey.metadata.team]
      });

      // Cache API key metadata
      this.apiKeyCache.set(apiKey.id, {
        apiKey,
        expiry: new Date(Date.now() + this.cacheTimeout)
      });

      this.logger.log(`API key stored: ${apiKey.service}/${apiKey.name}`);

    } catch (error) {
      this.logger.error(`Failed to store API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve external API key
   */
  public async getAPIKey(
    service: string,
    environment: string,
    name: string
  ): Promise<ExternalAPIKey | null> {
    try {
      const path = `api-keys/${service}/${environment}/${name}`;
      const response = await this.getSecret(path);

      if (!response.success || !response.data) {
        return null;
      }

      const apiKey: ExternalAPIKey = {
        id: `${service}_${environment}_${name}`,
        name,
        service,
        apiKey: response.data.apiKey,
        secretKey: response.data.secretKey,
        additionalData: { ...response.data },
        environment: environment as ExternalAPIKey['environment'],
        permissions: [],
        metadata: {
          description: `API key for ${service}`,
          owner: 'system',
          team: 'platform',
          project: 'aixg',
          createdAt: new Date(response.metadata?.createdAt || Date.now())
        }
      };

      delete apiKey.additionalData?.apiKey;
      delete apiKey.additionalData?.secretKey;

      return apiKey;

    } catch (error) {
      this.logger.error(`Failed to retrieve API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Rotate API key
   */
  public async rotateAPIKey(
    service: string,
    environment: string,
    name: string,
    newApiKey: string,
    newSecretKey?: string
  ): Promise<void> {
    try {
      const existingKey = await this.getAPIKey(service, environment, name);
      if (!existingKey) {
        throw new Error('API key not found');
      }

      // Update with new credentials
      existingKey.apiKey = newApiKey;
      if (newSecretKey) {
        existingKey.secretKey = newSecretKey;
      }
      existingKey.metadata.lastRotated = new Date();

      await this.storeAPIKey(existingKey);

      // Invalidate cache
      this.apiKeyCache.delete(existingKey.id);

      this.logger.log(`API key rotated: ${service}/${name}`);

      // Emit rotation event
      this.eventEmitter.emit('vault.apikey.rotated', {
        service,
        environment,
        name
      });

    } catch (error) {
      this.logger.error(`Failed to rotate API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * List API keys for service
   */
  public async listAPIKeys(service: string, environment?: string): Promise<ExternalAPIKey[]> {
    try {
      // In a real implementation, this would list secrets from Vault
      // For now, return cached keys
      const apiKeys: ExternalAPIKey[] = [];
      
      for (const cached of this.apiKeyCache.values()) {
        if (cached.apiKey.service === service && 
            (!environment || cached.apiKey.environment === environment)) {
          apiKeys.push(cached.apiKey);
        }
      }

      return apiKeys;

    } catch (error) {
      this.logger.error(`Failed to list API keys: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate dynamic database credentials
   */
  public async generateDatabaseCredentials(
    role: string,
    ttl: string = '1h'
  ): Promise<{ username: string; password: string; lease: any }> {
    try {
      if (!this.isVaultConnected) {
        throw new Error('Vault not available for dynamic credentials');
      }

      // Mock dynamic credential generation - in reality would POST to /v1/database/creds/{role}
      const credentials = {
        username: `dyn_user_${Date.now()}`,
        password: this.generateSecurePassword(32),
        lease: {
          id: `database/creds/${role}/${Date.now()}`,
          duration: this.parseTTL(ttl),
          renewable: true,
          renewCount: 0,
          maxTTL: this.parseTTL('24h')
        }
      };

      this.logger.debug(`Generated dynamic database credentials for role: ${role}`);

      return credentials;

    } catch (error) {
      this.logger.error(`Failed to generate database credentials: ${error.message}`);
      throw error;
    }
  }

  /**
   * Encrypt data using Vault transit engine
   */
  public async encryptWithTransit(
    keyName: string,
    plaintext: string,
    context?: string
  ): Promise<string> {
    try {
      if (!this.isVaultConnected) {
        // Fall back to local encryption
        const result = await this.credentialEncryption.encryptCredential(
          'transit_fallback',
          plaintext,
          'config'
        );
        
        if (!result.success) {
          throw new Error(`Local encryption failed: ${result.error}`);
        }
        
        return result.encryptedCredential.encryptedData;
      }

      // Mock Vault transit encryption - in reality would POST to /v1/transit/encrypt/{key}
      const ciphertext = `vault:v1:${Buffer.from(plaintext).toString('base64')}`;

      this.logger.debug(`Data encrypted using transit key: ${keyName}`);

      return ciphertext;

    } catch (error) {
      this.logger.error(`Transit encryption failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decrypt data using Vault transit engine
   */
  public async decryptWithTransit(
    keyName: string,
    ciphertext: string,
    context?: string
  ): Promise<string> {
    try {
      if (!this.isVaultConnected) {
        // This is a simplified fallback - in reality would need to store encryption metadata
        throw new Error('Cannot decrypt transit data without Vault connection');
      }

      // Mock Vault transit decryption - in reality would POST to /v1/transit/decrypt/{key}
      const base64Data = ciphertext.replace('vault:v1:', '');
      const plaintext = Buffer.from(base64Data, 'base64').toString('utf8');

      this.logger.debug(`Data decrypted using transit key: ${keyName}`);

      return plaintext;

    } catch (error) {
      this.logger.error(`Transit decryption failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Vault status and health
   */
  public async getVaultStatus(): Promise<any> {
    try {
      const health = await this.checkVaultHealth();
      
      return {
        connected: this.isVaultConnected,
        health,
        token: {
          hasToken: !!this.vaultToken,
          expiry: this.tokenExpiry,
          timeUntilExpiry: this.tokenExpiry ? this.tokenExpiry.getTime() - Date.now() : null
        },
        cache: {
          secrets: this.secretCache.size,
          apiKeys: this.apiKeyCache.size
        },
        config: {
          endpoint: this.vaultConfig.endpoint,
          authMethod: this.vaultConfig.auth.method,
          namespace: this.vaultConfig.namespace
        }
      };

    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.secretCache.clear();
    this.apiKeyCache.clear();
    this.logger.debug('Vault caches cleared');
  }

  /**
   * Helper methods
   */
  private generateSecurePassword(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private parseTTL(ttl: string): number {
    // Simple TTL parser - in reality would use a proper parser
    const match = ttl.match(/(\d+)([smhd])/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * Cleanup expired cache entries
   */
  public cleanupExpiredCache(): void {
    const now = new Date();
    
    for (const [key, value] of this.secretCache.entries()) {
      if (value.expiry <= now) {
        this.secretCache.delete(key);
      }
    }

    for (const [key, value] of this.apiKeyCache.entries()) {
      if (value.expiry <= now) {
        this.apiKeyCache.delete(key);
      }
    }
  }

  /**
   * Shutdown vault service
   */
  public async shutdown(): Promise<void> {
    try {
      this.clearCaches();
      this.isVaultConnected = false;
      this.vaultToken = undefined;
      this.tokenExpiry = undefined;
      
      this.logger.log('Vault service shutdown completed');
    } catch (error) {
      this.logger.error(`Vault shutdown failed: ${error.message}`);
    }
  }
}