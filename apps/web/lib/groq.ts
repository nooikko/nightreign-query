/**
 * Groq API Client
 *
 * Provides fast LLM inference using Groq's hosted models.
 * Used for formatting search results into natural language responses.
 *
 * @see https://console.groq.com/docs
 */

import Groq from 'groq-sdk'

/**
 * Default model for inference
 * llama-3.1-8b-instant is optimized for speed with good quality
 */
export const DEFAULT_MODEL = 'llama-3.1-8b-instant'

/**
 * Groq client singleton
 * Lazily initialized to avoid errors when API key is not set
 */
let groqClient: Groq | null = null

/**
 * Get or create the Groq client
 *
 * @throws Error if GROQ_API_KEY is not set
 */
export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY environment variable is not set. ' +
          'Get your API key at https://console.groq.com/keys',
      )
    }

    groqClient = new Groq({
      apiKey,
    })
  }

  return groqClient
}

/**
 * Check if Groq is available (API key is set)
 */
export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY
}

/**
 * Options for chat completion
 */
export interface ChatCompletionOptions {
  /** System prompt to set context */
  systemPrompt?: string
  /** User message/query */
  userMessage: string
  /** Model to use (defaults to llama-3.1-8b-instant) */
  model?: string
  /** Maximum tokens in response (defaults to 150 for speed) */
  maxTokens?: number
  /** Temperature for response variability (0-2, defaults to 0.7) */
  temperature?: number
  /** Whether to stream the response */
  stream?: boolean
  /** AbortSignal for cancellation support */
  signal?: AbortSignal
}

/**
 * Create a chat completion (non-streaming)
 *
 * @param options - Completion options
 * @returns The generated text response
 * @throws Error if the API returns an empty or invalid response
 */
export async function createCompletion(
  options: Omit<ChatCompletionOptions, 'stream'>,
): Promise<string> {
  const client = getGroqClient()

  const {
    systemPrompt,
    userMessage,
    model = DEFAULT_MODEL,
    maxTokens = 150,
    temperature = 0.7,
  } = options

  const messages: Groq.Chat.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push({ role: 'user', content: userMessage })

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  })

  const content = completion.choices[0]?.message?.content
  if (content === null || content === undefined) {
    throw new Error(
      `Groq API returned empty response (finish_reason: ${completion.choices[0]?.finish_reason ?? 'unknown'})`,
    )
  }

  return content
}

/**
 * Create a streaming chat completion
 *
 * @param options - Completion options
 * @returns AsyncIterable of text chunks
 * @throws Error if the stream is aborted via the signal
 */
export async function* createStreamingCompletion(
  options: Omit<ChatCompletionOptions, 'stream'>,
): AsyncGenerator<string, void, unknown> {
  const client = getGroqClient()

  const {
    systemPrompt,
    userMessage,
    model = DEFAULT_MODEL,
    maxTokens = 150,
    temperature = 0.7,
    signal,
  } = options

  // Check if already aborted before starting
  if (signal?.aborted) {
    throw new Error('Request aborted')
  }

  const messages: Groq.Chat.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push({ role: 'user', content: userMessage })

  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
  })

  try {
    for await (const chunk of stream) {
      // Check for abort signal on each chunk
      if (signal?.aborted) {
        // Attempt to close the stream if possible
        if ('controller' in stream && typeof (stream as { controller?: { abort?: () => void } }).controller?.abort === 'function') {
          (stream as { controller: { abort: () => void } }).controller.abort()
        }
        throw new Error('Request aborted')
      }

      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    // Re-throw abort errors, but also clean up the stream
    if (signal?.aborted || (error instanceof Error && error.message === 'Request aborted')) {
      throw error
    }
    throw error
  }
}

/**
 * Format search results into a natural language response using Groq
 *
 * @param query - The user's search query
 * @param context - Search results context to include
 * @param options - Additional completion options
 * @returns Formatted response string
 */
export async function formatWithGroq(
  query: string,
  context: string,
  options?: Partial<ChatCompletionOptions>,
): Promise<string> {
  const systemPrompt = `You are a helpful assistant for Elden Ring Nightreign, a co-op multiplayer spinoff game.
Answer questions concisely and accurately based on the provided context.
Format your response using markdown when appropriate (headers, bullet points, tables).
If the context doesn't contain relevant information, say so briefly.
Keep responses under 100 words unless more detail is specifically needed.`

  return createCompletion({
    systemPrompt,
    userMessage: `Context from search results:
${context}

User question: ${query}

Provide a helpful, concise answer:`,
    ...options,
  })
}

/**
 * Format search results into a streaming natural language response
 *
 * @param query - The user's search query
 * @param context - Search results context to include
 * @param options - Additional completion options
 * @returns AsyncGenerator of text chunks
 */
export function formatWithGroqStreaming(
  query: string,
  context: string,
  options?: Partial<ChatCompletionOptions>,
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `You are a helpful assistant for Elden Ring Nightreign, a co-op multiplayer spinoff game.
Answer questions concisely and accurately based on the provided context.
Format your response using markdown when appropriate (headers, bullet points, tables).
If the context doesn't contain relevant information, say so briefly.
Keep responses under 100 words unless more detail is specifically needed.`

  return createStreamingCompletion({
    systemPrompt,
    userMessage: `Context from search results:
${context}

User question: ${query}

Provide a helpful, concise answer:`,
    ...options,
  })
}
