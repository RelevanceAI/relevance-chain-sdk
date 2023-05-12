import { readdir } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { Chain } from "../chain";
import { CHAINS_FOLDER_PATH_ABSOLUTE, isChain } from "./utils";
import { CHAINS_FOLDER_PATH_RELATIVE } from "./utils";
import { API } from "../api";
import { ChainConfig } from "../types";

const CHAIN_FILE_EXTENSIONS = [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"];

export const deploy = new Command("deploy")
  .option(
    "--prod",
    "If provided, chains will be deployed to production. Otherwise you will get a preview deployment",
    false
  )
  .action(async ({ prod }, command: Command) => {
    const { oraPromise } = await import("ora");

    const chainFiles = await oraPromise(
      async () => {
        const allFiles = await readdir(CHAINS_FOLDER_PATH_ABSOLUTE);

        const chainFiles = allFiles.filter((file) =>
          CHAIN_FILE_EXTENSIONS.includes(path.extname(file))
        );

        if (chainFiles.length === 0) {
          throw new Error(
            `No chain files found in ${CHAINS_FOLDER_PATH_RELATIVE}. Please create a chain file`
          );
        }

        return chainFiles;
      },
      {
        failText: (error) => error.message,
        successText: (files) =>
          `Found ${files.length} chain file${
            files.length > 1 ? "s" : ""
          } in ${CHAINS_FOLDER_PATH_RELATIVE}`,
      }
    );

    const results = await oraPromise(
      Promise.allSettled(
        chainFiles.map(async (file) => {
          const fullFilePath = path.join(CHAINS_FOLDER_PATH_ABSOLUTE, file);
          const chainModule = require(fullFilePath);
          const chain = chainModule.default;

          if (!isChain(chain)) {
            throw new Error(
              `Chain ${file} does not export a Chain instance as default export`
            );
          }

          if (!chain.getChainId()) {
            chain.setChainId(file.replace(/\.ts$/, ""));
          }

          const config = chain.toJSON();
          return {
            path: fullFilePath,
            chainConfig: config,
          };
        })
      ),
      {
        text: "Checking your chains",
      }
    );

    const successResults = results.flatMap((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return [];
    });
    const errorResults = results.flatMap((result) => {
      if (result.status === "rejected") {
        return result.reason;
      }
      return [];
    });

    if (errorResults.length) {
      command.error(`Failed to load some chains: 
${errorResults.join("\n")}
`);
    }

    const deploy = async (version?: string) => {
      const versionToUse = version || "" + Math.random();

      const api = new API(process.env.RELEVANCE_TOKEN!);
      await api.saveChains({
        updates: successResults.map((result) => {
          return { ...result.chainConfig };
        }),
        version: versionToUse,
      });
    };

    await oraPromise(deploy(), {
      text: "Deploying your chains",
      successText: "Deployed your chains",
    });

    if (prod) {
      await oraPromise(deploy("latest"), {
        text: "Deploying your chains to production",
        successText: "Deployed your chains to production 🚀",
      });
    }
  });
