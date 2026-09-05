import { redirect } from "next/navigation";

// Planos e Custos viraram uma página só (menos um item no menu, tudo junto:
// calculadora, planos salvos e custo hoje×previsto). Quem tinha essa URL
// salva ainda chega no lugar certo.
export default function Planos() {
  redirect("/custos");
}
