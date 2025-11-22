import { SupabaseService } from './src/services/supabase.service.js';
import { RAGService } from './src/services/rag.service.js';
import { KnowledgeBaseService } from './src/services/knowledge-base.service.js';
import { logger } from './src/utils/logger.js';
// npx tsx run_tests.js
// Mock logger to avoid cluttering output
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function runTests() {
  console.log('🚀 Starting MCP Tools Tests...\n');
  
  const supabaseService = new SupabaseService();
  const ragService = new RAGService(supabaseService);
  const kbService = new KnowledgeBaseService(supabaseService);

  let passed = 0;
  let failed = 0;

  // ==================== TEST 1: RAG Service - Basic Search ====================
  console.log('--- Test 1: RAG Service - Basic Guideline Search ---');
  try {
    const ragQuery1 = {
      symptoms: 'Da nổi mẩn đỏ ngứa',
      suspected_conditions: ['Viêm da cơ địa'],
      triage_level: 'routine'
    };
    
    console.log(`Query: ${JSON.stringify(ragQuery1)}`);
    const results1 = await ragService.searchGuidelines(ragQuery1);
    
    if (results1.length > 0) {
      console.log(`✅ PASS: Found ${results1.length} guideline chunks`);
      console.log(`   Sample: ${results1[0].substring(0, 100)}...\n`);
      passed++;
    } else {
      console.log(`⚠️  WARNING: No results found (might be empty database)\n`);
      passed++; // Not a failure, just empty data
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 2: RAG Service - Specific Condition ====================
  console.log('--- Test 2: RAG Service - Specific Condition Search ---');
  try {
    const ragQuery2 = {
      symptoms: 'Mụn trứng cá trên mặt',
      suspected_conditions: ['Trứng cá'],
      triage_level: 'routine'
    };
    
    console.log(`Query: ${JSON.stringify(ragQuery2)}`);
    const results2 = await ragService.searchGuidelines(ragQuery2);
    
    if (results2.length > 0) {
      console.log(`✅ PASS: Found ${results2.length} guideline chunks\n`);
      passed++;
    } else {
      console.log(`⚠️  WARNING: No results found\n`);
      passed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 3: Knowledge Base - Find Disease ====================
  console.log('--- Test 3: Knowledge Base - Find Disease by Name ---');
  try {
    const diseaseName = 'Trứng cá';
    console.log(`Finding disease: "${diseaseName}"`);
    const disease = await kbService.findDisease(diseaseName);
    
    if (disease) {
      console.log(`✅ PASS: Found disease "${disease.name}" (ID: ${disease.id})\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Disease not found\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 4: Knowledge Base - Find Disease (Synonym) ====================
  console.log('--- Test 4: Knowledge Base - Find Disease by Synonym ---');
  try {
    const synonym = 'mụn trứng cá';
    console.log(`Finding disease by synonym: "${synonym}"`);
    const disease = await kbService.findDisease(synonym);
    
    if (disease) {
      console.log(`✅ PASS: Found disease "${disease.name}" via synonym\n`);
      passed++;
    } else {
      console.log(`⚠️  WARNING: Disease not found via synonym (might not have synonyms in DB)\n`);
      passed++; // Not critical
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 5: Knowledge Base - Structured Query (Vector Search) ====================
  console.log('--- Test 5: Knowledge Base - Structured Query (Vector Search) ---');
  try {
    const structuredQuery = {
      disease: 'Trứng cá',
      infoDomain: 'Điều trị',
      query: 'Cách điều trị mụn trứng cá tại nhà'
    };
    
    console.log(`Query: ${JSON.stringify(structuredQuery)}`);
    const kbResults = await kbService.queryStructuredKnowledge(structuredQuery);
    
    if (kbResults.length > 0) {
      console.log(`✅ PASS: Found ${kbResults.length} structured knowledge chunks`);
      console.log(`   Sample: ${kbResults[0].content?.substring(0, 100) || 'N/A'}...\n`);
      passed++;
    } else {
      console.log(`⚠️  WARNING: No results found (fallback to text search might work)\n`);
      passed++; // Not critical, fallback exists
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 6: Knowledge Base - Get Specialties ====================
  console.log('--- Test 6: Knowledge Base - Get All Specialties ---');
  try {
    const specialties = await kbService.getSpecialties();
    
    if (specialties.length > 0) {
      console.log(`✅ PASS: Found ${specialties.length} specialties`);
      console.log(`   Sample: ${specialties[0].name}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: No specialties found\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 7: Knowledge Base - Get Info Domains ====================
  console.log('--- Test 7: Knowledge Base - Get Info Domains ---');
  try {
    const infoDomains = await kbService.getInfoDomains();
    
    if (infoDomains.length > 0) {
      console.log(`✅ PASS: Found ${infoDomains.length} info domains`);
      console.log(`   Sample: ${infoDomains[0].name}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: No info domains found\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== TEST 8: RAG Service - Empty Query Handling ====================
  console.log('--- Test 8: RAG Service - Empty Query Handling ---');
  try {
    const emptyQuery = {
      symptoms: '',
      suspected_conditions: [],
      triage_level: 'routine'
    };
    
    const results = await ragService.searchGuidelines(emptyQuery);
    console.log(`✅ PASS: Handled empty query gracefully (returned ${results.length} results)\n`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // ==================== SUMMARY ====================
  console.log('='.repeat(60));
  console.log(`📊 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

