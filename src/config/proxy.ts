import _Config from '../config/config.js';
const oxy = _Config.proxy.oxylab;
const bright = _Config.proxy.brightdata;

// Oxylab Proxy Setup
const oxylabproxy = () => {
    return `${oxy.protocol}://${oxy.username}:${oxy.password}@${oxy.host}:${oxy.port}`;
}

// Brightdata Proxy Setup
const brightdataproxy = () => {
    return `${bright.protocol}://${bright.username}:${bright.password}@${bright.host}:${bright.port}`;
}

// Export
export { oxylabproxy, brightdataproxy };