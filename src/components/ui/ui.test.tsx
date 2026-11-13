import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { DataTable } from './DataTable';
import { TextField } from './Field';
import { Tabs } from './Tabs';

describe('Button', () => {
  it('usa a variante e não dispara quando desabilitado', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Salvar súmula
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Salvar súmula' });
    expect(btn).toHaveClass('ui-button', 'ui-button--primary');
    expect(btn).toHaveAttribute('type', 'button');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('vira link com `to`', () => {
    render(
      <MemoryRouter>
        <Button to="/campeonatos/novo" variant="primary">
          Novo campeonato
        </Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Novo campeonato' })).toHaveAttribute(
      'href',
      '/campeonatos/novo',
    );
  });
});

describe('TextField', () => {
  it('liga rótulo e erro ao campo', () => {
    render(<TextField label="Código do campeonato" error="Código não encontrado." />);
    const input = screen.getByLabelText('Código do campeonato');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Código não encontrado.');
  });
});

describe('Tabs', () => {
  const items = [
    { key: 'resultados', label: 'Resultados' },
    { key: 'classificacao', label: 'Classificação' },
    { key: 'estatisticas', label: 'Estatísticas' },
  ] as const;
  type Key = (typeof items)[number]['key'];

  function Harness() {
    const [tab, setTab] = useState<Key>('resultados');
    return <Tabs label="Seções" items={items} value={tab} onChange={setTab} />;
  }

  it('marca a aba ativa e navega pelas setas', () => {
    render(<Harness />);
    const first = screen.getByRole('tab', { name: 'Resultados' });
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(first).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    const last = screen.getByRole('tab', { name: 'Estatísticas' });
    expect(last).toHaveAttribute('aria-selected', 'true');
    expect(last).toHaveFocus();
    expect(first).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveAttribute('aria-selected', 'true');
  });
});

describe('DataTable', () => {
  const rows = [
    { id: 'a', team: 'Computação', won: 5, diff: 37 },
    { id: 'b', team: 'Direito', won: 2, diff: -21 },
  ];

  it('renderiza números alinhados, rótulos para o modo cartão e a divisória', () => {
    render(
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        caption="Classificação"
        dividerAfter={(_, i) => i === 0}
        columns={[
          { key: 'team', header: 'Equipe', lead: true, render: (r) => r.team },
          { key: 'won', header: 'V', title: 'Vitórias', numeric: true, render: (r) => r.won },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'Classificação' });
    expect(table).toHaveClass('ui-table--stacked');
    const cell = screen.getByText('5');
    expect(cell).toHaveClass('is-num');
    expect(cell).toHaveAttribute('data-label', 'Vitórias');
    expect(screen.getByText('Computação').closest('tr')).toHaveClass('is-divider-after');
    expect(screen.getByText('Direito').closest('tr')).not.toHaveClass('is-divider-after');
  });
});
