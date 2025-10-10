/**
 * Encryption Module
 * Comprehensive encryption and credential management module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { KeyManagementService } from './key-management.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { SecureCredentialStorageService, EncryptedCredentialEntity, CredentialAccessLogEntity } from './secure-credential-storage.service';
import { CredentialRotationService } from './credential-rotation.service';
import { CredentialVaultService } from './credential-vault.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      EncryptedCredentialEntity,
      CredentialAccessLogEntity
    ])
  ],
  providers: [
    // Core encryption services
    KeyManagementService,
    CredentialEncryptionService,
    SecureCredentialStorageService,
    CredentialRotationService,
    CredentialVaultService
  ],
  exports: [
    KeyManagementService,
    CredentialEncryptionService,
    SecureCredentialStorageService,
    CredentialRotationService,
    CredentialVaultService
  ]
})
export class EncryptionModule {}