
// Route for OpenAI embeddings API
import { Router } from 'express';
import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// GET endpoint to check if service is working
export async function GET() {
    return NextResponse.json({ message: "Embeddings service is working" });
}

// POST endpoint to generate embeddings 
export async function POST(req: NextRequest) {
    try {
        console.log('Received POST request for embeddings generation');
        
        const { input } = await req.json();
        console.log('Input text received:', input);

        if (!input) {
            console.warn('Empty text received in request');
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        console.log('Calling OpenAI embeddings API...');
        const data = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: input,
        });

        console.log('Successfully generated embeddings');
        console.log('Embeddings:', data);
        
        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error generating embedding:', error);
        console.error('Stack trace:', (error as Error).stack);
        return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }
}
