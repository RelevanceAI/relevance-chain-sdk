# Relevance AI Chain SDK

<div align="center">

![Relevance AI stack](head-illustration.png)

![npm](https://img.shields.io/npm/dw/@relevanceai/chain) ![GitHub commit activity](https://img.shields.io/github/commit-activity/w/relevanceai/relevance-chain-sdk) ![Discord](https://img.shields.io/discord/1107542094672842762) ![Twitter Follow](https://img.shields.io/twitter/follow/relevanceai_?style=social)

</div>

The managed, developer-first SDK for building LLM chains.

## 🔨 Installation

Get started with the SDK and CLI by installing it with the following line:
```sh
npm i -g @relevanceai/chain
```

## 🏃‍♀️ Quickstart

Authenticate into your Relevance AI account
```sh
relevance login
```

Create a `/chains` folder with a file for each chain
```
/chains
- pdf-qa.ts
- generate-sql.ts
- generate-configs.ts
```

Represent the chain in code exporting `defineChain` and configure the chain. The first argument is a config of the chain and the input schema. The second argument is the `setup` function which is used to define the chain with each `step`.
```typescript
import { defineChain } from '@relevanceai/chain';

export default chain(
    {
        title: 'PDF Q&A',
        params: {
            question: { type: 'string' },
            file_url: { type: 'string' }
        }
    },
    setup(({ params, step }) => {
        const { question, file_url } = params;

        const { text } = step('pdf_to_text', { file_url });
        const { answer } = step('prompt_completion', { 
            prompt: `${text}\n Based on the above context, answer the question ${question}` 
        });

        return {
            answer
        }
    })
);
```

Deploy the chains
```sh
relevance deploy
```

## Documentation

See our full documentation [here](https://documentation.relevanceai.com).
