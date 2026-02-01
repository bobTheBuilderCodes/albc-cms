import type { Donation } from '../types';
import { Church, Mail, Phone, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';

interface ChurchSettings {
  churchName: string;
  email: string;
  phone: string;
  address: string;
}

interface DonationReceiptProps {
  donation: Donation;
}

export function DonationReceipt({ donation }: DonationReceiptProps) {
  const settings = JSON.parse(localStorage.getItem('cms_settings') || JSON.stringify({
    churchName: 'Grace Church',
    email: 'info@gracechurch.com',
    phone: '+233 24 123 4567',
    address: '123 Church Street, Accra, Ghana',
  }));
  
  const receiptNumber = donation.receiptNumber || `RCP-${new Date(donation.date).getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  
  return (
    <div className="bg-white p-8 max-w-2xl mx-auto" id="donation-receipt">
      {/* Header with Church Branding */}
      <div className="text-center mb-8 pb-6 border-b-2 border-primary-500">
        <div className="flex items-center justify-center mb-3">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Church className="w-9 h-9 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">{settings.churchName}</h1>
        <div className="flex flex-col items-center gap-1 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{settings.address}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              <span>{settings.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              <span>{settings.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border-2 border-primary-200 rounded-lg mb-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-bold text-primary-700">DONATION RECEIPT</h2>
        </div>
        <p className="text-sm text-neutral-500 mt-2">Official Receipt for Tax Purposes</p>
      </div>

      {/* Receipt Details */}
      <div className="grid grid-cols-2 gap-4 mb-8 bg-neutral-50 p-6 rounded-xl border border-neutral-200">
        <div>
          <p className="text-xs text-neutral-500 uppercase font-semibold mb-1">Receipt Number</p>
          <p className="text-sm text-neutral-900 font-bold">{receiptNumber}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase font-semibold mb-1">Date Issued</p>
          <p className="text-sm text-neutral-900 font-bold">{new Date(donation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase font-semibold mb-1">Donor Name</p>
          <p className="text-sm text-neutral-900 font-bold">{donation.memberName}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase font-semibold mb-1">Payment Method</p>
          <p className="text-sm text-neutral-900 font-bold capitalize">{donation.paymentMethod.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Donation Details */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-neutral-300">
              <th className="text-left py-3 text-sm font-bold text-neutral-700 uppercase">Description</th>
              <th className="text-right py-3 text-sm font-bold text-neutral-700 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-4">
                <p className="text-sm font-semibold text-neutral-900 capitalize mb-1">{donation.type.replace('_', ' ')}</p>
                {donation.description && (
                  <p className="text-xs text-neutral-500">{donation.description}</p>
                )}
              </td>
              <td className="text-right py-4">
                <p className="text-sm font-bold text-neutral-900">GH₵ {donation.amount.toFixed(2)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total Amount Highlighted */}
      <div className="bg-linear-to-r from-primary-500 to-primary-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-90 mb-1">Total Amount Received</p>
              <p className="text-3xl font-bold">GH₵ {donation.amount.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75 uppercase tracking-wider">Currency</p>
            <p className="text-lg font-bold">{donation.currency}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 pt-6">
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-neutral-700 leading-relaxed">
            <strong>Tax Information:</strong> This receipt serves as official documentation of your donation. 
            {settings.churchName} is a registered religious organization. Please retain this receipt for your tax records. 
            No goods or services were provided in exchange for this donation.
          </p>
        </div>

        <div className="text-center text-xs text-neutral-500 space-y-1">
          <p>Thank you for your generous contribution!</p>
          <p className="font-semibold text-neutral-600">May God bless you abundantly.</p>
          <p className="text-neutral-400 mt-4">Receipt generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}

export function downloadReceipt(donation: Donation) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the receipt');
    return;
  }

  const settings = JSON.parse(localStorage.getItem('cms_settings') || JSON.stringify({
    churchName: 'Grace Church',
    email: 'info@gracechurch.com',
    phone: '+233 24 123 4567',
    address: '123 Church Street, Accra, Ghana',
  }));
  
  const receiptNumber = donation.receiptNumber || `RCP-${new Date(donation.date).getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  // HTML content for the receipt
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Receipt - ${receiptNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          padding: 40px;
          background: white;
        }
        
        .receipt {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border: 2px solid #e2e8f0;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 3px solid #3b82f6;
        }
        
        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 16px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .church-name {
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 15px;
        }
        
        .church-details {
          font-size: 13px;
          color: #64748b;
          line-height: 1.8;
        }
        
        .receipt-title {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .receipt-badge {
          display: inline-block;
          padding: 12px 24px;
          background: #eff6ff;
          border: 2px solid #bfdbfe;
          border-radius: 8px;
          font-size: 20px;
          font-weight: 700;
          color: #1d4ed8;
          margin-bottom: 10px;
        }
        
        .receipt-subtitle {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
          background: #f8fafc;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .detail-item {
          margin-bottom: 10px;
        }
        
        .detail-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
        }
        
        .detail-value {
          font-size: 14px;
          color: #0f172a;
          font-weight: 600;
        }
        
        .donation-table {
          width: 100%;
          margin-bottom: 40px;
          border-collapse: collapse;
        }
        
        .donation-table thead th {
          text-align: left;
          padding: 15px 0;
          border-bottom: 2px solid #cbd5e1;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .donation-table thead th:last-child {
          text-align: right;
        }
        
        .donation-table tbody td {
          padding: 20px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .donation-table tbody td:last-child {
          text-align: right;
        }
        
        .donation-type {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          text-transform: capitalize;
          margin-bottom: 5px;
        }
        
        .donation-desc {
          font-size: 12px;
          color: #64748b;
        }
        
        .amount {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .total-section {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .total-label {
          font-size: 13px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        
        .total-amount {
          font-size: 36px;
          font-weight: 700;
        }
        
        .currency-info {
          text-align: right;
        }
        
        .currency-label {
          font-size: 11px;
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .currency-value {
          font-size: 18px;
          font-weight: 700;
          margin-top: 5px;
        }
        
        .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 30px;
        }
        
        .tax-notice {
          background: #ecfeff;
          border: 1px solid #a5f3fc;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .tax-notice p {
          font-size: 11px;
          color: #164e63;
          line-height: 1.6;
        }
        
        .tax-notice strong {
          font-weight: 600;
        }
        
        .footer-text {
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.8;
        }
        
        .footer-blessing {
          font-weight: 600;
          color: #64748b;
          margin-top: 10px;
        }
        
        .footer-timestamp {
          color: #cbd5e1;
          margin-top: 20px;
        }
        
        @media print {
          body {
            padding: 0;
          }
          .receipt {
            border: none;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 9 10-7 10 7v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="church-name">${settings.churchName}</div>
          <div class="church-details">
            ${settings.address}<br>
            ${settings.phone} • ${settings.email}
          </div>
        </div>
        
        <div class="receipt-title">
          <div class="receipt-badge">📄 DONATION RECEIPT</div>
          <div class="receipt-subtitle">Official Receipt for Tax Purposes</div>
        </div>
        
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Receipt Number</div>
            <div class="detail-value">${receiptNumber}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Date Issued</div>
            <div class="detail-value">${new Date(donation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Donor Name</div>
            <div class="detail-value">${donation.memberName}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${donation.paymentMethod.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
          </div>
        </div>
        
        <table class="donation-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="donation-type">${donation.type.replace('_', ' ')}</div>
                ${donation.description ? `<div class="donation-desc">${donation.description}</div>` : ''}
              </td>
              <td>
                <div class="amount">GH₵ ${donation.amount.toFixed(2)}</div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="total-section">
          <div>
            <div class="total-label">Total Amount Received</div>
            <div class="total-amount">GH₵ ${donation.amount.toFixed(2)}</div>
          </div>
          <div class="currency-info">
            <div class="currency-label">Currency</div>
            <div class="currency-value">${donation.currency}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="tax-notice">
            <p>
              <strong>Tax Information:</strong> This receipt serves as official documentation of your donation. 
              ${settings.churchName} is a registered religious organization. Please retain this receipt for your tax records. 
              No goods or services were provided in exchange for this donation.
            </p>
          </div>
          
          <div class="footer-text">
            <p>Thank you for your generous contribution!</p>
            <p class="footer-blessing">May God bless you abundantly.</p>
            <p class="footer-timestamp">Receipt generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}