import axios from 'axios';

// Support both local and HuggingFace Space
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/health-check';
const HEALTH_CHECK_URL = process.env.HEALTH_URL || BASE_URL.replace('/api/health-check', '/health');

// Test cases for Hospital MCP Tool
const testCases = [
  {
    id: 1,
    name: 'Emergency case với location - Should trigger hospital tool',
    description: 'Test khi triage_level là emergency và có location',
    payload: {
      text: 'Tôi bị đau ngực dữ dội, khó thở, đổ mồ hôi lạnh',
      user_id: 'test_hospital_1',
      location: {
        lat: 10.762622, // Ho Chi Minh City
        lng: 106.660172
      }
    },
    expected: {
      hasHospital: true,
      triageLevel: 'emergency'
    }
  },
  {
    id: 2,
    name: 'Urgent case với location - Should trigger hospital tool',
    description: 'Test khi triage_level là urgent và có location',
    payload: {
      text: 'Tôi bị sốt cao 39 độ, đau đầu dữ dội, buồn nôn',
      user_id: 'test_hospital_2',
      location: {
        lat: 10.762622,
        lng: 106.660172
      }
    },
    expected: {
      hasHospital: true,
      triageLevel: 'urgent'
    }
  },
  {
    id: 3,
    name: 'User yêu cầu tìm bệnh viện - Should trigger hospital tool',
    description: 'Test khi user yêu cầu tìm bệnh viện',
    payload: {
      text: 'Tôi cần tìm bệnh viện gần nhất để khám',
      user_id: 'test_hospital_3',
      location: {
        lat: 10.762622,
        lng: 106.660172
      }
    },
    expected: {
      hasHospital: true
    }
  },
  {
    id: 4,
    name: 'Routine case với location - Should NOT trigger hospital tool',
    description: 'Test khi triage_level là routine, không nên gọi hospital tool',
    payload: {
      text: 'Da tay hơi ngứa nhẹ',
      user_id: 'test_hospital_4',
      location: {
        lat: 10.762622,
        lng: 106.660172
      }
    },
    expected: {
      hasHospital: false,
      triageLevel: 'routine'
    }
  },
  {
    id: 5,
    name: 'Emergency case KHÔNG có location - Should NOT trigger hospital tool',
    description: 'Test khi emergency nhưng không có location',
    payload: {
      text: 'Tôi bị đau ngực dữ dội, khó thở',
      user_id: 'test_hospital_5'
    },
    expected: {
      hasHospital: false,
      triageLevel: 'emergency'
    }
  }
];

async function checkServer() {
  try {
    const response = await axios.get(HEALTH_CHECK_URL, { timeout: 10000 });
    return response.status === 200;
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🏥 Testing Hospital MCP Tool...\n');
  console.log(`🌐 Testing endpoint: ${BASE_URL}`);
  console.log(`🏥 Health check: ${HEALTH_CHECK_URL}\n`);
  console.log('='.repeat(80));

  const results = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const testCase of testCases) {
    console.log(`\n--- Test Case ${testCase.id}: ${testCase.name} ---`);
    console.log(`   Description: ${testCase.description}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.post(BASE_URL, testCase.payload, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500
      });
      const duration = Date.now() - startTime;

      const hasHospital = !!response.data.nearest_clinic;
      const triageLevel = response.data.triage_level;
      const hospitalInfo = response.data.nearest_clinic;

      // Validate results
      const validations = [];
      let testPassed = true;

      // Check triage level if expected
      if (testCase.expected.triageLevel) {
        if (triageLevel !== testCase.expected.triageLevel) {
          validations.push(`Expected triage_level: ${testCase.expected.triageLevel}, got: ${triageLevel}`);
          testPassed = false;
        }
      }

      // Check hospital presence
      if (testCase.expected.hasHospital) {
        if (!hasHospital) {
          validations.push('Expected hospital info but not found');
          testPassed = false;
        } else {
          // Validate hospital info structure
          if (!hospitalInfo.name) validations.push('Hospital name missing');
          if (typeof hospitalInfo.distance_km !== 'number') validations.push('Hospital distance_km missing or invalid');
          if (!hospitalInfo.address) validations.push('Hospital address missing');
        }
      } else {
        if (hasHospital) {
          validations.push('Hospital info found but not expected');
          // This is a warning, not a failure
        }
      }

      const result = {
        id: testCase.id,
        name: testCase.name,
        status: testPassed && validations.length === 0 ? 'PASS' : validations.some(v => v.includes('Expected')) ? 'FAIL' : 'WARNING',
        statusCode: response.status,
        duration: `${duration}ms`,
        triageLevel,
        hasHospital,
        hospitalInfo: hasHospital ? {
          name: hospitalInfo.name,
          distance: `${hospitalInfo.distance_km}km`,
          address: hospitalInfo.address?.substring(0, 50) + '...'
        } : null,
        validations: validations.length > 0 ? validations : undefined
      };

      results.push(result);

      // Print result
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${statusIcon} Status: ${response.status} (${duration}ms)`);
      console.log(`   Triage Level: ${triageLevel}`);
      console.log(`   Hospital Found: ${hasHospital ? '✅' : '❌'}`);
      if (hasHospital && hospitalInfo) {
        console.log(`   Hospital Name: ${hospitalInfo.name}`);
        console.log(`   Distance: ${hospitalInfo.distance_km}km`);
        console.log(`   Address: ${hospitalInfo.address?.substring(0, 60)}...`);
      }
      if (validations.length > 0) {
        console.log(`   ⚠️  Issues: ${validations.join(', ')}`);
      }

      if (result.status === 'PASS') {
        passed++;
      } else if (result.status === 'WARNING') {
        warnings++;
      } else {
        failed++;
      }

    } catch (error) {
      failed++;
      const result = {
        id: testCase.id,
        name: testCase.name,
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
  console.log(`Total Test Cases: ${testCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  console.log('\n--- Detailed Results ---');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} TC${r.id}: ${r.name}`);
    if (r.status === 'PASS' || r.status === 'WARNING') {
      console.log(`   Triage: ${r.triageLevel} | Hospital: ${r.hasHospital ? '✅' : '❌'} | Duration: ${r.duration}`);
      if (r.hospitalInfo) {
        console.log(`   Hospital: ${r.hospitalInfo.name} (${r.hospitalInfo.distance})`);
      }
      if (r.validations) {
        console.log(`   Issues: ${r.validations.join(', ')}`);
      }
    } else {
      console.log(`   Error: ${r.error}`);
    }
  });

  console.log('\n--- Hospital Tool Statistics ---');
  const hospitalFoundCount = results.filter(r => r.hasHospital).length;
  const emergencyWithHospital = results.filter(r => r.triageLevel === 'emergency' && r.hasHospital).length;
  const urgentWithHospital = results.filter(r => r.triageLevel === 'urgent' && r.hasHospital).length;
  
  console.log(`   Total with Hospital Info: ${hospitalFoundCount}/${testCases.length}`);
  console.log(`   Emergency cases with hospital: ${emergencyWithHospital}`);
  console.log(`   Urgent cases with hospital: ${urgentWithHospital}`);

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

async function main() {
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`🏥 Health check: ${HEALTH_CHECK_URL}\n`);

  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error(`❌ Server is not responding at ${HEALTH_CHECK_URL}`);
    console.error('Please check if the server is running or set API_URL environment variable');
    console.error('Example: API_URL=http://localhost:3000/api/health-check npx tsx test_hospital_tool.js');
    process.exit(1);
  }

  console.log('✅ Server is responding!\n');
  await runTests();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

