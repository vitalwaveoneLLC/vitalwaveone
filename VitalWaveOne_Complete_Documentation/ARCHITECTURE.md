# VitalWaveOne Architecture & UML Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        Web["Web App<br/>React + Vite"]
        Mobile["Mobile App<br/>Capacitor<br/>iOS/Android"]
        Portal["Order Portal<br/>Customer Portal"]
    end

    subgraph Frontend["Frontend Layer"]
        UI["UI Components<br/>Dashboard, Forms"]
        State["State Management<br/>localStorage + React"]
        Auth["Auth Handler<br/>Session & OTP"]
    end

    subgraph API["🔌 API Layer (Vercel Serverless)"]
        AuthAPI["Auth Endpoints<br/>/login, /verify-otp"]
        FnAPI["Functions API<br/>/send-otp, /send-whatsapp"]
        DataAPI["Data API<br/>/data/orders, /data/customers"]
        RpcAPI["RPC API<br/>Custom functions"]
        Upload["Upload API<br/>/storage/upload"]
    end

    subgraph Middleware["Middleware & Security"]
        RateLimit["Rate Limiting<br/>Upstash Redis"]
        CSRF["CSRF Protection<br/>Token Validation"]
        Encryption["Encryption<br/>AES-256"]
        AuditLog["Audit Logging<br/>All mutations"]
        SecHeaders["Security Headers<br/>CSP, HSTS"]
    end

    subgraph Database["💾 Database Layer"]
        PostgreSQL["PostgreSQL<br/>Neon Cloud"]
        Tenants["Tenants<br/>Multi-tenant"]
        Users["Profiles, Drivers<br/>Users"]
        Orders["Orders, Customers<br/>Business Data"]
        Sessions["Sessions, OTP<br/>Temporary"]
    end

    subgraph External["🌐 External Services"]
        Meta["Meta/WhatsApp<br/>OTP & Messages"]
        Stripe["Stripe<br/>Payments"]
        Gmail["Gmail<br/>Email Delivery"]
        R2["Cloudflare R2<br/>File Storage"]
        Upstash["Upstash Redis<br/>Rate Limiting"]
    end

    subgraph Monitoring["📊 Monitoring & Logging"]
        Vercel["Vercel Logs<br/>Deployment & Runtime"]
        GitHub["GitHub Actions<br/>CI/CD & Security Audit"]
        Sentry["Error Tracking<br/>Optional"]
    end

    Client -->|HTTPS| Frontend
    Frontend -->|REST API| API
    API -->|Uses| Middleware
    API -->|CRUD Operations| Database
    API -->|Integration| External
    GitHub -->|Deploy| API
    Vercel -->|Logs| Monitoring

    classDef client fill:#4F46E5,stroke:#312E81,color:#fff
    classDef api fill:#059669,stroke:#065F46,color:#fff
    classDef db fill:#DC2626,stroke:#7F1D1D,color:#fff
    classDef ext fill:#F59E0B,stroke:#92400E,color:#fff
    classDef monitor fill:#8B5CF6,stroke:#5B21B6,color:#fff

    class Client,Frontend client
    class API,Middleware api
    class Database db
    class External ext
    class Monitoring monitor
