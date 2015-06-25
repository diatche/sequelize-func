/**
 * Created by diatche on 15/12/14.
 */

'use strict';

var StringDecoder = require('string_decoder').StringDecoder,
    decoder = new StringDecoder('utf8'),
    Sequelize = require('sequelize'),
    moment = require('moment');

var momentExp = /moment(.+)/;

function decodeMoment(str) {
    if (typeof str !== 'string' || !str.length)
        return null;
    return moment(str, moment.ISO_8601);
}

function encodeMoment(m) {
    return m.format(moment.ISO_8601);
}

var func = {
    momentAttribute: function(name) {
        return func.transformableAttribute(name, Sequelize.DATE, {
            forward: function(val) {
                if (val)
                    return moment(val);
                return null;
            }
        });
    },

    /**
     *
     * @param {string} name
     * @param {Object} DataTypes
     * @param {{replacer?: Function, reviver?: Function, default?: *}} [opts]
     * @returns {Object}
     */
    atomicAttribute: function(name, opts) {
        return {
            type: Sequelize.BLOB,
            get: function() {
                var data = this.getDataValue(name);
                if (data) {
                    data = JSON.parse(decoder.write(data), function(k, v) {
                        if (opts.reviver)
                            return opts.reviver(k, v);
                        if (typeof v === "object")
                            return v;
                        var m = decodeMoment(v);
                        if (m && m.isValid())
                            return m;
                        return v;
                    });
                } else {
                    data = opts.defaults;
                }
                return data;
            },
            set: function(d) {
                this.setDataValue(name, new Buffer(JSON.stringify(d, function(k, v) {
                    if (opts.replacer)
                        return opts.replacer(k, v);
                    if (typeof v === "object" && v instanceof moment)
                        return encodeMoment(v);
                    return v;
                }), 'utf8'));
            }
        };
    },

    /**
     *
     * @param name
     * @param DataType
     * @param {{forward?: Function, reverse?: Function}} [opts]
     * @returns {{forward?: Function, reverse?: Function}}
     */
    transformableAttribute: function(name, DataType, opts) {
        var attr = { type: DataType };

        if (opts && opts.forward) {
            attr.get = function() {
                return opts.forward(this.getDataValue(name));
            };
        }
        if (opts && opts.reverse) {
            attr.set = function(val) {
                this.setDataValue(name, opts.reverse(val));
            };
        }

        return attr;
    }
};

module.exports = func;