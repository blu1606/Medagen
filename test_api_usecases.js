import axios from 'axios';

// Support both local and HuggingFace Space
const BASE_URL = process.env.API_URL || 'https://medagen-backend.hf.space/api/health-check';
const HEALTH_CHECK_URL = process.env.HEALTH_URL || BASE_URL.replace('/api/health-check', '/health');

// npx tsx test_api_usecases.js
const useCases = [
  {
    id: 1,
    name: 'MCP CV - Da liễu với hình ảnh',
    expectedMCP: 'CV',
    payload: {
      text: 'Da tay nổi mẩn đỏ ngứa',
      image_url: 'https://www.rosacea.org/sites/default/files/images/rosacea_subtype2.jpg',
      user_id: 'test_user_1'
    }
  },
  {
    id: 2,
    name: 'MCP CV + RAG - Triệu chứng với hình ảnh',
    expectedMCP: 'CV+RAG',
    payload: {
      text: 'Mặt nổi nhiều mụn trứng cá, đỏ và sưng',
      image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Atopic_dermatitis.jpg/800px-Atopic_dermatitis.jpg',
      user_id: 'test_user_2'
    }
  },
  // {
  //   id: 3,
  //   name: 'MCP CSDL - Câu hỏi định nghĩa bệnh',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Trứng cá là gì?',
  //     user_id: 'test_user_3'
  //   }
  // },
  // {
  //   id: 4,
  //   name: 'MCP CSDL - Câu hỏi về nguyên nhân',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Nguyên nhân gây ra trứng cá là gì?',
  //     user_id: 'test_user_4'
  //   }
  // },
  // {
  //   id: 5,
  //   name: 'MCP CSDL - Câu hỏi về điều trị',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Cách điều trị mụn trứng cá như thế nào?',
  //     user_id: 'test_user_5'
  //   }
  // },
  // {
  //   id: 6,
  //   name: 'MCP CSDL - Câu hỏi về triệu chứng',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Triệu chứng của trứng cá là gì?',
  //     user_id: 'test_user_6'
  //   }
  // },
  // {
  //   id: 7,
  //   name: 'MCP CSDL - Câu hỏi về phòng bệnh',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Làm sao để phòng ngừa trứng cá?',
  //     user_id: 'test_user_7'
  //   }
  // },
  // {
  //   id: 8,
  //   name: 'MCP RAG + CSDL - Triệu chứng kèm câu hỏi giáo dục',
  //   expectedMCP: 'BOTH',
  //   payload: {
  //     text: 'Tôi bị mụn trứng cá, cho tôi biết về bệnh này và cách xử lý',
  //     user_id: 'test_user_8'
  //   }
  // },
  // {
  //   id: 9,
  //   name: 'MCP RAG - Triệu chứng da liễu không rõ ràng',
  //   expectedMCP: 'RAG',
  //   payload: {
  //     text: 'Da tay bị ngứa và nổi mẩn đỏ',
  //     user_id: 'test_user_9'
  //   }
  // },
  // {
  //   id: 10,
  //   name: 'MCP CSDL - Câu hỏi về biến chứng',
  //   expectedMCP: 'CSDL',
  //   payload: {
  //     text: 'Trứng cá có biến chứng gì không?',
  //     user_id: 'test_user_10'
  //   }
  // }
];

let lastSessionId = null;

