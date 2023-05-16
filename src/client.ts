import {
  ChainRunnable,
  InferChainInput,
  InferChainOutput,
  RunChainOutput,
} from "./types";

export class Client {
  private region: string;
  private project: string;

  constructor(args: { region: string; project: string }) {
    this.region = args.region;
    this.project = args.project;
  }

  runChain<Chain extends ChainRunnable>(
    chainId: string,
    params: InferChainInput<Chain>
  ): Promise<InferChainOutput<Chain>>;
  runChain<
    Params extends Record<string, Exclude<any, Function>>,
    Output extends Record<string, any>
  >(chainId: string, params: Params): Promise<Output>;
  async runChain(chainId: string, params: any): Promise<Record<string, any>> {
    const response = await fetch(
      `https://api-${this.region}.stack.tryrelevance.com/latest/studios/${chainId}/trigger_limited`,
      {
        method: "POST",
        body: JSON.stringify({
          project: this.project,
          params,
        }),
      }
    );

    if (!response.ok) {
      let message = await response.text();
      try {
        message = JSON.parse(message).message || message;
      } catch {
        // do nothing
      }
      throw new Error(message);
    }

    const triggerResult: RunChainOutput<false> = await response.json();

    if (triggerResult.status !== "complete") {
      throw new RunChainError(triggerResult.errors);
    }

    return triggerResult.output;
  }
}

export class RunChainError extends Error {
  constructor(
    public errors: RunChainOutput["errors"],
    message: string = "Chain failed to complete successfully"
  ) {
    super(message);
  }
}
