import { Button, EmptyState, PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <div className="ui-stack">
      <PageHeader title="Página não encontrada" />
      <EmptyState
        action={
          <Button to="/" variant="secondary">
            Voltar ao início
          </Button>
        }
      >
        O endereço não existe ou mudou. Volte ao início para continuar.
      </EmptyState>
    </div>
  );
}
