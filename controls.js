// Writable Infigy variables, exposed to Home Assistant as controllable entities.
//
// Each entry maps an Infigy store key to a Home Assistant entity definition.
// Unlike `sensors.js`, these are read/write: the bridge subscribes to a command
// topic and pushes changes back to Infigy via the `store:set` socket event.
//
//   component:       HA MQTT discovery component — 'number' or 'switch'
//   id:              MQTT topic + unique_id fragment (unique, lowercase, no spaces)
//   name:            friendly name in Home Assistant
//   unit/min/max/step/mode: 'number' only
//   entity_category: 'config' puts the entity under the device's configuration
//                    section rather than among the live sensor readings
//
// NOTE ON THE MINIMUM: the Infigy web app clamps both SoC settings to a lower
// bound of 10 %, or 5 % when the inverter is a Fronius / Fronius Verto. This file
// uses the conservative 10 %. If you run a Fronius and want the extra headroom,
// change `min: 10` to `min: 5` on the two entries below.

export const controls = new Map([
    // "Minimální nabití s DS" — minimum battery SoC to hold while the
    // distribution grid is available. The app allows the full 10–100 % range.
    ['PV_SOC_SET_MIN', {
        component: 'number',
        id: 'battery_min_soc_on_grid',
        name: 'Battery Min SoC (On-Grid)',
        icon: 'mdi:battery-arrow-down-outline',
        unit: '%',
        min: 10,
        max: 100,
        step: 1,
        mode: 'slider',
        entity_category: 'config',
    }],

    // "Minimální nabití bez DS" — minimum battery SoC to hold during a grid
    // outage. The app caps this at 25 %: the reserve is meant to keep the house
    // running on backup, so it deliberately cannot be set high.
    ['PV_SOC_SET_UTILITY_LOST', {
        component: 'number',
        id: 'battery_min_soc_off_grid',
        name: 'Battery Min SoC (Off-Grid)',
        icon: 'mdi:battery-alert-variant-outline',
        unit: '%',
        min: 10,
        max: 25,
        step: 1,
        mode: 'slider',
        entity_category: 'config',
    }],

    // "Automatické řízení nabití" — seasonal automatic SoC control. While this
    // is ON, Infigy derives the effective minimum itself and the two settings
    // above are ignored. Exposed so automations can turn it off before writing.
    ['SOC_AUTO', {
        component: 'switch',
        id: 'battery_soc_auto',
        name: 'Battery Automatic SoC Control',
        icon: 'mdi:battery-sync-outline',
        entity_category: 'config',
    }],

    // --- Manual charge / discharge (Photovoltaics → battery controls) ---
    // These require the PV_BATTERY / PV_BATTERY_CONTROL capabilities in the
    // Infigy web app; on a system without a controllable battery they do nothing.

    // "Manuálně nabít baterii" — while ON, force-charge the battery up to the
    // target SoC below. Infigy switches it back OFF once the target is reached
    // (or when you turn it off), so the state can change on its own.
    ['SP_BATTERY_MANUAL_CHARGE', {
        component: 'switch',
        id: 'battery_manual_charge',
        name: 'Manual Battery Charge',
        icon: 'mdi:battery-charging',
        entity_category: 'config',
    }],

    // "Cílové SOC pro manuální nabíjení" — target state of charge the manual
    // charge above aims for. The app allows 20–100 %.
    ['SP_BATTERY_MANUAL_CHARGE_SOC', {
        component: 'number',
        id: 'battery_manual_charge_soc',
        name: 'Manual Charge Target SoC',
        icon: 'mdi:battery-charging-100',
        unit: '%',
        min: 20,
        max: 100,
        step: 1,
        mode: 'slider',
        entity_category: 'config',
    }],

    // "Manuálně vybít baterii" — while ON, force-discharge the battery down to
    // its minimum SoC. Infigy switches it back OFF when the minimum is reached
    // (or when you turn it off).
    ['SP_BATTERY_MANUAL_DISCHARGE', {
        component: 'switch',
        id: 'battery_manual_discharge',
        name: 'Manual Battery Discharge',
        icon: 'mdi:battery-minus-variant',
        entity_category: 'config',
    }],
]);
