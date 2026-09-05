export const HORIZON = 'https://horizon.stellar.org';
// Public account IDs from BlockTransfer's stellar.toml, retrieved 2026-09-05.
export const ACCOUNTS = {
  Issuer: 'GDRM3MK6KMHSYIT4E2AG2S2LWTDBJNYXE4H72C7YTTRWOWX5ZBECFWO7',
  Distributor: 'GAQKSRI4E5643UUUMJT4RWCZVLY25TBNZXDME4WLRIF5IPOLTLV7N4N6',
  Treasury: 'GD2OUJ4QKAPESM2NVGREBZTLFJYMLPCGSUHZVRMTQMF5T34UODVHPRCY',
};

// Keep seven-decimal ledger amounts exact, including values beyond Number's precision.
export function amount(value = '0') {
  const [whole, fraction = ''] = String(value).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction.replace(/0+$/, '') ? `.${fraction.replace(/0+$/, '')}` : ''}`;
}

export function routeFor(value) {
  const query = value.trim();
  if (/^G[A-Z2-7]{55}$/.test(query)) return `account/${query}`;
  if (/^[a-fA-F0-9]{64}$/.test(query)) return `transaction/${query.toLowerCase()}`;
  if (/^[1-9]\d*$/.test(query)) return `ledger/${query}`;
  if (/^[a-zA-Z0-9]{1,12}$/.test(query)) return `asset/${query}`;
  throw new Error('Enter an asset code, a G-address, a 64-character transaction hash, or a ledger number.');
}

export async function request(path, signal) {
  const url = new URL(path, `${HORIZON}/`);
  if (url.origin !== HORIZON) throw new Error('Unexpected data source.');
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) {
    if (response.status === 404) throw new Error('No record found on Stellar Mainnet. Older activity may be outside this Horizon server’s retained history.');
    if (response.status === 429) throw new Error('Horizon is receiving too many requests. Please try refreshing shortly.');
    throw new Error(`Horizon is unavailable (${response.status}). Please try again.`);
  }
  return response.json();
}
