const VARIABLE_INTERNAL = Symbol("VARIABLE_INTERNAL");

type VariableObject = Readonly<{
  [VARIABLE_INTERNAL]: { path: string };
  [k: string]: VariableObject;
}>;

const PROXY_HANDLER: ProxyHandler<VariableObject> = {
  get(target, key) {
    const path = target[VARIABLE_INTERNAL].path;
    console.log("getting", key, "for", path);

    if (["toString", "toJSON", "valueOf"].includes(key as string)) {
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

export const createVariable = (args: { path: string }) => {
  return new Proxy(
    { [VARIABLE_INTERNAL]: { path: args.path } },
    PROXY_HANDLER
  ) as any;
};

const v = createVariable({ path: "params" });
