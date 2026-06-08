# VitalWaveOne - Complete UML & Architecture Diagrams with Detailed Specifications

---

# SECTION 1: DETAILED SYSTEM ARCHITECTURE

## 1.1 Complete System Architecture with Data Flow

```mermaid
graph TB
    subgraph Client["👥 CLIENT LAYER"]
        Web["🌐 Web App<br/>React 19 + Vite<br/>Code Splitting<br/>Lazy Loading"]
        Mobile["📱 Mobile App<br/>Capacitor<br/>iOS & Android<br/>Native Bridge"]
        Portal["🛒 Order Portal<br/>Customer Ordering<br/>Order History<br/>Invoice Download"]
    end

    subgraph Frontend["🎨 FRONTEND LAYER (React)"]
        Router["React Router<br/>Navigation<br/>Page Management"]
        State["State Management<br/>useState/useReducer<br/>localStorage<br/>Session Storage"]
        Components["UI Components<br/>Forms, Tables<br/>Charts, Modals<br/>Real-time Updates"]
        Validation["Input Validation<br/>Zod Schema<br/>Field Validation<br/>Error Handling"]
        Auth["Auth Module<br/>Session Manager<br/>Token Handler<br/>Permission Check"]
    end

    subgraph API["🔌 API LAYER (Vercel Serverless)"]
        AuthAPI["Auth Endpoints<br/>POST /auth/login<br/>POST /auth/verify-otp<br/>POST /auth/logout<br/>CORS: vitalwaveone.com"]
        
        DataAPI["Data Endpoints<br/>GET /data/orders<br/>GET /data/customers<br/>POST /data/orders<br/>PUT /data/trucks<br/>DELETE /data/drivers"]
        
        FnAPI["Function Endpoints<br/>POST /send-otp<br/>POST /send-whatsapp<br/>POST /send-invoice-email<br/>POST /create-payment<br/>POST /send-invoice-sms"]
        
        RpcAPI["RPC Endpoints<br/>POST /rpc/function<br/>Custom Operations<br/>Batch Processing"]
        
        FileAPI["Storage Endpoints<br/>POST /storage/upload<br/>GET /storage/file<br/>DELETE /storage/file<br/>R2 Integration"]
    end

    subgraph Middleware["🛡️ MIDDLEWARE & SECURITY"]
        Auth_Middleware["Authentication<br/>Extract session token<br/>Validate JWT<br/>Check expiration<br/>Attach user context"]
        
        RateLimit["Rate Limiting<br/>Per-user: 100 req/hr<br/>Global: 1000 req/min<br/>Upstash Redis<br/>Exponential backoff"]
        
        CSRF["CSRF Protection<br/>Token in session<br/>Verify on mutations<br/>Secure httpOnly<br/>SameSite=Strict"]
        
        Encryption["Data Encryption<br/>AES-256-GCM<br/>Sensitive fields<br/>Key rotation ready<br/>CryptoJS library"]
        
        Validation["Input Validation<br/>Zod schema<br/>Type checking<br/>Range validation<br/>SQL injection prevention"]
        
        AuditLog["Audit Logging<br/>All mutations logged<br/>JSONB changes<br/>User tracking<br/>90-day retention"]
        
        SecurityHeaders["Security Headers<br/>CSP: strict<br/>HSTS: 1 year<br/>X-Frame: DENY<br/>X-Content: nosniff"]
        
        ErrorHandler["Error Handling<br/>Try-catch blocks<br/>Graceful fallback<br/>No PII in logs<br/>User-friendly errors"]
    end

    subgraph Database["💾 DATABASE LAYER (PostgreSQL - Neon)"]
        Connection["Connection Pool<br/>Max 100 connections<br/>Connection timeout: 30s<br/>Auto-reconnect"]
        
        Tenants_Table["tenants table<br/>id (PK), name, slug<br/>plan, status<br/>trial_ends_at, max_trucks<br/>max_customers"]
        
        Users_Table["profiles table<br/>id, tenant_id (FK)<br/>email, phone, full_name<br/>role (admin, user)<br/>encrypted_password"]
        
        Orders_Table["orders table<br/>id, tenant_id, customer_id<br/>items (JSONB)<br/>total_amount, status<br/>created_at, delivered_at<br/>INDEX: tenant_id, status"]
        
        Security_Table["sessions table<br/>token (PK), user_id<br/>tenant_id, user_type<br/>expires_at, is_active<br/>INDEX: token, user_id"]
        
        OTP_Table["otp_codes table<br/>id, phone, code<br/>used, expires_at<br/>created_at<br/>INDEX: phone, expires_at"]
        
        Audit_Table["audit_logs table<br/>id, tenant_id, user_id<br/>action, changes (JSONB)<br/>metadata (JSONB)<br/>created_at"]
        
        CSRF_Table["csrf_tokens table<br/>id, session_id<br/>token, expires_at<br/>INDEX: session_id"]
        
        Encryption_Keys["Encryption Keys<br/>Master key in ENV<br/>Per-tenant rotation<br/>Key derivation PBKDF2"]
    end

    subgraph Redis["⚡ REDIS CACHE (Upstash)"]
        RateLimitCache["Rate Limit Cache<br/>Key: user_requests:id:hour<br/>Value: count<br/>TTL: 3600s"]
        SessionCache["Session Cache<br/>Optional: session data<br/>TTL: 7 days<br/>Fast lookup"]
    end

    subgraph External["🌐 EXTERNAL SERVICES"]
        Meta["Meta Graph API<br/>Endpoint: graph.facebook.com<br/>Send OTP via WhatsApp<br/>Template: login_code<br/>Language: en_US<br/>Queue retry: 3x"]
        
        Stripe["Stripe API<br/>Endpoint: api.stripe.com<br/>Create payment intent<br/>Handle webhooks<br/>Webhook secret signed<br/>Fallback: pending"]
        
        Gmail["Gmail SMTP<br/>Host: smtp.gmail.com<br/>Port: 587 TLS<br/>App password auth<br/>Rate: 100/day"]
        
        R2["Cloudflare R2<br/>Endpoint: r2.cloudflarestorage.com<br/>AWS Sig V4 signing<br/>Public URL: pub-*.r2.dev<br/>Bucket: vitalwaveone-receipts"]
    end

    subgraph Monitoring["📊 MONITORING & LOGGING"]
        Vercel_Logs["Vercel Logs<br/>Real-time streaming<br/>Error tracking<br/>Build logs<br/>Function execution"]
        
        GitHub_Actions["GitHub Actions<br/>Push triggers build<br/>npm audit security<br/>Jest unit tests<br/>Playwright E2E<br/>Deploy on success"]
        
        Health_Check["Health Checks<br/>Database connectivity<br/>API response time<br/>External service status<br/>Cache availability"]
    end

    Client -->|HTTPS/TLS 1.3| Frontend
    Frontend -->|REST API + JSON| API
    API -->|Uses| Middleware
    Middleware -->|Validates & Logs| Database
    API -->|Read/Write| Database
    Middleware -->|Check Rate Limit| Redis
    API -->|Publish/Subscribe| External
    GitHub_Actions -->|Deploy| API
    Vercel_Logs -->|Stream Logs| Monitoring

    classDef client fill:#4F46E5,stroke:#312E81,color:#fff,stroke-width:3px
    classDef frontend fill:#3B82F6,stroke:#1E40AF,color:#fff,stroke-width:2px
    classDef api fill:#059669,stroke:#065F46,color:#fff,stroke-width:3px
    classDef middleware fill:#F59E0B,stroke:#92400E,color:#000,stroke-width:2px
    classDef database fill:#DC2626,stroke:#7F1D1D,color:#fff,stroke-width:3px
    classDef cache fill:#EF4444,stroke:#DC2626,color:#fff
    classDef external fill:#8B5CF6,stroke:#5B21B6,color:#fff,stroke-width:2px
    classDef monitor fill:#06B6D4,stroke:#0369A1,color:#fff,stroke-width:2px

    class Client client
    class Frontend frontend
    class API,AuthAPI,DataAPI,FnAPI api
    class Middleware,Auth_Middleware middleware
    class Database,Tenants_Table database
    class Redis,RateLimitCache cache
    class External external
    class Monitoring monitor
```

