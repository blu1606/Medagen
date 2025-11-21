import { SupabaseService } from './supabase.service.js';
import { logger } from '../utils/logger.js';

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
  constructor(private supabaseService: SupabaseService) {}

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
   * Query structured knowledge with filters
   * Combines SQL filtering with vector search
   */
  async queryStructuredKnowledge(
    params: StructuredKnowledgeQuery
  ): Promise<any[]> {
    try {
      logger.info('Querying structured knowledge base...');

      let query = this.supabaseService.getClient()
        .from('medical_knowledge_chunks')
        .select('*');

      // Apply filters if provided
      if (params.specialty) {
        query = query.eq('specialty', params.specialty);
      }

      if (params.disease) {
        query = query.eq('disease', params.disease);
      }

      if (params.infoDomain) {
        query = query.eq('section_title', params.infoDomain);
      }

      // Limit results
      query = query.limit(10);

      const { data, error } = await query;

      if (error) throw error;

      logger.info(`Found ${data?.length || 0} structured knowledge chunks`);
      return data || [];
    } catch (error) {
      logger.error(`Error querying structured knowledge: ${error}`);
      return [];
    }
  }
}

