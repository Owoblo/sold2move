/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class', '[data-theme="light"]'], // Enable dark mode based on class or data-theme attribute
	content: [
		'./pages/**/*.{js,jsx}',
		'./components/**/*.{js,jsx}',
		'./app/**/*.{js,jsx}',
		'./src/**/*.{js,jsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				// ========================================
				// STEALTH PALETTE - Charcoal Scale
				// ========================================
				charcoal: {
					950: 'hsl(var(--charcoal-950))',
					900: 'hsl(var(--charcoal-900))',
					800: 'hsl(var(--charcoal-800))',
					700: 'hsl(var(--charcoal-700))',
					600: 'hsl(var(--charcoal-600))',
					500: 'hsl(var(--charcoal-500))',
				},

				// Electric Emerald (Vibrant Accent)
				electric: {
					500: 'hsl(var(--electric-500))',
					400: 'hsl(var(--electric-400))',
					600: 'hsl(var(--electric-600))',
					300: 'hsl(var(--electric-300))',
				},

				// Violet (Secondary Accent)
				violet: {
					500: 'hsl(var(--violet-500))',
					400: 'hsl(var(--violet-400))',
				},

				// ========================================
				// LEGACY TOKENS (mapped to Stealth)
				// ========================================
				'deep-navy': 'hsl(var(--deep-navy))',
				'light-navy': 'hsl(var(--light-navy))',
				'lightest-navy': 'hsl(var(--lightest-navy))',
				'slate': 'hsl(var(--slate))',
				'light-slate': 'hsl(var(--light-slate))',
				'lightest-slate': 'hsl(var(--lightest-slate))',
				'white': 'hsl(var(--white))',
				'teal': 'hsl(var(--teal))',
				'navy-accent': 'hsl(var(--navy-accent))',

				// ========================================
				// SEMANTIC TOKENS
				// ========================================
				// Surface colors (backgrounds)
				surface: {
					primary: 'hsl(var(--deep-navy))',
					secondary: 'hsl(var(--light-navy))',
					tertiary: 'hsl(var(--lightest-navy) / <alpha-value>)',
					elevated: 'hsl(var(--light-navy))',
				},
				// Content colors (text)
				content: {
					primary: 'hsl(var(--lightest-slate))',
					secondary: 'hsl(var(--slate))',
					tertiary: 'hsl(var(--light-slate))',
					inverse: 'hsl(var(--deep-navy))',
				},
				// Brand colors
				brand: {
					primary: 'hsl(var(--teal))',
					secondary: 'hsl(var(--navy-accent))',
				},
				// State colors
				state: {
					success: '#00FF88',
					warning: '#FFB800',
					error: '#FF4444',
					info: '#4488FF',
				},

				// ========================================
				// SHADCN SEMANTIC TOKENS (keep)
				// ========================================
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},

			// ========================================
			// TYPOGRAPHY SCALE
			// ========================================
			fontSize: {
				// Hero Stats (Aggressive)
				'hero-stat': ['4rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '900' }],
				'hero-stat-lg': ['5rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '900' }],
				'hero-stat-sm': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
				// Display (Hero text)
				'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
				'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
				'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
				// Headings
				'heading-xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
				'heading-lg': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
				'heading-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
				'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
				// Body
				'body-lg': ['1.125rem', { lineHeight: '1.6' }],
				'body-md': ['1rem', { lineHeight: '1.6' }],
				'body-sm': ['0.875rem', { lineHeight: '1.5' }],
				// Data (Monospace metrics)
				'data-lg': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
				'data-md': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
				'data-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
				// Caption/Label
				'caption': ['0.75rem', { lineHeight: '1.4' }],
				'label': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
			},

			// ========================================
			// BORDER RADIUS
			// ========================================
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				// Extended scale
				'xl': 'calc(var(--radius) + 4px)',
				'2xl': 'calc(var(--radius) + 8px)',
				'3xl': 'calc(var(--radius) + 16px)',
			},

			// ========================================
			// SHADOWS (Enhanced Electric Glow)
			// ========================================
			boxShadow: {
				// Electric glow shadows
				'glow-sm': '0 0 10px hsl(155 100% 50% / 0.15), 0 0 20px hsl(155 100% 50% / 0.05)',
				'glow': '0 0 20px hsl(155 100% 50% / 0.25), 0 0 40px hsl(155 100% 50% / 0.1)',
				'glow-lg': '0 0 40px hsl(155 100% 50% / 0.3), 0 0 80px hsl(155 100% 50% / 0.15)',
				'glow-xl': '0 0 60px hsl(155 100% 50% / 0.4), 0 0 120px hsl(155 100% 50% / 0.2)',
				// Badge glow shadows
				'badge-new': '0 0 12px hsl(155 100% 50% / 0.5)',
				'badge-hot': '0 0 12px hsl(45 100% 50% / 0.5)',
				'badge-sold': '0 0 12px hsl(220 90% 60% / 0.5)',
				// Card shadows
				'card': '0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.15)',
				'card-hover': '0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.15)',
				// Elevation shadows
				'elevation-1': '0 1px 3px rgb(0 0 0 / 0.2), 0 1px 2px rgb(0 0 0 / 0.3)',
				'elevation-2': '0 3px 6px rgb(0 0 0 / 0.25), 0 2px 4px rgb(0 0 0 / 0.2)',
				'elevation-3': '0 10px 20px rgb(0 0 0 / 0.25), 0 3px 6px rgb(0 0 0 / 0.15)',
				// Luminous border shadow
				'luminous': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.05), 0 0 0 1px hsl(0 0% 0% / 0.1)',
				'luminous-accent': 'inset 0 1px 0 0 hsl(155 100% 50% / 0.1), 0 0 20px hsl(155 100% 50% / 0.1)',
			},

			// ========================================
			// GRADIENTS (Stealth + Mesh)
			// ========================================
			backgroundImage: {
				'brand-gradient': 'linear-gradient(to right, hsl(var(--navy-accent)), hsl(var(--teal)))',
				'brand-gradient-reverse': 'linear-gradient(to right, hsl(var(--teal)), hsl(var(--navy-accent)))',
				'brand-gradient-subtle': 'linear-gradient(to right, hsl(var(--navy-accent) / 0.2), hsl(var(--teal) / 0.2))',
				'brand-gradient-vertical': 'linear-gradient(to bottom, hsl(var(--navy-accent)), hsl(var(--teal)))',
				'surface-gradient': 'linear-gradient(to bottom right, hsl(var(--light-navy)), hsl(var(--deep-navy)))',
				'stealth-gradient': 'linear-gradient(to bottom right, hsl(220 12% 10%), hsl(220 13% 6%))',
				'mesh-gradient': 'radial-gradient(ellipse 80% 50% at 20% 40%, hsl(155 100% 50% / 0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 60%, hsl(270 100% 65% / 0.06) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 50% 90%, hsl(220 90% 60% / 0.05) 0%, transparent 50%)',
				'mesh-gradient-subtle': 'radial-gradient(ellipse 60% 40% at 15% 30%, hsl(155 100% 50% / 0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 35% at 85% 70%, hsl(270 100% 65% / 0.03) 0%, transparent 50%)',
			},

			// ========================================
			// TRANSITIONS
			// ========================================
			transitionDuration: {
				'fast': '150ms',
				'normal': '200ms',
				'slow': '300ms',
				'slower': '500ms',
			},
			transitionTimingFunction: {
				'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
				'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
			},

			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				heading: ['"Plus Jakarta Sans"', 'sans-serif'],
				mono: ['"IBM Plex Mono"', 'monospace'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'fade-in': {
					from: { opacity: 0 },
					to: { opacity: 1 },
				},
				'fade-out': {
					from: { opacity: 1 },
					to: { opacity: 0 },
				},
				'slide-in-from-top': {
					from: { transform: 'translateY(-10px)', opacity: 0 },
					to: { transform: 'translateY(0)', opacity: 1 },
				},
				'slide-in-from-bottom': {
					from: { transform: 'translateY(10px)', opacity: 0 },
					to: { transform: 'translateY(0)', opacity: 1 },
				},
				'scale-in': {
					from: { transform: 'scale(0.95)', opacity: 0 },
					to: { transform: 'scale(1)', opacity: 1 },
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(155 100% 50% / 0.2)' },
					'50%': { boxShadow: '0 0 40px hsl(155 100% 50% / 0.4)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.2s ease-out',
				'fade-out': 'fade-out 0.2s ease-out',
				'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
				'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};