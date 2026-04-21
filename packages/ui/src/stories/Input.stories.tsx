import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/primitives/input.js';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Correo electrónico' } };
export const Password: Story = { args: { type: 'password', placeholder: 'Contraseña' } };
export const Disabled: Story = { args: { disabled: true, value: 'Sin editar', readOnly: true } };
export const WithValue: Story = { args: { value: 'martin@corredor.ar', readOnly: true } };
