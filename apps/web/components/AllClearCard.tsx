type Props = {
  score: number;
};

function motivationalMessage(score: number): string {
  if (score >= 80) return "Seu score está excelente. Continue assim!";
  if (score >= 60) return "Suas finanças estão bem encaminhadas.";
  return "Você está no caminho certo. Cada passo conta!";
}

export function AllClearCard({ score }: Props) {
  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 border-l-4"
      style={{ borderLeftColor: "#00c97a" }}
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Status atual
      </p>
      <p className="text-xl font-bold text-gray-900">Tudo sob controle 🎉</p>
      <p className="text-sm text-gray-500 mt-2">{motivationalMessage(score)}</p>
    </div>
  );
}
