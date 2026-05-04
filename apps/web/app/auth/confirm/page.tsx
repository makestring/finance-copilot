export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center">
        <span className="font-bold text-gray-900 tracking-tight">Finance Copilot</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto"
            style={{ backgroundColor: "#00c97a18" }}
          >
            📬
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verifique seu e-mail</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua
              conta e começar a usar o Finance Copilot.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Próximos passos
            </p>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: "#00c97a" }}
                >
                  1
                </span>
                Abra o e-mail que enviamos para você
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: "#00c97a" }}
                >
                  2
                </span>
                Clique no botão "Confirmar e-mail"
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: "#00c97a" }}
                >
                  3
                </span>
                Faça login e configure seu perfil financeiro
              </li>
            </ol>
          </div>

          <p className="text-xs text-gray-400">
            Não recebeu o e-mail?{" "}
            <a
              href="/login"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "#00c97a" }}
            >
              Tente novamente
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
