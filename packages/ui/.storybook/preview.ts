import type { Preview } from '@storybook/react';

// Import Corredor design tokens (fonts + CSS custom properties)
import '../src/styles/tokens.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#070D1A' },
        { name: 'raised', value: '#0D1526' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
