# VitalWaveOne - Critical Fixes Code Snippets
**Ready-to-use code for integrating the 4 critical fixes**

---

## 📌 EXACT CODE TO ADD TO YOUR COMPONENTS

### FIX #1: iOS Responsive Design - ALREADY DONE ✅
**File**: `index.html`
**Status**: Complete, no additional action needed

---

### FIX #2: Camera Permission Handler
**File**: `src/utils/cameraUtils.js` ✅ Created
**Where to use it**: In driver portal, order portal, any component that captures photos

#### Usage Example
```javascript
// In your component file
import { capturePhoto, pickPhotoFromLibrary, checkCameraPermissionStatus } from '../utils/cameraUtils';

// Component code:
const handlePhotoCapture = async () => {
  try {
    const result = await capturePhoto();
    
    if (!result.success) {
      if (result.permissionDenied) {
        showToast('Please enable camera permissions in app settings', 'warning');
      } else if (result.cancelled) {
        // User cancelled, do nothing
      } else {
        showToast('Error: ' + result.error, 'error');
      }
      return;
    }

    // Use the photo
    console.log('Photo captured:', result.dataUrl);
    setPhotoData(result.dataUrl);
    
  } catch (error) {
    showToast('Unexpected error: ' + error.message, 'error');
  }
};

// Button in JSX:
<button onClick={handlePhotoCapture}>📷 Take Photo</button>
```

**In OrderPortal.jsx or DriverPortal.jsx**, replace old camera code with this pattern.

---

### FIX #3: Invoice Tenant Verification
**File**: `src/utils/invoiceSecurity.js` ✅ Created
**Where to use it**: Invoice view, download, email, print features

#### Code to Add - Invoice View Component
```javascript
import { getSecureInvoice, canAccessInvoice, filterInvoicesByTenant } from '../utils/invoiceSecurity';

// When displaying an invoice:
const viewInvoice = (invoiceId) => {
  try {
    // CRITICAL: Always verify tenant access first
    const invoice = getSecureInvoice(invoiceId, currentUser, allSales);
    
    // Safe to display invoice
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
    
  } catch (error) {
    showToast('Access denied: ' + error.message, 'error');
    return;
  }
};

// When loading invoice list:
useEffect(() => {
  // Filter to user's company only
  const userInvoices = filterInvoicesByTenant(allSales, currentUser);
  setDisplayedInvoices(userInvoices);
}, [allSales, currentUser]);

// When downloading invoice:
const downloadInvoice = async (invoiceId) => {
  try {
    // Verify access
    const invoice = getSecureInvoice(invoiceId, currentUser, allSales);
    
    // Generate PDF and download
    const pdf = generateInvoicePDF(invoice);
    downloadFile(pdf, `invoice-${invoice.id}.pdf`);
    
  } catch (error) {
    showToast('Cannot download: ' + error.message, 'error');
  }
};
```

#### Code to Add - API Endpoint (Backend)
```javascript
// In your API route (e.g., /api/invoice/:id)
import { getSecureInvoice } from '../utils/invoiceSecurity';

app.get('/api/invoice/:id', requireAuth, (req, res) => {
  try {
    const invoiceId = req.params.id;
    const user = req.user; // From auth middleware
    
    // CRITICAL: Verify tenant access on server side too
    const invoice = getSecureInvoice(invoiceId, user, allSales);
    
    // Audit log
    auditLog(user.id, `Accessed invoice ${invoiceId}`, 'info');
    
    res.json(invoice);
    
  } catch (error) {
    // Log security violation
    auditLog(req.user.id, `Failed access to invoice ${req.params.id}`, 'warning');
    res.status(403).json({ error: 'Access denied' });
  }
});
```

---

### FIX #4: Walk-in Registration Data Filtering
**File**: `src/utils/registrationSecurity.js` ✅ Created
**Where to use it**: Walk-in registration form, customer registration flow

