# Discovery

## DIAL

YouTube Lounge JS can get the screen id from a DIAL endpoint which allows for automatic discovery.
First you need to obtain the DIAL endpoint URL.

> [!NOTE]
> Discovering the DIAL endpoint is not a part of this library.
> This can be done using SSDP with a ST of `urn:dial-multiscreen-org:service:dial:1`.
> The DIAL endpoint will be the SSDP location.

Once you have the URL, use the `dial` module:

```javascript
import { dial, YtLoungeApi } from '../src/index.js';

const dialUrl = "...";
const result = await dial.get_screen_id_from_dial(dialUrl);

const api = new YtLoungeApi('Test client');
const paired = await api.pair_with_screen_id(result.screen_id, result.screen_name);
console.log(paired);
```
