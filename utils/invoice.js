import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generateInvoice = async ({
  order,
  items,
  customer,
  includeGST = false,
  gstNumber = '',
}) => {
  const date = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const subtotal = items.reduce((s, i) =>
    s + (i.unit_price || i.selling_price || 0)
    * (i.quantity || i.qty || 1), 0
  );

  const gstAmount = includeGST
    ? (subtotal * 0.18).toFixed(2) : 0;
  const total = includeGST
    ? (subtotal + parseFloat(gstAmount)).toFixed(2)
    : subtotal.toFixed(2);

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0
      ? '#f9f9f9' : '#ffffff'}">
      <td style="padding:10px;border-bottom:1px solid #eee">
        ${item.name_en || item.product_name || '—'}
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee;
        text-align:center">
        ${item.sku || '—'}
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee;
        text-align:center">
        ${item.quantity || item.qty || 1}
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee;
        text-align:right">
        ₹${item.unit_price || item.selling_price || 0}
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee;
        text-align:right;font-weight:bold">
        ₹${(
          (item.unit_price || item.selling_price || 0)
          * (item.quantity || item.qty || 1)
        ).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        font-family: Arial, sans-serif;
        color: #333; padding: 30px; background: #fff;
      }
      .header {
        display: flex; justify-content: space-between;
        align-items: flex-start; margin-bottom: 30px;
        padding-bottom: 20px; border-bottom: 3px solid #1a1a2e;
      }
      .store-name {
        font-size: 22px; font-weight: bold;
        color: #1a1a2e; margin-bottom: 4px;
      }
      .store-sub { font-size: 12px; color: #666; line-height: 1.7; }
      .invoice-title {
        font-size: 26px; font-weight: bold;
        color: #4F6EF7; text-align: right;
      }
      .invoice-num {
        font-size: 12px; color: #999;
        text-align: right; margin-top: 4px; line-height: 1.6;
      }
      .info-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 16px; margin-bottom: 24px;
      }
      .info-box {
        background: #f8f9ff; border-radius: 8px;
        padding: 14px; border-left: 4px solid #4F6EF7;
      }
      .info-label {
        font-size: 10px; color: #999; text-transform: uppercase;
        letter-spacing: 1px; margin-bottom: 8px;
      }
      .info-value {
        font-size: 13px; color: #333;
        font-weight: 600; line-height: 1.6;
      }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      thead { background: #1a1a2e; color: white; }
      thead th {
        padding: 12px 10px; text-align: left;
        font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
      }
      .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
      .totals-box { width: 260px; background: #f8f9ff; border-radius: 8px; overflow: hidden; }
      .totals-row {
        display: flex; justify-content: space-between;
        padding: 10px 16px; font-size: 13px;
        border-bottom: 1px solid #eee;
      }
      .totals-total {
        display: flex; justify-content: space-between;
        padding: 14px 16px; font-size: 17px; font-weight: bold;
        background: #1a1a2e; color: white;
      }
      .footer {
        text-align: center; margin-top: 30px;
        padding-top: 20px; border-top: 1px solid #eee;
        color: #999; font-size: 12px; line-height: 1.8;
      }
      .thank-you {
        font-size: 15px; color: #4F6EF7;
        font-weight: bold; margin-bottom: 6px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="store-name">New Rahul Auto Spares</div>
        <div class="store-sub">
          Telugu Peta, Nandyal - 518501<br>
          Andhra Pradesh, India<br>
          📞 08514-244944 · 📱 +91 6300281504
          ${gstNumber ? `<br>GST: ${gstNumber}` : ''}
        </div>
      </div>
      <div>
        <div class="invoice-title">
          ${includeGST ? 'TAX INVOICE' : 'INVOICE'}
        </div>
        <div class="invoice-num">
          # ${order?.custom_id || `RAS-${order?.id || '000'}`}<br>
          Date: ${date}<br>
          Payment: ${(order?.payment_type || 'PENDING').toUpperCase()}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Bill To</div>
        <div class="info-value">
          ${customer?.name || order?.customer_name || '—'}<br>
          +91 ${customer?.phone || order?.customer_phone || '—'}
        </div>
      </div>
      <div class="info-box">
        <div class="info-label">Order Details</div>
        <div class="info-value">
          ID: ${order?.custom_id || `RAS-${order?.id || '000'}`}<br>
          Pickup: ${order?.pickup_time || 'At Store'}<br>
          Status: ${(order?.status || 'pending').toUpperCase()}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Part Name</th>
          <th style="text-align:center">SKU</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `
          <tr>
            <td colspan="5" style="padding:20px;text-align:center;color:#999">
              Order items not available
            </td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>₹${subtotal.toFixed(2)}</span>
        </div>
        ${includeGST ? `
        <div class="totals-row">
          <span>GST (18%)</span>
          <span>₹${gstAmount}</span>
        </div>` : ''}
        <div class="totals-row">
          <span>Discount</span>
          <span style="color:green">₹0.00</span>
        </div>
        <div class="totals-total">
          <span>TOTAL</span>
          <span>₹${total}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="thank-you">🙏 Thank you for your business!</div>
      ధన్యవాదాలు · Thank you<br>
      New Rahul Auto Spares · Telugu Peta, Nandyal<br>
      📞 08514-244944 · WhatsApp +91 6300281504<br><br>
      <em>All parts are genuine OEM quality.
      No returns after 7 days.</em>
    </div>
  </body>
  </html>`;

  try {
    const { uri } = await Print.printToFileAsync({
      html, base64: false
    });
    return uri;
  } catch (err) {
    console.error('Invoice error:', err);
    throw err;
  }
};

export const shareInvoice = async (uri, orderId) => {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${orderId}`,
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (err) {
    console.error('Share error:', err);
    throw err;
  }
};