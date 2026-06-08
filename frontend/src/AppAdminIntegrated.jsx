// VitalWave Admin Portal - Multi-Tenant SaaS with Company Isolation
import React, { useState, useEffect } from 'react';
import { get, post, put } from './utils/api';
import * as authManager from './utils/auth-manager';
import DataTable from './components/DataTable';
import OrderingPlatformTab from './components/AdminTabs/OrderingPlatformTab';
import toast from 'react-hot-toast';

const AppAdminIntegrated = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // State for all resources
  const [inventory, setInventory] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [financialMetrics, setFinancialMetrics] = useState({});

  // Form states
  const [showNewInventory, setShowNewInventory] = useState(false);
  const [newInventory, setNewInventory] = useState({ sku: '', product_name: '', category: '', unit_price: 0 });

  const [companyId, setCompanyId] = useState(null);

  // Load user on mount - using auth-manager for multi-tenant context
  useEffect(() => {
    // Check if user is authenticated
    if (!authManager.isAuthenticated()) {
      // Not authenticated - redirect to login
      window.location.href = '/login';
      return;
    }

    // Get user context from auth-manager
    const userContext = authManager.getUserContext();
    const companyContext = authManager.getCompanyContext();

    if (userContext && companyContext) {
      setUser(userContext);
      setCompanyId(companyContext.companyId);
    } else {
      // Missing context - redirect to login
      window.location.href = '/login';
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (user) {
      loadTabData();
    }
  }, [activeTab, user]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'inventory':
          const invRes = await get('/inventory');
          setInventory(invRes.data || []);
          break;
        case 'trucks':
          const truckRes = await get('/trucks');
          setTrucks(truckRes.data || []);
          break;
        case 'invoices':
          const invRes2 = await get('/invoices');
          setInvoices(invRes2.data || []);
          break;
        case 'customers':
          const custRes = await get('/customers');
          setCustomers(custRes.data || []);
          break;
        case 'suppliers':
          const supplRes = await get('/suppliers');
          setSuppliers(supplRes.data || []);
          break;
        case 'expenses':
          const expRes = await get('/expenses');
          setExpenses(expRes.data || []);
          break;
        case 'financial':
          const finRes = await get('/financial/kpis');
          setFinancialMetrics(finRes.data || {});
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async () => {
    if (!newInventory.sku || !newInventory.product_name) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await post('/inventory', newInventory);
      setInventory([...inventory, response.data]);
      setNewInventory({ sku: '', product_name: '', category: '', unit_price: 0 });
      setShowNewInventory(false);
      toast.success('Product added successfully');
    } catch (error) {
      toast.error('Failed to add product');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCustomer = async (customerId) => {
    setLoading(true);
    try {
      await post(`/customers/${customerId}/approve`, {});
      setCustomers(
        customers.map((c) =>
          c.id === customerId ? { ...c, status: 'active' } : c
        )
      );
      toast.success('Customer approved');
    } catch (error) {
      toast.error('Failed to approve customer');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExpense = async (expenseId) => {
    setLoading(true);
    try {
      await post(`/expenses/${expenseId}/approve`, {});
      setExpenses(
        expenses.map((e) =>
          e.id === expenseId ? { ...e, status: 'approved' } : e
        )
      );
      toast.success('Expense approved');
    } catch (error) {
      toast.error('Failed to approve expense');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout with auth-manager
  const handleLogout = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      await authManager.logout(apiUrl);
      toast.success('Logged out successfully');
      // Notify parent to navigate away
      onLogout?.();
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if API call fails
      authManager.clearAuth();
      onLogout?.();
    }
  };

  const tabs = [
    { id: 'ordering-platform', label: '🔗 Ordering Platform' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'trucks', label: '🚚 Trucks' },
    { id: 'invoices', label: '📄 Invoices' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'financial', label: '📊 Financial' },
    { id: 'suppliers', label: '🏢 Suppliers' },
    { id: 'expenses', label: '💰 Expenses' },
    { id: 'security', label: '🔒 Security' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">VitalWave</h1>
            <p className="text-gray-600 text-sm">
              {user?.companyName && `${user.companyName} - `}Admin Portal
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 font-medium text-sm border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Ordering Platform Tab */}
        {activeTab === 'ordering-platform' && (
          <OrderingPlatformTab companyId={companyId} />
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Inventory Management</h2>
              <button
                onClick={() => setShowNewInventory(!showNewInventory)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                {showNewInventory ? 'Cancel' : 'Add Product'}
              </button>
            </div>

            {showNewInventory && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="SKU"
                    value={newInventory.sku}
                    onChange={(e) => setNewInventory({ ...newInventory, sku: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newInventory.product_name}
                    onChange={(e) => setNewInventory({ ...newInventory, product_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newInventory.category}
                    onChange={(e) => setNewInventory({ ...newInventory, category: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newInventory.unit_price}
                    onChange={(e) => setNewInventory({ ...newInventory, unit_price: parseFloat(e.target.value) })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleAddInventory}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'sku', label: 'SKU', sortable: true },
                    { key: 'product_name', label: 'Product', sortable: true },
                    { key: 'category', label: 'Category', sortable: true },
                    { key: 'unit_price', label: 'Price', render: (v) => `$${v?.toFixed(2) || '0.00'}` },
                    { key: 'shelf_quantity', label: 'Shelf', sortable: true },
                    { key: 'truck_quantity', label: 'Truck', sortable: true },
                  ]}
                  data={inventory}
                  loading={loading}
                />
              )}
            </div>
          </div>
        )}

        {/* Trucks Tab */}
        {activeTab === 'trucks' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Truck Management</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'truck_number', label: 'Truck #', sortable: true },
                    { key: 'first_name', label: 'Driver', sortable: true },
                    { key: 'status', label: 'Status', render: (v) => (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${v === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {v}
                      </span>
                    )},
                  ]}
                  data={trucks}
                  loading={loading}
                />
              )}
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Invoices</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'invoice_number', label: 'Invoice #', sortable: true },
                    { key: 'company_name', label: 'Customer', sortable: true },
                    { key: 'total_amount', label: 'Amount', render: (v) => `$${v?.toFixed(2) || '0.00'}` },
                    { key: 'status', label: 'Status', render: (v) => (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        v === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {v}
                      </span>
                    )},
                  ]}
                  data={invoices}
                  loading={loading}
                />
              )}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Customers</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'company_name', label: 'Company', sortable: true },
                    { key: 'status', label: 'Status', render: (v) => (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        v === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {v}
                      </span>
                    )},
                  ]}
                  data={customers}
                  loading={loading}
                  actions={[
                    {
                      label: 'Approve',
                      onClick: (row) => row.status !== 'active' && handleApproveCustomer(row.id),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Financial Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Revenue', value: financialMetrics.total_revenue || 0, color: 'bg-green-50' },
                { label: 'Total Expenses', value: financialMetrics.total_expenses || 0, color: 'bg-red-50' },
                { label: 'Gross Profit', value: financialMetrics.gross_profit || 0, color: 'bg-blue-50' },
                { label: 'Receivables', value: financialMetrics.outstanding_receivables || 0, color: 'bg-yellow-50' },
              ].map((metric) => (
                <div key={metric.label} className={`${metric.color} border-l-4 border-indigo-500 p-4 rounded`}>
                  <p className="text-gray-600 text-sm">{metric.label}</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    ${metric.value?.toFixed(2) || '0.00'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Suppliers</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'company_name', label: 'Supplier', sortable: true },
                    { key: 'contact_person', label: 'Contact', sortable: true },
                    { key: 'email', label: 'Email', sortable: true },
                    { key: 'phone', label: 'Phone', sortable: false },
                  ]}
                  data={suppliers}
                  loading={loading}
                />
              )}
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Expenses & Equity</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'category', label: 'Category', sortable: true },
                    { key: 'amount', label: 'Amount', render: (v) => `$${v?.toFixed(2) || '0.00'}` },
                    { key: 'status', label: 'Status', render: (v) => (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        v === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {v}
                      </span>
                    )},
                  ]}
                  data={expenses}
                  loading={loading}
                  actions={[
                    {
                      label: 'Approve',
                      onClick: (row) => row.status !== 'approved' && handleApproveExpense(row.id),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Security & Privacy</h2>
            <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
              <div className="space-y-4">
                <div className="pb-4 border-b">
                  <h3 className="font-bold mb-2">Multi-Factor Authentication</h3>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span>Require MFA for all admins</span>
                  </label>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppAdminIntegrated;
