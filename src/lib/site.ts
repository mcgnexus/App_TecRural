// Set this to the real public origin in every deployment. Keeping the value
// configurable prevents canonical URLs from pointing at an abandoned domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/$/, '');
export const CONTACT_EMAIL = 'mcgtecrural@gmail.com';
