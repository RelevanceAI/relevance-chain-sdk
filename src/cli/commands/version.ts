import { Command } from "commander";
import kleur from "kleur";
const pkg = require("../../../package.json");

export const version = new Command("version")
  .description("Get the current version of the relevance cli")
  .action(() => {
    console.log(kleur.green(`@relevanceai/chain`), pkg.version);
  });
