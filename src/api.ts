import { ChainConfig, ChainState, PartiallyOptional, Prettify } from "./types";
const parseToken = (token: string) => {
  const [project, apiKey, region] = token.split(":");

  if (!project || !apiKey || !region) {
    throw new Error("Invalid token");
  }

  return { project, apiKey, region };
};

type ParsedToken = ReturnType<typeof parseToken>;

export class API {
  private static parsedToken: ParsedToken;
  private static token: string = process.env.RELEVANCE_TOKEN || "";

  static setToken(token: string) {
    this.token = token;
    this.parsedToken = parseToken(token);
  }

  constructor(token?: string) {
    if (token) {
      API.setToken(token);
    }

    if (!API.token) {
      throw new Error(
        "No token provided. Please provide a token or set the RELEVANCE_TOKEN environment variable."
      );
    }
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

    const url = `https://api-${API.parsedToken.region}.stack.tryrelevance.com/latest${path}?${queryParams}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: API.token,
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

  async runChain(
    options: RunChainOptions<true>
  ): Promise<Prettify<RunChainOutput<true>>>;
  async runChain(
    options: RunChainOptions<false>
  ): Promise<Prettify<RunChainOutput<false>>>;
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
}

type RunChainOptions<ReturnState extends boolean = boolean> = {
  return_state?: ReturnState;
  version?: string;
  params?: Record<string, any>;
  studio_id: string;
  studio_override?: PartiallyOptional<ChainConfig, "project">;
  state_override?: ChainState;
};
type RunChainOutput<ReturnState extends boolean = boolean> = {
  status: "complete" | "inprogress" | "failed" | "cancelled";
  output: Record<string, any>;
  executionTime?: number;
  errors: { raw: string; body: string; stepName?: string }[];
} & (ReturnState extends true ? { state: ChainState } : { state?: undefined });

export class APIError extends Error {
  constructor(message: string) {
    super(message);
  }
}
