import axios, { AxiosInstance } from 'axios';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { AnalysisResult } from '../types';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || 'https://api.bento-guard.com',
      timeout: 30000,
    });
  }

  public async getSystemPublicKey(): Promise<string> {
    try {
      const response = await this.axiosInstance.get('/api/v1/system/public-key');
      if (!response.data?.success || !response.data?.data?.publicKey) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Failed to retrieve system public key');
      }
      return response.data.data.publicKey;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async postTransaction(payload: {
    agent_id: string; // Communication Public Key (X25519)
    wallet_address: string; // Identity Public Key (Wallet)
    encrypted_payload: string;
    signature: string; // Proof of Identity
    base64_tx: string;
    network: string;
  }): Promise<AnalysisResult> {
    try {
      const response = await this.axiosInstance.post('/api/v1/transactions', payload);
      if (!response.data?.success || !response.data?.data) {
        throw new BentoError(BentoErrorCode.NETWORK_ERROR, 'Failed to submit transaction to backend');
      }
      return response.data.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }
}
