# appsscript
A collection of appsscript documentation, guides and useful code.

## OAUTH SETUP
Before we can utilize API calls to Google Search Console, we first need to set up authorization. In this example, we will try to connect to a non-native appsScript library (Google Search Console).

### 1. Enable Search Console API in Google Cloud Console
Go to Google Cloud Console → https://console.cloud.google.com
Create a new project (or use an existing one).
Enable the Search Console API:
    Go to APIs & Services → Library
    Search for "Search Console API"
    Enable it

### 2. Create OAuth Credentials
In APIs & Services → "+ Create credentials":
    Create OAuth Client ID → "Web Application"
    Set up the redirect URI:
https://script.google.com/macros/d/{SCRIPT_ID}/usercallback
Replace {SCRIPT_ID} with the actual Apps Script ID of your project. Head over to the appsScript Project Settings tab and copy the Script ID. 
NOTE! You may be prompted to create a new app if this is your first time creating an OAuth Client ID - go through the setup process.

Download the JSON file with your Client ID and Client Secret or copy them from the pop-up.

### 3. Add the OAuth2 Library in Apps Script
Open your Apps Script project.
Go to Extensions → Libraries
Add this OAuth2 library: ```1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF```
(You can find the original GitHub repo for it here and paste the code yourself if you prefer: https://github.com/googleworkspace/apps-script-oauth2)

### 4. Add OAuth Callback Handling
This will handle the OAuth flow. Copy this code to Code.gs:
```javascript
function authCallback(request) {
  var service = getSearchConsoleService();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Authorization successful!');
  } else {
    return HtmlService.createHtmlOutput('Authorization failed');
  }
}

function authorize() {
  var service = GET_SERVICE();    // replace with the appropriate service function as per context
  if (!service.hasAccess()) {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and authorize: ' + authorizationUrl);
  } else {
    Logger.log('Already authorized');
  }
}

function resetAuth() {
  var service = getSearchConsoleService();
  service.reset();
  Logger.log('Authorization reset.');
}
```
When authorize() is called, it will attempt to reach out to GET_SERVICE which in our case will be Google Search Console. You could replace it with something else like Google Drive as it was done here: https://github.com/googleworkspace/apps-script-oauth2?tab=readme-ov-file#usage

### 5. Add the service
We will be adding Google Search Console as the service to retrieve for the authorize() function. Copy to Code.gs.
```javascript
function GET_SERVICE() {
  return OAuth2.createService('searchconsole')

    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')

    .setClientId('YOUR_CLIENT_ID')    // add your YOUR_CLIENT_ID
    .setClientSecret('YOUR_CLIENT_SECRET')    // add your YOUR_CLIENT_SECRET 

    .setCallbackFunction('authCallback')

    .setPropertyStore(PropertiesService.getUserProperties())

    // Read-only access to GSC
    .setScope('https://www.googleapis.com/auth/webmasters.readonly')

    .setParam('access_type', 'offline') // Allows token refresh
    .setParam('prompt', 'consent') // Always requests permission when logging in

    // Automatically select the account used to authorize
    .setParam('login_hint', Session.getEffectiveUser().getEmail());
}
```
Replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET with the values from the json file we downloaded earlier.

Then, head over to Project Settings in appsScript and enable `Show "appsscript.json" manifest file in editor`. Then add these scopes to the JSON file:
```JSON
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
```

### 6. Run authorize()
In appsscript, run the authorize() function. Copy the redirect link. If the authorization is unsuccessful, and you're seeing this message "Access blocked: YOUR-APP-NAME has not completed the Google verification process. The app is currently being tested, and can only be accessed by developer-approved testers" then you need to add yourself as a tester. Head back to Google Cloud Console -> APIs and Services -> Credentials -> The OAuth 2.0 Client we created -> Audience -> add Test users and add your email. Then run authorize() again.


### 7. Deploy the script
You may need to deploy the script if authorize() is still not proceeding.
    Go to Deploy > Test deployments
    Select Web App
    Set it to "Execute as Me" and "Anyone"
    Run authorize() → Open the link in the log and authenticate with your Google account

### 8. Fetch data
Now we can run a custom function to list all of our GSC properties. Same as with authorize(), add this code to Code.gs and run the code. The logs should list the properties to which we have access to.
```javascript
function listGSCProperties() {
  var service = getSearchConsoleService();
  if (!service.hasAccess()) {
    Logger.log('Authorization required. Run "authorize" function.');
    return;
  }

  var url = 'https://www.googleapis.com/webmasters/v3/sites';
  var options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log('Error: ' + response.getContentText());
    return;
  }

  var result = JSON.parse(response.getContentText());
  
  if (result.siteEntry && result.siteEntry.length > 0) {
    Logger.log('✅ Properties you have access to:');
    result.siteEntry.forEach(function(site) {
      Logger.log(site.siteUrl);
    });
  } else {
    Logger.log('❌ No properties found.');
  }
}
```
