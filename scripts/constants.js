const SIM_UNITS = {
    distance: "AU",
    time: "Years",
    mass: "M<sub>☉</sub>",
    energy: "M<sub>☉</sub> AU² / Year²",
    G: 4 * Math.PI * Math.PI,
    SOLAR_MASS: 1.989e30,
    AU: 1.496e11,
    g0: 9.80665 * (3.156e7 * 3.156e7) / 1.496e11,
    MS_TO_AUYR:   1 / (1.496e11 / 3.156e7),           // m/s  → AU/Year
    N_TO_SIMF:    3.3474e-27, // N → M☉⋅AU/Year²
}
const MAX_TRAIL_LENGTH = 50;

export { SIM_UNITS, MAX_TRAIL_LENGTH };