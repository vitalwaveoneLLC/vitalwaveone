# OrderPortal API Integration Guide

## Quick Start

The OrderPortal component now uses Neon PostgreSQL via Vercel API instead of Supabase SDK.

### Basic API Call Pattern

```javascript
// Read data
const { data } = await dbQuery("get-products");
const { data: custs } = await dbQuery("get-customers");

// Create/Update data
const { data: sale } = await dbMutate("create-sales", {
  id: "ORD-123",
  cust_id: "C001",
  items: [{pid: "P1", qty: 5}],
  total: 100.00,
  // ... other fields
});
```

## Key API Endpoints

### GET Endpoints (Read-Only)

All read operations: `GET /api/db?action={action}`

- `get-products` - All products with inventory
- `get-customers` - Registered customers
- `get-state-taxes` - Tax rates by state
- `get-company` - Company settings
- `get-sales` - Sales/orders history
- `get-payments` - Payment records
- `get-loads` - Truck loads

### POST Endpoints (Create)

All create: `POST /api/db?action={action}` with JSON body

- `create-sales` - New order/sale
- `create-customers` - New customer registration
- `create-payments` - Payment record
- `create-expenses` - Driver expense

### PUT Endpoints (Update)

All update: `PUT /api/db?action={action}` with JSON body

- `update-sales` - Modify order
- `update-products` - Update inventory
- `update-payments` - Mark as paid
- `update-loads` - Change load status

### Special Endpoints

#### Driver Authentication
```javascript
POST /api/auth/driver-login
Body: { "phone": "3175096262" }
Returns: { "data": { id, name, phone, truck_id, ... } }
```

#### WhatsApp Notifications
```javascript
POST /api/send-whatsapp
Body: { "phone": "+13175096262", "message": "..." }
Returns: { "success": true, "messageId": "..." }
```

## Migration from Supabase

All Supabase SDK calls replaced:

| Old Pattern | New Pattern |
|-----------|-----------|
| `supabase.from("products").select("*")` | `await dbQuery("get-products")` |
| `supabase.from("sales").insert({...})` | `await dbMutate("create-sales", {...})` |
| `supabase.from("products").update({...})` | `await dbMutate("update-products", {...})` |
| `supabase.auth.signInWithPassword()` | `fetch('/api/auth/driver-login', POST)` |
| `supabase.functions.invoke("send-whatsapp")` | `fetch('/api/send-whatsapp', POST)` |

## Examples

### Load Initial Data
```javascript
const [prodRes, custRes, taxRes] = await Promise.all([
  dbQuery("get-products"),
  dbQuery("get-customers"),
  dbQuery("get-state-taxes"),
]);
setProducts(prodRes?.data || []);
setCustomers(custRes?.data || []);
```

### Create a Sale
```javascript
const { data } = await dbMutate("create-sales", {
  id: "ORD-" + uid(),
  cust_id: customer.id,
  items: cartItems,
  subtotal: 100.00,
  tax: 8.50,
  total: 108.50,
  status: "pending"
});
```

### Record Driver Sale
```javascript
await dbMutate("create-sales", {
  id: "S-" + uid(),
  cust_id: customerId,
  items: [{pid, qty}, ...],
  payment_method: "cash",
  total: 108.50
});
```

## Error Handling

```javascript
try {
  const { data } = await dbQuery("get-products");
  setProducts(data || []);
} catch (err) {
  setError("Failed: " + err.message);
}
```

All API helpers log errors: `console.error()` on failure.

## Testing

```bash
# cURL test
curl "http://localhost:3000/api/db?action=get-products"

# Create test
curl -X POST "http://localhost:3000/api/db?action=create-customers" \
  -H "Content-Type: application/json" \
  -d '{"id":"C1","name":"Store","phone":"317-509-6262"}'
```

## Response Format

Success:
```json
{ "data": { "id": "P001", "name": "Product", ... } }
```

Error:
```json
{ "error": "Invalid customer ID" }
```

See `src/OrderPortal.jsx` lines 50-105 for full API implementation details.
