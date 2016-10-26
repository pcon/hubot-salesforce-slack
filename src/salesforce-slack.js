// Description:
//   Checks the salesforce trust site and alerts a channel if there is a service interruption
//
// Dependencies:
//   None
//
// Configuration:
//   HUBOT_SFDCTRUST_CHANNELS - A comma separated list of channels to announce to
//
// Commands:
//   hubot status <instance> - Gets the status
//   hubot version <instance> - Gets the version information
//   hubot alias <name> - Gets the instance name for the given alias
//
// Author:
//   pcon

/*jslint browser: true, regexp: true */
/*global module, require, console */

var https = require('https');
var Q = require('q');
var lo = require('lodash');
var moment = require('moment');
var quiche = require('quiche');

var STATUS_IMAGE_MAP = {
    'Healthy': 'https://trust.salesforce.com/static/images/user_guide/Healthy@2x.png',
    'Maintenance': 'https://trust.salesforce.com/static/images/user_guide/Maintenance@2x.png',
    'Disruption': 'https://trust.salesforce.com/static/images/user_guide/Disruption@2x.png',
    'Degradation': 'https://trust.salesforce.com/static/images/user_guide/Degradation@2x.png',
    'Healthy_Disruption': 'https://trust.salesforce.com/static/images/user_guide/Healthy_Disruption@2x.png',
    'Healthy_Degradation': 'https://trust.salesforce.com/static/images/user_guide/Healthy_Degradation@2x.png',
    'Healthy_Maintenance': 'https://trust.salesforce.com/static/images/user_guide/Healthy_Maintenance@2x.png'
};

var CHART_TITLE_MAP = {
    'TransactionCount': 'Daily Transaction Count',
    'AvgTransactionSpeed': 'Daily Average Transactions Time'
};

var CHART_SCALE_MAP = {
    'TransactionCount': 1000000000.0,
    'AvgTransactionSpeed': 1
};

var CHART_LABEL_MAP = {
    'TransactionCount': 'All Instances (in Billions)',
    'AvgTransactionSpeed': 'All Instances (in ms)'
};

function getData(url) {
    'use strict';

    var data = '',
        deferred = Q.defer();

    https.get(url, function (res) {
        if (res.statusCode !== 200) {
            deferred.reject(new Error(res.statusCode));
        } else {
            res.on('data', function (d) {
                data += d;
            });

            res.on('end', function () {
                deferred.resolve(JSON.parse(data));
            });
        }
    }).on('error', function (e) {
        deferred.reject(e);
    });

    return deferred.promise;
}

function getInstanceInfo(instance) {
    'use strict';

    var url = 'https://api.status.salesforce.com/v1/instances/' + instance.toUpperCase() + '/status',
        deferred = Q.defer();

    getData(url)
        .then(function (data) {
            if (data.key === undefined || data.key !== instance.toUpperCase()) {
                deferred.reject(new Error('Unknown instance'));
            } else {
                deferred.resolve(data);
            }
        }).fail(function (e) {
            deferred.reject(e);
        });

    return deferred.promise;
}

function getInstanceAlias(instance) {
    'use strict';

    var url = 'https://api.status.salesforce.com/v1/instanceAliases/' + instance;

    return getData(url);
}

function getMetricValues() {
    'use strict';

    var url = 'https://api.status.salesforce.com/v1/metricValues';

    return getData(url);
}

