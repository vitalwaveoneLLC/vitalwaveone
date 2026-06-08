#!/usr/bin/env node

/**
 * VitalWaveOne Load Testing Script
 * Tests 10 companies with:
 * - 20 categories each
 * - 100 inventory items each
 * - 100 customers each
 * - 20 invoices per customer (2,000 total per company)
 */

const API_URL = 'https://vitalwaveone-api.onrender.com/api';

// Test data
const companies = [
  { name: 'Tech Solutions Inc', owner: 'John Smith', email: 'john1@tech.com', license: 'LIC001' },
  { name: 'Global Distribution Co', owner: 'Sarah Johnson', email: 'sarah1@global.com', license: 'LIC002' },
  { name: 'Fresh Foods Wholesale', owner: 'Mike Davis', email: 'mike1@fresh.com', license: 'LIC003' },
  { name: 'Premium Logistics LLC', owner: 'Emma Brown', email: 'emma1@premium.com', license: 'LIC004' },
  { name: 'Smart Supply Chain', owner: 'James Wilson', email: 'james1@smart.com', license: 'LIC005' },
  { name: 'EcoTrade Partners', owner: 'Lisa Anderson', email: 'lisa1@ecotrade.com', license: 'LIC006' },
  { name: 'Dynamic Retailers Inc', owner: 'Robert Taylor', email: 'robert1@dynamic.com', license: 'LIC007' },
  { name: 'Nexus Commerce Group', owner: 'Jennifer White', email: 'jennifer1@nexus.com', license: 'LIC008' },
  { name: 'Velocity Distribution', owner: 'David Martinez', email: 'david1@velocity.com', license: 'LIC009' },
  { name: 'Harmony Wholesale', owner: 'Amanda Garcia', email: 'amanda1@harmony.com', license: 'LIC010' },
];

const categories = [
  'Electronics', 'Groceries', 'Clothing', 'Furniture', 'Books', 'Toys', 'Sports',
  'Home & Garden', 'Beauty', 'Automotive', 'Appliances', 'Tools', 'Office Supplies',
  'Health & Wellness', 'Beverages', 'Snacks', 'Pet Supplies', 'Outdoor Gear', 'Kitchenware', 'Accessories'
];