---

## 1.2 Detailed Request-Response Cycle

```mermaid
sequenceDiagram
    participant User as 👤 User<br/>Browser
    participant App as 🎨 React App<br/>Frontend
    participant Network as 🌐 Network<br/>HTTPS/TLS
    participant Vercel as ⚙️ Vercel<br/>Serverless
    participant Middleware as 🛡️ Middleware<br/>Stack
    participant DB as 💾 PostgreSQL<br/>Neon
    participant External as 🌐 External<br/>Services

    User->>App: Click "Send OTP"
    activate App
    
    Note over App: 1. Frontend Validation
    App->>App: Validate phone with Zod
    App->>App: Generate CSRF token from session
    
    Note over App: 2. Prepare Request
    App->>App: Build request body<br/>{phone, code, csrfToken}
    
    Note over App: 3. Send HTTPS
    App->>Network: POST /send-otp<br/>HTTPS 1.3
    deactivate App
    
    activate Network
    Network->>Vercel: TLS Handshake + Request
    deactivate Network
    
    activate Vercel
    
    Note over Vercel: 4. Parse & Authenticate
    Vercel->>Middleware: Extract session from cookie
    Middleware->>DB: Query sessions table<br/>Check validity
    DB-->>Middleware: ✅ Valid session (expires_at > now)
    
    Note over Vercel: 5. CSRF Validation
    Middleware->>DB: Query csrf_tokens<br/>Match token
    DB-->>Middleware: ✅ Valid CSRF token
    
    Note over Vercel: 6. Rate Limiting
    Middleware->>Middleware: Check Upstash Redis<br/>Key: user_requests:id:hour
    Middleware->>Middleware: Count < 100 limit?
    Middleware-->>Middleware: ✅ Within limits
    
    Note over Vercel: 7. Input Validation
    Middleware->>Middleware: Zod schema validation<br/>Phone format check
    Middleware-->>Middleware: ✅ Valid input
    
    Note over Vercel: 8. Business Logic
    Vercel->>DB: Generate OTP code<br/>6 digits
    Vercel->>DB: INSERT otp_codes<br/>expires_at: now() + 10 min
    DB-->>Vercel: OTP saved
    
    Note over Vercel: 9. External Integration
    Vercel->>External: Send via Meta API<br/>WhatsApp Cloud
    External->>External: Queue message<br/>Retry 3x
    External-->>Vercel: ✅ Message queued<br/>message_id: 789xyz
    
    Note over Vercel: 10. Audit Logging
    Vercel->>DB: INSERT audit_logs<br/>action: 'send_otp'<br/>metadata: {phone, msg_id}
    DB-->>Vercel: Logged
    
    Note over Vercel: 11. Response
    Vercel->>Network: HTTP 200 OK<br/>JSON: {ok: true, expires_at: ...}
    
    deactivate Vercel
    
    activate Network
    Network->>App: HTTPS Response
    deactivate Network
    
    activate App
    
    Note over App: 12. Handle Response
    App->>App: Parse JSON
    App->>App: Update UI state<br/>Show "Check your phone"
    App->>App: Set 10-min timer
    App->>App: localStorage log event
    
    deactivate App
    
    App-->>User: ✅ "Code sent to WhatsApp"
    User->>User: 📱 Receives OTP on WhatsApp
```