module.exports = function (robot) {
    'use strict';

    robot.respond(/status ([A-Za-z0-9]+)$/i, function (msg) {
        var attachment, msg_data, stat, incident, impact, maint, m_start, m_end,
            match = msg.match[1];

        getInstanceInfo(match)
            .then(function (data) {
                attachment = {
                    title: data.key + ' status',
                    title_link: 'https://status.salesforce.com/status/' + data.key
                };

                stat = 'Healthy';

                if (!lo.isEmpty(data.Incidents)) {
                    incident = lo.last(data.Incidents);
                    impact = lo.first(incident.IncidentImpacts);
                    m_start = moment(impact.startTime);
                    m_end = (impact.endTime === null) ? moment() : moment(impact.endTime);

                    if (m_end.isSameOrAfter(moment())) {
                        if (incident.IncidentImpacts[0].type === 'performanceDegradation') {
                            stat = 'Degradation';
                        } else {
                            stat = 'Disruption';
                        }
                    }

                    attachment.fallback = stat + ' - ' + incident.message.rootCause;
                    attachment.text = (incident.message.rootCause !== null) ? incident.message.rootCause : lo.upperFirst(impact.severity) + ' ' + stat;
                    attachment.footer = 'Last updated ' + moment(incident.updatedAt).fromNow();

                    if (!lo.isEmpty(incident.serviceKeys) && stat !== 'Healthy') {
                        attachment.fields = [
                            {
                                title: "Services",
                                value: lo.join(incident.serviceKeys),
                                short: false
                            }
                        ];
                    }
                } else if (!lo.isEmpty(data.Maintenances)) {
                    maint = lo.first(data.Maintenances);
                    m_start = moment(maint.plannedStartTime);
                    m_end = moment(maint.plannedEndTime);

                    if (m_end.isSameOrAfter(moment()) && m_start.isSameOrBefore(moment())) {
                        if (maint.message.availability === 'unavailable') {
                            stat = 'Maintenance';
                        } else {
                            stat = 'Healthy_Maintenance';
                        }
                    }

                    attachment.fallback = stat + ' - ' + maint.name;
                    attachment.text = maint.name;
                    attachment.footer = 'Last updated ' + moment(maint.updatedAt).fromNow();
                }

                if (stat === 'Healthy') {
                    attachment.fallback = 'No incidents reported';
                    attachment.text = 'No incidents reported';
                    delete attachment.footer;
                }

                attachment.thumb_url = STATUS_IMAGE_MAP[stat];

                msg_data = {
                    attachments: [attachment],
                    channel: msg.message.room
                };

                robot.adapter.customMessage(msg_data);
            }).fail(function () {
                msg.reply('Unknown instance "' + match + '"');
            });
    });

    robot.respond(/version ([A-Za-z0-9]+)$/i, function (msg) {
        var attachment, msg_data,
            match = msg.match[1];

        getInstanceInfo(match)
            .then(function (data) {
                attachment = {
                    title: data.key + ' version information',
                    title_link: 'https://status.salesforce.com/status/' + data.key,
                    fields: [
                        {
                            "title": "Release Version",
                            "value": data.releaseVersion,
                            "short": false
                        }
                    ]
                };

                msg_data = {
                    attachments: [attachment],
                    channel: msg.message.room
                };

                robot.adapter.customMessage(msg_data);
            }).fail(function () {
                msg.reply('Unknown instance "' + match + '"');
            });
    });

    robot.respond(/alias ([A-Za-z0-9\.\-]+)$/i, function (msg) {
        var match = msg.match[1];

        getInstanceAlias(match)
            .then(function (data) {
                msg.reply(match + ' runs on ' + data.instanceKey);
            }).fail(function (e) {
                console.log(e);
            });
    });

    robot.respond(/metrics$/i, function (msg) {
        var chart, image_data, msg_data,
            image_data_list = [],
            sorted_data = {};

        getMetricValues()
            .then(function (data) {
                lo.each(data, function (row) {
                    if (!lo.has(sorted_data, row.metricValueName)) {
                        sorted_data[row.metricValueName] = [];
                    }

                    sorted_data[row.metricValueName].push(row);
                });

                lo.each(lo.keys(sorted_data), function (key) {
                    sorted_data[key] = lo.sortBy(sorted_data[key], 'timestamp');
                    image_data = {
                        name: key,
                        title: CHART_TITLE_MAP[key],
                        data: [],
                        labels: []
                    };

                    lo.each(lo.takeRight(sorted_data[key], 30), function (row) {
                        image_data.data.push(row.value / CHART_SCALE_MAP[key]);
                        image_data.labels.push(moment(row.timestamp).format('YYYY-MM-DD'));
                    });

                    chart = quiche('line');
                    chart.setTitle(image_data.title);
                    chart.addData(image_data.data, CHART_LABEL_MAP[key], '0000cc');
                    chart.setAutoScaling();
                    chart.setTransparentBackground();
                    chart.setLegendTop();
                    chart.setHeight(250);
                    chart.setWidth(400);
                    image_data.url = chart.getUrl(true);

                    image_data_list.push(image_data);
                });

                msg_data = {
                    attachments: [],
                    channel: msg.message.room
                };

                lo.each(image_data_list, function (image_data) {
                    msg_data.attachments.push({
                        title: image_data.title,
                        title_link: 'https://status.salesforce.com/performance',
                        image_url: image_data.url
                    });
                });

                robot.adapter.customMessage(msg_data);

            }).fail(function (e) {
                console.log(e);
            });
    });
};