/********************************************
 * within-time-switch:
 *********************************************/
"use strict";

const path = require('path');
const hlp = require(path.join(__dirname, '/lib/sunPosHelper.js'));

module.exports = function (RED) {
    "use strict";

    function withinTimeSwitchNode(config) {
        RED.nodes.createNode(this, config);
        // Retrieve the config node
        this.positionConfig = RED.nodes.getNode(config.positionConfig);

        this.property = config.property;
        this.propertyType = config.propertyType || "global";
        var node = this;
        this.debug('initialize node');

        this.on('input', msg => {
            try {
                this.debug('starting ' + JSON.stringify(msg, Object.getOwnPropertyNames(msg)));
                this.debug('self ' + JSON.stringify(this, Object.getOwnPropertyNames(this)));
                this.debug('config ' + JSON.stringify(config, Object.getOwnPropertyNames(config)));

                let now = new Date();
                if ((typeof msg.ts === 'string') || (msg.ts instanceof Date)) {
                    let dto = new Date(msg.ts);
                    if (dto !== "Invalid Date" && !isNaN(dto)) {
                        now = dto;
                    }
                }
                let start;
                let end;
                let alternateTimes = this.propertyType !== 'none';
                if (alternateTimes) {
                    this.debug('alternate times enabled');
                    if (this.propertyType === 'msg') {
                        alternateTimes = (RED.util.getMessageProperty(msg, this.property, true) == true);
                    } else if (this.propertyType === 'flow' || this.propertyType === 'global') {
                        var contextKey = RED.util.parseContextStore(this.property);
                        alternateTimes = (this.context()[this.propertyType].get(contextKey.key, contextKey.store) == true);
                    } else if (this.propertyType === 'jsonata') {
                        try {
                            alternateTimes = RED.util.evaluateJSONataExpression(node.property,msg);
                        } catch(err) {
                            this.error(RED._("within-time-switch.errors.invalid-jsonata-expr",{error:err.message}));
                            alternateTimes = false;
                        }
                    } else {
                        alternateTimes = false;
                        this.error(RED._("within-time-switch.errors.invalid-property-type",{type:this.propertyType, value:this.property}));
                    }
                }

                if (alternateTimes && config.startTimeAltType !== 'none') {
                    this.debug('using alternate start time');
                    start = hlp.getTime(this, now, config.startTimeAltType, config.startTimeAlt, config.startOffsetAlt);
                } else {
                    start = hlp.getTime(this, now, config.startTimeType, config.startTime, config.startOffset);
                }
                if (alternateTimes && config.endTimeAltType !== 'none') {
                    this.debug('using alternate end time');
                    end = hlp.getTime(this, now, config.endTimeAltType, config.endTimeAlt, config.endOffsetAlt);
                } else {
                    end = hlp.getTime(this, now, config.endTimeType, config.endTime, config.startOffset);
                }

                this.debug(start + ' - ' + now + ' - ' + end);

                start = start.getMinutes() + start.getHours() * 60;
                end = end.getMinutes() + end.getHours() * 60;
                let cmpNow = now.getMinutes() + now.getHours() * 60;

                this.debug(start + ' - ' + now + ' - ' + end);
                if (start < end) {
                    if (cmpNow >= start && cmpNow <= end) {
                        this.send([msg, null]);
                        this.status({
                            fill: "green",
                            shape: "dot",
                            text: now.getHours() + ':' + now.getMinutes()
                        });
                        return;
                    }
                } else {
                    if (!(cmpNow > end && cmpNow < start)) {
                        this.send([msg, null]);
                        this.status({
                            fill: "green",
                            shape: "ring",
                            text: now.getHours() + ':' + now.getMinutes()
                        });
                        return;
                    }
                }
                this.status({
                    fill: "yellow",
                    shape: "dot",
                    text: now.getHours() + ':' + now.getMinutes()
                });
                this.send([null, msg]);
            } catch (err) {
                hlp.errorHandler(this, err, RED._("within-time-switch.errors.exception-gen-text"), RED._("within-time-switch.errors.exception-gen-title"));
            }
        });
    }
    RED.nodes.registerType('within-time-switch', withinTimeSwitchNode);
};
