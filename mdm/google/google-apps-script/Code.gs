var main_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('main');
var devices_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('mdm_devices');

const ROW_MDM_ADMIN_EMAIL = 2
const ROW_MDM_SVC_ACCT_KEY_JSON = 3
const ROW_BNN_API_HOST = 6
const ROW_BNN_API_KEY = 7
const ROW_SYNC_INTERVAL = 10
const ROW_SYNC_ENABLED = 13
const ROW_LAST_SYNC_TIME = 14
const ROW_LAST_SYNC_RECS = 15

// Main function that pulls events from Banyan and pushes to Datadog
function doSync() {
  var this_sync = new Date()
  var last_sync_time_cell = main_sheet.getRange(ROW_LAST_SYNC_TIME,2)
  var last_sync_recs_cell = main_sheet.getRange(ROW_LAST_SYNC_RECS,2)
  var last_sync = last_sync_time_cell.getValue()
  if (!last_sync) {
    Logger.log("Info - no last sync found; start gathering from 60 min ago")
    last_sync = new Date( this_sync.valueOf() - 1000*(60*60) )
    last_sync_time_cell.setValue(last_sync)
  }

  var creds = getCreds()
  if (!creds.bnn_api_host) {
    Logger.log("Error - creds missing")
    return
  } 

  // get devices from Google MDM
  var mdm_devices = getMDMDevices(creds.mdm_admin_email, creds.mdm_svc_acct_key_json)
  Logger.log(`Info - MDM has ${mdm_devices.length} devices`)
  updateDevicesTab(mdm_devices)
  
  // sync devices with Banyan
  var bnn_devices = getBanyanDevices(creds.bnn_api_host, creds.bnn_api_key)
  Logger.log(`Info - Banyan has ${bnn_devices.length} mobile devices`)


  for (mdm_device of mdm_devices) {
    Logger.log(`Info - looking in Banyan for device matching ${mdm_device.osVersion} - ${mdm_device.model} owned by ${mdm_device.userEmail}`)
    for (bnn_device of mdm_devices) {
      if (isMatch(bnn_device, mdm_device)) {
        Logger.log(`Info - matching device found in Banyan, setting as Managed`)
        setBanyanDeviceManagedStatus(creds.bnn_api_host, creds.bnn_api_key, bnn_device, true)
        mdm_device.matched = true
        break
      }
    }
    if (!mdm_device.matched) {
        Logger.log(`Info - no matching device found in Banyan`)
    }
  }

  for (bnn_device of bnn_devices) {
    Logger.log(`Info - looking in MDM for device matching ${bnn_device.os} - ${bnn_device.model} owned by ${bnn_device.email}`)
    for (mdm_device of mdm_devices) {
      if (isMatch(bnn_device, mdm_device)) {
        Logger.log(`Info - matching device found in MDM, no action needed`)
        bnn_device.matched = true
        break
      }
    }
    if (!bnn_device.matched) {
        Logger.log(`Info - no matching device found in MDM, setting as UNManaged`)
        setBanyanDeviceManagedStatus(creds.bnn_api_host, creds.bnn_api_key, bnn_device, false)
    }    
  }

  // update sync cells
  last_sync_time_cell.setValue(this_sync)
  last_sync_recs_cell.setValue(mdm_devices.length)
}

// check if MDM Device and BNN Device match
function isMatch(bnnDevice, mdmDevice) {
  if (bnnDevice.email == mdmDevice.userEmail && bnnDevice.os == mdmDevice.osVersion && bnnDevice.model == mdmDevice.model) {
    return true
  }
  return false
}

// Ensure API host and key are set
function getCreds() {
  var creds = {}
  creds.bnn_api_host = main_sheet.getRange(ROW_BNN_API_HOST,2).getValue()
  creds.bnn_api_key = main_sheet.getRange(ROW_BNN_API_KEY,2).getValue()
  if (!creds.bnn_api_host || !creds.bnn_api_key) {
    return {}
  }
  creds.mdm_admin_email = main_sheet.getRange(ROW_MDM_ADMIN_EMAIL,2).getValue()
  creds.mdm_svc_acct_key_json = JSON.parse(main_sheet.getRange(ROW_MDM_SVC_ACCT_KEY_JSON,2).getValue())
  if (!creds.mdm_admin_email || !creds.mdm_svc_acct_key_json) {
    return {}
  }

  return creds  
}

// Run `doSync` every N minutes
// https://developers.google.com/apps-script/reference/script/clock-trigger-builder#everyMinutes(Integer)
function enableSyncJob() {
  // Deletes all existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  // Add new trigger
  ScriptApp.newTrigger('doSync')
      .timeBased()
      .everyMinutes(main_sheet.getRange(ROW_SYNC_INTERVAL,2).getValue())
      .create()
  main_sheet.getRange(ROW_SYNC_ENABLED,2).setValue(true)
}


// Update mdm_devices tab
function updateDevicesTab(devices) {
  devices_sheet.getDataRange().clearContent();
  var numRows = devices.length + 1;
  // return if no devices in MDM?
  if (numRows == 1) {
    return;
  }
  var devices2d = []
  var cols = Object.keys(devices[0]);
  devices2d.push(cols)
  for (device of devices) {
    devices2d.push(Object.values(device))
  }
  devices_sheet.getRange(1, 1, numRows, cols.length).setValues(devices2d);

}

// Add menu to Sheet
// https://developers.google.com/apps-script/guides/menus
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Google MDM -> Banyan Device Inventory')
      .addItem('Enable Sync Job', 'enableSyncJob')
      .addSeparator()
      .addItem('Sync Manually', 'doSync')
      .addSeparator()
      .addItem('Check Credentials', 'getCreds')
      .addToUi();
}