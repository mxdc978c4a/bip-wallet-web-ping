export const MAINNET = 'mainnet';
export const TESTNET = 'testnet';
export const NETWORK = process.env.APP_ENV === MAINNET ? MAINNET : TESTNET;
export const BASE_TITLE = 'Bip Wallet';
export const BASE_DESCRIPTION = '';
export const ACCOUNTS_API_URL = process.env.APP_ACCOUNTS_API_URL;
export const EXPLORER_HOST = process.env.APP_EXPLORER_HOST;
export const EXPLORER_API_URL = process.env.APP_EXPLORER_API_URL;
export const EXPLORER_RTM_URL = process.env.APP_EXPLORER_RTM_URL;
export const GATE_API_URL = process.env.APP_GATE_API_URL;
export const MINTERSCAN_API_URL = process.env.APP_MINTERSCAN_API_URL;
export const COIN_NAME = NETWORK === MAINNET ? 'BIP' : 'MNT';
export const CHAIN_ID = NETWORK === MAINNET ? 1 : 2;
export const USERNAME_MIN_LENGTH = 5;
export const USERNAME_MAX_LENGTH = 16;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 100;
