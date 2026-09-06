import { test, expect } from '@playwright/test';

test.describe('Print Bazzar: Frontend Checkout & Google Auth E2E Tests', () => {
  const sampleCartItem = {
    cartItemId: 'test-cart-item-1',
    product: {
      id: 'f3f1bada-03de-476d-a67d-d4eee5dfa18b',
      name: 'Economical Business Cards',
      slug: 'economical-card',
      startingPrice: 460,
      thumbnailUrl: '/assets/business_cards-DjvkksgX.png',
    },
    quantity: 100,
    unitPrice: 4.6,
    totalPrice: 460,
    selectedOptions: {
      'Paper Type': '350 GSM Art Card',
      'Print Side': 'Front & Back Multi-Color',
    },
    artworkOption: 'PRINT_READY_FILE',
    termsAccepted: true,
  };

  test.beforeEach(async ({ page }) => {
    // Prime localStorage with cart item before checkout page loads
    await page.addInitScript((item) => {
      localStorage.setItem('pb_cart', JSON.stringify([item]));
    }, sampleCartItem);
  });

  test('Direct Checkout: Submits order with 0 OTP popups or barriers', async ({ page }) => {
    // 1. Visit checkout
    await page.goto('/checkout');
    await expect(page.locator('text=Secure Checkout')).toBeVisible();

    // 2. Fill Customer Contact Details
    await page.locator('input[name="customerName"]').fill('Suresh Babu');
    await page.locator('input[name="customerMobile"]').fill('9876543210');
    await page.locator('input[name="customerEmail"]').fill('suresh.babu@example.com');

    // 3. Choose Store Pickup (Zero delivery fee & no street address required)
    await page.locator('text=Direct Store Self-Pickup').click();

    // 4. Select Cash on Delivery / Pay at Shop Pickup
    await page.locator('select[name="paymentMethod"]').selectOption('CASH');

    // 5. CRITICAL VERIFICATION: Ensure "Quick Mobile OTP Login" is completely absent
    const otpModalHeading = page.locator('text=Quick Mobile OTP Login');
    await expect(otpModalHeading).toHaveCount(0);

    const otpInput = page.locator('input[name="otp"]');
    await expect(otpInput).toHaveCount(0);

    // 6. Click submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 7. Verify processing state & seamless redirection to order confirmation
    await expect(page).toHaveURL(/.*order-confirmation/, { timeout: 15000 });
    await expect(page.locator('text=Order Confirmed').or(page.locator('text=Order Details'))).toBeVisible();

    // Final assertion: Confirm no OTP modal ever interrupted the flow
    await expect(page.locator('text=Quick Mobile OTP Login')).toHaveCount(0);
  });

  test('Google Login Flow: "Continue with Google" triggers and auto-populates checkout', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('text=Secure Checkout')).toBeVisible();

    // 1. Check that "Continue with Google" button is visible
    const googleBtn = page.locator('button:has-text("Continue with Google")');
    await expect(googleBtn).toBeVisible();

    // 2. Mock / Intercept Google Auth backend endpoint for predictable offline E2E test
    await page.route('**/api/v1/customer/auth/google', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Welcome back, Vikram R!',
          token: 'mock-google-jwt-token-12345',
          customer: {
            id: 'cust-google-mock-1',
            name: 'Vikram R',
            email: 'vikram.ram@example.com',
            mobile: '9840123456',
            address: '42 Main Road',
            city: 'Tiruchirappalli',
            pincode: '620008',
          },
        }),
      });
    });

    // 3. Click Google Auth button
    await googleBtn.click();

    // In local dev/testing without Google API keys, the built-in fast demo modal appears
    const devEmailInput = page.locator('input[placeholder="Enter your email or select below"]');
    if (await devEmailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await devEmailInput.fill('vikram.ram@example.com');
      await page.locator('button:has-text("Sign In Instantly")').click();
    }

    // 4. Verify customer name & email are autofilled in checkout
    await expect(page.locator('input[name="customerName"]')).toHaveValue(/Vikram/i, { timeout: 8000 });
    await expect(page.locator('input[name="customerEmail"]')).toHaveValue('vikram.ram@example.com');

    // 5. Verify "Logged In" badge appears
    await expect(page.locator('text=Logged In')).toBeVisible();
  });
});
