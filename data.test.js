import test from 'node:test';
import assert from 'node:assert/strict';
import { amount, routeFor, ACCOUNTS, request } from './data.js';

test('ledger amounts retain all significant decimals without floating-point rounding', () => {
  assert.equal(amount('922337203685.4775807'), '922,337,203,685.4775807');
  assert.equal(amount('0.0000001'), '0.0000001');
  assert.equal(amount('1500.0000000'), '1,500');
});

test('search distinguishes identifiers and rejects URL or markup input', () => {
  assert.equal(routeFor(ACCOUNTS.Issuer), `account/${ACCOUNTS.Issuer}`);
  assert.equal(routeFor('1846058ORD'), 'asset/1846058ORD');
  assert.equal(routeFor('12345'), 'ledger/12345');
  assert.equal(routeFor('A'.repeat(64)), `transaction/${'a'.repeat(64)}`);
  assert.throws(() => routeFor('<script>'));
  assert.throws(() => routeFor('https://example.com'));
});

test('pagination cannot redirect data requests to another origin', async () => {
  await assert.rejects(request('https://example.com/accounts', new AbortController().signal), /Unexpected data source/);
});
