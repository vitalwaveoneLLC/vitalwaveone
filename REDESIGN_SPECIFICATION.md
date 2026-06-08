# VitalWave Wholesale Platform - Complete Redesign Specification v2.0

**Project:** VitalWave Wholesale Platform  
**Domain:** vitalwaveone.com  
**Version:** 2.0.0  
**Last Updated:** June 2, 2026  
**Status:** Design Specification Ready

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Admin Portal Specifications](#admin-portal-specifications)
4. [Ordering Portal Specifications](#ordering-portal-specifications)
5. [Landing Page & Registration](#landing-page--registration)
6. [Security Requirements](#security-requirements)
7. [UI/UX Standards](#uiux-standards)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The VitalWave Wholesale Platform is a comprehensive SaaS solution for wholesale businesses. This v2.0 redesign modernizes the codebase, implements the complete feature set from the Wholesale Platform App Documentation, and establishes vitalwaveone.com as the official brand.

**Key Improvements:**
- ✅ Complete brand alignment to vitalwaveone.com
- ✅ Full implementation of admin portal (11 tabs)
- ✅ Complete ordering portal with 3 user types
- ✅ Modern responsive UI design
- ✅ Enhanced security (MFA/OTP/Face Recognition)
- ✅ Real-time features (maps, inventory sync)
- ✅ Multi-tenant architecture
- ✅ Comprehensive API

---

## Architecture Overview

### Two-Portal System

```
VitalWave Application
├── Admin Portal (/admin)
│   └── For business owners & management
├── Ordering Portal (/order)
│   ├── Customers (placing orders)
│   ├── Drivers/Sales Personnel (route management)
│   └── Walk-in Staff (point of sale)
├── Landing Page (/)
│   └── Subscription & registration
└── Authentication (/login)
    ├── Admin login
    ├── User login
    └── OTP verification
```

### Technical Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18+ |
| Routing | Custom history-based routing |
| Styling | Tailwind CSS |
| State | React Hooks + localStorage |
| Payments | Stripe API |
| Database | Neon PostgreSQL |
| Maps | Google Maps API |
| Notifications | Toast + Email (Gmail SMTP) |
| Authentication | JWT + OTP + MFA |
| Hosting | Vercel |

---

## Admin Portal Specifications

### 1. Inventory Management Tab
**Purpose:** Monitor and manage all inventory in real-time

**Features:**
- View shelf inventory vs truck inventory separately
- Real-time inventory count synchronization
- Bulk CSV import (Product Name, Description, Categories, SKU)
- Downloadable CSV template
- Low-stock alerts
- Track inventory loading/reloading of trucks
- Automatic sync with sales operations

**Table Columns:**
| Column | Type | Sortable | Filterable |
|--------|------|----------|-----------|
| SKU | String | ✓ | ✓ |
| Product Name | String | ✓ | ✓ |
| Description | Text | ✗ | ✓ |
| Category | String | ✓ | ✓ |
| Shelf Stock | Number | ✓ | ✓ |
| Truck Stock | Number | ✓ | ✓ |
| Total | Number | ✓ | ✓ |
| Status | Badge | ✓ | ✓ |
| Last Updated | DateTime | ✓ | ✗ |

**UI Components:**
- Inventory table with pagination
- Stock level indicators (green/yellow/red)
- Import CSV modal
- Low-stock alerts banner
- Real-time update indicator

---

### 2. Truck Management Tab
**Purpose:** Real-time tracking of trucks and driver routes

**Features:**
- Manage all trucks and assigned drivers
- Live map with driver locations
- Customer location display (color-coded by driver)
- Daily route assignments
- Vehicle information management
- Driver assignment interface

**Map Display:**
- Current truck locations (with driver names)
- Assigned customer locations (color-coded)
- Route visualization
- Live GPS updates every 30 seconds
- Zoom to customer/truck

**Data Table:**
| Column | Type |
|--------|------|
| Truck ID | String |
| Driver Name | String |
| Current Location | Coordinates |
| Route Status | Badge |
| Assigned Customers | Count |
| Last Updated | DateTime |

---

### 3. IRS Reports Tab
**Purpose:** File tax compliance forms and reports

**Features:**
- File IRS forms for tax-required products
- Generate tax compliance reports
- Export reports as PDF
- Track filing status
- Historical report archive

**Report Types:**
- Form 8949 (Sales of Assets)
- Schedule D (Capital Gains)
- Sales Summary Reports
- Tax Category Reports

---

### 4. Invoices Tab
**Purpose:** Complete invoice management with payment tracking

**Features:**
- View all company invoices
- Filter by status: Paid, Balance Due, Unpaid
- Carry forward balance due
- Lock invoices after payment (read-only)
- Bulk payment processing
- PDF generation & download
- "Created By" tracking

**Invoice Display Fields:**
- Company logo/name
- Customer company name
- Email & address
- Phone number
- Invoice date & time
- Invoice items
- Total amount
- Payment status
- Balance due (if any)

**Status Filters:**
- Paid ✓
- Balance Due ⚠
- Unpaid ✗

**Actions:**
- View details
- Download PDF
- Mark as paid
- Apply payment
- View payment history

---

### 5. Financial Tab
**Purpose:** Comprehensive financial reporting and analytics

**Features:**
- Display all financial KPIs
- Generate Profit & Loss (P&L) reports
- Financial dashboard with key metrics
- Charts and visualizations
- Export financial reports

**KPIs Displayed:**
- Total Revenue
- Total Expenses
- Gross Profit
- Profit Margin %
- Outstanding Receivables
- Pending Payables
- Cash Flow
- Cost of Goods Sold

**Charts:**
- Monthly revenue trend
- Expense breakdown (pie chart)
- Profit margin trend
- Customer contribution (bar chart)

**Reports:**
- P&L Statement (monthly/yearly)
- Cash Flow Analysis
- Expense Summary
- Revenue by Category

---

### 6. Security & Privacy Settings Tab
**Purpose:** Configure multi-factor authentication and session management

**Admin Portal Security:**
- ✓ Multi-Factor Authentication (MFA) required
- ✓ One-Time Password (OTP) support
- ✓ Auto-logout after 10 minutes inactivity
- ✓ Session timeout warnings
- ✓ Login history
- ✓ Device management
- ✓ IP whitelist (optional)

**Ordering Portal Security:**
- ✓ Face recognition (on supported devices)
- ✓ OTP fallback for unsupported devices
- ✓ Authentication on sign-in/sign-off
- ✓ Auto-logout after 15 minutes inactivity
- ✓ Session tracking

**Settings Available:**
- Enable/disable MFA
- OTP method (Email/SMS)
- OTP expiry time (default: 10 min)
- Login timeout duration
- Session timeout warnings
- Active sessions management
- Login attempt history

---

### 7. Purchase PO & Suppliers Management Tab
**Purpose:** Control incoming inventory and supplier relationships

**Features:**
- Create and manage Purchase Orders
- Track supplier information
- Monitor supplier performance
- Financial transaction tracking
- Expense KPI calculation

**Purchase Order Fields:**
- PO Number
- Supplier Name
- Order Date
- Expected Delivery
- Items (description, qty, unit price)
- Total Amount
- Status (Draft, Submitted, Received, Invoiced)
- Notes

**Supplier Information:**
- Company Name
- Contact Person
- Email & Phone
- Address
- Payment Terms
- Tax ID
- Performance Rating

---

### 8. Return Checks Tab
**Purpose:** Track and manage returned checks

**Features:**
- Flag invoices with returned checks
- Send warning notifications
- Display warnings in Invoices tab
- Track return details
- Update check status

**Return Check Details:**
- Check Number
- Amount
- Return Date
- Reason for Return
- Customer Name
- Associated Invoice
- Status (Returned, Redeposited, Written Off)
- Action Taken

---

### 9. Data Backup Tab
**Purpose:** Secure backup and disaster recovery

**Features:**
- One-click backup all data
- Per-tenant/company backup
- Export as ZIP with CSV files
- Scheduled backups
- Backup history/restore points
- Restore functionality

**Backup Contents:**
- Customers data (CSV)
- Invoices data (CSV)
- Inventory data (CSV)
- Transactions data (CSV)
- Users data (CSV)
- Configuration (JSON)

**Backup Actions:**
- Manual backup now
- View backup history
- Download backup
- Schedule automated backups
- Restore from backup

---

### 10. Customers Tab
**Purpose:** Centralized customer management

**Features:**
- View all customer additions from Ordering portal
- Approve new customer registrations
- Bulk import from CSV template
- Downloadable CSV template
- "Created By" tracking
- Customer activity tracking

**Customer Fields:**
- Customer Name
- Email & Phone
- Address (Street, Building ID, Zip, State)
- License Number
- Registration Number
- Status (Active, Pending Approval, Inactive)
- Created By
- Created Date
- Last Order Date

**Actions:**
- View details
- Approve/Reject
- Edit information
- Deactivate
- View order history

---

### 11. Expenses & Equity Tab
**Purpose:** Track business expenses and equity information

**Features:**
- Record all business expenses
- Upload supporting photos/documents
- Track equity information
- Expense approval workflow
- Categorize expenses

**Expense Categories:**
- Transportation (gas, maintenance, insurance)
- Office supplies
- Equipment
- Personnel
- Marketing
- Utilities
- Other

**Expense Entry:**
- Date
- Category
- Description
- Amount
- Receipt upload
- Status (Pending, Approved, Rejected)
- Approver notes

---

## Ordering Portal Specifications

### Authentication & User Types

The Ordering Portal supports three distinct user types:

#### 1. Customers
**Purpose:** Place orders and manage invoices

**Features:**
- Place orders for products
- Create custom invoices
- Generate & download PDF invoices
- View order history
- Payment options:
  - Pay by card (Stripe)
  - Upload check photo
  - Cash payment
  - Pay next time (deferred)
- Invoice management
- View balance due

---

#### 2. Drivers (Sales Personnel)
**Purpose:** Manage daily routes and sales operations

**Truck Loading & Inventory:**
- Load trucks with inventory
- View shelf inventory in real-time
- See remaining shelf stock if truck runs out
- Track what's on each truck

**Daily Route Management:**
- View assigned customers in table format
- Customers ordered by route sequence
- Navigation button to drive to next customer
- Modify customer orders (before finalization)
- Auto-finalize orders per schedule

**Order & Sales Processing:**
- Place orders for assigned customers
- Place orders for other customers
- Auto-open sales tab upon customer arrival
- Create and generate invoices
- Barcode scanning via phone camera
- Invoice generation from scans

**Payment Collection:**
- Cash
- Check (with photo + amount)
- Money order
- Card payment
- Payment proof upload (receipt/photo)
- Pay next time option

**Expense Tracking:**
- Record expenses during trips
- Categories: gas, food, maintenance, etc.
- Upload receipts
- Submit for admin approval
- Receive rejection notifications with explanation

---

#### 3. Walk-in Staff
**Purpose:** Point-of-sale operations

**Sales & Invoicing:**
- Create invoices for walk-in customers
- Barcode scanning for fast invoicing
- Quick customer lookup

**Inventory Management:**
- Update shelf inventory in real-time
- Barcode scanner support
- Low-stock notifications

**Payment Processing:**
- Cash
- Check (with photo + amount)
- Money order
- Card payment
- Payment verification

---

## Landing Page & Registration

### Landing Page Features
- Marketing copy for three subscription tiers
- Feature highlights
- Pricing display
- CTA button: "Select Plan"

### Subscription Tiers
1. **Standard** - Basic wholesale features
2. **Premium** - Advanced reporting & suppliers
3. **Diamond** - Full suite + priority support

### Registration Flow

#### Step 1: Stripe Payment
- Select subscription tier
- Stripe payment processing
- Receipt generation

#### Step 2: Company Information
- Company Name
- License Number
- Registration Information
- Company Logo Upload
- Documents Upload (license, registration)

#### Step 3: Admin/Owner Information
- First Name & Last Name
- Address (Street, Building/Shop ID, Zip, State)
- Email & Phone Number
- Create password

#### Step 4: Verification & Activation
- Email verification
- Account activation
- Tenant creation

### Subsequent User Registration
After subscription is active, admin can enable registration for:
- **Customers**: License upload, registration number
- **Drivers**: Identity verification
- **Walk-in Staff**: Basic information

All require admin approval before activation.

---

## Security Requirements

### Authentication & Authorization
- ✓ JWT-based authentication
- ✓ Refresh token mechanism
- ✓ Role-based access control (RBAC)
- ✓ Multi-tenant isolation
- ✓ Session management
- ✓ Secure password hashing (bcrypt)

### Multi-Factor Authentication (MFA)
- ✓ Admin portal: MFA mandatory
- ✓ OTP via email/SMS
- ✓ Backup codes
- ✓ OTP expiry: 10 minutes

### Face Recognition
- ✓ Ordering portal: Face recognition (optional)
- ✓ OTP fallback for unsupported devices
- ✓ Biometric authentication
- ✓ Enrollment process

### Session Management
- ✓ Admin portal: 10-minute auto-logout
- ✓ Ordering portal: 15-minute auto-logout (if user signed off)
- ✓ Session timeout warnings
- ✓ Session persistence (across tabs)
- ✓ Concurrent session limits (optional)

### Data Security
- ✓ HTTPS/TLS for all communications
- ✓ CSRF token protection
- ✓ Input sanitization (XSS prevention)
- ✓ SQL injection prevention (parameterized queries)
- ✓ Rate limiting
- ✓ CORS configuration

### Tenant Isolation
- ✓ Database-level isolation
- ✓ Row-level security (RLS)
- ✓ Tenant ID in all queries
- ✓ Cross-tenant access prevention

---

## UI/UX Standards

### Design Principles
- Modern, clean aesthetic
- Clear visual hierarchy
- Consistent typography
- Intuitive navigation
- Touch-friendly (mobile-first)
- Accessible (WCAG 2.1 AA)

### Color Palette
- Primary: Indigo (#4F46E5)
- Secondary: Sky Blue (#0EA5E9)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Neutral: Gray (#6B7280 - #F3F4F6)

### Typography
- Headings: Inter, Bold
- Body: Inter, Regular
- Monospace: Fira Code (for data)

### Components
- Cards with shadows
- Tables with alternating rows
- Buttons with hover states
- Input fields with labels
- Modals with backdrop
- Toast notifications
- Loading spinners
- Error messages
- Success banners

### Responsive Breakpoints
- Mobile: 320px - 640px (xs, sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: 1024px+ (xl, 2xl)

### Mobile Optimization
- Touch-friendly buttons (48px minimum)
- Vertical layout on mobile
- Collapsible navigation
- Optimized tables for small screens
- Full-screen modals on mobile
- Bottom navigation (optional)

---

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  phone VARCHAR,
  role ENUM('admin', 'customer', 'driver', 'walkin_staff'),
  tenant_id UUID NOT NULL,
  status ENUM('active', 'pending', 'inactive'),
  mfa_enabled BOOLEAN DEFAULT false,
  face_recognition_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES companies(id)
);
```

#### Companies (Tenants)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  domain VARCHAR,
  logo_url VARCHAR,
  license_number VARCHAR,
  registration_documents JSONB,
  subscription_tier ENUM('standard', 'premium', 'diamond'),
  subscription_expires_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Inventory
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  sku VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  shelf_quantity INTEGER DEFAULT 0,
  truck_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES companies(id)
);
```

#### Trucks
```sql
CREATE TABLE trucks (
  id UUID PRIMARY KEY,
  truck_number VARCHAR UNIQUE NOT NULL,
  driver_id UUID,
  capacity INTEGER,
  current_location POINT,
  status ENUM('active', 'maintenance', 'inactive'),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (driver_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES companies(id)
);
```

#### Invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR UNIQUE NOT NULL,
  customer_id UUID,
  total_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  balance_due DECIMAL(10, 2),
  status ENUM('draft', 'sent', 'paid', 'overdue'),
  payment_method VARCHAR,
  created_by UUID,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES companies(id)
);
```

#### Customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  user_id UUID,
  company_name VARCHAR,
  license_number VARCHAR,
  registration_number VARCHAR,
  address_street VARCHAR,
  address_building VARCHAR,
  address_zip VARCHAR,
  address_state VARCHAR,
  status ENUM('active', 'pending_approval', 'inactive'),
  created_by UUID,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES companies(id)
);
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new company
POST   /api/auth/login             - Login user
POST   /api/auth/otp/send          - Send OTP
POST   /api/auth/otp/verify        - Verify OTP
POST   /api/auth/refresh           - Refresh token
POST   /api/auth/logout            - Logout
GET    /api/auth/me                - Get current user
```

### Inventory
```
GET    /api/inventory              - List inventory
POST   /api/inventory              - Create product
PUT    /api/inventory/:id          - Update product
DELETE /api/inventory/:id          - Delete product
POST   /api/inventory/import       - Bulk import CSV
GET    /api/inventory/export       - Export CSV
```

### Trucks & Routes
```
GET    /api/trucks                 - List trucks
POST   /api/trucks                 - Create truck
PUT    /api/trucks/:id             - Update truck
GET    /api/trucks/:id/location    - Get location
GET    /api/routes                 - Get daily routes
POST   /api/routes                 - Create route
```

### Invoices
```
GET    /api/invoices               - List invoices
POST   /api/invoices               - Create invoice
PUT    /api/invoices/:id           - Update invoice
POST   /api/invoices/:id/payment   - Record payment
GET    /api/invoices/:id/pdf       - Download PDF
```

### Customers
```
GET    /api/customers              - List customers
POST   /api/customers              - Register customer
PUT    /api/customers/:id          - Update customer
POST   /api/customers/:id/approve  - Approve customer
POST   /api/customers/import       - Bulk import
```

### Financial
```
GET    /api/financial/kpis         - Get KPI data
GET    /api/financial/pl           - Get P&L report
GET    /api/financial/cash-flow    - Get cash flow
```

### Suppliers
```
GET    /api/suppliers              - List suppliers
POST   /api/suppliers              - Create supplier
PUT    /api/suppliers/:id          - Update supplier
GET    /api/suppliers/:id/orders   - Get PO history
```

### Expenses
```
GET    /api/expenses               - List expenses
POST   /api/expenses               - Create expense
PUT    /api/expenses/:id           - Update expense
POST   /api/expenses/:id/approve   - Approve/reject
```

### Backup
```
POST   /api/backup                 - Create backup
GET    /api/backup/history         - Get backup list
POST   /api/backup/restore/:id     - Restore backup
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Update branding to vitalwaveone.com
- [x] Update package.json dependencies
- [x] Update .env.example configuration
- [x] Create redesign specification (this document)
- [ ] Setup database schema
- [ ] Create API structure
- [ ] Setup authentication (JWT + OTP)

### Phase 2: Admin Portal (Week 2-3)
- [ ] Create admin layout & navigation
- [ ] Implement Inventory Management tab
- [ ] Implement Truck Management tab
- [ ] Implement Invoices tab
- [ ] Implement Financial tab
- [ ] Implement Customers tab

### Phase 3: Ordering Portal (Week 3-4)
- [ ] Create ordering portal layout
- [ ] Implement Customer features
- [ ] Implement Driver features
- [ ] Implement Walk-in Staff features
- [ ] Barcode scanning integration
- [ ] Payment processing (Stripe)

### Phase 4: Advanced Features (Week 5)
- [ ] IRS Reports functionality
- [ ] Security & Privacy settings (MFA/OTP)
- [ ] Purchase PO & Suppliers
- [ ] Return Checks management
- [ ] Data Backup functionality
- [ ] Expenses & Equity tracking

### Phase 5: Polish & Security (Week 6)
- [ ] Responsive design (mobile/tablet)
- [ ] Error handling & validation
- [ ] Loading states & animations
- [ ] Security audit
- [ ] Performance optimization
- [ ] Testing (unit & integration)

### Phase 6: Deployment (Week 7)
- [ ] Database migrations
- [ ] API deployment
- [ ] Frontend build & deploy
- [ ] DNS configuration
- [ ] SSL/TLS setup
- [ ] Monitoring & logging

---

## Next Steps

1. **Database Setup**: Create PostgreSQL schema using provided SQL
2. **Backend Development**: Implement API endpoints
3. **Component Library**: Create reusable React components
4. **State Management**: Setup Zustand or Context API
5. **Integration Testing**: Test all features
6. **User Acceptance Testing**: Validate with stakeholders
7. **Production Deployment**: Deploy to vitalwaveone.com

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2, 2026 | System | Initial specification |
| 2.0 | June 2, 2026 | System | Complete redesign spec |

---

**This specification document should be reviewed and approved before implementation begins.**
