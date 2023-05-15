import { Chain } from "../../../src/index";

const chain = new Chain();

chain.setTitle("Ask questions about a short PDF 2");

const { pdf_url, question } = chain.defineParams({
  pdf_url: {
    type: "string",
  },
  question: {
    type: "string",
  },
});

const { text } = chain.step("pdf_to_text", {
  pdf_url,
});

const { chunks } = chain.step("split_text", {
  method: "tokens",
  num_tokens: 500,
  text,
});

const { results: search_results } = chain.step("search_array", {
  array: chunks,
  query: question,
});

const { answer } = chain.step("prompt_completion", {
  prompt: `
${search_results}

Based off the above context answer the question below:

Question: 
${question}

Answer:`,
});

chain.defineOutput({
  answer,
});

export default chain;
