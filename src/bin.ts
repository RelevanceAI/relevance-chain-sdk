#!/usr/bin/env node

import { fetch, Headers, Request, Response } from "cross-fetch";
import { runCli } from "./cli";

global.fetch = fetch;
global.Response = Response;
global.Headers = Headers;
global.Request = Request;

runCli()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
