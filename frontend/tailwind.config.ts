import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F7F5F0',
          dark: '#EDE9E0',
        },
        seal: {
          DEFAULT: '#B23A2F',
          dark: '#8C2C23',
          light: '#D96F63',
        },
        primary: {
          DEFAULT: '#1B3977',
          dark: '#12283F',
          light: '#5082B9',
        },
        ink: {
          DEFAULT: '#1E293B',
          soft: '#475569',
        },
        border: '#D5DEE8',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(42, 38, 34, 0.08), 0 1px 2px rgba(42, 38, 34, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
