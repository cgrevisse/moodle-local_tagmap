// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Utility functions. Generated with GitHub Copilot.
 *
 * @module     local_tagmap/utils
 * @copyright  2025 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Interpolates between two colors depending on a ratio.
 * The color is calculated such that:
 *  - At ratio = 0, the color is the lowerColor
 *  - At ratio = 1, the color is the higherColor
 *  - At low ratios (e.g., 0.05), the color is noticeably closer to higherColor due to ease-in mapping
 *
 * @param {number} ratio - A number between 0 (lowerColor) and 1 (higherColor)
 * @param {{r: number, g: number, b: number}} lowerColor - The color object for the lower bound
 * @param {{r: number, g: number, b: number}} higherColor - The color object for the upper bound
 * @returns {string} - The color as a hex string (e.g., "#34c759")
 */
export function interpolateColor(ratio, lowerColor, higherColor) {
    // Clamp between 0 and 1
    ratio = Math.max(0, Math.min(1, ratio));

    // Adjust the mapping: apply a slight ease-in to make low values closer to higherColor
    const easedRatio = Math.pow(ratio, 0.6);

    // Interpolate colors
    const r = Math.round(lowerColor.r + (higherColor.r - lowerColor.r) * easedRatio);
    const g = Math.round(lowerColor.g + (higherColor.g - lowerColor.g) * easedRatio);
    const b = Math.round(lowerColor.b + (higherColor.b - lowerColor.b) * easedRatio);

    // Convert to hex
    return (
        '#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0')
    );
}

/**
 * Converts a hexadecimal color string to an object with r, g, b keys.
 * Supports 3-digit (#abc) and 6-digit (#aabbcc) formats.
 *
 * @param {string} hex - The hexadecimal color string (e.g., "#aabbcc" or "#abc")
 * @returns {{r: number, g: number, b: number}} The RGB representation.
 */
export function hexToRgb(hex) {
    // Remove hash if present
    hex = hex.replace(/^#/, '');

    // Expand 3-digit hex to 6 digits
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) {
        throw new Error('Invalid hex color format');
    }

    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
}

/**
 * Sort tags by usage and name.
 *
 * @param {Object} a Tag 1
 * @param {Object} b Tag 2
 * @returns int -1, 0, or 1 depending on the comparison
 */
export function sortTags(a, b) {
    // Use 'used' for resource tags, 'covered' for question tags.
    const aUsed = a.used ?? a.covered;
    const bUsed = b.used ?? b.covered;

    if (aUsed !== bUsed) {
        return aUsed ? -1 : 1;
    } else {
        return a.name.localeCompare(b.name);
    }
}
