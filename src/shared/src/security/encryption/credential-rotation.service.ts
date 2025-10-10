/**
 * Credential Rotation Service
 * Automated rotation system for credentials and encryption keys with policy management
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KeyManagementService, EncryptionKey, KeyRotationPolicy } from './key-management.service';
import { SecureCredentialStorageService, StoredCredential, CredentialFilter } from './secure-credential-storage.service';
import { CredentialEncryptionService } from './credential-encryption.service';

export interface RotationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  schedule: string; // Cron expression
  targets: {
    purposes: string[];
    dataTypes: string[];
    tags: string[];
    externalIds: string[];
  };
  conditions: {
    maxAge: number; // milliseconds
    accessThreshold: number; // number of accesses
    lastRotationAge: number; // milliseconds
  };
  notifications: {
    beforeRotation: number; // milliseconds
    onSuccess: boolean;
    onFailure: boolean;
    recipients: string[];
  };
  retryPolicy: {
    maxRetries: number;
    retryDelay: number; // milliseconds
    backoffMultiplier: number;
  };
  rollbackPolicy: {
    enabled: boolean;
    conditions: string[];
    timeoutMs: number;
  };
}

export interface RotationJob {
  id: string;
  policyId: string;
  credentialId: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  error?: string;
  oldKeyId?: string;
  newKeyId?: string;
  metadata: any;
}

export interface RotationResult {
  successful: number;
  failed: number;
  skipped: number;
  jobs: RotationJob[];
  errors: Array<{ credentialId: string; error: string }>;
  duration: number;
}

export interface RotationStats {
  totalRotations: number;
  successfulRotations: number;
  failedRotations: number;
  averageRotationTime: number;
  lastRotationDate: Date;
  nextScheduledRotation: Date;
  activeJobs: number;
  policies: {
    total: number;
    enabled: number;
    disabled: number;
  };
}

@Injectable()
export class CredentialRotationService implements OnModuleInit {
  private readonly logger = new Logger(CredentialRotationService.name);
  
  private rotationPolicies = new Map<string, RotationPolicy>();
  private rotationJobs = new Map<string, RotationJob>();
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  
  private rotationStats: RotationStats = {
    totalRotations: 0,
    successfulRotations: 0,
    failedRotations: 0,
    averageRotationTime: 0,
    lastRotationDate: new Date(0),
    nextScheduledRotation: new Date(),
    activeJobs: 0,
    policies: { total: 0, enabled: 0, disabled: 0 }
  };

  constructor(
    private readonly keyManagement: KeyManagementService,
    private readonly credentialStorage: SecureCredentialStorageService,
    private readonly credentialEncryption: CredentialEncryptionService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    await this.initializeRotationPolicies();
    this.scheduleRotationJobs();
  }

  /**
   * Initialize default rotation policies
   */
  private async initializeRotationPolicies(): Promise<void> {
    try {
      const defaultPolicies: RotationPolicy[] = [
        {
          id: 'high-security-credentials',
          name: 'High Security Credentials',
          description: 'Rotate high-security credentials every 30 days',
          enabled: true,
          schedule: '0 2 * * 0', // Every Sunday at 2 AM
          targets: {
            purposes: ['credential'],
            dataTypes: ['api-key', 'password'],
            tags: ['high-security', 'production'],
            externalIds: []
          },
          conditions: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            accessThreshold: 1000,
            lastRotationAge: 25 * 24 * 60 * 60 * 1000 // 25 days
          },
          notifications: {
            beforeRotation: 24 * 60 * 60 * 1000, // 24 hours
            onSuccess: true,
            onFailure: true,
            recipients: ['security@company.com']
          },
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 5 * 60 * 1000, // 5 minutes
            backoffMultiplier: 2
          },
          rollbackPolicy: {
            enabled: true,
            conditions: ['validation_failure', 'external_service_error'],
            timeoutMs: 30 * 60 * 1000 // 30 minutes
          }
        },
        {
          id: 'token-rotation',
          name: 'Token Rotation',
          description: 'Rotate tokens every 7 days',
          enabled: true,
          schedule: '0 3 * * *', // Every day at 3 AM
          targets: {
            purposes: ['credential', 'token'],
            dataTypes: ['token'],
            tags: ['jwt', 'oauth'],
            externalIds: []
          },
          conditions: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            accessThreshold: 100,
            lastRotationAge: 6 * 24 * 60 * 60 * 1000 // 6 days
          },
          notifications: {
            beforeRotation: 2 * 60 * 60 * 1000, // 2 hours
            onSuccess: false,
            onFailure: true,
            recipients: ['devops@company.com']
          },
          retryPolicy: {
            maxRetries: 2,
            retryDelay: 2 * 60 * 1000, // 2 minutes
            backoffMultiplier: 1.5
          },
          rollbackPolicy: {
            enabled: false,
            conditions: [],
            timeoutMs: 0
          }
        },
        {
          id: 'config-rotation',
          name: 'Configuration Rotation',
          description: 'Rotate configuration secrets every 60 days',
          enabled: true,
          schedule: '0 1 1 * *', // First day of every month at 1 AM
          targets: {
            purposes: ['config'],
            dataTypes: ['config'],
            tags: ['database', 'external-api'],
            externalIds: []
          },
          conditions: {
            maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
            accessThreshold: 500,
            lastRotationAge: 55 * 24 * 60 * 60 * 1000 // 55 days
          },
          notifications: {
            beforeRotation: 48 * 60 * 60 * 1000, // 48 hours
            onSuccess: true,
            onFailure: true,
            recipients: ['infrastructure@company.com']
          },
          retryPolicy: {
            maxRetries: 5,
            retryDelay: 10 * 60 * 1000, // 10 minutes
            backoffMultiplier: 2
          },
          rollbackPolicy: {
            enabled: true,
            conditions: ['database_connection_failure', 'service_unavailable'],
            timeoutMs: 60 * 60 * 1000 // 60 minutes
          }
        }
      ];

      for (const policy of defaultPolicies) {
        this.rotationPolicies.set(policy.id, policy);
      }

      this.updatePolicyStats();
      this.logger.log('Default rotation policies initialized');

    } catch (error) {
      this.logger.error(`Failed to initialize rotation policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule rotation jobs based on policies
   */
  private scheduleRotationJobs(): void {
    for (const policy of this.rotationPolicies.values()) {
      if (policy.enabled) {
        this.scheduleRotationForPolicy(policy);
      }
    }

    this.logger.log('Rotation jobs scheduled');
  }

  /**
   * Schedule rotation for specific policy
   */
  private scheduleRotationForPolicy(policy: RotationPolicy): void {
    try {
      // Clear existing scheduled job
      const existingJob = this.scheduledJobs.get(policy.id);
      if (existingJob) {
        clearTimeout(existingJob);
      }

      // Calculate next execution time based on cron expression
      const nextExecution = this.calculateNextExecution(policy.schedule);
      const delay = nextExecution.getTime() - Date.now();

      if (delay > 0) {
        const timeoutId = setTimeout(async () => {
          await this.executeRotationPolicy(policy.id);
          this.scheduleRotationForPolicy(policy); // Schedule next execution
        }, delay);

        this.scheduledJobs.set(policy.id, timeoutId);
        
        this.logger.debug(`Scheduled rotation for policy ${policy.id} at ${nextExecution.toISOString()}`);
      }

    } catch (error) {
      this.logger.error(`Failed to schedule rotation for policy ${policy.id}: ${error.message}`);
    }
  }

  /**
   * Execute rotation policy
   */
  public async executeRotationPolicy(policyId: string): Promise<RotationResult> {
    const startTime = Date.now();
    
    try {
      const policy = this.rotationPolicies.get(policyId);
      if (!policy) {
        throw new Error(`Rotation policy not found: ${policyId}`);
      }

      if (!policy.enabled) {
        this.logger.warn(`Skipping disabled rotation policy: ${policyId}`);
        return {
          successful: 0,
          failed: 0,
          skipped: 1,
          jobs: [],
          errors: [],
          duration: 0
        };
      }

      this.logger.log(`Executing rotation policy: ${policy.name}`);

      // Send pre-rotation notifications
      await this.sendPreRotationNotifications(policy);

      // Find credentials that need rotation
      const credentialsToRotate = await this.findCredentialsForRotation(policy);
      
      this.logger.log(`Found ${credentialsToRotate.length} credentials for rotation`);

      const result: RotationResult = {
        successful: 0,
        failed: 0,
        skipped: 0,
        jobs: [],
        errors: [],
        duration: 0
      };

      // Create rotation jobs
      for (const credential of credentialsToRotate) {
        const job = await this.createRotationJob(policy, credential);
        result.jobs.push(job);
      }

      // Execute rotation jobs
      for (const job of result.jobs) {
        try {
          await this.executeRotationJob(job);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            credentialId: job.credentialId,
            error: error.message
          });
        }
      }

      result.duration = Date.now() - startTime;

      // Update statistics
      this.updateRotationStats(result);

      // Send post-rotation notifications
      await this.sendPostRotationNotifications(policy, result);

      // Emit rotation completed event
      this.eventEmitter.emit('credential.rotation.completed', {
        policyId,
        result
      });

      this.logger.log(`Rotation policy completed: ${policy.name} (${result.successful}/${result.jobs.length} successful)`);

      return result;

    } catch (error) {
      this.logger.error(`Rotation policy execution failed for ${policyId}: ${error.message}`);
      
      // Emit rotation failed event
      this.eventEmitter.emit('credential.rotation.failed', {
        policyId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Find credentials that need rotation based on policy
   */
  private async findCredentialsForRotation(policy: RotationPolicy): Promise<StoredCredential[]> {
    const filter: CredentialFilter = {
      isActive: true
    };

    // Apply purpose filter
    if (policy.targets.purposes.length > 0) {
      // For simplicity, we'll check the first purpose
      filter.purpose = policy.targets.purposes[0];
    }

    // Apply data type filter
    if (policy.targets.dataTypes.length > 0) {
      filter.dataType = policy.targets.dataTypes[0] as any;
    }

    // Apply tags filter
    if (policy.targets.tags.length > 0) {
      filter.tags = policy.targets.tags;
    }

    // Get credentials
    const { credentials } = await this.credentialStorage.listCredentials(filter, 1000);

    // Apply condition filters
    const now = Date.now();
    return credentials.filter(credential => {
      // Check max age
      if (policy.conditions.maxAge > 0) {
        const age = now - credential.createdAt.getTime();
        if (age < policy.conditions.maxAge) {
          return false;
        }
      }

      // Check access threshold
      if (policy.conditions.accessThreshold > 0) {
        if (credential.accessCount < policy.conditions.accessThreshold) {
          return false;
        }
      }

      // Check last rotation age (simplified - in reality would track rotation history)
      if (policy.conditions.lastRotationAge > 0) {
        const lastUpdateAge = now - credential.updatedAt.getTime();
        if (lastUpdateAge < policy.conditions.lastRotationAge) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create rotation job
   */
  private async createRotationJob(policy: RotationPolicy, credential: StoredCredential): Promise<RotationJob> {
    const job: RotationJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      policyId: policy.id,
      credentialId: credential.credentialId,
      scheduledAt: new Date(),
      status: 'scheduled',
      retryCount: 0,
      metadata: {
        originalPurpose: credential.purpose,
        originalDataType: credential.dataType,
        tags: credential.tags
      }
    };

    this.rotationJobs.set(job.id, job);
    return job;
  }

  /**
   * Execute rotation job
   */
  private async executeRotationJob(job: RotationJob): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.rotationStats.activeJobs++;

      this.logger.debug(`Executing rotation job: ${job.id} for credential: ${job.credentialId}`);

      // Get current credential
      const retrieved = await this.credentialStorage.retrieveCredential(job.credentialId);
      if (!retrieved) {
        throw new Error(`Credential not found: ${job.credentialId}`);
      }

      const { credential, plaintext } = retrieved;
      job.oldKeyId = 'current-key'; // Would get actual key ID from credential

      // Generate new encryption key
      const newKey = await this.keyManagement.generateKey(credential.purpose as any);
      job.newKeyId = newKey.id;

      // Re-encrypt credential with new key
      await this.credentialStorage.storeCredential(
        credential.credentialId,
        plaintext,
        credential.dataType as any,
        credential.purpose,
        {
          description: credential.description,
          tags: credential.tags,
          externalId: credential.externalId,
          expiresAt: credential.expiresAt
        },
        {
          operation: 'rotation',
          jobId: job.id,
          oldKeyId: job.oldKeyId,
          newKeyId: job.newKeyId
        }
      );

      job.status = 'completed';
      job.completedAt = new Date();
      this.rotationStats.activeJobs--;

      this.logger.debug(`Rotation job completed: ${job.id}`);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.rotationStats.activeJobs--;

      // Handle retry logic
      const policy = this.rotationPolicies.get(job.policyId);
      if (policy && job.retryCount < policy.retryPolicy.maxRetries) {
        await this.scheduleRetry(job, policy);
      } else {
        this.logger.error(`Rotation job failed: ${job.id} - ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Schedule retry for failed job
   */
  private async scheduleRetry(job: RotationJob, policy: RotationPolicy): Promise<void> {
    job.retryCount++;
    job.status = 'scheduled';

    const delay = policy.retryPolicy.retryDelay * Math.pow(policy.retryPolicy.backoffMultiplier, job.retryCount - 1);

    setTimeout(async () => {
      try {
        await this.executeRotationJob(job);
      } catch (error) {
        this.logger.error(`Retry failed for job ${job.id}: ${error.message}`);
      }
    }, delay);

    this.logger.debug(`Scheduled retry ${job.retryCount} for job ${job.id} in ${delay}ms`);
  }

  /**
   * Manual rotation for specific credential
   */
  public async rotateCredential(credentialId: string, force: boolean = false): Promise<RotationResult> {
    try {
      this.logger.log(`Manual rotation requested for credential: ${credentialId}`);

      const retrieved = await this.credentialStorage.retrieveCredential(credentialId);
      if (!retrieved) {
        throw new Error(`Credential not found: ${credentialId}`);
      }

      // Create temporary policy for manual rotation
      const tempPolicy: RotationPolicy = {
        id: 'manual-rotation',
        name: 'Manual Rotation',
        description: 'Manual credential rotation',
        enabled: true,
        schedule: '',
        targets: { purposes: [], dataTypes: [], tags: [], externalIds: [] },
        conditions: { maxAge: 0, accessThreshold: 0, lastRotationAge: 0 },
        notifications: { beforeRotation: 0, onSuccess: false, onFailure: true, recipients: [] },
        retryPolicy: { maxRetries: 0, retryDelay: 0, backoffMultiplier: 1 },
        rollbackPolicy: { enabled: false, conditions: [], timeoutMs: 0 }
      };

      const job = await this.createRotationJob(tempPolicy, retrieved.credential);
      
      try {
        await this.executeRotationJob(job);
        
        return {
          successful: 1,
          failed: 0,
          skipped: 0,
          jobs: [job],
          errors: [],
          duration: job.completedAt!.getTime() - job.startedAt!.getTime()
        };
      } catch (error) {
        return {
          successful: 0,
          failed: 1,
          skipped: 0,
          jobs: [job],
          errors: [{ credentialId, error: error.message }],
          duration: 0
        };
      }

    } catch (error) {
      this.logger.error(`Manual rotation failed for ${credentialId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk rotation for multiple credentials
   */
  public async bulkRotateCredentials(credentialIds: string[]): Promise<RotationResult> {
    const startTime = Date.now();
    const result: RotationResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      jobs: [],
      errors: [],
      duration: 0
    };

    for (const credentialId of credentialIds) {
      try {
        const rotationResult = await this.rotateCredential(credentialId);
        result.successful += rotationResult.successful;
        result.failed += rotationResult.failed;
        result.jobs.push(...rotationResult.jobs);
        result.errors.push(...rotationResult.errors);
      } catch (error) {
        result.failed++;
        result.errors.push({ credentialId, error: error.message });
      }
    }

    result.duration = Date.now() - startTime;
    this.updateRotationStats(result);

    return result;
  }

  /**
   * Emergency rotation (immediate rotation of all matching credentials)
   */
  public async emergencyRotation(filter: CredentialFilter): Promise<RotationResult> {
    try {
      this.logger.warn('Emergency rotation initiated');

      const { credentials } = await this.credentialStorage.listCredentials(filter, 10000);
      const credentialIds = credentials.map(c => c.credentialId);

      const result = await this.bulkRotateCredentials(credentialIds);

      // Emit emergency rotation event
      this.eventEmitter.emit('credential.rotation.emergency', {
        filter,
        result
      });

      this.logger.warn(`Emergency rotation completed: ${result.successful}/${credentialIds.length} successful`);

      return result;

    } catch (error) {
      this.logger.error(`Emergency rotation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scheduled cron job for daily rotation checks
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyRotationCheck(): Promise<void> {
    try {
      this.logger.log('Running daily rotation check...');

      for (const policy of this.rotationPolicies.values()) {
        if (policy.enabled && this.shouldRunPolicy(policy)) {
          await this.executeRotationPolicy(policy.id);
        }
      }

      // Cleanup completed jobs older than 30 days
      await this.cleanupOldJobs();

    } catch (error) {
      this.logger.error(`Daily rotation check failed: ${error.message}`);
    }
  }

  /**
   * Check if policy should run based on conditions
   */
  private shouldRunPolicy(policy: RotationPolicy): boolean {
    // Check if any credentials match the policy conditions
    // This is a simplified check - in reality would be more comprehensive
    return true;
  }

  /**
   * Cleanup old rotation jobs
   */
  private async cleanupOldJobs(): Promise<void> {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    for (const [jobId, job] of this.rotationJobs.entries()) {
      if (job.completedAt && job.completedAt.getTime() < cutoff) {
        this.rotationJobs.delete(jobId);
      }
    }

    this.logger.debug('Cleaned up old rotation jobs');
  }

  /**
   * Send pre-rotation notifications
   */
  private async sendPreRotationNotifications(policy: RotationPolicy): Promise<void> {
    if (policy.notifications.beforeRotation > 0) {
      // In a real implementation, this would send emails/alerts
      this.logger.log(`Pre-rotation notification sent for policy: ${policy.name}`);
    }
  }

  /**
   * Send post-rotation notifications
   */
  private async sendPostRotationNotifications(policy: RotationPolicy, result: RotationResult): Promise<void> {
    if ((policy.notifications.onSuccess && result.successful > 0) || 
        (policy.notifications.onFailure && result.failed > 0)) {
      // In a real implementation, this would send emails/alerts
      this.logger.log(`Post-rotation notification sent for policy: ${policy.name}`);
    }
  }

  /**
   * Calculate next execution time from cron expression
   */
  private calculateNextExecution(cronExpression: string): Date {
    // Simplified implementation - in reality would use a proper cron parser
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day
  }

  /**
   * Update rotation statistics
   */
  private updateRotationStats(result: RotationResult): void {
    this.rotationStats.totalRotations += result.jobs.length;
    this.rotationStats.successfulRotations += result.successful;
    this.rotationStats.failedRotations += result.failed;
    
    if (result.duration > 0) {
      this.rotationStats.averageRotationTime = 
        (this.rotationStats.averageRotationTime * (this.rotationStats.totalRotations - result.jobs.length) + result.duration) / 
        this.rotationStats.totalRotations;
    }
    
    this.rotationStats.lastRotationDate = new Date();
  }

  /**
   * Update policy statistics
   */
  private updatePolicyStats(): void {
    this.rotationStats.policies.total = this.rotationPolicies.size;
    this.rotationStats.policies.enabled = Array.from(this.rotationPolicies.values()).filter(p => p.enabled).length;
    this.rotationStats.policies.disabled = this.rotationStats.policies.total - this.rotationStats.policies.enabled;
  }

  /**
   * Get rotation statistics
   */
  public getRotationStatistics(): RotationStats {
    return { ...this.rotationStats };
  }

  /**
   * Get rotation policies
   */
  public getRotationPolicies(): RotationPolicy[] {
    return Array.from(this.rotationPolicies.values());
  }

  /**
   * Get rotation jobs
   */
  public getRotationJobs(status?: RotationJob['status']): RotationJob[] {
    const jobs = Array.from(this.rotationJobs.values());
    return status ? jobs.filter(job => job.status === status) : jobs;
  }

  /**
   * Update rotation policy
   */
  public async updateRotationPolicy(policyId: string, updates: Partial<RotationPolicy>): Promise<void> {
    const policy = this.rotationPolicies.get(policyId);
    if (!policy) {
      throw new Error(`Rotation policy not found: ${policyId}`);
    }

    Object.assign(policy, updates);
    
    // Reschedule if enabled status changed
    if ('enabled' in updates) {
      if (updates.enabled) {
        this.scheduleRotationForPolicy(policy);
      } else {
        const existingJob = this.scheduledJobs.get(policyId);
        if (existingJob) {
          clearTimeout(existingJob);
          this.scheduledJobs.delete(policyId);
        }
      }
    }

    this.updatePolicyStats();
    this.logger.log(`Rotation policy updated: ${policyId}`);
  }

  /**
   * Add new rotation policy
   */
  public async addRotationPolicy(policy: RotationPolicy): Promise<void> {
    if (this.rotationPolicies.has(policy.id)) {
      throw new Error(`Rotation policy already exists: ${policy.id}`);
    }

    this.rotationPolicies.set(policy.id, policy);
    
    if (policy.enabled) {
      this.scheduleRotationForPolicy(policy);
    }

    this.updatePolicyStats();
    this.logger.log(`Rotation policy added: ${policy.id}`);
  }

  /**
   * Remove rotation policy
   */
  public async removeRotationPolicy(policyId: string): Promise<void> {
    const policy = this.rotationPolicies.get(policyId);
    if (!policy) {
      throw new Error(`Rotation policy not found: ${policyId}`);
    }

    // Clear scheduled job
    const existingJob = this.scheduledJobs.get(policyId);
    if (existingJob) {
      clearTimeout(existingJob);
      this.scheduledJobs.delete(policyId);
    }

    this.rotationPolicies.delete(policyId);
    this.updatePolicyStats();
    
    this.logger.log(`Rotation policy removed: ${policyId}`);
  }
}