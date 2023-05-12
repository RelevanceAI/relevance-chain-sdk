import "jiti/register";

import { program } from "commander";
import { dev } from "./dev";
import { deploy } from "./deploy";
import { init } from "./init";

program
  .name("relevance")
  .addHelpCommand()
  // .addCommand(init)
  .addCommand(dev)
  .addCommand(deploy);

export const runCli = async () => {
  return program.parseAsync();
};
