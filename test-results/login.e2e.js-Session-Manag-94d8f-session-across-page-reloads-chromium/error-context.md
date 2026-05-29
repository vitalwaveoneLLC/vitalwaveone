# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.e2e.js >> Session Management >> should maintain session across page reloads
- Location: src\__tests__\e2e\login.e2e.js:93:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Dashboard')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Dashboard')

```

```yaml
- button "R RouteFlow"
- text: 💬
- heading "Sign in with WhatsApp" [level=2]
- paragraph: Enter your phone number and we'll send you a verification code via WhatsApp
- text: Phone number
- textbox "+1 (555) 000-0000"
- button "Send WhatsApp code →"
- paragraph:
  - text: Don't have an account?
  - link "Start free trial":
    - /url: /signup
- text: 🔒 Secure OTP 💬 Via WhatsApp ⏱ 10 min expiry
```

# Test source

```ts
  12  |     await expect(page.locator('input[type="tel"]')).toBeVisible();
  13  |   });
  14  | 
  15  |   test('should send OTP when valid phone is entered', async ({ page }) => {
  16  |     const phoneInput = page.locator('input[type="tel"]');
  17  |     await phoneInput.fill('(555) 123-4567');
  18  | 
  19  |     const sendButton = page.locator('button:has-text("Send OTP")');
  20  |     await sendButton.click();
  21  | 
  22  |     // Wait for success message or OTP input
  23  |     await expect(page.locator('text=Check your phone')).toBeVisible({ timeout: 5000 });
  24  |   });
  25  | 
  26  |   test('should show error for invalid phone', async ({ page }) => {
  27  |     const phoneInput = page.locator('input[type="tel"]');
  28  |     await phoneInput.fill('123'); // Too short
  29  | 
  30  |     const sendButton = page.locator('button:has-text("Send OTP")');
  31  |     await expect(sendButton).toBeDisabled();
  32  |   });
  33  | 
  34  |   test('should verify OTP and redirect to dashboard', async ({ page }) => {
  35  |     // Mock: In real test, use test credentials from database
  36  |     const phoneInput = page.locator('input[type="tel"]');
  37  |     await phoneInput.fill('5551234567');
  38  | 
  39  |     const sendButton = page.locator('button:has-text("Send OTP")');
  40  |     await sendButton.click();
  41  | 
  42  |     // Wait for OTP input
  43  |     await expect(page.locator('input[placeholder*="OTP"]')).toBeVisible({ timeout: 10000 });
  44  | 
  45  |     // Enter test OTP (would be mocked in CI)
  46  |     const otpInput = page.locator('input[placeholder*="OTP"]');
  47  |     await otpInput.fill('123456');
  48  | 
  49  |     const verifyButton = page.locator('button:has-text("Verify")');
  50  |     await verifyButton.click();
  51  | 
  52  |     // Should redirect to dashboard or show success
  53  |     await expect(page.locator('text=Dashboard|Order Portal')).toBeVisible({ timeout: 10000 });
  54  |   });
  55  | 
  56  |   test('should show rate limit error after 5 failed attempts', async ({ page }) => {
  57  |     const phoneInput = page.locator('input[type="tel"]');
  58  |     const sendButton = page.locator('button:has-text("Send OTP")');
  59  | 
  60  |     // Make 5 OTP requests
  61  |     for (let i = 0; i < 5; i++) {
  62  |       await phoneInput.fill('5551234567');
  63  |       await sendButton.click();
  64  |       await page.locator('text=Check your phone').waitFor();
  65  |       await phoneInput.clear(); // Clear for next attempt
  66  |     }
  67  | 
  68  |     // 6th attempt should be rate limited
  69  |     await phoneInput.fill('5551234567');
  70  |     await sendButton.click();
  71  | 
  72  |     // Check for rate limit error
  73  |     await expect(page.locator('text=Too many attempts')).toBeVisible({ timeout: 5000 });
  74  |   });
  75  | });
  76  | 
  77  | test.describe('Driver Login Flow', () => {
  78  |   test('should login driver with OTP', async ({ page }) => {
  79  |     await page.goto('/login?type=driver');
  80  | 
  81  |     const phoneInput = page.locator('input[type="tel"]');
  82  |     await phoneInput.fill('5559876543');
  83  | 
  84  |     const sendButton = page.locator('button:has-text("Send OTP")');
  85  |     await sendButton.click();
  86  | 
  87  |     // Verify OTP input appears
  88  |     await expect(page.locator('input[placeholder*="OTP"]')).toBeVisible({ timeout: 10000 });
  89  |   });
  90  | });
  91  | 
  92  | test.describe('Session Management', () => {
  93  |   test('should maintain session across page reloads', async ({ page, context }) => {
  94  |     // Login first (would use test credentials)
  95  |     await page.goto('/login');
  96  | 
  97  |     // Simulate successful login by setting session cookie
  98  |     await context.addCookies([{
  99  |       name: 'routeflow_session',
  100 |       value: 'test-session-token',
  101 |       domain: 'localhost',
  102 |       path: '/',
  103 |       httpOnly: true,
  104 |       secure: false,
  105 |       sameSite: 'Strict',
  106 |     }]);
  107 | 
  108 |     // Navigate to protected page
  109 |     await page.goto('/app');
  110 | 
  111 |     // Should be logged in (not redirected to login)
> 112 |     await expect(page.locator('text=Dashboard')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  113 | 
  114 |     // Reload page
  115 |     await page.reload();
  116 | 
  117 |     // Should still be logged in
  118 |     await expect(page.locator('text=Dashboard')).toBeVisible();
  119 |   });
  120 | 
  121 |   test('should logout and clear session', async ({ page, context }) => {
  122 |     // Set session cookie
  123 |     await context.addCookies([{
  124 |       name: 'routeflow_session',
  125 |       value: 'test-session-token',
  126 |       domain: 'localhost',
  127 |       path: '/',
  128 |       httpOnly: true,
  129 |       secure: false,
  130 |       sameSite: 'Strict',
  131 |     }]);
  132 | 
  133 |     await page.goto('/app');
  134 | 
  135 |     // Click logout button
  136 |     const logoutButton = page.locator('button:has-text("Logout")');
  137 |     await logoutButton.click();
  138 | 
  139 |     // Should redirect to home
  140 |     await expect(page).toHaveURL('/');
  141 | 
  142 |     // Session cookie should be cleared
  143 |     const cookies = await context.cookies();
  144 |     const sessionCookie = cookies.find(c => c.name === 'routeflow_session');
  145 |     expect(sessionCookie?.value).not.toBe('test-session-token');
  146 |   });
  147 | });
  148 | 
```