---

# SECTION 2: DETAILED DATA MODELS

## 2.1 Complete Entity-Relationship Diagram with Attributes

```mermaid
erDiagram
    TENANTS ||--o{ PROFILES : "has admin users"
    TENANTS ||--o{ DRIVERS : "manages"
    TENANTS ||--o{ CUSTOMERS : "serves"
    TENANTS ||--o{ ORDERS : "receives"
    TENANTS ||--o{ TRUCKS : "owns"
    TENANTS ||--o{ COMPANY : "has config"
    TENANTS ||--o{ INVOICE_SEQUENCES : "tracks invoice #"
    TENANTS ||--o{ AUDIT_LOGS : "logs actions"
    
    PROFILES ||--o{ SESSIONS : "creates"
    DRIVERS ||--o{ SESSIONS : "creates"
    DRIVERS ||--o{ TRUCK_ASSIGNMENTS : "assigned to"
    
    CUSTOMERS ||--o{ ORDERS : "places"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    TRUCKS ||--o{ TRUCK_ASSIGNMENTS : "assigned"
    TRUCKS ||--o{ ROUTES : "travels"
    
    OTP_CODES ||--o{ PROFILES : "sent to"
    CSRF_TOKENS ||--o{ SESSIONS : "protects"

    TENANTS {
        int id PK "Auto-increment"
        string name "Company name (encrypted)"
        string slug UK "URL-safe identifier"
        enum plan "trial|starter|standard|premium"
        enum status "active|suspended|deleted"
        string owner_email "Contact email"
        string owner_name "Owner full name"
        string phone "Business phone (encrypted)"
        int max_trucks "Plan limit"
        int max_customers "Plan limit"
        timestamp trial_ends_at "14-day trial expiry"
        timestamp created_at "Registration date"
        timestamp updated_at "Last modified"
    }

    PROFILES {
        int id PK "User ID"
        int tenant_id FK "Which company"
        string email UK "Login email (encrypted)"
        string phone UK "Login phone (encrypted)"
        string full_name "Display name"
        enum role "admin|accountant|user"
        string password_hash "Bcrypt hash"
        boolean is_active "Soft delete flag"
        timestamp last_login "Last auth"
        timestamp created_at "Join date"
        string avatar_url "Profile picture"
        jsonb preferences "UI settings"
    }

    DRIVERS {
        int id PK "Driver ID"
        int tenant_id FK "Assigned to company"
        string name "Driver name"
        string phone UK "Contact (encrypted)"
        string vehicle_number "Truck ID reference"
        string license_number "License (encrypted)"
        enum status "active|inactive|on-leave"
        string current_location "Last known location"
        int routes_completed "Lifetime stat"
        timestamp hired_date "Employment date"
        jsonb vehicle_info "Vehicle details"
    }

    CUSTOMERS {
        int id PK "Customer ID"
        int tenant_id FK "Which company"
        string business_name "Company name (encrypted)"
        string contact_person "Main contact (encrypted)"
        string phone UK "Order phone (encrypted)"
        string email "Order email (encrypted)"
        string address "Delivery address (encrypted)"
        decimal credit_limit "Max order value"
        decimal balance "Current balance"
        enum status "active|inactive|blocked"
        int total_orders "Lifetime orders"
        decimal total_spent "Lifetime revenue"
        timestamp last_order "Most recent order"
        jsonb tax_info "Tax details"
    }

    ORDERS {
        int id PK "Order ID"
        int tenant_id FK "Company"
        int customer_id FK "Who ordered"
        int truck_id FK "Assigned vehicle"
        string invoice_number "INV-00001"
        enum status "draft|pending|confirmed|shipped|delivered|cancelled"
        decimal subtotal "Before tax"
        decimal tax_amount "Calculated"
        decimal total_amount "Final price"
        jsonb items "Order items JSONB"
        string delivery_notes "Special instructions"
        timestamp order_date "When placed"
        timestamp delivery_date "Promised delivery"
        timestamp actual_delivery "Actual delivery"
        string created_by "Admin user email"
        jsonb metadata "Extra fields"
    }

    ORDER_ITEMS {
        int id PK "Item ID"
        int order_id FK "Which order"
        string product_sku "Product code"
        string product_name "Description"
        int quantity "Units ordered"
        decimal unit_price "Price per unit"
        decimal total_price "qty * unit_price"
        decimal discount "Item discount"
        string batch_number "Inventory batch"
    }

    TRUCKS {
        int id PK "Truck ID"
        int tenant_id FK "Company owner"
        string vehicle_number UK "License plate"
        string vehicle_type "Sedan|Van|Truck"
        string driver_phone "Contact (encrypted)"
        enum status "available|in-route|maintenance"
        int capacity_units "Max load"
        decimal fuel_cost_per_km "Operating cost"
        timestamp registered_date "Registration date"
        timestamp last_maintenance "Service date"
        jsonb gps_data "Last location"
    }

    TRUCK_ASSIGNMENTS {
        int id PK "Assignment ID"
        int truck_id FK "Vehicle"
        int driver_id FK "Driver"
        int order_id FK "Delivery task"
        enum status "assigned|in-progress|completed|failed"
        timestamp assigned_at "Assignment time"
        timestamp started_at "Pickup time"
        timestamp completed_at "Delivery time"
        string route_details "Path taken"
    }

    ROUTES {
        int id PK "Route ID"
        int tenant_id FK "Company"
        string route_name "Route identifier"
        jsonb waypoints "JSONB array of coordinates"
        int estimated_hours "Time estimate"
        enum frequency "daily|weekly|monthly"
        timestamp created_at "Route created"
    }

    SESSIONS {
        int id PK "Session ID"
        string token UK "Secure token (32 bytes)"
        int user_id FK "Profile or Driver ID"
        enum user_type "admin|driver|customer"
        int tenant_id FK "Company context"
        boolean is_active "Logout flag"
        timestamp expires_at "7 days from creation"
        timestamp created_at "Login time"
        string ip_address "Client IP (logged)"
        string user_agent "Browser info (logged)"
    }

    COMPANY {
        int id PK "Config ID"
        int tenant_id FK UK "One per company"
        string meta_phone_id "WhatsApp business ID"
        string meta_token "API token (encrypted)"
        string meta_token_expires "Token expiry date"
        string gmail_user "Email address"
        string gmail_app_password "App password (encrypted)"
        boolean email_enabled "Feature flag"
        boolean whatsapp_enabled "Feature flag"
        jsonb branding "Logo, colors, etc"
        jsonb payment_settings "Stripe config"
    }

    OTP_CODES {
        int id PK "OTP ID"
        string phone UK "Target phone"
        string code UK "6-digit code"
        enum purpose "login|reset_password|verify_email"
        boolean used "Redemption flag"
        timestamp used_at "When redeemed"
        int attempts "Failed attempts"
        timestamp expires_at "10 minutes"
        timestamp created_at "Generation time"
    }

    CSRF_TOKENS {
        int id PK "Token ID"
        int session_id FK UK "Which session"
        string token UK "CSRF token (32 bytes)"
        timestamp expires_at "Session expiry"
        string page_url "Origin page"
    }

    AUDIT_LOGS {
        int id PK "Log ID"
        int tenant_id FK "Company context"
        int user_id FK "Who did it"
        string action "create|update|delete"
        string resource_type "orders|customers|drivers"
        int resource_id "What changed"
        jsonb changes "Before/after values"
        jsonb metadata "IP, user agent, etc"
        string ip_address "Client IP"
        timestamp created_at "When it happened"
    }

    INVOICE_SEQUENCES {
        int id PK "Sequence ID"
        int tenant_id FK UK "One per company"
        int current_number "Current counter"
        timestamp last_generated "Last invoice date"
        int sequence_reset_day "Reset monthly?"
    }
```

