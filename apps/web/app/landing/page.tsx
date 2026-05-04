import Link from "next/link";

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "🔍",
    title: "Detecta vazamentos",
    description:
      "Identifica assinaturas esquecidas e gastos desnecessários que estão consumindo sua renda todo mês.",
  },
  {
    icon: "🎯",
    title: "Metas simples",
    description:
      "Sem planilhas complicadas. Defina sua renda e gastos fixos uma única vez e receba um score claro.",
  },
  {
    icon: "🔔",
    title: "Alertas inteligentes",
    description:
      "Receba avisos antes das cobranças chegarem e sugestões de quando vale cancelar uma assinatura.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Cadastre seus dados",
    description: "Informe sua renda mensal, gastos fixos e assinaturas em menos de 3 minutos.",
  },
  {
    number: "02",
    title: "Receba seu score",
    description:
      "O Finance Copilot calcula sua saúde financeira e mostra o que está pesando mais.",
  },
  {
    number: "03",
    title: "Siga as recomendações",
    description:
      "Ações concretas e personalizadas para você economizar sem abrir mão do que importa.",
  },
];

const TESTIMONIALS = [
  {
    name: "Ana Souza",
    role: "Designer freelancer",
    avatar: "AS",
    text: "Eu tinha 7 assinaturas e nem sabia. O Finance Copilot me mostrou que eu estava gastando R$ 280/mês em serviços que mal usava.",
  },
  {
    name: "Rafael Lima",
    role: "Engenheiro de software",
    avatar: "RL",
    text: "Em 2 semanas meu score subiu 18 pontos só cancelando o que não usava. A sensação de controle é incrível.",
  },
  {
    name: "Carla Mendes",
    role: "Professora",
    avatar: "CM",
    text: "Finalmente uma ferramenta que não me faz sentir burra com finanças. É simples, direto e funciona de verdade.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-bold text-gray-900 tracking-tight text-lg">Finance Copilot</span>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#00c97a" }}
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-20 pb-24 px-6">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
          style={{ color: "#00c97a", borderColor: "#00c97a40", backgroundColor: "#00c97a0d" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#00c97a" }}
          />
          100% gratuito durante o beta
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
          Seu dinheiro organizado no{" "}
          <span style={{ color: "#00c97a" }}>piloto automático</span>
          <br className="hidden sm:block" />
          <span className="text-gray-900"> sem planilha, sem esforço</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          O Finance Copilot analisa seus gastos, detecta vazamentos e te diz exatamente o que
          fazer para melhorar sua saúde financeira — em minutos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#00c97a" }}
          >
            Começar grátis →
          </Link>
          <a
            href="#como-funciona"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-gray-700 text-sm border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            Ver como funciona
          </a>
        </div>

        <p className="text-xs text-gray-400">Sem cartão de crédito. Sem pegadinha.</p>
      </div>

      {/* Score preview card */}
      <div className="max-w-sm mx-auto mt-16">
        <div
          className="rounded-2xl p-6 shadow-xl text-white"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-4">
            Seu copiloto financeiro
          </p>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-4xl font-bold" style={{ color: "#00c97a" }}>78</p>
              <p className="text-sm opacity-60 mt-1">Score financeiro</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "#00c97a" }}>↑ +12 pts</p>
              <p className="text-xs opacity-50 mt-1">este mês</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Netflix cancelado", value: "R$ 55/mês", color: "#00c97a" },
              { label: "Cobrança chegando", value: "em 3 dias", color: "#f5a623" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
              >
                <p className="text-xs opacity-80">{item.label}</p>
                <p className="text-xs font-semibold" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#00c97a" }}
          >
            Diferenciais
          </p>
          <h2 className="text-3xl font-bold text-gray-900">
            Tudo que você precisa, nada que você não vai usar
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                style={{ backgroundColor: "#00c97a12" }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#00c97a" }}
          >
            Como funciona
          </p>
          <h2 className="text-3xl font-bold text-gray-900">Simples assim</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* connecting line (desktop) */}
          <div
            className="hidden sm:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px"
            style={{ backgroundColor: "#00c97a30" }}
          />

          {STEPS.map((step, i) => (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm mb-5 border-2 bg-white"
                style={{
                  borderColor: "#00c97a",
                  color: "#00c97a",
                  zIndex: 1,
                }}
              >
                {step.number}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#00c97a" }}
          >
            Depoimentos
          </p>
          <h2 className="text-3xl font-bold text-gray-900">
            Quem já usa não volta para as planilhas
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 flex flex-col gap-5"
            >
              <p className="text-gray-600 text-sm leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: "#1a1a2e" }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <section className="py-24 px-6">
      <div
        className="max-w-2xl mx-auto rounded-3xl p-12 text-center text-white"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}
      >
        <h2 className="text-3xl font-bold mb-4">
          Pronto para ter controle de verdade?
        </h2>
        <p className="text-sm opacity-60 mb-8 max-w-md mx-auto leading-relaxed">
          Comece agora, gratuitamente. Seu primeiro score financeiro fica pronto em menos de 3
          minutos.
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#00c97a", color: "white" }}
        >
          Começar grátis →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <span className="font-semibold text-gray-700">Finance Copilot</span>
        <p>© {new Date().getFullYear()} Finance Copilot. Feito para simplificar suas finanças.</p>
        <Link href="/login" className="hover:text-gray-600 transition-colors">
          Entrar na plataforma
        </Link>
      </div>
    </footer>
  );
}
