import { GeminiEmbedding } from '../agent/gemini-embedding.js';
import { SupabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';
import type { GuidelineQuery } from '../types/index.js';

export class RAGService {
  private supabaseService: SupabaseService;
  private embedding: GeminiEmbedding;

  constructor(supabaseService: SupabaseService) {
    this.supabaseService = supabaseService;
    this.embedding = new GeminiEmbedding();
  }

  async initialize(): Promise<void> {
    // No initialization needed for direct RPC calls
    logger.info('RAG service ready');
  }

  async searchGuidelines(query: GuidelineQuery): Promise<string[]> {
    try {
      // Build search query text
      const queryText = this.buildQueryText(query);
      logger.info(`Searching guidelines for: ${queryText}`);

      // Generate embedding for query
      const queryEmbedding = await this.embedding.embedQuery(queryText);

      // Call Supabase RPC function
      const { data: docs, error } = await this.supabaseService.getClient().rpc(
        'match_guideline_chunks',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5, // Similarity threshold
          match_count: 5        // Number of chunks to retrieve
        }
      );

      if (error) {
        logger.error({ error }, 'Error calling match_guideline_chunks RPC');
        throw error;
      }

      if (!docs || docs.length === 0) {
        logger.info('No relevant guideline chunks found');
        return [];
      }

      // Extract content
      const guidelines = docs.map((doc: any) => doc.content);
      
      logger.info(`Found ${guidelines.length} relevant guideline snippets`);
      
      return guidelines;
    } catch (error) {
      logger.error({ error }, 'Error searching guidelines');
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
  
  // Legacy method kept for compatibility but updated to use direct SQL
  async addGuideline(
    condition: string,
    source: string,
    chunks: string[]
  ): Promise<void> {
    try {
      logger.info(`Adding guideline for ${condition}...`);

      // 1. Insert guideline record
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

      if (guidelineError) throw guidelineError;
      if (!guideline) throw new Error('Failed to create guideline record');

      // 2. Embed all chunks in parallel
      const embeddings = await Promise.all(
        chunks.map(chunk => this.embedding.embedQuery(chunk))
      );

      // 3. Insert chunks with embeddings
      const chunksData = chunks.map((chunk, index) => ({
        guideline_id: guideline.id,
        content: chunk,
        embedding: embeddings[index],
        metadata: { condition, source }
      }));

      const { error: chunksError } = await this.supabaseService
        .getClient()
        .from('guideline_chunks')
        .insert(chunksData);

      if (chunksError) throw chunksError;

      logger.info(`Successfully added ${chunks.length} chunks for ${condition}`);
    } catch (error) {
      logger.error({ error }, 'Error adding guideline');
      throw error;
    }
  }
}

