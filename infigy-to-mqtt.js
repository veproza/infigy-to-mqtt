import { io } from 'socket.io-client';
import mqtt from 'mqtt';
import { INFIGY_IP, MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD } from './credentials.js';
import { sensors } from './sensors.js';
import { controls } from './controls.js';

const DISCOVERY_PREFIX = 'homeassistant';
const device = { identifiers: ['infigy'], name: 'Infigy' };

// Home Assistant publishes its "birth" message here when it (re)starts.
const HA_STATUS_TOPIC = `${DISCOVERY_PREFIX}/status`;

const stateTopic = (id) => `infigy/${id}/state`;
const commandTopic = (id) => `infigy/${id}/set`;
// Bridge availability. HA marks every entity below unavailable when this reads
// "offline" (set as the MQTT Last Will, and on a clean shutdown), and available
// again on "online" — so entities track the bridge instead of going stale.
const AVAILABILITY_TOPIC = 'infigy/status';

// Publish the Home Assistant MQTT discovery config for every sensor and control.
// Called both when the bridge connects and whenever HA comes back online (see
// below), so the entities are re-announced after HA has restored its registry.
function publishDiscovery(mqttClient) {
    for (const [, sensor] of sensors) {
        const config = Object.fromEntries(
            Object.entries({
                name: sensor.name,
                device_class: sensor.device_class,
                unit_of_measurement: sensor.unit,
                state_topic: stateTopic(sensor.id),
                availability_topic: AVAILABILITY_TOPIC,
                unique_id: `infigy_${sensor.id}`,
                state_class: sensor.state_class,
                device,
            }).filter(([, v]) => v != null)
        );
        mqttClient.publish(
            `${DISCOVERY_PREFIX}/sensor/infigy_${sensor.id}/config`,
            JSON.stringify(config),
            { retain: true }
        );
    }
    for (const [, control] of controls) {
        const config = Object.fromEntries(
            Object.entries({
                name: control.name,
                device_class: control.device_class,
                unit_of_measurement: control.unit,
                state_topic: stateTopic(control.id),
                command_topic: commandTopic(control.id),
                availability_topic: AVAILABILITY_TOPIC,
                unique_id: `infigy_${control.id}`,
                entity_category: control.entity_category,
                icon: control.icon,
                min: control.min,
                max: control.max,
                step: control.step,
                mode: control.mode,
                device,
            }).filter(([, v]) => v != null)
        );
        mqttClient.publish(
            `${DISCOVERY_PREFIX}/${control.component}/infigy_${control.id}/config`,
            JSON.stringify(config),
            { retain: true }
        );
    }
}

function connectMqtt() {
    return new Promise((resolve) => {
        console.log('Connecting to MQTT');
        const mqttClient = mqtt.connect(MQTT_BROKER, {
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            // If the bridge drops off the broker, HA is told the device is offline.
            will: { topic: AVAILABILITY_TOPIC, payload: 'offline', retain: true, qos: 1 },
        });
        mqttClient.on('connect', () => {
            console.log('MQTT connected');
            mqttClient.publish(AVAILABILITY_TOPIC, 'online', { retain: true, qos: 1 });
            publishDiscovery(mqttClient);
            for (const [, control] of controls) {
                mqttClient.subscribe(commandTopic(control.id));
            }
            // Re-announce discovery when Home Assistant restarts. HA restores its
            // entity registry and replays retained discovery at the same time; a
            // message landing in that window can't be matched to the existing
            // entity and spawns a `<entity>_2` duplicate. Re-publishing after HA's
            // birth message ("online") ensures discovery arrives once HA is ready.
            mqttClient.subscribe(HA_STATUS_TOPIC);
            mqttClient.on('message', (topic, message) => {
                if (topic === HA_STATUS_TOPIC && message.toString().trim().toLowerCase() === 'online') {
                    console.log('Home Assistant is online — re-publishing discovery');
                    publishDiscovery(mqttClient);
                }
            });
            resolve(mqttClient);
        });
        mqttClient.on('error', (err) => console.error('MQTT error', err));
    })
}

