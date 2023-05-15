import {
  defineChain,
  InferChainInput,
  InferChainOutput,
} from "../../../src/index";

const chain = defineChain({
  title: "Ask questions about a short PDF 2",
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

type input = InferChainInput<typeof chain>;
type output = InferChainOutput<typeof chain>;
