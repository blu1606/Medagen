import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { GeminiEmbedding } from '../agent/gemini-embedding.js';
import { SupabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';
import type { GuidelineQuery } from '../types/index.js';

export class RAGService {
  private vectorStore: SupabaseVectorStore | null = null;
  private supabaseService: SupabaseService;
  private embedding: GeminiEmbedding;

  constructor(supabaseService: SupabaseService) {
    this.supabaseService = supabaseService;
    this.embedding = new GeminiEmbedding();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing RAG service with Supabase Vector Store...');
      
      this.vectorStore = new SupabaseVectorStore(this.embedding, {
        client: this.supabaseService.getClient(),
        tableName: 'guideline_chunks',
        queryName: 'match_guideline_chunks'
      });
      
      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }

  async searchGuidelines(query: GuidelineQuery): Promise<string[]> {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      // Build search query from symptoms and suspected conditions
      const queryText = this.buildQueryText(query);
      
      logger.info(`Searching guidelines for: ${queryText}`);

      // Perform similarity search
      const docs = await this.vectorStore!.similaritySearch(queryText, 5);
      
      // Extract text from documents
      const guidelines = docs.map(doc => doc.pageContent);
      
      logger.info(`Found ${guidelines.length} relevant guideline snippets`);
      
      return guidelines;
    } catch (error) {
      logger.error('Error searching guidelines:', error);
      return [];
    }
  }

  private buildQueryText(query: GuidelineQuery): string {
    const parts: string[] = [];
    
    if (query.symptoms) {
      parts.push(`Triệu chứng: ${query.symptoms}`);
    }
    
    if (query.suspected_conditions && query.suspected_conditions.length > 0) {
      parts.push(`Tình trạng nghi ngờ: ${query.suspected_conditions.join(', ')}`);
    }
    
    if (query.triage_level) {
      parts.push(`Mức độ: ${query.triage_level}`);
    }
    
    return parts.join('. ');
  }

  async addGuideline(
    condition: string,
    source: string,
    chunks: string[]
  ): Promise<void> {
    try {
      logger.info(`Adding guideline for ${condition}...`);

      // First, insert the guideline record
      const { data: guideline, error: guidelineError } = await this.supabaseService
        .getClient()
        .from('guidelines')
        .insert({
          condition,
          source,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (guidelineError) {
        logger.error({ error: guidelineError }, 'Failed to insert guideline record');
        throw guidelineError;
      }

      if (!guideline || !guideline.id) {
        throw new Error('Failed to get guideline ID after insert');
      }

      logger.info(`Guideline record created with ID: ${guideline.id}`);

      // Then, add chunks with embeddings
      if (!this.vectorStore) {
        await this.initialize();
      }

      const documents = chunks.map(chunk => ({
        pageContent: chunk,
        metadata: {
          guideline_id: guideline.id,
          condition,
          source
        }
      }));

      logger.info(`Adding ${documents.length} documents to vector store...`);
      
      await this.vectorStore!.addDocuments(documents);

      logger.info(`Successfully added ${chunks.length} chunks for ${condition}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error({ 
          error: error.message, 
          stack: error.stack,
          condition,
          source 
        }, 'Error adding guideline');
      } else {
        logger.error({ 
          error: JSON.stringify(error),
          condition,
          source 
        }, 'Error adding guideline');
      }
      throw error;
    }
  }
}

