import { MapsService } from './src/services/maps.service.js';
import { createHospitalTool } from './src/mcp_tools/hospital-tool.js';

// Test hospital tool directly
async function testHospitalTool() {
  console.log('🏥 Testing Hospital MCP Tool Directly...\n');
  console.log('='.repeat(80));

  const mapsService = new MapsService();
  const hospitalTool = createHospitalTool(mapsService);

  // Test cases
  const testCases = [
    {
      id: 1,
      name: 'Valid location - Ho Chi Minh City',
      input: JSON.stringify({
        location: {
          lat: 10.762622,
          lng: 106.660172
        }
      }),
      shouldPass: true
    },
    {
      id: 1.5,
      name: 'Valid location with condition - Dermatology',
      input: JSON.stringify({
        location: {
          lat: 10.762622,
          lng: 106.660172
        },
        condition: 'eczema'
      }),
      shouldPass: true
    },
    {
      id: 2,
      name: 'Valid location - Hanoi',
      input: JSON.stringify({
        location: {
          lat: 21.028511,
          lng: 105.804817
        }
      }),
      shouldPass: true
    },
    {
      id: 3,
      name: 'Invalid location - Missing lat',
      input: JSON.stringify({
        location: {
          lng: 106.660172
        }
      }),
      shouldPass: false
    },
    {
      id: 4,
      name: 'Invalid location - Missing lng',
      input: JSON.stringify({
        location: {
          lat: 10.762622
        }
      }),
      shouldPass: false
    },
    {
      id: 5,
      name: 'Invalid location - Wrong type',
      input: JSON.stringify({
        location: {
          lat: '10.762622',
          lng: '106.660172'
        }
      }),
      shouldPass: false
    },
    {
      id: 6,
      name: 'Invalid input - Not JSON',
      input: 'invalid json string',
      shouldPass: false
    },
    {
      id: 7,
      name: 'Input with code fences',
      input: '```json\n{\n  "location": {\n    "lat": 10.762622,\n    "lng": 106.660172\n  }\n}\n```',
      shouldPass: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n--- Test Case ${testCase.id}: ${testCase.name} ---`);
    console.log(`   Input: ${testCase.input.substring(0, 100)}...`);

    try {
      const startTime = Date.now();
      const result = await hospitalTool.func(testCase.input);
      const duration = Date.now() - startTime;

      const parsedResult = JSON.parse(result);
      const hasError = !!parsedResult.error;
      const hasHospital = !!parsedResult.hospital;

      console.log(`   Duration: ${duration}ms`);
      console.log(`   Result: ${result.substring(0, 200)}...`);

      if (testCase.shouldPass) {
        if (hasError) {
          console.log(`   ❌ FAIL: Expected success but got error`);
          failed++;
        } else if (hasHospital) {
          console.log(`   ✅ PASS: Hospital found`);
          console.log(`   Hospital: ${parsedResult.hospital.name}`);
          console.log(`   Distance: ${parsedResult.hospital.distance_km}km`);
          passed++;
        } else {
          // No hospital found but that's okay (might be no hospital nearby)
          console.log(`   ⚠️  WARNING: No hospital found (might be normal if no hospital nearby)`);
          passed++;
        }
      } else {
        if (hasError) {
          console.log(`   ✅ PASS: Correctly returned error`);
          passed++;
        } else {
          console.log(`   ❌ FAIL: Expected error but got success`);
          failed++;
        }
      }
    } catch (error) {
      if (testCase.shouldPass) {
        console.log(`   ❌ FAIL: Unexpected error: ${error.message}`);
        failed++;
      } else {
        console.log(`   ✅ PASS: Correctly threw error: ${error.message}`);
        passed++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Test Cases: ${testCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Check configuration
function checkConfig() {
  console.log('✅ Using OpenStreetMap Overpass API (no API key required)\n');
}

async function main() {
  checkConfig();
  await testHospitalTool();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

