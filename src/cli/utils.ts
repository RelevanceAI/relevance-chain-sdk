import { existsSync } from "node:fs";
import path from "node:path";
import { Chain } from "../chain";

export const CHAINS_FOLDER_PATH_ABSOLUTE = path.join(process.cwd(), "chains");
export const CHAINS_FOLDER_PATH_RELATIVE = CHAINS_FOLDER_PATH_ABSOLUTE.replace(
  process.cwd(),
  ""
);

export const chainsFolderExists = async () => {
  return existsSync(CHAINS_FOLDER_PATH_ABSOLUTE);
};

export const isChain = (chain: any): chain is Chain<any, any> =>
  chain instanceof Chain ||
  ("$RELEVANCE_CHAIN_BRAND" in chain && chain.$RELEVANCE_CHAIN_BRAND === true);
