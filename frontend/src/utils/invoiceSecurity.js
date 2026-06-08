/**
 * Invoice Security Utilities - Tenant Verification
 * CRITICAL FIX: Ensure users cannot access invoices from other tenants
 */

/**
 * Verify user has access to invoice
 * @param {string} invoiceId - The invoice/sale ID
 * @param {object} user - Current user object
 * @param {array} sales - List of sales for current company
 * @returns {boolean} - True if user can access this invoice
 */
export function canAccessInvoice(invoiceId, user, sales) {
  // Verify user is authenticated
  if (!user || !user.id) {
    console.error('Tenant verification failed: No authenticated user');
    return false;
  }

  // Verify user's company is set
  if (!user.company_id) {
    console.error('Tenant verification failed: User company_id missing');
    return false;
  }

  // Find invoice/sale in current company's sales
  const invoice = sales.find(s => s.id === invoiceId);

  if (!invoice) {
    console.error(`Tenant verification failed: Invoice ${invoiceId} not found in company ${user.company_id}`);
    return false;
  }

  // Verify invoice belongs to user's company
  if (invoice.company_id !== user.company_id) {
    console.error(
      `SECURITY: User ${user.id} attempted to access invoice ${invoiceId} from unauthorized company ${invoice.company_id}`
    );
    return false;
  }

  return true;
}

/**
 * Secure invoice view handler
 * Add this to your invoice viewing/download logic
 */
export function getSecureInvoice(invoiceId, user, sales) {
  // Always verify tenant access first
  if (!canAccessInvoice(invoiceId, user, sales)) {
    throw new Error('Access denied: You do not have permission to view this invoice');
  }

  const invoice = sales.find(s => s.id === invoiceId);
  return invoice;
}

/**
 * Filter invoices to only those accessible to user
 * Use this when loading invoice lists
 */
export function filterInvoicesByTenant(invoices, user) {
  if (!user || !user.company_id) {
    return [];
  }

  return invoices.filter(invoice => {
    // Verify invoice has company_id
    if (!invoice.company_id) {
      console.warn(`Invoice ${invoice.id} missing company_id - filtering out`);
      return false;
    }

    // Only include invoices from user's company
    return invoice.company_id === user.company_id;
  });
}

/**
 * Verify invoice modification permissions
 */
export function canModifyInvoice(invoiceId, user, sales, userRole = 'user') {
  // Must have access to view
  if (!canAccessInvoice(invoiceId, user, sales)) {
    return false;
  }

  const invoice = sales.find(s => s.id === invoiceId);

  // Only admins can modify invoices
  if (userRole !== 'admin') {
    console.warn(`User ${user.id} attempted invoice modification without admin role`);
    return false;
  }

  // Don't modify paid/confirmed invoices
  if (invoice.status === 'confirmed' || invoice.status === 'paid') {
    console.warn(`Attempted modification of ${invoice.status} invoice ${invoiceId}`);
    return false;
  }

  return true;
}
