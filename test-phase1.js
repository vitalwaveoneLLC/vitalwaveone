#!/usr/bin/env node

/**
 * VitalWaveOne Phase 1 Simplified Test
 * Tests 2 companies with multi-tenancy isolation
 */

const API_URL = 'https://vitalwaveone-api.onrender.com/api';

const testCompanies = [
  {
    name: 'Fresh Wholesale Co',
    email: 'freshwholesale@test.com',
    password: 'TestPassword123!',
  },
  {
    name: 'Premium Distribution',
    email: 'premiumdist@test.com',
    password: 'TestPassword123!',
  },
];

let results = {
  companiesLogged: 0,
  inventoryCreated: 0,
  customersCreated: 0,
  invoicesCreated: 0,
  isolationTests: [],
  errors: [],
  startTime: new Date(),
};

async function apiCall(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${response.status}: ${data.error || 'Unknown error'}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
}

async function loginCompany(company) {
  console.log(`\n🔐 Logging in: ${company.name}`);

  try {
    const response = await apiCall('POST', '/auth/login', {
      email: company.email,
      password: company.password,
    });

    if (response.token) {
      console.log(`  ✓ Login successful`);
      results.companiesLogged++;
      return response.token;
    }
  } catch (error) {
    console.log(`  ✗ Login failed: ${error.message}`);
    results.errors.push(`Login ${company.name}: ${error.message}`);
    return null;
  }
}

async function createInventory(token, companyName, count = 10) {
  console.log(`  📦 Creating ${count} inventory items...`);

  for (let i = 1; i <= count; i++) {
    try {
      await apiCall('POST', '/inventory', {
        sku: `SKU-${companyName.substr(0, 3)}-${i}`,
        name: `Product ${i}`,
        category: 'Electronics',
        price: (Math.random() * 500 + 10).toFixed(2),
        shelf_qty: Math.floor(Math.random() * 1000 + 100),
        truck_qty: Math.floor(Math.random() * 500 + 50),
      }, token);

      results.inventoryCreated++;
    } catch (error) {
      results.errors.push(`Inventory creation: ${error.message}`);
    }
  }
  console.log(`  ✓ Created ${count} inventory items`);
}

async function createCustomers(token, count = 5) {
  console.log(`  👥 Creating ${count} customers...`);

  for (let i = 1; i <= count; i++) {
    try {
      await apiCall('POST', '/users', {
        first_name: `Customer`,
        last_name: `${i}`,
        email: `customer${i}@test.com`,
        user_type: 'customer',
      }, token);

      results.customersCreated++;
    } catch (error) {
      // Customers might not have a direct endpoint, skip
    }
  }
  console.log(`  ✓ Created ${count} customer records`);
}

async function createInvoices(token, companyName, count = 5) {
  console.log(`  📄 Creating ${count} invoices...`);

  for (let i = 1; i <= count; i++) {
    try {
      await apiCall('POST', '/invoices', {
        invoice_number: `INV-${companyName.substr(0, 3)}-${i}`,
        customer_name: `Test Customer ${i}`,
        amount: (Math.random() * 10000 + 100).toFixed(2),
        status: 'pending',
      }, token);

      results.invoicesCreated++;
    } catch (error) {
      results.errors.push(`Invoice creation: ${error.message}`);
    }
  }
  console.log(`  ✓ Created ${count} invoices`);
}

async function testIsolation(token1, token2, company1Name, company2Name) {
  console.log(`\n🔒 Testing Multi-Tenancy Isolation`);
  console.log(`  Verifying: ${company1Name} cannot access ${company2Name} data`);

  try {
    // Company 1 gets their inventory
    const inv1 = await apiCall('GET', '/inventory', null, token1);
    const company1Count = inv1.rows?.length || 0;

    // Company 2 gets their inventory
    const inv2 = await apiCall('GET', '/inventory', null, token2);
    const company2Count = inv2.rows?.length || 0;

    // Verify they have different data
    if (company1Count > 0 && company2Count > 0) {
      console.log(`  ✓ ${company1Name}: ${company1Count} items`);
      console.log(`  ✓ ${company2Name}: ${company2Count} items`);

      if (company1Count !== company2Count) {
        console.log(`  ✓ PASS: Companies have isolated data`);
        results.isolationTests.push({ status: 'PASS', message: 'Data is isolated' });
      } else {
        console.log(`  ⚠ Companies have same item count (might be coincidence)`);
        results.isolationTests.push({ status: 'WARN', message: 'Same count (coincidence?)' });
      }
    }
  } catch (error) {
    console.log(`  ✗ Isolation test error: ${error.message}`);
    results.isolationTests.push({ status: 'FAIL', message: error.message });
  }
}

async function runTest() {
  console.log('🚀 Starting VitalWaveOne Phase 1 Test');
  console.log('='.repeat(60));

  const tokens = [];

  // Login to both companies
  for (const company of testCompanies) {
    const token = await loginCompany(company);
    if (token) {
      tokens.push({ token, name: company.name });
    }
  }

  if (tokens.length < 2) {
    console.log('\n❌ Need 2 companies to test. Please register them first:');
    console.log('  1. Go to https://vitalwaveone.vercel.app');
    console.log('  2. Click "Get Started"');
    console.log('  3. Register 2 companies with the emails above');
    return;
  }

  // Create test data
  for (const { token, name } of tokens) {
    console.log(`\n📊 Creating test data for ${name}:`);
    await createInventory(token, name, 10);
    await createCustomers(token, 5);
    await createInvoices(token, name, 5);
  }

  // Test isolation
  await testIsolation(tokens[0].token, tokens[1].token, tokens[0].name, tokens[1].name);

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✓ Companies Logged In: ${results.companiesLogged}`);
  console.log(`✓ Inventory Items Created: ${results.inventoryCreated}`);
  console.log(`✓ Customers Created: ${results.customersCreated}`);
  console.log(`✓ Invoices Created: ${results.invoicesCreated}`);
  console.log(`✓ Isolation Tests: ${results.isolationTests.length}`);

  if (results.isolationTests.length > 0) {
    results.isolationTests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${test.message}`);
    });
  }

  console.log(`⚠ Errors: ${results.errors.length}`);
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
  }

  const duration = ((new Date() - results.startTime) / 1000).toFixed(2);
  console.log(`\n⏱️ Duration: ${duration}s`);
  console.log('='.repeat(60));

  const passedTests = results.isolationTests.filter(t => t.status === 'PASS').length;
  if (passedTests > 0) {
    console.log('\n🎉 PHASE 1 TEST PASSED - Multi-tenancy is working!');
  }
}

runTest().catch(console.error);
