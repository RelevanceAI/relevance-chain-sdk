import { API } from "./api";
import { ChainBuilder } from "./chain-builder";
import { ChainConfig, ChainConfigInput } from "./types";

export class Chain {
  private api: API;

  private constructor(
    tokenOrApi: string | API,
    private chainConfig: ChainConfigInput
  ) {
    this.api = tokenOrApi instanceof API ? tokenOrApi : new API(tokenOrApi);
  }

  static fromJSON(token: string, chainConfig: ChainConfigInput): Chain {
    const chain = new Chain(token, chainConfig);
    chain.chainConfig = chainConfig;
    return chain;
  }

  static async fromChainId(token: string, chainId: string, version?: string) {
    const api = new API(token);
    const chainConfig = await api.getChain(chainId, version);
    return new Chain(api, chainConfig);
  }

  static fromBuilder(token: string, builder: ChainBuilder): Chain {
    return Chain.fromJSON(token, builder.build());
  }

  get chainId() {
    return this.chainConfig.studio_id || "SDK_CHAIN";
  }

  async run(params: Record<string, any>) {
    const response = await this.api.runChain({
      studio_id: this.chainId,
      studio_override: {
        ...this.chainConfig,
        studio_id: this.chainId,
        transformations: {
          steps: this.chainConfig.transformations.steps,
          output: this.chainConfig.transformations.output ?? null,
        },
      },
      params,
      return_state: true,
    });
    return response;
  }
}
