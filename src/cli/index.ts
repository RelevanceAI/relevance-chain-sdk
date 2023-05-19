import "jiti/register";

import dotenv from "dotenv";

import { program } from "commander";
import { dev } from "./commands/dev";
import { deploy } from "./commands/deploy";
import { init } from "./commands/init";
import { login } from "./commands/login";
import { keys } from "./commands/keys";
import { version } from "./commands/version";

dotenv.config();
dotenv.config({
  path: "./chains/.relevance",
});

program
  .name("relevance")
  .addHelpCommand()
  // .addCommand(init)
  // .addCommand(dev)
  .addCommand(version)
  .addCommand(login)
  .addCommand(keys)
  .addCommand(deploy);

export const runCli = async () => {
  return program.parseAsync();
};
