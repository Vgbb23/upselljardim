import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleCheck as CheckCircle2, ShieldCheck, Zap, Sparkles, ShoppingCart, ArrowRight, Info, CircleAlert as AlertCircle } from 'lucide-react';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  const fruitfyProductId = import.meta.env.VITE_FRUITFY_PRODUCT_ID as string | undefined;

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc: any, part: string) => {
      if (acc && typeof acc === 'object') {
        return acc[part];
      }
      return undefined;
    }, obj);
  };

  const pickFirstString = (obj: any, paths: string[]): string => {
    for (const path of paths) {
      const value = getNestedValue(obj, path);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };

  const findStringByKeyHints = (obj: any, keyHints: string[]): string => {
    const normalizedHints = keyHints.map((hint) => hint.toLowerCase());

    const walk = (value: any): string => {
      if (!value || typeof value !== 'object') return '';

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = walk(item);
          if (found) return found;
        }
        return '';
      }

      for (const [key, innerValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();
        if (typeof innerValue === 'string' && innerValue.trim()) {
          const keyMatches = normalizedHints.some((hint) => normalizedKey.includes(hint));
          const looksLikePixPayload = innerValue.includes('000201') && innerValue.length > 40;
          if (keyMatches || looksLikePixPayload) {
            return innerValue.trim();
          }
        }

        const deep = walk(innerValue);
        if (deep) return deep;
      }

      return '';
    };

    return walk(obj);
  };

  const normalizeQrCode = (qrCode: string): string => {
    if (!qrCode) return '';
    if (qrCode.startsWith('http://') || qrCode.startsWith('https://') || qrCode.startsWith('data:image')) {
      return qrCode;
    }
    return `data:image/png;base64,${qrCode}`;
  };

  const formatCpf = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  };

  const isValidCpf = (cpfDigits: string): boolean => {
    if (!/^\d{11}$/.test(cpfDigits)) return false;
    if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

    const calcDigit = (base: string, factor: number) => {
      const total = base
        .split('')
        .reduce((sum, digit) => sum + Number(digit) * factor--, 0);
      const rest = (total * 10) % 11;
      return rest === 10 ? 0 : rest;
    };

    const first = calcDigit(cpfDigits.slice(0, 9), 10);
    const second = calcDigit(cpfDigits.slice(0, 10), 11);

    return first === Number(cpfDigits[9]) && second === Number(cpfDigits[10]);
  };

  const [selectedOption, setSelectedOption] = useState<number>(3); // Default to 3 bottles
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [cpfTouched, setCpfTouched] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [checkoutResponse, setCheckoutResponse] = useState<any>(null);
  const [showRecentPurchase, setShowRecentPurchase] = useState<boolean>(true);

  const options = [
    {
      id: 1,
      bottles: 1,
      price: 29.90,
      description: "Tratamento Mensal",
      save: 0,
      popular: false,
      image: "https://i.ibb.co/1C8SMJ8/1-frasco.png"
    },
    {
      id: 3,
      bottles: 3,
      price: 57.90,
      description: "Tratamento Completo",
      save: 31.80,
      popular: true,
      image: "https://i.ibb.co/s9Gyv5FD/3-frascos.png"
    }
  ];

  const currentOption = options.find(o => o.bottles === selectedOption) || options[1];
  const sanitizedCpfInput = cpf.replace(/\D/g, '');
  const showCpfInvalid =
    cpfTouched && sanitizedCpfInput.length === 11 && !isValidCpf(sanitizedCpfInput);

  const itemValueByBottles: Record<number, number> = {
    1: 2990,
    3: 5790
  };

  const handleCheckout = async () => {
    setCheckoutError('');
    setCheckoutResponse(null);

    const sanitizedPhone = phone.replace(/\D/g, '');
    const sanitizedCpf = cpf.replace(/\D/g, '');

    if (!name || !email || !sanitizedPhone || !sanitizedCpf) {
      setCheckoutError('Preencha nome, email, telefone e CPF antes de continuar.');
      return;
    }

    if (!isValidCpf(sanitizedCpf)) {
      setCheckoutError('CPF inválido. Verifique e tente novamente.');
      return;
    }

    if (!itemValueByBottles[selectedOption]) {
      setCheckoutError('Oferta selecionada inválida.');
      return;
    }
    if (!fruitfyProductId) {
      setCheckoutError('Produto não configurado. Defina VITE_FRUITFY_PRODUCT_ID no arquivo .env.');
      return;
    }

    setIsSubmitting(true);

    const pixChargePath = '/api/pix/charge';
    const pixChargeUrl =
      (import.meta.env.VITE_PIX_API_URL as string | undefined)?.replace(/\/$/, '') || '';
    const chargeEndpoint = pixChargeUrl ? `${pixChargeUrl}${pixChargePath}` : pixChargePath;

    try {
      const response = await fetch(chargeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          phone: sanitizedPhone,
          cpf: sanitizedCpf,
          items: [
            {
              id: fruitfyProductId,
              value: itemValueByBottles[selectedOption],
              quantity: 1
            }
          ]
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        setCheckoutError(data?.message || 'Não foi possível criar a cobrança PIX.');
        return;
      }

      setCheckoutResponse(data);
    } catch {
      setCheckoutError(
        'Não foi possível contactar o servidor do checkout. Em desenvolvimento, rode `npm run api` na mesma máquina (proxy na porta do .env). Em produção, confirme o deploy da pasta `api/` na Vercel.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderId = pickFirstString(checkoutResponse, [
    'data.order.id',
    'data.order_id',
    'data.orderId',
    'order.id',
    'order_id',
    'id'
  ]);

  const pixCode = pickFirstString(checkoutResponse, [
    'data.pix.copy_paste',
    'data.pix.copyAndPaste',
    'data.pix.emv',
    'data.pix.payload',
    'data.pix_code',
    'data.pixCode',
    'pix.copy_paste',
    'pix.copyAndPaste',
    'pix.emv',
    'pix.payload',
    'pix_code',
    'pixCode'
  ]) || findStringByKeyHints(checkoutResponse, [
    'copy_paste',
    'copyandpaste',
    'pix_copia_cola',
    'pixcopiacola',
    'pix_code',
    'pixcode',
    'payload',
    'emv',
    'brcode'
  ]);

  const qrCode = normalizeQrCode(
    pickFirstString(checkoutResponse, [
      'data.pix.qr_code',
      'data.pix.qrCode',
      'data.pix.qr_code_base64',
      'data.pix.qrCodeBase64',
      'data.qr_code',
      'data.qrCode',
      'pix.qr_code',
      'pix.qrCode',
      'pix.qr_code_base64',
      'pix.qrCodeBase64',
      'qr_code',
      'qrCode'
    ]) || findStringByKeyHints(checkoutResponse, [
      'qr_code_base64',
      'qrcodebase64',
      'qr_code',
      'qrcode'
    ])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRecentPurchase(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (checkoutResponse) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-100">
        <main className="max-w-md mx-auto px-5 py-8">
          <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-emerald-700 mb-2">
              PIX gerado com sucesso
            </h1>
            <p className="text-sm text-stone-600 mb-4">
              Faça o pagamento agora para confirmar seu pedido.
            </p>

            {orderId && (
              <p className="text-xs text-stone-500 mb-4">
                Pedido: <span className="font-bold text-stone-700">{orderId}</span>
              </p>
            )}

            {qrCode ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-3 mb-4">
                <img src={qrCode} alt="QR Code PIX" className="w-full rounded-xl" />
              </div>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                QR Code não encontrado na resposta. Use o PIX copia e cola abaixo.
              </p>
            )}

            <div className="mb-4">
              <p className="text-xs font-bold text-stone-700 mb-2">PIX copia e cola</p>
              <textarea
                value={pixCode}
                readOnly
                rows={4}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700"
              />
              {!pixCode && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Ainda não encontramos o campo de copia e cola na resposta. Se quiser, eu ajusto para o formato exato que sua API retornou.
                </p>
              )}
              {pixCode && (
                <p className="mt-2 text-xs text-stone-600 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2">
                  Toque no campo acima para selecionar e copie manualmente (Ctrl/Cmd + C).
                </p>
              )}
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <h2 className="text-sm font-black text-stone-700 mb-2 uppercase tracking-wide">Como pagar</h2>
              <ol className="text-xs text-stone-600 space-y-2 list-decimal pl-4">
                <li>Abra o app do seu banco e entre em PIX.</li>
                <li>Escolha pagar com QR Code ou PIX copia e cola.</li>
                <li>Escaneie o QR Code acima ou cole o código.</li>
                <li>Confira os dados e confirme o pagamento.</li>
                <li>Após a confirmação, seu pedido será processado automaticamente.</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-100 overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-stone-200 z-50">
        <motion.div 
          initial={{ width: "70%" }}
          animate={{ width: "95%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full bg-emerald-500"
        />
      </div>

      <main className="max-w-md mx-auto px-5 pt-8 pb-20">
        {/* Header Warning */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-8 flex items-center gap-3"
        >
          <AlertCircle className="text-rose-500 shrink-0" size={20} />
          <p className="text-rose-900 text-sm font-medium">
            <span className="font-bold uppercase tracking-tighter">ESPERE!</span> Não feche esta página. Sua encomenda está quase pronta.
          </p>
        </motion.div>

        {/* Headline */}
        <header className="mb-8 text-center px-2">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold tracking-tight text-stone-900 mb-4 leading-[1.1]"
          >
            Quer que suas <span className="text-emerald-600 italic">Rosas do Deserto</span> durem anos com cores vibrantes?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-stone-600 text-lg leading-relaxed"
          >
            Apresentamos o <span className="font-bold text-stone-800 underline decoration-emerald-400 underline-offset-4">Sérum Vitalidade Premium</span>. A proteção definitiva que sua planta precisa.
          </motion.p>
        </header>

        {/* Product Image Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-10"
        >
          <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-xl shadow-stone-200/50 border border-stone-100 flex items-center justify-center p-6">
            <img 
              src="https://i.ibb.co/Q35D1zpy/imagem-real.png" 
              alt="Sérum Vitalidade Rosa do Deserto" 
              className="w-full h-full object-cover rounded-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
              <Sparkles size={12} />
              Fórmula Exclusiva
            </div>
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <section className="space-y-4 mb-10">
          <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Por que usar o Sérum Vitalidade?</h2>
          
          <div className="grid gap-3">
            {[
              { icon: <Zap className="text-amber-500" />, title: "Cores + Vivas", desc: "Pigmentação intensa desde a primeira aplicação." },
              { icon: <CheckCircle2 className="text-emerald-500" />, title: "Fortalecimento Real", desc: "Raízes 3x mais fortes e resistentes." },
              { icon: <ShieldCheck className="text-blue-500" />, title: "Proteção Total", desc: "Blindagem contra pragas, fungos e apodrecimento." },
              { icon: <Sparkles className="text-rose-500" />, title: "Floração Infinita", desc: "Estimula o nascimento de novos botões o ano todo." }
            ].map((benefit, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="bg-white p-4 rounded-2xl border border-stone-100 flex items-start gap-4 shadow-sm"
              >
                <div className="bg-stone-50 p-2 rounded-xl shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-base">{benefit.title}</h3>
                  <p className="text-stone-500 text-sm leading-snug">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing Options */}
        <section className="mb-10">
          <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Escolha sua oferta especial</h2>
          
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.bottles)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
                  selectedOption === option.bottles 
                    ? 'border-emerald-500 bg-emerald-50/30' 
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {option.popular && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                    Melhor Custo-Benefício
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                      selectedOption === option.bottles ? 'border-emerald-500' : 'border-stone-300'
                    }`}>
                      {selectedOption === option.bottles && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                    </div>
                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-stone-100 bg-white shrink-0 shadow-sm">
                      <img src={option.image} alt={option.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-bold text-lg text-stone-900 leading-tight">
                        {option.bottles} {option.bottles === 1 ? 'Frasco' : 'Frascos'}
                      </h3>
                      <p className="text-stone-500 text-xs font-medium">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-stone-400 line-through font-bold">
                      R$ {(option.bottles * 29.90).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-2xl font-black text-stone-900">
                      R$ {option.price.toFixed(2).replace('.', ',')}
                    </p>
                    {option.save > 0 && (
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                        Economize R$ {option.save.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Customer Data */}
        <section className="mb-8 space-y-3">
          <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Seus dados para pagamento</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="Telefone com DDD"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={cpf}
            onChange={(e) => {
              setCpf(formatCpf(e.target.value));
              if (!cpfTouched) setCpfTouched(true);
            }}
            onBlur={() => setCpfTouched(true)}
            placeholder="CPF"
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${
              showCpfInvalid ? 'border-rose-400 focus:border-rose-500' : 'border-stone-200 focus:border-emerald-500'
            }`}
          />
          {showCpfInvalid && (
            <p className="text-xs font-semibold text-rose-600">
              CPF inválido. Confira os números informados.
            </p>
          )}
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            Este produto vai ser entregue junto com seu pedido.
          </p>
        </section>

        {/* CTA Button */}
        <div className="sticky bottom-6 z-40">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200/50 flex items-center justify-center gap-3 active:bg-emerald-700 transition-colors"
          >
            <ShoppingCart size={22} />
            {isSubmitting ? 'GERANDO PIX...' : 'ADICIONAR AO MEU PEDIDO'}
            <ArrowRight size={18} />
          </motion.button>
          
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-stone-400 font-black uppercase tracking-widest">
            <span className="flex items-center gap-1"><ShieldCheck size={12} /> Compra Segura</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Garantia de 30 Dias</span>
          </div>

          {checkoutError && (
            <p className="mt-3 text-center text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {checkoutError}
            </p>
          )}

          {checkoutResponse && (
            <div className="mt-3 bg-white border border-emerald-100 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-700 mb-2">Cobrança PIX criada com sucesso.</p>
              <pre className="text-[10px] text-stone-600 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                {JSON.stringify(checkoutResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Negative Choice */}
        <footer className="mt-12 text-center">
          <button className="text-stone-400 text-xs font-bold hover:text-rose-500 transition-colors underline decoration-stone-200 underline-offset-4 px-4">
            Não, obrigado. Quero correr o risco das minhas rosas morrerem prematuramente.
          </button>
          
          <div className="mt-12 pt-8 border-t border-stone-200">
            <p className="text-stone-400 text-[10px] leading-relaxed font-medium">
              *Resultados podem variar de acordo com a espécie e cuidados adicionais. <br />
              Oferta exclusiva para clientes que já adquiriram o Kit Rosas do Deserto.
            </p>
          </div>
        </footer>
      </main>

      {/* Floating Notification */}
      <AnimatePresence>
        {showRecentPurchase && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-28 left-4 right-4 z-30 pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-md border border-stone-100 p-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-xs mx-auto">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Info size={16} />
              </div>
              <p className="text-[11px] text-stone-600 font-medium leading-tight">
                <span className="font-bold text-stone-900">Maria S.</span> acabou de adicionar 3 frascos ao pedido dela.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