---

# SECTION 3: SECURITY SPECIFICATIONS

## 3.1 Detailed Security Architecture

```mermaid
graph TB
    subgraph L1["🔒 LAYER 1: TRANSPORT SECURITY"]
        TLS["TLS 1.3 Encryption<br/>256-bit cipher<br/>AEAD mode"]
        HSTS["HTTP Strict Transport<br/>max-age: 31536000<br/>includeSubDomains<br/>preload"]
        CSP["Content Security Policy<br/>default-src: self<br/>script-src: self cdn.jsdelivr.net<br/>img-src: self data https:<br/>connect-src: self"]
        CookieSec["Secure Cookies<br/>HttpOnly flag<br/>Secure flag<br/>SameSite=Strict<br/>Domain: vitalwaveone.com"]
    end

    subgraph L2["🔒 LAYER 2: API SECURITY"]
        CORS["CORS Configuration<br/>Origin: vitalwaveone.com<br/>Methods: GET,POST,PUT<br/>Credentials: include<br/>MaxAge: 3600"]
        RateLimit["Rate Limiting<br/>Per-user: 100/hour<br/>Global: 1000/min<br/>Redis backed<br/>Exponential backoff"]
        CSRF["CSRF Token Protection<br/>Token in session<br/>Verify on mutations<br/>Secure generation<br/>32-byte random"]
    end

    subgraph L3["🔒 LAYER 3: AUTHENTICATION"]
        OTP["WhatsApp OTP Auth<br/>6-digit code<br/>10-min expiry<br/>3 attempts max<br/>Rate limited"]
        Session["Session Management<br/>Server-side sessions<br/>7-day expiry<br/>UUID tokens<br/>Database backed"]
        Token["Token Validation<br/>Check expiration<br/>Verify user type<br/>Confirm tenant_id<br/>Check is_active flag"]
    end

    subgraph L4["🔒 LAYER 4: AUTHORIZATION"]
        TenantCheck["Tenant Isolation<br/>Filter by tenant_id<br/>Block cross-tenant<br/>Validate ownership<br/>Audit access"]
        RoleCheck["Role-Based Access<br/>admin: full access<br/>user: read own<br/>driver: route data<br/>customer: orders only"]
        Permissions["Permission Matrix<br/>create, read<br/>update, delete<br/>export, audit"]
    end

    subgraph L5["🔒 LAYER 5: DATA SECURITY"]
        Encryption["Field Encryption<br/>AES-256-GCM<br/>Sensitive fields<br/>Key rotation<br/>CryptoJS library"]
        Hashing["Password Hashing<br/>bcrypt 12 rounds<br/>Salted<br/>Never stored plain<br/>Never in logs"]
        AuditLog["Audit Logging<br/>All mutations<br/>JSONB changes<br/>User tracking<br/>Immutable logs"]
        Masking["Data Masking<br/>PII in logs<br/>Last 4 digits<br/>Phone masked<br/>Email masked"]
    end

    subgraph L6["🔒 LAYER 6: INPUT VALIDATION"]
        Schema["Zod Schema<br/>Type checking<br/>Range validation<br/>Pattern matching<br/>Custom rules"]
        Sanitize["Input Sanitization<br/>Remove HTML tags<br/>Escape special chars<br/>Normalize spacing<br/>SQL escape"]
        Length["Length Limits<br/>String max 1000<br/>Array max 1000<br/>File max 50MB<br/>Prevent DOS"]
    end

    subgraph L7["🔒 LAYER 7: ERROR HANDLING"]
        ErrorLog["Error Logging<br/>Stack traces<br/>Request context<br/>User identity<br/>Timestamp"]
        ErrorMask["Error Masking<br/>User-friendly msgs<br/>No PII in errors<br/>Generic for unknown<br/>Specific for validation"]
        ErrorRecovery["Graceful Fallback<br/>Transaction rollback<br/>State consistency<br/>User notification<br/>Alert ops team"]
    end

    subgraph L8["🔒 LAYER 8: MONITORING"]
        Logging["Comprehensive Logging<br/>Access logs<br/>Audit trails<br/>Error logs<br/>Performance logs"]
        Alerting["Alert System<br/>Failed auth attempts<br/>Rate limit abuse<br/>Database errors<br/>External API failures"]
        Compliance["Compliance Tracking<br/>GDPR compliance<br/>Data retention<br/>User consent<br/>Export capability"]
    end

    TLS --> CORS
    HSTS --> CORS
    CSP --> CORS
    CookieSec --> CORS
    CORS --> OTP
    RateLimit --> OTP
    CSRF --> OTP
    OTP --> TenantCheck
    Session --> TenantCheck
    Token --> TenantCheck
    TenantCheck --> Encryption
    RoleCheck --> Encryption
    Permissions --> Encryption
    Encryption --> Schema
    Hashing --> Schema
    AuditLog --> Schema
    Masking --> Schema
    Schema --> ErrorLog
    Sanitize --> ErrorLog
    Length --> ErrorLog
    ErrorLog --> Logging
    ErrorMask --> Logging
    ErrorRecovery --> Logging
    Logging --> Alerting
    Alerting --> Compliance

    style L1 fill:#EF4444,color:#fff,stroke:#7F1D1D,stroke-width:3px
    style L2 fill:#F97316,color:#fff,stroke:#92400E,stroke-width:2px
    style L3 fill:#EAB308,color:#000,stroke:#713F12,stroke-width:2px
    style L4 fill:#84CC16,color:#000,stroke:#365314,stroke-width:2px
    style L5 fill:#22C55E,color:#fff,stroke:#15803D,stroke-width:2px
    style L6 fill:#10B981,color:#fff,stroke:#065F46,stroke-width:2px
    style L7 fill:#06B6D4,color:#fff,stroke:#0369A1,stroke-width:2px
    style L8 fill:#0EA5E9,color:#fff,stroke:#0C4A6E,stroke-width:2px
```

