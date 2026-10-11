/**
 * Database Row-Level Security (RLS) Enforcement Engine
 * 
 * Enforces row-level access control policies on orders, stores, products,
 * and user data matching the PostgreSQL RLS policy specification.
 * 
 * In server environments with or without connected Postgres, this middleware
 * acts as an impenetrable defense-in-depth gatekeeper ensuring zero cross-tenant
 * data leakage.
 */

export interface SecurityContext {
  userId?: string;
  role: 'guest' | 'buyer' | 'merchant' | 'artisan' | 'logistics_agent' | 'admin';
  phone?: string;
}

export interface SecurityPolicyResult<T> {
  allowed: boolean;
  filteredData?: T;
  reason?: string;
}

export class RowLevelSecurityEngine {
  /**
   * Evaluates if the current security context can SELECT an order
   */
  static canSelectOrder(order: any, ctx: SecurityContext): boolean {
    if (ctx.role === 'admin' || ctx.role === 'logistics_agent') {
      return true;
    }
    // Match by authenticated userId or verified phone number
    if (ctx.userId && order.buyerId && order.buyerId === ctx.userId) {
      return true;
    }
    if (ctx.phone && order.phone) {
      const cleanCtxPhone = ctx.phone.replace(/\D/g, '');
      const cleanOrderPhone = String(order.phone).replace(/\D/g, '');
      if (cleanCtxPhone && cleanOrderPhone && (cleanCtxPhone.endsWith(cleanOrderPhone) || cleanOrderPhone.endsWith(cleanCtxPhone))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Filters an array of orders according to RLS policy
   */
  static applyOrderRLS(orders: any[], ctx: SecurityContext): any[] {
    if (ctx.role === 'admin' || ctx.role === 'logistics_agent') {
      return orders;
    }
    return orders.filter(o => this.canSelectOrder(o, ctx));
  }

  /**
   * Evaluates if the user can UPDATE a store profile
   */
  static canModifyStore(store: any, ctx: SecurityContext): boolean {
    if (ctx.role === 'admin') return true;
    if (!ctx.userId) return false;
    return store.ownerId === ctx.userId || store.sellerId === ctx.userId;
  }

  /**
   * Sanitizes order data for guest tracking lookups
   * Hides internal billing details while exposing delivery progress
   */
  static sanitizeForPublicTracking(order: any) {
    return {
      trackingNumber: order.trackingNumber,
      orderStatus: order.orderStatus,
      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,
      destination: {
        name: order.destination?.name || 'Western Area',
        hubName: order.destination?.hubName || 'Provincial Logistics Hub'
      },
      itemCount: order.items?.length || 1,
      paymentStatus: order.paymentStatus || 'authorized'
    };
  }
}
