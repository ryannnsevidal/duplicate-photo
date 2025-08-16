// Append CI overrides if present
try {
	const ciOverrides = require('./eslint.ci.overrides.js');
	module.exports = [...module.exports, ...ciOverrides];
} catch (e) {
	// no-op if file missing
}