---

# SECTION 4: USER JOURNEY MAPS

## 4.1 Admin User Journey: Order Management

```mermaid
userJourney
    title Admin Order Management Flow
    section Discovery
      Login: 5: Admin
      View Dashboard: 5: Admin
      Click Orders: 4: Admin
    section Interaction
      Filter Orders: 4: Admin
      Review Order Details: 4: Admin
      Check Customer Info: 3: Admin
      Assign Truck: 4: Admin
    section Processing
      Update Order Status: 5: Admin
      Send Invoice Email: 4: Admin
      Print Invoice: 4: Admin
    section Resolution
      Mark as Delivered: 5: Admin
      View Analytics: 3: Admin
      Export Report: 4: Admin
```

## 4.2 Customer Journey: Place Order

```mermaid
userJourney
    title Customer Order Placement Flow
    section Discovery
      Visit Portal: 5: Customer
      View Products: 4: Customer
      Check Availability: 4: Customer
    section Registration
      Enter Business Info: 4: Customer
      Receive OTP: 5: Customer
      Verify OTP: 4: Customer
    section Ordering
      Add Items: 5: Customer
      Review Cart: 4: Customer
      Enter Delivery Address: 4: Customer
    section Completion
      Submit Order: 5: Customer
      Receive Confirmation: 5: Customer
      Track Order: 4: Customer
```

