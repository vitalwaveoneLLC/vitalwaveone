// src/__tests__/e2e/login.e2e.js
// E2E tests for login and authentication flows
import { test, expect } from '@playwright/test';

test.describe('Admin Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test('should send OTP when valid phone is entered', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('(555) 123-4567');

    const sendButton = page.locator('button:has-text("Send OTP")');
    await sendButton.click();

    // Wait for success message or OTP input
    await expect(page.locator('text=Check your phone')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid phone', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('123'); // Too short

    const sendButton = page.locator('button:has-text("Send OTP")');
    await expect(sendButton).toBeDisabled();
  });

  test('should verify OTP and redirect to dashboard', async ({ page }) => {
    // Mock: In real test, use test credentials from database
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('5551234567');

    const sendButton = page.locator('button:has-text("Send OTP")');
    await sendButton.click();

    // Wait for OTP input
    await expect(page.locator('input[placeholder*="OTP"]')).toBeVisible({ timeout: 10000 });

    // Enter test OTP (would be mocked in CI)
    const otpInput = page.locator('input[placeholder*="OTP"]');
    await otpInput.fill('123456');

    const verifyButton = page.locator('button:has-text("Verify")');
    await verifyButton.click();

    // Should redirect to dashboard or show success
    await expect(page.locator('text=Dashboard|Order Portal')).toBeVisible({ timeout: 10000 });
  });

  test('should show rate limit error after 5 failed attempts', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    const sendButton = page.locator('button:has-text("Send OTP")');

    // Make 5 OTP requests
    for (let i = 0; i < 5; i++) {
      await phoneInput.fill('5551234567');
      await sendButton.click();
      await page.locator('text=Check your phone').waitFor();
      await phoneInput.clear(); // Clear for next attempt
    }

    // 6th attempt should be rate limited
    await phoneInput.fill('5551234567');
    await sendButton.click();

    // Check for rate limit error
    await expect(page.locator('text=Too many attempts')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Driver Login Flow', () => {
  test('should login driver with OTP', async ({ page }) => {
    await page.goto('/login?type=driver');

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('5559876543');

    const sendButton = page.locator('button:has-text("Send OTP")');
    await sendButton.click();

    // Verify OTP input appears
    await expect(page.locator('input[placeholder*="OTP"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Session Management', () => {
  test('should maintain session across page reloads', async ({ page, context }) => {
    // Login first (would use test credentials)
    await page.goto('/login');

    // Simulate successful login by setting session cookie
    await context.addCookies([{
      name: 'vitalwaveone_session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
    }]);

    // Navigate to protected page
    await page.goto('/app');

    // Should be logged in (not redirected to login)
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should logout and clear session', async ({ page, context }) => {
    // Set session cookie
    await context.addCookies([{
      name: 'vitalwaveone_session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
    }]);

    await page.goto('/app');

    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.click();

    // Should redirect to home
    await expect(page).toHaveURL('/');

    // Session cookie should be cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'vitalwaveone_session');
    expect(sessionCookie?.value).not.toBe('test-session-token');
  });
});
