# Infigy to MQTT

A small Node.js bridge that connects an [Infigy](https://www.infigy.cz/) home energy management system to [Home Assistant](https://www.home-assistant.io/) via MQTT.

It listens to the Infigy real-time socket and republishes the values as MQTT sensors with full Home Assistant auto-discovery support — so entities appear in HA automatically, no YAML configuration needed.

## What you get

Once running, Home Assistant will automatically create a set of sensors grouped under a single **Infigy** device:

| Sensor | Description |
|---|---|
| Load Phase 1 / 2 / 3 | Grid current draw per phase (A) |
| Load Max Phase | Highest instantaneous current across all phases (A) |
| Grid Power Phase 1 / 2 / 3 | Real-time grid power per phase (kW), positive = consuming from grid |
| PV Power | Solar panel output (kW) |
| Inverter On Grid | Whether the inverter is currently exporting to the grid |
| Inverter Status | Numeric inverter status code |
| Battery SoC | Battery state of charge (%) |
| Battery Power | Battery charge/discharge power (kW), negative = charging |
| Home Consumption | Total instantaneous home power draw (kW) |
| PV Energy Today | Solar energy produced today (kWh) |
| Grid Energy Consumed Today | Energy pulled from the grid today (kWh) |
| Grid Energy Overflow Today | Energy exported to the grid today (kWh) |
| Home Energy Today | Total home consumption today (kWh) |

> Not all sensors may be relevant for your setup. If you don't have a battery, those sensors will simply read zero. You can remove unwanted entries from the `sensors` map in `sensors.js`.

## Prerequisites

- **Node.js 18 or newer** — [nodejs.org](https://nodejs.org)
- **An MQTT broker** — the [Mosquitto MQTT add-on](https://github.com/home-assistant/addons/blob/master/mosquitto/DOCS.md) for Home Assistant is the easiest option
- **Home Assistant** with the [MQTT integration](https://www.home-assistant.io/integrations/mqtt/) enabled and connected to your broker — set it up under Settings → Integrations → Add Integration → MQTT
- Your **Infigy box** reachable on the local network

## Installation

### 1. Install Node.js and Git

Download and install Node.js 18 or newer from [nodejs.org](https://nodejs.org) and Git from [git-scm.com](https://git-scm.com). On Linux (including Raspberry Pi), you can use your package manager:

```bash
sudo apt install nodejs npm git
```

Verify Node.js is installed: `node --version` should print `v18` or higher.

### 2. Get the files

Download or clone this repository onto a machine that has network access to both your Infigy box and your MQTT broker. This can be your Home Assistant host, a Raspberry Pi, or any always-on computer.

```bash
git clone https://github.com/veproza/infigy-to-mqtt
cd infigy-to-mqtt
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure

Open `credentials.js` in a text editor and fill in your values:

```js
export const INFIGY_IP = '192.168.1.100';       // your Infigy box IP
export const MQTT_BROKER = 'mqtt://192.168.1.10'; // your MQTT broker IP
export const MQTT_USERNAME = 'your_mqtt_username';
export const MQTT_PASSWORD = 'your_mqtt_password';
```

**Finding your Infigy IP:** Open your router admin panel and look for a device named `infigy` in the connected devices or DHCP leases list.

**Finding your MQTT credentials:** If you use the Mosquitto add-on, credentials are managed in the Mosquitto add-on configuration. See the [Mosquitto add-on docs](https://github.com/home-assistant/addons/blob/master/mosquitto/DOCS.md) for details.

### 5. Run

```bash
node infigy-to-mqtt.js
```

You should see:

```
Connecting to MQTT
MQTT connected
Connecting to Infigy
Infigy connected
```

After a few seconds, the Infigy sensors will appear in Home Assistant under **Settings → Devices & Services → MQTT → Devices → Infigy**.

## Running with Docker (recommended)

You can run the bridge as a container without installing Node.js — or even cloning this repo. The image is built straight from the public GitHub repository. Configuration is passed as environment variables.

### 1. Get the example Compose file

```bash
curl -O https://raw.githubusercontent.com/veproza/infigy-to-mqtt/main/compose.yaml.example
cp compose.yaml.example compose.yaml
```

### 2. Configure

Edit `compose.yaml` and set your Infigy IP, MQTT broker address, and MQTT credentials under `environment:`. The `build:` line already points at the GitHub repo, so there's nothing else to download.

### 3. Build and run

```bash
docker compose up -d
```

The container is set to `restart: unless-stopped`, so it comes back automatically after a crash or host reboot. To pick up a newer version later, rebuild with `docker compose build --pull --no-cache && docker compose up -d`.

### 4. Check the logs

```bash
docker compose logs -f
```

You should see:

```
Connecting to MQTT
MQTT connected
Connecting to Infigy
Infigy connected
```

### Other commands

```bash
docker compose ps        # is it running?
docker compose restart
docker compose down      # stop and remove the container
```

> **Networking:** the container needs to reach both your Infigy box and your MQTT broker. The default bridge network is usually fine since both are addressed by IP. If your broker is on the same Docker host and only reachable via `localhost`, add `network_mode: host` to the service in `compose.yaml`.

### Running with plain Docker (without Compose)

Build the image directly from the GitHub repo, then run it:

```bash
docker build -t infigy-to-mqtt https://github.com/veproza/infigy-to-mqtt.git

docker run -d --name infigy-to-mqtt --restart unless-stopped \
  -e INFIGY_IP=192.168.1.100 \
  -e MQTT_BROKER=mqtt://192.168.1.10 \
  -e MQTT_USERNAME=your_mqtt_username \
  -e MQTT_PASSWORD=your_mqtt_password \
  infigy-to-mqtt
```

## Running automatically (without Docker)

To keep the bridge running in the background and restart it automatically on failure or reboot, you need a process manager. Any option works — systemd, Docker, etc. [PM2](https://www.npmjs.com/package/pm2) is a popular, easy choice for Node.js:

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Start the bridge with PM2:

```bash
pm2 start infigy-to-mqtt.js --name infigy-to-mqtt
```

3. Register PM2 to launch on system startup. Run this command and follow the instructions it prints:

```bash
pm2 startup
```

4. Save the current process list so it's restored after a reboot:

```bash
pm2 save
```

Useful PM2 commands:

```bash
pm2 logs infigy-to-mqtt   # view live logs
pm2 status                # check if the process is running
pm2 restart infigy-to-mqtt
pm2 stop infigy-to-mqtt
```

## Troubleshooting

### Debug: see everything Infigy sends

```bash
node infigy-to-mqtt.js --log
```

This prints every key/value pair arriving from the Infigy socket — useful for discovering what your specific hardware exposes.

### Debug: see only the watched sensors

```bash
node infigy-to-mqtt.js --log-watched
```

This prints only the values that are configured in the `sensors` map, along with their friendly names.

### Nothing appears in Home Assistant

- **Check the logs first** — errors are printed to the output. If using PM2: `pm2 logs infigy-to-mqtt`. If running manually, they appear directly in the terminal.
- Make sure the MQTT integration is set up and connected (Home Assistant → Settings → Integrations → MQTT shows "Connected")
- Check that the broker address, username, and password in `credentials.js` are correct
- Verify the Infigy box is reachable: `ping 192.168.1.100` (use your actual IP)

### Sensors show stale or no values

The bridge must be running continuously. If you started it in a terminal and closed it, the process stopped. Use PM2 as described above to keep it alive.

## Customising sensors

The `sensors` map in `sensors.js` controls what gets published. Each entry maps an Infigy store key to a Home Assistant sensor definition:

```js
['PV_ACTUAL_POWER', { id: 'pv_power', name: 'PV Power', device_class: 'power', unit: 'kW', state_class: 'measurement' }],
```

- **Key** (first element): the exact Infigy internal key name. Use `--log` mode to discover available keys.
- **`id`**: used to build the MQTT topic (`infigy/<id>/state`) and the HA unique ID — must be unique, lowercase, no spaces.
- **`name`**: the friendly name shown in Home Assistant.
- **`device_class`**: HA [sensor device class](https://www.home-assistant.io/integrations/sensor/#device-class) — controls icon and unit handling (`power`, `energy`, `current`, `battery`, etc.). Omit if none applies.
- **`unit`**: unit of measurement string shown in HA (`kW`, `kWh`, `A`, `%`, …). Omit if none applies.
- **`state_class`**: `measurement` for live readings, `total_increasing` for ever-growing counters (daily/yearly energy totals). Omit if none applies.

To add a sensor, add a new line to the map and restart the bridge. To remove one, delete its line — the HA entity will become unavailable but can be manually removed from HA's device page.

## License

MIT
