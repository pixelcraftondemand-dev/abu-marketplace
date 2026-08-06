import prisma from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils/currency";
import { escapeHtml, getEmailFromAddress } from "@/lib/emailUtils";

function getOrdersUrl() {
  return `${process.env.NEXT_PUBLIC_APP_URL || "https://abumarketplace.shop"}/orders`;
}

function buildOrderBlocks(orders) {
  return orders
    .map((order) => {
      const storeName = escapeHtml(order.store?.name || "ABU Marketplace");
      const orderId = escapeHtml(order.id);
      const rows = order.orderItems
        .map((item) => {
          const name = escapeHtml(item.product?.name || "Product");
          return `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#333">${name}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;text-align:center">${item.quantity} × ${formatCurrency(item.price)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#333;text-align:right">${formatCurrency(item.price * item.quantity)}</td>
          </tr>`;
        })
        .join("");
      return `
      <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 4px;color:#1A1A1A"><strong>${storeName}</strong></p>
        <p style="margin:0 0 12px;font-size:12px;color:#888">Order #${orderId.slice(0, 8).toUpperCase()}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          ${rows}
        </table>
        <p style="margin:12px 0 0;text-align:right;color:#1A1A1A"><strong>Subtotal: ${formatCurrency(order.total)}</strong></p>
      </div>`;
    })
    .join("");
}

function buildHtml({ userName, orders, total }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
        <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
        <p style="margin:6px 0 0;color:#C9A96E;font-size:13px;letter-spacing:2px;text-transform:uppercase">Order confirmed</p>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px">
        <p style="margin:0 0 16px;color:#333">Hi ${escapeHtml(userName || "there")},</p>
        <p style="margin:0 0 8px;color:#333">Thank you for your order! A confirmation for each seller is below.</p>
        ${buildOrderBlocks(orders)}
        <div style="border-top:2px solid #F0E3D1;margin-top:16px;padding-top:16px;text-align:right">
          <p style="margin:0;font-size:15px;color:#1A1A1A"><strong>Order total: ${formatCurrency(total)}</strong></p>
        </div>
        <p style="margin:24px 0 0;text-align:center">
          <a href="${getOrdersUrl()}" style="display:inline-block;background:#C9A96E;color:#1A1A1A;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold">View your orders</a>
        </p>
      </div>
      <div style="text-align:center;padding:16px;color:#888;font-size:12px">
        <p style="margin:0">ABU Marketplace — halal-certified African marketplace</p>
        <p style="margin:4px 0 0">Questions? Reply to this email or contact support.</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildText({ userName, orders, total }) {
  const blocks = orders
    .map((order) => {
      const items = order.orderItems
        .map(
          (item) =>
            `  - ${item.product?.name || "Product"} x ${item.quantity} (${formatCurrency(item.price)}) = ${formatCurrency(item.price * item.quantity)}`
        )
        .join("\n");
      return `${order.store?.name || "ABU Marketplace"} — Order #${order.id.slice(0, 8).toUpperCase()}\n${items}\nSubtotal: ${formatCurrency(order.total)}`;
    })
    .join("\n\n");
  return `Hi ${userName || "there"},

Thank you for your order! Here is your confirmation:

${blocks}

Order total: ${formatCurrency(total)}

View your orders: ${getOrdersUrl()}
`;
}

/**
 * Sends an order confirmation email to the buyer after a successful payment.
 * Best-effort: throws on failure so callers can decide whether to fail the
 * surrounding operation (the Stripe webhook catches and logs instead).
 */
export async function sendOrderConfirmation(userId, orderIds) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    console.warn("[orderEmail] User has no email; skipping order confirmation.");
    return;
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, userId },
    include: {
      orderItems: { include: { product: true } },
      store: true,
    },
  });

  if (orders.length === 0) {
    console.warn("[orderEmail] No orders found for confirmation; skipping.");
    return;
  }

  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const subject = `Order confirmed — ABU Marketplace #${orders[0].id.slice(0, 8).toUpperCase()}`;

  await resend.emails.send({
    from: getEmailFromAddress("order"),
    to: [user.email],
    subject,
    html: buildHtml({ userName: user.name, orders, total }),
    text: buildText({ userName: user.name, orders, total }),
  });
}
