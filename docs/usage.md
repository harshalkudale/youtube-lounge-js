# Usage

## Installation

To use YouTube Lounge JS, first install the dependencies using npm:

```bash
npm install
```

## Initialization

Import and create an instance of the `YtLoungeApi` class, which takes a device name and optionally an event listener and logger:

```javascript
import { YtLoungeApi } from '../src/index.js';

const api = new YtLoungeApi('Test client');
```

When we have an instance of the class, we need to pair with a screen.
Currently this can be done through a pairing code (this can be found in the app's settings) or through the [discovery](discovery.md) protocol.
Using a pairing code it would look something like this:

```javascript
const pairingCode = "123456789012"; // 12-digit code from TV
const pairedAndLinked = await api.pair(pairingCode);
```

If this succeeds the api is now in a linked state.
This means we have the two requirements to connect to a screen: the screen identifier and the lounge id token.
The screen identifier should remain the same, but the lounge id token can change.
If needed, you can refresh the lounge id token using `refresh_auth`:

```javascript
const linked = await api.refresh_auth();
```

From a linked state, the api is ready to connect:

```javascript
await api.connect();
```

If a connection is attempted to an unsupported client such as YouTube TV Kids, an error will be thrown.

If this succeeds, commands can now be submitted, such as `seek_to`:

```javascript
// seek to 10 seconds
const seekSuccess = await api.seek_to(10);
```

## Subscribing to Events

You can also subscribe to the screen's status:

```javascript
import { EventListener } from '../src/event_listener.js';

class YtListener extends EventListener {
    async now_playing_changed(event) {
        /** Called when active video changes */
        console.log(
            `New state: ${event.state} = id: ${event.video_id} pos: ${event.current_time} duration: ${event.duration}`
        );
    }
}

const listener = new YtListener();
const api = new YtLoungeApi('Test client', listener);

// this will block until the subscription ends or an error occurs
await api.subscribe();
```
