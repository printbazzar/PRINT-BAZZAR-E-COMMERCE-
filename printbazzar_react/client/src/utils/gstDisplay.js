/**
 * TASK #30 — GST-inclusive display helper for pre-checkout summaries (Cart, Checkout).
 *
 * This file exists ONLY to fix a frontend display bug: Cart.jsx, Checkout.jsx and
 * CartContext.jsx each independently computed an "included GST" figure using
 * `subtotal * rate / 100`. That formula is wrong for a GST-INCLUSIVE price — it
 * computes what an ADDITIONAL rate% would be on top of the inclusive figure, which
 * overstates the tax actually embedded in it (e.g. it showed ~₹21 "GST" on a
 * ₹118-inclusive line at 18%, instead of the correct ₹18). It is the exact same bug
 * Task #29 already fixed on the server (server/src/utils/pricingEngine.js and
 * orderController.js/posController.js) and in the client pricing engine
 * (printbazzar_react/client/src/utils/pricingEngine.js) — this file brings the
 * pre-checkout Cart/Checkout summary displays into line with that same, already
 * -established formula. It does not compute price, does not call the pricing API,
 * and does not replace it — Cart/Checkout's actual charged total (cartGrandTotal /
 * effectiveGrandTotal = subtotal + shipping) is completely unchanged by this file;
 * it only corrects the informational "how much GST is included" breakdown shown
 * alongside that total.
 *
 * Deliberately NOT added to client/src/utils/pricingEngine.js: Task #30's brief
 * explicitly prohibits modifying the Task #29 pricing engine file. This is a new,
 * separate, display-only helper.
 *
 * Deliberately does not attempt an intra-/inter-state CGST+SGST vs IGST split:
 * that requires the customer's shipping state (server/src/controllers/
 * orderController.js and posController.js already do this correctly at order-
 * creation time, per Task #29), which is not known yet at the Cart page and is
 * only entered mid-way through Checkout. Showing CGST+SGST here (the majority
 * same-state case) with a correct extraction formula is accurate for what CAN be
 * known pre-checkout; the authoritative, state-aware split is computed server-side
 * when the order is actually placed, and that is what the real invoice reflects.
 */

/**
 * Given a GST-inclusive amount, returns the taxable (ex-GST) value and the tax
 * actually embedded in it, split evenly into CGST/SGST halves.
 *
 * @param {number} inclusiveAmount - a GST-inclusive rupee amount (e.g. cart subtotal)
 * @param {number} gstRatePercent - the GST rate, e.g. 18 for 18%. Defaults to 18,
 *   the same default already used as a fallback throughout this codebase
 *   (server/src/utils/pricingEngine.js's own `parseFloat(gstRate) || 18`).
 * @returns {{ taxableAmount: number, totalTax: number, cgst: number, sgst: number }}
 */
export function computeInclusiveGstBreakdown(inclusiveAmount, gstRatePercent = 18) {
  const amount = Number(inclusiveAmount) || 0;
  const rate = Number(gstRatePercent) || 18;
  const taxableAmount = Math.round(amount / (1 + rate / 100));
  const totalTax = amount - taxableAmount;
  const cgst = Math.round(totalTax / 2);
  const sgst = totalTax - cgst;
  return { taxableAmount, totalTax, cgst, sgst };
}
