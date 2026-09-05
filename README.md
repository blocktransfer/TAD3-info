# TAD3 Explorer

A read-only explorer for TAD3 assets and public Stellar Mainnet records. Built with native HTML, CSS, and JavaScript; no wallet, API credentials, or build step required.

Run `npm start` with Node.js and Python 3 installed, then open [the local explorer](http://localhost:8080). Run `npm test` for identifier routing, amount precision, and data-source boundary tests. Any static web host can serve the application files; hash-based routes need no server rewrites.

The overview shows assets issued by the configured BlockTransfer account and the latest network ledger. Search by case-sensitive asset code, public G-address, transaction hash, or ledger sequence. Asset pages show authorization flags, balance categories, and paginated trustline accounts. Account pages show balances and paginated operations. Transaction and ledger pages link to their constituent records.

## Data and scope

Data is fetched directly from [Stellar Horizon](https://horizon.stellar.org). The UI refreshes on navigation or with the Refresh button. Requests time out after 20 seconds; navigation cancels obsolete requests. Network failures and unavailable records are shown explicitly.

The three public account IDs in `data.js` come from [BlockTransfer's published account directory](https://blocktransfer.com/.well-known/stellar.toml), retrieved on September 5, 2026. This initial scope covers one issuer, not every TAD3 deployment. Asset identity always includes the issuer. The published directory contained conflicting company metadata for `1984803ORD` at retrieval, so the explorer uses on-chain asset codes without inferring company names or current servicing relationships.

Ledger balance categories are shown separately and are not presented as legal shares outstanding. Trustline accounts are not a count of identified shareholders. Claimable, pool, and contract balances appear in asset details; the trustline table does not enumerate those other holding mechanisms. Numeric-only search input means a ledger sequence; a numeric asset code can be opened through an explicit `#asset/CODE` link.

The overview requests up to 200 assets. Account lists, operations, and transactions offer Load more pagination. Account and ledger activity can include non-TAD3 assets. Horizon may not retain all historical transactions. This version does not maintain a historical index, aggregate asset-wide transfers, infer beneficial ownership, access investor profiles, or submit transactions.

For the underlying data model, see [Horizon endpoint documentation](https://developers.stellar.org/docs/tools/lab/api-explorer/horizon-endpoint). TAD3 architecture is documented at [TAD3 docs](https://tad3.dev/).
