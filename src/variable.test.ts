import { describe, expectTypeOf, it } from "vitest";
import { createVariable } from "./variable";
import { TransformationOutput } from "./types";

describe("variable types", () => {
  it("should return a variable with the correct type", () => {
    expectTypeOf(createVariable<string>({ path: "a" })).toMatchTypeOf<string>();
    expectTypeOf(createVariable<number>({ path: "a" })).toMatchTypeOf<number>();
    expectTypeOf(
      createVariable<{ message: string }>({ path: "a" })
    ).toMatchTypeOf<{ message: string }>();
    expectTypeOf(
      createVariable<{ message: string }[]>({ path: "a" })
    ).toMatchTypeOf<{ message: string }[]>();
  });

  it("should have the correct type for object properties", () => {
    const variable = createVariable<{
      a: string;
      b: number;
      c: boolean[];
      d: {
        e: string;
      };
    }>({ path: "a" });

    expectTypeOf(variable.a).toMatchTypeOf<string>();
    expectTypeOf(variable.b).toMatchTypeOf<number>();
    expectTypeOf(variable.c).toMatchTypeOf<boolean[]>();
    expectTypeOf(variable.d).toMatchTypeOf<{ e: string }>();
    expectTypeOf(variable.d.e).toMatchTypeOf<string>();
  });

  it("should have the correct value types for arrays", () => {
    const v1 = createVariable<{ array: { message: string }[] }>({
      path: "a",
    });

    expectTypeOf(v1.array).toMatchTypeOf<{ message: string }[]>();
    expectTypeOf(v1.array).items.toMatchTypeOf<{ message: string }>();
    expectTypeOf(v1.array["*"].message).toMatchTypeOf<string[]>();

    const v2 = createVariable<Array<TransformationOutput<"prompt_completion">>>(
      { path: "steps.prompt_completion.results" }
    );

    expectTypeOf(v2["*"].answer).toMatchTypeOf<string[]>();
    expectTypeOf(v2["*"].prompt).toMatchTypeOf<string[]>();
    expectTypeOf(v2["*"].user_key_used).toMatchTypeOf<boolean[]>();
  });
});
