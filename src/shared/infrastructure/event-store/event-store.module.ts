import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { EventStoreService } from './event-store.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    CqrsModule,
  ],
  providers: [EventStoreService],
  exports: [EventStoreService, EventEmitterModule, CqrsModule],
})
export class EventStoreModule {}