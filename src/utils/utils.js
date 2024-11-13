/**
 * sleep
 * @param ms
 * @returns {Promise<unknown>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机数 int
 * @param min
 * @param max
 * @returns {*}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 文件转换为 base64 url
 * @param file {File}
 * @returns {Promise<unknown>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    let reads = new FileReader();
    reads.readAsDataURL(file);
    reads.onload = function (e) {
      resolve(this.result);
    };
    reads.onerror = function (e) {
      reject(e);
    }
  })
}
