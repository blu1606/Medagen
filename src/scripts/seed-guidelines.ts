import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===================== CONFIG =====================
const SUPABASE_URL = config.supabase.url;
const SUPABASE_SERVICE_KEY = config.supabase.serviceKey;
const GEMINI_API_KEY = config.gemini.apiKey;

const TABLE_NAME = 'medical_knowledge_chunks';
const SPECIALTY_FOLDER = 'Da liễu'; // Can be changed: "Than-kinh", etc.
const SPECIALTY_LABEL = slugToLabel(SPECIALTY_FOLDER);

// ===================== INIT CLIENTS =====================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// ===================== HELPER FUNCTIONS =====================

/**
 * Convert slug to human-friendly label
 */
function slugToLabel(slug: string): string {
  let label = slug.replace(/[-_]+/g, ' ');
  label = label.replace(/\s+/g, ' ').trim();

// Remove "CHƯƠNG {n}" prefix entirely
label = label.replace(/^(CH(U|Ư)ƠNG)\s*\d+\s*[.:~-]?\s*/iu, '');

  // Remove leading numeric / roman numeral prefixes (e.g., "1.", "(IV)", "2-")
  label = label.replace(/^(?:\(?[0-9IVXLCDM]+\)?)(?:\s*[\.\-])?\s+/iu, '');

  // Cleanup remaining punctuation/spacing
  label = label.replace(/\s*:\s*/g, ': ');
  label = label.replace(/\s*-\s*/g, ' - ');
  label = label.replace(/\s+\./g, '. ');
  label = label.replace(/,\s*/g, ', ');
  label = label.replace(/\s{2,}/g, ' ').trim();

  if (!label) {
    label = slug.replace(/[-_]+/g, ' ').trim();
  }

  return label;
  }

/**
 * Parse section filename to human-readable title.
 * Supports formats like:
 *   - "ĐẠI CƯƠNG.txt"
 *   - "ĐẠI CƯƠNG_1.txt" (duplicate-safe suffix)
 */
function parseSectionFileName(filename: string): { title: string } | null {
  if (!filename.endsWith('.txt')) return null;
  const base = filename.replace(/\.txt$/i, '');
  const withoutDuplicateSuffix = base.replace(/_(\d+)$/, '');
  const title = withoutDuplicateSuffix.replace(/[_]+/g, ' ').trim();
  if (!title) return null;
  return { title };
}

/**
 * Generate embedding using Gemini
 */
async function embed(text: string): Promise<number[]> {
  const res = await embedModel.embedContent(text);
  return res.embedding.values;
      }

/**
 * Check if a directory entry is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get or create specialty record
 */
async function getOrCreateSpecialty(name: string): Promise<string | null> {
  // Try to find existing specialty
  const { data: existing, error: fetchError } = await supabase
    .from('specialties')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    return existing.id;
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    logger.error({ error: fetchError }, `Error fetching specialty: ${name}`);
    return null;
  }

  // Create new specialty
  const { data: created, error: createError } = await supabase
    .from('specialties')
    .insert({ name })
    .select('id')
    .single();

  if (createError) {
    logger.error({ error: createError }, `Error creating specialty: ${name}`);
    return null;
  }

  return created?.id || null;
}

/**
 * Get or create disease record
 */
async function getOrCreateDisease(
  name: string,
  specialtyId: string
): Promise<string | null> {
  // Try to find existing disease
  const { data: existing, error: fetchError } = await supabase
    .from('diseases')
    .select('id')
    .eq('name', name)
    .eq('specialty_id', specialtyId)
    .single();

  if (existing) {
    return existing.id;
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    logger.error({ error: fetchError }, `Error fetching disease: ${name}`);
    return null;
  }

  // Create new disease
  const { data: created, error: createError } = await supabase
    .from('diseases')
    .insert({ name, specialty_id: specialtyId })
    .select('id')
    .single();

  if (createError) {
    logger.error({ error: createError }, `Error creating disease: ${name}`);
    return null;
  }

  return created?.id || null;
}

/**
 * Get info domain ID by name
 */
async function getInfoDomainId(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('info_domains')
    .select('id')
    .eq('name', name)
    .single();

  if (error) {
    // Try fuzzy match
    const normalizedName = name.toLowerCase().trim();
    const { data: allDomains } = await supabase
      .from('info_domains')
      .select('id, name');

    if (allDomains) {
      for (const domain of allDomains) {
        if (domain.name.toLowerCase().includes(normalizedName) || 
            normalizedName.includes(domain.name.toLowerCase())) {
          return domain.id;
        }
      }
    }
    return null;
  }

  return data?.id || null;
}

