// Author: Jay Wang (jay@zijie.wang)
// License: MIT

import d3 from './d3-import';

/**
 * Round a number to a given decimal.
 * @param {number} num Number to round
 * @param {number} decimal Decimal place
 * @returns number
 */
export const round = (num, decimal) => {
  return Math.round((num + Number.EPSILON) * 10 ** decimal) / 10 ** decimal;
};

/**
 * Get a random number between [min, max], inclusive
 * @param {number} min Min value
 * @param {number} max Max value
 * @returns number
 */
export const random = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

/**
 * Download a JSON file
 * @param {object} object
 * @param {HTMLElement | null} [dlAnchorElem]
 * @param {string} [fileName]
 */
export const downloadJSON = (object, dlAnchorElem = null, fileName = 'download.json') => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(object));

  // Create dlAnchor if it is not given
  let myDlAnchorElem = dlAnchorElem;
  let needToRemoveAnchor = false;

  if (dlAnchorElem === null) {
    myDlAnchorElem = document.createElement('a');
    myDlAnchorElem.classList.add('download-anchor');
    myDlAnchorElem.style.display = 'none';
    needToRemoveAnchor = true;
  }

  myDlAnchorElem.setAttribute('href', dataStr);
  myDlAnchorElem.setAttribute('download', `${fileName}`);
  myDlAnchorElem.click();

  if (needToRemoveAnchor) {
    myDlAnchorElem.remove();
  }
};

/**
 * Download a text file
 * @param {string} textString
 * @param {HTMLElement | null} [dlAnchorElem]
 * @param {string} [fileName]
 */
export const downloadText = (textString, dlAnchorElem, fileName = 'download.txt') => {
  const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textString);

  // Create dlAnchor if it is not given
  let myDlAnchorElem = dlAnchorElem;
  let needToRemoveAnchor = false;

  if (dlAnchorElem === null) {
    myDlAnchorElem = document.createElement('a');
    myDlAnchorElem.style.display = 'none';
    needToRemoveAnchor = true;
  }

  myDlAnchorElem.setAttribute('href', dataStr);
  myDlAnchorElem.setAttribute('download', `${fileName}`);
  myDlAnchorElem.click();

  if (needToRemoveAnchor) {
    myDlAnchorElem.remove();
  }
};

/**
 * Compute the luminance of a RGB color
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * @param {number[]} color [R, G, B in 0..255]
 * @returns {number}
 */
export const getLuminance = (color) => {
  const r = color[0];
  const g = color[1];
  const b = color[2];

  // Some strange required transformations
  const transformedRGB = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return (
    transformedRGB[0] * 0.2126 +
    transformedRGB[1] * 0.7152 +
    transformedRGB[2] * 0.0722
  );
};

/**
 * Compute color contrast ratio
 * @param {number[]} color1 [r, g, b] in 255 scale
 * @param {number[]} color2 [r, g, b] in 255 scale
 * @returns {number} Contrast ratio
 */
export const getContrastRatio = (color1, color2) => {
  const color1L = getLuminance(color1);
  const color2L = getLuminance(color2);
  const ratio =
    color1L > color2L
      ? (color2L + 0.05) / (color1L + 0.05)
      : (color1L + 0.05) / (color2L + 0.05);
  return ratio;
};

/**
 * Check if two colors have enough contrast
 * @param {number[]} color1 [r, g, b] in 255 scale
 * @param {number[]} color2 [r, g, b] in 255 scale
 * @param {string} condition 'AA' or 'AAA'
 * @param {boolean} smallText If it is small text
 * @returns {boolean} If two colors have enough contrast
 */
export const haveContrast = (color1, color2, condition = 'AAA', smallText = true) => {
  const ratio = getContrastRatio(color1, color2);

  // Compare the ratio with different thresholds
  if (condition === 'AA') {
    return smallText ? ratio <= 4.5 : ratio <= 3;
  } else {
    return smallText ? ratio <= 7 : ratio <= 4.5;
  }
};

