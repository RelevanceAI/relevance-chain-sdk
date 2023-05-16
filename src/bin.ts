#!/usr/bin/env node

import "cross-fetch/polyfill";
import { runCli } from "./cli";

runCli()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
