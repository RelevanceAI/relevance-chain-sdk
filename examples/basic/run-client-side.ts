import { Client } from "../..";
// import the chain as a type so we avoid the bundle size increase
import type pdfQA from "./chains/pdf-question-answer";

const main = async () => {
  const client = new Client({
    project: "RELEVANCE PROJECT ID",
    region: "RELEVANCE REGION",
  });

  /**
   * ! Note: For this to work, you need to set `publiclyTriggerable: true` in
   * !       your chain definition.
   */
  const output = await client.runChain<typeof pdfQA>("pdf-question-answer", {
    pdf_url:
      "https://cdn.jsdelivr.net/gh/RelevanceAI/content-cdn@latest/studio/samples/atlassian.pdf",
    question: "How many shares are outstanding?",
  });

  console.log("Running client-side version", output);
};

main();
