/** @type {import('tailwindcss').Config} */
module.exports = {
    // `overline` is a Tailwind utility; without this an app's own eyebrow-label class draws a line above the text.
    blocklist: ["overline"],
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        craft: {
          graphite: '#0B0F14',   // deep base surface
          slate: '#141B24',       // elevated surface / cards
          fog: '#94A3B8',         // muted text / subtle borders
          amber: '#F59E0B',       // primary heat — CTAs, hover peaks
          ember: '#B45309',       // amber pressed / low-emphasis heat
          lime: '#B7FF3A',        // lab-lime — scan lines, active AI states
          cyan: '#22D3EE',        // secondary scanline / diagnostic accents
          ink: '#E5E7EB'          // primary foreground on graphite
        }
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' }
        },
        'grid-pulse': {
          '0%,100%': { opacity: '0.15' },
          '50%': { opacity: '0.45' }
        },
        'label-in': {
          '0%': { opacity: '0', transform: 'translate(-8px,-8px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translate(0,0) scale(1)' }
        },
        'wire-draw': {
          '0%': { strokeDashoffset: '400' },
          '100%': { strokeDashoffset: '0' }
        },
        'kenburns': {
          '0%':   { transform: 'scale(1) translate(0,0)' },
          '50%':  { transform: 'scale(1.06) translate(-1%, -1%)' },
          '100%': { transform: 'scale(1) translate(0,0)' }
        },
        'ping-slow': {
          '0%':   { transform: 'scale(1)',   opacity: '1'   },
          '70%':  { transform: 'scale(3)',   opacity: '0'   },
          '100%': { transform: 'scale(3)',   opacity: '0'   }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'scanline': 'scanline 3.2s ease-in-out infinite',
        'grid-pulse': 'grid-pulse 2.4s ease-in-out infinite',
        'label-in': 'label-in 400ms cubic-bezier(.16,1,.3,1) both',
        'wire-draw': 'wire-draw 1.8s ease-out forwards',
        'kenburns': 'kenburns 12s ease-in-out infinite',
        'ping-slow': 'ping-slow 2.4s cubic-bezier(0,0,.2,1) infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};