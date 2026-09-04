import React, { useRef } from 'react';
import { Modal, Button } from 'flowbite-react';
import { HiOutlinePrinter, HiX } from 'react-icons/hi';
import { useBusinessInfo } from '../context/BusinessInfoContext';

export default function ShippingLabelModal({ show, onClose, order }) {
  const printRef = useRef(null);
  const { businessInfo } = useBusinessInfo();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const shippingAddr =
    typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress || '{}')
      : order.shippingAddress || {};

  const items = order.items || [];
  const isCOD = order.paymentMethod === 'COD' || order.paymentStatus !== 'PAID';

  return (
    <Modal show={show} onClose={onClose} size="2xl">
      <Modal.Header className="print:hidden">
        <span className="font-bold text-gray-900">📦 Printable Shipping Label & Packing Slip</span>
      </Modal.Header>
      <Modal.Body className="p-4 sm:p-6 print:p-0">
        {/* Printable Label Container (Standard 4x6 / A5 thermal format) */}
        <div
          ref={printRef}
          className="max-w-[420px] mx-auto bg-white border-2 border-dashed border-gray-400 p-4 text-black text-xs font-mono select-all shadow-sm print:border-solid print:border-black print:shadow-none print:max-w-none print:w-full print:p-2"
        >
          {/* Header */}
          <div className="border-b-2 border-black pb-2 mb-2 flex justify-between items-center">
            <div>
              <h2 className="text-base font-black tracking-tight uppercase">PRINT BAZZAR</h2>
              <p className="text-[10px] text-gray-700">Digital Press & Logistics Hub</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 bg-black text-white text-[11px] font-black uppercase rounded">
                {isCOD ? '💵 C.O.D.' : '✅ PREPAID'}
              </span>
              <p className="text-[9px] mt-0.5">{order.deliveryMethod || 'EXPRESS COURIER'}</p>
            </div>
          </div>

          {/* Barcode & Order Number Header */}
          <div className="text-center py-2 border-b-2 border-black bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Order Number</p>
            <p className="text-lg font-black tracking-widest">{order.orderNumber}</p>
            {/* CSS Barcode simulation */}
            <div className="flex justify-center items-center h-8 gap-[2px] mt-1 overflow-hidden px-4">
              {[...Array(38)].map((_, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{ width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px' }}
                />
              ))}
            </div>
            <p className="text-[10px] mt-1 font-bold">
              AWB / Tracking: {order.trackingReference || 'LOCAL-DIRECT'}
            </p>
          </div>

          {/* Deliver To / Consignee */}
          <div className="border-b-2 border-black py-2.5">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">
              DELIVER TO (CONSIGNEE):
            </span>
            <p className="text-sm font-black uppercase mt-0.5">{order.customerName}</p>
            <p className="font-bold text-xs mt-0.5">📞 {order.customerMobile}</p>
            <p className="text-[11px] mt-1 leading-snug">
              {shippingAddr.address || shippingAddr.street || 'Address not specified'}
              {shippingAddr.city ? `, ${shippingAddr.city}` : ''}
              {shippingAddr.state ? `, ${shippingAddr.state}` : ' - Tamil Nadu'}
            </p>
            <p className="text-sm font-black mt-1">
              PINCODE: {shippingAddr.pincode || shippingAddr.zip || '620001'}
            </p>
          </div>

          {/* Item Specification Summary */}
          <div className="border-b-2 border-black py-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
              PACKAGE CONTENTS ({items.length} Items):
            </span>
            <div className="space-y-1">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[10px] border-b border-gray-200 pb-1">
                  <div className="pr-2">
                    <span className="font-bold">{it.productNameSnapshot || it.product?.name || 'Printing Job'}</span>
                    {it.selectedOptionsJson && (
                      <span className="block text-gray-600 text-[9px] truncate max-w-[240px]">
                        {typeof it.selectedOptionsJson === 'string'
                          ? it.selectedOptionsJson
                          : JSON.stringify(it.selectedOptionsJson)}
                      </span>
                    )}
                  </div>
                  <span className="font-bold whitespace-nowrap">Qty: {it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Package Weight & Routing */}
          <div className="grid grid-cols-2 border-b-2 border-black py-1.5 text-[10px]">
            <div>
              <span className="text-gray-500">Weight: </span>
              <span className="font-bold">{order.packingWeight || '0.5 kg'}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Courier: </span>
              <span className="font-bold">{order.courierPartner || 'ST Courier'}</span>
            </div>
          </div>

          {/* Return / Origin Info */}
          <div className="pt-2 text-[9px] leading-tight text-gray-600">
            <span className="font-bold uppercase block text-black">IF UNDELIVERED, RETURN TO:</span>
            <p className="font-semibold text-black">
              {businessInfo?.brand?.legalName || businessInfo?.brand?.brandName || 'PRINT BAZZAR DIGITAL PRESS'}
            </p>
            <p>
              {businessInfo?.address?.pressFacilityAddress || businessInfo?.address?.fullDisplayAddress || 'No. 42, Big Bazzar Street, Singarathope, Tiruchirappalli - 620008, Tamil Nadu'}
            </p>
            <p>
              Helpline: {businessInfo?.contact?.primaryPhone || '+91 96290 98565'} | {typeof window !== 'undefined' ? window.location.hostname : 'www.printbazzar.online'}
            </p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-3 print:hidden">
        <Button color="gray" onClick={onClose}>
          Close
        </Button>
        <Button color="dark" onClick={handlePrint} className="flex items-center gap-2">
          <HiOutlinePrinter className="w-4 h-4 mr-1" /> Print Label
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
