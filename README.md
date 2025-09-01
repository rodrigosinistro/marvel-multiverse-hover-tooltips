
# Marvel Multiverse – Hover Tooltips

A lightweight module for **Foundry VTT 13** that adds rich tooltips when you hover over items and system entries from the **Marvel Multiverse RPG** system.

## What it shows

- **Any Item in actor sheets / directories / compendia** → *description* + *range*
- **Occupations** → *description*
- **Origins** → *description*
- **Tags** → *description*
- **Traits** → *description*
- **Powers** → *description, action, trigger, duration, cost, effect*

> The module tries to be resilient to minor field name differences. If a field is missing in your system data, it's simply skipped.

## Install

1. Download the ZIP from ChatGPT and extract it somewhere local.
2. Move the folder `marvel-multiverse-hover-tooltips` into your Foundry **Data** directory under `Data/modules/`.
3. Restart Foundry and enable **Marvel Multiverse – Hover Tooltips** in **Manage Modules** for your world.

## Settings

- **Enable**/disable the module per-world.
- Toggle which *types* will display tooltips (Powers, Traits, Tags, etc.).

## Notes

- Built against Foundry VTT **v13** APIs.
- Designed for the **marvel-multiverse** system id. If your system id differs, you can override it via a world setting.

MIT License.

Link para o Manifest:
https://raw.githubusercontent.com/rodrigosinistro/marvel-multiverse-hover-tooltips/main/module.json
