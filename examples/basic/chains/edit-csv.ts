import { defineChain } from "../../../src";

const chain = defineChain({
  title: "Edit CSV",
  description:
    "Upload a csv, and ask for the llm to edit it. For example, you could ask it 'Add a category column based on the description column.'",

  // Publicly Triggerable is false so this chain can only be run with an API key
  publiclyTriggerable: false,

  params: {
    question: {
      type: "string",
    },
    file_url: {
      type: "string",
      metadata: {
        content_type: "file_url",
      },
    },
  },
  setup({ params, step }) {
    const { file_url, question } = params;
    const { response_body: fileContents } = step("api_call", {
      url: file_url,
      method: "GET",
    });

    const { answer: transformedCsv } = step("prompt_completion", {
      prompt: `${fileContents}

Request: 
${question}

Transform the above csv content based on the request, and only output the transformed csv.

Answer:`,
    });

    const { answer: markdownTable } = step("prompt_completion", {
      prompt: `
${transformedCsv}

Turn the above csv into markdown table format. Only output the table.
      `.trim(),
    });

    const { export_url } = step("export_to_file", {
      data: transformedCsv,
      extension: "csv",
    });

    return {
      markdownTable,
      export_url,
    };
  },
});

export default chain;
