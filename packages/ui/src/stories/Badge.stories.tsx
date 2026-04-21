import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../components/primitives/badge.js';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'En venta', variant: 'default' } };
export const Success: Story = { args: { children: 'Vendida', variant: 'success' } };
export const Warning: Story = { args: { children: 'Reservada', variant: 'warning' } };
export const Destructive: Story = { args: { children: 'Inactiva', variant: 'destructive' } };
export const Outline: Story = { args: { children: 'En alquiler', variant: 'outline' } };
