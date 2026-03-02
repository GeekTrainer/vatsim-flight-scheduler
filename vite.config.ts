import { readlinkSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// If node_modules is a symlink (e.g. Docker Sandbox), allow Vite to serve from the target
function getSymlinkAllowPaths(): string[] {
	try {
		const target = readlinkSync(resolve(__dirname, 'node_modules'));
		return [resolve(target, '..')];
	} catch {
		return [];
	}
}

export default defineConfig({
	server: {
		fs: {
			allow: [...getSymlinkAllowPaths()]
		}
	},
	plugins: [tailwindcss(), sveltekit()],
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
