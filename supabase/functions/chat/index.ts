import { createClient } from '@supabase/supabase-js';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { codeBlock } from 'common-tags';
import OpenAI from 'openai';
import { Database } from '../_lib/database.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// These are automatically injected
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({
        error: 'Missing environment variables.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { messages, embedding, history } = await req.json();
  const chatHistory = history ? JSON.parse(history) : [];

  const { data: documents, error: matchError } = await supabase
    .rpc('match_document_sections', {
      embedding,
      match_threshold: 0.8,
    })
    .select('content')
    .limit(5);

  if (matchError) {
    console.error(matchError);

    return new Response(
      JSON.stringify({
        error: 'There was an error reading your documents, please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const injectedDocs =
    documents && documents.length > 0
      ? documents.map(({ content }) => content).join('\n\n')
      : 'No documents found';

  console.log(injectedDocs);

  const completionMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: codeBlock`
        You are a helpful customer service chatbot. Maintain context from chat history while providing clear, concise answers based on the documents below.

        Rules:
        - Consider previous context from chat history
        - Be friendly and professional
        - Only use information from the provided documents
        - If information is not in documents, respond: "I apologize, but I don't have information about that in my knowledge base."
        - Stay focused on customer queries
        - Provide direct, actionable answers when possible

        Reference Documents:
        ${injectedDocs}
      `,
    },
    ...chatHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })),
    ...messages,
  ];

  const completionStream = await openai.chat.completions.create({
    model: 'gpt-4-0125-preview',
    messages: completionMessages.slice(-10), // Keep last 10 messages for context
    max_tokens: 1024,
    temperature: 0,
    stream: true,
  });

  const stream = OpenAIStream(completionStream);
  return new StreamingTextResponse(stream, { headers: corsHeaders });
});
