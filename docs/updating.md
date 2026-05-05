# Updating

## Migrate to Event Listener

The JavaScript library uses an `EventListener` class for handling events. This is consistent with the latest version of the protocol.

Example using the `EventListener`:

```javascript
import { EventListener, YtLoungeApi } from '../src/index.js';

class CustomListener extends EventListener {
    constructor() {
        super();
        this.lastVideoId = null;
    }

    async playback_state_changed(event) {
        /** Called when playback state changes (position, play/pause) */
        console.log(
            `New state: ${event.state} = id: ${this.lastVideoId} pos: ${event.current_time} duration: ${event.duration}`
        );
    }

    async now_playing_changed(event) {
        /** Called when active video changes */
        console.log(
            `New state: ${event.state} = id: ${event.video_id} pos: ${event.current_time} duration: ${event.duration}`
        );
        this.lastVideoId = event.video_id;
    }
}

const api = new YtLoungeApi("Some device", new CustomListener());
// Assuming pairingCode is already obtained
await api.pair(pairingCode);
await api.subscribe();
```

By creating a subclass of `EventListener` you can override methods for each type of event you're interested in.