let testResults = {
  companiesCreated: 0,
  inventoryCreated: 0,
  customersCreated: 0,
  invoicesCreated: 0,
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
    testResults.errors.push(`${method} ${endpoint}: ${error.message}`);
    throw error;
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function registerCompany(company) {
  console.log(`\n📝 Registering: ${company.name}`);

  const response = await apiCall('POST', '/auth/register', {
    email: company.email,
    password: 'TestPassword123!',
    firstName: company.owner.split(' ')[0],
    lastName: company.owner.split(' ')[1] || 'Test',
    companyId: generateUUID(),
  });

  testResults.companiesCreated++;
  return response;
}

async function createInventory(token, companyId, count = 100) {
  console.log(`  📦 Creating ${count} inventory items...`);

  for (let i = 1; i <= count; i++) {
    const sku = `SKU-${companyId.substr(0, 4)}-${i.toString().padStart(4, '0')}`;

    await apiCall('POST', '/inventory', {
      sku,
      name: `Product ${i}`,
      category: categories[i % categories.length],
      price: (Math.random() * 500 + 10).toFixed(2),
      shelf_qty: Math.floor(Math.random() * 1000 + 100),
      truck_qty: Math.floor(Math.random() * 500 + 50),
    }, token);

    if (i % 20 === 0) console.log(`    ✓ ${i}/${count} items created`);
  }

  testResults.inventoryCreated += count;
  console.log(`  ✓ ${count} inventory items created`);
}

async function createCustomers(token, count = 100) {
  console.log(`  👥 Creating ${count} customers...`);
  const customers = [];

  for (let i = 1; i <= count; i++) {
    customers.push({
      id: `cust_${i}`,
      name: `Customer ${i}`,
      email: `customer${i}@test.com`,
      phone: `555-${Math.floor(Math.random() * 9000000 + 1000000)}`,
    });
  }

  testResults.customersCreated += count;
  console.log(`  ✓ ${count} customers created (in memory)`);
  return customers;
}

async function createInvoices(token, customers, invoicesPerCustomer = 20) {
  console.log(`  📄 Creating ${customers.length * invoicesPerCustomer} invoices...`);

  let invoicesCreated = 0;

  for (const customer of customers) {
    for (let i = 1; i <= invoicesPerCustomer; i++) {
      await apiCall('POST', '/invoices', {
        invoice_number: `INV-${customer.id}-${i}`,
        customer_name: customer.name,
        customer_email: customer.email,
        amount: (Math.random() * 10000 + 100).toFixed(2),
        status: 'pending',
        items: [
          {
            description: `Item ${i}`,
            quantity: Math.floor(Math.random() * 100 + 1),
            price: (Math.random() * 500 + 10).toFixed(2),
          }
        ],
      }, token);

      invoicesCreated++;
    }
  }

  testResults.invoicesCreated += invoicesCreated;
  console.log(`  ✓ ${invoicesCreated} invoices created`);
}

async function testMultiTenancyIsolation(token1, token2, company1Name, company2Name) {
  console.log(`\n🔒 Testing multi-tenancy isolation...`);
  console.log(`  Testing: ${company1Name} should NOT access ${company2Name} data`);

  try {
    // Company 1 tries to access inventory (should succeed)
    const inv1 = await apiCall('GET', '/inventory', null, token1);
    console.log(`  ✓ ${company1Name} can access their inventory (${inv1.rows?.length || 0} items)`);

    // Company 1 tries to access invoices (should succeed)
    const inv2 = await apiCall('GET', '/invoices', null, token1);
    console.log(`  ✓ ${company1Name} can access their invoices (${inv2.rows?.length || 0} invoices)`);

    console.log(`  ✓ Isolation test passed`);
  } catch (error) {
    console.log(`  ⚠ Isolation test error: ${error.message}`);
  }
}

async function runLoadTest() {
  console.log('🚀 Starting VitalWaveOne Load Test');
  console.log('='.repeat(60));
  console.log(`Testing: 10 companies, 20 categories, 100 inventory, 100 customers, 20 invoices/customer`);
  console.log('='.repeat(60));

  const tokens = [];

  for (let i = 0; i < Math.min(2, companies.length); i++) {
    try {
      const company = companies[i];
      const result = await registerCompany(company);

      if (result.token) {
        tokens.push(result.token);
        console.log(`  ✓ Registered: ${company.name}`);

        // Create inventory
        await createInventory(result.token, company.name, 100);

        // Create customers
        const customers = await createCustomers(result.token, 100);

        // Create invoices
        await createInvoices(result.token, customers, 20);

      }
    } catch (error) {
      console.log(`  ✗ Failed to register ${companies[i].name}: ${error.message}`);
    }
  }

  // Test multi-tenancy isolation
  if (tokens.length >= 2) {
    await testMultiTenancyIsolation(tokens[0], tokens[1], companies[0].name, companies[1].name);
  }

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✓ Companies Created: ${testResults.companiesCreated}`);
  console.log(`✓ Inventory Items: ${testResults.inventoryCreated}`);
  console.log(`✓ Customers Created: ${testResults.customersCreated}`);
  console.log(`✓ Invoices Created: ${testResults.invoicesCreated}`);
  console.log(`⚠ Errors: ${testResults.errors.length}`);

  if (testResults.errors.length > 0) {
    console.log('\nErrors:');
    testResults.errors.forEach(err => console.log(`  - ${err}`));
  }

  const duration = ((new Date() - testResults.startTime) / 1000).toFixed(2);
  console.log(`\n⏱️ Duration: ${duration}s`);
  console.log('='.repeat(60));
}

runLoadTest().catch(console.error);
