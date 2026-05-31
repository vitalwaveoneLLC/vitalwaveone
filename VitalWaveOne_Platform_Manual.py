#!/usr/bin/env python3
"""
VitalWaveOne Platform Manual Generator
Generates a comprehensive PDF manual with monitoring and troubleshooting guides
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether
)
from reportlab.lib import colors
from datetime import datetime

# Create PDF
doc = SimpleDocTemplate(
    "C:\\Users\\alsha\\vitalwaveone\\VitalWaveOne_Platform_Manual.pdf",
    pagesize=letter,
    rightMargin=0.75*inch,
    leftMargin=0.75*inch,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch
)

# Define styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#1f4788'),
    spaceAfter=30,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.HexColor('#2563eb'),
    spaceAfter=12,
    spaceBefore=12,
    fontName='Helvetica-Bold'
)

subheading_style = ParagraphStyle(
    'CustomSubHeading',
    parent=styles['Heading3'],
    fontSize=11,
    textColor=colors.HexColor('#1f4788'),
    spaceAfter=8,
    fontName='Helvetica-Bold'
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['Normal'],
    fontSize=10,
    alignment=TA_JUSTIFY,
    spaceAfter=12
)

code_style = ParagraphStyle(
    'Code',
    parent=styles['Normal'],
    fontSize=9,
    fontName='Courier',
    textColor=colors.HexColor('#666666'),
    backColor=colors.HexColor('#f5f5f5'),
    spaceAfter=8,
    leftIndent=20
)

# Build story
story = []

# ==================== COVER PAGE ====================
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("VitalWaveOne", title_style))
story.append(Paragraph("Platform Manual", ParagraphStyle('SubTitle', parent=styles['Heading2'], fontSize=18, textColor=colors.HexColor('#2563eb'), alignment=TA_CENTER)))
story.append(Spacer(1, 0.5*inch))
story.append(Paragraph(
    "Complete Guide to Deployment, Monitoring,<br/>Troubleshooting & Maintenance",
    ParagraphStyle('Subtitle2', parent=styles['Normal'], fontSize=12, alignment=TA_CENTER, textColor=colors.HexColor('#666666'))
))
story.append(Spacer(1, 1*inch))
story.append(Paragraph(
    f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}<br/><b>Version:</b> 1.0<br/><b>Status:</b> Production Ready",
    ParagraphStyle('Meta', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER)
))
story.append(PageBreak())

# ==================== TABLE OF CONTENTS ====================
story.append(Paragraph("Table of Contents", heading_style))
story.append(Spacer(1, 0.2*inch))

toc_items = [
    "1. Platform Overview & Architecture",
    "2. Deployment Guide",
    "3. Monitoring & Health Checks",
    "4. Accessing Logs",
    "5. Common Issues & Troubleshooting",
    "6. Performance Optimization",
    "7. Security Features",
    "8. Database Management",
    "9. Emergency Procedures",
    "10. Quick Reference"
]

for item in toc_items:
    story.append(Paragraph(item, body_style))
    story.append(Spacer(1, 0.1*inch))

story.append(PageBreak())

# ==================== 1. PLATFORM OVERVIEW ====================
story.append(Paragraph("1. Platform Overview & Architecture", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("What is VitalWaveOne?", subheading_style))
story.append(Paragraph(
    "VitalWaveOne is a multi-tenant SaaS platform built with Vite + React 19 (frontend), Node.js (backend), "
    "PostgreSQL (database), and deployed on Vercel. It provides secure data management with encryption, "
    "audit logging, real-time monitoring, mobile support via Capacitor, and payment processing via Stripe.",
    body_style
))

story.append(Paragraph("Key Components", subheading_style))
components_data = [
    ["Component", "Technology", "Status"],
    ["Frontend", "Vite + React 19", "✅ Production"],
    ["Mobile", "Capacitor (iOS/Android)", "✅ Production"],
    ["Backend API", "Node.js + Vercel", "✅ Production"],
    ["Database", "PostgreSQL (Neon)", "✅ Production"],
    ["Cache/Limits", "Redis (Upstash)", "✅ Production"],
    ["Authentication", "Clerk", "✅ Production"],
    ["Payments", "Stripe", "✅ Production"],
    ["Domain", "vitalwaveone.com", "✅ Active"],
]

component_table = Table(components_data, colWidths=[2*inch, 2*inch, 1.5*inch])
component_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db'))
]))
story.append(component_table)
story.append(Spacer(1, 0.3*inch))

story.append(Paragraph("Current Deployment", subheading_style))
story.append(Paragraph(
    "<b>Production URL:</b> https://vitalwaveone.com<br/>"
    "<b>Backup URL:</b> https://vitalwaveone.vercel.app<br/>"
    "<b>Database:</b> PostgreSQL at Neon Cloud<br/>"
    "<b>Mobile Apps:</b> Capacitor-based iOS & Android<br/>"
    "<b>Auto-deployment:</b> GitHub Actions + Vercel integration",
    body_style
))

story.append(PageBreak())

# ==================== 2. DEPLOYMENT GUIDE ====================
story.append(Paragraph("2. Deployment Guide", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Quick Deploy (After Code Changes)", subheading_style))
story.append(Paragraph(
    "Every time you push new code to GitHub main branch, it automatically deploys:",
    body_style
))

deploy_code = """# Manual deployment (if needed)
cd C:\\Users\\alsha\\vitalwaveone
git add -A
git commit -m "your commit message"
git push origin main
# Vercel auto-deploys, or manually:
vercel --prod"""

story.append(Paragraph(deploy_code, code_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Mobile Deployment", subheading_style))
story.append(Paragraph(
    "<b>Build Mobile App:</b><br/>"
    "npm run build:cap<br/>"
    "npx cap sync<br/><br/>"
    "<b>Deploy to iOS:</b><br/>"
    "npx cap open ios (then use Xcode)<br/><br/>"
    "<b>Deploy to Android:</b><br/>"
    "npx cap open android (then use Android Studio)",
    code_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Verify Deployment Success", subheading_style))
story.append(Paragraph(
    "1. Go to Vercel Dashboard → Deployments<br/>"
    "2. Look for newest deployment with green checkmark<br/>"
    "3. Visit https://vitalwaveone.com<br/>"
    "4. Test sign-up and core functionality<br/>"
    "5. Check mobile apps in TestFlight or Firebase Console",
    body_style
))

story.append(PageBreak())

# ==================== 3. MONITORING ====================
story.append(Paragraph("3. Monitoring & Health Checks", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Daily Health Checks", subheading_style))
checks_data = [
    ["Check", "Where", "What to Look For"],
    ["App Loads", "https://vitalwaveone.com", "Page loads in <3 seconds"],
    ["Sign-up Works", "Try creating account", "Account created successfully"],
    ["API Response", "Browser DevTools → Network", "<500ms response time"],
    ["Database", "Neon Console", "Active connections, no errors"],
    ["Build Status", "GitHub Actions", "Latest push: ✅ Green"],
    ["Payment API", "Stripe Dashboard", "No failed charges"],
    ["Mobile Apps", "TestFlight/Firebase", "App version up-to-date"],
]

checks_table = Table(checks_data, colWidths=[1.5*inch, 2*inch, 2*inch])
checks_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f9fafb'), colors.white])
]))
story.append(checks_table)
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("Performance Metrics to Monitor", subheading_style))
story.append(Paragraph(
    "<b>Response Time:</b> Should be <500ms for API calls<br/>"
    "<b>Error Rate:</b> Should be <1%<br/>"
    "<b>Database Connections:</b> Should be <10 concurrent<br/>"
    "<b>Build Time:</b> Should be <5 minutes<br/>"
    "<b>Mobile App Crashes:</b> Should be <0.1%",
    body_style
))

story.append(PageBreak())

# ==================== 4. ACCESSING LOGS ====================
story.append(Paragraph("4. Accessing Logs", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Vercel Deployment Logs", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Go to Vercel Dashboard → VitalWaveOne project<br/>"
    "<b>Step 2:</b> Click 'Deployments' tab<br/>"
    "<b>Step 3:</b> Click any deployment<br/>"
    "<b>Step 4:</b> View 'Logs' tab for build/runtime errors",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("GitHub Actions Logs (CI/CD)", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Go to GitHub → vitalwaveone repo<br/>"
    "<b>Step 2:</b> Click 'Actions' tab<br/>"
    "<b>Step 3:</b> Select any workflow run<br/>"
    "<b>Step 4:</b> View logs for test results and security audits",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Database Audit Logs", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Go to Neon Console → SQL Editor<br/>"
    "<b>Step 2:</b> Run query: <code>SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;</code><br/>"
    "<b>Step 3:</b> View user actions, timestamps, and changes",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Browser Console (Client-side Errors)", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Open app → Press F12<br/>"
    "<b>Step 2:</b> Go to 'Console' tab<br/>"
    "<b>Step 3:</b> Look for red error messages<br/>"
    "<b>Step 4:</b> Check 'Network' tab for failed API calls",
    body_style
))

story.append(PageBreak())

# ==================== 5. TROUBLESHOOTING ====================
story.append(Paragraph("5. Common Issues & Troubleshooting", heading_style))
story.append(Spacer(1, 0.15*inch))

issues = [
    {
        "issue": "App Won't Load / 500 Error",
        "cause": "Database connection, missing env vars, or deployment failed",
        "fix": "1. Check Vercel Deployments logs\n2. Verify DATABASE_URL in Vercel settings\n3. Redeploy: vercel --prod\n4. Check if Neon database is online"
    },
    {
        "issue": "Sign-up/Authentication Fails",
        "cause": "Clerk configuration issue or API key expired",
        "fix": "1. Check Clerk Dashboard for errors\n2. Verify CLERK_API_KEY in Vercel\n3. Check CLERK_WEBHOOK_SECRET\n4. Review Clerk logs for error details"
    },
    {
        "issue": "Payment Processing Fails",
        "cause": "Stripe API key issue, webhook misconfiguration, or account limit",
        "fix": "1. Check Stripe Dashboard for errors\n2. Verify STRIPE_SECRET_KEY in Vercel\n3. Check webhook endpoint status\n4. Review Stripe logs for failed charges"
    },
    {
        "issue": "Mobile App Won't Load",
        "cause": "Old cached version, build issue, or environment variable mismatch",
        "fix": "1. Clear app cache: npx cap sync\n2. Rebuild: npm run build:cap\n3. Check Capacitor config for correct URLs\n4. Reinstall app from TestFlight/Firebase"
    },
    {
        "issue": "Slow Performance",
        "cause": "High database load, missing indexes, or large payloads",
        "fix": "1. Check Neon dashboard for slow queries\n2. Monitor Redis cache hits\n3. Check Vercel function duration\n4. Enable code splitting in Vite"
    },
    {
        "issue": "Data Not Saving",
        "cause": "Database error, validation failure, or encryption issue",
        "fix": "1. Check database audit_logs for errors\n2. Check browser console for validation messages\n3. Verify ENCRYPTION_KEY is set\n4. Check database permissions"
    }
]

for i, issue_dict in enumerate(issues, 1):
    story.append(Paragraph(f"{issue_dict['issue']}", subheading_style))
    story.append(Paragraph(f"<b>Cause:</b> {issue_dict['cause']}", body_style))
    story.append(Paragraph(f"<b>Fix:</b><br/>{issue_dict['fix'].replace(chr(10), '<br/>')}", body_style))
    story.append(Spacer(1, 0.15*inch))

story.append(PageBreak())

# ==================== 6. PERFORMANCE ====================
story.append(Paragraph("6. Performance Optimization", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Frontend Optimization", subheading_style))
story.append(Paragraph(
    "✅ Code splitting enabled (Vite)<br/>"
    "✅ Lazy loading for routes<br/>"
    "✅ Image optimization via CDN<br/>"
    "✅ Minification in production build<br/>"
    "✅ React 19 with concurrent rendering",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Backend Optimization", subheading_style))
story.append(Paragraph(
    "✅ Database indexes on all key columns<br/>"
    "✅ Redis rate limiting<br/>"
    "✅ Parameterized queries (prevent N+1)<br/>"
    "✅ Response compression (gzip)<br/>"
    "✅ Connection pooling for database",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Mobile Optimization", subheading_style))
story.append(Paragraph(
    "✅ Bundle size <5MB<br/>"
    "✅ Lazy loading for modules<br/>"
    "✅ Offline support via service workers<br/>"
    "✅ Capacitor plugin optimization",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Scaling Strategy", subheading_style))
story.append(Paragraph(
    "<b>Current:</b> Vercel Pro plan<br/>"
    "<b>Auto-scaling:</b> Vercel handles load balancing<br/>"
    "<b>Database scaling:</b> Neon auto-scales connections<br/>"
    "<b>Cache scaling:</b> Upstash Redis scales automatically",
    body_style
))

story.append(PageBreak())

# ==================== 7. SECURITY ====================
story.append(Paragraph("7. Security Features", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Implemented Security", subheading_style))

security_data = [
    ["Feature", "Implementation", "Status"],
    ["Encryption", "AES-256 for sensitive fields", "✅ Active"],
    ["HTTPS", "TLS/SSL enforced", "✅ Active"],
    ["CSRF Protection", "Token validation on mutations", "✅ Active"],
    ["Rate Limiting", "Per-user rate limiting via Redis", "✅ Active"],
    ["Audit Logging", "All mutations logged", "✅ Active"],
    ["Sessions", "httpOnly cookies, SameSite=Strict", "✅ Active"],
    ["CSP Headers", "XSS protection enabled", "✅ Active"],
    ["Payment Security", "PCI-DSS compliant via Stripe", "✅ Active"],
    ["Auth", "Clerk with MFA support", "✅ Active"],
]

security_table = Table(security_data, colWidths=[1.5*inch, 2.5*inch, 1.2*inch])
security_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fdf4')),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1fae5'))
]))
story.append(security_table)
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("What to Monitor", subheading_style))
story.append(Paragraph(
    "• GitHub Actions security audit (daily)<br/>"
    "• Audit logs for suspicious activity<br/>"
    "• Failed login attempts (Clerk Dashboard)<br/>"
    "• Stripe fraud alerts<br/>"
    "• Unusual data access patterns",
    body_style
))

story.append(PageBreak())

# ==================== 8. DATABASE ====================
story.append(Paragraph("8. Database Management", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Backup Strategy", subheading_style))
story.append(Paragraph(
    "<b>Neon Automatic:</b> Backups every 24 hours<br/>"
    "<b>Manual Backup:</b> Export via Neon Console<br/>"
    "<b>Retention:</b> 7 days minimum<br/>"
    "<b>Test Restores:</b> Monthly",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Useful Database Queries", subheading_style))
story.append(Paragraph(
    "<b>View Recent Audit Logs:</b><br/>"
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;<br/><br/>"
    "<b>Check User Sessions:</b><br/>"
    "SELECT * FROM sessions WHERE expires_at > NOW();<br/><br/>"
    "<b>Database Size:</b><br/>"
    "SELECT pg_size_pretty(pg_database_size(current_database()));",
    code_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Maintenance Tasks", subheading_style))
story.append(Paragraph(
    "• Weekly: Check audit log size (cleanup old logs)<br/>"
    "• Monthly: Analyze slow queries<br/>"
    "• Quarterly: Vacuum and analyze tables<br/>"
    "• Yearly: Major version upgrades",
    body_style
))

story.append(PageBreak())

# ==================== 9. EMERGENCY ====================
story.append(Paragraph("9. Emergency Procedures", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("If App is Down", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Check Vercel Deployments status page<br/>"
    "<b>Step 2:</b> View build logs for errors<br/>"
    "<b>Step 3:</b> Run locally: npm run build && npm run dev<br/>"
    "<b>Step 4:</b> Redeploy: vercel --prod<br/>"
    "<b>Step 5:</b> If still down: Check GitHub Actions for CI failures",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("If Database is Down", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Go to Neon Console<br/>"
    "<b>Step 2:</b> Check project status<br/>"
    "<b>Step 3:</b> Try restarting compute<br/>"
    "<b>Step 4:</b> Restore from backup if corrupted<br/>"
    "<b>Step 5:</b> Update DATABASE_URL in Vercel if needed",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("If Data Loss Occurs", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Stop all deployments<br/>"
    "<b>Step 2:</b> Go to Neon Backups<br/>"
    "<b>Step 3:</b> Restore to point-in-time<br/>"
    "<b>Step 4:</b> Verify restore completeness<br/>"
    "<b>Step 5:</b> Redeploy application",
    body_style
))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("If Payments are Failing", subheading_style))
story.append(Paragraph(
    "<b>Step 1:</b> Check Stripe Dashboard → Logs<br/>"
    "<b>Step 2:</b> Verify STRIPE_SECRET_KEY in Vercel<br/>"
    "<b>Step 3:</b> Check webhook endpoint is responding<br/>"
    "<b>Step 4:</b> Review Stripe documentation for error codes<br/>"
    "<b>Step 5:</b> Contact Stripe support if needed",
    body_style
))

story.append(PageBreak())

# ==================== 10. QUICK REFERENCE ====================
story.append(Paragraph("10. Quick Reference", heading_style))
story.append(Spacer(1, 0.15*inch))

story.append(Paragraph("Critical URLs", subheading_style))
story.append(Paragraph(
    "<b>App:</b> https://vitalwaveone.com<br/>"
    "<b>Vercel Dashboard:</b> https://vercel.com/dashboards<br/>"
    "<b>GitHub Repo:</b> https://github.com/vitalwaveoneLLC/vitalwaveone<br/>"
    "<b>Neon Database:</b> https://console.neon.tech<br/>"
    "<b>GitHub Actions:</b> https://github.com/vitalwaveoneLLC/vitalwaveone/actions<br/>"
    "<b>Clerk Dashboard:</b> https://dashboard.clerk.com<br/>"
    "<b>Stripe Dashboard:</b> https://dashboard.stripe.com",
    body_style
))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("Critical Commands", subheading_style))
story.append(Paragraph(
    "<b>Deploy to production:</b><br/>"
    "vercel --prod<br/><br/>"
    "<b>Run locally:</b><br/>"
    "npm run dev<br/><br/>"
    "<b>Build for production:</b><br/>"
    "npm run build<br/><br/>"
    "<b>Build mobile app:</b><br/>"
    "npm run build:cap<br/><br/>"
    "<b>Run tests:</b><br/>"
    "npm test<br/><br/>"
    "<b>Check npm vulnerabilities:</b><br/>"
    "npm audit",
    code_style
))
story.append(Spacer(1, 0.2*inch))

story.append(Paragraph("Environment Variables (Vercel)", subheading_style))
story.append(Paragraph(
    "• DATABASE_URL (Neon connection)<br/>"
    "• ENCRYPTION_KEY (AES-256)<br/>"
    "• UPSTASH_REDIS_REST_URL<br/>"
    "• UPSTASH_REDIS_REST_TOKEN<br/>"
    "• CLERK_API_KEY (Authentication)<br/>"
    "• CLERK_WEBHOOK_SECRET<br/>"
    "• STRIPE_SECRET_KEY (Payments)<br/>"
    "• NODE_ENV=production<br/>"
    "• All must be set in Production environment",
    body_style
))

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph(
    "For detailed security information, see: SECURITY_HARDENING_GUIDE.md<br/>"
    "For deployment details, see: VERCEL_DEPLOYMENT_PLAYBOOK.md<br/>"
    "For architecture details, see: ARCHITECTURE.md<br/>"
    "<b>Last Updated:</b> May 28, 2026",
    ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#666666'), alignment=TA_CENTER)
))

# Build PDF
doc.build(story)
print("✅ VitalWaveOne Platform Manual created successfully!")
print("📄 File: C:\\Users\\alsha\\vitalwaveone\\VitalWaveOne_Platform_Manual.pdf")
