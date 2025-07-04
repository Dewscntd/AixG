/**
 * Connection Status Value Object
 *
 * Immutable representation of connection state for external systems.
 */
export enum ConnectionStatusEnum {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  RECONNECTING = 'RECONNECTING',
  TIMEOUT = 'TIMEOUT',
}

export class ConnectionStatus {
  private readonly _value: ConnectionStatusEnum;

  constructor(value: ConnectionStatusEnum) {
    this._value = value;
  }

  static DISCONNECTED = new ConnectionStatus(ConnectionStatusEnum.DISCONNECTED);
  static CONNECTING = new ConnectionStatus(ConnectionStatusEnum.CONNECTING);
  static CONNECTED = new ConnectionStatus(ConnectionStatusEnum.CONNECTED);
  static FAILED = new ConnectionStatus(ConnectionStatusEnum.FAILED);
  static RECONNECTING = new ConnectionStatus(ConnectionStatusEnum.RECONNECTING);
  static TIMEOUT = new ConnectionStatus(ConnectionStatusEnum.TIMEOUT);

  get value(): ConnectionStatusEnum {
    return this._value;
  }

  equals(other: ConnectionStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Check if status indicates a connected state
   */
  isConnected(): boolean {
    return this._value === ConnectionStatusEnum.CONNECTED;
  }

  /**
   * Check if status indicates a failure state
   */
  isFailed(): boolean {
    return [ConnectionStatusEnum.FAILED, ConnectionStatusEnum.TIMEOUT].includes(
      this._value
    );
  }

  /**
   * Check if status indicates an in-progress state
   */
  isInProgress(): boolean {
    return [
      ConnectionStatusEnum.CONNECTING,
      ConnectionStatusEnum.RECONNECTING,
    ].includes(this._value);
  }

  /**
   * Get next logical status for retry scenarios
   */
  getRetryStatus(): ConnectionStatus {
    switch (this._value) {
      case ConnectionStatusEnum.FAILED:
      case ConnectionStatusEnum.TIMEOUT:
        return ConnectionStatus.RECONNECTING;
      case ConnectionStatusEnum.DISCONNECTED:
        return ConnectionStatus.CONNECTING;
      default:
        return this;
    }
  }
}
