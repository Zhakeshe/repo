export const revalidate = 0;
export default function Page() {
  // Server component redirect
  if (typeof window === 'undefined') {
    // server redirect
    return null;
  }
  // client fallback
  if (typeof window !== 'undefined') {
    window.location.href = '/index.html';
  }
  return null;
}