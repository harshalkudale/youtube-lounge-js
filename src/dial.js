import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

export class DialResult {
    constructor(screen_name, screen_id) {
        this.screen_name = screen_name;
        this.screen_id = screen_id;
    }
}

const DEVICE_NAMESPACE = 'urn:schemas-upnp-org:device-1-0';
const SERVICE_NAMESPACE = 'urn:dial-multiscreen-org:schemas:dial';

function _get_optional_element_text(element, def = '') {
    if (!element) return def;
    if (typeof element === 'string') return element;
    if (Array.isArray(element) && element.length > 0) return element[0];
    return def;
}

export async function get_screen_id_from_dial(url) {
    const resp = await fetch(url);
    if (resp.status !== 200) return null;
    const headers = Object.fromEntries(resp.headers.entries());
    const devicesXml = await resp.text();
    const devices = await parseStringPromise(devicesXml);
    const friendlyName = devices?.root?.device?.[0]?.friendlyName?.[0] || '';
    const app_url = headers['application-url'];
    if (!app_url) return null;
    const youtube_url = app_url + 'YouTube';
    const resp2 = await fetch(youtube_url);
    if (resp2.status !== 200) return null;
    const serviceXml = await resp2.text();
    const service = await parseStringPromise(serviceXml);
    const screen_id = service?.service?.additionalData?.[0]?.screenId?.[0];
    if (screen_id) {
        return new DialResult(friendlyName, screen_id);
    }
    return null;
}
