import { readdir } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  CHAINS_FOLDER_PATH_ABSOLUTE,
  isChain,
  requireAuthDetails,
} from "../utils";
import { CHAINS_FOLDER_PATH_RELATIVE } from "../utils";
import { API } from "../../api";
import kleur from "kleur";
import { getAuthDetailsFromEnv } from "../../env";
import { confirm, select } from "@clack/prompts";

const CHAIN_FILE_EXTENSIONS = [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"];

export const deploy = new Command("deploy")
  .description("Deploy your chains to Relevance AI")
  // .option(
  //   "--prod",
  //   "If provided, chains will be deployed to production. Otherwise you will get a preview deployment",
  //   false
  // )
  .action(
    requireAuthDetails(async ({ prod }, command: Command) => {
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
              prettyPath: fullFilePath.replace(
                CHAINS_FOLDER_PATH_ABSOLUTE,
                "chains"
              ),
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

      const api = new API();
      const getChainsByIds = async () => {
        const chains = await api.getChainsByIds(
          successResults.map((result) => result.chainConfig.studio_id)
        );
        const chainsById = Object.fromEntries(
          chains.map((c) => [c.studio_id, c])
        );
        return chainsById;
      };
      const chainsBefore = await getChainsByIds();

      const existingChainsNotCreatedBySDK = successResults.filter((result) => {
        const existingChain = chainsBefore[result.chainConfig.studio_id];
        // if the chain doesn't exist, we can deploy without issue
        if (!existingChain) return false;

        return existingChain.tags?.source !== "sdk";
      });

      if (existingChainsNotCreatedBySDK.length) {
        console.log(
          kleur.yellow(
            `Warning: The following chains already exist and were not created by the SDK.`
          )
        );
        existingChainsNotCreatedBySDK.forEach((chain) => {
          console.log(
            `- ${
              chain.chainConfig.title || chain.chainConfig.studio_id
            } ${kleur.dim(`(${chain.prettyPath})`)}`
          );
        });

        const shouldContinue = await select({
          message: "Do you want to deploy anyway?",
          options: [
            {
              value: false,
              label: "No",
              hint: "this will cancel the deployment, and you will need to rename your chains before deploying again",
            },
            {
              value: true,
              label: "Yes",
              hint: "this will overwrite the existing chains, and you will not be able to edit them from the notebook",
            },
          ],
          initialValue: false,
        });

        if (shouldContinue !== true) {
          return;
        }
      }

      const deploy = async (version: string) => {
        const versionToUse = version || "" + Math.random();
        const { region } = getAuthDetailsFromEnv();

        await api.saveChains({
          updates: successResults.map((result) => {
            return { ...result.chainConfig, tags: { source: "sdk" } };
          }),
          version: versionToUse,
        });

        const chains = await api.getChainsByIds(
          successResults.map((result) => result.chainConfig.studio_id)
        );
        const chainsById = Object.fromEntries(
          chains.map((c) => [c.studio_id, c])
        );

        const chainsWithProjectAndRegion = (
          await Promise.all(
            successResults.map(async (result) => {
              const savedChain = chainsById[result.chainConfig.studio_id];
              if (!savedChain) return;
              const isCurrentlyPubliclyTriggerable =
                !!savedChain.publicly_triggerable;
              const shouldBePubliclyTriggerable =
                !!result.chainConfig.publicly_triggerable;

              // Need to update if chain is publicly triggerable
              if (
                isCurrentlyPubliclyTriggerable !== shouldBePubliclyTriggerable
              ) {
                // chain needs to be shared
                if (shouldBePubliclyTriggerable) {
                  await api.shareChain(savedChain.studio_id);
                }
                // chain needs to be unshared
                else if (savedChain.share_id) {
                  await api.unshareChain(
                    savedChain.studio_id,
                    savedChain.share_id
                  );
                }
              }

              return {
                ...result,
                chainConfig: {
                  ...result.chainConfig,
                  project: savedChain.project!,
                  region,
                },
              };
            })
          )
        ).flatMap((v) => (v ? v : []));

        return chainsWithProjectAndRegion;
      };

      const chainsWithProjectAndRegion = await oraPromise(deploy("latest"), {
        text: "Deploying your chains",
        successText: "Deployed your chains to production 🚀",
      });

      chainsWithProjectAndRegion.forEach(({ chainConfig, prettyPath }) => {
        const lines = [
          `${kleur.green(chainConfig.studio_id)} ${kleur.dim(
            `(${prettyPath})`
          )}`,
          `  Preview: ${kleur.underline(
            `https://chain.relevanceai.com/notebook/${chainConfig.region}/${chainConfig.project}/${chainConfig.studio_id}/split`
          )}`,
        ].filter(Boolean);
        console.log(lines.map((line) => `\n${line}`).join(""));
      });

      // await oraPromise(deploy(), {
      //   text: "Deploying your chains",
      //   successText: "Deployed your chains",
      // });

      // if (prod) {
      //   await oraPromise(deploy("latest"), {
      //     text: "Deploying your chains to production",
      //     successText: "Deployed your chains to production 🚀",
      //   });
      // }
    })
  );
