import { getAuthDetailsFromEnv, loadEnv } from "./env";
import {
  ChainConfig,
  Prettify,
  RunChainOptions,
  RunChainOutput,
} from "./types";

export type APIAuthDetails = {
  project: string;
  region: string;
  apiKey: string;
};

export class API {
  private authDetails: APIAuthDetails;

  constructor(authDetails?: APIAuthDetails) {
    loadEnv();

    const authDetailsToUse = authDetails ?? getAuthDetailsFromEnv();

    if (
      !authDetailsToUse.project ||
      !authDetailsToUse.region ||
      !authDetailsToUse.apiKey
    ) {
      throw new Error(
        "Missing auth details. Please provide a project ID, region, and API key."
      );
    }

    this.authDetails = authDetailsToUse;
  }

  private get token() {
    return `${this.authDetails.project}:${this.authDetails.apiKey}:${this.authDetails.region}`;
  }

  private async request(
    path: `/${string}`,
    options?: RequestInit & { query?: Record<string, any> }
  ) {
    const queryParams = options?.query
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(options.query).map(([key, value]) => {
              return [
                key,
                typeof value === "object" ? JSON.stringify(value) : value,
              ];
            })
          )
        )
      : "";

    const url = `https://api-${this.authDetails.region}.stack.tryrelevance.com/latest${path}?${queryParams}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: this.token,
      },
    });

    if (!response.ok) {
      let message = await response.text();
      try {
        message = JSON.parse(message).message || message;
      } catch {
        // do nothing
      }
      throw new APIError(message);
    }

    return response.json();
  }

  async getChain(chainId: string, version?: string): Promise<ChainConfig> {
    const response = await this.request(`/studios/${chainId}`);
    return response.studio;
  }

  async runChain<Output extends Record<string, any>>(
    options: RunChainOptions<true>
  ): Promise<Prettify<RunChainOutput<true, Output>>>;
  async runChain<Output extends Record<string, any>>(
    options: RunChainOptions<false>
  ): Promise<Prettify<RunChainOutput<false, Output>>>;
  async runChain(options: RunChainOptions): Promise<RunChainOutput> {
    const response = await this.request(
      `/studios/${options.studio_id}/trigger`,
      {
        method: "POST",
        body: JSON.stringify(options),
      }
    );
    return response;
  }

  async saveChains(body: {
    updates: ChainConfig[];
    version?: string;
    partial_update?: boolean;
  }) {
    const response = await this.request("/studios/bulk_update", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        partial_update: body.partial_update ?? true,
      }),
    });
    return response;
  }

  async getChainsByIds(ids: string[]): Promise<ChainConfig[]> {
    const response = await this.request("/studios/list", {
      query: {
        filters: [
          {
            filter_type: "exact_match",
            field: "studio_id",
            condition_value: ids,
          },
          {
            filter_type: "exact_match",
            field: "project",
            condition_value: this.authDetails.project,
          },
        ],
      },
    });

    return response.results;
  }

  async shareChain(
    chainId: string
  ): Promise<{ share_link: string; share_id: string; region: string }> {
    const response = await this.request(`/studios/${chainId}/get_share_link`, {
      method: "POST",
    });

    return response;
  }

  async unshareChain(chainId: string, shareId: string): Promise<void> {
    await this.request(`/studios/${chainId}/delete_share_link`, {
      body: JSON.stringify({
        share_id: shareId,
      }),
    });
  }
}

export class APIError extends Error {
  constructor(message: string) {
    super(message);
  }
}
