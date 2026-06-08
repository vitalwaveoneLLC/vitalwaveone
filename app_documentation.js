const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, 
        WidthType, BorderStyle, ShadingType, HeadingLevel } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 }
              }
            }
          }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: {
          width: 12240,
          height: 15840
        },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Title
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Wholesale Platform SaaS - App Documentation")]
      }),
      new Paragraph({
        text: "",
        spacing: { after: 200 }
      }),

      // Overview
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. App Overview")]
      }),
      new Paragraph({
        children: [new TextRun("The Wholesale Platform is a comprehensive SaaS (Software as a Service) solution designed for wholesale businesses to manage inventory, orders, customers, and financial operations. The platform consists of two interconnected portals with distinct functionalities and user roles.")]
      }),
      new Paragraph({
        text: ""
      }),

      // Platform Architecture
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Platform Architecture")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("2.1 Two-Portal Structure")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Admin Portal - Backend management and reporting system")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Ordering Portal - Customer-facing system for orders and transactions")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("2.2 Technical Stack")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Database: Neon Database")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Payment Processing: Stripe")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Multi-tenant Architecture: Tenant-based data isolation")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("2.3 Design Requirements")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Modern UI Design with clear, readable fonts")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Full mobile responsiveness: Android and iPhone compatible")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Consistent design language across all portals")]
      }),
      new Paragraph({
        text: ""
      }),

      // Subscription & Registration
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Subscription & Registration Flow")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("3.1 Initial Landing Page")]
      }),
      new Paragraph({
        children: [new TextRun("Users first encounter a landing page where company owners can select from three subscription tiers:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Standard")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Premium")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Diamond")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("3.2 Payment Processing")]
      }),
      new Paragraph({
        children: [new TextRun("Payment is processed through Stripe. Upon successful payment, the company registration begins immediately.")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("3.3 Company & Admin Registration")]
      }),
      new Paragraph({
        children: [new TextRun("After successful Stripe payment, the admin/owner must provide:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Company Information: Name, License, Registration Information")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Documents: Upload registration documents and license files")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Logo: Company logo upload")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Owner/Admin Personal Information:")]
      }),
      new Paragraph({
        text: "     • First Name, Last Name",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Address (separate fields: Street Name, Building/Shop ID, Zip Code, State)",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Email, Phone Number",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("3.4 Customer/Driver/Walk-in Registration")]
      }),
      new Paragraph({
        children: [new TextRun("After subscription is activated, the admin can enable registration for customers, drivers (sales personnel), and walk-in staff. These users must provide:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Personal Information: First Name, Last Name, Email, Phone Number")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Address (separate fields: Street Name, Building/Shop ID, Zip Code, State)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("License & Registration (Customers): Upload license and registration photos, enter license/registration numbers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Approval: All accounts require admin approval before activation")]
      }),
      new Paragraph({
        text: ""
      }),

      // Admin Portal
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. Admin Portal Features")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.1 Inventory Management Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Comprehensive inventory tracking and management system.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Monitor all inventory in real-time (shelf and truck locations)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Track inventory loading and reloading of trucks")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bulk import inventory from CSV template")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Import fields: Product Name, Description, Main Categories, SKU")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Downloadable CSV template for bulk imports")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View inventory on shelf and on trucks separately")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Automatic low-stock alerts to notify admin of restocking needs")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Accurate total inventory count synchronized with sales and truck loading")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.2 Truck Management Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Real-time tracking of trucks, drivers, and daily routes.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Manage all trucks and assigned drivers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View live map with driver and truck locations")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Display customer locations on map with color-coding by assigned driver")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Monitor daily route assignments")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.3 IRS Reports Tab")]
      }),
      new Paragraph({
        children: [new TextRun("File tax-related forms and documentation for products requiring tax compliance.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("File IRS forms for tax-required products")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Generate and export tax compliance reports")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.4 Invoices Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Complete invoice management system with payment tracking.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Filter invoices by status: Paid, Balance Due, Unpaid")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Carry forward balance due from previous invoices to current invoice")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Invoice displays: Company logo/name, customer company name, email, address, phone, date, and time")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Lock invoices from editing once payment is received (read-only status)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bulk payment option to process multiple invoices at once")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("\"Created By\" column showing which team member added each invoice")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Table format with pagination")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.5 Financial Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Comprehensive financial reporting and analytics.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Display all financial KPIs (Key Performance Indicators)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Generate Profit & Loss (P&L) reports")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Financial dashboard with key metrics")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.6 Security & Privacy Settings Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Multi-factor authentication and session management for secure access.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Admin Portal Security:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Multi-Factor Authentication (MFA) required for admin login")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("One-Time Password (OTP) support")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Auto-logout after 10 minutes of inactivity")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Ordering Portal Security:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Face recognition authentication on supported devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("OTP fallback for unsupported devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Authentication required on sign-in or sign-off")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Auto-logout after 15 minutes of inactivity (if user did not manually sign off)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Portal remains active if user did not sign off")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.7 Purchase PO & Suppliers Management Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Control incoming inventory and manage supplier relationships.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create and manage Purchase Orders (POs)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Track supplier information and performance")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Monitor financial transactions with suppliers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Calculate and track expense KPIs")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.8 Return Checks Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Track and manage returned checks and issue notifications.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Flag invoices with returned checks")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Send warning notifications to Admin and Ordering portals")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Display returned check warnings in Invoices tab")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.9 Data Backup Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Secure data backup for disaster recovery.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Backup all data from all portals per tenant/company")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Export as ZIP file containing all CSV files")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("One-click backup functionality")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.10 Customers Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Centralized customer management synchronized across all portals.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View all customer additions from Ordering portal")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Approve new customer registrations")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("\"Created By\" column to identify which team member added each customer")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bulk import customers from CSV template")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Downloadable CSV template")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Table format with pagination")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("4.11 Expenses & Equity Tab")]
      }),
      new Paragraph({
        children: [new TextRun("Track business expenses and equity information.")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Capabilities:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Record all business expenses")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Upload supporting photos and documents")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Track equity information")]
      }),
      new Paragraph({
        text: ""
      }),

      // Ordering Portal
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5. Ordering Portal Features")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("5.1 Authentication & User Types")]
      }),
      new Paragraph({
        children: [new TextRun("Three separate login/signup pathways:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Customers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Drivers (Sales Personnel)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Walk-in Staff")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("5.2 Customer Features")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Ordering & Invoicing:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Place orders and create invoices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Generate and download PDF invoices")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Invoice Management:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View all invoices in table format")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Download invoice PDFs")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Payment Options:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Pay by card (online payment)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Upload check photo for check payments")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Cash payment option")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Pay next time option for future payment")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("5.3 Driver (Sales Personnel) Features")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Truck Loading & Inventory:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Load trucks with inventory")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View shelf inventory in real-time to check product availability")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("See what inventory is remaining on shelf if truck runs out")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Daily Route Management:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("View assigned customers in table format organized by daily route")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Customers displayed in route order (first customer appears first)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Navigation button to start driving to customer")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Modify customer orders before finalizing (if not yet confirmed)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Orders auto-finalize based on first-week schedule")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Order & Sales Processing:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Place orders for assigned customers or other customers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Upon arrival at customer location, sales tab opens automatically")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create and generate invoices for each sale")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Scan product barcodes to create invoices via phone camera")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Payment Processing:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Secure payment collection options:")]
      }),
      new Paragraph({
        text: "     • Cash",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Check (with photo upload and amount entry)",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Money order",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Card payment",
        spacing: { before: 0 }
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Upload payment proof (receipt/photo)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Pay next time option if payment not collected")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Expense Tracking:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Update expense tab during trips (gas, food, maintenance, etc.)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Upload receipts for expense documentation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Submit expenses for admin approval")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Receive notification if admin rejects expense with explanation")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("5.4 Walk-in Staff Features")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Sales & Invoicing:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Create invoices for walk-in customers")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Scan product barcodes for fast invoicing")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Inventory Management:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Update shelf inventory in real-time")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Barcode scanner support for inventory restocking")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Payment Processing:")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Process payments similar to drivers:")]
      }),
      new Paragraph({
        text: "     • Cash",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Check (with photo and amount)",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Money order",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: "     • Card",
        spacing: { before: 0 }
      }),
      new Paragraph({
        text: ""
      }),

      // Data Display Requirements
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6. Data Display & UX Requirements")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("6.1 Table Display")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("All listings displayed in table format (Drivers, Invoices, Inventory, Customers, IRS Reports, etc.)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Pagination support for large datasets")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Sortable columns")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Search and filter capabilities")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("6.2 Design Standards")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Modern, clean UI design")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Clear, readable fonts throughout")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Consistent visual hierarchy")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Intuitive navigation")]
      }),
      new Paragraph({
        text: ""
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("6.3 Mobile Compatibility")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Fully responsive design")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Optimized for Android devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Optimized for iPhone devices")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Touch-friendly interface elements")]
      }),
      new Paragraph({
        text: ""
      }),

      // End of document
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("End of Documentation")]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Wholesale_Platform_App_Documentation.docx", buffer);
  console.log("Document created successfully!");
});
