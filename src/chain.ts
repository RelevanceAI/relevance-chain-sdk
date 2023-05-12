import { createVariable } from "./Variable";
import { API } from "./api";
import {
  ChainConfig,
  ChainConfigInput,
  ParamSchema,
  TransformationStep,
} from "./types";
import { jsonClone } from "./utils";

export class Chain {
  private api: API;

  private params: Record<string, ParamSchema> | null = null;
  private steps: TransformationStep[] = [];
  private output: Record<string, any> | null = null;

  private title = "";
  private description = "";

  constructor(token: string) {
    this.api = new API(token);
  }

  public defineParams<TParams extends Record<string, ParamSchema>>(
    params: TParams
  ): Record<keyof TParams, any> {
    if (this.params) {
      throw new Error(
        "Params already defined. If you want to add more params, add them in the initial defineParams call."
      );
    }

    this.params = params;
    return createVariable({ path: "params" });
  }

  public step(
    transformation: string,
    params: Record<string, any>
  ): Record<string, any> {
    let stepName = transformation;

    const existingStepsWithSameTransformation = this.steps.filter(
      (step) => step.transformation === transformation
    );
    if (existingStepsWithSameTransformation.length) {
      stepName = `${transformation}_${
        existingStepsWithSameTransformation.length + 1
      }`;
    }

    this.steps.push({
      name: stepName,
      transformation,
      params,
    });

    return createVariable({ path: `steps.${stepName}.output` });
  }

  public defineOutput(output: Record<string, any>) {
    this.output = output;
  }

  public toJSON(): ChainConfigInput {
    // Need to do this to trigger the `toJSON`s of the variables
    return jsonClone({
      title: this.title,
      description: this.description,
      params_schema: {
        properties: this.params || {},
      },
      transformations: {
        steps: this.steps,
        output: this.output,
      },
    });
  }

  public async run(params: Record<string, any>) {
    const chainId = "LOCAL_DEBUG_CHAIN";
    const response = await this.api.runChain({
      studio_id: chainId,
      params,
      return_state: true,
      studio_override: {
        studio_id: chainId,
        ...this.toJSON(),
      },
    });
    return response;
  }
}
