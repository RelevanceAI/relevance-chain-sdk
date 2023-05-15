import { Command } from "commander";
import { getAuthDetailsFromEnv } from "../../env";
import { requireAuthDetails } from "../utils";

export const keys = new Command("keys")
  .description("View your API keys and vendor keys")
  .action(
    requireAuthDetails(async () => {
      const open = await import("open");
      const { region, project } = getAuthDetailsFromEnv();
      open.default(`https://chain.relevanceai.com/${region}/${project}/api`);
    })
  );
