// PV_ACTUAL_POWER_BATTERY: negative when charging
// anim_EM_Consumption.0/1/2: grid power per phase in kW, positive = consuming from grid
export const sensors = new Map([
    // Grid / energy meter
    ['EM_ACTUAL_LOAD.0',                 { id: 'load_phase1_amps',           name: 'Load Phase 1',                device_class: 'current', unit: 'A',   state_class: 'measurement' }],
    ['EM_ACTUAL_LOAD.1',                 { id: 'load_phase2_amps',           name: 'Load Phase 2',                device_class: 'current', unit: 'A',   state_class: 'measurement' }],
    ['EM_ACTUAL_LOAD.2',                 { id: 'load_phase3_amps',           name: 'Load Phase 3',                device_class: 'current', unit: 'A',   state_class: 'measurement' }],
    ['EM_ACTUAL_LOAD_MAX',               { id: 'load_max_amps',              name: 'Load Max Phase',              device_class: 'current', unit: 'A',   state_class: 'measurement' }],
    ['anim_EM_Consumption.0',            { id: 'grid_phase1_power',          name: 'Grid Power Phase 1',          device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],
    ['anim_EM_Consumption.1',            { id: 'grid_phase2_power',          name: 'Grid Power Phase 2',          device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],
    ['anim_EM_Consumption.2',            { id: 'grid_phase3_power',          name: 'Grid Power Phase 3',          device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],

    // PV / inverter
    ['PV_ACTUAL_POWER',                  { id: 'pv_power',                   name: 'PV Power',                    device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],
    ['PV_ONGRID',                        { id: 'inverter_ongrid',            name: 'Inverter On Grid' }],
    ['INVERTER_STATUS',                  { id: 'inverter_status',            name: 'Inverter Status' }],

    // Battery
    ['PV_ACTUAL_SOC',                    { id: 'battery_soc',                name: 'Battery SoC',                 device_class: 'battery', unit: '%',   state_class: 'measurement' }],
    ['PV_ACTUAL_POWER_BATTERY',          { id: 'battery_power',              name: 'Battery Power',               device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],

    // Home consumption
    ['anim_HOME_ACTUAL_POWER',           { id: 'home_power',                 name: 'Home Consumption',            device_class: 'power',   unit: 'kW',  state_class: 'measurement' }],

    // Daily energy stats
    ['STATS_PV_ENERGY_PRODUCED_TODAY',   { id: 'energy_pv_today',            name: 'PV Energy Today',             device_class: 'energy',  unit: 'kWh', state_class: 'total_increasing' }],
    ['STATS_EM_ENERGY_CONSUMED_TODAY',   { id: 'energy_grid_consumed_today', name: 'Grid Energy Consumed Today',  device_class: 'energy',  unit: 'kWh', state_class: 'total_increasing' }],
    ['STATS_EM_ENERGY_OVERFLOW_TODAY',   { id: 'energy_grid_overflow_today', name: 'Grid Energy Overflow Today',  device_class: 'energy',  unit: 'kWh', state_class: 'total_increasing' }],
    ['STATS_HOME_ENERGY_CONSUMED_TODAY', { id: 'energy_home_today',          name: 'Home Energy Today',           device_class: 'energy',  unit: 'kWh', state_class: 'total_increasing' }],
]);
