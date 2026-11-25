/**
 * Runtime Production Configuration (DirectAdmin / TanzaniaServers)
 * Editable directly in DirectAdmin File Manager without rebuilding Angular.
 * Automatically ignored on localhost so local development keeps using http://localhost:8080/api/v1.
 */
(function () {
  var host = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    window.__APP_CONFIG__ = window.__APP_CONFIG__ || {
      apiUrl: 'https://api-clearance.jmsolutions.co.tz/api/v1'
    };
  }
})();
