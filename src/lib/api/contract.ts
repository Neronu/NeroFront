/**
 * Contrato da API usado pelo front: reexporta `@neronu/api-contract`.
 *
 * Tipo novo da API entra no pacote (neroBack/packages/api-contract) e chega aqui pela versão
 * publicada; não espelhe tipos neste arquivo.
 */
import type { TransferPreview } from '@neronu/api-contract';

export * from '@neronu/api-contract';

/** Atleta da equipe transferida, com a unificação proposta em cada entidade de destino. */
export type TransferAthlete = TransferPreview['destinations'][number]['athletes'][number];
