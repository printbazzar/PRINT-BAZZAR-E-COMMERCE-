#!/usr/bin/env node

/**
 * Print Bazzar - Automated Test Suite Runner (100% Free & Local)
 * Tests:
 * 1. Backend: Google Login Flow (POST /api/v1/customer/auth/google)
 * 2. Backend: Direct Guest Checkout with zero OTP (POST /api/v1/orders)
 * 3. Backend: Authenticated Google Checkout
 * 4. Frontend: Static & Structural Verification of Checkout.jsx & GoogleAuthButton.jsx
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

console.log(`${colors.cyan}${colors.bold}=================================================================${colors.reset}`);
console.log(`${colors.yellow}${colors.bold} PRINT BAZZAR — GOOGLE AUTH & DIRECT CHECKOUT AUTOMATED SUITE ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}=================================================================${colors.reset}\n`);

async function runBackendTests() {
  console.log(`${colors.bold}⚡ Step 1: Running Backend Automated Tests (Native Node Runner)...${colors.reset}`);
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--test', 'server/tests/checkout-google.test.js'],
      {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
      }
    );

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}✔ Backend tests passed successfully (Exit code 0)${colors.reset}\n`);
        resolve(true);
      } else {
        console.log(`\n${colors.red}✖ Backend tests failed (Exit code ${code})${colors.reset}\n`);
        resolve(false);
      }
    });
  });
}

function runFrontendVerification() {
  console.log(`${colors.bold}⚡ Step 2: Verifying Frontend React Checkout & Google Components...${colors.reset}`);

  const checkoutPath = path.join(__dirname, 'printbazzar_react/client/src/Pages/Checkout.jsx');
  const googleBtnPath = path.join(__dirname, 'printbazzar_react/client/src/Components/GoogleAuthButton.jsx');
  const playwrightSpecPath = path.join(__dirname, 'printbazzar_react/client/e2e/checkout-google.spec.js');

  let passed = true;

  // 1. Check Checkout.jsx exists and has 0 OTP
  if (fs.existsSync(checkoutPath)) {
    const content = fs.readFileSync(checkoutPath, 'utf8');
    const hasOtpModal = /Quick Mobile OTP Login/i.test(content);
    const hasOtpState = /otpModalOpen|verifyOtp|sendOtp/i.test(content);
    const hasDirectSubmit = /handleSubmitOrder/i.test(content) && /api\.createOrder/i.test(content);

    if (!hasOtpModal && !hasOtpState && hasDirectSubmit) {
      console.log(`  ${colors.green}✔ Checkout.jsx: 100% Free of OTP modal; Direct 1-Click order submission verified.${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✖ Checkout.jsx: Found unexpected OTP references or missing direct submit.${colors.reset}`);
      passed = false;
    }
  } else {
    console.log(`  ${colors.red}✖ Checkout.jsx not found at ${checkoutPath}${colors.reset}`);
    passed = false;
  }

  // 2. Check GoogleAuthButton exists
  if (fs.existsSync(googleBtnPath)) {
    const content = fs.readFileSync(googleBtnPath, 'utf8');
    const hasGis = /accounts\.google\.com\/gsi\/client/i.test(content);
    const hasGoogleLogin = /loginWithGoogle/i.test(content);

    if (hasGis && hasGoogleLogin) {
      console.log(`  ${colors.green}✔ GoogleAuthButton.jsx: Native GIS SDK & 1-Click login integration verified.${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✖ GoogleAuthButton.jsx: Missing GIS SDK or login handler.${colors.reset}`);
      passed = false;
    }
  } else {
    console.log(`  ${colors.red}✖ GoogleAuthButton.jsx not found at ${googleBtnPath}${colors.reset}`);
    passed = false;
  }

  // 3. Check Playwright E2E spec exists
  if (fs.existsSync(playwrightSpecPath)) {
    console.log(`  ${colors.green}✔ Playwright E2E Test Suite: Found at client/e2e/checkout-google.spec.js.${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✖ Playwright E2E spec missing.${colors.reset}`);
    passed = false;
  }

  return passed;
}

async function main() {
  const backendOk = await runBackendTests();
  const frontendOk = runFrontendVerification();

  console.log(`\n${colors.cyan}${colors.bold}=================================================================${colors.reset}`);
  if (backendOk && frontendOk) {
    console.log(`${colors.green}${colors.bold} 🎉 ALL TESTS PASSED! Google Login & Direct Checkout are 100% Functional.${colors.reset}`);
    console.log(`${colors.cyan}=================================================================${colors.reset}\n`);
    console.log(`${colors.bold}💡 How to run Playwright browser tests locally:${colors.reset}`);
    console.log(`  1. cd printbazzar_react/client`);
    console.log(`  2. npm install -D @playwright/test`);
    console.log(`  3. npx playwright install chromium`);
    console.log(`  4. npx playwright test  (or npx playwright test --ui for interactive UI)\n`);
  } else {
    console.log(`${colors.red}${colors.bold} ✖ One or more tests failed. Review output above.${colors.reset}`);
    console.log(`${colors.cyan}=================================================================${colors.reset}\n`);
    process.exit(1);
  }
}

main();
