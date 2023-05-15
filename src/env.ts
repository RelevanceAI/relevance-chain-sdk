import * as dotenv from "dotenv";
import type { APIAuthDetails } from "./api";

let envLoaded = false;
export const loadEnv = (reload?: boolean) => {
  if (envLoaded && !reload) {
    return;
  }

  dotenv.config();
  dotenv.config({
    path: "./chains/.relevance",
  });
  envLoaded = true;
};

export const getAuthDetailsFromEnv = (): APIAuthDetails => {
  return {
    project: process.env.RELEVANCE_PROJECT_ID || "",
    region: process.env.RELEVANCE_REGION || "",
    apiKey: process.env.RELEVANCE_API_KEY || "",
  };
};