---

# SECTION 5: ERROR HANDLING & RECOVERY FLOWS

## 5.1 Error Scenarios & Recovery

```mermaid
graph TB
    subgraph Scenarios["Error Scenarios"]
        E1["Auth Failure"]
        E2["OTP Expiry"]
        E3["Network Timeout"]
        E4["Database Error"]
        E5["External API Fail"]
        E6["Validation Error"]
        E7["Rate Limited"]
    end

    subgraph Recovery["Recovery Actions"]
        R1["Redirect to Login<br/>Show error message<br/>Clear stale token"]
        R2["Offer OTP Resend<br/>New code generated<br/>Reset timer"]
        R3["Retry with backoff<br/>Queue for retry<br/>Notify user"]
        R4["Log & Alert<br/>Return 500<br/>Fallback data"]
        R5["Retry Queue<br/>Exponential backoff<br/>Admin alert"]
        R6["Show field errors<br/>Highlight invalid<br/>Suggest fix"]
        R7["Return 429<br/>Suggest wait time<br/>Queue request"]
    end

    subgraph Logging["Logging & Monitoring"]
        L1["ERROR: auth_failed"]
        L2["WARN: otp_expired"]
        L3["WARN: network_timeout"]
        L4["ERROR: db_connection"]
        L5["ERROR: external_api"]
        L6["INFO: validation_error"]
        L7["WARN: rate_limited"]
    end

    E1 --> R1 --> L1
    E2 --> R2 --> L2
    E3 --> R3 --> L3
    E4 --> R4 --> L4
    E5 --> R5 --> L5
    E6 --> R6 --> L6
    E7 --> R7 --> L7

    style E1 fill:#DC2626,color:#fff
    style E2 fill:#DC2626,color:#fff
    style E3 fill:#DC2626,color:#fff
    style E4 fill:#DC2626,color:#fff
    style E5 fill:#DC2626,color:#fff
    style E6 fill:#F59E0B,color:#000
    style E7 fill:#F59E0B,color:#000

    style R1 fill:#10B981,color:#fff
    style R2 fill:#10B981,color:#fff
    style R3 fill:#10B981,color:#fff
    style R4 fill:#10B981,color:#fff
    style R5 fill:#10B981,color:#fff
    style R6 fill:#10B981,color:#fff
    style R7 fill:#10B981,color:#fff
```

---

# SECTION 6: SCALING ARCHITECTURE (Future)

## 6.1 Horizontal Scaling Plan