/**
 * Check if two sets are the same
 * @param {Set} set1 Set 1
 * @param {Set} set2 Set 2
 * @returns {boolean}
 */
export const setsAreEqual = (set1, set2) => {
  return set1.size === set2.size && [...set1].every(d => set2.has(d));
};

/**
 * Get the file name and file extension from a File object
 * @param {File} file File object
 * @returns {[string, string]} [file name, file extension]
 */
export const splitFileName = (file) => {
  const name = file.name;
  const lastDot = name.lastIndexOf('.');
  const value = name.slice(0, lastDot);
  const extension = name.slice(lastDot + 1);
  return [value, extension];
};

/**
 * Split the reader stream text by a string
 * @param {string} sep String used to separate the input string
 * @returns {TransformStream}
 */
export const splitStreamTransform = (sep) => {
  let buffer = '';

  const transform = new TransformStream({
    transform: (chunk, controller) => {
      buffer += chunk;
      const parts = buffer.split(sep);
      parts.slice(0, -1).forEach(part => controller.enqueue(part));
      buffer = parts[parts.length - 1];
    },
    flush: (controller) => {
      if (buffer) {
        controller.enqueue(buffer);
      }
    }
  });

  return transform;
};

/**
 * Parse the input stream as JSON
 * @returns {TransformStream}
 */
export const parseJSONTransform = () => {
  const transform = new TransformStream({
    transform: (chunk, controller) => {
      controller.enqueue(JSON.parse(chunk));
    }
  });
  return transform;
};

const timeitQueue = new Set();
/**
 * Trace the execution time
 * @param {string} label Label for the time tracer
 * @param {boolean} show Whether to printout the output in console
 */
export const timeit = (label, show) => {
  if (show) {
    if (timeitQueue.has(label)) {
      console.timeEnd(label);
      timeitQueue.delete(label);
    } else {
      console.time(label);
      timeitQueue.add(label);
    }
  }
};

/**
 * Convert a color from rgb to hex
 * @param {number} r Value in the red channel
 * @param {number} g Value in the green channel
 * @param {number} b Value in the blue channel
 * @returns {string} Hex string
 */
export const rgbToHex = (r, g, b) => {
  const numToHex = (number) => {
    const hex = number.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${numToHex(r)}${numToHex(g)}${numToHex(b)}`;
};

export const rectsIntersect = (rect1, rect2) => {
  const right1 = rect1.x + rect1.width;
  const right2 = rect2.x + rect2.width;
  const bottom1 = rect1.y + rect1.height;
  const bottom2 = rect2.y + rect2.height;

  return (
    rect1.x < right2 &&
    right1 > rect2.x &&
    rect1.y < bottom2 &&
    bottom1 > rect2.y
  );
};

/**
 * Get a uniformly random sample from a list.
 * @param {Array} items Array of items to sample from
 * @param {number} size Target size of the sample
 * @param {number} seed Random seed (default to 1212)
 * @param {boolean} replace True if sample with replace
 * @returns {Array} Sampled items
 */
export const getRandomSamples = (items, size, seed = 1212, replace = false) => {
  const targetSize = Math.min(size, items.length);
  const threshold = targetSize / items.length;
  const randomUniform = d3.randomUniform.source(d3.randomLcg(seed))(0, 1);

  const sampledItems = [];
  const sampledIndexes = new Set();

  // Repeat sampling until we have enough points sampled
  while (sampledItems.length < targetSize) {
    for (const [i, item] of items.entries()) {
      if ((replace || !sampledIndexes.has(i)) && randomUniform() <= threshold) {
        sampledIndexes.add(i);
        sampledItems.push(item);

        // Exit early if we have enough points
        if (sampledItems.length >= targetSize) break;
      }
    }
  }

  return sampledItems;
};

/**
 * A helper function to break up a long function into multiple tasks
 * https://web.dev/optimize-long-tasks/
 * @returns {Promise}
 */
export const yieldToMain = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};

export const HOVER_RADIUS = 0.5;