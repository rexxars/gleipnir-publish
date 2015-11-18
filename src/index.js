'use strict';

var omit = require('lodash.omit');
var assign = require('lodash.assign');

/**
 * Returns a gleipnir publisher that will use the passed configuration to publish messages
 *
 * @param  {Gleipnir} gleipnir Gleipnir client
 * @param  {Object}   opts     Object of options to use. Required parameters: `exchangeName` and `routingKey`
 * @return {Object}            Returns the publish API, consisting of `publish()` and `sendToQueue()`
 */
function publisher(gleipnir, opts) {
    // Ensure that the passed client has the necessary methods
    if (!gleipnir || typeof gleipnir.addReadyListener !== 'function') {
        throw new TypeError('First argument must be a valid gleipnir client');
    }

    // Instance options
    var options = opts || {};
    var writeCallbackQueue = [];
    var messageQueue = [];
    var isReady = false;
    var channel;

    // Inform gleipnir that we want to know when it's ready for us to publish
    gleipnir.addReadyListener(onReady);

    // External API
    return {
        publish: publish,
        sendToQueue: sendToQueue
    };

    /**
     * Method called once Gleipnir client is ready to receive publish-calls
     *
     * @param {AmqpChannel} chan
     */
    function onReady(chan) {
        channel = chan;
        isReady = true;

        channel.on('drain', triggerWriteCallbacks);
        flushQueue();
    }

    /**
     * Publish a message to the defined exchange name
     *
     * @param  {Buffer}   content  Content of the message
     * @param  {Object}   msgOpts  Optional message-specific options - will be merged with publisher options
     * @param  {Function} callback Function to call when message has been written to the write buffer
     * @return {void}
     */
    function publish(content, msgOpts, callback) {
        if (!isReady) {
            return messageQueue.push({
                content: content,
                opts: msgOpts,
                callback: callback
            });
        }

        if (typeof msgOpts === 'function') {
            callback = msgOpts;
            msgOpts = {};
        }

        msgOpts = assign({}, options, msgOpts);

        if (channel.publish(
            msgOpts.exchangeName || options.exchangeName,
            msgOpts.routingKey || options.routingKey,
            Buffer.isBuffer(content) ? content : new Buffer(content),
            omit(msgOpts, ['exchangeName', 'routingKey'])
        )) {
            // Written to buffer, return
            return callback && setImmediate(callback);
        }

        if (callback) {
            writeCallbackQueue.push(callback);
        }
    }

    /**
     * Send a message directly to a queue
     *
     * @param  {String}   queue    Queue to send message to
     * @param  {Buffer}   content  Content of the message
     * @param  {Object}   msgOpts  Optional message-specific options - will be merged with publisher options
     * @param  {Function} callback Function to call when message has been written to the write buffer
     * @return {void}
     */
    function sendToQueue(queue, content, msgOpts, callback) {
        if (!isReady) {
            return messageQueue.push({
                content: content,
                opts: msgOpts,
                queue: queue,
                callback: callback
            });
        }

        if (typeof msgOpts === 'function') {
            callback = msgOpts;
            msgOpts = {};
        }

        msgOpts = assign({}, options, msgOpts);

        if (channel.sendToQueue(
            queue,
            Buffer.isBuffer(content) ? content : new Buffer(content),
            omit(msgOpts, ['exchangeName', 'routingKey'])
        )) {
            return callback && setImmediate(callback);
        }

        if (callback) {
            writeCallbackQueue.push(callback);
        }
    }

    /**
     * Flush the internal queue of unpublished messages
     *
     * @return {void}
     */
    function flushQueue() {
        var msg;
        while (messageQueue.length) {
            msg = messageQueue.shift();

            if (msg.queue) {
                sendToQueue(msg.queue, msg.content, msg.opts, msg.callback);
            } else {
                publish(msg.content, msg.opts, msg.callback);
            }
        }
    }

    /**
     * Trigger all the queued write callbacks
     *
     * @return {void}
     */
    function triggerWriteCallbacks() {
        while (writeCallbackQueue.length) {
            writeCallbackQueue.shift()();
        }
    }
}

module.exports = publisher;
