export enum BentoErrorCode {
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  HIGH_RISK_DETECTED = "HIGH_RISK_DETECTED",
  INVALID_CONFIG = "INVALID_CONFIG",
  KEY_DERIVATION_FAILED = "KEY_DERIVATION_FAILED",
  NOT_INITIALIZED = "NOT_INITIALIZED",
  ALREADY_FINALIZED = "ALREADY_FINALIZED",
  NOT_FOUND = "NOT_FOUND",
}

export class BentoError extends Error {
  constructor(
    public code: BentoErrorCode,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "BentoError";
    Object.setPrototypeOf(this, BentoError.prototype);
  }

  public static fromError(
    error: any,
    defaultCode = BentoErrorCode.NETWORK_ERROR,
  ): BentoError {
    if (error instanceof BentoError) return error;

    if (error.response?.status === 409) {
      return new BentoError(
        BentoErrorCode.ALREADY_FINALIZED,
        error.response?.data?.message || "Action already finalized",
      );
    }

    if (error.response?.status === 401) {
      return new BentoError(
        BentoErrorCode.UNAUTHORIZED,
        error.response?.data?.message || "Unauthorized access",
      );
    }

    if (error.response?.status === 400) {
      const rawMsg = error.response?.data?.message ?? "";
      const msg: string = Array.isArray(rawMsg) ? rawMsg.join(", ") : String(rawMsg);
      if (
        msg.toLowerCase().includes("threat") ||
        msg.toLowerCase().includes("high risk") ||
        msg.toLowerCase().includes("security check")
      ) {
        return new BentoError(BentoErrorCode.HIGH_RISK_DETECTED, msg, error);
      }
    }

    const serverMessage = error.response?.data?.message;
    return new BentoError(
      defaultCode,
      serverMessage || error.message || "An unknown error occurred",
      error,
    );
  }
}
