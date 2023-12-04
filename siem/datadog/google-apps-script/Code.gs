var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');

const ROW_DD_API_HOST = 2
const ROW_DD_API_KEY = 3
const ROW_BNN_API_HOST = 6
const ROW_BNN_API_KEY = 7
const ROW_SYNC_INTERVAL = 10
const ROW_SYNC_ENABLED = 13
const ROW_LAST_SYNC_TIME = 14
const ROW_LAST_SYNC_RECS = 15

// Main function that pulls events from Banyan and pushes to Datadog
function doSync() {
  var this_sync = new Date()
  var last_sync_time_cell = sheet.getRange(ROW_LAST_SYNC_TIME,2)
  var last_sync_recs_cell = sheet.getRange(ROW_LAST_SYNC_RECS,2)
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

  // get events from Banyan
  var events = getEvents(creds.bnn_api_host, creds.bnn_api_key, last_sync.valueOf(), this_sync.valueOf())
  Logger.log(`Info - Received ${events.length} events`)
  
  // push events to Datadog
  var dd = sendLogs(creds.dd_api_host, creds.dd_api_key, events)

  // update sync cells
  last_sync_time_cell.setValue(this_sync)
  last_sync_recs_cell.setValue(events.length)
}

// Ensure API host and key are set
function getCreds() {
  var creds = {}
  creds.bnn_api_host = sheet.getRange(ROW_BNN_API_HOST,2).getValue()
  creds.bnn_api_key = sheet.getRange(ROW_BNN_API_KEY,2).getValue()
  if (!creds.bnn_api_host || !creds.bnn_api_key) {
    return {}
  }
  creds.dd_api_host = sheet.getRange(ROW_DD_API_HOST,2).getValue()
  creds.dd_api_key = sheet.getRange(ROW_DD_API_KEY,2).getValue()
  if (!creds.dd_api_host || !creds.dd_api_key) {
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
      .everyMinutes(sheet.getRange(ROW_SYNC_INTERVAL,2).getValue())
      .create()
  sheet.getRange(ROW_SYNC_ENABLED,2).setValue(true)
}

// Add menu to Sheet
// https://developers.google.com/apps-script/guides/menus
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Banyan Events -> Datadog SIEM')
      .addItem('Enable Sync Job', 'enableSyncJob')
      .addSeparator()
      .addItem('Sync Manually', 'doSync')
      .addSeparator()
      .addItem('Check Credentials', 'getCreds')
      .addToUi();
}