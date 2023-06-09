import {
  UnwrapVariable,
  Variable,
  createVariable,
  toOptionalPath,
  toPath,
} from "./variable";
import { API, APIAuthDetails } from "./api";
import {
  AllowedTransformationId,
  ArrayItem,
  ChainConfig,
  LooseAutoComplete,
  ParamSchema,
  ParamsToTypedObject,
  Prettify,
  TransformationInput,
  TransformationOutput,
  TransformationStep,
  TransformationsMap,
} from "./types";
import { jsonClone } from "./utils";
import { JsCodeTransformationOutput } from "./generated/transformation-types";

export class Chain<
  ParamsDefinition extends Record<string, ParamSchema>,
  OutputDefinition extends Record<string, any>
> {
  $RELEVANCE_CHAIN_BRAND = true;

  protected api: API;

  private chainId: string | null = null;

  private params: ParamsDefinition | null = null;
  private steps: TransformationStep[] = [];
  private output: OutputDefinition | null = null;

  private title = "";
  private description = "";

  private publiclyTriggerable = false;
  private public = false;

  constructor(authDetails?: APIAuthDetails) {
    this.api = new API(authDetails);
  }

  public setTitle(title: string) {
    this.title = title;
  }
  public setDescription(description: string) {
    this.description = description;
  }
  public setPubliclyTriggerable(value: boolean) {
    this.publiclyTriggerable = value;
  }
  public setPublic(value: boolean) {
    this.public = value ?? false;
  }

  public defineParams<InnerParamsDefinition extends ParamsDefinition>(
    params: InnerParamsDefinition
  ) {
    if (this.params) {
      throw new Error(
        "Params already defined. If you want to add more params, add them in the initial defineParams call."
      );
    }

    this.params = params;
    return createVariable<Prettify<ParamsToTypedObject<InnerParamsDefinition>>>(
      {
        path: "params",
      }
    );
  }

  /**
   * Add a step to your chain. You can call this multiple times to add
   * multiple steps to your chain.
   *
   * @returns A variable that references the output of the step.
   *
   * @example
   * const { prompt, answer } = step('prompt_completion', {
   *   prompt: 'Write a short story about dogs',
   * })
   */
  public step<TransformationId extends AllowedTransformationId>(
    transformation: TransformationId,
    params: TransformationInput<TransformationId>
  ): Variable<TransformationOutput<TransformationId>>;
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

    const step: TransformationStep = {
      name: stepName,
      transformation,
      params,
    };

    if (this.runIfContext !== null) {
      step.if = this.runIfContext;
    }

    if (this.foreachContext !== null) {
      step.foreach = this.foreachContext;
    }

    this.steps.push(step);

    return createVariable({ path: `steps.${stepName}.output` });
  }

  private runIfContext: any | Variable<any> | null = null;

  public runIf<Fn extends () => any>(
    condition: any | Variable<any>,
    fn: Fn
  ): ReturnType<Fn> {
    if (this.runIfContext) {
      throw new Error("Nested runIf not supported at the moment.");
    }

    // set runIf context
    this.runIfContext = condition;

    const result = fn();

    // reset context
    this.runIfContext = null;

    return result;
  }

  public code<
    CodeParams extends Record<string, Variable<any>>,
    Fn extends (params: UnwrapVariable<CodeParams>) => any
  >(
    params: CodeParams,
    fn: Fn
  ): Omit<JsCodeTransformationOutput, "transformed"> & {
    transformed: Variable<ReturnType<Fn>>;
  } {
    const paramsObjectContent = Object.entries(params)
      .map(([key, variable]) => {
        return `${JSON.stringify(key)}: ${toOptionalPath(variable)}`;
      })
      .join(",");

    const fnString = fn.toString();

    const codeAsIIFE = `
return (() => {
  const _$$params = { ${paramsObjectContent} };
  return (${fnString})(_$$params);
})();`.trim();

    return this.step("js_code_transformation", {
      code: codeAsIIFE,
    }) as any;
  }

  private foreachContext: any[] | Variable<any[]> | null = null;
  /**
   * Run 1 step for each item in the array.
   *
   * Note: foreach for multiple steps at once is not supported at the moment.
   */
  public foreach<
    Var extends any[] | Variable<any[]>,
    Fn extends (foreachData: {
      item: Variable<ArrayItem<UnwrapVariable<Var>>>;
      index: number;
    }) => ReturnType<(typeof Chain)["prototype"]["step"]>
  >(variable: Var, fn: Fn): Variable<Array<ReturnType<Fn>>> {
    if (this.foreachContext) {
      throw new Error("Nested foreach not supported at the moment.");
    }

    // set foreach context
    this.foreachContext = variable;

    const numStepsBefore = this.steps.length;

    fn({
      item: createVariable<any>({ path: "foreach.item" }),
      index: createVariable<number>({ path: "foreach.index" }),
    });

    const numStepsAfter = this.steps.length;
    if (numStepsAfter - numStepsBefore !== 1) {
      throw new Error(
        "You must call `step` once and only once inside the `foreach` callback."
      );
    }

    // reset context
    this.foreachContext = null;

    // Non-null assertion is ok since we just checked that at least 1 item was added
    const lastStep = this.steps[this.steps.length - 1]!;

    return createVariable<Array<ReturnType<Fn>>>({
      path: `steps.${lastStep.name}.results`,
    });
  }

  public defineOutput(output: OutputDefinition) {
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
      publicly_triggerable: this.publiclyTriggerable,
      public: this.public,
    });
  }

  public setChainId(chainId: string) {
    this.chainId = chainId;
  }
  public getChainId() {
    return this.chainId;
  }

  public async run(params: ParamsToTypedObject<ParamsDefinition>) {
    type Output = UnwrapVariable<OutputDefinition>;
    const config = this.toJSON();
    const response = await this.api.runChain<Output>({
      studio_id: config.studio_id,
      params,
      return_state: true,
      studio_override: config,
    });
    return response;
  }

  static define = <
    ChainParamsDefinition extends Record<string, ParamSchema>,
    ChainOutputDefinition extends Record<string, any>
  >(input: {
    title?: string;
    description?: string;

    /**
     * If true, the chain will be publicly triggerable. This means that anyone
     * with the chain's ID will be able to run it and that you will be able to
     * run the chain via `client.runChain`.
     *
     */
    publiclyTriggerable?: boolean;

    /**
     * If true, the chain will be publicly visible in our templates gallery.
     * This means that anyone will be able to see the chain in the notebook,
     * including all steps and their parameters.
     *
     * **Note**: This does not deploy your chain. To deploy your chain, you
     * will need to set `publicylyTriggerable` to true.
     */
    public?: boolean;

    /**
     * Schemas for the inputs to your chain. This is optional, but if provided,
     * we will check that the inputs to your chain are valid at runtime, and
     * you get autocomplete for the inputs to your chain.
     */
    params?: ChainParamsDefinition;

    /**
     * The setup function is where you define the steps of your chain. It is
     * called with an object containing the params and a `step` function. You
     * call `step` to add a step to your chain.
     *
     * You can return an object from the setup function, which will be used as
     * the output of your chain. If you don't return anything, the output of
     * your chain will be the output of the last step.
     */
    setup(context: {
      /**
       * The inputs to the chain.
       */
      params: Variable<Prettify<ParamsToTypedObject<ChainParamsDefinition>>>;
      step: (typeof Chain)["prototype"]["step"];
      runIf: (typeof Chain)["prototype"]["runIf"];
      code: (typeof Chain)["prototype"]["code"];
      foreach: (typeof Chain)["prototype"]["foreach"];
    }): ChainOutputDefinition | void | null;
  }) => {
    const chain = new Chain<ChainParamsDefinition, ChainOutputDefinition>();
    const params = chain.defineParams(
      input.params || ({} as ChainParamsDefinition)
    );
    if (input.title) {
      chain.setTitle(input.title);
    }
    if (input.description) {
      chain.setDescription(input.description);
    }
    chain.setPubliclyTriggerable(input.publiclyTriggerable ?? false);
    chain.setPublic(input.public ?? false);
    const output = input.setup({
      params,
      step: chain.step.bind(chain),
      runIf: chain.runIf.bind(chain),
      code: chain.code.bind(chain),
      foreach: chain.foreach.bind(chain),
    });
    if (output) {
      chain.defineOutput(output);
    }
    return chain;
  };
}

/**
 * Define an AI chain. This is the main entry point for creating chains.
 */
export const defineChain: (typeof Chain)["define"] = Chain.define;
