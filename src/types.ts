import type { JSONSchema4 } from "json-schema";

export type ChainConfig = {
  _id?: string;
  /** Unique ID for studio. This is different from a studio's share ID. */
  studio_id: string;
  /** Project ID */
  project: string;
  /** JSONSchema object that user parameters will be validated against */
  params_schema: {
    properties: Record<string, ParamSchema>;
  };
  /** Version */
  version?: string;
  /** User description for the studio */
  description?: string;
  /** User title for the studio */
  title?: string;

  /** Everything under here isn't in LimitedChains */
  transformations: {
    steps: TransformationStep[];
    output?: Record<string, string> | null;
  };

  publicly_triggerable?: boolean;
  params?: Record<string, any>;
  public?: boolean;
  metrics?: {
    views: number;
    executions: number;
  };
  share_id?: string;
  tags?: Record<string, string>;
};

export type ChainState = {
  params: Record<string, any>;
  steps: Record<
    string,
    {
      executionTime: number;
      output: Record<string, any>;
      skipped?: boolean;
      // Only exists if the step is foreach
      results?: Record<string, any>[];
      // Only exists if the step is foreach and some items were skipped
      skippedItems?: Record<string, any>[];
    }
  >;
};

export type ChainConfigInput = PartiallyOptional<
  ChainConfig,
  "studio_id" | "project"
>;

export type SchemaMetadata = {
  content_type?:
    | "long_text"
    | "short_text"
    | "file_url"
    | "code"
    | "llm_prompt"
    | "dataset_id"
    | "markdown"
    | "chain";
  min?: number;
  max?: number;
  accepted_file_types?: string[];
  advanced?: boolean;
  title?: string;
  description?: string;
  enum?: Record<"description" | "value", string>[];
  hidden?: Boolean;
  value_suggestion_chain?: {
    url: string;
    project_id: string;
    output_key: string;
  };
};

export type ParamSchema = JSONSchema4 & {
  /**
   * The order in which the parameter should be displayed in the form.
   */
  order?: number;
  metadata?: SchemaMetadata;
  items?: JSONSchema4 & { type: string };
};

export type TransformationStepIfConditionValue = string | boolean | null;

export type TransformationStep = {
  transformation: string;
  name: string;
  foreach?: string | any[];
  if?: TransformationStepIfConditionValue;
  output?: Record<string, string>;
  params: Record<string, any>;
};

export type PartiallyOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Copied & renamed from https://github.com/trpc/trpc/blob/9409cdd5220b6a383278c827048eff86e10112b5/packages/server/src/types.ts#LL59C1-L61C38
export type Prettify<TType> = TType extends any[] | Date
  ? TType
  : { [K in keyof TType]: TType[K] };
