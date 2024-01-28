// get only mobile - iOS, Android - platforms
function getBanyanDevices(bnn_api_host, bnn_api_key) {
  var verb = "/api/v2/devices"
  var qp = "?skip=0&limit=1000&active=true"
  var qp_ios = qp + "&platform=iOS"
  var qp_and = qp + "&platform=Android"

  const headers = {
    Authorization: `Bearer ${bnn_api_key}`,
    'Content-Type': 'application/json',
  }

  const options = {
    method: 'GET',
    headers
  }

  var req_ios = bnn_api_host + verb + qp_ios
  const resp_ios = UrlFetchApp.fetch(req_ios, options)
  var iosDevices = JSON.parse(resp_ios.getContentText()).data.devices
  Logger.log(iosDevices)

  var req_and = bnn_api_host + verb + qp_and
  const resp_and = UrlFetchApp.fetch(req_and, options)
  var andDevices = JSON.parse(resp_and.getContentText()).data.devices
  Logger.log(andDevices)

  // extract email associated with devices, that is embedded inside `extra_details`
  var bnnDevices = iosDevices.concat(andDevices)
  for (bnnDevice of bnnDevices) {
    bnnDevice.email = bnnDevice.extra_details.emails[0]
  }
  return bnnDevices
}

function setBanyanDeviceManagedStatus(bnn_api_host, bnn_api_key, bnnDeviceObj, isManaged) {
  var verb = "/api/v1/mdm/update_device"

  const headers = {
    Authorization: `Bearer ${bnn_api_key}`,
    'Content-Type': 'application/json',
  }

  const payload = {
    "Model": bnnDeviceObj.model,
    "Ownership": bnnDeviceObj.ownership,
    "Platform": bnnDeviceObj.platform,
    "OS": bnnDeviceObj.os,
    "Architecture": bnnDeviceObj.architecture,
    "Banned": bnnDeviceObj.banned,
    "IsMDMPresent": isManaged ? true: false,
    "MDMVendorName": isManaged ? "Google MDM": ""
  }

  const options = {
    method: 'POST',
    headers,
    payload
  }

  var request = bnn_api_host + verb
  
  Logger.log(request)
  Logger.log(payload)

  const response = UrlFetchApp.fetch(request, options)
  Logger.log(response)
}