// Values Infigy may use for "off". The web app coerces switch state with !!,
// so it never distinguishes booleans from 0/1; treating the string forms as
// off too means a firmware that reports "false" cannot show as ON.
const OFF_VALUES = new Set([false, 0, '0', 'false', 'off', 'OFF', '', null, undefined]);

function formatState(control, value) {
    if (control.component === 'switch') return OFF_VALUES.has(value) ? 'OFF' : 'ON';
    return String(value);
}

// Turn an incoming MQTT command payload into a value Infigy will accept, or
// undefined if it is unusable. Numbers are rounded and clamped to the same
// bounds the Infigy web app enforces, so a stray automation cannot push the
// battery past a limit the vendor UI would refuse to set.
function parseCommand(control, raw) {
    if (control.component === 'switch') {
        if (raw === 'ON') return true;
        if (raw === 'OFF') return false;
        return undefined;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return undefined;
    const min = control.min ?? 0;
    const max = control.max ?? 100;
    return Math.min(max, Math.max(min, Math.round(value)));
}

function attachCommandHandler(mqttClient, socket) {
    const byTopic = new Map(
        [...controls].map(([key, control]) => [commandTopic(control.id), { key, control }])
    );
    mqttClient.on('message', (topic, message) => {
        const entry = byTopic.get(topic);
        if (!entry) return;
        const { key, control } = entry;
        const raw = message.toString().trim();
        const value = parseCommand(control, raw);
        if (value === undefined) {
            console.error(`Ignoring invalid value for ${key}: "${raw}"`);
            return;
        }
        console.log(`Setting ${key} = ${value}`);
        socket.emit('store:set', { payload: { [key]: value } });
    });
}

async function main() {
    if (process.argv.includes('--log')) {
        function logger(payload) {
            for (const [key, value] of Object.entries(payload)) {
                console.log(`${key}: ${value}`);
            }
        }
        connectInfigy(logger);
    } else if (process.argv.includes('--log-watched')) {
        function loggerWatched(payload) {
            for (const [key, value] of Object.entries(payload)) {
                if (sensors.has(key)) console.log(
                    `${key}: ${value} (${sensors.get(key).name})`
                )
                if (controls.has(key)) console.log(
                    `${key}: ${value} (${controls.get(key).name}) [writable]`
                )
            }
        }
        connectInfigy(loggerWatched);
    } else {
        const mqttClient = await connectMqtt();
        function mqttSender(payload) {
            for (const [key, sensor] of sensors) {
                if (Object.hasOwn(payload, key)) {
                    mqttClient.publish(stateTopic(sensor.id), String(payload[key]));
                }
            }
            for (const [key, control] of controls) {
                if (Object.hasOwn(payload, key)) {
                    mqttClient.publish(stateTopic(control.id), formatState(control, payload[key]));
                }
            }
        }
        const socket = connectInfigy(mqttSender);
        attachCommandHandler(mqttClient, socket);
        setupGracefulShutdown(mqttClient);
    }
}

// On a clean stop (Ctrl-C, `docker stop` → SIGTERM) mark the bridge offline so
// HA shows the entities unavailable straight away, then close the connection.
function setupGracefulShutdown(mqttClient) {
    let closing = false;
    const shutdown = () => {
        if (closing) return;
        closing = true;
        mqttClient.publish(AVAILABILITY_TOPIC, 'offline', { retain: true, qos: 1 }, () => {
            mqttClient.end(false, {}, () => process.exit(0));
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

function connectInfigy(onDataReceived) {
    console.log('Connecting to Infigy');
    const socket = io(`http://${INFIGY_IP}/`, { path: '/core/socket.io' });
    socket.on('connect', () => {
        console.log('Infigy connected');
    });
    socket.on('store:snapshot', (data) => {
        onDataReceived(data.store);
    });
    socket.on('store:change', (data) => {
        onDataReceived(data.payload);
    });
    socket.on('connect_error', (error) => {
        console.error('Infigy connect error', error);
    });
    socket.on('disconnect', (reason) => {
        console.error('Infigy disconnect', reason);
    });
    return socket;
}

main().catch(err => console.error(err));
