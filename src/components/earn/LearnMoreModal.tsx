import React from 'react';
import { X, ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, Layers, TrendingUp, TrendingDown } from 'lucide-react';

interface LearnMoreModalProps {
  type: 'staking' | 'staking_pro';
  onClose: () => void;
  onAction: () => void;
}

export const LearnMoreModal: React.FC<LearnMoreModalProps> = ({
  type,
  onClose,
  onAction
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-base font-bold text-white">
              {type === 'staking' ? 'О стейкинге' : 'О Staking Pro'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on section 4 of the spec */}
        {type === 'staking' ? (
          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            {/* Section 1 */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                Что такое стейкинг?
              </h4>
              <p className="text-slate-400">
                Стейкинг — это способ получать вознаграждение за участие в работе некоторых блокчейн-сетей. В поддерживаемых сетях криптовалюта делегируется валидатору или блокируется по правилам сети. Вознаграждение зависит от сети, её условий и текущих параметров.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5">
              <h4 className="text-xs font-bold text-white">Как это работает?</h4>
              <ol className="space-y-1.5 text-slate-300 list-decimal list-inside pl-1 text-[11px]">
                <li>Вы выбираете поддерживаемую монету.</li>
                <li>Указываете сумму и проверяете условия.</li>
                <li>Подтверждаете размещение.</li>
                <li>В приложении отображаются сумма, начисления и статус.</li>
                <li>При выводе средства могут поступить сразу или после периода разблокировки — это зависит от сети и выбранной программы.</li>
              </ol>
            </div>

            {/* Section 3 */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white">Откуда берётся доход?</h4>
              <p className="text-slate-400 text-[11px]">
                Вознаграждение формируется по правилам блокчейна или программы. Указанная ставка не является гарантией: она может меняться, а стоимость самой монеты в долларах может как вырасти, так и упасть.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Что важно знать?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-100/90">
                Может действовать минимальная сумма; вывод иногда требует ожидания; в некоторых сетях возможны штрафы валидатора (slashing); комиссии сети и оператора показываются до подтверждения. Приложение указывает, является ли ставка ориентировочной или подтверждённой, и дату последнего обновления.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onAction}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Выбрать актив для стейкинга
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs leading-relaxed text-slate-300">
            {/* Section 1 */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Что такое Trade Pro?
              </h4>
              <p className="text-slate-400">
                Trade Pro — это стратегия, в которой вы выбираете криптоактив, сумму и направление движения цены. Вы можете открыть позицию на рост (Long) или на падение (Short), а также заранее указать уровень, при котором позиция должна закрыться с целью зафиксировать прибыль, и уровень для ограничения убытка.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5">
              <h4 className="text-xs font-bold text-white">Как это работает?</h4>
              <ol className="space-y-1.5 text-slate-300 list-decimal list-inside pl-1 text-[11px]">
                <li>Вы выбираете монету.</li>
                <li>Указываете сумму позиции и направление — Рост (Long) или Падение (Short).</li>
                <li>Проверяете цену входа, размер позиции, требуемое обеспечение и возможные расходы.</li>
                <li>Задаёте тейк-профит и стоп-лосс.</li>
                <li>Проверяете итоговый экран и подтверждаете открытие.</li>
                <li>Отслеживаете результат в «Мои стратегии» и закрываете позицию вручную или по заданным условиям.</li>
              </ol>
            </div>

            {/* Long vs Short */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-bold text-emerald-400 block mb-1">Рост (Long)</span>
                <span className="text-slate-300">
                  Если цена актива поднимается — позиция может принести прибыль. Если падает — убыток.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="font-bold text-rose-400 block mb-1">Падение (Short)</span>
                <span className="text-slate-300">
                  Рассчитана на снижение цены: цена падает — прибыль; цена растёт — убыток.
                </span>
              </div>
            </div>

            {/* Staking income clarification */}
            <div className="space-y-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 text-[11px]">
              <h5 className="font-bold text-white">Важное уточнение о доходе от стейкинга:</h5>
              <p className="text-slate-400">
                Нельзя автоматически считать, что средства в позиции одновременно продолжают приносить стейкинг-вознаграждение. Экран отдельно показывает вознаграждение стейкинга — только если оно действительно начисляется на эти средства; результат позиции; комиссии, спред и финансирование; итог после расходов.
              </p>
            </div>

            {/* Risks */}
            <div className="space-y-1.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-rose-200">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Риски стратегии</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-100/90">
                Можно потерять часть или весь капитал, выделенный на стратегию; при плече убыток может наступить быстрее. Стоп-лосс не гарантирует цену исполнения при резком движении или недостаточной ликвидности. Для Short рост цены означает убыток. Могут применяться комиссии, спред, funding/swap и комиссии сети.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onAction}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Попробовать Staking Pro
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
