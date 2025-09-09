// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics with dynamic tracking ID
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || import.meta.env.VITE_GA_TRACKING_ID;

  if (!measurementId) {
    console.warn('Google Analytics not configured - set VITE_GA_MEASUREMENT_ID environment variable');
    return;
  }

  console.log('Initializing Google Analytics with ID:', measurementId);

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Initialize Google Tag Manager with dynamic container ID
export const initGTM = () => {
  const gtmId = import.meta.env.VITE_GTM_ID;

  if (!gtmId) {
    console.warn('Google Tag Manager not configured - set VITE_GTM_ID environment variable');
    return;
  }

  console.log('Initializing Google Tag Manager with ID:', gtmId);

  // Add GTM script to head
  const gtmScript = document.createElement('script');
  gtmScript.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
  document.head.appendChild(gtmScript);

  // Add noscript fallback
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
};

// Initialize all analytics services
export const initAnalytics = () => {
  // Initialize Google Analytics if configured
  initGA();
  
  // Initialize Google Tag Manager if configured
  initGTM();
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined') return;
  
  const measurementId = "G-DDXDLBYJ0K";
  
  // Track with Google Analytics if available
  if (window.gtag && measurementId) {
    window.gtag('config', measurementId, {
      page_path: url
    });
  }
  
  // Track with GTM if available
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: url,
      page_title: document.title
    });
  }
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};