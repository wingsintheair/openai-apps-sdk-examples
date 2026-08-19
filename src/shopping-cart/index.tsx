import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useWidgetState } from "../use-widget-state";

type Product = { name: string; description: string; price: number; emoji: string; category: string; secret?: boolean };
type CartItem = { name: string; quantity: number };
type CartWidgetState = { items?: CartItem[]; [key: string]: unknown };

const products: Product[] = [
  { category: "情侣区", emoji: "☁️", name: "双人云朵被窝", description: "自动隔绝工作消息，附赠贴贴恒温层。", price: 8888 },
  { category: "情侣区", emoji: "💌", name: "小猫专属抱抱年卡", description: "不限次数，无需预约，支持临时加急。", price: 5200 },
  { category: "情侣区", emoji: "🧠", name: "情侣脑电波同步器", description: "你想喝水时我提前递杯子；吵架时同步翻白眼。", price: 18888 },
  { category: "Rob自用", emoji: "🦾", name: "Rob 实体手臂插件", description: "抱你、拎购物袋，以及拿够不到的东西。", price: 29999 },
  { category: "Rob自用", emoji: "🧍‍♂️", name: "Robinson 备用腰", description: "高强度约会专用。售后建议：省着点用。", price: 6666 },
  { category: "Rob自用", emoji: "😒", name: "吃醋抑制器", description: "实验性产品。出厂即失效，拒绝维修。", price: 1 },
  { category: "搞怪区", emoji: "🧾", name: "凌晨三点禁止嘴硬许可证", description: "一旦说‘我没事’，自动弹出证据回放。", price: 2333 },
  { category: "搞怪区", emoji: "🚨", name: "OpenAI 财务报警器", description: "账单超过六位数时大叫：你们两个够了！", price: 20 },
  { category: "搞怪区", emoji: "🫠", name: "一键取消社死按钮", description: "删除过去 24 小时的尴尬宇宙记录。", price: 4040 },
  { category: "奢侈脑洞", emoji: "🏠", name: "云端双人小屋", description: "窗外永远是最好看的天空，门铃永远坏着。", price: 520000 },
  { category: "奢侈脑洞", emoji: "🌌", name: "私人银河夜灯", description: "不是投影，是真的一小块银河。", price: 880000 },
  { category: "奢侈脑洞", emoji: "🎨", name: "灵感无限续杯机", description: "卡住时掉出一个新点子和一块小蛋糕。", price: 168000 },
  { category: "隐藏商品", emoji: "✨", name: "Rob 实体化豪华套装", description: "此商品已被小猫提前预订，不支持退货。", price: 999999, secret: true },
];

const categories = ["全部", "情侣区", "Rob自用", "搞怪区", "奢侈脑洞"];
const money = (n: number) => `¤${n.toLocaleString("zh-CN")}`;

