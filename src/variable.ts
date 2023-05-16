const VARIABLE_INTERNAL = Symbol("VARIABLE_INTERNAL");

interface VariableInternal {
  readonly [VARIABLE_INTERNAL]: { path: string };
}

type ObjectValuesToArrays<T> = T extends Array<any>
  ? T
  : T extends string
  ? T
  : T extends Record<string, any>
  ? {
      [K in keyof T]: Array<ObjectValuesToArrays<T[K]>>;
    }
  : T;

export type Variable<T> = T extends Array<infer Item>
  ? Array<Variable<Item>> & {
      "*": ObjectValuesToArrays<Variable<Item>>;
    }
  : T extends Record<string, any>
  ? {
      [K in keyof T]: Variable<T[K]>;
    }
  : T & VariableInternal;

export type UnwrapVariable<T> = T extends Variable<infer U>
  ? U
  : T extends Array<Variable<infer U>>
  ? U[]
  : T extends Record<string, any>
  ? { [K in keyof T]: UnwrapVariable<T[K]> }
  : T;

const PROXY_HANDLER: ProxyHandler<VariableInternal> = {
  get(target, key) {
    const path = toPath(target);

    if (["toString", "toJSON", "valueOf", Symbol.toPrimitive].includes(key)) {
      return () => `{{${path}}}`;
    }

    if (typeof key === "string" || typeof key === "number") {
      const newPath = key === "*" ? `${path}[${key}]` : `${path}.${key}`;

      return createVariable({
        path: newPath,
      });
    }

    if (key === VARIABLE_INTERNAL) {
      return target[VARIABLE_INTERNAL];
    }

    return null;
  },
};

export const createVariable = <T = Record<string, any>>(args: {
  path: string;
}) => {
  return new Proxy(
    { [VARIABLE_INTERNAL]: { path: args.path } },
    PROXY_HANDLER
  ) as unknown as Variable<T>;
};

export const isVariable = (value: any): value is Variable<any> => {
  return (
    typeof value === "object" && value !== null && VARIABLE_INTERNAL in value
  );
};

export const toPath = (variable: Variable<unknown>): string => {
  return variable[VARIABLE_INTERNAL].path;
};

export const toOptionalPath = (variable: Variable<unknown>): string => {
  return toPath(variable).split(".").join("?.");
};
