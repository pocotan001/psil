'use strict';

require('es6-promise').polyfill();

var fs = require('fs');
var portfinder = require('portfinder');
var httpServer = require('http-server');
var ngrok = require('ngrok');
var psi = require('psi');

function Deferred() {
    this.promise = new Promise((function(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }).bind(this));
}

/**
 * @param {String} url
 * @return {Boolean}
 */
function isLocalIP(url) {
    return /^localhost|127\.0\.0\.1|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.|192\.168\./.test(url);
}

/**
 * @param {String} url
 * @return {String}
 */
function extractPort(url) {
    var matched = url.match(/:(\d+)/);

    return matched && matched[1];
}

/**
 * @param {String} filePath
 * @param {Function} callback
 */
function existsFilePath(filePath, callback) {
    fs.lstat(filePath, function(err) {
        var exists = !err;

        callback(exists);
    });
}

/**
 * @param {String} path
 * @param {Object} options
 * @return {Promise}
 */
function handleOptions(path, options) {
    var deferred = new Deferred();

    options.root = options.root || './';
    options.httpServer = {};
    options.ngrok = options.ngrok || {};
    options.psi = options.psi || {};

    if (isLocalIP(path)) {
        options.ngrok.host = path;
        options.ngrok.port = extractPort(path);
        deferred.resolve(options);
    } else {
        existsFilePath(path, function(exists) {
            if (exists) {
                options.httpServer.root = options.root;
                options.psi.path = path;

                portfinder.getPort(function(err, port) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        options.httpServer.port = port;
                        options.ngrok.port = port;
                        deferred.resolve(options);
                    }
                });
            } else {
                options.psi.host = path;
                deferred.resolve(options);
            }
        });
    }

    return deferred.promise;
}

/**
 * @param {Object} options
 * @return {Promise}
 */
function listenServer(options) {
    var deferred = new Deferred();

    if (options.httpServer.root) {
        httpServer
            .createServer(options.httpServer)
            .listen(options.httpServer.port, 'localhost', function() {
                deferred.resolve(options);
            });
    } else {
        deferred.resolve(options);
    }

    return deferred.promise;
}

/**
 * @param {Object} options
 * @return {Promise}
 */
function connectNgrok(options) {
    var deferred = new Deferred();

    if (options.ngrok.host || options.ngrok.port) {
        ngrok.connect(options.ngrok, function(err, tunnelUrl) {
            if (err) {
                deferred.reject(err);
            } else {
                options.psi.host = tunnelUrl;
                deferred.resolve(options);
            }
        });
    } else {
        deferred.resolve(options);
    }

    return deferred.promise;
}

/**
 * @param {Object} options
 * @return {Promise}
 */
function outputPsi(options) {
    var deferred = new Deferred();

    if (options.psi.host) {
        if (options.psi.path) {
            options.psi.host += '/' + options.psi.path;
        }

        psi.output(options.psi.host, options.psi, function(err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise;
}

/**
 * @param {String} [path]
 * @param {Object} [options]
 * @param {Function} [callback]
 */
function psil(path, options, callback) {
    path = path || 'index.html';
    options = options || {};
    callback = callback || function() {};

    handleOptions(path, options)
        .then(listenServer)
        .then(connectNgrok)
        .then(outputPsi)
        .then(callback)
        .catch(callback);
}

module.exports = psil;
