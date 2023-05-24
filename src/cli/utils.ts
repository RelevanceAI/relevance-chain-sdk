import { existsSync } from "node:fs";
import path from "node:path";
import { Chain } from "../chain";
import { getAuthDetailsFromEnv } from "../env";

export const CHAINS_FOLDER_PATH_ABSOLUTE = path.join(process.cwd(), "chains");
export const CHAINS_FOLDER_PATH_RELATIVE = CHAINS_FOLDER_PATH_ABSOLUTE.replace(
  process.cwd(),
  ""
);

export const chainsFolderExists = async () => {
  return existsSync(CHAINS_FOLDER_PATH_ABSOLUTE);
};

export const isChain = (chain: any): chain is Chain<any, any> => {
  if (!chain || typeof chain !== "object" || Array.isArray(chain)) return false;

  if (chain instanceof Chain) return true;

  return (
    "$RELEVANCE_CHAIN_BRAND" in chain && chain.$RELEVANCE_CHAIN_BRAND === true
  );
};

export const requireAuthDetails =
  <Fn extends (...args: any[]) => any>(fn: Fn) =>
  (...args: any[]) => {
    const authDetails = getAuthDetailsFromEnv();
    if (!authDetails.project || !authDetails.region || !authDetails.apiKey) {
      throw new Error(
        "You must be logged in to Relevance AI to use this command. Run `relevance login` to log in."
      );
    }
    return fn(...args);
  };
