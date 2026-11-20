/* Which pages may call the API, and the API's version (index.js; a Worker's entry may export only handlers). */
export const VERSION = '1';

/** Is this origin one of ALLOWED_ORIGIN's (comma list; "https://*.example.com" matches any subdomain)? */
export function originAllowed(origin, env) {
  if (!origin) return false;
  return String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((rule) => {
      if (rule === origin) return true;
      const m = rule.match(/^(https?:\/\/)\*\.(.+)$/);
      return !!m && origin.startsWith(m[1]) && origin.endsWith('.' + m[2]) && !origin.slice(m[1].length).includes('/');
    });
}
