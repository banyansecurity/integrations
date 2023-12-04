const DD_SOURCE = "banyan"
const DD_HOSTNAME = "banyan-api"
const DD_SERVICE = "banyan-events"

function sendLogs(dd_api_host, dd_api_key, events) {
  Logger.log(dd_api_key)
  Logger.log(events)

  var logs = []
  for (event of events) {
    // tags
    var tags = `org_name:${event.org_name},event_type:${event.type}`

    // convert created_at timestamp to timezone-aware ISO format
    var created_at = new Date(event.created_at)
    event['timestamp'] = created_at.toISOString()

    // move 'service' to 'service_info' so it doesn't conflict with built-in DataDog attribute 'service'
    event['service_info'] = event['service']
    delete event['service']

    var elem = {
      "message": event,
      "ddtags": tags,
      "ddsource": DD_SOURCE,
      "hostname": DD_HOSTNAME,
      "service": DD_SERVICE
    }

    logs.push(elem)
  }

  var verb = "/api/v2/logs"
  var qp = ""

  const headers = {
    'DD-API-KEY': dd_api_key,
    'Content-Type': 'application/json',
    'Content-Encoding': 'identity'
  }

  const options = {
    method: 'POST',
    headers,
    payload: JSON.stringify(logs),
  }

  var request = dd_api_host + verb + qp
  
  Logger.log(request)
  const response = UrlFetchApp.fetch(request, options)
  Logger.log(response)
}
