# TAD3 Info

This branch provides an example of minimal static hosting for eventual use on `main`. Put files intended for public access in `public/`; their paths inside that folder become their website paths. For example, `public/example.pdf` is served at `/example.pdf`. Add links to `public/index.html` when you add files; there is no automatic directory listing.

## Netlify setup

Import this GitHub repository into Netlify with these settings:

- Production branch: `main`.
- Base directory: leave blank.
- Build command: leave blank.
- Publish directory: `public` (also set in `netlify.toml`).
- Branch deploys: disabled.
- Deploy Previews: disabled.

Only the contents of `public/` are published. Netlify serves these static files directly; no nginx server, package installation, or build step is needed. The repository configuration does not create or connect a Netlify project; select the production branch and disable branch deploys and previews in the Netlify project settings when connecting it.

For details, see [Netlify's file-based configuration documentation](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

## Explorer prototype

The unfinished explorer is kept separately on `explorer-prototype`. It has significant unresolved compliance issues, has not been vetted or approved, and must not be treated as substantiated or relied upon. It is not part of this site's production content.
