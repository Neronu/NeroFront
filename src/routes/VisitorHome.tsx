import { ChampionshipCodeSearch } from '../components/ChampionshipCodeSearch';

/** Página inicial sem login (seção 9): só o código do campeonato e "Buscar". Nada mais. */
export function VisitorHome() {
  return (
    <div className="visitor-home">
      <ChampionshipCodeSearch label="Código do campeonato" hideLabel />
    </div>
  );
}
