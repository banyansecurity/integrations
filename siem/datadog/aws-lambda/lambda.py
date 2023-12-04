#! /usr/bin/env python

import json
import os
from datetime import datetime, timedelta, timezone
from pprint import pprint
from typing import List
from urllib.parse import urlparse

from banyan.api import BanyanApiClient
from banyan.api.event_v2 import EventV2

from datadog_api_client.v1 import Configuration, ApiClient
from datadog_api_client.v1.api import logs_api
from datadog_api_client.v1.models import *

bc = BanyanApiClient()
api_url = urlparse(bc.api_url)
api_host = api_url.hostname.split('.')[0]

end_dt = datetime.now()
start_dt = end_dt - timedelta(minutes=10)

ddconf = Configuration(api_key={
    'apiKeyAuth': os.getenv('DD_CLIENT_API_KEY'),
    'appKeyAuth': os.getenv('DD_CLIENT_APP_KEY')
})

# Enter a context with an instance of the API client
with ApiClient(ddconf) as ddc:
    logs_api = logs_api.LogsApi(ddc)
    logs: List[HTTPLog] = list()
    events: List[EventV2] = bc.events.list(before_dt=end_dt, after_dt=start_dt)
    print(f'Found {len(events)} events from {start_dt} to {end_dt}')
    for event in events:
        # convert event back to JSON
        message = EventV2.Schema().dump(event)

        # make some tags
        tags = ['org_name:' + event.org_name]
        if event.role is not None:
            for role in event.role:
                tags.append('role:' + role.role_name)
        if event.policy is not None and event.policy.policy_name != '':
            tags.append('policy:' + event.policy.policy_name)
        if event.user_principal is not None and event.user_principal.user is not None:
            user = event.user_principal.user
            if user.email != '':
                tags.append('user:' + event.user_principal.user.email)
            for group in user.groups:
                tags.append('group:' + group)
            for role in user.roles:
                tags.append('role:' + role)

        # capture source/destination IP:host info
        if event.link is not None:
            message['network'] = {}
            if event.link.source.host_name != '':
                ip, port = event.link.source.host_name.split(':')
                message['network']['client'] = {'ip': ip, 'port': int(port)}
            elif event.link.source.ip != '':
                ip, port = event.link.source.ip.split(':')
                message['network']['client'] = {'ip': ip, 'port': int(port)}
            if event.link.destination.host_name != '':
                ip, port = event.link.destination.host_name.split(':')
                message['network']['destination'] = {'ip': ip, 'port': int(port)}
            elif event.link.destination.ip != '':
                ip, port = event.link.destination.ip.split(':')
                message['network']['destination'] = {'ip': ip, 'port': int(port)}

        # move 'service' to 'service_info' so it doesn't conflict with built-in DataDog attribute 'service'
        message['service_info'] = message['service']
        del message['service']

        # remove empty blocks
        if 'policy' in message and message['policy']['name'] == '':
            del message['policy']
        if 'trustscore' in message and message['trustscore']['timestamp'] == 0:
            del message['trustscore']

        # convert created_at timestamp to timezone-aware ISO format
        created_at = event.created_at.astimezone()
        message['timestamp'] = created_at.isoformat()

        service = event.service.service_name if event.service else None
        item = HTTPLogItem(message=json.dumps(message), service=service, ddtags=','.join(tags),
                           ddsource="bcc", hostname=api_host)
        logs.append(item)

    response = logs_api.submit_log(HTTPLog(logs))
    print(response)
