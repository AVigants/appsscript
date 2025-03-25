function getService(service, scope) {
  if (!service) {
    service = "searchconsole"; // default set to searchconsole
  }
  if (!scope) {
    scope = "https://www.googleapis.com/auth/webmasters.readonly"; // default set to webmasters.readonly
  }

  return (
    OAuth2.createService(service)

      .setAuthorizationBaseUrl("https://accounts.google.com/o/oauth2/auth")
      .setTokenUrl("https://accounts.google.com/o/oauth2/token")

      .setClientId("YOUR-CLIENT-ID")
      .setClientSecret("YOUR-CLIENT-SECRET")

      .setCallbackFunction("authCallback")

      .setPropertyStore(PropertiesService.getUserProperties())

      // Read-only access to GSC
      .setScope(scope)

      .setParam("access_type", "offline") // Allows token refresh
      .setParam("prompt", "consent")
  ); // Always requests permission when logging in

  // Automatically select the account used to authorize
  // .setParam('login_hint', Session.getEffectiveUser().getEmail());
}

function authCallback(request) {
  var service = getService();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput("Authorization successful!");
  } else {
    return HtmlService.createHtmlOutput("Authorization failed");
  }
}

function authorize() {
  var service = getService();
  if (!service.hasAccess()) {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log("Open the following URL and authorize: " + authorizationUrl);
  } else {
    Logger.log("Already authorized");
  }
}

function resetAuth() {
  var service = getService();
  service.reset();
  Logger.log("Authorization reset.");
}
