const { PubSub } = require("graphql-subscriptions");
const pgIPC = require("pg-ipc");
const { Client } = require("pg");
const {
  eventEmitterAsyncIterator
} = require("./event-emitter-to-async-iterator");

class PostgresPubSub extends PubSub {
	constructor(options = {}, commonMessageHandler = message => message) {
    super();
    this.client = options.client || new Client(options);
    if (!options.client) {
      this.client.connect();
    }
    this.ee = new pgIPC(this.client);
    this.subscriptions = {};
    this.subIdCounter = 0;
		this.commonMessageHandler = commonMessageHandler;
  }
  publish(triggerName, payload) {
    this.ee.notify(triggerName, payload);
    return true;
  }
  subscribe(triggerName, onMessage) {
    const callback = message => {
      onMessage(message instanceof Error ? message : this.commonMessageHandler(message.payload));
    };
    this.ee.on(triggerName, callback);
    this.subIdCounter = this.subIdCounter + 1;
    this.subscriptions[this.subIdCounter] = [triggerName, callback];
    return Promise.resolve(this.subIdCounter);
  }
  unsubscribe(subId) {
    const [triggerName, onMessage] = this.subscriptions[subId];
    delete this.subscriptions[subId];
    this.ee.removeListener(triggerName, onMessage);
  }
  asyncIterator(triggers) {
    return eventEmitterAsyncIterator(this.ee, triggers, this.commonMessageHandler);
  }
}

module.exports = { PostgresPubSub };
