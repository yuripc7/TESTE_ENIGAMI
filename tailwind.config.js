/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shadcn mapping to existing theme
        background: 'var(--theme-bg)',
        foreground: 'var(--theme-text)',
        card: 'var(--theme-card)',
        'card-foreground': 'var(--theme-text)',
        popover: 'var(--theme-card)',
        'popover-foreground': 'var(--theme-text)',
        primary: '#FF6B4A',
        'primary-foreground': '#FFFFFF',
        secondary: 'var(--theme-highlight)',
        'secondary-foreground': 'var(--theme-text)',
        muted: 'var(--theme-highlight)',
        'muted-foreground': 'var(--theme-text-muted)',
        accent: 'var(--theme-highlight)',
        'accent-foreground': 'var(--theme-text)',
        destructive: '#EF4444',
        'destructive-foreground': '#FFFFFF',
        border: 'var(--theme-divider)',
        input: 'var(--theme-input)',
        ring: '#FF6B4A',

        // Updated Pastel Theme (Neuro-Pastel)
        theme: {
          bg: 'var(--theme-bg)',
          card: 'var(--theme-card)',
          orange: '#FFB7B2', /* Pastel Salmon */
          purple: '#D4C1EC', /* Pastel Lavender */
          cyan: '#B5EAD7',   /* Pastel Mint */
          text: 'var(--theme-text)',
          textMuted: 'var(--theme-text-muted)',
          divider: 'var(--theme-divider)',
          highlight: 'var(--theme-highlight)',
          input: 'var(--theme-input)',
          border: 'var(--theme-border)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        square: ['Orbitron', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'cinematic-reveal': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(20px) scale(0.95)', 
            filter: 'blur(10px)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)', 
            filter: 'blur(0)' 
          }
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        slideDown: 'slideDown 0.4s ease-out',
        slideUp: 'slideUp 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'cinematic-reveal': 'cinematic-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      boxShadow: {
        neuro: '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 0 1px 0 rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
