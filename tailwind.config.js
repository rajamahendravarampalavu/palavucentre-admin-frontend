/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
    extend: {
      colors: {
        'bg-page': '#0D0A06',
        'bg-section': '#1A1208',
        'bg-even': 'rgba(36,26,12,0.82)',
        'bg-card': '#241A0C',
        'bg-card-hover': '#3A2A14',
        'bg-footer': '#0D0A06',
        'gold': '#D4A017',
        'gold-bright': '#F0C842',
        'gold-dim': '#8A6810',
        'gold-dark': '#8A6810',
        'maroon': '#2E2010',
        'text-primary': '#F5EDD8',
        'text-secondary': '#B8A882',
        'text-dim': '#6B5F45',
        'text-subtle': '#6B5F45',
        'red-urgent': '#C62828',
        'veg': '#4CAF50',
        'nonveg': '#E53935',
        'whatsapp': '#25D366',
      },
    },
  },
}
