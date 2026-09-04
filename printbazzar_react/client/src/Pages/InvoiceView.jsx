import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { HiOutlinePrinter, HiOutlineArrowLeft, HiOutlineCheckCircle } from 'react-icons/hi';
import { api } from '../services/api';

export default function InvoiceView() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      api
        .getOrderInvoice(orderId)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'Invoice not found');
          }
        })
        .catch((err) => setError(err.message || 'Failed to load invoice'))
        .finally(() => setLoading(false));
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-500 font-medium">Generating official invoice...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Available</h2>
        <p className="text-gray-600 mb-6">{error || 'Could not retrieve invoice document.'}</p>
        <Button as={Link} to="/" color="dark" className="mx-auto">
          Return to Home
        </Button>
      </div>
    );
  }

  const { invoice, order, company } = data;
  const billTo = typeof invoice.billToSnapshotJson === 'string' ? JSON.parse(invoice.billToSnapshotJson || '{}') : invoice.billToSnapshotJson || {};
  const shipTo = typeof invoice.shipToSnapshotJson === 'string' ? JSON.parse(invoice.shipToSnapshotJson || '{}') : invoice.shipToSnapshotJson || {};
  const items = typeof invoice.itemsSnapshotJson === 'string' ? JSON.parse(invoice.itemsSnapshotJson || '[]') : invoice.itemsSnapshotJson || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          to={`/track-order/${order.orderNumber}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Order Tracking
        </Link>
        <Button onClick={handlePrint} color="dark" className="flex items-center gap-2 shadow-md">
          <HiOutlinePrinter className="w-5 h-5 mr-1" /> Print / Save PDF
        </Button>
      </div>

      {/* Invoice Document Paper */}
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-4 print:rounded-none">
        {/* Header: Company Info + Invoice Type Badge */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-8 gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight text-gray-950">PRINT<span className="text-yellow-400">BAZZAR</span></span>
              <span className="text-[11px] bg-gray-900 text-yellow-300 font-bold px-2 py-0.5 rounded tracking-wider uppercase">Press</span>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-1">{company.tradeName}</p>
            <p className="text-xs text-gray-600 max-w-sm mt-2 leading-relaxed">
              {company.address}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              <span className="font-semibold">GSTIN:</span> {company.gstin} | <span className="font-semibold">PAN:</span> {company.pan}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Phone:</span> {company.phone} | <span className="font-semibold">Email:</span> {company.email}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 bg-yellow-400 text-black text-xs font-black uppercase tracking-wider rounded-md mb-2">
              {invoice.invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Order Receipt & Invoice'}
            </span>
            <p className="text-xl font-black text-gray-900">{invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500 mt-1">
              Master Order: <span className="font-bold text-gray-800">{order.orderNumber}</span>
            </p>
            <p className="text-xs text-gray-500">
              Date: <span className="font-medium text-gray-800">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </p>
            <p className="text-xs text-gray-500">
              Payment Method: <span className="font-semibold text-gray-800">{invoice.paymentMethod}</span>
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
              <HiOutlineCheckCircle className="w-3.5 h-3.5" /> {invoice.paymentStatus}
            </div>
          </div>
        </div>

        {/* Bill To & Ship To Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b text-xs">
          <div>
            <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To (Customer):</h4>
            <p className="text-sm font-bold text-gray-900">{billTo.name}</p>
            {billTo.gstin && (
              <p className="text-gray-700 font-semibold mt-0.5">GSTIN: {billTo.gstin}</p>
            )}
            <p className="text-gray-600 mt-1">Mobile: {billTo.mobile}</p>
            {billTo.email && <p className="text-gray-600">Email: {billTo.email}</p>}
            <p className="text-gray-600 mt-1 leading-relaxed">
              {billTo.address?.street}, {billTo.address?.city}, {billTo.address?.state} - {billTo.address?.pincode}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Details:</h4>
            <div className="mb-2">
              <span className="font-bold text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {order.deliveryMethod === 'STORE_PICKUP' ? '🏪 Direct Store Self-Pickup' : '🚚 Doorstep Courier Delivery'}
              </span>
            </div>
            {order.deliveryMethod === 'STORE_PICKUP' ? (
              <div className="text-gray-600 leading-relaxed bg-amber-50 p-2.5 rounded border border-amber-200">
                <p className="font-bold text-amber-900">Pickup Location:</p>
                <p className="text-amber-800">{company.address}</p>
                <p className="text-[11px] text-amber-700 mt-1">Please show this receipt or order number at the dispatch counter.</p>
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed">
                {billTo.address?.street} <br />
                {billTo.address?.city}, {billTo.address?.state} - {billTo.address?.pincode} <br />
                {billTo.address?.landmark && <span>Landmark: {billTo.address.landmark}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-2">#</th>
                <th className="py-3 px-2">Description of Goods / Services</th>
                <th className="py-3 px-2">SKU / HSN</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-3.5 px-2">
                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    {item.designRequired && (
                      <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                        Includes: {item.designPackageName || 'Custom Graphic Design Service'} (+₹{item.designCharge || 0})
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-gray-600 font-mono">{item.sku || '4911'}</td>
                  <td className="py-3.5 px-2 text-center font-bold text-gray-900">{item.quantity}</td>
                  <td className="py-3.5 px-2 text-right text-gray-700">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="py-3.5 px-2 text-right font-bold text-gray-900">₹{Number(item.totalPrice || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tax and Total Breakdown */}
        <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="text-xs text-gray-500 max-w-sm space-y-1">
            <p className="font-bold text-gray-700 uppercase">Terms & Conditions:</p>
            <p>1. Goods once manufactured and printed cannot be returned or refunded.</p>
            <p>2. Colors may vary within ±5% due to Heidelberg/Konica industrial digital press CMYK calibration.</p>
            <p>3. Disputes subject to Tiruchirappalli jurisdiction only.</p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Taxable Amount (Subtotal):</span>
              <span className="font-semibold text-gray-900">₹{Number(invoice.taxableAmount || invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>CGST (9.0%):</span>
              <span className="font-semibold text-gray-900">₹{Number(invoice.cgst || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SGST (9.0%):</span>
              <span className="font-semibold text-gray-900">₹{Number(invoice.sgst || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping / Delivery Charge:</span>
              <span className="font-semibold text-gray-900">
                {invoice.shippingCharge === 0 ? <span className="text-green-600 font-bold">FREE</span> : `₹${Number(invoice.shippingCharge).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-300">
              <span>Grand Total:</span>
              <span className="text-xl text-yellow-600">₹{Number(invoice.grandTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Amount Received:</span>
              <span className="font-bold text-green-600">₹{Number(invoice.amountPaid || invoice.grandTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Balance Due:</span>
              <span className="font-bold text-gray-900">₹{Number(invoice.balanceDue || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature Block */}
        <div className="mt-12 pt-8 border-t flex justify-between items-end text-xs text-gray-500">
          <div>
            <p className="font-semibold text-gray-700">Print Bazzar Industrial Digital & Offset Press</p>
            <p>Computer generated invoice, requires no physical signature.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900 mb-6">For PRINT BAZZAR</p>
            <p className="border-t border-gray-300 pt-1 text-[11px] font-medium text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