```mermaid
graph TB
    subgraph Current["Current Architecture"]
        V1["Single Vercel Project<br/>Auto-scaling<br/>~1M req/month<br/>Single DB instance"]
    end

    subgraph Phase1["Phase 1: Read Scaling<br/>10M+ req/month"]
        V1 --> Cache["Add Redis Cache<br/>Query cache<br/>Session cache<br/>Upstash<br/>99% hit rate"]
        Cache --> ReadReplica["PostgreSQL Read Replicas<br/>Neon Replica<br/>Analytics queries<br/>Report generation"]
    end

    subgraph Phase2["Phase 2: Write Scaling<br/>100M+ req/month"]
        ReadReplica --> Queue["Add Message Queue<br/>Kafka/Redis Queue<br/>Background jobs<br/>Email sending"]
        Queue --> Workers["Background Workers<br/>Process async tasks<br/>Report generation<br/>Data sync"]
    end

    subgraph Phase3["Phase 3: Database Scaling<br/>1B+ records"]
        Workers --> Partition["Database Partitioning<br/>By tenant_id<br/>By date<br/>Sharding"]
        Partition --> MultiDB["Multi-Database Setup<br/>Separate DBs<br/>per tenant (optional)<br/>Data warehouse"]
    end

    V1 --> |as traffic grows| Phase1
    Phase1 --> |continued growth| Phase2
    Phase2 --> |massive scale| Phase3

    style V1 fill:#4F46E5,color:#fff
    style Cache fill:#059669,color:#fff
    style ReadReplica fill:#0EA5E9,color:#fff
    style Queue fill:#F59E0B,color:#000
    style Workers fill:#8B5CF6,color:#fff
    style Partition fill:#EC4899,color:#fff
    style MultiDB fill:#14B8A6,color:#fff
```

---

# SECTION 7: DEPLOYMENT & DISASTER RECOVERY

## 7.1 Deployment Pipeline with Safety Gates

```mermaid
graph LR
    subgraph Local["👨‍💻 LOCAL DEVELOPMENT"]
        DEV["Edit Code<br/>Test Locally<br/>npm run dev"]
    end

    subgraph VCS["📦 VERSION CONTROL"]
        PUSH["git push origin<br/>main branch"]
        WEBHOOK["GitHub Webhook<br/>Triggers CI"]
    end

    subgraph CI["✅ AUTOMATED TESTS"]
        UNIT["Jest Unit Tests<br/>80% coverage"]
        E2E["Playwright E2E<br/>Critical paths"]
        LINT["ESLint Check<br/>Code quality"]
        SEC["npm audit<br/>Dependency scan"]
    end

    subgraph Gates["🚪 SAFETY GATES"]
        PASS{"All Tests<br/>PASS?"}
        AUDIT{"Security<br/>OK?"}
        COVERAGE{"Coverage<br>>75%?"}
    end

    subgraph Build["🔨 BUILD PHASE"]
        COMPILE["Compile TypeScript<br/>Bundle assets<br/>Minify code"]
        OPTIMIZE["Optimize Images<br/>Code splitting<br/>Lazy loading"]
    end

    subgraph Deploy["🚀 DEPLOYMENT"]
        VERCEL["Deploy to Vercel<br/>Production build<br/>Edge functions"]
        HEALTH["Health Checks<br/>API responds<br/>DB connects"]
    end

    subgraph Monitor["📊 POST-DEPLOY"]
        LOGS["Stream Logs<br/>Real-time monitoring<br/>Alert on errors"]
        METRICS["Collect Metrics<br/>Response time<br/>Error rate"]
        ROLLBACK["Auto Rollback<br/>If health checks fail<br/>Previous version"]
    end

    DEV --> PUSH
    PUSH --> WEBHOOK
    WEBHOOK --> UNIT
    UNIT --> E2E
    E2E --> LINT
    LINT --> SEC
    SEC --> PASS
    PASS -->|No| Fail["❌ Build Failed<br/>Notify developer<br/>Block deployment"]
    PASS -->|Yes| AUDIT
    AUDIT -->|No| Fail
    AUDIT -->|Yes| COVERAGE
    COVERAGE -->|No| Fail
    COVERAGE -->|Yes| COMPILE
    COMPILE --> OPTIMIZE
    OPTIMIZE --> VERCEL
    VERCEL --> HEALTH
    HEALTH -->|Fail| ROLLBACK
    HEALTH -->|Pass| LOGS
    LOGS --> METRICS
    METRICS --> Monitor

    style DEV fill:#4F46E5,color:#fff
    style VCS fill:#3B82F6,color:#fff
    style CI fill:#10B981,color:#fff
    style Gates fill:#F59E0B,color:#000
    style Build fill:#8B5CF6,color:#fff
    style Deploy fill:#059669,color:#fff
    style Monitor fill:#0EA5E9,color:#fff
    style Fail fill:#DC2626,color:#fff
    style ROLLBACK fill:#EF4444,color:#fff
```

## 7.2 Disaster Recovery Plan

