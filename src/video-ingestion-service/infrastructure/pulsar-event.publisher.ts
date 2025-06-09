import { EventPublisher } from '../domain/ports/event.publisher';
import { DomainEvent } from '../domain/events/domain-event.interface';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, Producer } from 'pulsar-client';

@Injectable()
export class PulsarEventPublisher implements EventPublisher, OnModuleDestroy {
  private readonly logger = new Logger(PulsarEventPublisher.name);
  private client: Client;
  private producer: Producer;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = new Client({
        serviceUrl: process.env.PULSAR_SERVICE_URL || 'pulsar://localhost:6650',
        operationTimeoutSeconds: 30,
        ioThreads: 4,
        messageListenerThreads: 4,
        concurrentLookupRequest: 50000,
        useTls: process.env.PULSAR_USE_TLS === 'true',
        tlsTrustCertsFilePath: process.env.PULSAR_TLS_CERT_PATH,
        tlsValidateHostname: false,
        tlsAllowInsecureConnection: process.env.NODE_ENV !== 'production',
      });

      this.producer = await this.client.createProducer({
        topic: 'video-ingestion-events',
        sendTimeoutMs: 30000,
        batchingEnabled: true,
        batchingMaxMessages: 100,
        batchingMaxPublishDelayMs: 100,
        maxPendingMessages: 1000,
        blockIfQueueFull: true,
        compressionType: 'LZ4',
        producerName: 'video-ingestion-service',
      });

      this.isInitialized = true;
      this.logger.log('Pulsar client and producer initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Pulsar client: ${error.message}`,
        error.stack
      );
      throw new Error(`Pulsar initialization failed: ${error.message}`);
    }
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    await this.ensureInitialized();

    try {
      const message = {
        data: Buffer.from(JSON.stringify(event)),
        properties: {
          eventType: event.eventType,
          eventId: event.eventId,
          aggregateId: event.aggregateId,
          version: event.version.toString(),
          occurredOn: event.occurredOn.toISOString(),
          ...(event.correlationId && { correlationId: event.correlationId }),
          ...(event.causationId && { causationId: event.causationId }),
        },
        eventTimestamp: event.occurredOn.getTime(),
        key: event.aggregateId,
      };

      await this.producer.send(message);

      this.logger.debug(
        `Event published: ${event.eventType} for aggregate ${event.aggregateId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${error.message}`,
        error.stack
      );
      throw new Error(`Event publishing failed: ${error.message}`);
    }
  }

  async publishBatch<T extends DomainEvent>(events: T[]): Promise<void> {
    if (events.length === 0) return;

    await this.ensureInitialized();

    try {
      const publishPromises = events.map(event => this.publish(event));
      await Promise.all(publishPromises);

      this.logger.debug(
        `Batch of ${events.length} events published successfully`
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event batch: ${error.message}`,
        error.stack
      );
      throw new Error(`Batch event publishing failed: ${error.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.close();
        this.logger.log('Pulsar producer closed');
      }

      if (this.client) {
        await this.client.close();
        this.logger.log('Pulsar client closed');
      }
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`, error.stack);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeClient();
    }
  }
}
