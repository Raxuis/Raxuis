# Profile files for Raxuis/Raxuis

This package replaces the root README.md and adds profile.config.json, scripts/, profile/ and .github/workflows/update-profile.yml. Existing unrelated assets can stay in place. The original README is preserved separately in the preview delivery.

## Edit and rebuild

Edit profile.config.json, then run with Node.js 24:

```sh
node scripts/build-profile.mjs
```

To refresh GitHub statistics locally, supply GITHUB_TOKEN through your environment and run:

```sh
node scripts/update-stats.mjs
node scripts/build-profile.mjs
```

Never put a token into the configuration or commit one. The workflow uses GitHub's built-in GITHUB_TOKEN and runs daily at 03:23 UTC, manually, and when its source/configuration changes on main. It updates only generated assets, the README and the statistics snapshot. Branch protection or organization policies can prevent its direct push; in that case the workflow must be adapted to create update pull requests.

The header counts all owned public repositories. Stars and language percentages count owned public non-fork repositories. Commit, pull-request and issue metrics cover the past year, as returned by GitHub contributionsCollection. Longest streak is limited to that same calendar period. Contributions cover GitHub's past-year contribution calendar. Each snapshot displays its UTC retrieval date. If the API is unavailable, the previous snapshot is retained; with no snapshot, statistics cards are omitted and the header shows dashes. The workflow needs no personal access token or additional package dependencies.

## Integration

1. Create a branch from the current Raxuis/Raxuis main branch.
2. Copy these files into the repository, preserving unrelated files.
3. Open a pull request and inspect the rendered README on that branch.
4. Merge after reviewing the result. That merge changes the public profile.

The preview HTML and screenshots are review artifacts and do not need to be committed to the profile repository. The generator uses native SVG elements and system fonts. The header uses a large typographic identity with the dark monochrome palette of the portfolio. No project illustrations or external artwork are included.

## External widgets

The final Widgets section keeps the original Flo meditation widget and profile-view counter. Their appearance is controlled by those services, not by the local theme. Edit or remove entries in the widgets array of profile.config.json and rebuild to change the selection. These images update through their providers and require network access; previewing the view counter can increment its count.

## Goals and interests

Edit goals.year and goals.items in profile.config.json. Set an item’s done field to true to check it off; the progress summary is computed from these values. The preview retains the seven original 2026 objectives and their existing states, as requested.

Edit interests to change the four Outside of coding cards. Their locally generated SVGs animate with CSS and use no scripts, remote images or embedded fonts. Motion stops when the viewer prefers reduced motion. The dedicated renderer is scripts/personal-panels.mjs; the workflow rebuilds when that file changes.
