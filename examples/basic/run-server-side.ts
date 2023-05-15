import pdfQA from "./chains/pdf-question-answer";

const main = async () => {
  const result = await pdfQA.run({
    pdf_url:
      "https://cdn.jsdelivr.net/gh/RelevanceAI/content-cdn@latest/studio/samples/atlassian.pdf",
    question: "How many shares are outstanding?",
  });

  console.log("Ran server-side version", result.output);
};

main();
