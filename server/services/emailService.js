/**
 * Email Service
 * 
 * Handles sending order confirmation emails.
 * Currently outputs to console as a placeholder.
 * Will be replaced with a real email transport (e.g., Nodemailer + SMTP)
 * once the payment gateway is integrated.
 */

const formatCurrency = (amount) => {
  return `₹${Number(amount).toFixed(2)}`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
};

/**
 * Send an order confirmation email (console output for now).
 * 
 * @param {Object} orderDetails
 * @param {number} orderDetails.orderId
 * @param {string} orderDetails.email - Recipient email address
 * @param {string} orderDetails.customerName - Customer's name
 * @param {Array}  orderDetails.items - Array of order items
 * @param {number} orderDetails.subtotal
 * @param {number} orderDetails.shippingCost
 * @param {number} orderDetails.total
 * @param {string} orderDetails.shippingAddress
 */
const sendOrderConfirmationEmail = (orderDetails) => {
  console.log('\n=== EMAIL SERVICE CALLED ===');
  console.log('Order ID:', orderDetails.orderId);
  console.log('Email:', orderDetails.email);
  console.log('Customer:', orderDetails.customerName);
  console.log('Total:', orderDetails.total);
  console.log('===========================\n');
  const {
    orderId,
    email,
    customerName,
    items,
    subtotal,
    shippingCost,
    total,
    shippingAddress
  } = orderDetails;

  const separator = '═'.repeat(56);
  const thinSeparator = '─'.repeat(56);

  // Build the items table
  const itemLines = items.map((item, index) => {
    const name = item.variant_name
      ? `${item.product_name} (${item.variant_name})`
      : item.product_name;
    const lineTotal = item.price * item.quantity;
    return `  ${index + 1}. ${name}\n     Qty: ${item.quantity}  ×  ${formatCurrency(item.price)}  =  ${formatCurrency(lineTotal)}`;
  }).join('\n');

  const emailContent = `
${separator}
        📧  ORDER CONFIRMATION EMAIL
${separator}

  To:       ${email}
  Subject:  Bodhichitta — Order #${orderId} Confirmed!
  Date:     ${formatDate(new Date())}

${thinSeparator}

  Dear ${customerName},

  Thank you for your order! We're excited to let you know
  that your order has been received and is being processed.

${thinSeparator}
  📦  ORDER SUMMARY — #${orderId}
${thinSeparator}

${itemLines}

${thinSeparator}
  Subtotal:       ${formatCurrency(subtotal)}
  Shipping:       ${shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost)}
                  ${thinSeparator.slice(0, 30)}
  Total:          ${formatCurrency(total)}
${thinSeparator}

  📍  SHIPPING ADDRESS
  ${shippingAddress}

${thinSeparator}

  We will notify you once your order has been shipped.
  If you have any questions, feel free to reach out to us
  at support@bodhichitta.com.

  With gratitude,
  Team Bodhichitta 🙏

${separator}
  ⚠️  [CONSOLE PLACEHOLDER — Real email transport pending]
${separator}
`;

  console.log(emailContent);
};

module.exports = { sendOrderConfirmationEmail };
