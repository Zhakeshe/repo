// pages/index.js
// Redirect root (/) to the static public/index.html file.
// If you use the app/ router instead of pages/, create app/page.js with the same redirect.
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/index.html',
      permanent: false
    }
  };
}

export default function IndexRedirect() {
  // Not rendered because of server-side redirect
  return null;
}