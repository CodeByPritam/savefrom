import _Config from '../config/config.js';
const oxy = _Config.proxy.oxylab;
const bright = _Config.proxy.brightdata;

// Oxylab Proxy Setup
const oxylabproxy = () => {
    return `${oxy.host}://${oxy.username}:${oxy.password}@${oxy.host}:${oxy.port}`;
}

// Brightdata Proxy Setup
const brightdataproxy = () => {
    return `${bright.host}://${bright.username}:${bright.password}@${bright.host}:${bright.port}`;
}

// Export
export default { oxylabproxy, brightdataproxy };