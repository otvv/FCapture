/*

FCapture Preview

- github@otvv
- 09/25/2024

*/

export class fEventHandler {
  constructor() {
    this.events = new Map();
  }

  // event listener (and its aliases)
  on(eventSignal, listenerCallback) {
    if (this.events.has(eventSignal)) {
      console.warn(
        "[fcapture-preview] - eventHandler@on: event signal already exists in the events map."
      );
      return;
    }

    // add event signal/message into the events map
    this.events.set(eventSignal, listenerCallback);
  }
  listen(eventSignal, listenerCallback) {
    this.on(eventSignal, listenerCallback);
  }
  receive(eventSignal, listenerCallback) {
    this.on(eventSignal, listenerCallback);
  }

  // event sender (and its aliases)
  emit(eventSignal, ..._args) {
    if (!this.events.has(eventSignal)) {
      console.warn(
        "[fcapture-preview] - eventHandler@call: event signal does not exist/has not been found in the events map."
      );
      return;
    }

    // look in the event map for registered events to emit the callback
    this.events.get(eventSignal)(..._args);
  }
  call(eventSignal, ..._args) {
    this.emit(eventSignal, ..._args);
  }
  send(eventSignal, ..._args) {
    this.emit(eventSignal, ..._args);
  }

  // event listener stopper (and alias)
  stop(eventSignal) {
    if (!this.events.has(eventSignal)) {
      console.warn(
        "[fcapture-preview] - eventHandler@call: event signal does not exist/has not been found in the events map."
      );
      return;
    }

    // remove a specific event from the events map
    this.events.delete(eventSignal);
  }
  remove(eventSignal) {
    this.stop(eventSignal);
  }

  // clear all events from event listener map
  clear() {
    this.events.clear();
  }
}