```

---

## 2. Database Schema (ER Diagram)

```mermaid
erDiagram
    TENANTS ||--o{ PROFILES : has
    TENANTS ||--o{ ORDERS : has
    TENANTS ||--o{ CUSTOMERS : has
    TENANTS ||--o{ TRUCKS : has
    TENANTS ||--o{ DRIVERS : has
    TENANTS ||--o{ COMPANY : has
    TENANTS ||--o{ INVOICE_SEQUENCES : has
    
    PROFILES ||--o{ SESSIONS : has
    DRIVERS ||--o{ SESSIONS : has
    
    ORDERS ||--o{ ORDER_ITEMS : contains
    CUSTOMERS ||--o{ ORDERS : places
    TRUCKS ||--o{ ROUTE_ASSIGNMENTS : assigned_to
    
    AUDIT_LOGS ||--o{ TENANTS : logs_for
    OTP_CODES ||--o{ PROFILES : sent_to
    CSRF_TOKENS ||--o{ SESSIONS : protects

    TENANTS {
        int id PK
        string name
        string slug UK
        string plan
        string status
        timestamp trial_ends_at
        int max_trucks
        int max_customers
    }

    PROFILES {
        int id PK
        int tenant_id FK
        string email
        string phone UK
        string full_name
        string role
        boolean is_active
    }

    DRIVERS {
        int id PK
        int tenant_id FK
        string name
        string phone UK
        string vehicle_number
        boolean is_active
    }

    CUSTOMERS {
        int id PK
        int tenant_id FK
        string business_name
        string contact_person
        string phone
        string email
        string address
        jsonb encrypted_fields
    }

    ORDERS {
        int id PK
        int tenant_id FK
        int customer_id FK
        int truck_id FK
        string status
        decimal total_amount
        timestamp created_at
        timestamp delivered_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        string product_id
        int quantity
        decimal unit_price
    }

    SESSIONS {
        int id PK
        string token UK
        int user_id FK
        string user_type
        int tenant_id FK
        boolean is_active
        timestamp expires_at
    }

    COMPANY {
        int id PK
        int tenant_id FK UK
        string meta_phone_id
        string meta_token
        string gmail_user
        string gmail_app_password
    }

    AUDIT_LOGS {
        int id PK
        int tenant_id FK
        int user_id FK
        string action
        jsonb changes
        jsonb metadata
        timestamp created_at
    }

    OTP_CODES {
        int id PK
        string phone
        string code UK
        boolean used
        timestamp expires_at
        timestamp created_at
    }

    CSRF_TOKENS {
        int id PK
        int session_id FK UK
        string token UK
        timestamp expires_at
    }

    INVOICE_SEQUENCES {
        int id PK
        int tenant_id FK UK
        int current_number
    }

    TRUCKS {
        int id PK
        int tenant_id FK
        string vehicle_number
        string driver_id FK
        string status
    }

    ROUTE_ASSIGNMENTS {
        int id PK
        int truck_id FK
        int driver_id FK
        date assigned_date
        string route
    }
```

---

## 3. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    actor User as User/Admin
    participant App as VitalWaveOne App
    participant API as API (Vercel)
    participant Meta as Meta/WhatsApp
    participant DB as PostgreSQL

    User->>App: Enter phone number
    App->>API: POST /auth/send-otp
    API->>DB: Check if user exists
    API->>Meta: Send OTP via WhatsApp
    Meta-->>User: 📱 OTP Received
    
    User->>App: Enter OTP code
    App->>API: POST /auth/verify-otp
    API->>DB: Verify OTP & find user
    API->>DB: Create session token
    API-->>App: Set httpOnly cookie<br/>vitalwaveone_session
    
    App->>DB: localStorage stores tenant_id
    User->>App: Access dashboard
    App->>API: GET /data/orders<br/>with cookie
    API->>API: validateSession()
    API->>DB: Check session validity
    DB-->>API: ✅ Valid session
    API-->>App: Return user's orders
    
    User->>App: Click Logout
    App->>API: POST /auth/logout
    API->>DB: Invalidate session
    DB-->>API: ✅ Session removed
    API-->>App: Clear cookies
    App->>App: Redirect to /login
```

---

## 4. Data Flow: Order Creation

```mermaid
sequenceDiagram
    actor Customer as Customer
    participant Portal as Order Portal
    participant API as API Layer
    participant Middleware as Middleware
    participant DB as Database
    participant Email as Gmail

    Customer->>Portal: Fill order form
    Portal->>Portal: Validate inputs (Zod)
    Portal->>API: POST /data/orders<br/>CSRF token included
    
    API->>Middleware: Check CSRF token
    Middleware-->>API: ✅ Valid
    
    API->>Middleware: Check rate limit (Upstash)
    Middleware-->>API: ✅ Within limits
    
    API->>Middleware: Encrypt sensitive fields
    Middleware-->>API: Encrypted data
    
    API->>DB: INSERT order
    DB->>DB: Generate invoice number
    DB->>Middleware: Log audit entry
    Middleware-->>DB: Audit recorded
    
    DB-->>API: Order created (ID: 12345)
    
    API->>API: Generate PDF invoice
    API->>Email: Send invoice email
    Email-->>Customer: 📧 Invoice received
    
    API-->>Portal: { ok: true, order_id: 12345 }
    Portal->>Customer: ✅ Order confirmed!
```

---

## 5. API Endpoint Map

```mermaid
graph LR
    subgraph Auth["🔐 Authentication"]
        L["/login<br/>POST"]
        V["/verify-otp<br/>POST"]
        LO["/logout<br/>POST"]
    end

    subgraph Functions["⚙️ Functions"]
        SO["/send-otp<br/>POST"]
        SW["/send-whatsapp<br/>POST"]
        SI["/send-invoice-email<br/>POST"]
        CP["/create-payment<br/>POST"]
    end

    subgraph Data["📊 Data CRUD"]
        DO["/data/orders<br/>GET/POST/PUT"]
        DC["/data/customers<br/>GET/POST/PUT"]
        DT["/data/trucks<br/>GET/POST/PUT"]
        DD["/data/drivers<br/>GET/POST/PUT"]
    end

    subgraph RPC["🔄 RPC"]
        R1["/rpc/function<br/>GET/POST"]
    end

    subgraph Files["📁 Storage"]
        UP["/storage/upload<br/>POST"]
    end

    style Auth fill:#4F46E5,color:#fff
    style Functions fill:#059669,color:#fff
    style Data fill:#DC2626,color:#fff
    style RPC fill:#F59E0B,color:#fff
    style Files fill:#8B5CF6,color:#fff
```

---

## 6. Security Layers

```mermaid
graph TB
    subgraph Layers["Security Layers (Top to Bottom)"]
        L1["🔒 Layer 1: Transport Security<br/>HTTPS + TLS 1.3 + HSTS"]
        L2["🔒 Layer 2: Content Security<br/>CSP Headers + X-Frame-Options"]
        L3["🔒 Layer 3: Authentication<br/>WhatsApp OTP + Session Tokens"]
        L4["🔒 Layer 4: Authorization<br/>Tenant Isolation + Role Checks"]
        L5["🔒 Layer 5: API Protection<br/>CSRF Tokens + Rate Limiting"]
        L6["🔒 Layer 6: Data Protection<br/>AES-256 Encryption + Audit Logs"]
        L7["🔒 Layer 7: Input Validation<br/>Zod Schema Validation"]
        L8["🔒 Layer 8: Error Handling<br/>No sensitive data in errors"]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> L6
    L6 --> L7
    L7 --> L8

    style L1 fill:#DC2626,color:#fff
    style L2 fill:#EA580C,color:#fff
    style L3 fill:#EAB308,color:#000
    style L4 fill:#84CC16,color:#000
    style L5 fill:#22C55E,color:#fff
    style L6 fill:#10B981,color:#fff
    style L7 fill:#06B6D4,color:#fff
    style L8 fill:#0EA5E9,color:#fff
```

---

## 7. Deployment Pipeline

```mermaid
graph LR
    Dev["👨‍💻 Developer<br/>Local Code"]
    Git["📦 GitHub<br/>Repository"]
    Actions["⚙️ GitHub Actions<br/>CI/CD Pipeline"]
    Tests["✅ Tests<br/>Jest + Playwright"]
    Security["🔒 Security Audit<br/>npm audit"]
    Vercel["🚀 Vercel<br/>Build & Deploy"]
    Production["🌐 Production<br/>vitalwaveone.com"]

    Dev -->|git push| Git
    Git -->|Webhook| Actions
    Actions -->|Run| Tests
    Actions -->|Run| Security
    Tests -->|✅ Pass| Vercel
    Security -->|✅ Pass| Vercel
    Vercel -->|Deploy| Production

    style Dev fill:#4F46E5,color:#fff
    style Git fill:#333,color:#fff
    style Actions fill:#059669,color:#fff
    style Tests fill:#F59E0B,color:#000
    style Security fill:#DC2626,color:#fff
    style Vercel fill:#8B5CF6,color:#fff
    style Production fill:#10B981,color:#fff
```

---

## 8. Component Hierarchy

```mermaid
graph TD
    App["<b>App</b><br/>Main Router"]
    
    Auth["<b>Auth Module</b>"]
    Login["LoginPage<br/>OTP Input"]
    Signup["SignupFlow<br/>Registration"]
    
    Dashboard["<b>Dashboard</b><br/>Main Interface"]
    Orders["OrdersPanel<br/>Order List"]
    Customers["CustomersPanel<br/>Customer Mgmt"]
    Trucks["TrucksPanel<br/>Fleet Mgmt"]
    Reports["ReportsPanel<br/>Analytics"]
    Settings["SettingsPanel<br/>Config"]
    
    Portal["<b>OrderPortal</b><br/>Customer Portal"]
    PortalReg["Registration<br/>New Business"]
    PortalOrder["OrderForm<br/>Place Order"]
    PortalHistory["OrderHistory<br/>Past Orders"]
    
    App --> Auth
    App --> Dashboard
    App --> Portal
    
    Auth --> Login
    Auth --> Signup
    
    Dashboard --> Orders
    Dashboard --> Customers
    Dashboard --> Trucks
    Dashboard --> Reports
    Dashboard --> Settings
    
    Portal --> PortalReg
    Portal --> PortalOrder
    Portal --> PortalHistory

    style App fill:#4F46E5,color:#fff
    style Auth fill:#059669,color:#fff
    style Dashboard fill:#DC2626,color:#fff
    style Portal fill:#F59E0B,color:#000
```

---

## 9. Technology Stack

```mermaid
graph TB
    subgraph Frontend["Frontend Stack"]
        React["React 19<br/>UI Library"]
        Vite["Vite<br/>Build Tool"]
        Tailwind["Tailwind CSS<br/>Styling"]
        Capacitor["Capacitor<br/>Mobile Bridge"]
        Zod["Zod<br/>Validation"]
    end

    subgraph Backend["Backend Stack"]
        Node["Node.js<br/>Runtime"]
        Vercel["Vercel<br/>Serverless"]
        Neon["Neon PostgreSQL<br/>Database"]
        Upstash["Upstash Redis<br/>Rate Limiting"]
    end

    subgraph External["External Services"]
        Meta["Meta Graph API<br/>WhatsApp"]
        Stripe["Stripe API<br/>Payments"]
        Gmail["Gmail SMTP<br/>Email"]
        R2["Cloudflare R2<br/>Storage"]
    end

    subgraph DevOps["DevOps & Monitoring"]
        Git["GitHub<br/>Version Control"]
        Actions["GitHub Actions<br/>CI/CD"]
        Playwright["Playwright<br/>E2E Testing"]
        Jest["Jest<br/>Unit Testing"]
    end

    React --> Vite
    Vite --> Tailwind
    React --> Capacitor
    React --> Zod
    
    Node --> Vercel
    Vercel --> Neon
    Vercel --> Upstash
    
    Vercel --> Meta
    Vercel --> Stripe
    Vercel --> Gmail
    Vercel --> R2
    
    Git --> Actions
    Actions --> Playwright
    Actions --> Jest

    style Frontend fill:#4F46E5,color:#fff
    style Backend fill:#059669,color:#fff
    style External fill:#F59E0B,color:#000
    style DevOps fill:#8B5CF6,color:#fff
```

---

## 10. Multi-Tenant Architecture

```mermaid
graph TB
    subgraph Request["Incoming Request"]
        R["Request to<br/>/api/data/orders"]
    end

    subgraph Resolution["Tenant Resolution"]
        Check1{"Extract<br/>tenant_id from:"}
        Cookie["Session Cookie"]
        Header["X-Tenant-ID Header"]
        Query["Query Parameter"]
    end

    subgraph Validation["Tenant Validation"]
        Auth["Authenticate user"]
        Tenant["Load tenant config"]
        Perms["Check permissions"]
    end

    subgraph DataAccess["Data Access"]
        Filter["Filter by tenant_id"]
        Encrypt["Encrypt sensitive fields"]
        Log["Log audit event"]
    end

    subgraph Response["Response"]
        Data["Return tenant-isolated<br/>data only"]
    end

    R --> Check1
    Check1 --> Cookie
    Check1 --> Header
    Check1 --> Query
    Cookie --> Auth
    Header --> Auth
    Query --> Auth
    Auth --> Tenant
    Tenant --> Perms
    Perms --> Filter
    Filter --> Encrypt
    Encrypt --> Log
    Log --> Data

    style Request fill:#4F46E5,color:#fff
    style Resolution fill:#059669,color:#fff
    style Validation fill:#F59E0B,color:#000
    style DataAccess fill:#DC2626,color:#fff
    style Response fill:#10B981,color:#fff
```

---

## Summary

- **Architecture**: Modern, serverless, multi-tenant SaaS
- **Security**: 8-layer defense with encryption, audit logs, rate limiting
- **Scalability**: Serverless backend scales automatically
- **Database**: PostgreSQL with Neon cloud for reliability
- **API**: RESTful with CSRF protection and rate limiting
- **Frontend**: React + Vite with responsive design
- **Mobile**: Capacitor for iOS/Android distribution
- **DevOps**: Automated CI/CD with GitHub Actions & Vercel