async function seedGuidelines() {
  try {
    logger.info(`Starting medical knowledge seeding for ${SPECIALTY_LABEL}...`);
    
    validateConfig();

    // Get data folder path (relative to project root)
    const dataRoot = join(__dirname, '../../data');
    const specialtyRoot = join(dataRoot, SPECIALTY_FOLDER);
    
    logger.info(`Reading data from: ${specialtyRoot}`);
    
    // Check if specialty folder exists
    try {
      await stat(specialtyRoot);
    } catch {
      logger.error(`Specialty folder not found: ${specialtyRoot}`);
      process.exit(1);
    }

    // Get or create specialty record
    const specialtyId = await getOrCreateSpecialty(SPECIALTY_LABEL);
    if (!specialtyId) {
      logger.error('Failed to get or create specialty record');
      process.exit(1);
    }
    logger.info(`Specialty ID: ${specialtyId}`);
    
    // Read chapter directories
    const chapterEntries = await readdir(specialtyRoot);
    let totalSeeded = 0;
    let totalSkipped = 0;

    for (const chapterSlug of chapterEntries) {
      const chapterPath = join(specialtyRoot, chapterSlug);
      
      if (!(await isDirectory(chapterPath))) {
        continue;
      }

      const chapterLabel = slugToLabel(chapterSlug);
      logger.info(`\n📖 Processing chapter: ${chapterLabel}`);

      // Read disease directories
      const diseaseEntries = await readdir(chapterPath);

      for (const diseaseSlug of diseaseEntries) {
        const diseasePath = join(chapterPath, diseaseSlug);
        
        if (!(await isDirectory(diseasePath))) {
          continue;
        }
        
        const diseaseLabel = slugToLabel(diseaseSlug);
        logger.info(`  🩺 Processing disease: ${diseaseLabel}`);

        // Read section files
        const sectionFiles = await readdir(diseasePath);

        for (const filename of sectionFiles) {
          // Skip non-txt files and _raw.txt
          if (!filename.endsWith('.txt') || filename === '_raw.txt') {
            continue;
          }

          const sectionInfo = parseSectionFileName(filename);
          if (!sectionInfo) {
            logger.warn(`    ⚠️  Skipping invalid filename: ${filename}`);
            totalSkipped++;
            continue;
          }

          const { title: sectionTitle } = sectionInfo;
          const sectionPath = join(diseasePath, filename);
          
          try {
            const content = await readFile(sectionPath, 'utf-8');
            const contentTrimmed = content.trim();

            if (!contentTrimmed) {
              logger.warn(`    ⚠️  Skipping empty file: ${filename}`);
              totalSkipped++;
              continue;
            }

            const relativePath = sectionPath.replace(dataRoot + '/', '');

            logger.info(`    📄 ${sectionTitle} (${contentTrimmed.length} chars)`);
        
            // Get or create disease record
            const diseaseId = await getOrCreateDisease(diseaseLabel, specialtyId);
            
            // Get info domain ID (match section title with info domain)
            const infoDomainId = await getInfoDomainId(sectionTitle);
            
            // Generate embedding
            const embedding = await embed(contentTrimmed);

            // Insert into Supabase with both structured and legacy fields
            const { error } = await supabase.from(TABLE_NAME).insert({
              // Structured fields (new)
              specialty_id: specialtyId,
              disease_id: diseaseId,
              info_domain_id: infoDomainId,
              // Legacy fields (for backward compatibility)
              specialty: SPECIALTY_LABEL,
              chapter: chapterLabel,
              disease: diseaseLabel,
              section_title: sectionTitle,
              content: contentTrimmed,
              path: relativePath,
              embedding,
            });

            if (error) {
              logger.error({ error: error.message }, `    ❌ Error inserting: ${sectionTitle}`);
              totalSkipped++;
            } else {
              totalSeeded++;
            }
        
      } catch (error) {
            logger.error({ error }, `    ❌ Error processing file: ${filename}`);
            totalSkipped++;
          }
        }
      }
    }

    logger.info(`\n✅ Seeding completed!`);
    logger.info(`   📊 Total seeded: ${totalSeeded}`);
    logger.info(`   ⚠️  Total skipped: ${totalSkipped}`);
    
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error: error.message, stack: error.stack }, 'Seeding failed');
    } else {
      logger.error({ error: JSON.stringify(error) }, 'Seeding failed');
    }
    process.exit(1);
  }
}

seedGuidelines();
