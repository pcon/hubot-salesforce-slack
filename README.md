# hubot-salesforce-slack

A slack module for hubot to display Salesforce related data

See [`src/salesforce-slack.js`](src/salesforce-slack.js) for full documentation.

## Installation

In hubot project repo, run:

`npm install hubot-salesforce-slack --save`

Then add **hubot-salesforce-slack** to your `external-scripts.json`:

```json
[
  "hubot-salesforce-slack"
]
```

# Interactions
## Instance Status
Gets the current status of the instance requested

```
user1> darylshaber status na7
```

![Status](https://raw.githubusercontent.com/pcon/hubot-salesforce-slack/master/assets/graphics/status.png "Status")

## Instance Version 
Gets the current version of the instance requested

```
user1> darylshaber version na7
```

![Version](https://raw.githubusercontent.com/pcon/hubot-salesforce-slack/master/assets/graphics/version.png "Version")

## Alias 
Gets the underlying org for a given alias

```
user1>> darylshaber alias org62
darylshaber>> @user1 org62 runs on NA44
```

![Alias](https://raw.githubusercontent.com/pcon/hubot-salesforce-slack/master/assets/graphics/alias.png "Alias")

## Pod Metrics 
Displays two graphs representing the metrics for all pods. These graphs are the daily transaction count (in billions) and the daily average transaction time (in ms).

```
user1> darylshaber metrics
```

![Metrics](https://raw.githubusercontent.com/pcon/hubot-salesforce-slack/master/assets/graphics/metrics.png "Metrics")

## NPM Module

https://www.npmjs.com/package/hubot-salesforce-slack