/**
 * Zdroj CLI pro Claude Code (sestavený `npm run build:cli` do src/generated/uxlog-cli.mjs).
 * Plugin ho zapisuje do složky dat jako .uxlog/bin/uxlog.mjs. Sestavení běží automaticky
 * před `npm run dev`, `npm run build` a `npm test`.
 */
import source from '../../../generated/uxlog-cli.mjs?raw'

export default source
