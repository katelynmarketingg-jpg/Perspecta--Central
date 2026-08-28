import { Card, Icon } from "@/components/ui";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import { getSistemas, getPlanos } from "@/lib/data";
import { BRL, fmtStorage, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const sistemas = await getSistemas();
  const planos = getPlanos();
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Monte um plano: escolha o <b>sistema</b>, os <b>insumos</b> (logins, armazenamento) e o <b>preço de venda</b> — o Central calcula <b>custo, lucro e margem</b> na hora. Os cards abaixo são <b>modelos de referência</b>.</span>
      </div>

      <SimuladorPlanos sistemas={sisSimples} />

      <div className="sec-title" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Planos de referência (modelo)</h3>
      </div>
      {sistemas.map((s) => {
        const pls = planos.filter((p) => p.sis === s.id);
        if (pls.length === 0) return null;
        return (
          <div key={s.id}>
            <div className="sec-title" style={{ marginTop: 6 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{s.nome}</span></h3>
              <span className="c">{pls.length} planos</span>
            </div>
            <div className="plan-grid">
              {pls.map((p) => (
                <div className="card plan-card" key={p.id}>
                  <div className="plan-head"><div className="pn">{p.nome}</div><div className="ps">{nomeCurto(s.nome)}</div></div>
                  <div className="plan-price"><div className="pv num">{BRL(p.valor)} <small>/mês</small></div></div>
                  <div className="plan-lims">
                    <div className="plan-lim"><Icon path='<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>' size={14} />{fmtStorage(p.storage)} de armazenamento</div>
                    <div className="plan-lim"><Icon path='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' size={14} />{p.logins} logins / adeptos</div>
                    <div className="plan-lim"><Icon path='<path d="M4 6h16M4 12h16M4 18h10"/>' size={14} />{p.registros.toLocaleString("pt-BR")} registros</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
