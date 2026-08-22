import { completion, loadModel, unloadModel } from '@qvac/sdk'
import {
  COMPLETION_SEED,
  COMPLETION_TEMP,
  LLM_CTX_SIZE,
  LLM_MODEL_SRC,
  REASONING_BUDGET,
} from '../config.js'

export interface CompletionOutcome {
  text: string
  tokensPerSecond?: number
}

export async function loadLlm(): Promise<string> {
  return loadModel({
    modelSrc: LLM_MODEL_SRC,
    modelConfig: {
      ctx_size: LLM_CTX_SIZE,
      reasoning_budget: REASONING_BUDGET,
    },
  })
}

export async function unloadLlm(modelId: string): Promise<void> {
  await unloadModel({ modelId, clearStorage: false })
}

export async function completeOnce(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<CompletionOutcome> {
  const run = completion({
    modelId,
    history: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    generationParams: {
      temp: COMPLETION_TEMP,
      seed: COMPLETION_SEED,
      reasoning_budget: REASONING_BUDGET,
    },
  })
  for await (const _event of run.events) {
    void _event
  }
  const final = await run.final
  return {
    text: final.contentText,
    tokensPerSecond: final.stats?.tokensPerSecond,
  }
}
