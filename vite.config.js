import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	// Skip Vercel feedback system URLs to reduce console noise
	if (url.includes('/.well-known/vercel/') || url.includes('feedback.js') || url.includes('vercel')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			// Skip logging errors for Vercel feedback system
			const isVercelFeedback = url.includes('/.well-known/vercel/') || url.includes('feedback.js') || url.includes('vercel');

			if (!response.ok && !isDocumentResponse && !isVercelFeedback) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			// Skip logging errors for Vercel feedback system
			const isVercelFeedback = url.includes('/.well-known/vercel/') || url.includes('feedback.js') || url.includes('vercel');
			
			if (!url.match(/\.html?$/i) && !isVercelFeedback) {
				console.error(error);
			}

			throw error;
		});
};
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		const tags = [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: {type: 'module'},
				children: configHorizonsConsoleErrroHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin()] : []),
		react(),
		addTransformIndexHtml,
		// CSS optimization plugin for production
		...(isDev ? [] : [{
			name: 'inline-critical-css',
			transformIndexHtml(html) {
				// Add critical CSS inlining for above-the-fold content
				const criticalCSS = `
					/* Critical CSS for initial render */
					* { box-sizing: border-box; }
					body { margin: 0; font-family: 'Inter', sans-serif; background: #ffffff; }
					#root { min-height: 100vh; }
					.loading { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
				`;
				return html.replace('<head>', `<head><style>${criticalCSS}</style>`);
			}
		}])
	],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			],
			output: {
				manualChunks: (id) => {
					// Vendor chunks for better caching and performance
					if (id.includes('node_modules')) {
						// Core React ecosystem - keep React and React-DOM together
						if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
							return 'vendor-react';
						}
						// UI libraries
						if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('@radix-ui')) {
							return 'vendor-ui';
						}
						// Form handling
						if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
							return 'vendor-forms';
						}
						// Backend services
						if (id.includes('@supabase')) {
							return 'vendor-supabase';
						}
						// Payment processing
						if (id.includes('@stripe') || id.includes('stripe')) {
							return 'vendor-stripe';
						}
						// Data fetching
						if (id.includes('@tanstack/react-query')) {
							return 'vendor-query';
						}
						// Other vendor libraries
						return 'vendor';
					}

					// Separate large data files
					if (id.includes('/data/databaseCities') || id.includes('/data/canadaCityClusters')) {
						return 'data-cities';
					}
				}
			}
		},
		// Optimize bundle size
		chunkSizeWarningLimit: 1000,
		// Enable source maps for debugging
		sourcemap: false,
		// Minify for production
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				pure_funcs: ['console.log', 'console.info', 'console.debug']
			},
			mangle: {
				safari10: true
			}
		},
		// CSS optimization
		cssCodeSplit: true,
		cssMinify: true
	}
});
