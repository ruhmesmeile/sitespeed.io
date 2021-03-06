'use strict';

const statsHelpers = require('../../support/statsHelpers'),
  forEach = require('lodash.foreach');

const METRIC_NAMES = ['transferSize', 'contentSize', 'requests'];

module.exports = {
  stats: {},
  groups: {},
  addToAggregate(pageSummary, group) {

    if (this.groups[group] === undefined) {
      this.groups[group] = {};
    }

    let stats = this.stats;
    let groups = this.groups;

    pageSummary.forEach(function(summary) {
      // stats for the whole page
      METRIC_NAMES.forEach(function(metric) {
        statsHelpers.pushGroupStats(stats, groups[group], metric, summary[metric]);
      });

      Object.keys(summary.contentTypes).forEach(function(contentType) {
        METRIC_NAMES.forEach(function(metric) {
          statsHelpers.pushGroupStats(stats,groups[group], 'contentTypes.' + contentType + '.' + metric, summary.contentTypes[contentType][metric]);
        });
      })

      Object.keys(summary.responseCodes).forEach(function(responseCode) {
        statsHelpers.pushGroupStats(stats, groups[group], 'responseCodes.' + responseCode, summary.responseCodes[responseCode]);
      });

      // extras for firstParty vs third
      if (summary.firstParty.requests) {
        METRIC_NAMES.forEach(function(metric) {
          statsHelpers.pushGroupStats(stats, groups[group], 'firstParty' + '.' + metric, summary.firstParty[metric]);
          statsHelpers.pushGroupStats(stats, groups[group], 'thirdParty' + '.' + metric, summary.thirdParty[metric]);
        })
      }

      // Add the total amount of domains on this page
      statsHelpers.pushGroupStats(stats, groups[group], 'domains', (Object.keys(summary.domains)).length);

      forEach(summary.assets, (asset) => {
        statsHelpers.pushGroupStats(stats, groups[group], 'expireStats', asset.expires);
        statsHelpers.pushGroupStats(stats, groups[group], 'lastModifiedStats', asset.timeSinceLastModified);
      });

    })

  },
  summarize() {
    const summary = {
      total: this.summarizePerObject(this.stats),
      groups: {}
    };

    for (let group of Object.keys(this.groups)) {
      summary.groups[group] = this.summarizePerObject(this.groups[group]);
    }
    return summary;

  },
  summarizePerObject(type) {
    return Object.keys(type).reduce((summary, name) => {
      if (METRIC_NAMES.indexOf(name) > -1 || name.match(/(^domains|^expireStats|^lastModifiedStats)/)) {
        statsHelpers.setStatsSummary(summary, name, type[name])
      } else {
        if (name === 'contentTypes') {
          const contentTypeData = {};
          forEach(Object.keys(type[name]), (contentType) => {
            forEach(type[name][contentType], (stats, metric) => {
              statsHelpers.setStatsSummary(contentTypeData, [contentType, metric], stats)
            });
          });
          summary[name] = contentTypeData;
        } else if(name === 'responseCodes') {
          const responseCodeData = {};
          type.responseCodes.forEach((stats, metric) =>{
            statsHelpers.setStatsSummary(responseCodeData, metric, stats);
          });
          summary[name] = responseCodeData;
        } else {
          const data = {};
          forEach(type[name], (stats, metric) => {
            statsHelpers.setStatsSummary(data, metric, stats)
          });
          summary[name] = data;
        }
      }
      return summary;
    }, {});
  }
};
