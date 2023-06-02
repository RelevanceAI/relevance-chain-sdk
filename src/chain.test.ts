import { describe, test, expect, expectTypeOf } from "vitest";
import { defineChain } from "./chain";
import { InferChainInput, InferChainOutput } from "./types";

describe("example chains", () => {
  test("basic pdf-qa chain", () => {
    const chain = defineChain({
      title: "Ask questions about a short PDF",

      publiclyTriggerable: true,

      params: {
        pdf_url: {
          type: "string",
        },
        question: {
          type: "string",
        },
      },
      setup({ params, step }) {
        const { pdf_url, question } = params;

        const { text } = step("pdf_to_text", {
          pdf_url,
        });

        const { chunks } = step("split_text", {
          method: "tokens",
          num_tokens: 500,
          text,
        });

        const { results: search_results } = step("search_array", {
          array: chunks,
          query: question,
        });

        const { answer } = step("prompt_completion", {
          prompt: `
${search_results}

Based off the above context answer the question below:

Question: 
${question}

Answer:`,
        });

        return { answer };
      },
    });

    expect(chain.toJSON()).toMatchInlineSnapshot(`
      {
        "description": "",
        "params_schema": {
          "properties": {
            "pdf_url": {
              "type": "string",
            },
            "question": {
              "type": "string",
            },
          },
        },
        "publicly_triggerable": true,
        "studio_id": "LOCAL_DEV_CHAIN",
        "title": "Ask questions about a short PDF",
        "transformations": {
          "output": {
            "answer": "{{steps.prompt_completion.output.answer}}",
          },
          "steps": [
            {
              "name": "pdf_to_text",
              "params": {
                "pdf_url": "{{params.pdf_url}}",
              },
              "transformation": "pdf_to_text",
            },
            {
              "name": "split_text",
              "params": {
                "method": "tokens",
                "num_tokens": 500,
                "text": "{{steps.pdf_to_text.output.text}}",
              },
              "transformation": "split_text",
            },
            {
              "name": "search_array",
              "params": {
                "array": "{{steps.split_text.output.chunks}}",
                "query": "{{params.question}}",
              },
              "transformation": "search_array",
            },
            {
              "name": "prompt_completion",
              "params": {
                "prompt": "
      {{steps.search_array.output.results}}

      Based off the above context answer the question below:

      Question: 
      {{params.question}}

      Answer:",
              },
              "transformation": "prompt_completion",
            },
          ],
        },
      }
    `);

    expectTypeOf<InferChainInput<typeof chain>>().toMatchTypeOf<{
      pdf_url: string;
      question: string;
    }>();
    expectTypeOf<InferChainOutput<typeof chain>>().toMatchTypeOf<{
      answer: string;
    }>();
  });

  test("long pdf summarise", () => {
    const chain = defineChain({
      params: {
        pdf_url: {
          type: "string",
        },
      },
      setup({ params, step, foreach }) {
        const { pdf_url } = params;

        const { text } = step("pdf_to_text", {
          pdf_url,
        });

        const { chunks } = step("split_text", {
          method: "tokens",
          num_tokens: 200,
          text,
        });

        const results = foreach(chunks, ({ item }) =>
          step("prompt_completion", {
            prompt: `
${item}

Summarise the above text.`,
          })
        );

        const { text: summary } = step("join_array", {
          array: results["*"].answer,
          sep: "\n",
        });
        return { summary };
      },
    });

    const chainJSON = chain.toJSON();

    expect(chainJSON).toMatchInlineSnapshot(`
      {
        "description": "",
        "params_schema": {
          "properties": {
            "pdf_url": {
              "type": "string",
            },
          },
        },
        "publicly_triggerable": false,
        "studio_id": "LOCAL_DEV_CHAIN",
        "title": "",
        "transformations": {
          "output": {
            "summary": "{{steps.join_array.output.text}}",
          },
          "steps": [
            {
              "name": "pdf_to_text",
              "params": {
                "pdf_url": "{{params.pdf_url}}",
              },
              "transformation": "pdf_to_text",
            },
            {
              "name": "split_text",
              "params": {
                "method": "tokens",
                "num_tokens": 200,
                "text": "{{steps.pdf_to_text.output.text}}",
              },
              "transformation": "split_text",
            },
            {
              "foreach": "{{steps.split_text.output.chunks}}",
              "name": "prompt_completion",
              "params": {
                "prompt": "
      {{foreach.item}}

      Summarise the above text.",
              },
              "transformation": "prompt_completion",
            },
            {
              "name": "join_array",
              "params": {
                "array": "{{steps.prompt_completion.results[*].answer}}",
                "sep": "
      ",
              },
              "transformation": "join_array",
            },
          ],
        },
      }
    `);
    expect(chainJSON.transformations.steps[2]?.foreach).toBeDefined();

    expectTypeOf<InferChainInput<typeof chain>>().toMatchTypeOf<{
      pdf_url: string;
    }>();
    expectTypeOf<InferChainOutput<typeof chain>>().toMatchTypeOf<{
      summary: string;
    }>();
  });

  test("long branching chain", () => {
    const chain = defineChain({
      params: {},
      setup({ step, code, runIf }) {
        const { answer } = step("prompt_completion", {
          prompt: "write a short story about dogs",
        });

        return code({ answer }, ({ answer }) => {
          return answer.toUpperCase().split(" ").join("\n");
        });
      },
    });

    expect(chain.toJSON()).toMatchInlineSnapshot(`
      {
        "description": "",
        "params_schema": {
          "properties": {},
        },
        "publicly_triggerable": false,
        "studio_id": "LOCAL_DEV_CHAIN",
        "title": "",
        "transformations": {
          "output": "{{steps.js_code_transformation.output}}",
          "steps": [
            {
              "name": "prompt_completion",
              "params": {
                "prompt": "write a short story about dogs",
              },
              "transformation": "prompt_completion",
            },
            {
              "name": "js_code_transformation",
              "params": {
                "code": "return (() => {
        const _$$params = { \\"answer\\": steps?.prompt_completion?.output?.answer };
        return (({ answer: answer2 }) => {
                return answer2.toUpperCase().split(\\" \\").join(\\"\\\\n\\");
              })(_$$params);
      })();",
              },
              "transformation": "js_code_transformation",
            },
          ],
        },
      }
    `);
  });
});
