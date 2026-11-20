# LexiBranch

Interactive browser-based tool for creating and visualizing phylogenetic trees
of languages.

## Development

```bash
pnpm install
pnpm dev
```

Run the full verification suite with:

```bash
pnpm check
```

## Deployment

The app is a static build deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) on every push to `main`.

- Enable Pages in the repository settings with **Source: GitHub Actions**.
- The production build is served from `https://<user>.github.io/LexiBranch/`, so the Vite
  `base` path in `vite.config.ts` must match the repository name (`/LexiBranch/`). Local
  development stays at `/`.
- Reproduce the production build locally with `pnpm build && pnpm preview`.
