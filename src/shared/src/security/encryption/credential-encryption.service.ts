/**
 * Credential Encryption Service
 * High-security encryption for credentials and sensitive data using AES-256-GCM
 */

import { Injectable, Logger } from '@nestjs/common';
import { createCipherGCM, createDecipherGCM, randomBytes, timingSafeEqual } from 'crypto';
import { KeyManagementService, EncryptionKey } from './key-management.service';

export interface EncryptedCredential {
  id: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
  version: number;
  createdAt: Date;
  lastAccessed: Date;
  metadata: {
    purpose: string;
    dataType: 'api-key' | 'password' | 'token' | 'certificate' | 'config';
    encoding: 'utf8' | 'base64';
    compressed: boolean;
    checksum: string;
  };
}

export interface CredentialEncryptionOptions {
  purpose?: string;
  compress?: boolean;
  encoding?: 'utf8' | 'base64';
  keyDerivationContext?: string;
  additionalData?: string;
}

export interface EncryptionResult {
  encryptedCredential: EncryptedCredential;
  keyId: string;
  success: boolean;
  error?: string;
}

export interface DecryptionResult {
  plaintext: string;
  keyId: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface BulkEncryptionOptions {
  credentials: Array<{
    id: string;
    data: string;
    type: EncryptedCredential['metadata']['dataType'];
    purpose?: string;
  }>;
  batchSize?: number;
  parallelProcessing?: boolean;
}

@Injectable()
export class CredentialEncryptionService {
  private readonly logger = new Logger(CredentialEncryptionService.name);
  
  private readonly supportedAlgorithms = ['aes-256-gcm', 'chacha20-poly1305'];
  private readonly defaultAlgorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96-bit IV for GCM
  private readonly tagLength = 16; // 128-bit authentication tag

  constructor(private readonly keyManagement: KeyManagementService) {}

