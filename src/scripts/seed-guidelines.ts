import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SupabaseService } from '../services/supabase.service.js';
import { RAGService } from '../services/rag.service.js';
import { validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ParsedGuideline {
  condition: string;
  source: string;
  content: string;
}

/**
 * Parse a guideline text file to extract condition, source, and content
 */
function parseGuidelineFile(content: string, filename: string): ParsedGuideline | null {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    logger.warn(`File ${filename} has insufficient content`);
    return null;
  }

  // Extract condition from first line: "Hướng dẫn: [Condition]"
  let condition = '';
  if (lines[0].startsWith('Hướng dẫn:')) {
    condition = lines[0].replace('Hướng dẫn:', '').trim();
  } else {
    // Fallback: use filename without extension
    condition = filename.replace('.txt', '').replace(/-/g, ' ');
  }

  // Extract source from second line: "Nguồn: [Source]"
  let source = '';
  if (lines[1].startsWith('Nguồn:')) {
    source = lines[1].replace('Nguồn:', '').trim();
  } else {
    source = 'Unknown Source';
  }

  // Get content (skip first 2 lines)
  const contentLines = lines.slice(2);
  const fullContent = contentLines.join('\n').trim();

  if (!condition || !fullContent) {
    logger.warn(`File ${filename} missing condition or content`);
    return null;
  }

  return {
    condition,
    source,
    content: fullContent
  };
}

/**
 * Chunk text into smaller pieces for vector embedding
 * Tries to keep sentences intact and maintain semantic meaning
 */
function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim();
    
    // If paragraph is short, add to current chunk
    if (currentChunk.length + paragraphTrimmed.length + 1 <= maxChunkSize) {
      if (currentChunk) {
        currentChunk += '\n\n' + paragraphTrimmed;
      } else {
        currentChunk = paragraphTrimmed;
      }
    } else {
      // Save current chunk if it has content
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If paragraph itself is longer than maxChunkSize, split by sentences
      if (paragraphTrimmed.length > maxChunkSize) {
        const sentences = paragraphTrimmed.split(/([.!?]\s+)/);
        let sentenceChunk = '';
        
        for (let i = 0; i < sentences.length; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || '');
          
          if (sentenceChunk.length + sentence.length <= maxChunkSize) {
            sentenceChunk += sentence;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        } else {
          currentChunk = paragraphTrimmed.substring(0, maxChunkSize);
        }
      } else {
        currentChunk = paragraphTrimmed;
      }
    }
  }
  
  // Add last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  // Filter out very short chunks (less than 50 chars)
  return chunks.filter(chunk => chunk.trim().length >= 50);
}

async function seedGuidelines() {
  try {
    logger.info('Starting guideline seeding from data folder...');
    
    validateConfig();
    
    const supabaseService = new SupabaseService();
    const ragService = new RAGService(supabaseService);
    
    await ragService.initialize();

    // Get data folder path (relative to project root)
    const dataFolder = join(__dirname, '../../data');
    
    logger.info(`Reading files from: ${dataFolder}`);
    
    // Read all .txt files from data folder
    const files = await readdir(dataFolder);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      logger.error('No .txt files found in data folder');
      process.exit(1);
    }
    
    logger.info(`Found ${txtFiles.length} guideline file(s)`);

    for (const filename of txtFiles) {
      try {
        logger.info(`\nProcessing file: ${filename}...`);
        
        const filePath = join(dataFolder, filename);
        const fileContent = await readFile(filePath, 'utf-8');
        
        // Parse file to extract condition, source, and content
        const parsed = parseGuidelineFile(fileContent, filename);
        
        if (!parsed) {
          logger.warn(`Skipping ${filename} due to parsing error`);
          continue;
        }
        
        logger.info(`  Condition: ${parsed.condition}`);
        logger.info(`  Source: ${parsed.source}`);
        
        // Chunk the content
        const chunks = chunkText(parsed.content);
        logger.info(`  Generated ${chunks.length} chunks`);
        
        // Add guideline to database
        await ragService.addGuideline(
          parsed.condition,
          parsed.source,
          chunks
        );
        
        logger.info(`✅ Successfully seeded: ${parsed.condition}`);
        
      } catch (error) {
        logger.error({ error, filename }, `Error processing ${filename}`);
        // Continue with next file
      }
    }

    logger.info('\n✅ All guidelines seeded successfully');
    
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
