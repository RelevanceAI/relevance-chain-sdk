import invariant from "tiny-invariant";
import {
  ChainConfig,
  ChainConfigInput,
  ChainState,
  PartiallyOptional,
  Prettify,
} from "./types";
import { Chain } from "./chain";
const parseToken = (token: string) => {
  const [project, apiKey, region] = token.split(":");

  invariant(project && apiKey && region, "Invalid token");

  return { project, apiKey, region };
};

type ParsedToken = ReturnType<typeof parseToken>;

export class API {
  private parsedToken: ParsedToken;

  constructor(private token: string) {
    this.parsedToken = parseToken(this.token);
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

    const url = `https://api-${this.parsedToken.region}.stack.tryrelevance.com/latest${path}?${queryParams}`;

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
