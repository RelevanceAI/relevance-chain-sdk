import { defineChain } from "../../../src/index";

const chain = defineChain({
  title: "Ask questions about a short PDF",

  /**
   * Publicly triggerable is set to true, so this chain can be run without an API key
   */
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

export default chain;
