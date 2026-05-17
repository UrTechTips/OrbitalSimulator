import { SIM_UNITS } from '../constants.js';

function kgToSolarMass(kg) {
    return kg / SIM_UNITS.SOLAR_MASS;
}

function SolarMassToKg(solarMass) {
    return solarMass * SIM_UNITS.SOLAR_MASS;
}

function mToAU(m) {
    return m / SIM_UNITS.AU;
}

function AUToM(au) {
    return au * SIM_UNITS.AU;
}