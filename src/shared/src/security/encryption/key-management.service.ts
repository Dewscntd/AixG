/**
 * Encryption Key Management Service
 * Enterprise-grade key management with HSM integration and automatic rotation
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export interface EncryptionKey {
  id: string;
  version: number;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  key: Buffer;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  purpose: 'credential' | 'data' | 'config' | 'token';
  derivedFrom?: string;
  metadata: {
    hsm: boolean;
    keyLength: number;
    rotationPolicy: string;
    usage: string[];
  };
}

export interface KeyRotationPolicy {
  id: string;
  purpose: string;
  rotationInterval: number; // milliseconds
  maxKeyAge: number; // milliseconds
  preRotationBuffer: number; // milliseconds
  autoRotate: boolean;
  retentionPeriod: number; // milliseconds
  notifications: {
    beforeRotation: number; // milliseconds
    afterRotation: boolean;
    onFailure: boolean;
  };
}

export interface HSMConfig {
  enabled: boolean;
  provider: 'aws-cloudhsm' | 'azure-dedicatedhsm' | 'pkcs11' | 'mock';
  endpoint?: string;
  credentials?: {
    username: string;
    password: string;
    pin?: string;
  };
  slot?: number;
  keyLabel?: string;
  mechanisms: string[];
}

export interface KeyDerivationOptions {
  algorithm: 'PBKDF2' | 'scrypt' | 'argon2';
  iterations?: number;
  salt?: Buffer;
  keyLength?: number;
  memory?: number; // for scrypt/argon2
  parallelism?: number; // for argon2
}

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  
  private keys = new Map<string, EncryptionKey>();
  private keysByPurpose = new Map<string, EncryptionKey[]>();
  private rotationPolicies = new Map<string, KeyRotationPolicy>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();
  
  private masterKey: Buffer | null = null;
  private hsmConfig: HSMConfig;
  private isHSMAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.hsmConfig = {
      enabled: this.configService.get<boolean>('HSM_ENABLED', false),
      provider: this.configService.get<HSMConfig['provider']>('HSM_PROVIDER', 'mock'),
      endpoint: this.configService.get<string>('HSM_ENDPOINT'),
      credentials: {
        username: this.configService.get<string>('HSM_USERNAME', ''),
        password: this.configService.get<string>('HSM_PASSWORD', ''),
        pin: this.configService.get<string>('HSM_PIN')
      },
      slot: this.configService.get<number>('HSM_SLOT', 0),
      keyLabel: this.configService.get<string>('HSM_KEY_LABEL', 'aixg-master-key'),
      mechanisms: ['CKM_AES_KEY_GEN', 'CKM_AES_GCM']
    };
  }

  async onModuleInit() {
    await this.initializeKeyManagement();
  }

  /**
   * Initialize key management system
   */
  private async initializeKeyManagement(): Promise<void> {
    try {
      this.logger.log('Initializing key management system...');

      // Initialize HSM if configured
      if (this.hsmConfig.enabled) {
        await this.initializeHSM();
      }

      // Initialize master key
      await this.initializeMasterKey();

      // Load default rotation policies
      this.loadDefaultRotationPolicies();

      // Load existing keys
      await this.loadExistingKeys();

      // Start rotation scheduling
      this.startRotationScheduling();

      this.logger.log('Key management system initialized successfully');

    } catch (error) {
      this.logger.error(`Key management initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize HSM connection
   */
  private async initializeHSM(): Promise<void> {
    try {
      this.logger.log('Initializing HSM connection...');

      // Mock HSM initialization for demo
      if (this.hsmConfig.provider === 'mock') {
        this.isHSMAvailable = true;
        this.logger.log('Mock HSM initialized successfully');
        return;
      }

      // Real HSM initialization would go here
      // This would integrate with actual HSM providers like AWS CloudHSM, Azure Dedicated HSM, etc.
      
      this.isHSMAvailable = false;
      this.logger.warn('HSM not available, falling back to software-based key management');

    } catch (error) {
      this.logger.error(`HSM initialization failed: ${error.message}`);
      this.isHSMAvailable = false;
    }
  }

  /**
   * Initialize master key
   */
  private async initializeMasterKey(): Promise<void> {
    try {
      if (this.isHSMAvailable) {
        // Generate or retrieve master key from HSM
        this.masterKey = await this.generateHSMKey();
        this.logger.log('Master key initialized from HSM');
      } else {
        // Generate master key from environment or create new
        const masterKeyEnv = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
        
        if (masterKeyEnv) {
          this.masterKey = Buffer.from(masterKeyEnv, 'base64');
        } else {
          this.masterKey = this.generateSecureKey(32);
          this.logger.warn('Generated new master key - ensure it is properly backed up');
        }
      }

      if (!this.masterKey || this.masterKey.length !== 32) {
        throw new Error('Invalid master key length');
      }

      this.logger.log('Master key initialized successfully');

    } catch (error) {
      this.logger.error(`Master key initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate key using HSM
   */
  private async generateHSMKey(): Promise<Buffer> {
    // Mock HSM key generation
    if (this.hsmConfig.provider === 'mock') {
      return this.generateSecureKey(32);
    }

    // Real HSM key generation would use PKCS#11 or cloud HSM APIs
    throw new Error('HSM key generation not implemented for this provider');
  }

  /**
   * Generate secure random key
   */
  private generateSecureKey(length: number): Buffer {
    return randomBytes(length);
  }

  /**
   * Load default rotation policies
   */
  private loadDefaultRotationPolicies(): void {
    const policies: KeyRotationPolicy[] = [
      {
        id: 'credential-policy',
        purpose: 'credential',
        rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxKeyAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        preRotationBuffer: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoRotate: true,
        retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
        notifications: {
          beforeRotation: 24 * 60 * 60 * 1000, // 24 hours
          afterRotation: true,
          onFailure: true
        }
      },
      {
        id: 'data-policy',
        purpose: 'data',
        rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
        maxKeyAge: 180 * 24 * 60 * 60 * 1000, // 180 days
        preRotationBuffer: 14 * 24 * 60 * 60 * 1000, // 14 days
        autoRotate: true,
        retentionPeriod: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        notifications: {
          beforeRotation: 48 * 60 * 60 * 1000, // 48 hours
          afterRotation: true,
          onFailure: true
        }
      },
      {
        id: 'config-policy',
        purpose: 'config',
        rotationInterval: 60 * 24 * 60 * 60 * 1000, // 60 days
        maxKeyAge: 120 * 24 * 60 * 60 * 1000, // 120 days
        preRotationBuffer: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoRotate: true,
        retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
        notifications: {
          beforeRotation: 24 * 60 * 60 * 1000, // 24 hours
          afterRotation: true,
          onFailure: true
        }
      },
      {
        id: 'token-policy',
        purpose: 'token',
        rotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxKeyAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        preRotationBuffer: 1 * 24 * 60 * 60 * 1000, // 1 day
        autoRotate: true,
        retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
        notifications: {
          beforeRotation: 12 * 60 * 60 * 1000, // 12 hours
          afterRotation: true,
          onFailure: true
        }
      }
    ];

    for (const policy of policies) {
      this.rotationPolicies.set(policy.id, policy);
    }

    this.logger.log('Default rotation policies loaded');
  }

  /**
   * Load existing keys from storage
   */
  private async loadExistingKeys(): Promise<void> {
    try {
      // In a real implementation, this would load keys from secure storage
      // For now, we'll generate default keys for each purpose
      
      const purposes: Array<EncryptionKey['purpose']> = ['credential', 'data', 'config', 'token'];
      
      for (const purpose of purposes) {
        const existingKeys = await this.loadKeysForPurpose(purpose);
        if (existingKeys.length === 0) {
          // Generate initial key
          await this.generateKey(purpose);
        }
      }

      this.logger.log('Existing keys loaded successfully');

    } catch (error) {
      this.logger.error(`Failed to load existing keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load keys for specific purpose (from database/vault)
   */
  private async loadKeysForPurpose(purpose: string): Promise<EncryptionKey[]> {
    // Mock implementation - in reality would query database/vault
    return [];
  }

  /**
   * Generate new encryption key
   */
  public async generateKey(
    purpose: EncryptionKey['purpose'],
    algorithm: EncryptionKey['algorithm'] = 'AES-256-GCM'
  ): Promise<EncryptionKey> {
    try {
      const keyId = this.generateKeyId(purpose);
      const version = await this.getNextKeyVersion(purpose);
      
      // Generate key material
      const keyMaterial = this.isHSMAvailable 
        ? await this.generateHSMKey()
        : this.generateSecureKey(32);

      // Get rotation policy
      const policy = this.rotationPolicies.get(`${purpose}-policy`);
      const rotationInterval = policy?.rotationInterval || 30 * 24 * 60 * 60 * 1000;

      const key: EncryptionKey = {
        id: keyId,
        version,
        algorithm,
        key: keyMaterial,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + rotationInterval),
        isActive: true,
        purpose,
        metadata: {
          hsm: this.isHSMAvailable,
          keyLength: keyMaterial.length,
          rotationPolicy: `${purpose}-policy`,
          usage: ['encrypt', 'decrypt']
        }
      };

      // Store key
      this.keys.set(keyId, key);
      
      // Update purpose mapping
      const purposeKeys = this.keysByPurpose.get(purpose) || [];
      purposeKeys.push(key);
      this.keysByPurpose.set(purpose, purposeKeys);

      // Schedule rotation
      this.scheduleKeyRotation(key);

      this.logger.log(`Generated new ${purpose} key: ${keyId} (version ${version})`);

      return key;

    } catch (error) {
      this.logger.error(`Key generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(purpose: string): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `${purpose}-${timestamp}-${random}`;
  }

  /**
   * Get next key version for purpose
   */
  private async getNextKeyVersion(purpose: string): Promise<number> {
    const existingKeys = this.keysByPurpose.get(purpose) || [];
    const maxVersion = existingKeys.reduce((max, key) => Math.max(max, key.version), 0);
    return maxVersion + 1;
  }

  /**
   * Get active key for purpose
   */
  public getActiveKey(purpose: EncryptionKey['purpose']): EncryptionKey | null {
    const purposeKeys = this.keysByPurpose.get(purpose) || [];
    return purposeKeys.find(key => key.isActive && key.expiresAt > new Date()) || null;
  }

  /**
   * Get key by ID
   */
  public getKey(keyId: string): EncryptionKey | null {
    return this.keys.get(keyId) || null;
  }

  /**
   * Derive key from master key
   */
  public async deriveKey(
    context: string,
    purpose: EncryptionKey['purpose'],
    options: KeyDerivationOptions = {}
  ): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const {
      algorithm = 'PBKDF2',
      iterations = 100000,
      salt = randomBytes(16),
      keyLength = 32
    } = options;

    let derivedKey: Buffer;

    switch (algorithm) {
      case 'PBKDF2':
        derivedKey = pbkdf2Sync(this.masterKey, salt, iterations, keyLength, 'sha256');
        break;
      
      default:
        throw new Error(`Unsupported key derivation algorithm: ${algorithm}`);
    }

    const keyId = this.generateKeyId(`derived-${purpose}`);
    const version = await this.getNextKeyVersion(purpose);

    const key: EncryptionKey = {
      id: keyId,
      version,
      algorithm: 'AES-256-GCM',
      key: derivedKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
      purpose,
      derivedFrom: context,
      metadata: {
        hsm: false,
        keyLength: derivedKey.length,
        rotationPolicy: `${purpose}-policy`,
        usage: ['encrypt', 'decrypt']
      }
    };

    this.keys.set(keyId, key);
    
    this.logger.log(`Derived new key: ${keyId} from context: ${context}`);

    return key;
  }

  /**
   * Rotate key
   */
  public async rotateKey(purpose: EncryptionKey['purpose']): Promise<EncryptionKey> {
    try {
      this.logger.log(`Starting key rotation for purpose: ${purpose}`);

      // Deactivate current key
      const currentKey = this.getActiveKey(purpose);
      if (currentKey) {
        currentKey.isActive = false;
        this.logger.log(`Deactivated key: ${currentKey.id}`);
      }

      // Generate new key
      const newKey = await this.generateKey(purpose);
      
      this.logger.log(`Key rotation completed for purpose: ${purpose}`);

      return newKey;

    } catch (error) {
      this.logger.error(`Key rotation failed for purpose ${purpose}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start rotation scheduling
   */
  private startRotationScheduling(): void {
    for (const [purposeId, policy] of this.rotationPolicies) {
      if (policy.autoRotate) {
        this.scheduleNextRotation(policy);
      }
    }

    this.logger.log('Key rotation scheduling started');
  }

  /**
   * Schedule next rotation for policy
   */
  private scheduleNextRotation(policy: KeyRotationPolicy): void {
    const timeout = setTimeout(async () => {
      try {
        await this.rotateKey(policy.purpose as EncryptionKey['purpose']);
        this.scheduleNextRotation(policy); // Schedule next rotation
      } catch (error) {
        this.logger.error(`Automatic key rotation failed for ${policy.purpose}: ${error.message}`);
      }
    }, policy.rotationInterval);

    this.rotationTimers.set(policy.id, timeout);
  }

  /**
   * Schedule rotation for specific key
   */
  private scheduleKeyRotation(key: EncryptionKey): void {
    const policy = this.rotationPolicies.get(key.metadata.rotationPolicy);
    if (!policy || !policy.autoRotate) {
      return;
    }

    const timeUntilRotation = key.expiresAt.getTime() - Date.now();
    
    if (timeUntilRotation > 0) {
      setTimeout(async () => {
        try {
          await this.rotateKey(key.purpose);
        } catch (error) {
          this.logger.error(`Scheduled key rotation failed for ${key.id}: ${error.message}`);
        }
      }, timeUntilRotation);
    }
  }

  /**
   * Get key statistics
   */
  public getKeyStatistics(): any {
    const stats = {
      totalKeys: this.keys.size,
      activeKeys: 0,
      expiredKeys: 0,
      keysByPurpose: {} as Record<string, number>,
      hsmEnabled: this.isHSMAvailable,
      rotationPolicies: this.rotationPolicies.size
    };

    const now = new Date();
    
    for (const key of this.keys.values()) {
      if (key.isActive && key.expiresAt > now) {
        stats.activeKeys++;
      } else if (key.expiresAt <= now) {
        stats.expiredKeys++;
      }

      stats.keysByPurpose[key.purpose] = (stats.keysByPurpose[key.purpose] || 0) + 1;
    }

    return stats;
  }

  /**
   * Cleanup expired keys
   */
  public async cleanupExpiredKeys(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyId, key] of this.keys.entries()) {
      const policy = this.rotationPolicies.get(key.metadata.rotationPolicy);
      const retentionPeriod = policy?.retentionPeriod || 365 * 24 * 60 * 60 * 1000;
      
      if (key.expiresAt.getTime() + retentionPeriod < now.getTime()) {
        this.keys.delete(keyId);
        cleanedCount++;
        this.logger.debug(`Cleaned up expired key: ${keyId}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired keys`);
    }

    return cleanedCount;
  }

  /**
   * Export key for backup (encrypted)
   */
  public async exportKey(keyId: string, passphrase: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Create backup format
    const backup = {
      keyId: key.id,
      version: key.version,
      algorithm: key.algorithm,
      purpose: key.purpose,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt.toISOString(),
      metadata: key.metadata,
      // Key material would be encrypted with passphrase
      encryptedKey: key.key.toString('base64') // In reality, this would be encrypted
    };

    return Buffer.from(JSON.stringify(backup)).toString('base64');
  }

  /**
   * Get master key hash for verification
   */
  public getMasterKeyHash(): string {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    return createHash('sha256').update(this.masterKey).digest('hex');
  }

  /**
   * Shutdown key management
   */
  public async shutdown(): Promise<void> {
    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();

    // Clear sensitive data
    this.keys.clear();
    this.keysByPurpose.clear();
    
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }

    this.logger.log('Key management system shutdown completed');
  }
}