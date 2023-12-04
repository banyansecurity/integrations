function getEvents(bnn_api_host, bnn_api_key, start, end) {
  var verb = "/api/v1/events"
  var qp = "?skip=0&limit=1000&order=desc"
  qp += "&after=" + start + "&before=" + end

  const headers = {
    Authorization: `Bearer ${bnn_api_key}`,
    'Content-Type': 'application/json',
  }

  const options = {
    method: 'GET',
    headers
  }

  var request = bnn_api_host + verb + qp
  
  Logger.log(request)
  const response = UrlFetchApp.fetch(request, options)
  Logger.log(response)
  resp_json = JSON.parse(response.getContentText())
  Logger.log(resp_json)
  return resp_json.data || []
}
