import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { realpathSync, lstatSync } from 'fs';
import { dirname, resolve } from 'path';

// When node_modules is a symlink (sandbox env), Vite's fs security blocks
// serving files from outside the project root. Detect and allow the target.
function getSymlinkAllowPaths(): string[] {
	const nmPath = resolve('node_modules');
	try {
		if (lstatSync(nmPath).isSymbolicLink()) {
			return [dirname(realpathSync(nmPath))];
		}
	} catch {
		// node_modules doesn't exist yet
	}
	return [];
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: getSymlinkAllowPaths()
		}
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['**/*.config.*', '**/types/**', '**/*.d.ts']
		}
	}
});
