import { createClient } from '@supabase/supabase-js';
import { Database } from '../_lib/database.ts';
import { processMarkdown } from '../_lib/markdown-parser.ts';
import { pdfText } from 'jsr:@pdf/pdftext';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (req) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variables.' }),
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

  const { document_id } = await req.json();

  const { data: document } = await supabase
    .from('documents_with_storage_path')
    .select()
    .eq('id', document_id)
    .single();

  if (!document?.storage_object_path) {
    return new Response(
      JSON.stringify({ error: 'Failed to find uploaded document' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { data: file } = await supabase.storage
    .from('files')
    .download(document.storage_object_path);

  if (!file) {
    return new Response(
      JSON.stringify({ error: 'Failed to download storage object' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const contentType = file.type; // Get the MIME type
  let fileContents: string | undefined;

  try {
    if (contentType === 'application/pdf') {
      // Handle PDF files
      fileContents = await extractPdfText(file);
    } else if (
      contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // Handle DOCX files
      fileContents = await extractDocText(file);
    } else if (contentType.startsWith('text/')) {
      // Handle plain text or Markdown files
      fileContents = await file.text();
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ error: 'Error processing file content.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse the file content into sections (Markdown or plain text processing)
  const processedMd = processMarkdown(fileContents);

  // Split sections into smaller chunks for better processing with overlapping windows
  const chunks = processedMd.sections.flatMap(({ content }) => {
    const chunkSize = 1000; // Main chunk size
    const windowSize = 200; // Overlap window size
    const words = content.split(' ');
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - windowSize) {
      chunks.push({
        document_id,
        content: words.slice(i, i + chunkSize).join(' ')
      });
    }
    
    return chunks;
  });

  const { error } = await supabase.from('document_sections').insert(chunks);
  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'Failed to save document sections' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log(
    `Saved ${processedMd.sections.length} sections for file '${document.name}'`
  );

  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'application/json' },
  });
});

// Helper Functions

async function extractPdfText(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pages = await pdfText(buffer);
  return pages[0]; // Get all pages text
}

async function extractDocText(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await readDocx({ arrayBuffer });
  return result.value;
}