```mermaid
graph TB
    subgraph Disaster["💥 DISASTER SCENARIOS"]
        D1["Database Corruption"]
        D2["Data Breach"]
        D3["Total Service Outage"]
        D4["Data Loss"]
    end

    subgraph Recovery["🔧 RECOVERY PROCESS"]
        R1["Restore from<br/>24-hour backup<br/>Neon point-in-time<br/>< 1 hour RTO"]
        R2["Activate<br/>Incident response<br/>Notify users<br/>Change credentials"]
        R3["Switch to<br/>Secondary Vercel<br/>DNS failover<br/>< 5 min RTO"]
        R4["Restore from<br/>Latest backup<br/>Verify integrity<br/>< 2 hour RTO"]
    end

    subgraph Prevention["🛡️ PREVENTION"]
        P1["Daily Backups<br/>Neon automated<br/>Off-site storage<br/>Encrypted"]
        P2["Security Audits<br/>npm audit<br/>GitHub security<br/>Code review"]
        P3["Load Balancing<br/>Vercel CDN<br/>Geographic<br/>Distribution"]
        P4["Transaction Logs<br/>WAL (Write-Ahead)<br/>Binary logs<br/>Point-in-time"]
    end

    subgraph Testing["🧪 TESTING"]
        T1["Monthly DR Drills<br/>Restore backup<br/>Verify recovery<br/>Document issues"]
        T2["Security Testing<br/>Penetration tests<br/>Vulnerability scan<br/>Code audit"]
        T3["Load Testing<br/>Simulate 10x traffic<br/>Identify bottlenecks<br/>Optimize"]
    end

    D1 --> R1
    D2 --> R2
    D3 --> R3
    D4 --> R4
    
    R1 --> P1
    R2 --> P2
    R3 --> P3
    R4 --> P4
    
    P1 --> T1
    P2 --> T2
    P3 --> T3

    style D1 fill:#DC2626,color:#fff
    style D2 fill:#DC2626,color:#fff
    style D3 fill:#DC2626,color:#fff
    style D4 fill:#DC2626,color:#fff

    style R1 fill:#10B981,color:#fff
    style R2 fill:#10B981,color:#fff
    style R3 fill:#10B981,color:#fff
    style R4 fill:#10B981,color:#fff

    style P1 fill:#059669,color:#fff
    style P2 fill:#059669,color:#fff
    style P3 fill:#059669,color:#fff
    style P4 fill:#059669,color:#fff

    style T1 fill:#0EA5E9,color:#fff
    style T2 fill:#0EA5E9,color:#fff
    style T3 fill:#0EA5E9,color:#fff
```

---

# SECTION 8: PERFORMANCE OPTIMIZATION STRATEGIES

## 8.1 Frontend Optimization

```mermaid
graph TB
    subgraph Bundling["📦 Code Bundling"]
        CS["Code Splitting<br/>By route<br/>Dynamic imports<br/>Lazy loading"]
        Tree["Tree Shaking<br/>Remove unused<br/>terser minify<br/>gzip compression"]
    end

    subgraph Images["🖼️ Image Optimization"]
        WebP["Modern Formats<br/>WebP with fallback<br/>AVIF support<br/>Responsive images"]
        Lazy["Lazy Loading<br/>IntersectionObserver<br/>Progressive JPEG<br/>Blur placeholders"]
    end

    subgraph Caching["💾 Browser Caching"]
        HTTP["HTTP Caching<br/>Cache-Control headers<br/>ETag validation<br/>304 Not Modified"]
        Service["Service Worker<br/>Offline support<br/>Asset caching<br/>Update strategy"]
    end

    subgraph Metrics["📊 Core Web Vitals"]
        LCP["Largest Paint<br/>Target: < 2.5s<br/>Optimize images<br/>Defer scripts"]
        FID["First Input Delay<br/>Target: < 100ms<br/>Break up JS<br/>Use web workers"]
        CLS["Cumulative Shift<br/>Target: < 0.1<br/>Reserve space<br/>Avoid dynamic layout"]
    end

    CS --> Tree
    WebP --> Lazy
    HTTP --> Service
    Tree --> LCP
    Lazy --> LCP
    Service --> FID
    LCP --> CLS
    FID --> CLS

    style Bundling fill:#4F46E5,color:#fff
    style Images fill:#8B5CF6,color:#fff
    style Caching fill:#059669,color:#fff
    style Metrics fill:#0EA5E9,color:#fff
```

---

# APPENDIX: TECHNICAL SPECIFICATIONS

## Capacity Planning

```
Current Limits:
- Vercel: ~1M requests/month (free tier)
- Neon PostgreSQL: 100 simultaneous connections
- Upstash Redis: 10GB free tier
- R2 Storage: First 10GB free

Scaling at:
- 100k users: Upgrade to Vercel Pro ($20/month)
- 1M users: Dedicated Vercel instance
- 10M requests/month: Add read replicas
- 100M records: Database sharding required

RTO/RPO:
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 hour
- Backup frequency: Daily automated
- Retention: 30 days
```

