import { Chain } from "./chain";
import {
  ChainConfig,
  ChainConfigInput,
  ParamSchema,
  PartiallyOptional,
  TransformationStep,
} from "./types";

export class ChainBuilder {
  private title?: string | undefined;
  private description?: string | undefined;
  private steps: TransformationStep[] = [];
  private params: Record<string, ParamSchema> = {};

  constructor(chainConfig?: Partial<ChainConfig>) {
    if (chainConfig) {
      this.title = chainConfig?.title;
      this.description = chainConfig?.description;

      this.steps = chainConfig?.transformations?.steps || [];
      this.params = chainConfig?.params_schema?.properties || {};
    }
  }

  setTitle(title: string) {
    this.title = title;
  }

  setDescription(description: string) {
    this.description = description;
  }

  addStep(step: PartiallyOptional<TransformationStep, "name">) {
    const stepName = step.name || step.transformation;

    const existingStep = this.steps.find((s) => s.name === stepName);
    if (existingStep) {
      throw new Error(
        `Step with name ${stepName} already exists. Provide an explicit name to prevent this`
      );
    }

    this.steps.push({
      ...step,
      name: stepName,
    });

    return this;
  }

  // TODO: make nicer to use
  addParams(params: Record<string, ParamSchema>) {
    this.params = {
      ...this.params,
      ...params,
    };

    return this;
  }

  build(): ChainConfigInput {
    return {
      title: this.title || "",
      description: this.description || "",
      params_schema: {
        properties: this.params,
      },
      transformations: {
        steps: this.steps,
      },
    };
  }
}
