const VARIABLE_INTERNAL = Symbol("VARIABLE_INTERNAL");

interface VariableObject
  extends Readonly<{
    [VARIABLE_INTERNAL]: { path: string };
  }> {}

type Variable<T> = T & VariableObject;

const PROXY_HANDLER: ProxyHandler<VariableObject> = {
  get(target, key) {
    const path = target[VARIABLE_INTERNAL].path;

    if (["toString", "toJSON", "valueOf", Symbol.toPrimitive].includes(key)) {
      return () => `{{${path}}}`;
    }

    if (typeof key === "string") {
      return createVariable({
        path: `${path}.${key}`,
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