  /**
   * Encrypt credential data
   */
  public async encryptCredential(
    credentialId: string,
    plaintext: string,
    dataType: EncryptedCredential['metadata']['dataType'],
    options: CredentialEncryptionOptions = {}
  ): Promise<EncryptionResult> {
    try {
      const {
        purpose = 'credential',
        compress = false,
        encoding = 'utf8',
        keyDerivationContext,
        additionalData
      } = options;

      // Validate input
      if (!credentialId || !plaintext) {
        throw new Error('Credential ID and plaintext are required');
      }

      // Get or derive encryption key
      let encryptionKey: EncryptionKey;
      
      if (keyDerivationContext) {
        encryptionKey = await this.keyManagement.deriveKey(
          keyDerivationContext,
          'credential'
        );
      } else {
        encryptionKey = this.keyManagement.getActiveKey('credential');
        if (!encryptionKey) {
          encryptionKey = await this.keyManagement.generateKey('credential');
        }
      }

      // Prepare data for encryption
      let dataToEncrypt = plaintext;
      
      // Optional compression
      if (compress) {
        dataToEncrypt = await this.compressData(dataToEncrypt);
      }

      // Generate IV
      const iv = randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = createCipherGCM(this.defaultAlgorithm, encryptionKey.key, iv);
      
      // Add additional authenticated data if provided
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      // Encrypt data
      let encrypted = cipher.update(dataToEncrypt, encoding, 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Calculate checksum for integrity verification
      const checksum = this.calculateChecksum(plaintext);

      // Create encrypted credential object
      const encryptedCredential: EncryptedCredential = {
        id: credentialId,
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyId: encryptionKey.id,
        algorithm: this.defaultAlgorithm,
        version: 1,
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          purpose,
          dataType,
          encoding,
          compressed: compress,
          checksum
        }
      };

      this.logger.debug(`Successfully encrypted credential: ${credentialId}`);

      return {
        encryptedCredential,
        keyId: encryptionKey.id,
        success: true
      };

    } catch (error) {
      this.logger.error(`Credential encryption failed for ${credentialId}: ${error.message}`);
      
      return {
        encryptedCredential: null as any,
        keyId: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Decrypt credential data
   */
  public async decryptCredential(
    encryptedCredential: EncryptedCredential,
    additionalData?: string
  ): Promise<DecryptionResult> {
    try {
      // Validate input
      if (!encryptedCredential || !encryptedCredential.encryptedData) {
        throw new Error('Invalid encrypted credential');
      }

      // Get decryption key
      const decryptionKey = this.keyManagement.getKey(encryptedCredential.keyId);
      if (!decryptionKey) {
        throw new Error(`Decryption key not found: ${encryptedCredential.keyId}`);
      }

      // Parse IV and auth tag
      const iv = Buffer.from(encryptedCredential.iv, 'base64');
      const authTag = Buffer.from(encryptedCredential.authTag, 'base64');

      // Create decipher
      const decipher = createDecipherGCM(encryptedCredential.algorithm, decryptionKey.key, iv);
      decipher.setAuthTag(authTag);

      // Add additional authenticated data if provided
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      // Decrypt data
      let decrypted = decipher.update(encryptedCredential.encryptedData, 'base64', encryptedCredential.metadata.encoding);
      decrypted += decipher.final(encryptedCredential.metadata.encoding);

      // Decompress if needed
      if (encryptedCredential.metadata.compressed) {
        decrypted = await this.decompressData(decrypted);
      }

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(decrypted);
      if (!timingSafeEqual(
        Buffer.from(encryptedCredential.metadata.checksum, 'hex'),
        Buffer.from(calculatedChecksum, 'hex')
      )) {
        throw new Error('Checksum verification failed - data may be corrupted');
      }

      // Update last accessed time
      encryptedCredential.lastAccessed = new Date();

      this.logger.debug(`Successfully decrypted credential: ${encryptedCredential.id}`);

      return {
        plaintext: decrypted,
        keyId: encryptedCredential.keyId,
        success: true,
        metadata: encryptedCredential.metadata
      };

    } catch (error) {
      this.logger.error(`Credential decryption failed for ${encryptedCredential.id}: ${error.message}`);
      
      return {
        plaintext: '',
        keyId: encryptedCredential.keyId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Re-encrypt credential with new key
   */
  public async reencryptCredential(
    encryptedCredential: EncryptedCredential,
    newKeyPurpose?: EncryptionKey['purpose']
  ): Promise<EncryptionResult> {
    try {
      // First decrypt with old key
      const decryptResult = await this.decryptCredential(encryptedCredential);
      if (!decryptResult.success) {
        throw new Error(`Failed to decrypt for re-encryption: ${decryptResult.error}`);
      }

      // Encrypt with new key
      const newKeyType = newKeyPurpose || 'credential';
      const newKey = this.keyManagement.getActiveKey(newKeyType) || 
                     await this.keyManagement.generateKey(newKeyType);

      return await this.encryptCredential(
        encryptedCredential.id,
        decryptResult.plaintext,
        encryptedCredential.metadata.dataType,
        {
          purpose: encryptedCredential.metadata.purpose,
          compress: encryptedCredential.metadata.compressed,
          encoding: encryptedCredential.metadata.encoding
        }
      );

    } catch (error) {
      this.logger.error(`Credential re-encryption failed for ${encryptedCredential.id}: ${error.message}`);
      
      return {
        encryptedCredential: null as any,
        keyId: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk encrypt multiple credentials
   */
  public async bulkEncrypt(options: BulkEncryptionOptions): Promise<EncryptionResult[]> {
    const {
      credentials,
      batchSize = 10,
      parallelProcessing = true
    } = options;

    const results: EncryptionResult[] = [];

    if (parallelProcessing) {
      // Process in parallel batches
      for (let i = 0; i < credentials.length; i += batchSize) {
        const batch = credentials.slice(i, i + batchSize);
        
        const batchPromises = batch.map(cred => 
          this.encryptCredential(cred.id, cred.data, cred.type, {
            purpose: cred.purpose
          })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } else {
      // Process sequentially
      for (const cred of credentials) {
        const result = await this.encryptCredential(cred.id, cred.data, cred.type, {
          purpose: cred.purpose
        });
        results.push(result);
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`Bulk encryption completed: ${successCount}/${credentials.length} successful`);

    return results;
  }

  /**
   * Verify credential integrity
   */
  public async verifyCredentialIntegrity(encryptedCredential: EncryptedCredential): Promise<boolean> {
    try {
      const decryptResult = await this.decryptCredential(encryptedCredential);
      return decryptResult.success;
    } catch (error) {
      this.logger.warn(`Credential integrity verification failed for ${encryptedCredential.id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate secure random credential
   */
  public generateSecureCredential(
    length: number = 32,
    includeSymbols: boolean = true
  ): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const symbolsCharset = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const fullCharset = includeSymbols ? charset + symbolsCharset : charset;
    
    let result = '';
    const randomBytes = this.getSecureRandomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += fullCharset[randomBytes[i] % fullCharset.length];
    }
    
    return result;
  }

  /**
   * Encrypt field for database storage
   */
  public async encryptField(
    value: string,
    fieldName: string,
    recordId: string
  ): Promise<string> {
    const credentialId = `${recordId}-${fieldName}`;
    const result = await this.encryptCredential(credentialId, value, 'config');
    
    if (!result.success) {
      throw new Error(`Field encryption failed: ${result.error}`);
    }
    
    // Return compact format for database storage
    return this.serializeEncryptedCredential(result.encryptedCredential);
  }

  /**
   * Decrypt field from database storage
   */
  public async decryptField(encryptedValue: string): Promise<string> {
    const encryptedCredential = this.deserializeEncryptedCredential(encryptedValue);
    const result = await this.decryptCredential(encryptedCredential);
    
    if (!result.success) {
      throw new Error(`Field decryption failed: ${result.error}`);
    }
    
    return result.plaintext;
  }

  /**
   * Serialize encrypted credential for storage
   */
  private serializeEncryptedCredential(credential: EncryptedCredential): string {
    const compact = {
      d: credential.encryptedData,
      i: credential.iv,
      t: credential.authTag,
      k: credential.keyId,
      a: credential.algorithm,
      v: credential.version,
      m: credential.metadata
    };
    
    return Buffer.from(JSON.stringify(compact)).toString('base64');
  }

  /**
   * Deserialize encrypted credential from storage
   */
  private deserializeEncryptedCredential(serialized: string): EncryptedCredential {
    const compact = JSON.parse(Buffer.from(serialized, 'base64').toString('utf8'));
    
    return {
      id: '', // Will be set by caller if needed
      encryptedData: compact.d,
      iv: compact.i,
      authTag: compact.t,
      keyId: compact.k,
      algorithm: compact.a,
      version: compact.v,
      createdAt: new Date(), // Placeholder
      lastAccessed: new Date(),
      metadata: compact.m
    };
  }

  /**
   * Compress data (placeholder implementation)
   */
  private async compressData(data: string): Promise<string> {
    // In a real implementation, this would use zlib compression
    return data; // For now, no compression
  }

  /**
   * Decompress data (placeholder implementation)
   */
  private async decompressData(data: string): Promise<string> {
    // In a real implementation, this would use zlib decompression
    return data; // For now, no decompression
  }

  /**
   * Calculate data checksum
   */
  private calculateChecksum(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Get secure random bytes
   */
  private getSecureRandomBytes(length: number): Uint8Array {
    return new Uint8Array(randomBytes(length));
  }

  /**
   * Rotate encryption keys for credentials
   */
  public async rotateCredentialKeys(purpose: EncryptionKey['purpose']): Promise<number> {
    try {
      this.logger.log(`Starting credential key rotation for purpose: ${purpose}`);
      
      // This would typically:
      // 1. Get all credentials using the old key
      // 2. Re-encrypt them with the new key
      // 3. Update the database records
      // 4. Mark old key as inactive
      
      const rotatedKey = await this.keyManagement.rotateKey(purpose);
      
      // In a real implementation, would re-encrypt existing credentials here
      
      this.logger.log(`Credential key rotation completed for purpose: ${purpose}`);
      
      return 0; // Number of credentials re-encrypted
      
    } catch (error) {
      this.logger.error(`Credential key rotation failed for purpose ${purpose}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get encryption statistics
   */
  public getEncryptionStatistics(): any {
    return {
      supportedAlgorithms: this.supportedAlgorithms,
      defaultAlgorithm: this.defaultAlgorithm,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      keyManagement: this.keyManagement.getKeyStatistics()
    };
  }

  /**
   * Validate encrypted credential format
   */
  public validateEncryptedCredential(credential: any): credential is EncryptedCredential {
    return (
      credential &&
      typeof credential.id === 'string' &&
      typeof credential.encryptedData === 'string' &&
      typeof credential.iv === 'string' &&
      typeof credential.authTag === 'string' &&
      typeof credential.keyId === 'string' &&
      typeof credential.algorithm === 'string' &&
      typeof credential.version === 'number' &&
      credential.metadata &&
      typeof credential.metadata.purpose === 'string' &&
      typeof credential.metadata.dataType === 'string'
    );
  }
}