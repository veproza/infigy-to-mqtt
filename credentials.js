 // Configuration is read from environment variables when set, otherwise the
// defaults below are used. When running in Docker, pass these as env vars
// (see docker-compose.yml / the README). When running locally, either export
// the env vars or just edit the fallback values here.

// Local IP address of your Infigy box (find it in your router's DHCP table)
export const INFIGY_IP = process.env.INFIGY_IP || '192.168.1.100';

// Address of your MQTT broker — if running Mosquitto as a Home Assistant add-on, this is your HA IP
export const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://192.168.1.10';
// MQTT credentials configured in your broker (Home Assistant → Settings → Integrations → MQTT)
export const MQTT_USERNAME = process.env.MQTT_USERNAME || 'your_mqtt_username';
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'your_mqtt_password';
