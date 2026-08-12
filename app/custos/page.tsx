import { Card, Kpi, Pill, SourceTag, Icon } from "@/components/ui";
import { getSistemas, getEmpresas, getCustos, receitaSistema, planById } from "@/lib/data";
import { BRL, pct, nomeCurto, fmtStorage } from "@/lib/format";
import { infraCusto } from "@/lib/precos";

export const dynamic = "force-dynamic";

export default async function Custos() {
  const sistemas = await getSistemas();
  const empresas = getEmpresas();
  const custos = getCustos();

  const custoDe = (sid: string | null) => custos.filter((c) => c.sis === sid).reduce((s, c) => s + c.valor, 0);
  const totalCusto = custos.reduce((s, c) => s + c.valor, 0);
  const totalReceita = sistemas.reduce((s, x) => s + receitaSistema(x.id), 0);
  const geral = custoDe(null);

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<path d="M3 3v18h18"/>' k="Receita total" v={BRL(totalReceita)} />
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo total" v={BRL(totalCusto)} />
        <Kpi icon='<path d="M7 12l3 3 7-8"/>' k="Lucro" v={BRL(totalReceita - totalCusto)} />
        <Kpi icon='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' k="Margem geral" v={pct(totalReceita > 0 ? (totalReceita - totalCusto) / totalReceita : 0)} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Custo <b>ao vivo</b> vem do Supabase quando conectado. <b>Render</b> e serviços sem integração ficam como <b>estimativa manual</b> (etiqueta ao lado). Você pode cadastrar novos custos manualmente.</span>
      </div>

      <Card title="Custo por sistema — margem por empresa e por login"
        hint="rateio: custo do sistema ÷ empresas ativas e ÷ logins ativos"
        action={<button className="btn sm"><Icon path='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' size={14} />Novo custo</button>}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Sistema</th><th className="r">Receita</th><th className="r">Custo</th><th className="r">Margem</th><th className="r">Custo / empresa</th><th className="r">Custo / login</th></tr></thead>
            <tbody>
              {sistemas.map((s) => {
                const r = receitaSistema(s.id), c = custoDe(s.id), m = r > 0 ? (r - c) / r : 0;
                const emps = empresas.filter((e) => e.sis === s.id && e.status !== "canc");
                const logins = emps.reduce((a, e) => a + e.adeptos, 0) || 1;
                return (
                  <tr key={s.id}>
                    <td><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{s.nome}</span></td>
                    <td className="r num" style={{ color: "var(--good)" }}>{BRL(r)}</td>
                    <td className="r num">{BRL(c)}</td>
                    <td className="r num" style={{ color: m < 0 ? "var(--crit)" : "var(--accent)", fontWeight: 650 }}>{pct(m)}</td>
                    <td className="r num">{BRL(c / (emps.length || 1))}</td>
                    <td className="r num">{BRL(c / logins)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Custo por projeto e por MB — uso × preço"
        hint="quanto custa cada projeto e quanto custa o espaço que usamos"
        action={<span className="hint">uso ao vivo destrava com Supabase/Vercel</span>}>
        <div className="banner" style={{ margin: "0 0 4px" }}>
          <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
          <span>Vercel e Supabase cobram <b>por conta</b>, não por projeto — então custo por projeto é <b>rateio do custo atribuído ÷ uso</b>. Render cobra <b>por serviço</b> (tier fixo). Hoje o uso é estimativa; vira <b>ao vivo</b> quando as chaves forem conectadas.</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Projeto</th><th>Host</th><th className="r">Custo / mês</th><th className="r">Uso</th><th className="r">Utilização</th><th className="r">Custo / GB</th><th className="r">Custo / MB</th><th>Origem</th></tr></thead>
            <tbody>
              {sistemas.map((s) => {
                const emps = empresas.filter((e) => e.sis === s.id && e.status !== "canc");
                const limiteMb = emps.reduce((a, e) => a + (planById(e.plano)?.storage || 0), 0);
                // Storage ao vivo do Supabase quando disponível; senão soma estimada das empresas.
                const aoVivo = s.storageLiveMb != null;
                const usoMb = aoVivo ? (s.storageLiveMb as number) : emps.reduce((a, e) => a + e.usoStorage, 0);
                const info = infraCusto({ baseBrl: custoDe(s.id), usoMb, limiteMb, source: aoVivo ? "live" : "manual" });
                const u = info.utilizacao;
                if (info.baseBrl === 0 && usoMb === 0) return null;
                return (
                  <tr key={s.id}>
                    <td><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{nomeCurto(s.nome)}</span></td>
                    <td style={{ color: "var(--muted)" }}>{s.host}</td>
                    <td className="r num">{BRL(info.baseBrl)}</td>
                    <td className="r num">{fmtStorage(info.usoMb)}{limiteMb ? " / " + fmtStorage(limiteMb) : ""}</td>
                    <td className="r num" style={{ color: u >= 0.9 ? "var(--crit)" : u >= 0.75 ? "var(--warn)" : "var(--muted)" }}>{limiteMb ? pct(u) : "—"}</td>
                    <td className="r num">{info.custoPorGb > 0 ? BRL(info.custoPorGb) : "—"}</td>
                    <td className="r num" style={{ color: "var(--accent)", fontWeight: 600 }}>{info.custoPorMb > 0 ? "R$ " + info.custoPorMb.toFixed(3).replace(".", ",") : "—"}</td>
                    <td><SourceTag source={info.source} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="row2">
        <Card title="Lançamentos de custo" hint="fonte e origem do dado">
          <div className="tablewrap">
            <table>
              <thead><tr><th>Serviço</th><th>Sistema</th><th>Fonte</th><th>Origem</th><th className="r">Valor / mês</th></tr></thead>
              <tbody>
                {custos.map((c, i) => {
                  const sys = c.sis ? sistemas.find((s) => s.id === c.sis) : null;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.nome}</td>
                      <td>{sys ? <span className="sys-tag"><span className="sd" style={{ background: sys.cor }} />{nomeCurto(sys.nome)}</span> : <span style={{ color: "var(--faint)" }}>Geral</span>}</td>
                      <td style={{ color: "var(--muted)" }}>{c.fonte}</td>
                      <td><SourceTag source={c.source} /></td>
                      <td className="r num">{BRL(c.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Custos gerais (não atribuídos)" hint="IA, e-mail e afins">
          <div className="card-b">
            <div className="cost-line"><span className="lbl">Total geral</span><span className="val num">{BRL(geral)}</span></div>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>
              Custos que não pertencem a um sistema específico (ex.: Anthropic/Claude, Resend) entram aqui e são somados ao custo total, mas não afetam a margem individual de cada sistema.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