async function runTests() {
  console.log('🚀 Starting MCP CV, RAG & CSDL API Tests...\n');
  console.log(`🌐 Testing endpoint: ${BASE_URL}`);
  console.log(`🏥 Health check: ${HEALTH_CHECK_URL}\n`);
  console.log('='.repeat(80));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const useCase of useCases) {
    console.log(`\n--- Use Case ${useCase.id}: ${useCase.name} ---`);
    
    // Update session_id for follow-up test
    if (useCase.id === 9 && lastSessionId) {
      useCase.payload.session_id = lastSessionId;
    }
    
    try {
      const startTime = Date.now();
      const response = await axios.post(BASE_URL, useCase.payload, {
        timeout: 60000, // Increased timeout for HuggingFace Space
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses for testing
      });
      const duration = Date.now() - startTime;

      // Store session_id for next test
      if (response.data.session_id) {
        lastSessionId = response.data.session_id;
      }

      // Check if RAG, CSDL, or CV was used by examining response content
      const responseText = JSON.stringify(response.data).toLowerCase();
      const hasRAGContent = responseText.includes('guideline') || 
                           responseText.includes('hướng dẫn') ||
                           responseText.includes('phòng bệnh') ||
                           responseText.includes('điều trị') ||
                           (response.data.recommendation?.details && 
                            response.data.recommendation.details.length > 200);
      
      const hasCSDLContent = responseText.includes('định nghĩa') ||
                          responseText.includes('nguyên nhân') ||
                          responseText.includes('triệu chứng') ||
                          responseText.includes('biến chứng') ||
                          responseText.includes('tiên lượng') ||
                          response.data.suspected_conditions?.length > 0;
      
      const hasCVContent = response.data.cv_findings?.model_used && 
                          response.data.cv_findings.model_used !== 'none';

      const result = {
        id: useCase.id,
        name: useCase.name,
        expectedMCP: useCase.expectedMCP,
        status: 'PASS',
        statusCode: response.status,
        duration: `${duration}ms`,
        triageLevel: response.data.triage_level,
        hasRedFlags: response.data.red_flags?.length > 0,
        hasSuspectedConditions: response.data.suspected_conditions?.length > 0,
        hasRecommendation: !!response.data.recommendation?.action,
        sessionId: response.data.session_id || null,
        ragDetected: hasRAGContent,
        csdlDetected: hasCSDLContent,
        cvDetected: hasCVContent,
        cvModel: response.data.cv_findings?.model_used || 'none',
        responseLength: JSON.stringify(response.data).length
      };

      // Validation checks
      const validations = [];
      
      if (!response.data.triage_level) {
        validations.push('Missing triage_level');
      }
      
      if (!response.data.symptom_summary) {
        validations.push('Missing symptom_summary');
      }
      
      if (!response.data.recommendation) {
        validations.push('Missing recommendation');
      }
      
      // MCP-specific validations
      if (useCase.expectedMCP === 'CV' && !result.cvDetected) {
        validations.push('Expected CV but not detected in response');
      }
      
      if (useCase.expectedMCP === 'CV+RAG') {
        if (!result.cvDetected) validations.push('Expected CV but not detected');
        if (!result.ragDetected) validations.push('Expected RAG but not detected');
      }
      
      if (useCase.expectedMCP === 'RAG' && !result.ragDetected) {
        validations.push('Expected RAG but not detected in response');
      }
      
      if (useCase.expectedMCP === 'CSDL' && !result.csdlDetected) {
        validations.push('Expected CSDL but not detected in response');
      }
      
      if (useCase.expectedMCP === 'BOTH') {
        if (!result.ragDetected && !result.csdlDetected) {
          validations.push('Expected both RAG and CSDL but neither detected');
        } else if (!result.ragDetected) {
          validations.push('Expected RAG but not detected');
        } else if (!result.csdlDetected) {
          validations.push('Expected CSDL but not detected');
        }
      }
      
      // Check if response has meaningful content
      if (result.responseLength < 500) {
        validations.push('Response seems too short (may lack MCP content)');
      }

      if (validations.length > 0) {
        result.status = 'WARNING';
        result.validations = validations;
        warnings++;
      } else {
        passed++;
      }

      results.push(result);

      // Print result
      const statusIcon = response.status === 200 ? '✅' : response.status < 300 ? '⚠️' : '❌';
      console.log(`${statusIcon} Status: ${response.status} (${duration}ms)`);
      console.log(`   Expected MCP: ${result.expectedMCP}`);
      console.log(`   CV Detected: ${result.cvDetected ? '✅' : '❌'} (${result.cvModel})`);
      console.log(`   RAG Detected: ${result.ragDetected ? '✅' : '❌'}`);
      console.log(`   CSDL Detected: ${result.csdlDetected ? '✅' : '❌'}`);
      console.log(`   Triage Level: ${result.triageLevel || 'N/A'}`);
      console.log(`   Suspected Conditions: ${result.hasSuspectedConditions ? 'Yes' : 'No'}`);
      console.log(`   Response Length: ${result.responseLength} chars`);
      if (result.sessionId) {
        console.log(`   Session ID: ${result.sessionId.substring(0, 8)}...`);
      }
      if (validations.length > 0) {
        console.log(`   ⚠️  Warnings: ${validations.join(', ')}`);
      }

    } catch (error) {
      failed++;
      const result = {
        id: useCase.id,
        name: useCase.name,
        status: 'FAIL',
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 'N/A'
      };
      results.push(result);
      
      console.log(`❌ FAIL: ${result.error}`);
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
      }
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(80));
  console.log(`Total Use Cases: ${useCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / useCases.length) * 100).toFixed(1)}%`);
  
  console.log('\n--- Detailed Results ---');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} UC${r.id}: ${r.name}`);
    if (r.status === 'PASS' || r.status === 'WARNING') {
      console.log(`   Expected: ${r.expectedMCP} | RAG: ${r.ragDetected ? '✅' : '❌'} | CSDL: ${r.csdlDetected ? '✅' : '❌'}`);
      console.log(`   Triage: ${r.triageLevel} | Duration: ${r.duration} | Length: ${r.responseLength} chars`);
      if (r.validations) {
        console.log(`   Issues: ${r.validations.join(', ')}`);
      }
    } else {
      console.log(`   Error: ${r.error}`);
    }
  });

  console.log('\n--- Performance Metrics ---');
  const durations = results
    .filter(r => r.duration)
    .map(r => parseInt(r.duration.replace('ms', '')));
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    console.log(`   Average Response Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Min: ${minDuration}ms | Max: ${maxDuration}ms`);
  }

  console.log('\n--- MCP Usage Statistics ---');
  let ragCount = 0;
  let csdlCount = 0;
  let bothCount = 0;
  let noneCount = 0;
  
  results.forEach(r => {
    if (r.ragDetected && r.csdlDetected) {
      bothCount++;
    } else if (r.ragDetected) {
      ragCount++;
    } else if (r.csdlDetected) {
      csdlCount++;
    } else {
      noneCount++;
    }
  });
  
  console.log(`   RAG Only: ${ragCount}`);
  console.log(`   CSDL Only: ${csdlCount}`);
  console.log(`   Both RAG + CSDL: ${bothCount}`);
  console.log(`   Neither: ${noneCount}`);

  console.log('\n--- Expected vs Actual MCP Usage ---');
  const mcpStats = {};
  results.forEach(r => {
    if (r.status === 'PASS' || r.status === 'WARNING') {
      const key = r.expectedMCP;
      if (!mcpStats[key]) {
        mcpStats[key] = { total: 0, ragDetected: 0, csdlDetected: 0, both: 0, none: 0 };
      }
      mcpStats[key].total++;
      if (r.ragDetected && r.csdlDetected) {
        mcpStats[key].both++;
      } else if (r.ragDetected) {
        mcpStats[key].ragDetected++;
      } else if (r.csdlDetected) {
        mcpStats[key].csdlDetected++;
      } else {
        mcpStats[key].none++;
      }
    }
  });
  
  Object.entries(mcpStats).forEach(([mcp, stats]) => {
    console.log(`   ${mcp}:`);
    console.log(`      Total: ${stats.total} | RAG: ${stats.ragDetected} | CSDL: ${stats.csdlDetected} | Both: ${stats.both} | None: ${stats.none}`);
  });

  console.log('\n--- Triage Level Distribution ---');
  const triageCounts = {};
  results.forEach(r => {
    if (r.triageLevel) {
      triageCounts[r.triageLevel] = (triageCounts[r.triageLevel] || 0) + 1;
    }
  });
  Object.entries(triageCounts).forEach(([level, count]) => {
    console.log(`   ${level}: ${count}`);
  });

  console.log('\n' + '='.repeat(80));
  
  if (failed === 0 && warnings === 0) {
    console.log('🎉 All tests passed perfectly!');
    process.exit(0);
  } else if (failed === 0) {
    console.log('✅ All tests passed with some warnings');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(HEALTH_CHECK_URL, { timeout: 10000 });
    return true;
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`🏥 Health check: ${HEALTH_CHECK_URL}\n`);
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error(`❌ Server is not responding at ${HEALTH_CHECK_URL}`);
    console.error('Please check if the HuggingFace Space is running or set API_URL environment variable');
    console.error('Example: API_URL=https://your-space.hf.space/api/health-check npx tsx test_api_usecases.js');
    process.exit(1);
  }
  
  console.log('✅ Server is responding!\n');
  await runTests();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

