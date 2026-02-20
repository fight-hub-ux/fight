const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'printscan-default-key-change-me!';

function encrypt(text) {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, KEY).toString();
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
}

module.exports = { encrypt, decrypt };
