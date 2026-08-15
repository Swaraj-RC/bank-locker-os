// Matches the admin portal's design tokens so both apps feel like one product.
export const colors = {
  primary: '#0F172A',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  grey: '#94A3B8',
};

export function statusColor(status: string): string {
  switch (status) {
    case 'AVAILABLE':
    case 'COMPLETED':
      return colors.success;
    case 'VERIFICATION_PENDING':
    case 'TOKEN_A_VERIFIED':
    case 'TOKEN_B_VERIFIED':
    case 'APPROVAL_PENDING':
    case 'MAINTENANCE':
      return colors.warning;
    case 'ACCESS_ACTIVE':
    case 'APPROVED':
      return colors.info;
    case 'REJECTED':
    case 'EXPIRED':
    case 'RESTRICTED':
      return colors.danger;
    default:
      return colors.grey;
  }
}
