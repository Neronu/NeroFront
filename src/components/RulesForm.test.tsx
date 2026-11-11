import type { SportRulesResponse } from '@neronu/api-contract';
import { basketball } from '@neronu/sport-basketball';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RulesForm } from './RulesForm';

const data: SportRulesResponse = {
  sportKey: 'basketball',
  sportName: 'Basquete',
  fields: basketball.rulesSchema.fields as SportRulesResponse['fields'],
  defaults: { ...basketball.defaultRules },
  rules: { ...basketball.defaultRules },
  changed: [],
};

it('gera um campo para cada regra do módulo e envia só o que mudou', async () => {
  const onSave = vi.fn(async (changes: Record<string, unknown>) => ({
    ...data,
    rules: { ...data.rules, ...changes } as SportRulesResponse['rules'],
  }));
  render(<RulesForm data={data} onSave={onSave} />);
  // Rótulo exato (alguns têm "+"), comparado como texto e não como regex.
  for (const f of basketball.rulesSchema.fields) {
    expect(document.querySelector(`label[for="rule-${f.key}"]`)?.textContent).toContain(f.label);
    expect(document.getElementById(`rule-${f.key}`)).not.toBeNull();
  }

  fireEvent.change(screen.getByLabelText(/Faltas para exclusão/), { target: { value: '6' } });
  fireEvent.change(screen.getByLabelText(/^Períodos/), { target: { value: '2' } });
  fireEvent.click(screen.getByLabelText(/Prorrogação em caso de empate/));
  expect(screen.getAllByText(/padrão:/)).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar regras' }));
  expect(onSave).toHaveBeenCalledWith({ playerFoulLimit: 6, periods: 2, overtimeEnabled: false });
  expect(await screen.findByText('Regras salvas.')).toBeInTheDocument();
});
