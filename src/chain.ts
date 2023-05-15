import { UnwrapVariable, Variable, createVariable } from "./variable";
import { API } from "./api";
import {
  AllowedTransformationId,
  ChainConfig,
  LooseAutoComplete,
  ParamSchema,
  ParamsToTypedObject,
  Prettify,
  TransformationInput,
  TransformationOUtput,
  TransformationStep,
  TransformationsMap,
} from "./types";
import { jsonClone } from "./utils";

export class Chain<
  ParamsDefinition extends Record<string, ParamSchema>,
  Output extends Record<string, any>
> {
  $RELEVANCE_CHAIN_BRAND = true;

  protected api: API;

  private chainId: string | null = null;

  private params: ParamsDefinition | null = null;
  private steps: TransformationStep[] = [];
  private output: Output | null = null;

  private title = "";
  private description = "";

  constructor(token?: string) {
    token = token || process.env.RELEVANCE_TOKEN;

    if (!token) {
      throw new Error(
        "No token provided. Please provide a token or set the RELEVANCE_TOKEN environment variable."
      );
    }

    this.api = new API(token);
  }

  public setTitle(title: string) {
    this.title = title;
  }
  public setDescription(description: string) {
    this.description = description;
  }

  public defineParams(params: ParamsDefinition) {
    if (this.params) {
      throw new Error(
        "Params already defined. If you want to add more params, add them in the initial defineParams call."
      );
    }

    this.params = params;
    return createVariable<Prettify<ParamsToTypedObject<ParamsDefinition>>>({
      path: "params",
    });
  }

  public step<TransformationId extends AllowedTransformationId>(
    transformation: TransformationId,
    params: TransformationInput<TransformationId>
  ): Variable<TransformationOUtput<TransformationId>>;
  public step(
    transformation: LooseAutoComplete<keyof TransformationsMap>,
    params: Record<string, any>
  ) {
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

  public defineOutput(output: Output) {
    if (this.output) {
      throw new Error(
        "Output already defined. If you want to add more output, add them in the initial defineOutput call."
      );
    }
    this.output = output;
  }

  public toJSON(): ChainConfig {
    // Need to do this to trigger the `toJSON`s of the variables
    return jsonClone({
      studio_id: this.chainId || "LOCAL_DEV_CHAIN",
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

  public setChainId(chainId: string) {
    this.chainId = chainId;
  }
  public getChainId() {
    return this.chainId;
  }

  public async run(params: ParamsDefinition) {
    const config = this.toJSON();
    const response = await this.api.runChain<UnwrapVariable<Output>>({
      studio_id: config.studio_id,
      params,
      return_state: true,
      studio_override: config,
    });
    return response;
  }

  static define = <
    ChainParamsDefinition extends Record<string, ParamSchema>,
    ChainOutput extends Record<string, any>
  >(input: {
    title?: string;
    description?: string;
    params?: ChainParamsDefinition;
    setup(context: {
      params: Variable<Prettify<ParamsToTypedObject<ChainParamsDefinition>>>;
      step: (typeof Chain)["prototype"]["step"];
    }): ChainOutput | void | null;
  }) => {
    const chain = new Chain<ChainParamsDefinition, ChainOutput>();
    const params = chain.defineParams(
      input.params || ({} as ChainParamsDefinition)
    );
    if (input.title) {
      chain.setTitle(input.title);
    }
    if (input.description) {
      chain.setDescription(input.description);
    }
    const output = input.setup({
      params,
      step: chain.step.bind(chain),
    });
    if (output) {
      chain.defineOutput(output);
    }
    return chain;
  };
}

export const defineChain: (typeof Chain)["define"] = Chain.define;
