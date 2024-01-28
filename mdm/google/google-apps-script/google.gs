SCOPE = 'https://www.googleapis.com/auth/cloud-identity.devices'
BASE_URL = 'https://cloudidentity.googleapis.com/v1/'
FILTER = '?filter=management_type:basic'

// https://cloud.google.com/identity/docs/reference/rest/v1/devices/list
function getMDMDevices(admin_email, svc_acct_key_json) {
  var service = getMDMService(admin_email, svc_acct_key_json);
  if (service.hasAccess()) {
    var devices_url = BASE_URL + 'devices' + FILTER;
    var devices_response = UrlFetchApp.fetch(devices_url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var devices = JSON.parse(devices_response.getContentText()).devices;

    var users_url = BASE_URL + 'devices/-/deviceUsers' + FILTER;
    var users_response = UrlFetchApp.fetch(users_url, {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      }
    });
    var users = JSON.parse(users_response.getContentText()).deviceUsers;

    // Logger.log(JSON.stringify(devices, null, 2));
    // Logger.log(JSON.stringify(users, null, 2));

    // add userEmail to device record for help in matching
    for (device of devices) {
      for (user of users) {
        if (user.name.startsWith(device.name)) {
          device.userEmail = user.userEmail
          device.managementState = user.managementState
          device.passwordState = user.passwordState
          break
        }
      }
    }

    Logger.log(JSON.stringify(devices, null, 2));
    return devices || [];
  } else {
    Logger.log(service.getLastError());
  }
}

// https://github.com/googleworkspace/apps-script-oauth2/blob/main/samples/GoogleServiceAccount.gs
function getMDMService(admin_email, svc_acct_key_json) {
  return OAuth2.createService('Cloud Identity')
      .setTokenUrl('https://oauth2.googleapis.com/token')
      .setPrivateKey(svc_acct_key_json.private_key)
      .setIssuer(svc_acct_key_json.client_email)
      .setSubject(admin_email)
      .setPropertyStore(PropertiesService.getScriptProperties())
      .setScope(SCOPE);
}

function resetMDMService() {
  getService().reset();
}