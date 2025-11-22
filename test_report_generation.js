/**
 * Test script for Report Generation API
 * Usage: node test_report_generation.js <session_id> [api_url]
 * 
 * Examples:
 *   node test_report_generation.js <session_id>
 *   node test_report_generation.js <session_id> http://localhost:8000
 *   node test_report_generation.js <session_id> https://medagen-backend.hf.space
 */

// Support both local and HuggingFace Space
const BASE_URL = process.argv[3] || process.env.API_URL || 'https://medagen-backend.hf.space';

async function testReportGeneration(sessionId) {
  console.log('='.repeat(80));
  console.log('Testing Report Generation API');
  console.log('='.repeat(80));
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Session ID: ${sessionId}\n`);

  try {
    // Test 1: Generate full report
    console.log('📋 Test 1: Generate Full Report');
    console.log(`GET ${BASE_URL}/api/reports/${sessionId}?type=full\n`);
    
    const fullReportResponse = await fetch(`${BASE_URL}/api/reports/${sessionId}?type=full`);
    const fullReport = await fullReportResponse.json();
    
    if (fullReportResponse.ok) {
      console.log('✅ Full report generated successfully');
      console.log(`   Report type: ${fullReport.report_type}`);
      console.log(`   Generated at: ${fullReport.generated_at}`);
      console.log(`   Session info: ${fullReport.report?.report_content?.session_info?.message_count || 0} messages`);
      console.log(`   Tool executions: ${fullReport.report?.report_content?.tool_executions?.length || 0} tools`);
      console.log(`   Summary - Top conditions: ${fullReport.report?.report_content?.summary?.top_conditions_suggested?.length || 0}`);
      console.log(`   Summary - Guidelines retrieved: ${fullReport.report?.report_content?.summary?.key_guidelines_retrieved || 0}`);
      console.log(`   Markdown length: ${fullReport.report?.report_markdown?.length || 0} characters\n`);
    } else {
      console.log('❌ Failed to generate full report');
      console.log(`   Error: ${JSON.stringify(fullReport, null, 2)}\n`);
    }

    // Test 2: Get markdown only
    console.log('📄 Test 2: Get Markdown Report');
    console.log(`GET ${BASE_URL}/api/reports/${sessionId}/markdown\n`);
    
    const markdownResponse = await fetch(`${BASE_URL}/api/reports/${sessionId}/markdown`);
    const markdownData = await markdownResponse.json();
    
    if (markdownResponse.ok) {
      console.log('✅ Markdown report retrieved');
      console.log(`   Length: ${markdownData.markdown?.length || 0} characters`);
      console.log(`   Preview (first 200 chars):\n   ${markdownData.markdown?.substring(0, 200)}...\n`);
    } else {
      console.log('❌ Failed to get markdown');
      console.log(`   Error: ${JSON.stringify(markdownData, null, 2)}\n`);
    }

    // Test 3: Get JSON only
    console.log('📊 Test 3: Get JSON Report');
    console.log(`GET ${BASE_URL}/api/reports/${sessionId}/json\n`);
    
    const jsonResponse = await fetch(`${BASE_URL}/api/reports/${sessionId}/json`);
    const jsonData = await jsonResponse.json();
    
    if (jsonResponse.ok) {
      console.log('✅ JSON report retrieved');
      console.log(`   Conversation timeline: ${jsonData.conversation_timeline?.length || 0} messages`);
      console.log(`   Tool executions: ${jsonData.tool_executions?.length || 0} tools`);
      console.log(`   Summary - Main concerns: ${jsonData.summary?.main_concerns?.length || 0}`);
      console.log(`   Summary - Top conditions: ${jsonData.summary?.top_conditions_suggested?.length || 0}`);
      console.log(`   Summary - Triage levels: ${jsonData.summary?.triage_levels_identified?.length || 0}`);
      console.log(`   Summary - Hospitals: ${jsonData.summary?.hospitals_suggested?.length || 0}\n`);
      
      // Show tool executions detail
      if (jsonData.tool_executions && jsonData.tool_executions.length > 0) {
        console.log('   Tool Executions Detail:');
        jsonData.tool_executions.forEach((exec, idx) => {
          console.log(`   ${idx + 1}. ${exec.tool_display_name} (${exec.tool_name})`);
          console.log(`      Order: ${exec.execution_order}, Time: ${exec.execution_time_ms}ms, Status: ${exec.status}`);
          if (exec.output_data) {
            const outputKeys = Object.keys(exec.output_data);
            console.log(`      Output keys: ${outputKeys.join(', ')}`);
          }
        });
        console.log('');
      }
    } else {
      console.log('❌ Failed to get JSON');
      console.log(`   Error: ${JSON.stringify(jsonData, null, 2)}\n`);
    }

    console.log('='.repeat(80));
    console.log('✅ All tests completed!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Get session ID from command line argument
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node test_report_generation.js <session_id> [api_url]');
  console.error('');
  console.error('Examples:');
  console.error('  node test_report_generation.js 15b1072b-aee3-4f1d-9a66-40dc4ef1d57a');
  console.error('  node test_report_generation.js 15b1072b-aee3-4f1d-9a66-40dc4ef1d57a http://localhost:8000');
  console.error('  node test_report_generation.js 15b1072b-aee3-4f1d-9a66-40dc4ef1d57a https://medagen-backend.hf.space');
  process.exit(1);
}

testReportGeneration(sessionId);

