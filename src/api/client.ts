import axios, { AxiosInstance } from "axios";
import { BentoError, BentoErrorCode } from "../errors/bento-error";
import { AnalysisResult } from "../types";
import { BENTO_GUARD_DEFAULT_URL, DEFAULT_TIMEOUT } from "../constants";

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl?: string, timeout?: number) {
    const configuredTimeout =
      timeout ??
      Number(
        process.env.BENTO_PROTECT_TIMEOUT_MS ||
        process.env.BENTO_TIMEOUT_MS ||
        DEFAULT_TIMEOUT,
      );

    this.axiosInstance = axios.create({
      baseURL: baseUrl || BENTO_GUARD_DEFAULT_URL,
      timeout: configuredTimeout,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public async postTransaction(
    payload: {
      agent_address: string;
      wallet_address: string;
      encrypted_payload: string;
      signature: string;
      base64_tx: string;
    },
    timeout?: number,
  ): Promise<AnalysisResult> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/transactions",
        payload,
        timeout ? { timeout } : undefined,
      );
      if (!response.data?.data) {
        throw new BentoError(
          BentoErrorCode.NETWORK_ERROR,
          "Invalid response format",
        );
      }
      return response.data.data;
    } catch (error: any) {
      const status = error.response?.status;
      const serverData = error.response?.data;
      const serverMessage =
        serverData?.message || serverData?.error?.message || error.message;

      if (process.env.BENTO_DEBUG === "true") {
        console.error(
          `[SDK] POST ERROR: ${serverMessage} (Status: ${status || "N/A"})`,
        );
      }

      throw BentoError.fromError(error);
    }
  }

  public async checkRegistration(agentAddress: string, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/api/v1/agents/check-registration?agentAddress=${agentAddress}`,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async getRelayerInfo(timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get("/api/v1/system/relayer", timeout ? { timeout } : undefined);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async getOnchainConfig(timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.get("/api/v1/system/config", timeout ? { timeout } : undefined);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async buildInit(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/build-init",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async initAction(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/init",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async buildAppend(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/build-append",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async appendPayload(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/append-payload",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async buildAppendAndFinalize(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/build-append-and-finalize",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public async appendAndFinalize(data: any, timeout?: number): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        "/api/v1/actions/onchain/append-and-finalize",
        data,
        timeout ? { timeout } : undefined,
      );
      return response.data?.data ?? response.data;
    } catch (error: any) {
      throw BentoError.fromError(error);
    }
  }

  public streamActionStatus(actionId: string, timeoutMs: number = 300000): Promise<any> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Stream timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.axiosInstance.get(`/api/v1/actions/stream/${actionId}`, {
        responseType: "stream",
        signal: controller.signal,
        timeout: 0,
      }).then(response => {
        const stream = response.data;
        stream.on("data", (chunk: any) => {
          const chunkStr = chunk.toString();
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                const payload = parsed.data || parsed;
                if (payload.final_decision && payload.final_decision !== "ESCALATED") {
                  clearTimeout(timeoutId);
                  stream.destroy();
                  resolve(payload);
                }
              } catch (e) { }
            }
          }
        });
        stream.on("error", (err: any) => {
          clearTimeout(timeoutId);
          reject(err);
        });
        stream.on("end", () => {
          clearTimeout(timeoutId);
          reject(new Error("Stream closed unexpectedly"));
        });
      }).catch(err => {
        clearTimeout(timeoutId);
        reject(BentoError.fromError(err));
      });
    });
  }
}
