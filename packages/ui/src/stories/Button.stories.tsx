import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/primitives/button.js';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Continuar', variant: 'default' },
};

export const Outline: Story = {
  args: { children: 'Cancelar', variant: 'outline' },
};

export const Destructive: Story = {
  args: { children: 'Eliminar', variant: 'destructive' },
};

export const Ghost: Story = {
  args: { children: 'Ver más', variant: 'ghost' },
};

export const Small: Story = {
  args: { children: 'Guardar', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Crear propiedad', size: 'lg' },
};

export const Loading: Story = {
  args: { children: 'Cargando…', disabled: true },
};
