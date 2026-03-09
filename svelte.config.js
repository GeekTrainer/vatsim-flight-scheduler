import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: true
	},

	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			edge: false,
			split: false
		}),

		version: {
			name: process.env.COMMIT_REF || ''
		},

		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self'],
				'connect-src': [
					'self',
					'https://data.vatsim.net',
					'https://atis.info',
					'https://www.simbrief.com'
				]
			}
		}
	}
};

export default config;
