[![npm version](http://img.shields.io/npm/v/glepnir-publish.svg?style=flat-square)](http://browsenpm.org/package/glepnir-publish)[![Build Status](http://img.shields.io/travis/rexxars/glepnir-publish/master.svg?style=flat-square)](https://travis-ci.org/rexxars/glepnir-publish)[![Coverage Status](http://img.shields.io/codeclimate/coverage/github/rexxars/glepnir-publish.svg?style=flat-square)](https://codeclimate.com/github/rexxars/glepnir-publish)[![Code Climate](http://img.shields.io/codeclimate/github/rexxars/glepnir-publish.svg?style=flat-square)](https://codeclimate.com/github/rexxars/glepnir-publish/)

# gleipnir-publish

Gleipnir module that manages publishing of messages. Current features:

* Queues messages while gleipnir connects and asserts exchanges/queues/bindings, then flushes local queue
* Simplifies sending messages by configuring exchange, routing keys and message options.
* Options can be overwritten on a per-message basis

## Installation

```
npm install gleipnir-publish
```

## Usage

```js
var gleipnir = require('gleipnir');
var getPublisher = require('gleipnir-publish');

var client = gleipnir({
    url: 'amqp://some:user@localhost'
});

var publisher = getPublisher(client, {
    exchangeName: 'some-exchange',
    routingKey: ''
});

// Send to configured exchange with defined routing key
publisher.publish('message content');

// Send directly to a queue
publisher.sendToQueue('some-queue', 'message content');
```

## License

MIT-licensed. See LICENSE.