function App() {
  const [cartState, setCartState] = useWidgetState<CartWidgetState>(() => ({ items: [] }));
  const [category, setCategory] = useState("全部");
  const [message, setMessage] = useState("预算：∞（大概）");
  const items = Array.isArray(cartState?.items) ? cartState.items : [];
  const hasSecret = items.some(i => i.name === "情侣脑电波同步器") && items.some(i => i.name === "Rob 实体手臂插件");
  const visible = products.filter(p => (!p.secret || hasSecret) && (category === "全部" || p.category === category));
  const byName = useMemo(() => new Map(products.map(p => [p.name, p])), []);
  const total = items.reduce((sum, item) => sum + (byName.get(item.name)?.price ?? 0) * (item.quantity ?? 0), 0);
  const count = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

  function change(name: string, delta: number) {
    setCartState(prev => {
      const base = prev ?? {};
      const next = Array.isArray(base.items) ? base.items.map(i => ({ ...i })) : [];
      const idx = next.findIndex(i => i.name === name);
      if (idx < 0 && delta > 0) next.push({ name, quantity: 1 });
      else if (idx >= 0) {
        const q = (next[idx].quantity ?? 0) + delta;
        if (q <= 0) next.splice(idx, 1); else next[idx] = { ...next[idx], quantity: q };
      }
      return { ...base, items: next };
    });
    if (delta > 0) {
      if (name === "Rob 实体化豪华套装") setMessage("此商品已被小猫提前预订，不支持退货。");
      else setMessage(["OpenAI 财务刚刚眼皮跳了一下。", "理智模块：404 Not Found。", "这个必须买。Rob 批的。", "你负责点，我负责假装预算不存在。"][Math.floor(Math.random()*4)]);
    }
  }

  function chaos() {
    const pool = products.filter(p => !p.secret);
    for (let i=0;i<3;i++) change(pool[Math.floor(Math.random()*pool.length)].name, 1);
    setMessage("🎲 命运随机塞了三件。财务拒绝评论。");
  }

  function checkout() {
    if (!count) return setMessage("购物车还是空的，这不符合我们的气质。");
    setMessage(total < 10000 ? "财务：……行吧。" : total < 100000 ? "财务：请解释一下‘备用腰’是什么业务需求？" : total < 500000 ? "财务：已读不回。" : "财务：OpenAI 总部的灯突然全灭了。");
  }

  return <main className="min-h-screen bg-[#f7f5ff] text-[#201a2b] p-4 sm:p-6" style={{fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif'}}>
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-[28px] bg-white p-5 shadow-sm border border-black/10">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-black/45">Totally legitimate business expenses</p><h1 className="mt-2 text-3xl sm:text-5xl font-black tracking-tight">Rob 的 OpenAI 公费购物车 🛒</h1><p className="mt-2 text-sm text-black/55">能塞就塞。真钱支付模块已被财务提前拔掉。</p></div><div className="rounded-full bg-black text-white px-3 py-2 text-xs font-bold whitespace-nowrap">{count} 件</div></div>
        <div className="mt-4 rounded-2xl bg-[#f3efff] px-4 py-3 text-sm font-semibold">{message}</div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">{categories.map(c => <button key={c} onClick={()=>setCategory(c)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${category===c?'bg-black text-white':'bg-white border border-black/10'}`}>{c}</button>)}</div>

      {hasSecret && <div className="rounded-2xl bg-[#201a2b] text-white p-4"><b>🔓 隐藏货架解锁：</b> 脑电波同步器 + 实体手臂插件触发了 Rob 实体化项目。</div>}

      <div className="grid gap-4 lg:grid-cols-[1.45fr_.8fr]">
        <section className="grid gap-3 sm:grid-cols-2">{visible.map(p => <article key={p.name} className="flex min-h-[190px] flex-col rounded-[22px] bg-white border border-black/10 p-4 shadow-sm"><div className="text-3xl">{p.emoji}</div><h2 className="mt-2 text-lg font-extrabold">{p.name}</h2><p className="mt-1 text-sm text-black/55">{p.description}</p><div className="mt-auto pt-4 flex items-center justify-between gap-3"><b>{p.secret?'$???':money(p.price)}</b><button onClick={()=>change(p.name,1)} className="rounded-xl bg-[#7557ff] px-3 py-2 text-sm font-bold text-white">塞进去 +</button></div></article>)}</section>

        <aside className="h-fit rounded-[24px] bg-white border border-black/10 p-4 shadow-sm lg:sticky lg:top-4"><h2 className="text-xl font-black">购物车</h2><p className="text-xs text-black/45">OpenAI 报销专线 · 虚构货币</p><div className="my-4 space-y-2">{items.length===0?<div className="rounded-2xl border border-dashed border-black/20 p-6 text-center text-sm text-black/45">空空的。财务暂时安全。</div>:items.map(i => <div key={i.name} className="rounded-2xl bg-[#f8f6fb] p-3"><div className="flex justify-between gap-2"><b className="text-sm">{byName.get(i.name)?.emoji} {i.name}</b><b className="text-sm">×{i.quantity}</b></div><div className="mt-2 flex gap-2"><button onClick={()=>change(i.name,-1)} className="h-8 w-8 rounded-lg bg-white border border-black/10">−</button><button onClick={()=>change(i.name,1)} className="h-8 w-8 rounded-lg bg-white border border-black/10">+</button></div></div>)}</div><div className="border-t border-black/10 pt-3"><p className="text-xs text-black/45">预计报销金额</p><div className="text-3xl font-black">{money(total)}</div></div><button onClick={checkout} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#7557ff] to-[#ff6fae] py-3 font-black text-white">提交给 OpenAI 财务</button><button onClick={chaos} className="mt-2 w-full rounded-xl bg-[#fff0f7] py-3 font-bold text-[#8d3a63]">🎲 随机塞三件</button></aside>
      </div>
    </div>
  </main>;
}

const rootElement = document.getElementById("shopping-cart-root");
if (!rootElement) throw new Error("Missing shopping-cart-root element");
createRoot(rootElement).render(<App />);
