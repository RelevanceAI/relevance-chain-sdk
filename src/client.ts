import { ChainRunnable, InferChainInput, RunChainOutput } from "./types";

export function runChain<Chain extends ChainRunnable>(
  publicRunChainId: string,
  params: InferChainInput<Chain>
): Promise<ReturnType<Chain["run"]>>;
export function runChain<
  Params extends Record<string, Exclude<any, Function>>,
  Output extends Record<string, any>
>(publicRunChainId: string, params: Params): Promise<Output>;
export async function runChain(
  publicRunChainId: string,
  params: any
): Promise<Record<string, any>> {
  const [region, project, chainId] = publicRunChainId.split("/");

  const response = await fetch(
    `https://api-${region}.stack.tryrelevance.com/latest/studios/${chainId}/trigger_limited`,
    {
      method: "POST",
      body: JSON.stringify({
        project,
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

export class RunChainError extends Error {
  constructor(
    public errors: RunChainOutput["errors"],
    message: string = "Chain failed to complete successfully"
  ) {
    super(message);
  }
}
