/**
 * Secure Credential Storage Service
 * Database integration for encrypted credential storage with field-level encryption
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, QueryRunner } from 'typeorm';
import { CredentialEncryptionService, EncryptedCredential } from './credential-encryption.service';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('encrypted_credentials')
@Index(['purpose', 'dataType'])
@Index(['externalId'])
@Index(['createdAt'])
export class EncryptedCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  credentialId: string;

  @Column({ type: 'text' })
  encryptedData: string;

  @Column({ type: 'varchar', length: 64 })
  iv: string;

  @Column({ type: 'varchar', length: 64 })
  authTag: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  keyId: string;

  @Column({ type: 'varchar', length: 50 })
  algorithm: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  purpose: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  dataType: string;

  @Column({ type: 'varchar', length: 20, default: 'utf8' })
  encoding: string;

  @Column({ type: 'boolean', default: false })
  compressed: boolean;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  externalId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

  @Column({ type: 'int', default: 0 })
  accessCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('credential_access_log')
@Index(['credentialId', 'timestamp'])
@Index(['operation', 'timestamp'])
export class CredentialAccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  credentialId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  operation: 'create' | 'read' | 'update' | 'delete' | 'rotate';

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}

export interface StoredCredential {
  id: string;
  credentialId: string;
  purpose: string;
  dataType: string;
  description?: string;
  tags?: string[];
  externalId?: string;
  expiresAt?: Date;
  lastAccessed?: Date;
  accessCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialFilter {
  purpose?: string;
  dataType?: string;
  externalId?: string;
  tags?: string[];
  isActive?: boolean;
  expiresAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface CredentialStorageOptions {
  description?: string;
  tags?: string[];
  externalId?: string;
  expiresAt?: Date;
  encryptionOptions?: any;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: Array<{ credentialId: string; error: string }>;
}

@Injectable()
export class SecureCredentialStorageService {
  private readonly logger = new Logger(SecureCredentialStorageService.name);

  constructor(
    @InjectRepository(EncryptedCredentialEntity)
    private readonly credentialRepository: Repository<EncryptedCredentialEntity>,
    @InjectRepository(CredentialAccessLogEntity)
    private readonly accessLogRepository: Repository<CredentialAccessLogEntity>,
    private readonly connection: Connection,
    private readonly encryptionService: CredentialEncryptionService
  ) {}

  /**
   * Store encrypted credential
   */
  public async storeCredential(
    credentialId: string,
    plaintext: string,
    dataType: EncryptedCredential['metadata']['dataType'],
    purpose: string,
    options: CredentialStorageOptions = {},
    auditContext?: any
  ): Promise<StoredCredential> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Encrypt the credential
      const encryptionResult = await this.encryptionService.encryptCredential(
        credentialId,
        plaintext,
        dataType,
        {
          purpose,
          ...options.encryptionOptions
        }
      );

      if (!encryptionResult.success) {
        throw new Error(`Encryption failed: ${encryptionResult.error}`);
      }

      const encryptedCred = encryptionResult.encryptedCredential;

      // Check if credential already exists
      const existing = await queryRunner.manager.findOne(EncryptedCredentialEntity, {
        where: { credentialId }
      });

      let savedEntity: EncryptedCredentialEntity;

      if (existing) {
        // Update existing credential
        existing.encryptedData = encryptedCred.encryptedData;
        existing.iv = encryptedCred.iv;
        existing.authTag = encryptedCred.authTag;
        existing.keyId = encryptedCred.keyId;
        existing.algorithm = encryptedCred.algorithm;
        existing.version = encryptedCred.version + 1;
        existing.checksum = encryptedCred.metadata.checksum;
        existing.description = options.description || existing.description;
        existing.tags = options.tags || existing.tags;
        existing.externalId = options.externalId || existing.externalId;
        existing.expiresAt = options.expiresAt || existing.expiresAt;
        existing.updatedAt = new Date();

        savedEntity = await queryRunner.manager.save(existing);
      } else {
        // Create new credential
        const newEntity = new EncryptedCredentialEntity();
        newEntity.credentialId = credentialId;
        newEntity.encryptedData = encryptedCred.encryptedData;
        newEntity.iv = encryptedCred.iv;
        newEntity.authTag = encryptedCred.authTag;
        newEntity.keyId = encryptedCred.keyId;
        newEntity.algorithm = encryptedCred.algorithm;
        newEntity.version = encryptedCred.version;
        newEntity.purpose = purpose;
        newEntity.dataType = dataType;
        newEntity.encoding = encryptedCred.metadata.encoding;
        newEntity.compressed = encryptedCred.metadata.compressed;
        newEntity.checksum = encryptedCred.metadata.checksum;
        newEntity.description = options.description;
        newEntity.tags = options.tags || [];
        newEntity.externalId = options.externalId;
        newEntity.expiresAt = options.expiresAt;
        newEntity.accessCount = 0;
        newEntity.isActive = true;

        savedEntity = await queryRunner.manager.save(newEntity);
      }

      // Log the operation
      await this.logAccess(
        queryRunner,
        credentialId,
        existing ? 'update' : 'create',
        true,
        auditContext
      );

      await queryRunner.commitTransaction();

      this.logger.debug(`Credential stored successfully: ${credentialId}`);

      return this.entityToStoredCredential(savedEntity);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // Log failed operation
      await this.logAccess(
        queryRunner,
        credentialId,
        'create',
        false,
        auditContext,
        error.message
      );

      this.logger.error(`Failed to store credential ${credentialId}: ${error.message}`);
      throw error;

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieve and decrypt credential
   */
  public async retrieveCredential(
    credentialId: string,
    auditContext?: any
  ): Promise<{ credential: StoredCredential; plaintext: string } | null> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      // Find credential
      const entity = await queryRunner.manager.findOne(EncryptedCredentialEntity, {
        where: { credentialId, isActive: true }
      });

      if (!entity) {
        await this.logAccess(
          queryRunner,
          credentialId,
          'read',
          false,
          auditContext,
          'Credential not found'
        );
        return null;
      }

      // Check if expired
      if (entity.expiresAt && entity.expiresAt <= new Date()) {
        await this.logAccess(
          queryRunner,
          credentialId,
          'read',
          false,
          auditContext,
          'Credential expired'
        );
        return null;
      }

      // Convert to EncryptedCredential format
      const encryptedCredential: EncryptedCredential = {
        id: entity.credentialId,
        encryptedData: entity.encryptedData,
        iv: entity.iv,
        authTag: entity.authTag,
        keyId: entity.keyId,
        algorithm: entity.algorithm,
        version: entity.version,
        createdAt: entity.createdAt,
        lastAccessed: entity.lastAccessed || new Date(),
        metadata: {
          purpose: entity.purpose,
          dataType: entity.dataType as any,
          encoding: entity.encoding as any,
          compressed: entity.compressed,
          checksum: entity.checksum
        }
      };

      // Decrypt credential
      const decryptionResult = await this.encryptionService.decryptCredential(encryptedCredential);

      if (!decryptionResult.success) {
        await this.logAccess(
          queryRunner,
          credentialId,
          'read',
          false,
          auditContext,
          `Decryption failed: ${decryptionResult.error}`
        );
        throw new Error(`Decryption failed: ${decryptionResult.error}`);
      }

      // Update access tracking
      entity.lastAccessed = new Date();
      entity.accessCount += 1;
      await queryRunner.manager.save(entity);

      // Log successful access
      await this.logAccess(
        queryRunner,
        credentialId,
        'read',
        true,
        auditContext
      );

      this.logger.debug(`Credential retrieved successfully: ${credentialId}`);

      return {
        credential: this.entityToStoredCredential(entity),
        plaintext: decryptionResult.plaintext
      };

    } catch (error) {
      await this.logAccess(
        queryRunner,
        credentialId,
        'read',
        false,
        auditContext,
        error.message
      );

      this.logger.error(`Failed to retrieve credential ${credentialId}: ${error.message}`);
      throw error;

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * List credentials with filtering
   */
  public async listCredentials(
    filter: CredentialFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ credentials: StoredCredential[]; total: number }> {
    try {
      const queryBuilder = this.credentialRepository.createQueryBuilder('cred');

      // Apply filters
      if (filter.purpose) {
        queryBuilder.andWhere('cred.purpose = :purpose', { purpose: filter.purpose });
      }

      if (filter.dataType) {
        queryBuilder.andWhere('cred.dataType = :dataType', { dataType: filter.dataType });
      }

      if (filter.externalId) {
        queryBuilder.andWhere('cred.externalId = :externalId', { externalId: filter.externalId });
      }

      if (filter.tags && filter.tags.length > 0) {
        queryBuilder.andWhere('cred.tags && :tags', { tags: filter.tags });
      }

      if (filter.isActive !== undefined) {
        queryBuilder.andWhere('cred.isActive = :isActive', { isActive: filter.isActive });
      }

      if (filter.expiresAfter) {
        queryBuilder.andWhere('(cred.expiresAt IS NULL OR cred.expiresAt > :expiresAfter)', {
          expiresAfter: filter.expiresAfter
        });
      }

      if (filter.createdAfter) {
        queryBuilder.andWhere('cred.createdAt >= :createdAfter', { createdAfter: filter.createdAfter });
      }

      if (filter.createdBefore) {
        queryBuilder.andWhere('cred.createdAt <= :createdBefore', { createdBefore: filter.createdBefore });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination and get results
      const entities = await queryBuilder
        .orderBy('cred.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      const credentials = entities.map(entity => this.entityToStoredCredential(entity));

      return { credentials, total };

    } catch (error) {
      this.logger.error(`Failed to list credentials: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete credential
   */
  public async deleteCredential(
    credentialId: string,
    hardDelete: boolean = false,
    auditContext?: any
  ): Promise<boolean> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entity = await queryRunner.manager.findOne(EncryptedCredentialEntity, {
        where: { credentialId }
      });

      if (!entity) {
        await this.logAccess(
          queryRunner,
          credentialId,
          'delete',
          false,
          auditContext,
          'Credential not found'
        );
        return false;
      }

      if (hardDelete) {
        await queryRunner.manager.remove(entity);
      } else {
        entity.isActive = false;
        entity.updatedAt = new Date();
        await queryRunner.manager.save(entity);
      }

      await this.logAccess(
        queryRunner,
        credentialId,
        'delete',
        true,
        auditContext
      );

      await queryRunner.commitTransaction();

      this.logger.debug(`Credential ${hardDelete ? 'deleted' : 'deactivated'}: ${credentialId}`);

      return true;

    } catch (error) {
      await queryRunner.rollbackTransaction();

      await this.logAccess(
        queryRunner,
        credentialId,
        'delete',
        false,
        auditContext,
        error.message
      );

      this.logger.error(`Failed to delete credential ${credentialId}: ${error.message}`);
      throw error;

    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk operations
   */
  public async bulkStoreCredentials(
    credentials: Array<{
      credentialId: string;
      plaintext: string;
      dataType: EncryptedCredential['metadata']['dataType'];
      purpose: string;
      options?: CredentialStorageOptions;
    }>,
    auditContext?: any
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const cred of credentials) {
      try {
        await this.storeCredential(
          cred.credentialId,
          cred.plaintext,
          cred.dataType,
          cred.purpose,
          cred.options,
          auditContext
        );
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          credentialId: cred.credentialId,
          error: error.message
        });
      }
    }

    this.logger.log(`Bulk store completed: ${result.successful} successful, ${result.failed} failed`);

    return result;
  }

  /**
   * Rotate credentials using new keys
   */
  public async rotateCredentials(
    filter: CredentialFilter = {},
    auditContext?: any
  ): Promise<BulkOperationResult> {
    try {
      const { credentials } = await this.listCredentials(filter, 1000); // Process in batches
      
      const result: BulkOperationResult = {
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const storedCred of credentials) {
        try {
          // Retrieve current plaintext
          const retrieved = await this.retrieveCredential(storedCred.credentialId, auditContext);
          if (!retrieved) {
            throw new Error('Failed to retrieve credential for rotation');
          }

          // Re-store with new encryption (will use new key)
          await this.storeCredential(
            storedCred.credentialId,
            retrieved.plaintext,
            storedCred.dataType as any,
            storedCred.purpose,
            {
              description: storedCred.description,
              tags: storedCred.tags,
              externalId: storedCred.externalId,
              expiresAt: storedCred.expiresAt
            },
            auditContext
          );

          await this.logAccess(
            null,
            storedCred.credentialId,
            'rotate',
            true,
            auditContext
          );

          result.successful++;

        } catch (error) {
          result.failed++;
          result.errors.push({
            credentialId: storedCred.credentialId,
            error: error.message
          });

          await this.logAccess(
            null,
            storedCred.credentialId,
            'rotate',
            false,
            auditContext,
            error.message
          );
        }
      }

      this.logger.log(`Credential rotation completed: ${result.successful} successful, ${result.failed} failed`);

      return result;

    } catch (error) {
      this.logger.error(`Credential rotation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get credential access logs
   */
  public async getAccessLogs(
    credentialId?: string,
    operation?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<CredentialAccessLogEntity[]> {
    const queryBuilder = this.accessLogRepository.createQueryBuilder('log');

    if (credentialId) {
      queryBuilder.andWhere('log.credentialId = :credentialId', { credentialId });
    }

    if (operation) {
      queryBuilder.andWhere('log.operation = :operation', { operation });
    }

    return await queryBuilder
      .orderBy('log.timestamp', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  /**
   * Log credential access
   */
  private async logAccess(
    queryRunner: QueryRunner | null,
    credentialId: string,
    operation: CredentialAccessLogEntity['operation'],
    success: boolean,
    auditContext?: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logEntry = new CredentialAccessLogEntity();
      logEntry.credentialId = credentialId;
      logEntry.operation = operation;
      logEntry.success = success;
      logEntry.errorMessage = errorMessage;

      if (auditContext) {
        logEntry.userId = auditContext.userId;
        logEntry.userAgent = auditContext.userAgent;
        logEntry.ipAddress = auditContext.ipAddress;
        logEntry.source = auditContext.source;
        logEntry.metadata = auditContext.metadata;
      }

      if (queryRunner) {
        await queryRunner.manager.save(logEntry);
      } else {
        await this.accessLogRepository.save(logEntry);
      }

    } catch (error) {
      this.logger.error(`Failed to log credential access: ${error.message}`);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Convert entity to stored credential
   */
  private entityToStoredCredential(entity: EncryptedCredentialEntity): StoredCredential {
    return {
      id: entity.id,
      credentialId: entity.credentialId,
      purpose: entity.purpose,
      dataType: entity.dataType,
      description: entity.description,
      tags: entity.tags,
      externalId: entity.externalId,
      expiresAt: entity.expiresAt,
      lastAccessed: entity.lastAccessed,
      accessCount: entity.accessCount,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Get storage statistics
   */
  public async getStorageStatistics(): Promise<any> {
    const [total, active, expired, byType, byPurpose] = await Promise.all([
      this.credentialRepository.count(),
      this.credentialRepository.count({ where: { isActive: true } }),
      this.credentialRepository.count({
        where: {
          expiresAt: { $lte: new Date() } as any
        }
      }),
      this.credentialRepository
        .createQueryBuilder('cred')
        .select('cred.dataType', 'dataType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cred.dataType')
        .getRawMany(),
      this.credentialRepository
        .createQueryBuilder('cred')
        .select('cred.purpose', 'purpose')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cred.purpose')
        .getRawMany()
    ]);

    return {
      total,
      active,
      expired,
      byType,
      byPurpose
    };
  }

  /**
   * Cleanup expired credentials
   */
  public async cleanupExpiredCredentials(): Promise<number> {
    const expiredCredentials = await this.credentialRepository.find({
      where: {
        expiresAt: { $lte: new Date() } as any,
        isActive: true
      }
    });

    for (const credential of expiredCredentials) {
      credential.isActive = false;
      await this.credentialRepository.save(credential);
    }

    this.logger.log(`Cleaned up ${expiredCredentials.length} expired credentials`);

    return expiredCredentials.length;
  }
}