/**
 * Registration Security Utilities - Tenant Data Filtering
 * CRITICAL FIX: Filter out data from other tenants during walk-in registration
 */

/**
 * Filter drivers to only those from user's company
 * Use during walk-in registration when selecting a driver
 */
export function filterDriversByTenant(drivers, userCompanyId) {
  if (!userCompanyId) {
    console.error('Cannot filter drivers: No company context provided');
    return [];
  }

  return drivers.filter(driver => {
    // Verify driver has company_id
    if (!driver.company_id) {
      console.warn(`Driver ${driver.id} missing company_id - filtering out`);
      return false;
    }

    // Only include drivers from this company
    return driver.company_id === userCompanyId;
  });
}

/**
 * Filter customers to only those from user's company
 * Use during walk-in registration when searching for customers
 */
export function filterCustomersByTenant(customers, userCompanyId) {
  if (!userCompanyId) {
    console.error('Cannot filter customers: No company context provided');
    return [];
  }

  return customers.filter(customer => {
    // Verify customer has company_id
    if (!customer.company_id) {
      console.warn(`Customer ${customer.id} missing company_id - filtering out`);
      return false;
    }

    // Only include customers from this company
    return customer.company_id === userCompanyId;
  });
}

/**
 * Filter products to only those from user's company
 * Use during registration when showing available products
 */
export function filterProductsByTenant(products, userCompanyId) {
  if (!userCompanyId) {
    console.error('Cannot filter products: No company context provided');
    return [];
  }

  return products.filter(product => {
    // Verify product has company_id
    if (!product.company_id) {
      console.warn(`Product ${product.id} missing company_id - filtering out`);
      return false;
    }

    // Only include products from this company
    return product.company_id === userCompanyId;
  });
}

/**
 * Verify walk-in customer registration belongs to correct company
 */
export function validateWalkInRegistration(registrationData, userCompanyId) {
  const errors = [];

  // Verify company context
  if (!userCompanyId) {
    errors.push('No company context for registration');
  }

  // Verify driver belongs to company
  if (registrationData.driver_id) {
    if (!registrationData.driver || registrationData.driver.company_id !== userCompanyId) {
      errors.push('Selected driver does not belong to your company');
    }
  }

  // Verify company ID is set for the new customer
  if (registrationData.company_id && registrationData.company_id !== userCompanyId) {
    errors.push('Invalid company assignment for new customer');
  }

  // Verify address validation is done
  if (!registrationData.state || !registrationData.zip) {
    errors.push('Address information required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize registration data before saving
 * Ensures company_id is always set correctly
 */
export function sanitizeRegistrationData(data, userCompanyId) {
  if (!userCompanyId) {
    throw new Error('Cannot sanitize registration: No company context');
  }

  return {
    ...data,
    company_id: userCompanyId, // Force correct company_id
    created_at: new Date().toISOString(),
    status: 'pending', // Always start as pending
    approved: false,
  };
}

/**
 * Filter pending approvals to show only current company's
 */
export function filterPendingApprovalsByTenant(approvals, userCompanyId) {
  if (!userCompanyId) {
    return [];
  }

  return approvals.filter(approval => {
    if (!approval.company_id) {
      console.warn(`Approval ${approval.id} missing company_id - filtering out`);
      return false;
    }

    return approval.company_id === userCompanyId;
  });
}
