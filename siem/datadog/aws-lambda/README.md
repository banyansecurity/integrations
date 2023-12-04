# Export Banyan events to Datadog using AWS Lambda

This Python script pulls events from the Banyan API and sends them to DataDog, where you can see them in the Log Viewer.

It's designed to be run every 10 minutes as a cron job or AWS Lambda function.

## Prerequisites

* Python 3.7 (or later)
* `pybanyan` and `datadog-api-client` packages
* Environment variables set up as below

## Environment Variables

* `DD_CLIENT_API_KEY` - get one from the [DataDog API settings] page
* `DD_CLIENT_APP_KEY` - get one from the [DataDog application keys] page
* `BANYAN_REFRESH_TOKEN` - get one from your [Banyan profile] page
* `BANYAN_API_URL` - (optional) defaults to `https://net.banyanops.com`

## Notes

* `service` is already an attribute in DataDog, so the `service` block of an event is renamed to `service_info`.

[DataDog API settings]: https://app.datadoghq.com/account/settings#api
[DataDog application keys]: https://app.datadoghq.com/access/application-keys
[Banyan profile]: https://preview.console.banyanops.com/app/myprofile
