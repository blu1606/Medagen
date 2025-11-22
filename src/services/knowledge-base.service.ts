import { SupabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';
import { GeminiEmbedding } from '../agent/gemini-embedding.js';

export interface Specialty {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
}

export interface Disease {
  id: string;
  specialty_id: string;
  name: string;
  synonyms?: string[];
  icd10_code?: string;
  description?: string;
}

export interface InfoDomain {
  id: string;
  name: string;
  name_en?: string;
  order_index: number;
  description?: string;
}

export interface StructuredKnowledgeQuery {
  specialty?: string;
  disease?: string;
  infoDomain?: string;
  query: string;
}

/**
 * Knowledge Base Service
 * Provides structured access to medical knowledge using specialties, diseases, and info_domains
 */
export class KnowledgeBaseService {
  private embedding: GeminiEmbedding;

  constructor(private supabaseService: SupabaseService) {
    this.embedding = new GeminiEmbedding();
  }

  /**
   * Get all specialties
   */
  async getSpecialties(): Promise<Specialty[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('specialties')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching specialties: ${error}`);
      return [];
    }
  }

  /**
   * Get diseases by specialty
   */
  async getDiseasesBySpecialty(specialtyName: string): Promise<Disease[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('diseases')
        .select('*, specialties!inner(name)')
        .eq('specialties.name', specialtyName)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching diseases for specialty ${specialtyName}: ${error}`);
      return [];
    }
  }

  /**
   * Get all info domains
   */
  async getInfoDomains(): Promise<InfoDomain[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('info_domains')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error fetching info domains: ${error}`);
      return [];
    }
  }

  /**
   * Find disease by name or synonym
   */
  async findDisease(query: string): Promise<Disease | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      // Exact match first
      const { data: exactMatch, error: exactError } = await this.supabaseService.getClient()
        .from('diseases')
        .select('*')
        .ilike('name', normalizedQuery)
        .limit(1)
        .single();

      if (exactMatch) return exactMatch;

      // Fuzzy match on name
      const { data: fuzzyMatch, error: fuzzyError } = await this.supabaseService.getClient()
        .from('diseases')
        .select('*')
        .ilike('name', `%${normalizedQuery}%`)
        .limit(1)
        .single();

      if (fuzzyMatch) return fuzzyMatch;

      // Check synonyms
      const { data: allDiseases } = await this.supabaseService.getClient()
        .from('diseases')
        .select('*');

      if (allDiseases) {
        for (const disease of allDiseases) {
          if (disease.synonyms) {
            for (const synonym of disease.synonyms) {
              if (synonym.toLowerCase().includes(normalizedQuery) ||
                  normalizedQuery.includes(synonym.toLowerCase())) {
                return disease;
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error finding disease: ${error}`);
      return null;
    }
  }

  /**
   * Find info domain by name
   */
  async findInfoDomain(query: string): Promise<InfoDomain | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      // Exact match
      const { data: exactMatch } = await this.supabaseService.getClient()
        .from('info_domains')
        .select('*')
        .ilike('name', normalizedQuery)
        .limit(1)
        .single();

      if (exactMatch) return exactMatch;

      // Fuzzy match
      const { data: fuzzyMatch } = await this.supabaseService.getClient()
        .from('info_domains')
        .select('*')
        .ilike('name', `%${normalizedQuery}%`)
        .limit(1)
        .single();

      if (fuzzyMatch) return fuzzyMatch;

      // Check English name
      const { data: enMatch } = await this.supabaseService.getClient()
        .from('info_domains')
        .select('*')
        .ilike('name_en', `%${normalizedQuery}%`)
        .limit(1)
        .single();

      if (enMatch) return enMatch;

      return null;
    } catch (error) {
      logger.error(`Error finding info domain: ${error}`);
      return null;
    }
  }

  /**
   * Query structured knowledge with filters and vector similarity
   */
  async queryStructuredKnowledge(
    params: StructuredKnowledgeQuery
  ): Promise<any[]> {
    try {
      logger.info('Querying structured knowledge base...');

      // If we have a text query, use vector search + filtering (hybrid search)
      if (params.query) {
        const queryEmbedding = await this.embedding.embedQuery(params.query);

        const { data, error } = await this.supabaseService.getClient().rpc(
          'match_medical_knowledge',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.3, // Lowered threshold for better recall
            match_count: 10,
            filter_specialty: params.specialty || null,
            filter_disease: params.disease || null,
            filter_specialty_id: null,
            filter_disease_id: null,
            filter_info_domain_id: null
          }
        );

        if (error) {
          logger.error({ error }, 'Error calling match_medical_knowledge RPC');
          // Fallback to simple text filtering if RPC fails
          return this.fallbackTextSearch(params);
        }

        // If vector search returns empty, try fallback text search
        if (!data || data.length === 0) {
          logger.info('Vector search returned no results, falling back to text search');
          return this.fallbackTextSearch(params);
        }

        // Filter by infoDomain if provided (since RPC filter for it is by ID, not name)
        let results = data || [];
        if (params.infoDomain) {
          results = results.filter((item: any) => 
            item.section_title && item.section_title.toLowerCase().includes(params.infoDomain!.toLowerCase())
          );
        }

        logger.info(`Found ${results.length} structured knowledge chunks via vector search`);
        return results;
      } 
      
      // No text query provided, fall back to simple text filtering
      return this.fallbackTextSearch(params);

    } catch (error) {
      logger.error(`Error querying structured knowledge: ${error}`);
      return [];
    }
  }

  private async fallbackTextSearch(params: StructuredKnowledgeQuery): Promise<any[]> {
    let query = this.supabaseService.getClient()
        .from('medical_knowledge_chunks')
        .select('*');

    // Apply filters if provided (using ilike for case-insensitive matching)
    if (params.specialty) {
      query = query.ilike('specialty', params.specialty);
    }

    if (params.disease) {
      query = query.ilike('disease', params.disease);
    }

    if (params.infoDomain) {
      query = query.ilike('section_title', params.infoDomain);
    }

    // Limit results
    query = query.limit(10);

    const { data, error } = await query;

    if (error) throw error;

    logger.info(`Found ${data?.length || 0} structured knowledge chunks via text search`);
    return data || [];
  }
}

