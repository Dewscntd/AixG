import { Test, TestingModule } from '@nestjs/testing';
import { LigaLeumitConnector } from '../../../src/sync-engine/infrastructure/connectors/liga-leumit.connector';
import { SyncConfiguration } from '../../../src/sync-engine/domain/value-objects/sync-configuration';
import { ExternalSystemType } from '../../../src/integration-framework/domain/value-objects/external-system-type';
import { DataTypeEnum } from '../../../src/sync-engine/domain/enums/data-type.enum';
import { ConnectionStatus } from '../../../src/integration-framework/domain/value-objects/connection-status';

/**
 * Liga Leumit Connector Unit Test
 */
describe('LigaLeumitConnector', () => {
  let connector: LigaLeumitConnector;
  let validConfig: SyncConfiguration;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LigaLeumitConnector],
    }).compile();

    connector = module.get<LigaLeumitConnector>(LigaLeumitConnector);
    validConfig = new SyncConfiguration(
      [DataTypeEnum.MATCH_SCHEDULE, DataTypeEnum.PLAYER_PROFILES],
      'https://api.ligaleumit.com',
      { apiKey: 'valid-api-key' }
    );
  });

  it('should establish a connection successfully', async () => {
    const status = await connector.connect(validConfig);
    expect(status).toBe(ConnectionStatus.CONNECTED);
  });

  it('should perform a health check successfully', async () => {
    await connector.connect(validConfig);
    const isHealthy = await connector.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should synchronize data types successfully', async () => {
    await connector.connect(validConfig);
    const result = await connector.sync([
      DataTypeEnum.MATCH_SCHEDULE,
      DataTypeEnum.PLAYER_PROFILES,
    ]);
    expect(result.isSuccess).toBe(true);
    expect(result.recordsProcessed).toBeGreaterThan(0);
  });

  it('should throw an error on invalid configuration', async () => {
    expect(() => {
      new SyncConfiguration([], 'invalid-url', { apiKey: '' });
    }).toThrow('At least one data type must be specified');
  });
});
