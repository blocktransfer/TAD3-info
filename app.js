import { ACCOUNTS, amount, routeFor, request } from './data.js';

const content = document.querySelector('#content');
const status = document.querySelector('#status');
let controller;
const escape = (value) => String(value ?? '—').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = (value) => value ? `${value.slice(0, 8)}…${value.slice(-8)}` : '—';
const link = (kind, value, label = value) => `<a href="#${kind}/${encodeURIComponent(value)}">${escape(label)}</a>`;
const date = (value) => value ? new Date(value).toLocaleString() : '—';
const records = (data) => data._embedded?.records ?? [];
const table = (headers, rows) => rows.length ? `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="notice">No records returned by Horizon.</p>';
const panel = (title, subtitle, body) => `<section class="panel"><div class="panel-head"><div><h2>${escape(title)}</h2><p>${escape(subtitle)}</p></div></div>${body}</section>`;
const details = (fields) => `<div class="details"><dl>${fields.map(([key, value]) => `<dt>${escape(key)}</dt><dd>${value}</dd>`).join('')}</dl></div>`;
const metric = (label, value) => `<article class="metric"><p class="metric-label">${escape(label)}</p><p class="metric-value">${value}</p></article>`;
const assetName = (balance) => balance.asset_type === 'native' ? 'XLM' : balance.asset_issuer === ACCOUNTS.Issuer ? link('asset', balance.asset_code) : `${escape(balance.asset_code)} <span class="mono">(${escape(short(balance.asset_issuer))})</span>`;

async function paginated(title, subtitle, path, columns, renderRow, signal) {
  const data = await request(path, signal);
  const section = document.createElement('section');
  section.className = 'panel';
  section.innerHTML = `<div class="panel-head"><div><h2>${escape(title)}</h2><p>${escape(subtitle)}</p></div></div>${table(columns, records(data).map(renderRow))}`;
  let next = data._links?.next?.href;
  if (records(data).length && next) {
    const footer = document.createElement('div');
    footer.className = 'pagination';
    const button = document.createElement('button');
    button.className = 'secondary';
    button.textContent = 'Load more';
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    footer.append(button, message);
    section.append(footer);
    button.addEventListener('click', async () => {
      button.disabled = true;
      message.textContent = '';
      try {
        const page = await request(next, signal);
        if (signal.aborted) return;
        const rows = records(page);
        if (!rows.length) { button.remove(); message.textContent = ' End of available records.'; return; }
        const tbody = section.querySelector('tbody');
        for (const row of rows) {
          const tr = document.createElement('tr');
          tr.innerHTML = renderRow(row).map((cell) => `<td>${cell}</td>`).join('');
          tbody.append(tr);
        }
        next = page._links?.next?.href;
        if (!next) button.remove();
      } catch (error) {
        if (!signal.aborted) message.textContent = ` ${error.message}`;
      } finally { button.disabled = false; }
    });
  }
  return section;
}

const operationRow = (op) => [
  escape(op.type.replaceAll('_', ' ')),
  `<span class="mono">${link('account', op.source_account, short(op.source_account))}</span>`,
  op.to || op.into ? link('account', op.to || op.into, short(op.to || op.into)) : '—',
  op.amount ? `${escape(amount(op.amount))} ${assetName(op)}` : '—',
  link('transaction', op.transaction_hash, short(op.transaction_hash)),
  escape(date(op.created_at)),
];

async function render(signal) {
  const route = decodeURIComponent(location.hash.slice(1));
  if (!route) {
    const [assets, ledgers] = await Promise.all([
      request(`/assets?asset_issuer=${ACCOUNTS.Issuer}&limit=200`, signal),
      request('/ledgers?order=desc&limit=1', signal),
    ]);
    const latest = records(ledgers)[0];
    const list = records(assets);
    content.innerHTML = `<div class="metrics">${metric('Assets in this issuer page', escape(list.length))}${metric('Latest Stellar ledger', latest ? link('ledger', latest.sequence, Number(latest.sequence).toLocaleString()) : '—')}${metric('Network', 'Mainnet')}</div>` + panel('Issued assets', 'BlockTransfer issuer · live on-chain balances · amounts are asset units', table(['Asset code', 'Authorized balances', 'Unauthorized balances', 'Claimable balances', 'Trustlines'], list.map((a) => [link('asset', a.asset_code), escape(amount(a.balances.authorized)), escape(amount(a.balances.unauthorized)), escape(amount(a.claimable_balances_amount)), escape(Object.values(a.accounts).reduce((sum, n) => sum + n, 0))]))) + `<h2>Explore the accounts</h2><div class="cards">${Object.entries(ACCOUNTS).map(([role, address]) => `<a class="account-card" href="#account/${address}"><h3>${escape(role)} ↗</h3><p class="mono">${short(address)}</p></a>`).join('')}</div>`;
    content.insertAdjacentHTML('beforeend', '<p class="notice">Balances are ledger quantities, not a determination of legal shares outstanding. Trustlines count accounts, not verified shareholders. Asset names and current servicing status are not inferred from asset codes.</p>');
    return;
  }
  const [kind, id, extra] = route.split('/');
  const valid = kind === 'asset' ? /^[a-zA-Z0-9]{1,12}$/.test(id) : ['account', 'transaction', 'ledger'].includes(kind) && routeFor(id) === route;
  if (extra || !id || !valid) throw new Error('Invalid explorer link. Use the search above to find a record.');
  let markup = '<a class="back" href="#">← Overview</a>';
  let collection;
  if (kind === 'asset') {
    const data = await request(`/assets?asset_code=${encodeURIComponent(id)}&asset_issuer=${ACCOUNTS.Issuer}`, signal);
    const asset = records(data)[0];
    if (!asset) throw new Error('This asset was not found for the configured TAD3 issuer. Asset codes are case-sensitive.');
    markup += panel(id, 'Asset details · Stellar Mainnet', details([
      ['Issuer', link('account', asset.asset_issuer)],
      ['Authorized balances', escape(amount(asset.balances.authorized))],
      ['Maintain-liabilities balances', escape(amount(asset.balances.authorized_to_maintain_liabilities))],
      ['Unauthorized balances', escape(amount(asset.balances.unauthorized))],
      ['Claimable balances', escape(amount(asset.claimable_balances_amount))],
      ['Liquidity pool balances', escape(amount(asset.liquidity_pools_amount))],
      ['Contract balances', escape(amount(asset.contracts_amount))],
      ...Object.entries(asset.flags).map(([flag, enabled]) => [flag.replaceAll('_', ' '), enabled ? 'Yes' : 'No']),
    ]));
    collection = () => paginated('Accounts holding trustlines', 'Includes zero balances; each row is a public account, not an identified shareholder.', `/accounts?asset=${encodeURIComponent(`${id}:${ACCOUNTS.Issuer}`)}&limit=20`, ['Account', 'Balance', 'Authorization'], (a) => {
      const balance = a.balances.find((b) => b.asset_code === id && b.asset_issuer === ACCOUNTS.Issuer);
      return [link('account', a.account_id, short(a.account_id)), escape(amount(balance?.balance)), balance?.is_authorized ? 'Authorized' : balance?.is_authorized_to_maintain_liabilities ? 'Maintain liabilities' : 'Unauthorized'];
    }, signal);
  } else if (kind === 'account') {
    const a = await request(`/accounts/${id}`, signal);
    const role = Object.entries(ACCOUNTS).find(([, address]) => address === id)?.[0];
    markup += panel(role ? `${role} account` : 'Account', 'Public account details', details([
      ['Address', `<span class="mono">${escape(a.account_id)}</span>`],
      ['Sequence', escape(a.sequence)], ['Home domain', escape(a.home_domain)],
      ['Last modified ledger', link('ledger', a.last_modified_ledger)],
    ]));
    markup += panel('Balances', 'All assets held by this account; assets from other issuers may not be TAD3-related.', table(['Asset', 'Balance', 'Authorization'], a.balances.map((b) => [assetName(b), escape(amount(b.balance)), b.asset_type === 'native' ? 'Native' : b.is_authorized ? 'Authorized' : b.is_authorized_to_maintain_liabilities ? 'Maintain liabilities' : 'Unauthorized'])));
    collection = () => paginated('Account activity', 'All operations involving this account, newest first. Horizon history may be limited.', `/accounts/${id}/operations?order=desc&limit=20`, ['Operation', 'Source', 'Destination', 'Amount', 'Transaction', 'Time'], operationRow, signal);
  } else if (kind === 'transaction') {
    const t = await request(`/transactions/${id}`, signal);
    markup += panel('Transaction', t.successful ? 'Successful' : 'Failed', details([
      ['Hash', `<span class="mono">${escape(t.hash)}</span>`], ['Ledger', link('ledger', t.ledger)],
      ['Source', link('account', t.source_account)], ['Time', escape(date(t.created_at))],
      ['Fee charged (stroops)', escape(t.fee_charged)], ['Operation count', escape(t.operation_count)],
      ['Memo type', escape(t.memo_type)], ['Memo', escape(t.memo)],
    ]));
    collection = () => paginated('Operations', 'Operations in this transaction.', `/transactions/${id}/operations?limit=20`, ['Operation', 'Source', 'Destination', 'Amount', 'Transaction', 'Time'], operationRow, signal);
  } else {
    const l = await request(`/ledgers/${id}`, signal);
    markup += panel(`Ledger ${id}`, 'Stellar network-wide ledger; includes activity outside TAD3.', details([
      ['Hash', `<span class="mono">${escape(l.hash)}</span>`], ['Closed', escape(date(l.closed_at))],
      ['Successful transactions', escape(l.successful_transaction_count)], ['Failed transactions', escape(l.failed_transaction_count)],
      ['Operations', escape(l.operation_count)], ['Protocol version', escape(l.protocol_version)],
    ]));
    collection = () => paginated('Transactions', 'Network-wide transactions in this ledger.', `/ledgers/${id}/transactions?limit=20&include_failed=true`, ['Hash', 'Source', 'Operations', 'Result'], (t) => [link('transaction', t.hash, short(t.hash)), link('account', t.source_account, short(t.source_account)), escape(t.operation_count), t.successful ? 'Successful' : 'Failed'], signal);
  }
  if (signal.aborted) return;
  content.innerHTML = markup;
  if (collection) {
    try { const section = await collection(); if (!signal.aborted) content.append(section); }
    catch (error) { if (!signal.aborted) content.insertAdjacentHTML('beforeend', `<p class="notice error" role="alert">Activity could not be loaded: ${escape(error.message)}</p>`); }
  }
}

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  content.setAttribute('aria-busy', 'true');
  content.innerHTML = '<p class="notice">Loading ledger data…</p>';
  status.textContent = 'Fetching public data from Horizon…';
  try {
    await render(signal);
    if (!signal.aborted) status.textContent = `Data fetched ${new Date().toLocaleTimeString()} · refresh for updates`;
  } catch (error) {
    if (!signal.aborted) {
      status.textContent = 'Unable to load this view';
      content.innerHTML = `<a class="back" href="#">← Overview</a><p class="notice error" role="alert">${escape(error.message)}</p>`;
    }
  } finally { if (!signal.aborted) content.setAttribute('aria-busy', 'false'); }
}

document.querySelector('#search').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const route = `#${routeFor(document.querySelector('#query').value)}`;
    if (location.hash === route) load(); else location.hash = route;
  } catch (error) { status.textContent = error.message; }
});
document.querySelector('#refresh').addEventListener('click', load);
window.addEventListener('hashchange', load);
load();
