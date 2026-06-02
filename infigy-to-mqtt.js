import { io } from 'socket.io-client';
import mqtt from 'mqtt';
import { INFIGY_IP, MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD } from './credentials.js';
import { sensors } from './sensors.js';

const DISCOVERY_PREFIX = 'homeassistant';
const device = { identifiers: ['infigy'], name: 'Infigy' };

function connectMqtt() {
    return new Promise((resolve) => {
        console.log('Connecting to MQTT');
        const mqttClient = mqtt.connect(MQTT_BROKER, { username: MQTT_USERNAME, password: MQTT_PASSWORD });

        mqttClient.on('connect', () => {
            console.log('MQTT connected');
            for (const [, sensor] of sensors) {
                const config = Object.fromEntries(
                    Object.entries({
                        name: sensor.name,
                        device_class: sensor.device_class,
                        unit_of_measurement: sensor.unit,
                        state_topic: `infigy/${sensor.id}/state`,
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
            resolve(mqttClient);
        });

        mqttClient.on('error', (err) => console.error('MQTT error', err));
    })
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
            }
        }
        connectInfigy(loggerWatched);
    } else {
        const mqttClient = await connectMqtt();
        function mqttSender(payload) {
            for (const [key, sensor] of sensors) {
                if (Object.hasOwn(payload, key)) {
                    mqttClient.publish(`infigy/${sensor.id}/state`, String(payload[key]));
                }
            }
        }
        connectInfigy(mqttSender);
    }
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
}

main().catch(err => console.error(err));
