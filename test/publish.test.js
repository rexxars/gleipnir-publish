'use strict';

var assert = require('assert');
var mocha = require('mocha');
var sinon = require('sinon');
var pkg = require('../package.json');
var getPublisher = require('../');

var noop = function() {};
var describe = mocha.describe;
var it = mocha.it;

describe(pkg.name, function() {
    it('should throw type error if invalid gleipnir client given', function() {
        assert.throws(getPublisher);
        assert.throws(function() {
            getPublisher({ addReadyListener: '' });
        });
        assert.doesNotThrow(function() {
            getPublisher({ addReadyListener: noop });
        });
    });

    it('should buffer messages until ready listener has been called', function() {
        var publish = sinon.spy(), send = sinon.spy();
        var client = getMockClient({ publish: publish, sendToQueue: send }, true);
        var publisher = getPublisher(client);

        publisher.publish('foo');
        publisher.publish('bar');
        publisher.sendToQueue('queue', 'msg');

        assert.equal(publish.callCount, 0);
        assert.equal(send.callCount, 0);
        client.triggerReady();

        assert.equal(publish.callCount, 2);
        assert.equal(send.callCount, 1);
    });

    it('should make buffers out of non-buffer messages', function(done) {
        var publish = sinon.spy();
        var client = getMockClient({ publish: publish });
        var publisher = getPublisher(client, { exchangeName: 'ex', routingKey: 'key' });

        publisher.publish('foo');
        publisher.publish(new Buffer('bar'), { exchangeName: 'baz' });

        process.nextTick(function() {
            assert(publish.calledWith(
                sinon.match.same('ex'),
                sinon.match.same('key'),
                sinon.match.instanceOf(Buffer)
            ));

            assert(publish.calledWith(
                sinon.match.same('baz'),
                sinon.match.same('key'),
                sinon.match.instanceOf(Buffer)
            ));
            done();
        });
    });

    it('can override preconfigured exchange and routing key', function(done) {
        var publish = sinon.spy();
        var client = getMockClient({ publish: publish });
        var publisher = getPublisher(client, { exchangeName: 'ex', routingKey: 'key' });

        publisher.publish('foo', { routingKey: 'ehh' });
        publisher.publish('bar', { exchangeName: 'baz' });
        publisher.publish('def');

        process.nextTick(function() {
            assert(publish.calledWith(
                sinon.match.same('ex'),
                sinon.match.same('ehh'),
                sinon.match(equal('foo'))
            ));

            assert(publish.calledWith(
                sinon.match.same('baz'),
                sinon.match.same('key'),
                sinon.match(equal('bar'))
            ));

            assert(publish.calledWith('ex', 'key', sinon.match(equal('def'))));
            done();
        });
    });

    it('can send directly to a queue', function(done) {
        var sendToQueue = sinon.spy();
        var publisher = getPublisher(getMockClient({ sendToQueue: sendToQueue }));

        publisher.sendToQueue('queueName', 'content!', { foo: 'bar' });
        publisher.sendToQueue('queueName', new Buffer('buffer'));

        process.nextTick(function() {
            assert(sendToQueue.calledWith(
                sinon.match.same('queueName'),
                sinon.match(equal('content!')),
                sinon.match(function(obj) {
                    return obj.foo === 'bar';
                })
            ));

            done();
        });
    });
});

function equal(expected) {
    return function(str) {
        return str.toString() === expected;
    };
}

function getMockClient(channel, skipReady) {
    var ready;
    var mock = {
        addReadyListener: function(cb) {
            ready = cb;
        },

        // For testing purposes
        triggerReady: function() {
            ready(channel || {});
        }
    };

    if (!skipReady) {
        process.nextTick(mock.triggerReady);
    }

    return mock;
}