#### Code to Add - Registration Form Component
```javascript
import {
  filterDriversByTenant,
  filterCustomersByTenant,
  filterProductsByTenant,
  validateWalkInRegistration,
  sanitizeRegistrationData,
  filterPendingApprovalsByTenant
} from '../utils/registrationSecurity';

// Initialize form
const [formData, setFormData] = useState({
  business_name: '',
  owner_name: '',
  email: '',
  phone: '',
  address: '',
  driver_id: null,
  products: []
});

// When loading driver dropdown
useEffect(() => {
  // CRITICAL: Filter by company
  const availableDrivers = filterDriversByTenant(allDrivers, currentUser.company_id);
  setDriverOptions(availableDrivers);
}, [allDrivers, currentUser.company_id]);

// When searching for existing customers
const searchCustomers = (searchTerm) => {
  const matches = allCustomers.filter(c =>
    (c.business_name + c.owner_name).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // CRITICAL: Filter by company
  const filteredMatches = filterCustomersByTenant(matches, currentUser.company_id);
  setSearchResults(filteredMatches);
};

// When showing product list
useEffect(() => {
  // CRITICAL: Filter by company
  const availableProducts = filterProductsByTenant(allProducts, currentUser.company_id);
  setAvailableProducts(availableProducts);
}, [allProducts, currentUser.company_id]);

// When submitting registration form
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // CRITICAL: Validate before saving
    const validation = validateWalkInRegistration(formData, currentUser.company_id);
    
    if (!validation.valid) {
      validation.errors.forEach(error => showToast(error, 'error'));
      return;
    }
    
    // CRITICAL: Sanitize data to ensure correct company_id
    const safeData = sanitizeRegistrationData(formData, currentUser.company_id);
    
    // Save to database
    const result = await supabase
      .from('customers')
      .insert([safeData]);
    
    if (result.error) throw result.error;
    
    showToast('Walk-in customer registered successfully!');
    resetForm();
    
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
};

// Form JSX:
<form onSubmit={handleSubmit}>
  <input
    type="text"
    placeholder="Business Name"
    value={formData.business_name}
    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
    required
  />
  
  <select
    value={formData.driver_id || ''}
    onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
  >
    <option value="">Select Driver</option>
    {driverOptions.map(d => (
      <option key={d.id} value={d.id}>{d.name}</option>
    ))}
  </select>
  
  <button type="submit">Register Walk-in</button>
</form>
```

#### Code to Add - Admin Approval List
```javascript
// Filter pending approvals by company
const getPendingApprovals = () => {
  const pending = filterPendingApprovalsByTenant(allPending, currentUser.company_id);
  setPendingApprovals(pending);
};
```

---

## 🔐 Security Checklist - Add to Every Form

```javascript
// Add this security validation to EVERY customer/registration form:

const validateSecurityRequirements = (data, currentUser) => {
  const issues = [];
  
  // 1. User must be authenticated
  if (!currentUser || !currentUser.id) {
    issues.push('Not authenticated');
  }
  
  // 2. User must have company assigned
  if (!currentUser.company_id) {
    issues.push('No company context');
  }
  
  // 3. Data must include company_id
  if (!data.company_id) {
    issues.push('Missing company_id in data');
  }
  
  // 4. Company IDs must match
  if (data.company_id !== currentUser.company_id) {
    issues.push('Company mismatch - data from different company');
  }
  
  // 5. No cross-company references
  if (data.driver_id && !data.driver?.company_id) {
    issues.push('Driver company_id missing');
  }
  
  if (data.driver?.company_id !== currentUser.company_id) {
    issues.push('Driver from different company');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

// Use before every save:
const issues = validateSecurityRequirements(formData, currentUser);
if (!issues.valid) {
  console.error('Security validation failed:', issues.issues);
  showToast('Security error: ' + issues.issues[0], 'error');
  return;
}
```

---

## 📱 iOS Responsive Design - Already Applied

The iOS responsive design fix has been automatically applied to `index.html`. No additional code needed.

**What changed:**
- ✅ Safe area support for notched devices (iPhone X, 12, 13, 14, etc.)
- ✅ Dynamic viewport height (`100dvh`)
- ✅ Better mobile tap targets
- ✅ Proper padding for navigation bars

---

## ✅ TESTING CODE - Verify Each Fix

```javascript
// Test #1: Verify camera doesn't crash
const testCamera = async () => {
  const result = await capturePhoto();
  console.log('Camera test:', result.success ? 'PASS' : 'FAIL', result);
};

// Test #2: Verify invoice access control
const testInvoiceAccess = () => {
  const userInvoice = allSales.find(s => s.company_id === currentUser.company_id);
  const otherInvoice = allSales.find(s => s.company_id !== currentUser.company_id);
  
  try {
    getSecureInvoice(userInvoice.id, currentUser, allSales);
    console.log('Correct invoice: PASS');
  } catch (e) {
    console.log('Correct invoice: FAIL', e.message);
  }
  
  try {
    getSecureInvoice(otherInvoice.id, currentUser, allSales);
    console.log('OTHER invoice: FAIL - should have thrown error');
  } catch (e) {
    console.log('OTHER invoice blocked: PASS');
  }
};

// Test #3: Verify registration filtering
const testRegistrationFiltering = () => {
  const filtered = filterDriversByTenant(allDrivers, currentUser.company_id);
  const wrongCompany = filtered.some(d => d.company_id !== currentUser.company_id);
  console.log('Registration filter:', wrongCompany ? 'FAIL' : 'PASS');
};
```

---

## 🚀 Integration Priority

1. **Highest Priority**: Invoice Tenant Verification (most critical)
2. **High Priority**: Registration Filtering (data isolation)
3. **Medium Priority**: Camera Fix (mobile functionality)
4. **Maintenance**: iOS Responsive (already done)

---

## 📞 Quick Reference

| Component | Import | Main Function | Usage |
|-----------|--------|---------------|-------|
| Camera | `cameraUtils.js` | `capturePhoto()` | Photo capture |
| Invoice | `invoiceSecurity.js` | `getSecureInvoice()` | Invoice access |
| Registration | `registrationSecurity.js` | `filterDriversByTenant()` | Form filtering |

