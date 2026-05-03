export enum BentoErrorCode {
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  HIGH_RISK_DETECTED = 'HIGH_RISK_DETECTED',
  INVALID_CONFIG = 'INVALID_CONFIG',
}

export class BentoError extends Error {
  constructor(
    public code: BentoErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BentoError';
  }
}
